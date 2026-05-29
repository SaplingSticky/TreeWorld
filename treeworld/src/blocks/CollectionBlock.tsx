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
        cursor,
        userSelect,
        zIndex,
        pointerEvents: 'auto',
        padding: '14px 18px 20px',
      }}
      onMouseDown={titleBarMouseDown}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <div
        className="collection-cork-title"
      >
        {block.title || 'Collection'}
      </div>
    </div>
  )
}

export default CollectionBlock
