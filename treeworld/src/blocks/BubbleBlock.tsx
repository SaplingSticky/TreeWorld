import React, { useLayoutEffect, useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

interface BubbleBlockProps {
  block: Block
}

const MIN_HEIGHT = 48
const MIN_WIDTH = 120
const MAX_WIDTH = 320

const BubbleBlock: React.FC<BubbleBlockProps> = ({ block }) => {
  const updateBlock = useCanvasStore((s) => s.updateBlock)
  const { titleBarMouseDown, handleResizeMouseDown, isResizing, isMenuOpen, zIndex, cursor, userSelect, closeMenu } =
    useBlockInteractions(block, { minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT })

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(block.content)
  const measureRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    if (isResizing || block.locked) return
    const measuredWidth = measureRef.current?.scrollWidth ?? 0
    const measuredHeight = measureRef.current?.scrollHeight ?? 0
    const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, measuredWidth + 28))
    const nextHeight = Math.max(MIN_HEIGHT, measuredHeight + 20)
    if (Math.abs(block.width - nextWidth) > 4 || Math.abs(block.height - nextHeight) > 4) {
      updateBlock(block.id, { width: nextWidth, height: nextHeight })
    }
  }, [block.content, block.height, block.id, block.locked, block.width, isResizing, updateBlock])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (block.locked) return
    setEditContent(block.content)
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (!block.locked) updateBlock(block.id, { content: editContent })
  }

  const displayText = block.content || 'PS...'

  return (
    <div
      className="physical-block bubble-block"
      style={{ position: 'absolute', left: block.x, top: block.y, width: block.width, height: block.height, cursor, userSelect, zIndex }}
      onMouseDown={titleBarMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        style={{
          position: 'relative',
          background: block.locked ? '#fff3e0' : '#f0f4ff',
          border: block.locked ? '2px solid #f97316' : '1px solid #c7d2fe',
          borderRadius: '16px',
          padding: '10px 16px',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', bottom: '-7px', left: '20px', width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: block.locked ? '7px solid #f97316' : '7px solid #c7d2fe' }} />
        <div style={{ position: 'absolute', bottom: '-5px', left: '21px', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: block.locked ? '6px solid #fff3e0' : '6px solid #f0f4ff' }} />

        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: '"Inter", system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5', color: '#312e81' }}
          />
        ) : (
          <span style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5', color: '#312e81', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {displayText}
          </span>
        )}
      </div>

      <div
        ref={measureRef}
        aria-hidden
        style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: '"Inter", system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5', padding: '10px 16px', maxWidth: MAX_WIDTH, minWidth: MIN_WIDTH - 28 }}
      >
        {displayText}
      </div>

      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#818cf8" size={14} />
    </div>
  )
}

export default BubbleBlock
