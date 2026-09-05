import { expect, test } from '@playwright/test'

test('loads and manipulates the documented 300-node and 500-connection canvas', async ({ page }) => {
  const nodes = Array.from({ length: 300 }, (_, index) => ({
    id: `node-${index}`, type: 'architecture',
    position: { x: (index % 20) * 180, y: Math.floor(index / 20) * 120 },
    data: { kind: 'service', label: `Service ${index}` },
  }))
  const edges = Array.from({ length: 500 }, (_, index) => ({
    id: `edge-${index}`, type: 'editable', source: `node-${index % 300}`, target: `node-${(index * 7 + 1) % 300}`,
  }))
  const project = {
    id: 'large-project', name: 'Large architecture', markdown: '<p>Performance fixture</p>',
    canvasJson: JSON.stringify({ schemaVersion: 1, nodes, edges }), revision: 0,
    createdAt: '2026-08-27T00:00:00Z', updatedAt: '2026-08-27T00:00:00Z',
  }
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/session') return route.fulfill({ json: { email: 'developer@gmail.com' } })
    if (path === '/api/projects') return route.fulfill({ json: { items: [{ ...project, canvasJson: undefined, markdown: undefined }], page: 0, size: 24, totalItems: 1, totalPages: 1 } })
    if (path === `/api/projects/${project.id}` && route.request().method() === 'GET') return route.fulfill({ json: project })
    if (path === `/api/projects/${project.id}` && route.request().method() === 'PUT') return route.fulfill({ json: { ...project, revision: 1 } })
    return route.fulfill({ status: 404 })
  })

  await page.goto('/')
  const signIn = page.getByRole('button', { name: 'Continue as local developer' })
  if (await signIn.isVisible()) await signIn.click()
  const start = Date.now()
  await page.getByRole('button', { name: 'Open Large architecture' }).click()
  await expect(page.locator('.react-flow')).toBeVisible({ timeout: 15_000 })
  const loadMilliseconds = Date.now() - start
  expect(loadMilliseconds).toBeLessThan(10_000)

  await page.getByRole('button', { name: /^canvas$/i }).click()
  const node = page.locator('.react-flow__node').first()
  await expect(node).toBeVisible()
  const box = await node.boundingBox()
  expect(box).not.toBeNull()
  const interactionStart = Date.now()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 + 40, { steps: 8 })
  await page.mouse.up()
  expect(Date.now() - interactionStart).toBeLessThan(1_500)
  test.info().annotations.push({ type: 'performance', description: `load=${loadMilliseconds}ms` })
})
