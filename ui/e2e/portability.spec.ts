import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('downloads current complete content, previews, cancels and restores an independent project', async ({ page }) => {
  const canvas = { schemaVersion: 1, nodes: [{ id: 'api', type: 'architecture', position: { x: 40, y: 60 }, data: { kind: 'service', label: 'API' } }], edges: [],
    diagramCode: '# exact backup source\nservice api "API"\n', diagramModules: [{ id: 'shared', version: '1.0', source: '# shared module\n' }],
    activeVariant: 'prod', activeView: 'flow', diagramViewStates: { flow: { positions: { api: { x: 40, y: 60 } } } },
    diagramSnapshots: [{ name: 'Baseline', createdAt: '2026-09-08T00:00:00Z', nodes: [], edges: [], diagramCode: '# baseline' }] }
  const original = { id: 'original', name: 'Backup fixture', markdown: '<p>Original documentation</p>', canvasJson: JSON.stringify(canvas), revision: 1, createdAt: '2026-09-08T00:00:00Z', updatedAt: '2026-09-08T00:00:00Z' }
  const projects = [original]
  let importCalls = 0
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/session') return route.fulfill({ json: { email: 'developer@gmail.com' } })
    if (path === '/api/project-folders') return route.fulfill({ json: [] })
    if (path === '/api/projects') return route.fulfill({ json: { items: projects, page: 0, size: 24, totalItems: projects.length, totalPages: 1 } })
    if (path === '/api/projects/import/validate') return route.fulfill({ status: 204 })
    if (path === '/api/projects/import') {
      importCalls++
      const body = route.request().postDataJSON()
      expect(body.replaceProjectId).toBeUndefined()
      const restored = { ...original, ...body.project, id: 'restored', revision: 0 }
      projects.push(restored)
      return route.fulfill({ status: 201, json: restored })
    }
    const project = projects.find(item => path === `/api/projects/${item.id}`)
    if (project) return route.fulfill({ json: project })
    return route.fulfill({ status: 404, json: { message: 'Not mocked' } })
  })
  await page.goto('/')
  const signIn = page.getByRole('button', { name: 'Continue as local developer' })
  if (await signIn.isVisible()) await signIn.click()
  await page.getByRole('button', { name: 'Open Backup fixture' }).click()
  const document = page.getByLabel('Design documentation')
  await expect(document).toBeVisible()
  await document.fill('Unsaved backup documentation')
  await page.getByRole('button', { name: 'Export project' }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Archly source Complete project backup' }).click()
  const download = await downloading
  const path = await download.path()
  const backup = JSON.parse(await readFile(path, 'utf8'))
  const exported = JSON.parse(backup.project.canvasJson)
  expect(backup.project.markdown).toContain('Unsaved backup documentation')
  for (const key of ['diagramCode', 'diagramModules', 'activeVariant', 'activeView', 'diagramViewStates', 'diagramSnapshots'] as const) expect(exported[key]).toEqual(canvas[key])
  await page.goto('/')
  await page.getByRole('button', { name: 'Import project', exact: true }).click()
  await page.getByLabel('Project backup file').setInputFiles(path)
  await expect(page.getByRole('dialog').getByText(/1 snapshots/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(importCalls).toBe(0)
  await page.getByRole('button', { name: 'Import project', exact: true }).click()
  await page.getByLabel('Project backup file').setInputFiles(path)
  await page.getByRole('dialog').getByRole('button', { name: 'Import project', exact: true }).click()
  await expect(page.getByLabel('Design documentation')).toContainText('Unsaved backup documentation')
  expect(importCalls).toBe(1)
  expect(projects[0]).toEqual(original)
})
