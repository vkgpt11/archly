type SourceLine = { text: string; line: number; calls: string[] }
type Template = { name: string; line: number; parameters: Map<string, string | undefined>; body: SourceLine[] }

const identifier = '[A-Za-z][\\w-]*'
const callPattern = new RegExp(`^use\\s+(${identifier})\\s+(${identifier})\\s*\\((.*)\\)\\s*$`)
const headerPattern = new RegExp(`^template\\s+(${identifier})\\s*\\((.*)\\)\\s*\\{$`)
const quotedString = '"(?:\\\\.|[^"\\\\])*"'

function fail(line: SourceLine, message: string): never {
  throw new Error(`Line ${line.line}: ${message}${line.calls.length ? ` (via ${line.calls.join(' -> ')})` : ''}`)
}

function parameters(value: string, line: SourceLine, declaration: boolean) {
  const result = new Map<string, string | undefined>()
  let rest = value.trim()
  const pattern = new RegExp(`^(${identifier})(?:\\s*=\\s*(${quotedString}))?`)
  while (rest) {
    const match = rest.match(pattern)
    if (!match || (!declaration && match[2] === undefined)) fail(line, 'expected named string parameters, for example name="Orders"')
    if (result.has(match[1])) fail(line, `duplicate parameter “${match[1]}”`)
    let parsed: string | undefined
    try { parsed = match[2] === undefined ? undefined : JSON.parse(match[2]) as string } catch { fail(line, 'invalid quoted parameter value') }
    if (parsed !== undefined && /[\r\n]/.test(parsed)) fail(line, 'template parameters cannot contain newlines')
    result.set(match[1], parsed)
    rest = rest.slice(match[0].length).trim()
    if (!rest) break
    if (!rest.startsWith(',') || !rest.slice(1).trim()) fail(line, 'expected a comma between parameters')
    rest = rest.slice(1).trim()
  }
  return result
}

function outsideStrings(text: string, transform: (value: string) => string) {
  return text.split(new RegExp(`(${quotedString})`, 'g')).map((part, index) => index % 2 ? part : transform(part)).join('')
}

