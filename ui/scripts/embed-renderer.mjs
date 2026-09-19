// Private service: renders public projections and compiles named views from saved source.
// Receives no share token, credential, document, or snapshot history.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import { chromium } from '@playwright/test'

const key = process.env.ARCHLY_EMBED_RENDERER_KEY || ''
if (key.length < 32) throw new Error('ARCHLY_EMBED_RENDERER_KEY must contain at least 32 characters')
const root = resolve(process.env.ARCHLY_EMBED_UI_DIR || 'dist')
const port = Number(process.env.PORT || 8090)
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] })
let active = 0
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
function authorized(request) {
  const supplied = Buffer.from(request.headers.authorization || '')
  const expected = Buffer.from(`Bearer ${key}`)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  if (request.url === '/health' && request.method === 'GET') { response.end('OK'); return }
  if (!['/render', '/project'].includes(request.url) || request.method !== 'POST' || !authorized(request)) { response.writeHead(404).end(); return }
  if (active >= 2) { response.writeHead(429).end(); return }
  active++
  let context
  let timeout
  try {
    let size = 0
    const chunks = []
    for await (const chunk of request) {
      size += chunk.length
      if (size > 20_000_000) { response.writeHead(413).end(); return }
      chunks.push(chunk)
    }
    const diagram = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!Array.isArray(diagram.canvas?.nodes) || !Array.isArray(diagram.canvas?.edges) || diagram.canvas.nodes.length > 1500 || diagram.canvas.edges.length > 3000) { response.writeHead(400).end(); return }
    context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: 'block' })
    const current = context
    timeout = setTimeout(() => void current.close(), 15_000)
    response.on('close', () => void current.close())
    const page = await context.newPage()
    // No arbitrary network access, even for URLs stored in a diagram.
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/embeds/render') return route.fulfill({ json: diagram })
      if (url.origin !== 'http://archly-render.local') return route.abort()
      const path = url.pathname.startsWith('/assets/') ? resolve(root, '.' + decodeURIComponent(url.pathname)) : resolve(root, url.pathname === '/embed-project.html' ? 'embed-project.html' : 'index.html')
      if (!path.startsWith(root + sep)) return route.abort()
      try { await route.fulfill({ body: await readFile(path), contentType: types[extname(path)] || 'application/octet-stream' }) }
      catch { await route.abort() }
    })
    if (request.url === '/project') {
      await page.goto('http://archly-render.local/embed-project.html')
      await page.waitForFunction(() => typeof window.archlyProject === 'function')
      const result = await page.evaluate((input) => {
        try { return { canvas: window.archlyProject(input) } } catch { return { unavailable: true } }
      }, diagram)
      if (result.unavailable) { response.writeHead(422).end('Published view unavailable'); return }
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result.canvas))
      return
    }
    await page.goto('http://archly-render.local/embed/render')
    await page.locator('.embed-canvas .react-flow__viewport').waitFor()
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => { throw new Error('Image decoding failed') })))
    })
    await page.getByRole('button', { name: 'Fit View', exact: true }).click()
    await page.addStyleTag({ content: '.react-flow__controls,.react-flow__attribution{display:none!important}' })
    const png = await page.locator('.embed-canvas').screenshot({ type: 'png', animations: 'disabled' })
    response.writeHead(200, { 'Content-Type': 'image/png' }).end(png)
  } catch { if (!response.headersSent) response.writeHead(503).end('Rendering unavailable') }
  finally { clearTimeout(timeout); await context?.close(); active-- }
})
server.requestTimeout = 20_000
server.listen(port, '0.0.0.0')
process.on('SIGTERM', () => { server.close(); void browser.close().finally(() => process.exit(0)) })
