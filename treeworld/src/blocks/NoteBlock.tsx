import React, { useLayoutEffect, useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { hashAngle } from './styleUtils'
import { useBlockInteractions } from './useBlockInteractions'

interface NoteBlockProps {
  block: Block
}

const MIN_HEIGHT = 160
const MIN_WIDTH = 160
const CONTENT_VERTICAL_PADDING = 24

const NoteBlock: React.FC<NoteBlockProps> = ({ block }) => {
  const updateBlock = useCanvasStore((s) => s.updateBlock)
  const { titleBarMouseDown, handleResizeMouseDown, isResizing, isMenuOpen, zIndex, cursor, closeMenu } =
    useBlockInteractions(block, { minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT })

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(block.content)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentMeasureRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isAutoHeight = block.heightMode !== 'manual'
  const rotation = hashAngle(block.id, -3, 3)

  useLayoutEffect(() => {
    if (!isAutoHeight || isResizing || block.locked) return
    const headerHeight = headerRef.current?.offsetHeight ?? 34
    const measuredContentHeight = isEditing
      ? textareaRef.current?.scrollHeight ?? 0
      : contentMeasureRef.current?.scrollHeight ?? 0
    const nextHeight = Math.max(MIN_HEIGHT, Math.ceil(headerHeight + measuredContentHeight + CONTENT_VERTICAL_PADDING))
    if (Math.abs(block.height - nextHeight) > 2) {
      updateBlock(block.id, { height: nextHeight, heightMode: 'auto' })
    }
  }, [block.content, block.height, block.heightMode, block.id, block.locked, block.width, editContent, isAutoHeight, isEditing, isResizing, updateBlock])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (block.locked) return
    setEditContent(block.content)
    setIsEditing(true)
  }

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (block.locked || isEditing) return
    updateBlock(block.id, { heightMode: 'auto' })
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (!block.locked) updateBlock(block.id, { content: editContent })
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
        boxShadow: rotation >= 0 ? '4px 7px 14px rgba(74, 49, 12, 0.2)' : '-4px 7px 14px rgba(74, 49, 12, 0.2)',
        border: block.locked ? '2px solid #f97316' : '1px solid #ead56d',
        cursor,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 20%',
      }}
      onMouseDown={titleBarMouseDown}
    >
      <div
        className="note-paper-title"
        ref={headerRef}
        onDoubleClick={handleTitleDoubleClick}
        style={{ height: '12px', padding: '0 40px 0 13px', borderBottom: 'none', fontSize: 0, color: 'transparent' }}
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
            style={{ width: '100%', height: isAutoHeight ? 'auto' : '100%', minHeight: isAutoHeight ? '96px' : undefined, border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: '15px', lineHeight: '1.45', backgroundColor: 'transparent' }}
          />
        ) : (
          <div ref={contentMeasureRef} style={{ whiteSpace: 'pre-wrap' }}>
            {block.content || 'Double click to edit'}
          </div>
        )}
      </div>
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#d97706" />
    </div>
  )
}

export default NoteBlock
