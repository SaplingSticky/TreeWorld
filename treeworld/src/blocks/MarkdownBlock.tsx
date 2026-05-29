import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'

interface MarkdownBlockProps {
  block: Block
}

interface TodoItem {
  checked: boolean
  indent: number
  lineIndex: number
  text: string
}

type MarkdownSegment =
  | { type: 'markdown'; content: string }
  | { type: 'todos'; items: TodoItem[] }

const todoLinePattern = /^(\s*)[-*+]\s+\[( |x|X)\]\s+(.*)$/
const autoPairs: Record<string, string> = {
  '(': ')',
  '[': ']',
}
const MIN_MARKDOWN_HEIGHT = 180
const MIN_MARKDOWN_WIDTH = 220
const CONTENT_VERTICAL_PADDING = 24

function buildMarkdownSegments(content: string): MarkdownSegment[] {
  const lines = content.split(/\r?\n/)
  const segments: MarkdownSegment[] = []
  let markdownLines: string[] = []
  let todoItems: TodoItem[] = []

  const flushMarkdown = () => {
    if (markdownLines.length > 0) {
      segments.push({ type: 'markdown', content: markdownLines.join('\n') })
      markdownLines = []
    }
  }

  const flushTodos = () => {
    if (todoItems.length > 0) {
      segments.push({ type: 'todos', items: todoItems })
      todoItems = []
    }
  }

  lines.forEach((line, lineIndex) => {
    const todoMatch = line.match(todoLinePattern)

    if (todoMatch) {
      flushMarkdown()
      todoItems.push({
        checked: todoMatch[2].toLowerCase() === 'x',
        indent: todoMatch[1].length,
        lineIndex,
        text: todoMatch[3],
      })
      return
    }

    flushTodos()
    markdownLines.push(line)
  })

  flushMarkdown()
  flushTodos()

  return segments
}

function preserveSoftLineBreaks(content: string): string {
  const lines = content.split('\n')
  let isInCodeFence = false

  return lines
    .map((line, index) => {
      if (line.trim().startsWith('```')) {
        isInCodeFence = !isInCodeFence
        return line
      }

      if (isInCodeFence || index === lines.length - 1 || line.trim() === '') {
        return line
      }

      return `${line}  `
    })
    .join('\n')
}

