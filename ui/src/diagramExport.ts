import type { Project } from './types'

export type ExportFormat = 'png' | 'svg' | 'markdown' | 'source'

const safeName = (name: string) => name.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '') || 'archly-diagram'

function download(data: string | Blob, filename: string, type?: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function markdownFromHtml(html: string): string {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  const escapeText = (value: string) => value.replace(/([\\`*_[\]<>#+.!|~-])/g, '\\$1')
  const longestTicks = (value: string) => Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length))
  const renderChildren = (node: Node, depth = 0) => Array.from(node.childNodes).map((child) => render(child, depth)).join('')
  const renderList = (list: HTMLElement, depth: number): string => {
    const ordered = list.tagName === 'OL'
    let index = Number(list.getAttribute('start') || 1)
    return Array.from(list.children).filter((child) => child.tagName === 'LI').map((child) => {
      const nested = Array.from(child.children).filter((item) => item.matches('ul,ol')) as HTMLElement[]
      const content = Array.from(child.childNodes).filter((item) => !(item instanceof HTMLElement && item.matches('ul,ol')))
        .map((item) => render(item, depth + 1)).join('').trim()
      const marker = ordered ? `${index++}.` : '-'
      const continuation: string = nested.map((item) => renderList(item, depth + 1)).join('')
      return `${'  '.repeat(depth)}${marker} ${content}\n${continuation}`
    }).join('') + (depth === 0 ? '\n' : '')
  }
  const render = (node: Node, depth = 0): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent || '')
    if (!(node instanceof HTMLElement)) return renderChildren(node, depth)
    const body = renderChildren(node, depth)
    switch (node.tagName) {
      case 'H1': return `# ${body}\n\n`
      case 'H2': return `## ${body}\n\n`
      case 'H3': return `### ${body}\n\n`
      case 'P': return `${body}\n\n`
      case 'STRONG': case 'B': return `**${body}**`
      case 'EM': case 'I': return `*${body}*`
      case 'CODE': {
        if (node.parentElement?.tagName === 'PRE') return node.textContent || ''
        const value = node.textContent || ''
        const delimiter = '`'.repeat(Math.max(1, longestTicks(value) + 1))
        return `${delimiter}${value.startsWith('`') || value.endsWith('`') ? ` ${value} ` : value}${delimiter}`
      }
      case 'PRE': {
        const value = node.textContent || ''
        const language = `${node.className} ${node.querySelector('code')?.className || ''}`.match(/(?:^|\s)language-([\w-]+)/)?.[1] || ''
        const fence = '`'.repeat(Math.max(3, longestTicks(value) + 1))
        return `${fence}${language}\n${value}${value.endsWith('\n') ? '' : '\n'}${fence}\n\n`
      }
      case 'A': return `[${body}](<${(node.getAttribute('href') || '').replace(/>/g, '%3E')}>)`
      case 'LI': return body
      case 'UL': case 'OL': return renderList(node, depth)
      case 'BLOCKQUOTE': return body.split('\n').filter(Boolean).map((line) => `> ${line}`).join('\n') + '\n\n'
      case 'IMG': {
        const alt = escapeText(node.getAttribute('alt') || 'image')
        const src = node.getAttribute('src') || ''
        return src.startsWith('data:') ? `_[Embedded image omitted: ${alt}]_` : `![${alt}](<${src.replace(/>/g, '%3E')}>)`
      }
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

async function renderedExportOptions(project: Project, selectionOnly: boolean) {
  const element = canvasElement()
  const { getNodesBounds } = await import('@xyflow/react')
  const canvas = JSON.parse(project.canvasJson)
  const exportNodes = selectionOnly ? (canvas.nodes || []).filter((node: { selected?: boolean }) => node.selected) : (canvas.nodes || [])
  if (selectionOnly && exportNodes.length === 0 && !(canvas.edges || []).some((edge: { selected?: boolean }) => edge.selected)) {
    throw new Error('Select at least one component or connection before exporting the selection.')
  }
  const bounds = exportNodes.length ? getNodesBounds(exportNodes) : undefined
  const padding = 48
  const maxDimension = 12_000
  const naturalWidth = Math.max(1, bounds?.width || element.clientWidth)
  const naturalHeight = Math.max(1, bounds?.height || element.clientHeight)
  const scale = Math.min(1, (maxDimension - padding * 2) / naturalWidth, (maxDimension - padding * 2) / naturalHeight)
  const width = Math.ceil(naturalWidth * scale + padding * 2)
  const height = Math.ceil(naturalHeight * scale + padding * 2)
  const translateX = padding - (bounds?.x || 0) * scale
  const translateY = padding - (bounds?.y || 0) * scale
  return {
    element,
    edges: canvas.edges || [],
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#ffffff',
    options: {
      cacheBust: true,
      filter: selectionFilter(selectionOnly), width, height,
      style: {
        width: `${width}px`, height: `${height}px`,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        transformOrigin: 'top left',
        background: 'transparent', backgroundColor: 'transparent',
      },
    },
  }
}

async function portableSvgBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((response) => response.blob())
}

async function svgToPng(svg: Blob, backgroundColor: string): Promise<Blob> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('The SVG could not be read.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(svg)
  })
  const image = new Image()
  image.decoding = 'async'
  image.src = source
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PNG export is not supported by this browser.')
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The diagram could not be converted to PNG.')), 'image/png'))
}

async function withPortableEdgeGeometry<T>(element: HTMLElement, edges: Array<{ id?: string; markerStart?: unknown; markerEnd?: unknown; style?: { stroke?: string; strokeWidth?: number } }>, render: () => Promise<T>): Promise<T> {
  const edgeGroups = Array.from(element.querySelectorAll<SVGGElement>('.react-flow__edge[data-id]'))
  const persistedEdges = new Map(edges.map((edge) => [edge.id, edge]))
  const originals = edgeGroups.flatMap((group) => {
    const path = group.querySelector<SVGPathElement>('path.react-flow__edge-path')
    if (!path) return []
    const edge = persistedEdges.get(group.dataset.id)
    return [{
      path,
      attributes: new Map(['fill', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'marker-start', 'marker-end'].map((name) => [name, path.getAttribute(name)])),
      hasStart: Boolean(edge?.markerStart || path.getAttribute('marker-start')),
      hasEnd: Boolean(edge?.markerEnd || path.getAttribute('marker-end')),
      edge,
    }]
  })
  const arrows: SVGPolygonElement[] = []
  for (const { path, hasStart, hasEnd, edge } of originals) {
    const length = path.getTotalLength()
    if (!length || !path.parentNode) continue
    const computed = getComputedStyle(path)
    const computedStroke = computed.stroke
    const stroke = edge?.style?.stroke || (computedStroke && computedStroke !== 'none' && computedStroke !== 'transparent' ? computedStroke : '#68708a')
    const strokeWidth = Math.max(1.5, Number(edge?.style?.strokeWidth) || Number.parseFloat(computed.strokeWidth) || 1.5)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', stroke)
    path.setAttribute('stroke-width', String(strokeWidth))
    path.setAttribute('stroke-linecap', computed.strokeLinecap || 'round')
    path.setAttribute('stroke-linejoin', computed.strokeLinejoin || 'round')
    if (computed.strokeOpacity && computed.strokeOpacity !== '1') path.setAttribute('stroke-opacity', computed.strokeOpacity)
    if (computed.strokeDasharray && computed.strokeDasharray !== 'none') path.setAttribute('stroke-dasharray', computed.strokeDasharray)
    const arrowLength = Math.max(8, strokeWidth * 4)
    const arrowHalfWidth = Math.max(4, strokeWidth * 2.25)
    const addArrow = (atStart: boolean) => {
      const tip = path.getPointAtLength(atStart ? 0 : length)
      const inside = path.getPointAtLength(atStart ? Math.min(12, length) : Math.max(0, length - 12))
      const angle = atStart
        ? Math.atan2(tip.y - inside.y, tip.x - inside.x) * 180 / Math.PI
        : Math.atan2(tip.y - inside.y, tip.x - inside.x) * 180 / Math.PI
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      polygon.setAttribute('points', `0,0 ${-arrowLength},${-arrowHalfWidth} ${-arrowLength},${arrowHalfWidth}`)
      polygon.setAttribute('transform', `translate(${tip.x} ${tip.y}) rotate(${angle})`)
      polygon.setAttribute('fill', stroke)
      polygon.setAttribute('stroke', stroke)
      polygon.setAttribute('stroke-width', String(Math.max(1, strokeWidth * .6)))
      polygon.setAttribute('stroke-linejoin', 'round')
      polygon.setAttribute('data-archly-export-arrow', atStart ? 'start' : 'end')
      polygon.style.pointerEvents = 'none'
      path.parentNode?.appendChild(polygon)
      arrows.push(polygon)
    }
    if (hasStart) addArrow(true)
    if (hasEnd) addArrow(false)
    path.removeAttribute('marker-start')
    path.removeAttribute('marker-end')
  }
  try { return await render() }
  finally {
    arrows.forEach((arrow) => arrow.remove())
    for (const { path, attributes } of originals) {
      for (const [name, value] of attributes) {
        if (value === null) path.removeAttribute(name); else path.setAttribute(name, value)
      }
    }
  }
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
  const { toSvg } = await import('html-to-image')
  const { element, edges, backgroundColor, options } = await renderedExportOptions(project, selectionOnly)
  const dataUrl = await withPortableEdgeGeometry(element, edges, () => toSvg(element, options))
  const svg = await portableSvgBlob(dataUrl)
  const blob = format === 'png' ? await svgToPng(svg, backgroundColor) : svg
  download(blob, `${name}.${format}`)
}

export async function copyDiagramToClipboard(project: Project, selectionOnly = false): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') throw new Error('Image clipboard access is not supported by this browser.')
  const { toSvg } = await import('html-to-image')
  const { element, edges, backgroundColor, options } = await renderedExportOptions(project, selectionOnly)
  const dataUrl = await withPortableEdgeGeometry(element, edges, () => toSvg(element, options))
  const blob = await svgToPng(await portableSvgBlob(dataUrl), backgroundColor)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
