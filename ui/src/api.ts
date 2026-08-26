import type { Project, ShareLink, SharePermission, SharedProject } from './types'

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
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

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.message || `Request failed (${response.status})`, response.status)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  validateSession: (token: string) => request<{ email: string }>(token, '/auth/session'),
  listProjects: (token: string) => request<Project[]>(token, '/projects'),
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
  organizeProject: (token: string, id: string, folder: string | null, archived: boolean) =>
    request<Project>(token, `/projects/${id}/organization`, { method: 'PUT', body: JSON.stringify({ folder, archived }) }),
  listShares: (token: string, id: string) => request<ShareLink[]>(token, `/projects/${id}/shares`),
  createShare: (token: string, id: string, permission: SharePermission) =>
    request<ShareLink>(token, `/projects/${id}/shares`, { method: 'POST', body: JSON.stringify({ permission }) }),
  revokeShare: (token: string, projectId: string, shareId: string) =>
    request<void>(token, `/projects/${projectId}/shares/${shareId}`, { method: 'DELETE' }),
  getSharedProject: (shareToken: string) => publicRequest<SharedProject>(`/shares/${encodeURIComponent(shareToken)}`),
  saveSharedProject: (shareToken: string, project: Project) => publicRequest<SharedProject>(`/shares/${encodeURIComponent(shareToken)}`, {
    method: 'PUT', body: JSON.stringify({ name: project.name, canvasJson: project.canvasJson, markdown: project.markdown, revision: project.revision }),
  }).then((response) => response.project),
}
