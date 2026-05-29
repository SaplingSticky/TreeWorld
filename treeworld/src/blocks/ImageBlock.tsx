import React, { useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import { hashAngle } from './styleUtils'

interface ImageBlockProps {
  block: Block
}

const ImageBlock: React.FC<ImageBlockProps> = ({ block }) => {
  const { camera, updateBlock } = useCanvasStore()
  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(block.title)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const blockStart = useRef({ x: 0, y: 0 })
  const rotation = hashAngle(block.id, -4, 4)

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

  const saveTitle = () => {
    setIsEditingTitle(false)

    if (!block.locked) {
      updateBlock(block.id, { title: editTitle })
    }
  }

  return (
    <div
      className="physical-block image-polaroid-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '12px solid #ffffff',
        borderBottomWidth: block.locked ? undefined : '40px',
        borderRadius: '3px',
        backgroundColor: '#ffffff',
        boxShadow: '3px 5px 12px rgba(0,0,0,0.25)',
        cursor: block.locked ? 'default' : isDragging ? 'grabbing' : 'grab',
        overflow: 'visible',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 18%',
        zIndex: isMenuOpen || frontBlockId === block.id ? 999 : isDragging ? 1000 : 1,
      }}
      onMouseDown={titleBarMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={() => { setIsMenuOpen(false); clearFrontBlock() }} />}
      <div
        className="image-polaroid-title"
        onDoubleClick={(e) => {
          e.stopPropagation()

          if (!block.locked) {
            setEditTitle(block.title)
            setIsEditingTitle(true)
          }
        }}
        style={{
          bottom: '-36px',
          color: '#9ca3af',
          fontFamily: '"Caveat", "Segoe Print", cursive',
          fontSize: '20px',
          fontWeight: 600,
          height: '32px',
          left: 0,
          overflow: 'hidden',
          padding: '3px 8px',
          position: 'absolute',
          right: 0,
          textAlign: 'center',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {isEditingTitle ? (
          <input
            autoFocus
            onBlur={saveTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                saveTitle()
              }
            }}
            style={{
              background: 'transparent',
              border: 0,
              color: '#6b7280',
              font: 'inherit',
              outline: 0,
              textAlign: 'center',
              width: '100%',
            }}
            value={editTitle}
          />
        ) : (
          block.title || 'Image'
        )}
      </div>
      {hasError || !block.content ? (
        <div
          style={{
            alignItems: 'center',
            color: '#6b7280',
            display: 'flex',
            fontSize: '13px',
            height: '100%',
            justifyContent: 'center',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          Image failed to load
        </div>
      ) : (
        <img
          alt={block.title || 'Canvas image'}
          onError={() => setHasError(true)}
          src={block.content}
          style={{
            display: 'block',
            height: '100%',
            objectFit: 'cover',
            width: '100%',
          }}
        />
      )}
    </div>
  )
}

export default ImageBlock
