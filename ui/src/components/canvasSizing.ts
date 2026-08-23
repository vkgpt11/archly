export type ArchitectureKind = 'service' | 'web' | 'mobile' | 'database' | 'cache' | 'queue' | 'storage' | 'external' | 'actor' | 'container' | 'note' | 'text'

export const COMPONENT_TITLE_LIMIT = 28
export const COMPONENT_SUBTITLE_LIMIT = 44

export function truncateCanvasText(value: string, limit: number) {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

export function getComponentSize(label: string, subtitle: string, kind: ArchitectureKind, editing = false) {
  if (kind === 'container') return { width: 360, height: 240 }
  const visibleLabel = truncateCanvasText(label.trim(), COMPONENT_TITLE_LIMIT)
  const visibleSubtitle = truncateCanvasText(subtitle.trim(), COMPONENT_SUBTITLE_LIMIT)
  const longestText = Math.max(visibleLabel.length, visibleSubtitle.length)
  const characterWidth = kind === 'text' ? 7 : 6.5
  const reservedSpace = kind === 'text' ? 18 : 24
  const maximumWidth = kind === 'text' ? 420 : 360
  return {
    width: Math.round(Math.min(maximumWidth, longestText * characterWidth + reservedSpace)),
    height: kind === 'note' ? 76 : kind === 'text' ? 30 : visibleSubtitle || editing ? 68 : 52,
  }
}