function substitute(line: SourceLine, values: Map<string, string>) {
  if (/^\s*(#|\/\/)/.test(line.text)) return line
  const text = line.text.split(new RegExp(`(${quotedString})`, 'g')).map((part, index) =>
    part.replace(/\$\{([A-Za-z][\w-]*)\}/g, (original, name: string) => {
      if (!values.has(name)) return original
      const value = values.get(name)!
      if (index % 2) return JSON.stringify(value).slice(1, -1)
      if (!/^[A-Za-z0-9_-]+$/.test(value)) fail(line, `parameter “${name}” must be identifier-safe outside quoted text`)
      return value
    }),
  ).join('')
  return { ...line, text }
}

/** Expands project-local templates only. No evaluation, file access, or network access. */
export function expandDiagramTemplates(source: string): SourceLine[] {
  if (source.length > 1_000_000) throw new Error('Line 1: diagram source exceeds the 1 MB limit')
  const input = source.split(/\r?\n/).map((text, index) => ({ text, line: index + 1, calls: [] as string[] }))
  const templates = new Map<string, Template>()
  const root: SourceLine[] = []
  for (let index = 0; index < input.length; index++) {
    const line = input[index]
    const match = line.text.trim().match(headerPattern)
    if (!match) {
      if (/^\s*template\b/.test(line.text)) fail(line, 'expected template Name(parameter, optional="default") {')
      root.push(line)
      continue
    }
    if (templates.has(match[1])) fail(line, `duplicate template “${match[1]}”`)
    const template: Template = { name: match[1], line: line.line, parameters: parameters(match[2], line, true), body: [] }
    let depth = 1
    while (++index < input.length) {
      const bodyLine = input[index]
      if (/^\s*template\b/.test(bodyLine.text)) fail(bodyLine, 'template declarations cannot be nested')
      const structural = /^\s*(#|\/\/)/.test(bodyLine.text) ? '' : outsideStrings(bodyLine.text, (text) => text.replace(/\$\{[^}]*\}/g, '')).replace(new RegExp(quotedString, 'g'), '')
      depth += [...structural].filter((char) => char === '{').length - [...structural].filter((char) => char === '}').length
      if (depth === 0) {
        if (bodyLine.text.trim() !== '}') fail(bodyLine, 'template closing brace must be on its own line')
        break
      }
      template.body.push(bodyLine)
    }
    if (depth !== 0) fail(line, `unclosed template “${template.name}”`)
    templates.set(template.name, template)
  }

  const output: SourceLine[] = []
  const instances = new Set<string>()
  let calls = 0
  const emit = (line: SourceLine) => {
    if (output.length >= 10_000) fail(line, 'template expansion exceeds the 10000-line limit')
    output.push(line)
  }
  const expand = (lines: SourceLine[], prefix = '', stack: string[] = []) => {
    for (const line of lines) {
      const match = line.text.trim().match(callPattern)
      if (!match) {
        if (/^\s*use\b/.test(line.text)) fail(line, 'expected use Template instance(name="value")')
        emit(line)
        continue
      }
      if (++calls > 1_000 || stack.length >= 32) fail(line, 'template expansion exceeds the call or nesting limit')
      const template = templates.get(match[1])
      if (!template) fail(line, `unknown template “${match[1]}”`)
      if (stack.includes(template.name)) fail(line, `recursive template call: ${[...stack, template.name].join(' -> ')}`)
      const instance = prefix ? `${prefix}__${match[2]}` : match[2]
      if (instances.has(instance)) fail(line, `duplicate template instance “${instance}”`)
      instances.add(instance)
      const supplied = parameters(match[3], line, false)
      for (const name of supplied.keys()) if (!template.parameters.has(name)) fail(line, `unknown parameter “${name}” for template “${template.name}” (declared at line ${template.line})`)
      const values = new Map<string, string>()
      for (const [name, fallback] of template.parameters) {
        const value = supplied.get(name) ?? fallback
        if (value === undefined) fail(line, `missing parameter “${name}” for template “${template.name}” (declared at line ${template.line})`)
        values.set(name, value)
      }
      const body = template.body.map((item) => substitute({ ...item, calls: [...line.calls, `${template.name} at line ${line.line}`] }, values))
      const localIds = new Set<string>()
      const nestedInstances = new Set<string>()
      const localVariables = new Set<string>()
      const edgeIds = new Set<string>()
      for (const item of body) {
        const text = item.text.trim()
        const namedEdge = text.match(/^connection\s+("(?:\\.|[^"\\])*"|[A-Za-z][\w-]*)\s+/)
        if (namedEdge) { edgeIds.add(namedEdge[1].startsWith('"') ? JSON.parse(namedEdge[1]) as string : namedEdge[1]); continue }
        const nested = text.match(callPattern)
        if (nested) { nestedInstances.add(nested[2]); continue }
        const variable = text.match(/^let\s+([A-Za-z][\w-]*)\s*=/)
        if (variable) { localVariables.add(variable[1]); continue }
        if (/^(?:#|\/\/|\}|direction\b|layout\b|class\b|style\b|style-edge\b|metadata-edge\b|position\b)/.test(text) || new RegExp(`^${identifier}(?:\\.(?:left|right|top|bottom))?\\s*->`).test(text)) continue
        const declaration = text.match(new RegExp(`^${identifier}\\s+(${identifier})(?:\\s|$)`))
        if (declaration) localIds.add(declaration[1])
        else if (new RegExp(`^${identifier}$`).test(text)) localIds.add(text)
      }
      const qualify = (token: string) => localIds.has(token) || [...nestedInstances].some((nested) => token.startsWith(`${nested}__`)) ? `${instance}__${token}` : token
      const scoped = body.map((item) => {
        if (/^\s*(#|\/\/)/.test(item.text)) return item
        let text = item.text.trim().replace(/\$\{([A-Za-z][\w-]*)\}/g, (original, name: string) => localVariables.has(name) ? `\${${instance}__${name}}` : original)
        if (/^use\b/.test(text)) return { ...item, text }
        if (/^let\b/.test(text)) return { ...item, text: text.replace(/^let\s+([A-Za-z][\w-]*)/, (_, name: string) => `let ${instance}__${name}`) }
        if (/^(layout|class)\b/.test(text)) return { ...item, text }
        const namedEdge = text.match(/^(connection|style-edge|metadata-edge)\s+("(?:\\.|[^"\\])*"|[A-Za-z][\w-]*)\s+(.+)$/)
        if (namedEdge && !namedEdge[3].startsWith('->')) {
          const rawId = namedEdge[2].startsWith('"') ? JSON.parse(namedEdge[2]) as string : namedEdge[2]
          const id = edgeIds.has(rawId) ? `${instance}__${rawId}` : rawId
          const tail = namedEdge[1] === 'connection' ? namedEdge[3].replace(/^([A-Za-z][\w-]*)(\.(?:left|right|top|bottom))?\s*->\s*([A-Za-z][\w-]*)/, (_, from: string, port: string, to: string) => `${qualify(from)}${port || ''} -> ${qualify(to)}`) : namedEdge[3]
          return { ...item, text: `${namedEdge[1]} ${JSON.stringify(id)} ${tail}` }
        }
        const connection = text.match(new RegExp(`^(style-edge\\s+)?(${identifier})(\\.(?:left|right|top|bottom))?\\s*->\\s*(${identifier})(.*)$`))
        if (connection) text = `${connection[1] || ''}${qualify(connection[2])}${connection[3] || ''} -> ${qualify(connection[4])}${connection[5]}`
        else if (/^(style|position)\s/.test(text)) text = text.replace(/^(style|position)\s+([A-Za-z][\w-]*)/, (_, kind: string, id: string) => `${kind} ${qualify(id)}`)
        else if (!/^direction\b/.test(text)) {
          const declaration = text.match(new RegExp(`^(${identifier})\\s+(${identifier})(.*)$`))
          if (declaration) text = `${declaration[1]} ${qualify(declaration[2])}${declaration[3]}`
          else if (localIds.has(text)) text = `${text} ${qualify(text)}`
        }
        return { ...item, text }
      })
      expand(scoped, instance, [...stack, template.name])
    }
  }
  expand(root)
  return output
}
