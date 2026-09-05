export type DiagramModule = { id: string; version: string; source: string }

type ExportedDeclaration = { name: string; source: string; line: number }

const identifier = '[A-Za-z][\\w-]*'
const importPattern = new RegExp(`^\\s*import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*"([^"]+)"(?:\\s+version\\s+"([^"]+)")?\\s*$`)

function safeModuleId(id: string, line: number) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9][A-Za-z0-9_-]*)*$/.test(id) || id.includes('..') || id.includes('://')) {
    throw new Error(`Line ${line}: unsafe module identifier “${id}”; use a project-relative identifier such as “modules/shared”`)
  }
}

function declarationName(text: string): string | undefined {
  return text.match(new RegExp(`^(?:let|template)\\s+(${identifier})\\b`))?.[1]
    || text.match(new RegExp(`^class\\s+(?:node|edge)\\s+(${identifier})\\b`))?.[1]
    || text.match(new RegExp(`^${identifier}\\s+(${identifier})(?:\\s|$)`))?.[1]
}

function exportsFrom(module: DiagramModule): Map<string, ExportedDeclaration> {
  const lines = module.source.split(/\r?\n/)
  const exports = new Map<string, ExportedDeclaration>()
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim()
    if (!trimmed.startsWith('export ')) continue
    const declaration = trimmed.slice(7)
    const name = declarationName(declaration)
    if (!name) throw new Error(`Module “${module.id}” line ${index + 1}: expected an exported variable, template, style class, or component contract`)
    if (exports.has(name)) throw new Error(`Module “${module.id}” line ${index + 1}: duplicate export “${name}”`)
    const body = [declaration]
    if (declaration.endsWith('{')) {
      let depth = 1
      while (depth && ++index < lines.length) {
        body.push(lines[index])
        const structural = lines[index].replace(/"(?:\\.|[^"\\])*"/g, '').replace(/^\s*(#|\/\/).*$/, '')
        depth += (structural.match(/\{/g) || []).length - (structural.match(/\}/g) || []).length
      }
      if (depth) throw new Error(`Module “${module.id}” line ${index + 1}: unclosed export “${name}”`)
    }
    exports.set(name, { name, source: body.join('\n'), line: index + 1 })
  }
  return exports
}

/** Resolves only modules supplied by the current project. It never performs file or network access. */
export function resolveDiagramImports(source: string, modules: DiagramModule[] = []): string {
  if (modules.length > 100) throw new Error('Line 1: project exceeds the 100 module limit')
  const byId = new Map<string, DiagramModule>()
  for (const module of modules) {
    safeModuleId(module.id, 1)
    if (!/^\d+(?:\.\d+){0,2}$/.test(module.version)) throw new Error(`Module “${module.id}”: version must be numeric, for example “1” or “1.2.0”`)
    if (module.source.length > 500_000) throw new Error(`Module “${module.id}”: source exceeds the 500 KB limit`)
    if (byId.has(module.id)) throw new Error(`Duplicate project module “${module.id}”`)
    byId.set(module.id, module)
  }
  const emitted = new Set<string>()
  const selectedNames = new Map<string, string>()
  const compile = (input: string, owner: string, stack: string[]): string => {
    const output: string[] = []
    input.split(/\r?\n/).forEach((line, index) => {
      const match = line.match(importPattern)
      if (!match) {
        if (/^\s*import\b/.test(line)) throw new Error(`${owner === 'root' ? 'Line' : `Module “${owner}” line`} ${index + 1}: expected import { name } from "modules/name" version "1"`)
        if (owner === 'root' && !/^\s*export\b/.test(line)) output.push(line)
        return
      }
      safeModuleId(match[2], index + 1)
      const module = byId.get(match[2])
      if (!module) throw new Error(`${owner === 'root' ? 'Line' : `Module “${owner}” line`} ${index + 1}: missing project module “${match[2]}” (dependency: ${[...stack, match[2]].join(' -> ')})`)
      if (stack.includes(module.id)) throw new Error(`${owner === 'root' ? 'Line' : `Module “${owner}” line`} ${index + 1}: import cycle: ${[...stack, module.id].join(' -> ')}`)
      if (match[3] && match[3] !== module.version) throw new Error(`${owner === 'root' ? 'Line' : `Module “${owner}” line`} ${index + 1}: module “${module.id}” requires version “${match[3]}” but project contains “${module.version}”`)
      // Imported dependencies are emitted first so exported templates can use them.
      const dependencies = compile(module.source, module.id, [...stack, module.id])
      if (dependencies.trim()) output.push(dependencies)
      const available = exportsFrom(module)
      const names = match[1].split(',').map((name) => name.trim())
      for (const name of names) {
        if (!new RegExp(`^${identifier}$`).test(name)) throw new Error(`Line ${index + 1}: invalid imported symbol “${name}”`)
        const declaration = available.get(name)
        if (!declaration) throw new Error(`Line ${index + 1}: module “${module.id}” does not export “${name}”`)
        const previous = selectedNames.get(name)
        if (previous && previous !== module.id) throw new Error(`Line ${index + 1}: duplicate imported symbol “${name}” from “${previous}” and “${module.id}”`)
        selectedNames.set(name, module.id)
        const key = `${module.id}:${name}`
        if (!emitted.has(key)) { output.push(`# imported ${name} from ${module.id}@${module.version}`, declaration.source); emitted.add(key) }
      }
    })
    return output.join('\n')
  }
  return compile(source, 'root', ['root'])
}

