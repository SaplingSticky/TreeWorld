import React, { useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'

interface CollectionBlockProps {
  block: Block
}

const CollectionBlock: React.FC<CollectionBlockProps> = ({ block }) => {
  const { camera, moveCollection } = useCanvasStore()
  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

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
              }

      if (didDrag) {
        const dx = (me.clientX - dragStart.current.x) / camera.zoom
        const dy = (me.clientY - dragStart.current.y) / camera.zoom
        moveCollection(block.id, dx, dy)
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

    moveCollection(block.id, dx, dy)
    dragStart.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className="physical-block collection-cork-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '3px solid #8B6914',
        borderRadius: '6px',
        backgroundColor: 'rgba(200, 168, 122, 0.54)',
        color: '#3f2a15',
        cursor: block.locked ? 'default' : isDragging ? 'grabbing' : 'grab',
        zIndex: isMenuOpen || frontBlockId === block.id ? 999 : isDragging ? 900 : 0,
        pointerEvents: 'auto',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.24), 0 18px 34px rgba(63, 42, 21, 0.12)',
      }}
      onMouseDown={titleBarMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={() => { setIsMenuOpen(false); clearFrontBlock() }} />}
      <div
        className="collection-cork-title"
        style={{
          borderBottom: '0',
          fontSize: '13px',
          fontWeight: 800,
          padding: '8px 40px 8px 14px',
        }}
      >
        {block.title || 'Collection'}
      </div>
    </div>
  )
}

export default CollectionBlock
