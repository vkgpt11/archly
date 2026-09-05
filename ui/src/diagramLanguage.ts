import { componentDefinitions } from './components/canvasCatalog'

export type DiagramTokenKind = 'keyword' | 'identifier' | 'string' | 'number' | 'comment' | 'property' | 'operator' | 'invalid'
export type DiagramToken = { kind: DiagramTokenKind; value: string; start: number; end: number; line: number }
export type DiagramSymbol = { name: string; kind: 'component' | 'connection' | 'template' | 'variable' | 'style' | 'variant' | 'view' | 'import'; start: number; end: number; line: number; detail: string }

export const languageKeywords = new Set(['account', 'subscription', 'project', 'region', 'zone', 'vpc', 'vnet', 'subnet', 'cluster', 'namespace', 'container', 'service', 'web', 'mobile', 'database', 'cache', 'queue', 'storage', 'external', 'actor', 'note', 'text', 'custom', 'connection', 'style', 'style-edge', 'metadata-edge', 'position', 'boundary', 'direction', 'layout', 'class', 'node', 'edge', 'template', 'use', 'let', 'variant', 'add', 'override', 'override-edge', 'remove', 'remove-edge', 'import', 'export', 'from', 'as', 'version', 'string', 'number', 'boolean', 'colour', 'list', 'view', 'sequence', 'dataflow'])
export const languageProperties = new Set(['fill', 'border', 'text', 'description', 'icon', 'shape', 'opacity', 'border-width', 'width', 'height', 'padding', 'color', 'line', 'routing', 'start', 'end', 'protocol', 'port', 'async', 'encrypted', 'label', 'kind', 'replica-count', 'provider', 'identifier', 'type', 'x', 'y', 'horizontal-spacing', 'vertical-spacing', 'rank-separation'])
const componentKinds = [...new Set(componentDefinitions.flatMap((item) => [item.kind, item.iconId]).filter(Boolean) as string[])]
const declarationKeywords = ['service', 'web', 'mobile', 'database', 'cache', 'queue', 'storage', 'external', 'actor', 'container', 'region', 'account', 'subscription', 'project', 'zone', 'vpc', 'vnet', 'subnet', 'cluster', 'namespace', 'connection', 'template', 'use', 'variant', 'let', 'class', 'import', 'view']
const nodeProperties = ['fill=', 'border=', 'text=', 'description=', 'icon=', 'shape=', 'opacity=', 'border-width=', 'width=', 'height=', 'padding=']
const edgeProperties = ['label=', 'color=', 'width=', 'line=', 'routing=', 'start=', 'end=', 'protocol=', 'port=', 'async=', 'encrypted=', 'direction=', 'description=']

function lineAt(source: string, offset: number) { return source.slice(0, offset).split('\n').length }
function maskedSource(source: string, tokens: DiagramToken[]) {
  const chars = source.split('')
  for (const token of tokens) if (token.kind === 'string' || token.kind === 'comment') for (let i = token.start; i < token.end; i++) if (chars[i] !== '\n') chars[i] = ' '
  return chars.join('')
}

export function tokenizeDiagram(source: string, invalidLine?: number): DiagramToken[] {
  const tokens: DiagramToken[] = []
  let index = 0; let line = 1
  const add = (kind: DiagramTokenKind, end: number) => { tokens.push({ kind: invalidLine === line && kind === 'identifier' ? 'invalid' : kind, value: source.slice(index, end), start: index, end, line }); index = end }
  while (index < source.length) {
    const char = source[index]
    if (char === '\n') { index++; line++; continue }
    if (/\s/.test(char)) { index++; continue }
    if (char === '#' || source.startsWith('//', index)) { const end = source.indexOf('\n', index); add('comment', end < 0 ? source.length : end); continue }
    if (char === '"') {
      let end = index + 1; let escaped = false
      while (end < source.length) { const current = source[end++]; if (current === '"' && !escaped) break; escaped = current === '\\' && !escaped }
      add('string', end); continue
    }
    const number = source.slice(index).match(/^-?\d+(?:\.\d+)?/)
    if (number) { add('number', index + number[0].length); continue }
    const identifier = source.slice(index).match(/^[A-Za-z][\w-]*/)
    if (identifier) {
      const value = identifier[0]; const after = source.slice(index + value.length).match(/^\s*[:=]/)
      add(languageKeywords.has(value) ? 'keyword' : languageProperties.has(value) && after ? 'property' : 'identifier', index + value.length); continue
    }
    if ('{}()[]=,:.'.includes(char) || source.startsWith('->', index)) { add('operator', index + (source.startsWith('->', index) ? 2 : 1)); continue }
    add('invalid', index + 1)
  }
  return tokens
}