const MarkdownBlock: React.FC<MarkdownBlockProps> = ({ block }) => {
  const { camera, updateBlock } = useCanvasStore()
  const frontBlockId = useCanvasStore((s) => s.frontBlockId)
  const clearFrontBlock = useCanvasStore((s) => s.clearFrontBlock)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const titleBarDownRef = useRef<{ x: number; y: number } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(block.content)
  const [editTitle, setEditTitle] = useState(block.title)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [textareaHeight, setTextareaHeight] = useState(120)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const titleBarRef = useRef<HTMLDivElement>(null)
  const contentMeasureRef = useRef<HTMLDivElement>(null)
  const isMouseDown = useRef(false)
  const hasMoved = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const blockStart = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0 })
  const sizeStart = useRef({ width: 0, height: 0 })
  const isAutoHeight = block.heightMode !== 'manual'

  useLayoutEffect(() => {
    if (!isAutoHeight || isResizing || block.locked) {
      return
    }

    const headerHeight = headerRef.current?.offsetHeight ?? 36
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = '0px'
      const nextTextareaHeight = Math.max(120, textareaRef.current.scrollHeight)
      textareaRef.current.style.height = `${nextTextareaHeight}px`
      setTextareaHeight((currentHeight) =>
        Math.abs(currentHeight - nextTextareaHeight) > 1 ? nextTextareaHeight : currentHeight
      )
    }

    const measuredContentHeight = isEditing
      ? textareaRef.current?.scrollHeight ?? 0
      : contentMeasureRef.current?.scrollHeight ?? 0
    const nextHeight = Math.max(
      MIN_MARKDOWN_HEIGHT,
      Math.ceil(headerHeight + measuredContentHeight + CONTENT_VERTICAL_PADDING)
    )

    if (Math.abs(block.height - nextHeight) > 2) {
      updateBlock(block.id, { height: nextHeight, heightMode: 'auto' })
    }
  }, [
    block.content,
    block.height,
    block.heightMode,
    block.id,
    block.locked,
    block.title,
    block.width,
    editContent,
    editTitle,
    isAutoHeight,
    isEditing,
    isResizing,
    updateBlock,
  ])

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isResizing) {
      return
    }

    const handleResizeMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / camera.zoom
      const dy = (e.clientY - resizeStart.current.y) / camera.zoom

      if (isEditing) {
        updateBlock(block.id, {
          width: Math.max(MIN_MARKDOWN_WIDTH, sizeStart.current.width + dx),
          heightMode: 'auto',
        })
      } else {
        updateBlock(block.id, {
          width: Math.max(MIN_MARKDOWN_WIDTH, sizeStart.current.width + dx),
          height: Math.max(MIN_MARKDOWN_HEIGHT, sizeStart.current.height + dy),
          heightMode: 'manual',
        })
      }
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)

    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [block.id, camera.zoom, isEditing, isResizing, updateBlock])

  const titleBarMouseDown = (e: React.MouseEvent) => {
    if (block.locked || isEditing || e.button !== 0) {
      return
    }

    e.stopPropagation()
    titleBarDownRef.current = { x: e.clientX, y: e.clientY }
    isMouseDown.current = true
    hasMoved.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    blockStart.current = { x: block.x, y: block.y }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (block.locked) {
      e.stopPropagation()
      return
    }

    if (isEditing) {
      e.stopPropagation()
      return
    }

    if (e.button === 0 && !isEditing) {
      e.stopPropagation()
      isMouseDown.current = true
      hasMoved.current = false
      dragStart.current = { x: e.clientX, y: e.clientY }
      blockStart.current = { x: block.x, y: block.y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMouseDown.current && !isEditing) {
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y

      if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        hasMoved.current = true
        setIsDragging(true)
      }

      if (hasMoved.current) {
        const worldDx = dx / camera.zoom
        const worldDy = dy / camera.zoom
        updateBlock(block.id, {
          x: blockStart.current.x + worldDx,
          y: blockStart.current.y + worldDy,
        })
      }
    }
  }

  const handleMouseUp = () => {
    if (titleBarDownRef.current && !hasMoved.current) {
      titleBarDownRef.current = null
      setIsMenuOpen(true)
    }

    titleBarDownRef.current = null
    isMouseDown.current = false
    hasMoved.current = false
    setIsDragging(false)
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (block.locked) {
      return
    }

    e.stopPropagation()
    e.preventDefault()
    isMouseDown.current = false
    hasMoved.current = false
    setIsDragging(false)
    setIsResizing(true)
    resizeStart.current = { x: e.clientX, y: e.clientY }
    sizeStart.current = { width: block.width, height: block.height }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (block.locked) {
      return
    }

    setEditContent(block.content)
    setIsEditing(true)
  }

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (block.locked || isEditing) {
      return
    }

    setIsDragging(false)
    setIsResizing(false)
    updateBlock(block.id, { heightMode: 'auto' })
  }

  const handleBlur = () => {
    setIsEditing(false)

    if (!block.locked) {
      updateBlock(block.id, { content: editContent })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBlur()
    }
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const { selectionStart, selectionEnd } = textarea
    const openPair = autoPairs[e.key]

    if (openPair) {
      const closePair = autoPairs[openPair as keyof typeof autoPairs]

      if (closePair) {
        e.preventDefault()
        const before = editContent.slice(0, selectionStart)
        const after = editContent.slice(selectionEnd)
        const nextContent = `${before}${openPair}${closePair}${after}`
        setEditContent(nextContent)
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + 1
          textarea.selectionEnd = selectionStart + 1
        })
        return
      }
    }

    if (e.key === 'Enter') {
      const currentLineStart = editContent.lastIndexOf('\n', selectionStart - 1) + 1
      const currentLine = editContent.slice(currentLineStart, selectionStart)
      const indentMatch = currentLine.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''

      if (indent) {
        e.preventDefault()
        const before = editContent.slice(0, selectionStart)
        const after = editContent.slice(selectionEnd)
        const nextContent = `${before}\n${indent}${after}`
        setEditContent(nextContent)
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + 1 + indent.length
          textarea.selectionEnd = selectionStart + 1 + indent.length
        })
        return
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setEditContent(block.content)
      setIsEditing(false)
    }
  }

  const toggleTodo = (lineIndex: number) => {
    const lines = block.content.split('\n')
    const line = lines[lineIndex]

    if (!line) {
      return
    }

    const match = line.match(todoLinePattern)

    if (!match) {
      return
    }

    const isChecked = match[2].toLowerCase() === 'x'
    const newCheck = isChecked ? ' ' : 'x'
    lines[lineIndex] = line.replace(todoLinePattern, `$1[${newCheck}] $3`)
    const nextContent = lines.join('\n')

    setEditContent(nextContent)
    updateBlock(block.id, { content: nextContent })
  }

  const renderMarkdownContent = () => {
    const segments = buildMarkdownSegments(block.content)

    return segments.map((segment, segmentIndex) => {
      if (segment.type === 'markdown') {
        const preserved = preserveSoftLineBreaks(segment.content)

        return (
          <ReactMarkdown
            key={`md-${segmentIndex}`}
            components={{
              input: ({ ...props }) => <input {...props} />,
              li: ({ children, ...props }) => <li {...props}>{children}</li>,
            }}
          >
            {preserved}
          </ReactMarkdown>
        )
      }

      return (
        <ul className="task-list" key={`todos-${segmentIndex}`}>
          {segment.items.map((item) => (
            <li
              className={item.checked ? 'task-list-item is-complete' : 'task-list-item'}
              key={item.lineIndex}
              style={{ paddingLeft: `${item.indent * 10}px` }}
            >
              <label
                onMouseDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <input
                  checked={item.checked}
                  onChange={() => toggleTodo(item.lineIndex)}
                  onClick={(e) => e.stopPropagation()}
                  type="checkbox"
                />
                <span>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )
    })
  }

  return (
    <div
      className="physical-block markdown-paper-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        backgroundColor: '#F5F0E8',
        borderRadius: '2px 3px 2px 4px',
        boxShadow: block.locked
          ? '-2px 0 4px rgba(127, 29, 29, 0.2), 0 18px 34px rgba(31, 10, 16, 0.13)'
          : '-2px 0 4px rgba(0,0,0,0.08), 0 18px 34px rgba(31, 10, 16, 0.13)',
        border: block.locked ? '2px solid #7f1d1d' : '1px solid #ded4c1',
        cursor: block.locked ? 'default' : isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : isEditing ? 'default' : 'grab',
        zIndex: isMenuOpen || frontBlockId === block.id ? 999 : isDragging || isResizing ? 1000 : 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onBlur={isEditing ? handleBlur : undefined}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={() => { setIsMenuOpen(false); clearFrontBlock() }} />}
      <div
        className="markdown-paper-title"
        ref={(node) => {
          headerRef.current = node
          titleBarRef.current = node
        }}
        onMouseDown={titleBarMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleTitleDoubleClick}
        style={{
          padding: '14px 42px 0 18px',
          borderBottom: 'none',
          fontFamily: '"Lora", Georgia, serif',
          fontSize: '20px',
          color: isEditing ? '#7f1d1d' : '#3b2f24',
          fontWeight: 700,
          cursor: isEditing ? 'text' : 'inherit',
        }}
      >
        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#7f1d1d',
              backgroundColor: 'transparent',
            }}
            placeholder="Enter title..."
          />
        ) : (
          block.title || 'Untitled'
        )}
      </div>
      <div
        className="markdown-paper-body"
        onDoubleClick={handleDoubleClick}
        style={{
          flex: isAutoHeight ? '0 0 auto' : 1,
          padding: '10px 18px 20px',
          overflow: isAutoHeight || isEditing ? 'visible' : 'auto',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            style={{
              width: '100%',
              height: isAutoHeight ? `${textareaHeight}px` : '100%',
              minHeight: isAutoHeight ? '120px' : undefined,
              border: 'none',
              outline: 'none',
              overflow: isAutoHeight ? 'hidden' : 'auto',
              resize: 'none',
              fontFamily: 'inherit',
              fontSize: '14px',
              lineHeight: '1.6',
              backgroundColor: 'rgba(255,255,255,0.62)',
              borderRadius: '2px',
              padding: '8px',
            }}
            placeholder="Enter markdown content..."
          />
        ) : (
          <div className="markdown-content" ref={contentMeasureRef}>
            {renderMarkdownContent()}
          </div>
        )}
      </div>
      <div
        aria-label="Resize markdown block"
        title="Resize"
        onMouseDown={handleResizeMouseDown}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '18px',
          height: '18px',
          cursor: block.locked ? 'default' : 'nwse-resize',
          opacity: block.locked ? 0.35 : 1,
          background:
            'linear-gradient(135deg, transparent 0 45%, #94a3b8 45% 55%, transparent 55% 100%)',
        }}
      />
    </div>
  )
}

export default MarkdownBlock
