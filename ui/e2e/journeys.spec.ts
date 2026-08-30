import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

const now = '2026-08-27T00:00:00Z'
const emptyCanvas = JSON.stringify({ schemaVersion: 1, nodes: [], edges: [] })

function project(id: string, name: string) {
  return { id, name, markdown: '<p></p>', canvasJson: emptyCanvas, revision: 0, createdAt: now, updatedAt: now }
}

async function installStatefulApi(page: Page, seed = [project('existing', 'Existing architecture')]) {
  let projects = [...seed]
  let shares: Array<Record<string, unknown>> = []
  const handler = async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    if (path === '/api/auth/session') return route.fulfill({ json: { email: 'developer@gmail.com' } })
    if (path === '/api/projects' && request.method() === 'GET') return route.fulfill({ json: { items: projects.map((item) => ({
      id: item.id, name: item.name, revision: item.revision, createdAt: item.createdAt, updatedAt: item.updatedAt,
    })), page: 0, size: 24, totalItems: projects.length, totalPages: 1 } })
    if (path === '/api/projects' && request.method() === 'POST') {
      const created = project(`project-${projects.length + 1}`, (request.postDataJSON() as { name: string }).name)
      projects = [created, ...projects]
      return route.fulfill({ status: 201, json: created })
    }
    const duplicate = path.match(/^\/api\/projects\/([^/]+)\/duplicate$/)
    if (duplicate && request.method() === 'POST') {
      const source = projects.find((item) => item.id === duplicate[1])!
      const copy = { ...source, id: `${source.id}-copy`, name: `${source.name} — Copy`, revision: 0 }
      projects = [copy, ...projects]
      return route.fulfill({ status: 201, json: copy })
    }
    const sharePath = path.match(/^\/api\/projects\/([^/]+)\/shares$/)
    if (sharePath && request.method() === 'GET') return route.fulfill({ json: shares })
    if (sharePath && request.method() === 'POST') {
      const permission = (request.postDataJSON() as { permission: string }).permission
      const created = { id: 'share-1', token: 'public-token', permission, revoked: false, expiresAt: '2026-09-27T00:00:00Z' }
      shares = [created]
      return route.fulfill({ status: 201, json: created })
    }
    const revoke = path.match(/^\/api\/projects\/([^/]+)\/shares\/([^/]+)$/)
    if (revoke && request.method() === 'DELETE') {
      shares = shares.map((share) => ({ ...share, revoked: true }))
      return route.fulfill({ status: 204 })
    }
    const item = path.match(/^\/api\/projects\/([^/]+)$/)
    if (item && request.method() === 'GET') return route.fulfill({ json: projects.find((candidate) => candidate.id === item[1]) })
    if (item && request.method() === 'PUT') {
      const incoming = request.postDataJSON() as Record<string, unknown>
      let saved: ReturnType<typeof project> | undefined
      projects = projects.map((candidate) => candidate.id === item[1]
        ? (saved = { ...candidate, ...incoming, revision: candidate.revision + 1, updatedAt: now } as ReturnType<typeof project>)
        : candidate)
      return route.fulfill({ json: saved })
    }
    return route.fulfill({ status: 404, json: { message: 'Not mocked' } })
  }
  await page.route('**/api/**', handler)
}

async function signIn(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Continue as local developer' }).click()
}

test('creates, edits, autosaves, returns to dashboard, and duplicates a project', async ({ page }) => {
  await installStatefulApi(page, [])
  await signIn(page)
  await page.getByRole('button', { name: /Create your first architecture/ }).click()
  await page.getByRole('button', { name: /^Blank diagram/ }).click()
  await expect(page.getByLabel('Project name')).toBeVisible()
  await page.getByLabel('Project name').fill('Checkout platform')
  await page.getByLabel('Design documentation').fill('Checkout system design')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Back to projects' }).click()
  await expect(page.getByText('Checkout platform', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByText('Checkout platform — Copy', { exact: true })).toBeVisible()
})

test('administrator opens aggregate analytics while normal users have no admin navigation', async ({ page }) => {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/session') return route.fulfill({ json: { email: 'admin@gmail.com', isAdmin: true } })
    if (path === '/api/projects') return route.fulfill({ json: { items: [], page: 0, size: 24, totalItems: 0, totalPages: 0 } })
    if (path === '/api/admin/metrics/summary') return route.fulfill({ json: { period: '30d', timezone: 'UTC', start: now, end: now, users: { total: 4, newUsers: 2, active: 3 }, diagrams: { current: 9, archived: 1, created: 5, deleted: 1, perActiveUser: 1.67 }, conversion: { firstDiagramPercent: 75, firstSavePercent: 50 } } })
    if (path === '/api/admin/metrics/timeseries') return route.fulfill({ json: { metric: 'diagrams-created', timezone: 'UTC', buckets: [{ date: '2026-08-27', value: 5 }] } })
    if (path === '/api/admin/users') return route.fulfill({ json: { items: [{ id: 'one', maskedEmail: 'a***@gmail.com', firstLoginAt: now, lastLoginAt: now, projectCount: 2 }], page: 0, size: 25, totalItems: 1, totalPages: 1 } })
    return route.fulfill({ status: 404 })
  })
  await signIn(page)
  await page.getByRole('button', { name: 'Administration' }).click()
  await expect(page.getByRole('heading', { name: 'Usage overview' })).toBeVisible()
  await expect(page.getByText('Observed users').locator('..')).toContainText('4')
  await expect(page.getByText('a***@gmail.com')).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})

test('creates and revokes a read-only share link', async ({ page }) => {
  await installStatefulApi(page)
  await signIn(page)
  await page.getByRole('button', { name: 'Open Existing architecture' }).click()
  await page.getByRole('button', { name: 'Share project' }).click()
  await page.getByRole('button', { name: 'Create link' }).click()
  await expect(page.getByLabel('New share link')).toHaveValue(/\/share\/public-token$/)
  await page.getByRole('button', { name: 'Revoke' }).click()
  await expect(page.getByText('Revoked')).toBeVisible()
})

test('creates and autosaves a nested region from persistent diagram code', async ({ page }) => {
  await installStatefulApi(page)
  await signIn(page)
  await page.getByRole('button', { name: 'Open Existing architecture' }).click()
  await page.getByRole('button', { name: 'Diagram as code' }).click()
  const source = `direction right

# Production topology
region east "AWS · us-east-1" {
  container vpc "Production VPC" {
    aws-lambda api "Orders API"
    aws-rds db "Orders DB"
    api.right -> db.left : "SQL"
  }
}`
  await page.getByRole('textbox', { name: 'Diagram code' }).fill(source)
  await page.getByRole('button', { name: 'Draw diagram' }).click()
  await expect(page.getByText('AWS · us-east-1', { exact: true })).toBeVisible()
  await expect(page.getByText('Production VPC', { exact: true })).toBeVisible()
  await expect(page.getByText('Orders API', { exact: true })).toBeVisible()
  await expect(page.getByText('Orders DB', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Line text')).toHaveValue('SQL')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Close diagram code' }).click()
  await page.getByRole('button', { name: 'Diagram as code' }).click()
  await expect(page.getByRole('textbox', { name: 'Diagram code' })).toHaveValue(source)
})

test('dashboard and editor have no serious or critical axe violations', async ({ page }) => {
  await installStatefulApi(page)
  await signIn(page)
  let results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([])

  await page.getByRole('button', { name: 'Open Existing architecture' }).click()
  await expect(page.getByLabel('Design documentation')).toBeVisible()
  results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([])
})
