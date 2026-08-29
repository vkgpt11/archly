import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, type AdminPeriod, type AdminSummary, type AdminTimeSeries, type AdminUserPage } from '../api'
import ThemeToggle from '../components/ThemeToggle'

type Props = { token: string; onBack: () => void }
const periods: AdminPeriod[] = ['24h', '7d', '30d', '90d']

export default function AdminDashboard({ token, onBack }: Props) {
  const [period, setPeriod] = useState<AdminPeriod>('30d')
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [series, setSeries] = useState<AdminTimeSeries | null>(null)
  const [users, setUsers] = useState<AdminUserPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [userPage, setUserPage] = useState(0)

  async function exportCsv() {
    try {
      const blob = await api.adminCsv(token, period)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `archly-metrics-${period}.csv`; anchor.click()
      URL.revokeObjectURL(url)
      setNotice('Metrics CSV downloaded.')
    } catch (failure) { setError((failure as Error).message || 'Metrics could not be exported.') }
  }

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [nextSummary, nextSeries, nextUsers] = await Promise.all([
        api.adminSummary(token, period), api.adminTimeSeries(token, 'diagrams-created', period), api.adminUsers(token, userPage),
      ])
      setSummary(nextSummary); setSeries(nextSeries); setUsers(nextUsers)
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) setError('Your session expired. Sign in again to access administration.')
      else if (failure instanceof ApiError && failure.status === 403) setError('Your account does not have administrator access.')
      else setError((failure as Error).message || 'Administration metrics are unavailable.')
    } finally { setLoading(false) }
  }, [period, token, userPage])

  useEffect(() => { void load() }, [load])

  return <main className="admin-shell">
    <header className="topbar">
      <button className="brand" onClick={onBack} aria-label="Back to projects"><span>A</span> Archly</button>
      <p className="admin-title">Administration</p><ThemeToggle />
      <button className="text-button" onClick={onBack}>Back to projects</button>
    </header>
    <section className="admin-content">
      <div className="dashboard-heading"><div><p className="eyebrow">Product analytics</p><h1>Usage overview</h1><p className="muted">Aggregate activity in UTC. Project content is never collected.</p></div>
        <div><button className="text-button" onClick={() => void exportCsv()} disabled={loading || Boolean(error)}>Export CSV</button><button className="text-button" onClick={() => void load()} disabled={loading}>Refresh</button></div></div>
      <div className="admin-periods" aria-label="Metrics period">{periods.map(value => <button key={value} className={period === value ? 'active' : ''} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}</div>
      {notice && <p role="status" className="muted">{notice}</p>}
      {loading && <p role="status" className="muted">Loading administration metrics…</p>}
      {error && <div className="admin-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => void load()}>Try again</button></div>}
      {!loading && !error && summary && <>
        <p className="admin-range">{new Date(summary.start).toLocaleString()} – {new Date(summary.end).toLocaleString()} ({summary.timezone})</p>
        <div className="metric-grid">
          <Metric label="Observed users" value={summary.users.total} />
          <Metric label="Active users" value={summary.users.active} />
          <Metric label="New users" value={summary.users.newUsers} />
          <Metric label="Current diagrams" value={summary.diagrams.current} />
          <Metric label="Created in period" value={summary.diagrams.created} />
          <Metric label="Deleted in period" value={summary.diagrams.deleted} />
          <Metric label="First diagram conversion" value={summary.conversion.firstDiagramPercent} suffix="%" />
          <Metric label="First save conversion" value={summary.conversion.firstSavePercent} suffix="%" />
        </div>
        <section className="admin-panel"><h2>Diagrams created</h2>
          {series?.buckets.some(bucket => bucket.value) ? <><div className="metric-bars" aria-label="Diagrams created by day">{series.buckets.map(bucket => <div key={bucket.date} title={`${bucket.date}: ${bucket.value}`}><span style={{ height: `${Math.max(4, bucket.value * 10)}px` }} /><small>{bucket.date.slice(5)}</small></div>)}</div><details><summary>View chart data</summary><ul>{series.buckets.map(bucket => <li key={bucket.date}>{bucket.date}: {bucket.value}</li>)}</ul></details></> : <p className="muted">No diagrams were created in this period.</p>}
        </section>
        <section className="admin-panel"><h2>Recent users</h2>
          {!users?.items.length ? <p className="muted">No users have established a session.</p> : <><div className="admin-table-wrap"><table><thead><tr><th>User</th><th>First login</th><th>Last login</th><th>Projects</th></tr></thead><tbody>{users.items.map(user => <tr key={user.id}><td>{user.maskedEmail}</td><td>{new Date(user.firstLoginAt).toLocaleString()}</td><td>{new Date(user.lastLoginAt).toLocaleString()}</td><td>{user.projectCount}</td></tr>)}</tbody></table></div><div className="admin-pagination"><button className="text-button" disabled={users.page === 0} onClick={() => setUserPage(value => value - 1)}>Previous users</button><span>Page {users.page + 1} of {Math.max(1, users.totalPages)}</span><button className="text-button" disabled={users.page + 1 >= users.totalPages} onClick={() => setUserPage(value => value + 1)}>Next users</button></div></>}
        </section>
      </>}
    </section>
  </main>
}

function Metric({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return <article className="metric-card"><p>{label}</p><strong>{value.toLocaleString()}{suffix}</strong></article>
}
