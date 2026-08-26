import { describe, expect, it } from 'vitest'
import { markdownFromHtml } from './diagramExport'

describe('diagram exports', () => {
  it('converts rich documentation into portable Markdown', () => {
    expect(markdownFromHtml('<h1>Architecture</h1><p><strong>API</strong> calls <a href="https://example.com">service</a>.</p><pre><code>GET /health</code></pre>'))
      .toBe('# Architecture\n\n**API** calls [service](https://example.com).\n\n```\nGET /health\n```\n')
  })
})
