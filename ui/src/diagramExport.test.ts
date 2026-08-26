import { describe, expect, it } from 'vitest'
import { markdownFromHtml } from './diagramExport'

describe('diagram exports', () => {
  it('converts rich documentation into portable Markdown', () => {
    expect(markdownFromHtml('<h1>Architecture</h1><p><strong>API</strong> calls <a href="https://example.com">service</a>.</p><pre><code>GET /health</code></pre>'))
      .toBe('# Architecture\n\n**API** calls [service](<https://example.com>)\\.\n\n```\nGET /health\n```\n')
  })

  it('preserves ordered and nested lists', () => {
    expect(markdownFromHtml('<ol><li>First<ul><li>Nested</li></ul></li><li>Second</li></ol>'))
      .toBe('1. First\n  - Nested\n2. Second\n')
  })

  it('preserves code languages and chooses a safe fence when code contains backticks', () => {
    expect(markdownFromHtml('<pre><code class="language-typescript">const value = ```example```;</code></pre>'))
      .toBe('````typescript\nconst value = ```example```;\n````\n')
  })

  it('escapes Markdown control characters and omits embedded base64 payloads', () => {
    const markdown = markdownFromHtml('<p>*literal* [text]</p><img alt="Diagram" src="data:image/png;base64,AAAA">')
    expect(markdown).toContain('\\*literal\\* \\[text\\]')
    expect(markdown).toContain('Embedded image omitted: Diagram')
    expect(markdown).not.toContain('AAAA')
  })
})
