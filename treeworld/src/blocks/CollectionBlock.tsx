import React from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import { useBlockInteractions } from './useBlockInteractions'

interface CollectionBlockProps {
  block: Block
  onToggleCollapse?: (id: string) => void
  isCollapsed?: boolean
}

const CollectionBlock: React.FC<CollectionBlockProps> = ({ block, onToggleCollapse, isCollapsed = false }) => {
  const moveCollection = useCanvasStore((s) => s.moveCollection)
  const { titleBarMouseDown, isDragging, isMenuOpen, closeMenu } =
    useBlockInteractions(block, { moveFn: moveCollection })

  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const zIndex = isMenuOpen || frontBlockId === block.id ? 999 : 1
  const cursor = block.locked ? 'default' : isDragging ? 'grabbing' : 'grab'
  const userSelect = isDragging ? ('none' as const) : undefined

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCollapse?.(block.id)
  }

  return (
    <div
      className={`physical-block collection-cork-block${isCollapsed ? ' collection-collapsed' : ''}`}
      data-collection-id={block.id}
      data-collapsed={isCollapsed ? 'true' : undefined}
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: isCollapsed ? 'auto' : block.height,
        minHeight: isCollapsed ? undefined : block.height,
        cursor,
        userSelect,
        zIndex,
        pointerEvents: 'auto',
        padding: '14px 18px 20px',
      }}
      onMouseDown={titleBarMouseDown}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={toggleCollapse}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={isCollapsed ? 'Expand collection' : 'Collapse collection'}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '10px',
            padding: '2px',
            lineHeight: 1,
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >
          ▼
        </button>
        <div
          className="collection-cork-title"
        >
          {block.title || 'Collection'}
        </div>
      </div>
    </div>
  )
}

export default CollectionBlock
