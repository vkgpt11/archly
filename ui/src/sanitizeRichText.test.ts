import { describe, expect, it } from 'vitest'
import { sanitizeRichText } from './sanitizeRichText'

describe('sanitizeRichText', () => {
  it('removes executable elements and event attributes', () => {
    const result = sanitizeRichText('<p onclick="alert(1)">Safe</p><img src="x" onerror="alert(1)"><script>alert(1)</script>')
    expect(result).toBe('<p>Safe</p>')
  })

  it('allows only HTTP, HTTPS, and email links', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">Unsafe</a>')).toBe('<a>Unsafe</a>')
    expect(sanitizeRichText('<a href="https://example.com" target="_blank">Safe</a>'))
      .toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Safe</a>')
    expect(sanitizeRichText('<a href="mailto:user@example.com">Email</a>'))
      .toBe('<a href="mailto:user@example.com">Email</a>')
  })

  it('retains supported text colors but removes other CSS', () => {
    expect(sanitizeRichText('<span style="color:#2563eb;position:fixed;background-image:url(x)">Blue</span><mark data-color="#fef3c7" style="background-color:#fef3c7;position:fixed">Marked</mark>'))
      .toBe('<span style="color: #2563eb">Blue</span><mark data-color="#fef3c7" style="background-color: #fef3c7">Marked</mark>')
  })

  it('keeps safe pasted screenshots and removes unsafe image sources', () => {
    const safe = '<img src="data:image/png;base64,aGVsbG8=" alt="Screenshot" width="640" onerror="alert(1)">'
    expect(sanitizeRichText(safe)).toBe('<img src="data:image/png;base64,aGVsbG8=" alt="Screenshot" width="640">')
    expect(sanitizeRichText('<img src="data:image/png;base64,aGVsbG8=" width="99999">'))
      .toBe('<img src="data:image/png;base64,aGVsbG8=">')
    expect(sanitizeRichText('<img src="https://example.com/tracker.png">')).toBe('')
    expect(sanitizeRichText('<img src="data:image/svg+xml;base64,PHN2Zz4=">')).toBe('')
  })
})
