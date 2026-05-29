import React from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import { useBlockInteractions } from './useBlockInteractions'

interface CollectionBlockProps {
  block: Block
}

const CollectionBlock: React.FC<CollectionBlockProps> = ({ block }) => {
  const moveCollection = useCanvasStore((s) => s.moveCollection)
  const { titleBarMouseDown, isDragging, isMenuOpen, closeMenu } =
    useBlockInteractions(block, { moveFn: moveCollection })

  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const zIndex = isMenuOpen || frontBlockId === block.id ? 999 : 0
  const cursor = block.locked ? 'default' : isDragging ? 'grabbing' : 'grab'
  const userSelect = isDragging ? ('none' as const) : undefined

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
        cursor,
        userSelect,
        zIndex,
        pointerEvents: 'auto',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.24), 0 18px 34px rgba(63, 42, 21, 0.12)',
      }}
      onMouseDown={titleBarMouseDown}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <div
        className="collection-cork-title"
        style={{ borderBottom: '0', fontSize: '13px', fontWeight: 800, padding: '8px 40px 8px 14px' }}
      >
        {block.title || 'Collection'}
      </div>
    </div>
  )
}

export default CollectionBlock
