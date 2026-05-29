import React, { useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'

interface HtmlBlockProps {
  block: Block
}

const MIN_HTML_HEIGHT = 220
const MIN_HTML_WIDTH = 280
const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob: https:",
  "font-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
].join('; ')

function buildSrcDoc(content: string): string {
  const trimmedContent = content.trim().replace(/CRT HTML/gi, 'HTML')
  const html = trimmedContent || '<main style="font-family: system-ui; padding: 16px;">Empty HTML block</main>'
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${cspMeta}`)
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${cspMeta}</head>`)
  }

  return `<!doctype html><html><head>${cspMeta}</head><body>${html}</body></html>`
}

const HtmlBlock: React.FC<HtmlBlockProps> = ({ block }) => {
  const { camera, updateBlock } = useCanvasStore()
  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const hasLoaded = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const blockStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ width: 0, height: 0 })
  const displayTitle = (block.title || 'HTML').replace(/CRT\s+HTML/gi, 'HTML')

  useEffect(() => {
    hasLoaded.current = false
    const timeout = window.setTimeout(() => {
      if (!hasLoaded.current) {
        setReloadToken((token) => token + 1)
      }
    }, 5000)

    return () => window.clearTimeout(timeout)
  }, [block.content, reloadToken])

  useEffect(() => {
    if (!isResizing) {
      return
    }

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / camera.zoom
      const dy = (e.clientY - resizeStart.current.y) / camera.zoom

      updateBlock(block.id, {
        width: Math.max(MIN_HTML_WIDTH, sizeStart.current.width + dx),
        height: Math.max(MIN_HTML_HEIGHT, sizeStart.current.height + dy),
      })
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)

    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [block.id, camera.zoom, isResizing, updateBlock])

  const titleBarMouseDown = (e: React.MouseEvent) => {
    if (block.locked || e.button !== 0) {
      return
    }

    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    let didDrag = false

    const onMove = (me: MouseEvent) => {
      if (!didDrag && (Math.abs(me.clientX - startX) > 4 || Math.abs(me.clientY - startY) > 4)) {
        didDrag = true
        setIsDragging(true)
        dragStart.current = { x: startX, y: startY }
        blockStart.current = { x: block.x, y: block.y }
      }

      if (didDrag) {
        const dx = (me.clientX - dragStart.current.x) / camera.zoom
        const dy = (me.clientY - dragStart.current.y) / camera.zoom
        updateBlock(block.id, { x: blockStart.current.x + dx, y: blockStart.current.y + dy })
        dragStart.current = { x: me.clientX, y: me.clientY }
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      if (!didDrag) {
        setIsMenuOpen(true)
      }

      setIsDragging(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }


  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {
      return
    }

    const dx = (e.clientX - dragStart.current.x) / camera.zoom
    const dy = (e.clientY - dragStart.current.y) / camera.zoom

    updateBlock(block.id, {
      x: blockStart.current.x + dx,
      y: blockStart.current.y + dy,
    })
    dragStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (block.locked) {
      return
    }

    e.stopPropagation()
    e.preventDefault()
    setIsDragging(false)
    setIsResizing(true)
    resizeStart.current = { x: e.clientX, y: e.clientY }
    sizeStart.current = { width: block.width, height: block.height }
  }

  return (
    <div
      className="physical-block html-device-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '18px solid #F0EBE0',
        borderRadius: '18px',
        backgroundColor: '#F0EBE0',
        boxShadow: '0 26px 48px rgba(43, 35, 24, 0.34)',
        cursor: block.locked ? 'default' : isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: isMenuOpen || frontBlockId === block.id ? 999 : isDragging || isResizing ? 1000 : 1,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="html-device-title"
        onMouseDown={titleBarMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        style={{
          borderBottom: '0',
          color: '#7A7060',
          flex: '0 0 auto',
          fontSize: '12px',
          fontWeight: 800,
          overflow: 'hidden',
          padding: '4px 88px 8px 10px',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayTitle}
      </div>
      <div className="html-device-body">
        <iframe
          key={`${block.id}-${reloadToken}`}
          onLoad={() => {
            hasLoaded.current = true
          }}
          sandbox="allow-scripts"
          srcDoc={buildSrcDoc(block.content)}
          style={{
            border: 'none',
            flex: 1,
            minWidth: 0,
            width: '100%',
            backgroundColor: '#ffffff',
          }}
          title={displayTitle || 'HTML block'}
        />
        <div aria-hidden className="html-device-controls">
          <span className="html-device-speaker" />
          <span className="html-device-knob html-device-knob-large" />
          <span className="html-device-slider" />
          <span className="html-device-slider" />
          <span className="html-device-knob" />
          <span className="html-device-vents" />
        </div>
      </div>
      {isMenuOpen && <BlockMenu block={block} onClose={() => { setIsMenuOpen(false); clearFrontBlock() }} />}

      <div
        aria-label="Resize HTML block"
        title="Resize"
        onMouseDown={handleResizeMouseDown}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: '6px',
          bottom: '6px',
          width: '20px',
          height: '20px',
          cursor: block.locked ? 'default' : 'nwse-resize',
          opacity: block.locked ? 0.35 : 1,
          zIndex: 5,
          background:
            'linear-gradient(135deg, transparent 0 45%, #8a8070 45% 55%, transparent 55% 100%)',
        }}
      />
    </div>
  )
}

export default HtmlBlock
