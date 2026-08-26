import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Project } from '../types'
import Editor from './Editor'
import ThemeToggle from './ThemeToggle'
import { architectureTemplates, templateCanvas, type ArchitectureTemplate } from '../architectureTemplates'

type Props = { token: string; onSignOut: () => void }

export default function Dashboard({ token, onSignOut }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'active' | 'archived'>('active')
  const [folder, setFolder] = useState('All')

  useEffect(() => {
    api.listProjects(token)
      .then(setProjects)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [token])

  async function createProject(template: ArchitectureTemplate) {
    setError('')
    try {
      const created = await api.createProject(token, template.id === 'blank' ? 'Untitled architecture' : template.name)
      const project = template.id === 'blank' ? created : await api.saveProject(token, {
        ...created, canvasJson: templateCanvas(template),
        markdown: `<h1>${template.name}</h1><p>${template.description}</p>`,
      })
      setProjects((current) => [project, ...current])
      setTemplatesOpen(false)
      setSelected(project)
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  async function duplicateProject(project: Project) {
    setError('')
    try {
      const copy = await api.duplicateProject(token, project.id)
      setProjects((current) => [copy, ...current])
    } catch (reason) { setError((reason as Error).message) }
  }

  async function removeProject(project: Project) {
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return
    await api.deleteProject(token, project.id)
    setProjects((current) => current.filter((item) => item.id !== project.id))
  }

  async function organizeProject(project: Project, nextFolder: string | null, archived = Boolean(project.archived)) {
    try {
      const updated = await api.organizeProject(token, project.id, nextFolder, archived)
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) { setError((reason as Error).message) }
  }

  const folders = ['All', ...Array.from(new Set(projects.map((project) => project.folder).filter((value): value is string => Boolean(value))))]
  const visibleProjects = projects.filter((project) =>
    Boolean(project.archived) === (scope === 'archived')
    && (folder === 'All' || project.folder === folder)
    && `${project.name} ${project.folder || ''}`.toLowerCase().includes(search.trim().toLowerCase()))

  if (selected) {
    return (
      <Editor
        token={token}
        initialProject={selected}
        onBack={(updated) => {
          setProjects((current) => current.map((item) => item.id === updated.id ? updated : item))
          setSelected(null)
        }}
      />
    )
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Archly home"><span>A</span> Archly</a>
        <ThemeToggle />
        <button className="text-button" onClick={onSignOut}>Sign out</button>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div><p className="eyebrow">Your workspace</p><h1>Architecture projects</h1></div>
          <button className="primary-button" onClick={() => setTemplatesOpen(true)}>+ New project</button>
        </div>
        <div className="project-filters">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" aria-label="Search projects" />
          <div className="project-scope" aria-label="Project status"><button className={scope === 'active' ? 'active' : ''} onClick={() => setScope('active')}>Active</button><button className={scope === 'archived' ? 'active' : ''} onClick={() => setScope('archived')}>Archived</button></div>
          <select aria-label="Project folder" value={folder} onChange={(event) => setFolder(event.target.value)}>{folders.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {loading ? <p className="muted">Loading projects…</p> : projects.length === 0 ? (
          <button className="empty-state" onClick={() => setTemplatesOpen(true)}>
            <strong>Create your first architecture</strong>
            <span>Start with a blank diagram and design notes.</span>
          </button>
        ) : (
          <div className="project-grid">
            {visibleProjects.map((project) => (
              <article className="project-card" key={project.id}>
                <button className="project-preview" onClick={() => setSelected(project)} aria-label={`Open ${project.name}`}>
                  <span className="preview-node one" /><span className="preview-line" /><span className="preview-node two" />
                </button>
                <div className="project-meta">
                  <button className="project-title" onClick={() => setSelected(project)}>{project.name}</button>
                  <p>Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                  <button className="text-button project-copy" onClick={() => void duplicateProject(project)}>Duplicate</button>
                  <button className="text-button" onClick={() => {
                    const next = window.prompt('Folder name (leave blank for no folder)', project.folder || '')
                    if (next !== null) void organizeProject(project, next.trim() || null)
                  }}>Move</button>
                  <button className="text-button" onClick={() => void organizeProject(project, project.folder || null, !project.archived)}>{project.archived ? 'Restore' : 'Archive'}</button>
                  <button className="danger-link" onClick={() => removeProject(project)}>Delete</button>
                </div>
              </article>
            ))}
            {!visibleProjects.length && <p className="muted project-empty-filter">No projects match these filters.</p>}
          </div>
        )}
        {templatesOpen && <div className="template-backdrop" role="presentation" onMouseDown={() => setTemplatesOpen(false)}>
          <section className="template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p className="eyebrow">New project</p><h2 id="template-title">Choose an architecture template</h2></div><button className="text-button" onClick={() => setTemplatesOpen(false)}>Close</button></header>
            <div className="template-grid">{architectureTemplates.map((template) => <button key={template.id} onClick={() => void createProject(template)}>
              <strong>{template.name}</strong><span>{template.description}</span><small>{template.nodes.length ? `${template.nodes.length} editable components` : 'Empty canvas'}</small>
            </button>)}</div>
          </section>
        </div>}
      </section>
    </main>
  )
}
