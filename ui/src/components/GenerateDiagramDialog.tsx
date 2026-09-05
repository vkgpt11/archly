import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { ApiError, api } from '../api'
import type { CanvasData } from '../types'

type Props = {
  token: string
  onClose: () => void
  onGenerated: (canvas: CanvasData) => void
}

export default function GenerateDiagramDialog({ token, onClose, onGenerated }: Props) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    const value = prompt.trim()
    if (!value || generating) return
    setGenerating(true)
    setError('')
    try {
      const result = await api.generateDiagram(token, value)
      onGenerated(result.canvas)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not generate the diagram. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !generating && onClose()}>
    <section className="modal-card generate-diagram-dialog" role="dialog" aria-modal="true" aria-labelledby="generate-diagram-title">
      <header>
        <div><Sparkles /><div><h2 id="generate-diagram-title">Generate architecture</h2><p>Describe the system and Archly will create an editable diagram.</p></div></div>
        <button className="icon-button" onClick={onClose} disabled={generating} aria-label="Close generator"><X /></button>
      </header>
      <label htmlFor="architecture-prompt">What are you building?</label>
      <textarea
        id="architecture-prompt"
        value={prompt}
        onChange={(event) => { setPrompt(event.target.value); setError('') }}
        placeholder="Example: A multi-tenant SaaS platform with a React app, API gateway, three backend services, PostgreSQL, Redis, and an event queue."
        rows={7}
        maxLength={4000}
        autoFocus
        onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void generate() }}
      />
      <div className="generate-prompt-meta"><span>The generated diagram will replace the current canvas.</span><span>{prompt.length}/4000</span></div>
      {error && <p className="dialog-error" role="alert">{error}</p>}
      <footer>
        <button onClick={onClose} disabled={generating}>Cancel</button>
        <button className="primary-button" onClick={() => void generate()} disabled={!prompt.trim() || generating}>
          <Sparkles />{generating ? 'Generating…' : 'Generate diagram'}
        </button>
      </footer>
    </section>
  </div>
}
