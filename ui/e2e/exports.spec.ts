import { expect, test, type Page } from '@playwright/test'

const project = {
  id: 'export-project', name: 'Export coverage', markdown: '<h1>Architecture</h1><p>Export verification</p>',
  canvasJson: JSON.stringify({ schemaVersion: 1, nodes: [
    { id: 'near', type: 'architecture', position: { x: 40, y: 60 }, data: { kind: 'service', label: 'Visible API' } },
    { id: 'far', type: 'architecture', position: { x: 1800, y: 1200 }, data: { kind: 'database', label: 'Far Away Database' } },
  ], edges: [{ id: 'near-far', type: 'editable', source: 'near', target: 'far', label: 'replicates', markerEnd: { type: 'arrowclosed' } }] }),
  revision: 0, createdAt: '2026-08-26T00:00:00Z', updatedAt: '2026-08-26T00:00:00Z',
}

async function openProject(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth/session') return route.fulfill({ json: { email: 'developer@gmail.com' } })
    if (url.pathname === '/api/projects') return route.fulfill({ json: { items: [{ ...project, canvasJson: undefined, markdown: undefined }], page: 0, size: 24, totalItems: 1, totalPages: 1 } })
    if (url.pathname === `/api/projects/${project.id}`) return route.fulfill({ json: project })
    return route.fulfill({ status: 404, json: { message: 'Not mocked' } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Continue as local developer' }).click()
  await page.getByRole('button', { name: `Open ${project.name}` }).click()
  await expect(page.getByText('Far Away Database')).toBeAttached()
}

test('exports full SVG with theme styling and off-screen content', async ({ page }) => {
  await openProject(page)
  await page.getByRole('button', { name: 'Use dark theme' }).click()
  await page.getByRole('button', { name: 'Export project' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /SVG Vector image/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Export-coverage.svg')
  const contents = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8')
  expect(contents).toContain('Far Away Database')
  expect(contents).toContain('Visible API')
  expect(contents).toContain('data-archly-export-arrow="end"')
  expect(contents).toMatch(/<polygon[^>]+data-archly-export-arrow="end"/)
  expect(contents).toMatch(/<path[^>]+class="react-flow__edge-path"[^>]+stroke="(?!none|transparent)[^"]+"/)
  expect(contents).toMatch(/<path[^>]+class="react-flow__edge-path"[^>]+stroke-width="(?:1\.5|[2-9][\d.]*)"/)
  expect(contents).toMatch(/react-flow__viewport[^>]+background(?:-color)?: transparent/)
  expect(contents).not.toContain('data-archly-export-background')
  expect(Number(contents.match(/<svg[^>]*\bwidth="(\d+)"/)?.[1])).toBeGreaterThan(1_800)
  expect(Number(contents.match(/<svg[^>]*\bheight="(\d+)"/)?.[1])).toBeGreaterThan(1_200)
  expect(contents.length).toBeGreaterThan(1_000)
})

test('exports PNG, selection-only content, and clipboard image', async ({ page }) => {
  await openProject(page)
  await page.locator('.react-flow__node').first().click()
  await page.getByRole('button', { name: 'Export project' }).click()
  await page.getByRole('checkbox', { name: 'Selection only' }).check()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /PNG Raster image/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Export-coverage-selection.png')
  expect((await (await import('node:fs/promises')).stat(await download.path())).size).toBeGreaterThan(100)

  await page.getByRole('button', { name: /Copy image PNG to clipboard/ }).click()
  await expect(page.getByText('Diagram copied.')).toBeVisible()
  const clipboardTypes = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((item) => item.types))
  expect(clipboardTypes).toContain('image/png')
})