export function analyzeDiagram(source: string, invalidLine?: number) {
  const tokens = tokenizeDiagram(source, invalidLine)
  const masked = maskedSource(source, tokens)
  const symbols: DiagramSymbol[] = []
  const patterns: Array<[DiagramSymbol['kind'], RegExp, string]> = [
    ['template', /\btemplate\s+([A-Za-z][\w-]*)/g, 'Reusable diagram template'],
    ['variable', /\blet\s+([A-Za-z][\w-]*)/g, 'Diagram variable'],
    ['style', /\bclass\s+(?:node|edge)\s+([A-Za-z][\w-]*)/g, 'Reusable style class'],
    ['variant', /\bvariant\s+([A-Za-z][\w-]*)/g, 'Environment variant'],
    ['view', /\bview\s+([A-Za-z][\w-]*)/g, 'Diagram view'],
    ['import', /\bimport\s+([A-Za-z][\w-]*)/g, 'Imported symbol'],
    ['connection', /\bconnection\s+(?:"[^"]*"|([A-Za-z][\w-]*))/g, 'Named connection'],
    ['component', /^\s*(?:add\s+)?(?!(?:direction|layout|style|style-edge|metadata-edge|position|boundary|connection|class|template|use|let|variant|override|override-edge|remove|remove-edge|import|view)\b)[A-Za-z][\w-]*\s+([A-Za-z][\w-]*)/gm, 'Diagram component'],
  ]
  for (const [kind, pattern, detail] of patterns) for (const match of masked.matchAll(pattern)) {
    const name = match[1]; if (!name) continue
    const relative = match[0].lastIndexOf(name); const start = match.index! + relative
    const declaration = match[0].trim().replace(/^add\s+/, '').split(/\s+/)[0]
    const resolvedDetail = kind === 'component' ? `${declaration} component` : kind === 'template' ? `${detail}${source.slice(start + name.length).match(/^\s*(\([^\n{]*\))/)?.[1] || ''}` : detail
    if (!symbols.some((symbol) => symbol.start === start)) symbols.push({ name, kind, start, end: start + name.length, line: lineAt(source, start), detail: resolvedDetail })
  }
  for (const match of source.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*"[^"]+"/g)) {
    const lineStart = source.lastIndexOf('\n', match.index! - 1) + 1
    if (/^\s*(?:#|\/\/)/.test(source.slice(lineStart, match.index!))) continue
    for (const imported of match[1].matchAll(/[A-Za-z][\w-]*/g)) {
      const start = match.index! + match[0].indexOf('{') + 1 + imported.index!
      if (!symbols.some((symbol) => symbol.start === start)) symbols.push({ name: imported[0], kind: 'import', start, end: start + imported[0].length, line: lineAt(source, start), detail: 'Imported project-module symbol' })
    }
  }
  return { tokens, symbols: symbols.sort((a, b) => a.start - b.start) }
}

export function wordAt(source: string, offset: number) {
  let start = Math.max(0, Math.min(offset, source.length)); let end = start
  while (start > 0 && /[\w-]/.test(source[start - 1])) start--
  while (end < source.length && /[\w-]/.test(source[end])) end++
  return { value: source.slice(start, end), start, end }
}

function semanticOccurrences(source: string, symbol: DiagramSymbol): Array<{ start: number; end: number; line: number }> {
  const result = new Map<number, { start: number; end: number; line: number }>()
  result.set(symbol.start, { start: symbol.start, end: symbol.end, line: symbol.line })
  for (const token of tokenizeDiagram(source).filter((item) => (item.kind === 'identifier' || item.kind === 'keyword' || item.kind === 'property') && item.value === symbol.name)) {
    const lineStart = source.lastIndexOf('\n', token.start - 1) + 1
    const lineEnd = source.indexOf('\n', token.end); const line = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd)
    const before = source.slice(lineStart, token.start).trim()
    let role: DiagramSymbol['kind'] | undefined
    if (/^use\s*$/.test(before)) role = 'template'
    else if (/^(?:style-edge|metadata-edge|override-edge|remove-edge)\s*$/.test(before) || /^connection\s*$/.test(before)) role = 'connection'
    else if (/^(?:style|position|boundary|override|remove|participant|data|note|activate|deactivate)\s*$/.test(before) || /^\s*(?:include|exclude)\b/.test(line) || /(?:^|\s)->\s*$/.test(before) || new RegExp(`\\b${symbol.name}(?:\\.\\w+)?\\s*->`).test(line)) role = 'component'
    else if (/\bclass\s*=\s*$/.test(before)) role = 'style'
    if (role === symbol.kind) result.set(token.start, { start: token.start, end: token.end, line: token.line })
  }
  if (symbol.kind === 'variable') {
    const pattern = new RegExp(`\\$\\{(${symbol.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\}`, 'g')
    for (const match of source.matchAll(pattern)) {
      const lineStart = source.lastIndexOf('\n', match.index! - 1) + 1
      if (/^\s*(?:#|\/\/)/.test(source.slice(lineStart, match.index!))) continue
      const start = match.index! + 2
      result.set(start, { start, end: start + symbol.name.length, line: lineAt(source, start) })
    }
  }
  return [...result.values()].sort((a, b) => a.start - b.start)
}

export function resolveDiagramSymbol(source: string, offset: number, symbols = analyzeDiagram(source).symbols) {
  const name = wordAt(source, offset).value
  return symbols.filter((symbol) => symbol.name === name).find((symbol) => semanticOccurrences(source, symbol).some((item) => offset >= item.start && offset <= item.end)) || symbols.find((symbol) => symbol.name === name)
}

export function symbolOccurrences(source: string, name: string, kind?: DiagramSymbol['kind']): Array<{ start: number; end: number; line: number }> {
  if (!name) return []
  const semantic = analyzeDiagram(source).symbols.find((symbol) => symbol.name === name && (!kind || symbol.kind === kind))
  if (semantic) return semanticOccurrences(source, semantic)
  const definitionStarts = new Set(analyzeDiagram(source).symbols.filter((symbol) => symbol.name === name).map((symbol) => symbol.start))
  return tokenizeDiagram(source).filter((token) => (token.kind === 'identifier' || token.kind === 'keyword' || token.kind === 'property') && token.value === name)
    .filter((token) => {
      const lineStart = source.lastIndexOf('\n', token.start - 1) + 1
      const prefix = source.slice(lineStart, token.start).trim()
      const suffix = source.slice(token.end).match(/^\s*([=:])/)?.[1]
      return Boolean(prefix) && suffix !== '=' && suffix !== ':' || definitionStarts.has(token.start)
    }).map(({ start, end, line }) => ({ start, end, line }))
}

export function renameDiagramSymbol(source: string, offset: number, nextName: string) {
  if (!/^[A-Za-z][\w-]*$/.test(nextName)) throw new Error('Names must start with a letter and contain only letters, numbers, underscores, or hyphens.')
  const current = wordAt(source, offset).value
  const analysis = analyzeDiagram(source)
  const definition = resolveDiagramSymbol(source, offset, analysis.symbols)
  if (!definition) throw new Error(`“${current || 'selection'}” is not a defined diagram symbol.`)
  if (analysis.symbols.some((symbol) => symbol.name === nextName && symbol.name !== current)) throw new Error(`A symbol named “${nextName}” already exists.`)
  const occurrences = semanticOccurrences(source, definition)
  let result = source
  for (const occurrence of [...occurrences].reverse()) result = `${result.slice(0, occurrence.start)}${nextName}${result.slice(occurrence.end)}`
  return { source: result, count: occurrences.length }
}

export function formatDiagramSource(source: string): string {
  const output: string[] = []; let indent = 0; let blank = false
  for (const raw of source.split(/\r?\n/)) {
    const text = raw.trim()
    if (!text) { if (output.length && !blank) output.push(''); blank = true; continue }
    blank = false
    if (text.startsWith('}')) indent = Math.max(0, indent - 1)
    output.push(`${'  '.repeat(indent)}${text.replace(/\s*->\s*/g, ' -> ').replace(/\s*:\s*(?=["A-Za-z#-])/g, ': ')}`)
    const semantic = tokenizeDiagram(text).filter((token) => token.kind !== 'string' && token.kind !== 'comment').map((token) => token.value).join('')
    if (semantic.includes('{') && !text.startsWith('#') && !text.startsWith('//')) indent++
  }
  while (output.at(-1) === '') output.pop()
  return output.join('\n')
}

export function completionsAt(source: string, offset: number, symbols: DiagramSymbol[]) {
  const line = source.slice(source.lastIndexOf('\n', offset - 1) + 1, offset)
  const property = line.match(/([\w-]+)=([^\s]*)$/)?.[1]
  if (property === 'shape') return ['rectangle', 'rounded', 'ellipse']
  if (property === 'routing') return ['straight', 'curved', 'smooth-step', 'orthogonal']
  if (property === 'direction') return ['forward', 'reverse', 'bidirectional', 'none', 'right', 'left', 'down', 'up']
  if (property === 'protocol') return ['HTTP', 'HTTPS', 'REST', 'GRPC', 'TCP', 'UDP', 'SQL', 'AMQP', 'MQTT', 'KAFKA', 'CUSTOM']
  if (['async', 'encrypted'].includes(property || '')) return ['true', 'false']
  if (/^\s*use\s+/.test(line)) return symbols.filter((item) => item.kind === 'template').map((item) => item.name)
  if (/->\s*[\w-]*$/.test(line) || /^(?:\s*(?:style|position|boundary|override|remove)\s+)[\w-]*$/.test(line)) return symbols.filter((item) => item.kind === 'component').map((item) => item.name)
  if (/^\s*(?:style-edge|metadata-edge|override-edge|remove-edge)\s+[\w-]*$/.test(line)) return symbols.filter((item) => item.kind === 'connection').map((item) => item.name)
  if (/^\s*(?:style|override)\s+\S+\s+/.test(line)) return nodeProperties
  if (/^\s*(?:style-edge|metadata-edge|override-edge)\s+\S+\s+/.test(line)) return edgeProperties
  return [...new Set([...declarationKeywords, ...symbols.map((item) => item.name), ...componentKinds])]
}

export function quickFixDiagram(source: string, diagnostic: string) {
  const missing = diagnostic.match(/Line (\d+): unknown component “([A-Za-z][\w-]*)”/)
  if (missing) return { label: `Declare ${missing[2]} as a service`, source: `service ${missing[2]} "${missing[2]}"\n${source}` }
  const unknownType = diagnostic.match(/Line (\d+): unknown component type “([A-Za-z][\w-]*)”/)
  if (unknownType) {
    const lines = source.split(/\r?\n/); const index = Number(unknownType[1]) - 1
    lines[index] = lines[index].replace(new RegExp(`^(\\s*)${unknownType[2]}\\b`), '$1service')
    return { label: `Change ${unknownType[2]} to service`, source: lines.join('\n') }
  }
  return undefined
}
