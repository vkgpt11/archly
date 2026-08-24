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
        {error && <p className="error" role="alert">{error}</p>}
        {loading ? <p className="muted">Loading projects…</p> : projects.length === 0 ? (
          <button className="empty-state" onClick={() => setTemplatesOpen(true)}>
            <strong>Create your first architecture</strong>
            <span>Start with a blank diagram and design notes.</span>
          </button>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.id}>
                <button className="project-preview" onClick={() => setSelected(project)} aria-label={`Open ${project.name}`}>
                  <span className="preview-node one" /><span className="preview-line" /><span className="preview-node two" />
                </button>
                <div className="project-meta">
                  <button className="project-title" onClick={() => setSelected(project)}>{project.name}</button>
                  <p>Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                  <button className="text-button project-copy" onClick={() => void duplicateProject(project)}>Duplicate</button>
                  <button className="danger-link" onClick={() => removeProject(project)}>Delete</button>
                </div>
              </article>
            ))}
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
