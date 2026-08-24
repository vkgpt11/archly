const allowedTags = new Set([
  'P', 'BR', 'H1', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I', 'S', 'STRIKE', 'DEL',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'SPAN', 'MARK', 'A',
])
const removeWithContent = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'SVG', 'MATH'])
const colorValue = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i
const codeClass = /^language-[a-z0-9_-]{1,40}$/

function safeColorStyle(value: string): string {
  return value.split(';').flatMap((declaration) => {
    const separator = declaration.indexOf(':')
    if (separator < 0) return []
    const property = declaration.slice(0, separator).trim().toLowerCase()
    const color = declaration.slice(separator + 1).trim()
    return (property === 'color' || property === 'background-color') && colorValue.test(color)
      ? [property + ': ' + color]
      : []
  }).join('; ')
}

function sanitizeAttributes(element: Element) {
  const tag = element.tagName
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    const allowed = tag === 'A'
      ? ['href', 'title', 'target', 'rel'].includes(name)
      : tag === 'SPAN' || tag === 'MARK'
        ? name === 'style' || tag === 'MARK' && name === 'data-color'
        : tag === 'CODE'
          ? name === 'class'
          : false
    if (!allowed) element.removeAttribute(attribute.name)
  }
  if (tag === 'A') {
    const href = element.getAttribute('href')?.trim() || ''
    if (!/^(https?:|mailto:)/i.test(href)) element.removeAttribute('href')
    if (element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer')
  }
  if ((tag === 'SPAN' || tag === 'MARK') && element.hasAttribute('style')) {
    const style = safeColorStyle(element.getAttribute('style') || '')
    if (style) element.setAttribute('style', style)
    else element.removeAttribute('style')
  }
  if (tag === 'MARK' && element.hasAttribute('data-color') && !colorValue.test(element.getAttribute('data-color') || '')) {
    element.removeAttribute('data-color')
  }
  if (tag === 'CODE' && element.hasAttribute('class') && !codeClass.test(element.getAttribute('class') || '')) {
    element.removeAttribute('class')
  }
}

export function sanitizeRichText(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  for (const element of Array.from(template.content.querySelectorAll('*'))) {
    if (removeWithContent.has(element.tagName)) {
      element.remove()
    } else if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes))
    } else {
      sanitizeAttributes(element)
    }
  }
  return template.innerHTML
}
