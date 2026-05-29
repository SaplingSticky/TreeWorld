import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'

interface BubbleBlockProps {
  block: Block
}

const MIN_HEIGHT = 120
const MIN_WIDTH = 160
const CONTENT_VERTICAL_PADDING = 28

const BubbleBlock: React.FC<BubbleBlockProps> = ({ block }) => {
  const { camera, updateBlock } = useCanvasStore()
  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(block.content)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentMeasureRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragStart = useRef({ x: 0, y: 0 })
  const blockStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ width: 0, height: 0 })
  const isAutoHeight = block.heightMode !== 'manual'

  useLayoutEffect(() => {
    if (!isAutoHeight || isResizing || block.locked) {
      return
    }

    const headerHeight = headerRef.current?.offsetHeight ?? 28
    const measuredContentHeight = isEditing
      ? textareaRef.current?.scrollHeight ?? 0
      : contentMeasureRef.current?.scrollHeight ?? 0
    const nextHeight = Math.max(
      MIN_HEIGHT,
      Math.ceil(headerHeight + measuredContentHeight + CONTENT_VERTICAL_PADDING)
    )

    if (Math.abs(block.height - nextHeight) > 2) {
      updateBlock(block.id, { height: nextHeight, heightMode: 'auto' })
    }
  }, [
    block.content,
    block.height,
    block.heightMode,
    block.id,
    block.locked,
    block.width,
    editContent,
    isAutoHeight,
    isEditing,
    isResizing,
    updateBlock,
  ])

  useEffect(() => {
    if (!isResizing) {
      return
    }

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / camera.zoom
      const dy = (e.clientY - resizeStart.current.y) / camera.zoom

      updateBlock(block.id, {
        width: Math.max(MIN_WIDTH, sizeStart.current.width + dx),
        height: Math.max(MIN_HEIGHT, sizeStart.current.height + dy),
        heightMode: 'manual',
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (block.locked) {
      e.stopPropagation()
      return
    }

    if (e.button === 0 && !isEditing && !isResizing) {
      setIsDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY }
      blockStart.current = { x: block.x, y: block.y }
      e.stopPropagation()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - dragStart.current.x) / camera.zoom
      const dy = (e.clientY - dragStart.current.y) / camera.zoom
      updateBlock(block.id, {
        x: blockStart.current.x + dx,
        y: blockStart.current.y + dy,
      })
    }
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (block.locked) {
      return
    }

    setEditContent(block.content)
    setIsEditing(true)
  }

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (block.locked || isEditing) {
      return
    }

    setIsDragging(false)
    setIsResizing(false)
    updateBlock(block.id, { heightMode: 'auto' })
  }

  const handleBlur = () => {
    setIsEditing(false)

    if (!block.locked) {
      updateBlock(block.id, { content: editContent })
    }
  }

  return (
    <div
      className="physical-block bubble-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        backgroundColor: '#E8F5E9',
        borderRadius: '18px 18px 18px 4px',
        boxShadow: '2px 4px 12px rgba(46, 125, 50, 0.15)',
        border: block.locked ? '2px solid #f97316' : '1px solid #a5d6a7',
        cursor: block.locked ? 'default' : isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : 'grab',
        zIndex: isMenuOpen || frontBlockId === block.id ? 999 : isDragging || isResizing ? 1000 : 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="bubble-title"
        ref={headerRef}
        onDoubleClick={handleTitleDoubleClick}
        onMouseDown={titleBarMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          padding: '8px 36px 4px 14px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: '"Inter Tight", "Inter", sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#2e7d32',
          borderBottom: '1px solid rgba(46, 125, 50, 0.12)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {block.title || '💬 Memo'}
      </div>
      <div
        style={{
          flex: isAutoHeight ? '0 0 auto' : 1,
          padding: '10px 14px 14px',
          overflow: isAutoHeight ? 'visible' : 'auto',
          color: '#1b5e20',
          fontFamily: '"Caveat", "Segoe Print", "Comic Sans MS", cursive',
          fontSize: '17px',
          lineHeight: 1.45,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            style={{
              width: '100%',
              height: isAutoHeight ? 'auto' : '100%',
              minHeight: isAutoHeight ? '72px' : undefined,
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '17px',
              lineHeight: '1.45',
              backgroundColor: 'transparent',
              color: 'inherit',
            }}
          />
        ) : (
          <div ref={contentMeasureRef} style={{ whiteSpace: 'pre-wrap' }}>
            {block.content || 'Double click to edit'}
          </div>
        )}
      </div>
      {isMenuOpen && <BlockMenu block={block} onClose={() => { setIsMenuOpen(false); clearFrontBlock() }} />}

      <div
        aria-label="Resize bubble block"
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
            'linear-gradient(135deg, transparent 0 45%, #43a047 45% 55%, transparent 55% 100%)',
        }}
      />
    </div>
  )
}

export default BubbleBlock
