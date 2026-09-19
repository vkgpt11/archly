import { describe, expect, it } from 'vitest'
import { embedSnippets } from './embedApi'

describe('external embed snippets', () => {
  it('links Markdown to the viewer and permission-checked edit route', () => {
    const snippets = embedSnippets('safe.token', 'https://archly.example')
    expect(snippets.url).toBe('https://archly.example/embed/safe.token')
    expect(snippets.iframe).toContain('referrerpolicy="no-referrer"')
    expect(snippets.markdown).toContain('/embeds/safe.token/image.png')
    expect(snippets.markdown).toContain('/embed/safe.token?edit=1')
    expect(snippets.markdown).not.toContain('/share/')
  })
})
