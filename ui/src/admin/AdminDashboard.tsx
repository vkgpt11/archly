import { useCallback, useEffect, useState } from 'react'
import { ApiError, api, type AdminPeriod, type AdminSummary, type AdminTimeSeries, type AdminUserPage } from '../api'
import UserMenu from '../components/UserMenu'
import type { AuthSession } from '../api'
import { Download, RefreshCw } from 'lucide-react'

type Props = { token: string; user?: AuthSession; onBack: () => void; onSignOut?: () => void }
const periods: AdminPeriod[] = ['24h', '7d', '30d', '90d']
const seriesMetrics = [
  ['new-users', 'New users'],
  ['active-users', 'Active users'],
  ['diagrams-created', 'Diagrams created'],
  ['diagrams-deleted', 'Diagrams deleted'],
] as const
const utcDateTime = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC',
}).format(new Date(value))

export default function AdminDashboard({ token, user = { email: 'developer@gmail.com', isAdmin: true }, onBack, onSignOut = () => {} }: Props) {
  const [period, setPeriod] = useState<AdminPeriod>('30d')
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [series, setSeries] = useState<Record<string, AdminTimeSeries>>({})
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
        api.adminSummary(token, period),
        Promise.all(seriesMetrics.map(([metric]) => api.adminTimeSeries(token, metric, period))),
        api.adminUsers(token, userPage),
      ])
      setSummary(nextSummary); setSeries(Object.fromEntries(nextSeries.map(value => [value.metric, value]))); setUsers(nextUsers)
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
      <p className="admin-title">Administration</p>
      <UserMenu token={token} user={user} adminMode onSwitchMode={onBack} onSignOut={onSignOut} />
    </header>
    <section className="admin-content">
      <div className="dashboard-heading"><div><p className="eyebrow">Product analytics</p><h1>Usage overview</h1><p className="muted">Aggregate activity in UTC. Project content is never collected.</p></div>
        <div className="admin-heading-actions"><button className="text-button icon-text-button" onClick={() => void exportCsv()} disabled={loading || Boolean(error)}><Download />Export CSV</button><button className="text-button icon-text-button" onClick={() => void load()} disabled={loading}><RefreshCw />Refresh</button></div></div>
      <div className="admin-periods" aria-label="Metrics period">{periods.map(value => <button key={value} className={period === value ? 'active' : ''} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}</div>
      {notice && <p role="status" className="muted">{notice}</p>}
      {loading && <p role="status" className="muted">Loading administration metrics…</p>}
      {error && <div className="admin-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => void load()}>Try again</button></div>}
      {!loading && !error && summary && <>
        <p className="admin-range">{utcDateTime(summary.start)} – {utcDateTime(summary.end)} ({summary.timezone})</p>
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
        <section className="admin-panel"><h2>Activity over time</h2>
          <div className="admin-series-grid">{seriesMetrics.map(([metric, label]) => <Series key={metric} label={label} value={series[metric]} />)}</div>
        </section>
        <section className="admin-panel"><h2>Recent users</h2>
          {!users?.items.length ? <p className="muted">No users have established a session.</p> : <><div className="admin-table-wrap"><table><thead><tr><th>User</th><th>First login (UTC)</th><th>Last login (UTC)</th><th>Projects</th></tr></thead><tbody>{users.items.map(user => <tr key={user.id}><td>{user.maskedEmail}</td><td>{utcDateTime(user.firstLoginAt)}</td><td>{utcDateTime(user.lastLoginAt)}</td><td>{user.projectCount}</td></tr>)}</tbody></table></div><div className="admin-pagination"><button className="text-button" disabled={users.page === 0} onClick={() => setUserPage(value => value - 1)}>Previous users</button><span>Page {users.page + 1} of {Math.max(1, users.totalPages)}</span><button className="text-button" disabled={users.page + 1 >= users.totalPages} onClick={() => setUserPage(value => value + 1)}>Next users</button></div></>}
        </section>
      </>}
    </section>
  </main>
}

function Metric({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return <article className="metric-card"><p>{label}</p><strong>{value.toLocaleString()}{suffix}</strong></article>
}

function Series({ label, value }: { label: string; value?: AdminTimeSeries }) {
  if (!value?.buckets.some(bucket => bucket.value)) return <article><h3>{label}</h3><p className="muted">No activity in this period.</p></article>
  const maximum = Math.max(...value.buckets.map(bucket => bucket.value), 1)
  return <article><h3>{label}</h3><div className="metric-bars" aria-label={`${label} by UTC day`}>{value.buckets.map(bucket => <div key={bucket.date} title={`${bucket.date}: ${bucket.value}`}><span style={{ height: `${Math.max(4, bucket.value / maximum * 80)}px` }} /><small>{bucket.date.slice(5)}</small></div>)}</div><details><summary>View {label.toLowerCase()} data</summary><table><thead><tr><th>UTC date</th><th>Count</th></tr></thead><tbody>{value.buckets.map(bucket => <tr key={bucket.date}><td>{bucket.date}</td><td>{bucket.value}</td></tr>)}</tbody></table></details></article>
}
