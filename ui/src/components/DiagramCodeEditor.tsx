import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  analyzeDiagram, completionsAt, formatDiagramSource, languageProperties, quickFixDiagram,
  renameDiagramSymbol, resolveDiagramSymbol, symbolOccurrences, wordAt,
} from '../diagramLanguage'

type Props = {
  value: string
  diagnostic: string
  onChange: (value: string) => void
  onRun: () => void
  onScroll?: (top: number) => void
}

const propertyDetails: Record<string, string> = {
  fill: 'Six-digit component fill colour.', border: 'Six-digit border colour.', icon: 'Catalog icon shorthand.', shape: 'rectangle, rounded, or ellipse.',
  routing: 'straight, curved, smooth-step, or orthogonal.', protocol: 'Validated connection protocol.', port: 'Port 1–65535 or an ordered range.',
  encrypted: 'Whether the connection is encrypted.', async: 'Whether the connection is asynchronous.', 'replica-count': 'Environment replica count from 1 to 10,000.',
}

export default function DiagramCodeEditor({ value, diagnostic, onChange, onRun, onScroll }: Props) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const highlight = useRef<HTMLPreElement>(null)
  const [cursor, setCursor] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [references, setReferences] = useState<Array<{ start: number; end: number; line: number }>>([])
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameOffset, setRenameOffset] = useState(0)
  const [message, setMessage] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const invalidLine = Number(diagnostic.match(/^Line (\d+)/)?.[1]) || undefined
  const analysis = useMemo(() => analyzeDiagram(value, invalidLine), [invalidLine, value])
  const currentWord = wordAt(value, cursor)
  const liveWord = () => wordAt(value, textarea.current?.selectionStart ?? cursor)
  const currentSymbol = resolveDiagramSymbol(value, cursor, analysis.symbols)
  const currentProperty = languageProperties.has(currentWord.value) ? currentWord.value : undefined
  const fix = useMemo(() => quickFixDiagram(value, diagnostic), [diagnostic, value])

  const select = (start: number, end = start) => window.setTimeout(() => {
    textarea.current?.focus(); textarea.current?.setSelectionRange(start, end); setCursor(start)
  }, 0)
  const goToDefinition = () => {
    const definition = analysis.symbols.find((item) => item.name === liveWord().value)
    if (!definition) return setMessage('Place the cursor on a defined symbol.')
    select(definition.start, definition.end); setMessage(`Definition on line ${definition.line}.`)
  }
  const findReferences = () => {
    const offset = textarea.current?.selectionStart ?? cursor
    const symbol = resolveDiagramSymbol(value, offset, analysis.symbols)
    const found = symbolOccurrences(value, liveWord().value, symbol?.kind)
    setReferences(found); setMessage(found.length ? `${found.length} reference locations.` : 'No references found.')
  }
  const openRename = () => { const offset = textarea.current?.selectionStart ?? cursor; setRenameOffset(offset); setRenameValue(wordAt(value, offset).value); setRenameOpen(true) }
  const applyRename = () => {
    try {
      const renamed = renameDiagramSymbol(value, renameOffset, renameValue)
      onChange(renamed.source); setRenameOpen(false); setReferences([]); setMessage(`Renamed ${renamed.count} locations.`)
    } catch (error) { setMessage((error as Error).message) }
  }
  const format = (selectionOnly = false) => {
    const field = textarea.current
    if (!field) return
    if (selectionOnly && field.selectionStart !== field.selectionEnd) {
      const formatted = formatDiagramSource(value.slice(field.selectionStart, field.selectionEnd))
      onChange(`${value.slice(0, field.selectionStart)}${formatted}${value.slice(field.selectionEnd)}`)
      setMessage('Formatted selection while preserving comments.')
    } else { onChange(formatDiagramSource(value)); setMessage('Formatted document while preserving comments.') }
  }
  const showCompletions = () => setSuggestions(completionsAt(value, textarea.current?.selectionStart ?? cursor, analysis.symbols).slice(0, 80))
  const applyCompletion = (suggestion: string) => {
    const word = wordAt(value, cursor)
    const start = word.start; const end = word.end
    onChange(`${value.slice(0, start)}${suggestion}${value.slice(end)}`)
    setSuggestions([]); select(start + suggestion.length)
  }
  const commands = [
    ['Show completions', showCompletions], ['Go to definition', goToDefinition], ['Find references', findReferences],
    ['Rename symbol', openRename], ['Format document', () => format(false)], ['Format selection', () => format(true)], ['Draw diagram', onRun],
  ] as const
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const command = event.ctrlKey || event.metaKey
    if (command && event.key === 'Enter') { event.preventDefault(); onRun(); return }
    if (command && event.key === ' ') { event.preventDefault(); showCompletions(); return }
    if (event.key === 'F12' && !event.shiftKey) { event.preventDefault(); goToDefinition(); return }
    if (event.key === 'F12' && event.shiftKey) { event.preventDefault(); findReferences(); return }
    if (event.key === 'F2') { event.preventDefault(); openRename(); return }
    if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'f') { event.preventDefault(); format(command); return }
    if (command && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); setPaletteOpen(true); return }
    if (event.key === 'Escape') { setSuggestions([]); setReferences([]); setPaletteOpen(false); setRenameOpen(false) }
  }
  let tokenIndex = 0
  const highlighted: ReactNode[] = []
  analysis.tokens.forEach((token, index) => {
    if (token.start > tokenIndex) highlighted.push(value.slice(tokenIndex, token.start))
    highlighted.push(<span key={index} className={`syntax-${token.kind}`} title={token.kind}>{token.value}</span>)
    tokenIndex = token.end
  })
  if (tokenIndex < value.length) highlighted.push(value.slice(tokenIndex))

  return <div className="diagram-code-intelligence">
    <div className="diagram-code-editor-layer">
      <pre ref={highlight} aria-hidden="true" className="diagram-code-highlight">{highlighted}</pre>
      <textarea ref={textarea} aria-label="Diagram code" value={value} onChange={(event) => { onChange(event.target.value); setSuggestions([]) }} onSelect={(event) => setCursor(event.currentTarget.selectionStart)} onMouseMove={(event) => { const field = event.currentTarget; const rect = field.getBoundingClientRect(); const lines = value.split('\n'); const line = Math.max(0, Math.min(lines.length - 1, Math.floor((event.clientY - rect.top + field.scrollTop - 12) / 20.8))); const column = Math.max(0, Math.floor((event.clientX - rect.left + field.scrollLeft - 12) / 7.8)); const offset = lines.slice(0, line).reduce((total, item) => total + item.length + 1, 0) + Math.min(column, lines[line]?.length || 0); setCursor(offset) }} onKeyDown={onKeyDown} onScroll={(event) => { if (highlight.current) { highlight.current.scrollTop = event.currentTarget.scrollTop; highlight.current.scrollLeft = event.currentTarget.scrollLeft } onScroll?.(event.currentTarget.scrollTop) }} spellCheck={false} />
    </div>
    <div className="diagram-code-ide-toolbar" role="toolbar" aria-label="Diagram code intelligence">
      <button onClick={showCompletions} title="Ctrl+Space">Complete</button>
      <button onClick={goToDefinition} title="F12">Definition</button>
      <button onClick={findReferences} title="Shift+F12">References</button>
      <button onClick={openRename} title="F2">Rename</button>
      <button onClick={() => format(false)} title="Shift+Alt+F">Format</button>
      <button onClick={() => setPaletteOpen(true)} title="Ctrl+Shift+P">Commands</button>
    </div>
    {(currentSymbol || currentProperty) && <div className="diagram-symbol-information" aria-label="Symbol information"><strong>{currentWord.value}</strong><span>{currentSymbol ? `${currentSymbol.kind}: ${currentSymbol.detail}; defined on line ${currentSymbol.line}.` : propertyDetails[currentProperty!] || 'Diagram language property.'}</span></div>}
    {suggestions.length > 0 && <div className="diagram-completions" role="listbox" aria-label="Code completions">{suggestions.map((item) => <button role="option" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCompletion(item)}>{item}</button>)}</div>}
    {references.length > 0 && <div className="diagram-references" aria-label="Symbol references">{references.map((item) => <button key={item.start} onClick={() => select(item.start, item.end)}>Line {item.line}</button>)}</div>}
    {renameOpen && <form className="diagram-rename" onSubmit={(event) => { event.preventDefault(); applyRename() }}><label>New symbol name<input autoFocus aria-label="New symbol name" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} /></label><button>Apply rename</button><button type="button" onClick={() => setRenameOpen(false)}>Cancel rename</button></form>}
    {paletteOpen && <div className="diagram-command-palette" role="dialog" aria-modal="false" aria-label="Diagram command palette"><strong>Diagram commands</strong>{commands.map(([label, action]) => <button key={label} onClick={() => { setPaletteOpen(false); action() }}>{label}</button>)}<button onClick={() => setPaletteOpen(false)}>Close commands</button></div>}
    {fix && diagnostic && <button className="diagram-quick-fix" onClick={() => { onChange(fix.source); setMessage(`Applied: ${fix.label}`) }}>Quick fix: {fix.label}</button>}
    {message && <p role="status" className="diagram-ide-status">{message}</p>}
  </div>
}
