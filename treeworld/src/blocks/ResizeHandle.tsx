import React from 'react'
import type { Block } from '../store'

interface ResizeHandleProps {
  block: Block
  onMouseDown: (e: React.MouseEvent) => void
  color?: string
  size?: number
  right?: number | string
  bottom?: number | string
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
  block,
  onMouseDown,
  color = '#94a3b8',
  size = 18,
  right = 0,
  bottom = 0,
}) => (
  <div
    aria-label={`Resize ${block.type} block`}
    role="separator"
    title="Resize"
    onMouseDown={onMouseDown}
    onDoubleClick={(e) => e.stopPropagation()}
    style={{
      position: 'absolute',
      right,
      bottom,
      width: size,
      height: size,
      zIndex: 5,
      cursor: block.locked ? 'default' : 'nwse-resize',
      opacity: block.locked ? 0.35 : 1,
      background: `linear-gradient(135deg, transparent 0 45%, ${color} 45% 55%, transparent 55% 100%)`,
    }}
  />
)

export default ResizeHandle
