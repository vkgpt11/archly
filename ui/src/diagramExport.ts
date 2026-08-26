import { toPng, toSvg } from 'html-to-image'
import type { Project } from './types'

export type ExportFormat = 'png' | 'svg' | 'markdown' | 'source'

const safeName = (name: string) => name.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '') || 'archly-diagram'

function download(data: string | Blob, filename: string, type?: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function markdownFromHtml(html: string): string {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  const render = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (!(node instanceof HTMLElement)) return Array.from(node.childNodes).map(render).join('')
    const body = Array.from(node.childNodes).map(render).join('')
    switch (node.tagName) {
      case 'H1': return `# ${body}\n\n`
      case 'H2': return `## ${body}\n\n`
      case 'H3': return `### ${body}\n\n`
      case 'P': return `${body}\n\n`
      case 'STRONG': case 'B': return `**${body}**`
      case 'EM': case 'I': return `*${body}*`
      case 'CODE': return `\`${body}\``
      case 'PRE': return `\`\`\`\n${node.textContent || ''}\n\`\`\`\n\n`
      case 'A': return `[${body}](${node.getAttribute('href') || ''})`
      case 'LI': return `- ${body}\n`
      case 'UL': case 'OL': return `${body}\n`
      case 'BLOCKQUOTE': return body.split('\n').filter(Boolean).map((line) => `> ${line}`).join('\n') + '\n\n'
      case 'IMG': return `![${node.getAttribute('alt') || 'image'}](${node.getAttribute('src') || ''})`
      default: return body
    }
  }
  return render(documentNode.body).trim() + '\n'
}

function canvasElement(): HTMLElement {
  const element = document.querySelector<HTMLElement>('.canvas-panel .react-flow__viewport')
  if (!element) throw new Error('Open the canvas before exporting a rendered diagram.')
  return element
}

const selectionFilter = (selectionOnly: boolean) => (node: HTMLElement) => {
  if (!selectionOnly) return true
  if (node.classList?.contains('react-flow__node')) return node.classList.contains('selected')
  if (node.classList?.contains('react-flow__edge')) return node.classList.contains('selected')
  if (node.classList?.contains('edge-inline-label')) return node.classList.contains('selected')
  return true
}

export async function exportProject(project: Project, format: ExportFormat, selectionOnly = false): Promise<void> {
  const name = safeName(project.name) + (selectionOnly ? '-selection' : '')
  if (format === 'markdown') return download(markdownFromHtml(project.markdown), `${name}.md`, 'text/markdown')
  if (format === 'source') {
    const canvas = JSON.parse(project.canvasJson)
    const selectedIds = new Set<string>((canvas.nodes || []).filter((node: { selected?: boolean }) => node.selected).map((node: { id: string }) => node.id))
    const sourceCanvas = selectionOnly ? {
      ...canvas,
      nodes: (canvas.nodes || []).filter((node: { id: string }) => selectedIds.has(node.id)),
      edges: (canvas.edges || []).filter((edge: { selected?: boolean; source: string; target: string }) => edge.selected || selectedIds.has(edge.source) && selectedIds.has(edge.target)),
    } : canvas
    const source = JSON.stringify({ format: 'archly-diagram', version: 1, project: { name: project.name, canvas: sourceCanvas, markdown: project.markdown } }, null, 2)
    return download(source, `${name}.archly.json`, 'application/json')
  }
  const element = canvasElement()
  const options = { cacheBust: true, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#ffffff', filter: selectionFilter(selectionOnly) }
  const dataUrl = format === 'png' ? await toPng(element, options) : await toSvg(element, options)
  const blob = await fetch(dataUrl).then((response) => response.blob())
  download(blob, `${name}.${format}`)
}

export async function copyDiagramToClipboard(selectionOnly = false): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('Image clipboard access is not supported by this browser.')
  const dataUrl = await toPng(canvasElement(), { cacheBust: true, filter: selectionFilter(selectionOnly) })
  const blob = await fetch(dataUrl).then((response) => response.blob())
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
