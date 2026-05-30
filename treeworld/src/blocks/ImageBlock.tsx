import React, { useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import { hashAngle } from './styleUtils'
import { useBlockInteractions } from './useBlockInteractions'

interface ImageBlockProps {
  block: Block
}

const ImageBlock: React.FC<ImageBlockProps> = ({ block }) => {
  const updateBlock = useCanvasStore((s) => s.updateBlock)
  const { titleBarMouseDown, isMenuOpen, zIndex, cursor, userSelect, closeMenu } =
    useBlockInteractions(block)

  const [hasError, setHasError] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(block.title)
  const rotation = hashAngle(block.id, -4, 4)

  const saveTitle = () => {
    setIsEditingTitle(false)
    if (!block.locked) updateBlock(block.id, { title: editTitle })
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
        cursor,
        userSelect,
        overflow: 'visible',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '50% 18%',
        zIndex,
      }}
      onMouseDown={titleBarMouseDown}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <div
        className="image-polaroid-title"
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (!block.locked) { setEditTitle(block.title); setIsEditingTitle(true) }
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
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') saveTitle() }}
            style={{ background: 'transparent', border: 0, color: '#6b7280', font: 'inherit', outline: 0, textAlign: 'center', width: '100%' }}
            value={editTitle}
          />
        ) : (
          block.title || 'Image'
        )}
      </div>
      {hasError || !block.content ? (
        <div style={{ alignItems: 'center', color: '#6b7280', display: 'flex', fontSize: '13px', height: '100%', justifyContent: 'center', padding: '12px', textAlign: 'center' }}>
          Image failed to load
        </div>
      ) : (
        <img
          key={block.content}
          alt={block.title || 'Canvas image'}
          onError={() => setHasError(true)}
          src={block.content}
          style={{ display: 'block', height: '100%', objectFit: 'cover', width: '100%' }}
        />
      )}
    </div>
  )
}

export default ImageBlock
