import React, { useEffect, useRef, useState } from 'react'
import type { Block } from '../store'
import { useCanvasStore } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

interface Canvas2DBlockProps {
  block: Block
}

const MAX_EXECUTION_TIME = 5000

const Canvas2DBlock: React.FC<Canvas2DBlockProps> = ({ block }) => {
  const updateBlock = useCanvasStore((s) => s.updateBlock)
  const { titleBarMouseDown, handleResizeMouseDown, isMenuOpen, zIndex, cursor, userSelect, closeMenu } =
    useBlockInteractions(block, { minWidth: 280, minHeight: 200 })

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(block.content)
  const [editTitle, setEditTitle] = useState(block.title)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus()
  }, [isEditing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isEditing) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    // Set canvas resolution
    const dpr = window.devicePixelRatio || 1
    canvas.width = block.width * dpr
    canvas.height = block.height * dpr
    ctx.scale(dpr, dpr)

    if (!block.content.trim()) {
      ctx.fillStyle = '#6b7280'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Double-click to edit Canvas 2D code', block.width / 2, block.height / 2)
      return undefined
    }

    try {
      // Create sandboxed execution context
      const killSwitch = { killed: false }
      const timeout = window.setTimeout(() => { killSwitch.killed = true }, MAX_EXECUTION_TIME)

      const sandboxedFn = new Function(
        'canvas',
        'ctx',
        'w',
        'h',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'killSwitch',
        `
        "use strict";
        ${block.content}
        `
      )

      // Wrap requestAnimationFrame to respect kill switch
      const safeRAF = (cb: FrameRequestCallback) => {
        if (killSwitch.killed) return 0
        return requestAnimationFrame((t) => {
          if (!killSwitch.killed) cb(t)
        })
      }

      sandboxedFn(canvas, ctx, block.width, block.height, safeRAF, cancelAnimationFrame, killSwitch)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- error cleared after successful execution
      setError(null)

      return () => {
        window.clearTimeout(timeout)
        killSwitch.killed = true
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution error')
      return undefined
    }
  }, [block.content, block.height, block.id, block.width, isEditing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (block.locked) return
    setEditContent(block.content)
    setEditTitle(block.title)
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (!block.locked) updateBlock(block.id, { content: editContent, title: editTitle || 'Canvas 2D' })
  }

  return (
    <div
      className="physical-block canvas2d-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '1px solid #a78bfa',
        borderRadius: '6px',
        backgroundColor: '#1a1024',
        boxShadow: '0 18px 36px rgba(15, 23, 42, 0.28)',
        cursor,
        userSelect,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex,
      }}
      onMouseDown={titleBarMouseDown}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <div
        className="canvas2d-header"
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid #2d2040',
          backgroundColor: '#130d1d',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#c4b5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {block.title || 'Canvas 2D'}
        </span>
        {error && <span style={{ fontSize: '10px', color: '#f87171', marginLeft: '8px' }}>⚠ {error}</span>}
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} onDoubleClick={handleDoubleClick}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: '#0f0a18',
              color: '#c4b5fd',
              fontFamily: '"JetBrains Mono", "Fira Code", Monaco, Menlo, monospace',
              fontSize: '12px',
              lineHeight: '1.5',
              padding: '8px 12px',
              tabSize: 2,
            }}
            spellCheck={false}
          />
        ) : (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}
      </div>
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#a78bfa" />
    </div>
  )
}

export default Canvas2DBlock