type VariableValue = string | number | boolean | string[]

function parseValue(type: string, raw: string, line: number): VariableValue {
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error(`Line ${line}: invalid ${type} variable value`) }
  if (type === 'string' && typeof value === 'string') return value
  if (type === 'number' && typeof value === 'number' && Number.isFinite(value)) return value
  if (type === 'boolean' && typeof value === 'boolean') return value
  if (type === 'colour' && typeof value === 'string' && (/^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\(/i.test(value))) return value
  if (type === 'list' && Array.isArray(value) && value.length <= 100 && value.every((item) => typeof item === 'string')) return value
  throw new Error(`Line ${line}: value does not match declared type “${type}”`)
}

/** Expands typed variables deterministically while preserving comments and declaration line count. */
export function expandTypedVariables(source: string): string {
  const values = new Map<string, VariableValue>()
  return source.split(/\r?\n/).map((line, index) => {
    const declaration = line.trim().match(/^let\s+([A-Za-z][\w-]*)(?:\s*:\s*(string|number|boolean|colour|list))?\s*=\s*(.+)$/)
    if (declaration) {
      if (values.has(declaration[1])) throw new Error(`Line ${index + 1}: duplicate variable “${declaration[1]}”`)
      const type = declaration[2] || 'string'
      values.set(declaration[1], declaration[2] ? parseValue(type, declaration[3], index + 1) : declaration[3].trim().replace(/^"|"$/g, ''))
      return `# ${line.trim()}`
    }
    if (/^\s*(#|\/\/)/.test(line)) return line
    return line.replace(/\$\{([A-Za-z][\w-]*)\}/g, (token, name: string, offset: number) => {
      // Template parameters are expanded by the template compiler in the next stage.
      if (!values.has(name)) return token
      const value = values.get(name)!
      const before = line.slice(0, offset)
      const insideString = (before.match(/(?<!\\)"/g) || []).length % 2 === 1
      const rendered = Array.isArray(value) ? value.join(',') : String(value)
      if (insideString) return rendered.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      if (!/^[A-Za-z0-9_#.,()%-]+$/.test(rendered)) throw new Error(`Line ${index + 1}: variable “${name}” must be identifier-safe outside quoted text`)
      return rendered
    })
  }).join('\n')
}
