import type { Block, CanvasDocument } from './store'

function safeFileName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'treeworld-canvas'
}

export function downloadCanvas(document: CanvasDocument): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFileName(document.name)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function blocksToMarkdown(blocks: Block[]): string {
  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x)
  const lines: string[] = []

  for (const block of sorted) {
    switch (block.type) {
      case 'markdown':
        if (block.title) lines.push(`# ${block.title}\n`)
        lines.push(block.content, '')
        break
      case 'note':
        lines.push(`> **📝 ${block.title || 'Note'}**`)
        if (block.content) lines.push(`> ${block.content.replace(/\n/g, '\n> ')}`)
        lines.push('')
        break
      case 'bubble':
        lines.push(`> 💬 ${block.content || 'PS...'}`, '')
        break
      case 'code':
        lines.push(`### ${block.title || 'Code'}`)
        lines.push('```' + (block.title || ''), block.content, '```', '')
        break
      case 'table':
        try {
          const data = JSON.parse(block.content) as { headers: string[]; rows: string[][] }
          lines.push(`### ${block.title || 'Table'}`)
          lines.push('| ' + data.headers.join(' | ') + ' |')
          lines.push('| ' + data.headers.map(() => '---').join(' | ') + ' |')
          for (const row of data.rows) {
            lines.push('| ' + row.join(' | ') + ' |')
          }
          lines.push('')
        } catch { /* skip malformed table */ }
        break
      case 'link':
        try {
          const data = JSON.parse(block.content) as { url?: string; title?: string }
          lines.push(`🔗 [${data.title || data.url || 'Link'}](${data.url || ''})`, '')
        } catch { /* skip */ }
        break
      case 'image':
        lines.push(`![${block.title || 'Image'}](${block.content})`, '')
        break
      case 'svg':
      case 'html':
      case 'canvas2d':
        lines.push(`### ${block.title || block.type}`, `*(${block.type} block - not exported to markdown)*`, '')
        break
      case 'collection':
        lines.push(`## ${block.title || 'Collection'}`, '')
        break
      default:
        break
    }
  }

  return lines.join('\n')
}

export function downloadCanvasAsMarkdown(document: CanvasDocument): void {
  const md = `# ${document.name}\n\n${blocksToMarkdown(Object.values(document.blocks))}`
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFileName(document.name)}.md`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadCanvasAsHtml(document: CanvasDocument): void {
  const blocks = Object.values(document.blocks).sort((a, b) => a.y - b.y || a.x - b.x)
  const sections = blocks.map((block) => {
    const title = block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''
    const content = escapeHtml(block.content)
    switch (block.type) {
      case 'markdown':
        return `<article>${block.title ? `<h1>${escapeHtml(block.title)}</h1>` : ''}<pre style="white-space:pre-wrap;font-family:Georgia,serif">${content}</pre></article>`
      case 'note':
        return `<aside style="background:#fff9c4;padding:12px;border-left:4px solid #f59e0b;margin:8px 0">${title}<p>${content}</p></aside>`
      case 'bubble':
        return `<div style="background:#f0f4ff;padding:8px 12px;border-radius:12px;display:inline-block;margin:8px 0">💬 ${content}</div>`
      case 'code':
        return `<section>${title}<pre style="background:#1e1e2e;color:#cdd6f4;padding:12px;border-radius:6px"><code>${content}</code></pre></section>`
      case 'image':
        return `<figure>${title}<img src="${escapeHtml(block.content)}" alt="${escapeHtml(block.title || 'Image')}" style="max-width:100%">${block.title ? `<figcaption>${escapeHtml(block.title)}</figcaption>` : ''}</figure>`
      case 'link':
        try {
          const data = JSON.parse(block.content) as { url?: string }
          return `<p>🔗 <a href="${escapeHtml(data.url || '')}">${escapeHtml(block.title || data.url || 'Link')}</a></p>`
        } catch { return '' }
      case 'collection':
        return `<section style="border:2px solid #8b6914;padding:16px;margin:16px 0;border-radius:6px"><h2>${escapeHtml(block.title || 'Collection')}</h2>`
      default:
        return `<!-- ${block.type} block: ${escapeHtml(block.title || '')} -->`
    }
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(document.name)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}article{margin:20px 0}h1{color:#3b2f24}</style>
</head>
<body>
<h1>${escapeHtml(document.name)}</h1>
${sections.join('\n')}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFileName(document.name)}.html`
  anchor.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
