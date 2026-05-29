import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import { hashAngle } from './styleUtils'

interface NoteBlockProps {
  block: Block
}

const MIN_NOTE_HEIGHT = 160
const MIN_NOTE_WIDTH = 160
const NOTE_CONTENT_VERTICAL_PADDING = 24

const NoteBlock: React.FC<NoteBlockProps> = ({ block }) => {
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
  const rotation = hashAngle(block.id, -3, 3)

  useLayoutEffect(() => {
    if (!isAutoHeight || isResizing || block.locked) {
      return
    }

    const headerHeight = headerRef.current?.offsetHeight ?? 34
    const measuredContentHeight = isEditing
      ? textareaRef.current?.scrollHeight ?? 0
      : contentMeasureRef.current?.scrollHeight ?? 0
    const nextHeight = Math.max(
      MIN_NOTE_HEIGHT,
      Math.ceil(headerHeight + measuredContentHeight + NOTE_CONTENT_VERTICAL_PADDING)
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
        width: Math.max(MIN_NOTE_WIDTH, sizeStart.current.width + dx),
        height: Math.max(MIN_NOTE_HEIGHT, sizeStart.current.height + dy),
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
      className="physical-block note-paper-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        backgroundColor: '#FFF9C4',
        borderRadius: '2px 3px 2px 4px',
        boxShadow:
          rotation >= 0
            ? '4px 7px 14px rgba(74, 49, 12, 0.2)'
            : '-4px 7px 14px rgba(74, 49, 12, 0.2)',
        border: block.locked ? '2px solid #f97316' : '1px solid #ead56d',
        cursor: block.locked ? 'default' : isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : 'grab',
        zIndex: isMenuOpen || frontBlockId === block.id ? 999 : isDragging || isResizing ? 1000 : 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 20%',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="note-paper-title"
        ref={headerRef}
        onDoubleClick={handleTitleDoubleClick}
          onMouseDown={titleBarMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        style={{
          height: '12px',
          padding: '0 40px 0 13px',
          borderBottom: 'none',
          fontSize: 0,
          color: 'transparent',
        }}
      >
        {block.title || 'Note'}
      </div>
      <div
        style={{
          flex: isAutoHeight ? '0 0 auto' : 1,
          padding: '12px 15px 18px',
          overflow: isAutoHeight ? 'visible' : 'auto',
          color: '#342609',
          fontFamily: '"Caveat", "Segoe Print", "Comic Sans MS", cursive',
          fontSize: '18px',
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
              minHeight: isAutoHeight ? '96px' : undefined,
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '15px',
              lineHeight: '1.45',
              backgroundColor: 'transparent',
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
        aria-label="Resize note block"
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
            'linear-gradient(135deg, transparent 0 45%, #d97706 45% 55%, transparent 55% 100%)',
        }}
      />
    </div>
  )
}

export default NoteBlock
