import { ApiError } from './api'
import type { CanvasData } from './types'
import { parseCanvasJson } from './projectPersistence'

const base = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
export type EmbeddedDiagram = { projectId: string; revision: number; updatedAt: string; canvas: CanvasData; view?: string; variant?: string }
export const embedImageUrl = (token: string) => `${base}/embeds/${encodeURIComponent(token)}/image.png`
export const embedAssetUrl = (token: string, id: string) => `${base}/embeds/${encodeURIComponent(token)}/assets/${encodeURIComponent(id)}`

export async function getEmbed(token: string, signal: AbortSignal): Promise<EmbeddedDiagram> {
  const response = await fetch(`${base}/embeds/${encodeURIComponent(token)}`, { signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
  if (!response.ok) throw new ApiError('The diagram is unavailable.', response.status)
  const diagram = await response.json() as EmbeddedDiagram
  if (typeof diagram.projectId !== 'string' || !Number.isSafeInteger(diagram.revision) || !Number.isFinite(Date.parse(diagram.updatedAt))) throw new Error('Invalid diagram response.')
  return { ...diagram, canvas: parseCanvasJson(JSON.stringify(diagram.canvas)) }
}

export function embedSnippets(token: string, origin = window.location.origin) {
  const url = `${origin}/embed/${encodeURIComponent(token)}`
  return { url, iframe: `<iframe src="${url}" title="Read-only architecture diagram" width="100%" height="600" loading="lazy" referrerpolicy="no-referrer" style="border:0"></iframe>`,
    markdown: `[![Architecture diagram](${embedImageUrl(token)})](${url})\n\n[Open in Archly / edit](${url}?edit=1)` }
}
