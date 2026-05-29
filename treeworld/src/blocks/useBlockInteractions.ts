import { useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'

const DRAG_THRESHOLD = 4

interface BlockInteractionOptions {
  minWidth?: number
  minHeight?: number
  /** Custom move function (e.g. moveCollection for collection blocks). Receives (id, dx, dy). */
  moveFn?: (id: string, dx: number, dy: number) => void
  /** Callback when resize produces new dimensions. Return false to skip the update. */
  onResize?: (width: number, height: number) => { width: number; height: number } | false
}

export function useBlockInteractions(block: Block, options: BlockInteractionOptions = {}) {
  const { minWidth = 80, minHeight = 80, moveFn, onResize } = options

  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const bringToFront = useCanvasStore((s) => s.bringToFront)

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const lastMouse = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ width: 0, height: 0 })

  // ── Drag via window listeners ──
  // Attaches to onMouseDown of the draggable area (title bar or root div).
  // Uses window-level listeners so dragging continues even if the cursor
  // leaves the element.
  const titleBarMouseDown = (e: React.MouseEvent) => {
    if (block.locked || e.button !== 0) return
    e.preventDefault()

    const startX = e.clientX
    const startY = e.clientY
    const blockId = block.id
    let didDrag = false

    const onMove = (me: MouseEvent) => {
      if (!didDrag && (Math.abs(me.clientX - startX) > DRAG_THRESHOLD || Math.abs(me.clientY - startY) > DRAG_THRESHOLD)) {
        didDrag = true
        setIsDragging(true)
        lastMouse.current = { x: startX, y: startY }
      }
      if (didDrag) {
        const state = useCanvasStore.getState()
        const currentBlock = state.blocks[blockId]
        if (!currentBlock) return
        const dx = (me.clientX - lastMouse.current.x) / state.camera.zoom
        const dy = (me.clientY - lastMouse.current.y) / state.camera.zoom
        if (moveFn) {
          moveFn(blockId, dx, dy)
        } else {
          state.updateBlock(blockId, { x: currentBlock.x + dx, y: currentBlock.y + dy })
        }
        lastMouse.current = { x: me.clientX, y: me.clientY }
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (!didDrag) {
        setIsMenuOpen(true)
        bringToFront(blockId)
      }
      setIsDragging(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Resize via window listeners ──
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (block.locked) return
    e.stopPropagation()
    e.preventDefault()
    setIsDragging(false)
    setIsResizing(true)
    resizeStart.current = { x: e.clientX, y: e.clientY }
    sizeStart.current = { width: block.width, height: block.height }
  }

  useEffect(() => {
    if (!isResizing) return

    const blockId = block.id

    const handleResizeMove = (e: MouseEvent) => {
      const state = useCanvasStore.getState()
      const currentBlock = state.blocks[blockId]
      if (!currentBlock) return
      const dx = (e.clientX - resizeStart.current.x) / state.camera.zoom
      const dy = (e.clientY - resizeStart.current.y) / state.camera.zoom
      const newWidth = Math.max(minWidth, sizeStart.current.width + dx)
      const newHeight = Math.max(minHeight, sizeStart.current.height + dy)

      if (onResize) {
        const result = onResize(newWidth, newHeight)
        if (result !== false) {
          state.updateBlock(blockId, result)
        }
      } else {
        state.updateBlock(blockId, { width: newWidth, height: newHeight })
      }
    }

    const handleResizeEnd = () => setIsResizing(false)

    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [block.id, isResizing, minWidth, minHeight, onResize])

  // ── Derived values ──
  const zIndex = isMenuOpen || frontBlockId === block.id ? 999 : isDragging || isResizing ? 1000 : 1
  const cursor = block.locked ? 'default' : isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : 'grab'
  const userSelect = isDragging || isResizing ? ('none' as const) : undefined

  const closeMenu = () => {
    setIsMenuOpen(false)
    clearFrontBlock()
  }

  return {
    // State
    isDragging,
    isResizing,
    isMenuOpen,
    zIndex,
    cursor,
    userSelect,
    // Handlers
    titleBarMouseDown,
    handleResizeMouseDown,
    closeMenu,
  }
}
