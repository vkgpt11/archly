import type { CanvasData, Project, ProjectPage, ShareLink, SharePermission, SharedProject } from './types'
import { authSessionId } from './authSession'

export type AuthSession = { email: string; isAdmin: boolean }
export type AdminPeriod = '24h' | '7d' | '30d' | '90d'
export type AdminSummary = {
  period: AdminPeriod; timezone: 'UTC'; start: string; end: string
  users: { total: number; newUsers: number; active: number }
  diagrams: { current: number; archived: number; created: number; deleted: number; perActiveUser: number }
  conversion: { firstDiagramPercent: number; firstSavePercent: number }
}
export type AdminTimeSeries = { metric: string; timezone: 'UTC'; buckets: { date: string; value: number }[] }
export type AdminUserPage = { items: { id: string; maskedEmail: string; firstLoginAt: string; lastLoginAt: string; projectCount: number }[]; page: number; size: number; totalItems: number; totalPages: number }

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const requestTimeoutMs = 15_000

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = requestTimeoutMs): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(url, { credentials: 'include', ...init, signal: controller.signal }) }
  catch (error) {
    if (controller.signal.aborted) throw new ApiError(`The API did not respond within ${Math.round(timeoutMs / 1000)} seconds. Check the backend and try again.`, 408)
    throw error
  } finally { window.clearTimeout(timer) }
}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.message || `Request failed (${response.status})`, response.status)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

async function longRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...init?.headers },
  }, 60_000)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.message || `Request failed (${response.status})`, response.status)
  }
  return response.json()
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.message || `Request failed (${response.status})`, response.status)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

async function download(token: string, path: string): Promise<Blob> {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) throw new ApiError(`Request failed (${response.status})`, response.status)
  return response.blob()
}

export const api = {
  validateSession: (token: string) => request<AuthSession>(token, '/auth/session', { headers: { 'X-Archly-Session': authSessionId() } }),
  restoreSession: () => request<AuthSession>('', '/auth/session', { headers: { 'X-Archly-Session': authSessionId() } }),
  logout: () => request<void>('', '/auth/logout', { method: 'POST' }),
  listProjects: (token: string, page = 0, size = 24) => request<ProjectPage | Project[]>(token, `/projects?page=${page}&size=${size}`),
  createProject: (token: string, name: string) =>
    request<Project>(token, '/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  getProject: (token: string, id: string) => request<Project>(token, `/projects/${id}`),
  saveProject: (token: string, project: Project) =>
    request<Project>(token, `/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: project.name,
        canvasJson: project.canvasJson,
        markdown: project.markdown,
        revision: project.revision,
      }),
    }),
  deleteProject: (token: string, id: string) =>
    request<void>(token, `/projects/${id}`, { method: 'DELETE' }),
  duplicateProject: (token: string, id: string) =>
    request<Project>(token, `/projects/${id}/duplicate`, { method: 'POST' }),
  organizeProject: (token: string, id: string, folder: string | null, archived: boolean, revision: number) =>
    request<Project>(token, `/projects/${id}/organization`, { method: 'PUT', body: JSON.stringify({ folder, archived, revision }) }),
  listShares: (token: string, id: string) => request<ShareLink[]>(token, `/projects/${id}/shares`),
  createShare: (token: string, id: string, permission: SharePermission) =>
    request<ShareLink>(token, `/projects/${id}/shares`, { method: 'POST', body: JSON.stringify({ permission }) }),
  revokeShare: (token: string, projectId: string, shareId: string) =>
    request<void>(token, `/projects/${projectId}/shares/${shareId}`, { method: 'DELETE' }),
  getSharedProject: (shareToken: string) => publicRequest<SharedProject>(`/shares/${encodeURIComponent(shareToken)}`),
  saveSharedProject: (shareToken: string, project: Project) => publicRequest<SharedProject>(`/shares/${encodeURIComponent(shareToken)}`, {
    method: 'PUT', body: JSON.stringify({ name: project.name, canvasJson: project.canvasJson, markdown: project.markdown, revision: project.revision }),
  }).then((response) => response.project),
  adminSummary: (token: string, period: AdminPeriod) => request<AdminSummary>(token, `/admin/metrics/summary?period=${period}`),
  adminTimeSeries: (token: string, metric: string, period: AdminPeriod) => request<AdminTimeSeries>(token, `/admin/metrics/timeseries?metric=${encodeURIComponent(metric)}&period=${period}`),
  adminUsers: (token: string, page = 0, size = 25) => request<AdminUserPage>(token, `/admin/users?page=${page}&size=${size}`),
  adminCsv: (token: string, period: AdminPeriod) => download(token, `/admin/metrics/export?period=${period}`),
  generateDiagram: (token: string, prompt: string) =>
    longRequest<{ canvas: CanvasData; summary: string }>(token, '/ai/diagrams/generate', {
      method: 'POST', body: JSON.stringify({ prompt }),
    }),
}
