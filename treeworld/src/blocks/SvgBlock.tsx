import React, { useMemo, useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'

interface SvgBlockProps {
  block: Block
}

const MIN_SVG_HEIGHT = 200
const MIN_SVG_WIDTH = 260

function sanitizeSvg(content: string): string {
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    return ''
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(trimmedContent, 'image/svg+xml')
  const parserError = document.querySelector('parsererror')
  const svg = document.querySelector('svg')

  if (parserError || !svg) {
    return ''
  }

  document.querySelectorAll('script, foreignObject, iframe, object, embed, link, meta').forEach((node) => {
    node.remove()
  })

  document.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      const isExternalReference =
        (name === 'href' || name === 'xlink:href' || name.endsWith(':href')) &&
        (value.startsWith('http:') || value.startsWith('https:') || value.startsWith('javascript:'))

      if (name.startsWith('on') || isExternalReference) {
        node.removeAttribute(attribute.name)
      }
    })
  })

  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet')

  return new XMLSerializer().serializeToString(svg)
}

const SvgBlock: React.FC<SvgBlockProps> = ({ block }) => {
  const { camera, updateBlock } = useCanvasStore()
  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const blockStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ width: 0, height: 0 })
  const sanitizedSvg = useMemo(() => sanitizeSvg(block.content), [block.content])

  React.useEffect(() => {
    if (!isResizing) {
      return
    }

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / camera.zoom
      const dy = (e.clientY - resizeStart.current.y) / camera.zoom

      updateBlock(block.id, {
        width: Math.max(MIN_SVG_WIDTH, sizeStart.current.width + dx),
        height: Math.max(MIN_SVG_HEIGHT, sizeStart.current.height + dy),
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
      className="physical-block svg-whiteboard-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '1px solid #d8d8d8',
        borderRadius: '4px',
        backgroundColor: '#FAFAFA',
        boxShadow: '0 18px 36px rgba(15, 23, 42, 0.13)',
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
        className="svg-whiteboard-title"
        onMouseDown={titleBarMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        style={{
          borderBottom: '1px solid #e5e7eb',
          color: '#4b5563',
          flex: '0 0 auto',
          fontSize: '12px',
          fontWeight: 800,
          overflow: 'hidden',
          padding: '8px 40px 8px 18px',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {block.title || 'SVG'}
      </div>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
          minHeight: 0,
          padding: '14px',
        }}
      >
        {sanitizedSvg ? (
          <div
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
            style={{
              height: '100%',
              width: '100%',
            }}
          />
        ) : (
          <div
            style={{
              color: '#9f1239',
              fontSize: '13px',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            Invalid SVG content
          </div>
        )}
      </div>
      {isMenuOpen && <BlockMenu block={block} onClose={() => { setIsMenuOpen(false); clearFrontBlock() }} />}

      <div
        aria-label="Resize SVG block"
        title="Resize"
        onMouseDown={handleResizeMouseDown}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '20px',
          height: '20px',
          cursor: block.locked ? 'default' : 'nwse-resize',
          opacity: block.locked ? 0.35 : 1,
          zIndex: 5,
          background:
            'linear-gradient(135deg, transparent 0 45%, #3a62a0 45% 55%, transparent 55% 100%)',
        }}
      />
    </div>
  )
}

export default SvgBlock
