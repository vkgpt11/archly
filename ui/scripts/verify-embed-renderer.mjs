import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

const key = randomBytes(32).toString('hex')
const port = 18090
const child = spawn(process.execPath, ['scripts/embed-renderer.mjs'], {
  env: { ...process.env, PORT: String(port), ARCHLY_EMBED_RENDERER_KEY: key }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
})
let output = ''
child.stderr.on('data', (chunk) => { output += chunk.toString() })
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    try { ready = (await fetch(`http://127.0.0.1:${port}/health`)).ok } catch { /* startup */ }
    if (ready) break
    if (child.exitCode !== null) throw new Error(output)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  assert.ok(ready, 'Renderer started')
  assert.equal((await fetch(`http://127.0.0.1:${port}/render`, { method: 'POST', body: '{}' })).status, 404)
  const project = async (view) => fetch(`http://127.0.0.1:${port}/project`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ view, variant: '', canvas: { nodes: [], edges: [], diagramCode: 'service api "Public"\ndatabase db "Internal"\nview dataflow external {\ninclude api\n}' } }) })
  const projected = await project('external')
  assert.equal(projected.status, 200)
  const projectedBody = await projected.json()
  assert.deepEqual(projectedBody.nodes.map((node) => node.id), ['api'])
  assert.equal(projectedBody.diagramCode, undefined)
  assert.equal((await project('missing')).status, 422)
  const fixture = { projectId: 'test', revision: 1, updatedAt: '2026-09-10T00:00:00Z', canvas: {
    nodes: [
      { id: 'web', type: 'architecture', position: { x: 0, y: 0 }, data: { kind: 'web', label: 'Web application', iconId: 'docker' } },
      { id: 'db', type: 'architecture', position: { x: 500, y: 180 }, data: { kind: 'database', label: 'PostgreSQL', iconId: 'postgresql' } },
    ], edges: [{ id: 'request', type: 'editable', source: 'web', target: 'db', sourceHandle: 'right', targetHandle: 'left', label: 'TLS · SQL', markerEnd: { type: 'arrowclosed' }, style: { stroke: '#2563eb', strokeWidth: 2 } }],
  } }
  const result = await fetch(`http://127.0.0.1:${port}/render`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(fixture) })
  assert.equal(result.status, 200, `Renderer returned ${result.status}: ${result.status === 200 ? '' : await result.text()}`)
  const bytes = Buffer.from(await result.arrayBuffer())
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.ok(bytes.length > 1000)
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/embed-render.png', bytes)
  console.log('Renderer authentication and real Chromium PNG verified; test-results/embed-render.png')
} finally { child.kill() }
