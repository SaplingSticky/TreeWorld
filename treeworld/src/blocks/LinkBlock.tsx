import React, { useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'

interface LinkBlockProps {
  block: Block
}

const MIN_LINK_HEIGHT = 200
const MIN_LINK_WIDTH = 300

function extractUrl(content: string): string {
  try {
    const parsed = JSON.parse(content) as { url?: string }

    if (typeof parsed.url === 'string') {
      return parsed.url
    }
  } catch {
    // fall through
  }

  const trimmed = content.trim()

  if (/^https?:\/\//.test(trimmed)) {
    return trimmed
  }

  return ''
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url || 'No URL'
  }
}

const LinkBlock: React.FC<LinkBlockProps> = ({ block }) => {
  const { camera, updateBlock } = useCanvasStore()
  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [editUrl, setEditUrl] = useState('')
  const dragStart = useRef({ x: 0, y: 0 })
  const blockStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ width: 0, height: 0 })

  const url = extractUrl(block.content)
  const domain = getDomain(url)

  React.useEffect(() => {
    if (!isResizing) {
      return
    }

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / camera.zoom
      const dy = (e.clientY - resizeStart.current.y) / camera.zoom

      updateBlock(block.id, {
        width: Math.max(MIN_LINK_WIDTH, sizeStart.current.width + dx),
        height: Math.max(MIN_LINK_HEIGHT, sizeStart.current.height + dy),
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

  const handleUrlSubmit = () => {
    setIsEditingUrl(false)
    let finalUrl = editUrl.trim()

    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }

    if (finalUrl) {
      updateBlock(block.id, {
        content: finalUrl,
        title: getDomain(finalUrl),
      })
    }
  }

  return (
    <div
      className="physical-block link-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '1px solid #93c5fd',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.1)',
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
      {isMenuOpen && <BlockMenu block={block} onClose={() => { setIsMenuOpen(false); clearFrontBlock() }} />}
      <div
        className="link-block-header"
        onMouseDown={titleBarMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          borderBottom: '1px solid #dbeafe',
          backgroundColor: '#eff6ff',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#6b7280', flexShrink: 0 }}>🔗</span>
        {isEditingUrl ? (
          <input
            autoFocus
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            onBlur={handleUrlSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit()
              if (e.key === 'Escape') setIsEditingUrl(false)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            placeholder="https://example.com"
            style={{
              flex: 1,
              border: '1px solid #93c5fd',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '12px',
              outline: 'none',
              minWidth: 0,
            }}
          />
        ) : (
          <span
            style={{
              fontSize: '12px',
              color: '#1d4ed8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              cursor: 'text',
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditUrl(url)
              setIsEditingUrl(true)
            }}
          >
            {url || 'Double-click to set URL'}
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              fontSize: '11px',
              color: '#6b7280',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            ↗
          </a>
        )}
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {url ? (
          <iframe
            src={url}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            title={domain}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#9ca3af',
              fontSize: '13px',
            }}
          >
            Double-click the URL above to set a link
          </div>
        )}
      </div>
      <div
        aria-label="Resize link block"
        title="Resize"
        onMouseDown={handleResizeMouseDown}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '18px',
          height: '18px',
          cursor: block.locked ? 'default' : 'nwse-resize',
          opacity: block.locked ? 0.35 : 1,
          background:
            'linear-gradient(135deg, transparent 0 45%, #93c5fd 45% 55%, transparent 55% 100%)',
        }}
      />
    </div>
  )
}

export default LinkBlock
