import { useCallback, useRef, useState } from 'react'

const DRAG_THRESHOLD = 4

interface UseBlockClickDragOptions {
  onClick: () => void
  onDragStart?: () => void
  disabled?: boolean
}

export function useBlockClickDrag({
  onClick,
  onDragStart,
  disabled = false,
}: UseBlockClickDragOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const [isPendingClick, setIsPendingClick] = useState(false)
  const startRef = useRef({ x: 0, y: 0 })

  const handlePointerDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || e.button !== 0) {
        return
      }

      e.stopPropagation()
      startRef.current = { x: e.clientX, y: e.clientY }
      setIsPendingClick(true)
    },
    [disabled]
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPendingClick) {
        return
      }

      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y

      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        setIsPendingClick(false)
        setIsDragging(true)
        onDragStart?.()
      }
    },
    [isPendingClick, onDragStart]
  )

  const handlePointerUp = useCallback(() => {
    if (isPendingClick) {
      onClick()
    }

    setIsPendingClick(false)
    setIsDragging(false)
  }, [isPendingClick, onClick])

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDragging,
    isPendingClick,
  }
}
