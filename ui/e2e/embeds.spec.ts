import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('read-only embed follows saved revisions, preserves navigation, and clears on revocation', async ({ page }) => {
  let revision = 1
  let revoked = false
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()) })
  await page.route('**/api/embeds/test-token', (route) => route.fulfill(revoked ? { status: 404, json: {} } : { json: {
    projectId: '00000000-0000-0000-0000-000000000001', revision, updatedAt: '2026-09-10T10:00:00Z',
    canvas: { nodes: [
      { id: 'a', type: 'architecture', position: { x: 0, y: 0 }, data: { kind: 'service', label: `Service revision ${revision}`, iconId: 'docker' } },
      { id: 'b', type: 'architecture', position: { x: 400, y: 200 }, data: { kind: 'database', label: 'Database' } },
    ], edges: [{ id: 'ab', type: 'editable', source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left', label: 'HTTPS', markerEnd: { type: 'arrowclosed' } }] },
  } }))
  await page.goto('/embed/test-token')
  await expect(page.getByText('Service revision 1', { exact: true })).toBeVisible()
  await expect(page.getByText('HTTPS', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /lock component|add component|undo/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open in edit mode' })).toHaveAttribute('href', '/#/project/00000000-0000-0000-0000-000000000001')
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click()
  const viewport = await page.locator('.react-flow__viewport').getAttribute('style')
  revision = 2
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('Service revision 2', { exact: true })).toBeVisible()
  await expect(page.locator('.react-flow__viewport')).toHaveAttribute('style', viewport!)
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([])
  revoked = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('This embed is unavailable, expired, or revoked.')).toBeVisible()
  await expect(page.locator('.embed-canvas')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('edit deep link requires a session and project authorization', async ({ page }) => {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/session') return route.fulfill({ json: { email: 'reader@gmail.com', isAdmin: false } })
    if (path === '/api/projects') return route.fulfill({ json: { items: [], page: 0, totalPages: 0 } })
    if (path === '/api/project-folders') return route.fulfill({ json: [] })
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/#/project/00000000-0000-0000-0000-000000000001')
  const signIn = page.getByRole('button', { name: 'Continue as local developer' })
  if (await signIn.isVisible()) await signIn.click()
  await expect(page.getByText('You do not have edit access to this project, or it is no longer available.')).toBeVisible()
  await expect(page.locator('.canvas-workspace')).toHaveCount(0)
})
