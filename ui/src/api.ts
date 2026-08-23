import type { Project } from './types'

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

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
    throw new Error(body.message || `Request failed (${response.status})`)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  listProjects: (token: string) => request<Project[]>(token, '/projects'),
  createProject: (token: string, name: string) =>
    request<Project>(token, '/projects', { method: 'POST', body: JSON.stringify({ name }) }),
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
}
