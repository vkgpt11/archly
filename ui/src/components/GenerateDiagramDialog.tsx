import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { ApiError, api } from '../api'
import type { CanvasData } from '../types'
import { aiPresets, analyzeArchitecture, catalogueForAi, prepareAiCanvas, type AiGenerationContext, type AiGenerationMode } from '../aiDiagram'

type Props = { token: string; context: Omit<AiGenerationContext, 'mode'> & { hasSelection: boolean }; onClose: () => void; onGenerated: (canvas: CanvasData) => void; onOpenSettings: () => void }
const historyKey = 'archly:ai-prompt-history'

export default function GenerateDiagramDialog({ token, context, onClose, onGenerated, onOpenSettings }: Props) {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<AiGenerationMode>(context.currentCanvas ? 'edit' : 'create')
  const [systemType, setSystemType] = useState('')
  const [scale, setScale] = useState('')
  const [constraints, setConstraints] = useState('')
  const [includeDocs, setIncludeDocs] = useState(false)
  const [rememberPrompts, setRememberPrompts] = useState(false)
  const [recentPrompts, setRecentPrompts] = useState<string[]>(() => { try { return (JSON.parse(localStorage.getItem(historyKey) || '[]') as string[]).slice(0, 10) } catch { return [] } })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [needsSettings, setNeedsSettings] = useState(false)
  const [result, setResult] = useState<{ canvas: CanvasData; summary: string; findings: string[] } | null>(null)

  async function generate() {
    const value = [prompt.trim(), systemType && `System type: ${systemType}.`, scale && `Scale and availability: ${scale}.`, constraints && `Constraints: ${constraints}.`].filter(Boolean).join('\n')
    if ((!value && mode !== 'explain') || generating) return
    setGenerating(true); setError(''); setResult(null)
    try {
      const response = await api.generateDiagram(token, value || 'Explain this architecture.', { mode, currentCanvas: context.currentCanvas, selectedSubsystem: mode === 'selection' ? context.selectedSubsystem : undefined, documentation: includeDocs ? context.documentation : undefined, catalogue: catalogueForAi() })
      const canvas = prepareAiCanvas(response.canvas)
      setResult({ canvas, summary: response.summary, findings: analyzeArchitecture(canvas) })
      if (rememberPrompts && value) try { const next = [value, ...recentPrompts.filter(item => item !== value)].slice(0, 10); localStorage.setItem(historyKey, JSON.stringify(next)); setRecentPrompts(next) } catch { /* optional history */ }
    } catch (cause) {
      setNeedsSettings(cause instanceof ApiError && cause.status === 428)
      setError(cause instanceof ApiError ? cause.message : 'Could not generate the diagram. Try again.')
    } finally { setGenerating(false) }
  }

  const canGenerate = mode === 'explain' || Boolean(prompt.trim() || systemType || scale || constraints)
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !generating && onClose()}>
    <section className="modal-card generate-diagram-dialog ai-generation-dialog" role="dialog" aria-modal="true" aria-labelledby="generate-diagram-title">
      <header><div><Sparkles /><div><h2 id="generate-diagram-title">Architecture copilot</h2><p>Create, explain, or safely evolve the current architecture.</p></div></div><button className="icon-button" onClick={onClose} disabled={generating} aria-label="Close generator"><X /></button></header>
      <div className="ai-mode-tabs" role="tablist" aria-label="AI operation">{([['create', 'Create new'], ['edit', 'Edit current'], ['selection', 'Selected subsystem'], ['explain', 'Explain']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={mode === value} disabled={(value === 'edit' || value === 'explain') && !context.currentCanvas || value === 'selection' && !context.hasSelection} onClick={() => setMode(value)}>{label}</button>)}</div>
      <label>Architecture preset<select onChange={event => { const preset = aiPresets.find(item => item.id === event.target.value); if (preset?.prompt) setPrompt(preset.prompt) }} defaultValue="custom">{aiPresets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="guided-prompt-fields"><label>System type<input value={systemType} onChange={event => setSystemType(event.target.value)} placeholder="e.g. B2B SaaS" /></label><label>Scale and availability<input value={scale} onChange={event => setScale(event.target.value)} placeholder="e.g. 1M users, multi-region" /></label></div>
      <label htmlFor="architecture-prompt">{mode === 'edit' || mode === 'selection' ? 'What should change?' : mode === 'explain' ? 'What would you like explained? (optional)' : 'What are you building?'}</label>
      <textarea id="architecture-prompt" value={prompt} onChange={(event) => { setPrompt(event.target.value); setError(''); setNeedsSettings(false) }} placeholder={mode === 'edit' ? 'Add Redis, make this multi-region, or replace Kafka with Pub/Sub…' : 'Describe users, workloads, data, integrations, security and deployment needs.'} rows={5} maxLength={4000} autoFocus onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void generate() }} />
      {recentPrompts.length > 0 && <label>Recent prompt<select value="" onChange={event => setPrompt(event.target.value)}><option value="">Choose a saved prompt…</option>{recentPrompts.map(item => <option key={item} value={item}>{item.slice(0, 100)}</option>)}</select></label>}
      <label>Constraints<input value={constraints} onChange={event => setConstraints(event.target.value)} placeholder="Cloud, compliance, budget, latency, preferred technologies…" /></label>
      <div className="ai-context-options">{context.documentation && <label><input type="checkbox" checked={includeDocs} onChange={event => setIncludeDocs(event.target.checked)} />Use project documentation as context</label>}<label><input type="checkbox" checked={rememberPrompts} onChange={event => setRememberPrompts(event.target.checked)} />Remember up to 10 prompts on this device</label></div>
      {error && <p className="dialog-error" role="alert">{error}</p>}
      {needsSettings && <button className="open-ai-settings" onClick={() => { onClose(); onOpenSettings() }}>Open AI settings</button>}
      {result && <section className="ai-result" aria-live="polite"><h3>{mode === 'explain' ? 'Architecture explanation' : 'Proposed architecture'}</h3><p>{result.summary}</p><h4>Quality analysis</h4><ul>{result.findings.map(item => <li key={item}>{item}</li>)}</ul></section>}
      <footer><button onClick={onClose} disabled={generating}>Cancel</button>{result && mode !== 'explain' && <button className="primary-button" onClick={() => onGenerated(result.canvas)}>Apply changes</button>}<button className={result ? '' : 'primary-button'} onClick={() => void generate()} disabled={!canGenerate || generating}><Sparkles />{generating ? 'Working…' : result ? 'Regenerate' : mode === 'explain' ? 'Explain architecture' : 'Generate proposal'}</button></footer>
    </section>
  </div>
}
