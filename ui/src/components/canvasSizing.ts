export type ArchitectureKind = 'service' | 'web' | 'mobile' | 'database' | 'cache' | 'queue' | 'storage' | 'external' | 'actor' | 'container' | 'note' | 'text' | 'image' | 'custom'

export const COMPONENT_TITLE_LIMIT = 50

export function truncateCanvasText(value: string, limit: number) {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

export function getEdgeLabelWidth(label: string) {
  return label ? Math.min(132, Math.max(18, Math.ceil(label.length * 4.8 + 4))) : 42
}

export function getComponentSize(label: string, kind: ArchitectureKind) {
  if (kind === 'container') return { width: 360, height: 240 }
  if (kind === 'image') return { width: 240, height: 160 }
  const visibleLabel = truncateCanvasText(label.trim(), COMPONENT_TITLE_LIMIT)
  const sizedLabel = kind !== 'text' && kind !== 'note' ? visibleLabel.replace(/\s*[\r\n]+\s*/g, ' ') : visibleLabel
  const labelLines = sizedLabel.split(/\r?\n/)
  const longestLineLength = Math.max(0, ...labelLines.map((line) => line.length))
  const characterWidth = kind === 'text' ? 7 : 6.5
  const reservedSpace = kind === 'text' ? 18 : 24
  const maximumWidth = kind === 'text' ? 420 : 132
  const width = Math.round(Math.min(maximumWidth, longestLineLength * characterWidth + reservedSpace))
  const availableTextWidth = Math.max(1, width - 16)
  const titleLines = Math.min(2, Math.max(1, labelLines.reduce(
    (total, line) => total + Math.max(1, Math.ceil((line.length * characterWidth) / availableTextWidth)), 0,
  )))
  if (kind !== 'text' && kind !== 'note') {
    const compactWidth = Math.round(longestLineLength * 4.7 + 14)
    const wrappedLines = Math.min(2, Math.max(1, Math.ceil((longestLineLength * 4.7) / 74)))
    return { width: Math.min(82, Math.max(52, compactWidth)), height: 42 + (wrappedLines - 1) * 12 }
  }
  return {
    width,
    height: kind === 'text' ? 30 : titleLines > 1 ? 64 : 52,
  }
}
