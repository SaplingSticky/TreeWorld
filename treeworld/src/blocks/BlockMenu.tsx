import React, { useEffect, useRef } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'

interface BlockMenuProps {
  block: Block
  onClose: () => void
}

const BlockMenu: React.FC<BlockMenuProps> = ({ block, onClose }) => {
  const toggleLock = useCanvasStore((s) => s.toggleLock)
  const deleteBlock = useCanvasStore((s) => s.deleteBlock)
  const duplicateBlock = useCanvasStore((s) => s.duplicateBlock)
  const menuRef = useRef<HTMLDivElement>(null)
  const openedRef = useRef(false)

  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true
      useCanvasStore.getState().bringToFront(block.id)
    }

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('mousedown', handleOutsideClick, true)
    window.addEventListener('keydown', handleEscape, true)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick, true)
      window.removeEventListener('keydown', handleEscape, true)
    }
  }, [block.id, onClose])

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleLock(block.id)
    onClose()
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateBlock(block.id)
    onClose()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteBlock(block.id)
    onClose()
  }

  const handleOpenInNewTab = (e: React.MouseEvent) => {
    e.stopPropagation()
    const win = window.open('', '_blank')

    if (win) {
      win.document.open()
      win.document.write(block.content)
      win.document.close()
    }

    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="block-menu"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="block-menu-item"
        onClick={handleToggleLock}
      >
        {block.locked ? '🔓 解锁' : '🔒 锁定'}
      </button>
      <button
        type="button"
        className="block-menu-item"
        onClick={handleDuplicate}
      >
        📋 复制块
      </button>
      <button
        type="button"
        className="block-menu-item block-menu-item-danger"
        onClick={handleDelete}
      >
        🗑️ 删除块
      </button>
      {block.type === 'html' && (
        <button
          type="button"
          className="block-menu-item"
          onClick={handleOpenInNewTab}
        >
          ↗️ 在新窗口打开
        </button>
      )}
    </div>
  )
}

export default BlockMenu
