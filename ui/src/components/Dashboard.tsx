import { lazy, Suspense, useEffect, useState } from 'react'
import { ApiError, api } from '../api'
import type { Project, ProjectPage, ProjectSummary } from '../types'
import ThemeToggle from './ThemeToggle'
import { architectureTemplates, templateCanvas, type ArchitectureTemplate } from '../architectureTemplates'

const Editor = lazy(() => import('./Editor'))
const AdminDashboard = lazy(() => import('../admin/AdminDashboard'))
const normalizeProjectPage = (response: ProjectPage | ProjectSummary[]): ProjectPage => Array.isArray(response)
  ? { items: response, page: 0, size: response.length, totalItems: response.length, totalPages: 1 }
  : response

type Props = { token: string; isAdmin?: boolean; onSignOut: () => void }

export default function Dashboard({ token, isAdmin = false, onSignOut }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [selected, setSelected] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'active' | 'archived'>('active')
  const [folder, setFolder] = useState('All')
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [adminOpen, setAdminOpen] = useState(() => window.location.hash === '#/admin')

  useEffect(() => {
    const syncAdminRoute = () => setAdminOpen(window.location.hash === '#/admin')
    window.addEventListener('hashchange', syncAdminRoute)
    syncAdminRoute()
    return () => window.removeEventListener('hashchange', syncAdminRoute)
  }, [])

  useEffect(() => {
    api.listProjects(token)
      .then((rawResponse) => {
        const response = normalizeProjectPage(rawResponse)
        setProjects(response.items)
        setNextPage(response.page + 1 < response.totalPages ? response.page + 1 : null)
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [token])

  async function loadMoreProjects() {
    if (nextPage === null) return
    try {
      const response = normalizeProjectPage(await api.listProjects(token, nextPage, 24))
      setProjects((current) => [...current, ...response.items])
      setNextPage(response.page + 1 < response.totalPages ? response.page + 1 : null)
    } catch (reason) { setError((reason as Error).message) }
  }

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

  async function openProject(project: ProjectSummary) {
    setError('')
    try { setSelected(await api.getProject(token, project.id)) }
    catch (reason) { setError((reason as Error).message) }
  }

  async function duplicateProject(project: ProjectSummary) {
    setError('')
    try {
      const copy = await api.duplicateProject(token, project.id)
      setProjects((current) => [copy, ...current])
    } catch (reason) { setError((reason as Error).message) }
  }

  async function removeProject() {
    if (!pendingDelete || deleting) return
    setDeleting(true)
    setError('')
    try {
      await api.deleteProject(token, pendingDelete.id)
      setProjects((current) => current.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (reason) {
      setError((reason as Error).message || 'The project could not be deleted. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  async function organizeProject(project: ProjectSummary, nextFolder: string | null, archived = Boolean(project.archived)) {
    try {
      const updated = await api.organizeProject(token, project.id, nextFolder, archived, project.revision)
      setProjects((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        const latest = await api.getProject(token, project.id)
        setProjects((current) => current.map((item) => item.id === latest.id ? latest : item))
        setError('This project changed elsewhere. The latest folder and archive state has been loaded; review it and try again.')
      } else setError((reason as Error).message)
    }
  }

  const folders = ['All', ...Array.from(new Set(projects.map((project) => project.folder).filter((value): value is string => Boolean(value))))]
  const visibleProjects = projects.filter((project) =>
    Boolean(project.archived) === (scope === 'archived')
    && (folder === 'All' || project.folder === folder)
    && `${project.name} ${project.folder || ''}`.toLowerCase().includes(search.trim().toLowerCase()))

  if (selected) {
    return (
      <Suspense fallback={<main className="shared-error"><p>Loading editor…</p></main>}><Editor
        token={token}
        initialProject={selected}
        onBack={(updated) => {
          setProjects((current) => current.map((item) => item.id === updated.id ? updated : item))
          setSelected(null)
        }}
      /></Suspense>
    )
  }

  if (adminOpen && isAdmin) return <Suspense fallback={<main className="shared-error"><p>Loading administration…</p></main>}>
    <AdminDashboard token={token} onBack={() => { window.location.hash = ''; setAdminOpen(false) }} />
  </Suspense>

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Archly home"><span>A</span> Archly</a>
        {isAdmin && <button className="text-button" onClick={() => { window.location.hash = '#/admin'; setAdminOpen(true) }}>Administration</button>}
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
                <button className="project-preview" onClick={() => void openProject(project)} aria-label={`Open ${project.name}`}>
                  <span className="preview-node one" /><span className="preview-line" /><span className="preview-node two" />
                </button>
                <div className="project-meta">
                  <button className="project-title" onClick={() => void openProject(project)}>{project.name}</button>
                  <p>Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                  <button className="text-button project-copy" onClick={() => void duplicateProject(project)}>Duplicate</button>
                  <button className="text-button" onClick={() => {
                    const next = window.prompt('Folder name (leave blank for no folder)', project.folder || '')
                    if (next !== null) void organizeProject(project, next.trim() || null)
                  }}>Move</button>
                  <button className="text-button" onClick={() => void organizeProject(project, project.folder || null, !project.archived)}>{project.archived ? 'Restore' : 'Archive'}</button>
                  <button className="danger-link" onClick={() => setPendingDelete(project)}>Delete</button>
                </div>
              </article>
            ))}
            {!visibleProjects.length && <p className="muted project-empty-filter">No projects match these filters.</p>}
          </div>
        )}
        {nextPage !== null && <button className="text-button" onClick={() => void loadMoreProjects()}>Load more projects</button>}
        {templatesOpen && <div className="template-backdrop" role="presentation" onMouseDown={() => setTemplatesOpen(false)}>
          <section className="template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><p className="eyebrow">New project</p><h2 id="template-title">Choose an architecture template</h2></div><button className="text-button" onClick={() => setTemplatesOpen(false)}>Close</button></header>
            <div className="template-grid">{architectureTemplates.map((template) => <button key={template.id} onClick={() => void createProject(template)}>
              <strong>{template.name}</strong><span>{template.description}</span><small>{template.nodes.length ? `${template.nodes.length} editable components` : 'Empty canvas'}</small>
            </button>)}</div>
          </section>
        </div>}
        {pendingDelete && <div className="modal-backdrop" onMouseDown={() => !deleting && setPendingDelete(null)}>
          <section className="delete-project-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" aria-describedby="delete-project-description" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Delete project</p>
            <h2 id="delete-project-title">Delete “{pendingDelete.name}”?</h2>
            <p id="delete-project-description">This permanently removes the document, diagram, and active share links. This action cannot be undone.</p>
            <div className="delete-project-actions">
              <button className="text-button" disabled={deleting} onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className="danger-button" disabled={deleting} onClick={() => void removeProject()}>{deleting ? 'Deleting…' : 'Delete project'}</button>
            </div>
          </section>
        </div>}
      </section>
    </main>
  )
}
