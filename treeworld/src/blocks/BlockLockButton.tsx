import React from 'react'

interface BlockLockButtonProps {
  locked: boolean
  onToggle: () => void
}

const BlockLockButton: React.FC<BlockLockButtonProps> = ({ locked, onToggle }) => (
  <button
    aria-label={locked ? 'Unlock block' : 'Lock block'}
    onClick={(e) => {
      e.stopPropagation()
      onToggle()
    }}
    onDoubleClick={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
    title={locked ? 'Unlock' : 'Lock'}
    style={{
      position: 'absolute',
      top: '6px',
      right: '6px',
      zIndex: 5,
      width: '26px',
      height: '26px',
      border: '1px solid #d1d5db',
      borderRadius: '999px',
      backgroundColor: locked ? '#fff7ed' : '#ffffff',
      color: locked ? '#c2410c' : '#4b5563',
      cursor: 'pointer',
      fontSize: '13px',
      lineHeight: 1,
    }}
  >
    {locked ? '🔒' : '🔓'}
  </button>
)

export default BlockLockButton
