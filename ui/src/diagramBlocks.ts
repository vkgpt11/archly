import { readDiagramOptions } from './diagramStyles'
type Line = { text: string; line: number; calls: string[] }

/** Converts property blocks to legacy directives without losing diagnostic locations. */
export function expandDiagramBlocks(input: Line[]): Line[] {
  const classes = new Map<string, { target: string; options: Record<string, string> }>()
  const flattened: Line[] = []
  for (let index = 0; index < input.length; index++) {
    const origin = input[index]
    const match = origin.text.trim().match(/^((?:style(?:-edge)?|metadata-edge)\s+(?:"(?:\\.|[^"\\])*"|[A-Za-z][\w-]*(?:\s*->\s*[A-Za-z][\w-]*)?)|layout|class\s+(node|edge)\s+([A-Za-z][\w-]*))\s*\{$/)
    if (!match) { flattened.push(origin); continue }
    const properties: Line[] = []
    let closed = false
    while (++index < input.length) {
      const item = input[index]
      const text = item.text.trim()
      if (text === '}') { closed = true; break }
      if (!text || /^(#|\/\/)/.test(text)) continue
      const property = text.match(/^([\w-]+)\s*:\s*(.+?)\s*;?$/)
      if (!property) throw new Error(`Line ${item.line}: expected property: value`)
      properties.push({ ...item, text: `${property[1]}=${property[2].replace(/;$/, '').trim()}` })
    }
    if (!closed) throw new Error(`Line ${origin.line}: unclosed ${match[1]} block`)
    const all = properties.map((item) => item.text).join(' ')
    let options: Record<string, string>
    try { options = readDiagramOptions(all) } catch (error) { throw new Error(`Line ${origin.line}: ${(error as Error).message}`) }
    if (match[2]) {
      if (classes.has(match[3])) throw new Error(`Line ${origin.line}: duplicate class “${match[3]}”`)
      classes.set(match[3], { target: match[2], options })
    } else flattened.push(...properties.map((item) => ({ ...item, text: `${match[1]} ${item.text}` })))
  }
  return flattened.map((line) => {
    const match = line.text.trim().match(/^(style(?:-edge)?\s+\S+)\s+(.+)$/)
    if (!match || !/\bclass=/.test(match[2])) return line
    let options: Record<string, string>
    try { options = readDiagramOptions(match[2]) } catch (error) { throw new Error(`Line ${line.line}: ${(error as Error).message}`) }
    const styleClass = classes.get(options.class)
    if (!styleClass) throw new Error(`Line ${line.line}: unknown class “${options.class}”`)
    if (styleClass.target !== (match[1].startsWith('style-edge') ? 'edge' : 'node')) throw new Error(`Line ${line.line}: incompatible style class`)
    delete options.class
    return { ...line, text: `${match[1]} ${Object.entries({ ...styleClass.options, ...options }).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(' ')}` }
  })
}
