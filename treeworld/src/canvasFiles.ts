import type { CanvasDocument } from './store'

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
