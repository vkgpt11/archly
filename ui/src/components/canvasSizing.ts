export type ArchitectureKind = 'service' | 'web' | 'mobile' | 'database' | 'cache' | 'queue' | 'storage' | 'external' | 'actor' | 'container' | 'note' | 'text'

export function getComponentSize(label: string, subtitle: string, kind: ArchitectureKind) {
  if (kind === 'container') return { width: 360, height: 240 }
  const longestText = Math.max(label.trim().length, subtitle.trim().length)
  const characterWidth = kind === 'text' ? 7 : 6.5
  const reservedSpace = kind === 'text' ? 34 : 58
  const maximumWidth = kind === 'text' ? 420 : 360
  return {
    width: Math.round(Math.min(maximumWidth, longestText * characterWidth + reservedSpace)),
    height: kind === 'note' ? 68 : kind === 'text' ? 30 : subtitle.trim() ? 58 : 42,
  }
}
