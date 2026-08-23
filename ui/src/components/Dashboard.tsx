import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Project } from '../types'
import Editor from './Editor'

type Props = { token: string; onSignOut: () => void }

export default function Dashboard({ token, onSignOut }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listProjects(token)
      .then(setProjects)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [token])

  async function createProject() {
    setError('')
    try {
      const created = await api.createProject(token, 'Untitled architecture')
      setProjects((current) => [created, ...current])
      setSelected(created)
    } catch (reason) {
      setError((reason as Error).message)
    }
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
        <button className="text-button" onClick={onSignOut}>Sign out</button>
      </header>
      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div><p className="eyebrow">Your workspace</p><h1>Architecture projects</h1></div>
          <button className="primary-button" onClick={createProject}>+ New project</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {loading ? <p className="muted">Loading projects…</p> : projects.length === 0 ? (
          <button className="empty-state" onClick={createProject}>
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
                  <button className="danger-link" onClick={() => removeProject(project)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
