export type ArchitectureKind = 'service' | 'web' | 'mobile' | 'database' | 'cache' | 'queue' | 'storage' | 'external' | 'actor' | 'container' | 'note' | 'text'

export const COMPONENT_TITLE_LIMIT = 28

export function truncateCanvasText(value: string, limit: number) {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

export function getEdgeLabelWidth(label: string) {
  return label ? Math.min(144, Math.max(18, Math.ceil(label.length * 5.25 + 6))) : 46
}

export function getComponentSize(label: string, kind: ArchitectureKind) {
  if (kind === 'container') return { width: 360, height: 240 }
  const visibleLabel = truncateCanvasText(label.trim(), COMPONENT_TITLE_LIMIT)
  const characterWidth = kind === 'text' ? 7 : 6.5
  const reservedSpace = kind === 'text' ? 18 : 24
  const maximumWidth = kind === 'text' ? 420 : 132
  const width = Math.round(Math.min(maximumWidth, visibleLabel.length * characterWidth + reservedSpace))
  const availableTextWidth = Math.max(1, width - 16)
  const titleLines = Math.min(2, Math.max(1, Math.ceil((visibleLabel.length * characterWidth) / availableTextWidth)))
  return {
    width,
    height: kind === 'text' ? 30 : titleLines > 1 ? 64 : 52,
  }
}
