import { useRef, useState } from 'react'
import { api } from '../api'
import { MAX_PACKAGE_BYTES, parseProjectPackage } from '../projectPortability'
import type { Project, ProjectSummary } from '../types'

type Props = { token: string; projects: ProjectSummary[]; onClose: () => void; onImported: (project: Project) => void }
export default function ProjectImportDialog({ token, projects, onClose, onImported }: Props) {
  const [preview, setPreview] = useState<ReturnType<typeof parseProjectPackage> | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [target, setTarget] = useState<Project | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const generation = useRef(0)
  async function read(file?: File) {
    const current = ++generation.current
    setPreview(null); setError(''); setConfirmed(false)
    if (!file) return
    setReading(true)
    try {
      if (file.size > MAX_PACKAGE_BYTES) throw new Error('Choose a project package smaller than 12 MB.')
      const text = await file.text()
      const result = parseProjectPackage(text)
      await api.validateProjectImport(token, result.package)
      if (current === generation.current) setPreview(result)
    } catch (reason) { if (current === generation.current) setError((reason as Error).message) }
    finally { if (current === generation.current) setReading(false) }
  }
  async function chooseTarget(id: string) {
    setTarget(null); setConfirmed(false); setError('')
    if (!id) return
    setReading(true)
    try { setTarget(await api.getProject(token, id)) } catch (reason) { setError((reason as Error).message) }
    finally { setReading(false) }
  }
  async function apply() {
    if (!preview || busy || reading || (target && !confirmed)) return
    setBusy(true); setError('')
    try { onImported(await api.importProject(token, preview.package, target?.id, target?.revision)) }
    catch (reason) { setError((reason as Error).message); setBusy(false); setConfirmed(false) }
  }
  return <div className="modal-backdrop">
    <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <h2 id="import-title">Import project backup</h2>
      <p>Restore an editable project from an Archly JSON file (up to 12 MB).</p>
      <input type="file" accept=".json,.archly.json,application/json" aria-label="Project backup file" disabled={busy || reading} onChange={event => void read(event.target.files?.[0])} />
      {reading && <p role="status">Reading project…</p>}
      {preview && <>
        <h3>{preview.package.project.name}</h3>
        <p>{Object.entries(preview.counts).map(([name, count]) => `${count} ${name}`).join(' · ')}</p>
        <p>Documentation: {preview.package.project.markdown ? 'included' : 'empty'}. DSL source: {JSON.parse(preview.package.project.canvasJson).diagramCode !== undefined ? 'included' : 'absent'}.</p>
        {preview.warnings.map(warning => <p role="note" key={warning}>{warning}</p>)}
        <label>Destination <select aria-label="Import destination" disabled={busy || reading} value={target?.id || ''} onChange={event => void chooseTarget(event.target.value)}>
          <option value="">Create independent project</option>
          {projects.map(project => <option key={project.id} value={project.id}>Replace {project.name}</option>)}
        </select></label>
        {target && <label><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Replace “{target.name}”. Its current saved content will be preserved as a separate “Before import” project.</label>}
      </>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="delete-project-actions">
        <button disabled={busy} onClick={() => { generation.current++; onClose() }}>Cancel</button>
        <button className="primary-button" disabled={!preview || busy || reading || Boolean(target && !confirmed) || Boolean(error)} onClick={() => void apply()}>{busy ? 'Importing…' : 'Import project'}</button>
      </div>
    </section>
  </div>
}
