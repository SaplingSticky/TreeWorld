import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useCanvasStore } from '../store'
import type { Block } from '../store'
import { screenToWorld } from './camera'
import CollectionBlock from '../blocks/CollectionBlock'
import HtmlBlock from '../blocks/HtmlBlock'
import ImageBlock from '../blocks/ImageBlock'
import MarkdownBlock from '../blocks/MarkdownBlock'
import NoteBlock from '../blocks/NoteBlock'
import SvgBlock from '../blocks/SvgBlock'
import CodeBlock from '../blocks/CodeBlock'
import TableBlock from '../blocks/TableBlock'
import LinkBlock from '../blocks/LinkBlock'
import BubbleBlock from '../blocks/BubbleBlock'

const SCREEN_GRID_SIZE = 32
const NAV_PADDING = 120
const MINIMAP_WIDTH = 180
const MINIMAP_HEIGHT = 128

const Canvas: React.FC = () => {
  const {
    blocks,
    camera,
    canvasTheme,
    isAgentThinking,
    agentStatusText,
    fitCollectionToChildren,
    resolveLayoutOverlaps,
    setCamera,
    undo,
    redo,
  } = useCanvasStore()
  const canvasRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isPanning = useRef(false)
  const [isPanningUi, setIsPanningUi] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const lastMouse = useRef({ x: 0, y: 0 })
  const blockList = useMemo(() => Object.values(blocks), [blocks])
  const blockBounds = useMemo(() => {
    if (blockList.length === 0) {
      return null
    }

    const minX = Math.min(...blockList.map((block) => block.x))
    const minY = Math.min(...blockList.map((block) => block.y))
    const maxX = Math.max(...blockList.map((block) => block.x + block.width))
    const maxY = Math.max(...blockList.map((block) => block.y + block.height))

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }, [blockList])
  const minimapScale = blockBounds
    ? Math.min(MINIMAP_WIDTH / blockBounds.width, MINIMAP_HEIGHT / blockBounds.height)
    : 1
  const minimapContentWidth = blockBounds ? blockBounds.width * minimapScale : 0
  const minimapContentHeight = blockBounds ? blockBounds.height * minimapScale : 0
  const minimapOffsetX = (MINIMAP_WIDTH - minimapContentWidth) / 2
  const minimapOffsetY = (MINIMAP_HEIGHT - minimapContentHeight) / 2
  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return []
    }

    return blockList
      .filter((block) => `${block.title}\n${block.content}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 8)
  }, [blockList, searchQuery])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning.current = true
        setIsPanningUi(true)
        lastMouse.current = { x: e.clientX, y: e.clientY }
        e.preventDefault()
      }
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - lastMouse.current.x
        const dy = e.clientY - lastMouse.current.y
        setCamera({
          x: camera.x + dx,
          y: camera.y + dy,
          zoom: camera.zoom,
        })
        lastMouse.current = { x: e.clientX, y: e.clientY }
      }
    },
    [camera, setCamera]
  )

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
    setIsPanningUi(false)
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(3, Math.max(0.1, camera.zoom * zoomFactor))

      const mousePos = screenToWorld(e.clientX, e.clientY, camera)
      const newCamera = {
        x: e.clientX - mousePos.x * newZoom,
        y: e.clientY - mousePos.y * newZoom,
        zoom: newZoom,
      }
      setCamera(newCamera)
    },
    [camera, setCamera]
  )

  const focusBlock = useCallback(
    (block: Block, zoom = Math.max(camera.zoom, 1)) => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const blockCenterX = block.x + block.width / 2
      const blockCenterY = block.y + block.height / 2

      setCamera({
        x: viewportWidth / 2 - blockCenterX * zoom,
        y: viewportHeight / 2 - blockCenterY * zoom,
        zoom,
      })
    },
    [camera.zoom, setCamera]
  )

  const fitAllBlocks = useCallback(() => {
    if (!blockBounds) {
      setCamera({ x: 0, y: 0, zoom: 1 })
      return
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const nextZoom = Math.min(
      1.4,
      Math.max(
        0.1,
        Math.min(
          (viewportWidth - NAV_PADDING * 2) / blockBounds.width,
          (viewportHeight - NAV_PADDING * 2) / blockBounds.height
        )
      )
    )

    setCamera({
      x: viewportWidth / 2 - (blockBounds.minX + blockBounds.width / 2) * nextZoom,
      y: viewportHeight / 2 - (blockBounds.minY + blockBounds.height / 2) * nextZoom,
      zoom: nextZoom,
    })
  }, [blockBounds, setCamera])

  const resetZoom = useCallback(() => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const center = screenToWorld(viewportWidth / 2, viewportHeight / 2, camera)

    setCamera({
      x: viewportWidth / 2 - center.x,
      y: viewportHeight / 2 - center.y,
      zoom: 1,
    })
  }, [camera, setCamera])

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!blockBounds) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - minimapOffsetX) / minimapScale + blockBounds.minX
    const y = (e.clientY - rect.top - minimapOffsetY) / minimapScale + blockBounds.minY

    setCamera({
      x: window.innerWidth / 2 - x * camera.zoom,
      y: window.innerHeight / 2 - y * camera.zoom,
      zoom: camera.zoom,
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const usesMeta = e.metaKey || e.ctrlKey

      if (!usesMeta) {
        if (e.key === 'Escape' && isSearchOpen) {
          setIsSearchOpen(false)
        }
        return
      }

      if (e.key === '0') {
        e.preventDefault()
        fitAllBlocks()
        return
      }

      if (e.key === '1') {
        e.preventDefault()
        resetZoom()
        return
      }

      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }

      if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsSearchOpen(true)
        window.setTimeout(() => searchInputRef.current?.focus(), 0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fitAllBlocks, isSearchOpen, redo, resetZoom, undo])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.addEventListener('wheel', (e) => e.preventDefault(), {
        passive: false,
      })
    }
  }, [])

  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'collection':
        return <CollectionBlock key={block.id} block={block} />
      case 'image':
        return <ImageBlock key={block.id} block={block} />
      case 'html':
        return <HtmlBlock key={block.id} block={block} />
      case 'svg':
        return <SvgBlock key={block.id} block={block} />
      case 'code':
        return <CodeBlock key={block.id} block={block} />
      case 'table':
        return <TableBlock key={block.id} block={block} />
      case 'link':
        return <LinkBlock key={block.id} block={block} />
      case 'markdown':
        return <MarkdownBlock key={block.id} block={block} />
      case 'note':
        return <NoteBlock key={block.id} block={block} />
      case 'bubble':
        return <BubbleBlock key={block.id} block={block} />
      default:
        return null
    }
  }
  const collectionBlocks = blockList.filter((block) => block.type === 'collection')
  const contentBlocks = blockList.filter((block) => block.type !== 'collection')
  const layoutFitSignature = contentBlocks
    .filter((block) => block.parentCollectionId || block.layoutGroupId || block.createdBy === 'agent')
    .map((block) =>
      [
        block.parentCollectionId,
        block.layoutGroupId,
        block.id,
        Math.round(block.x),
        Math.round(block.y),
        Math.round(block.width),
        Math.round(block.height),
      ].join(':')
    )
    .join('|')

  useEffect(() => {
    resolveLayoutOverlaps()

    const timer = window.setTimeout(() => {
      const collectionIds = new Set(
        Object.values(useCanvasStore.getState().blocks)
          .filter((block) => block.parentCollectionId)
          .map((block) => block.parentCollectionId as string)
      )

      collectionIds.forEach((collectionId) => fitCollectionToChildren(collectionId))
    }, 150)

    return () => window.clearTimeout(timer)
  }, [layoutFitSignature, fitCollectionToChildren, resolveLayoutOverlaps])

  return (
    <div
      ref={canvasRef}
      className={`canvas canvas-theme-${canvasTheme}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        cursor: isPanningUi ? 'grabbing' : 'grab',
        '--canvas-grid-size': `${SCREEN_GRID_SIZE}px`,
        '--canvas-grid-position': `${camera.x % SCREEN_GRID_SIZE}px ${camera.y % SCREEN_GRID_SIZE}px`,
      } as React.CSSProperties}
    >
      <div
        className="world"
        style={{
          position: 'absolute',
          transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {collectionBlocks.map(renderBlock)}
        {contentBlocks.map(renderBlock)}
      </div>
      {isAgentThinking && (
        <div
          className="canvas-agent-status"
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            zIndex: 2000,
            border: '1px solid #bfdbfe',
            borderRadius: '999px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.16)',
          }}
        >
          {agentStatusText || 'Agent 正在整理桌面...'}
        </div>
      )}
      <div
        className="canvas-minimap"
        onClick={handleMinimapClick}
        style={{
          position: 'fixed',
          right: '20px',
          bottom: isAgentThinking ? '76px' : '20px',
          width: `${MINIMAP_WIDTH}px`,
          height: `${MINIMAP_HEIGHT}px`,
          zIndex: 1800,
        }}
      >
        {blockBounds ? (
          <>
            {blockList.map((block) => (
              <span
                aria-hidden="true"
                className={`canvas-minimap-block canvas-minimap-${block.type}`}
                key={block.id}
                style={{
                  left: `${minimapOffsetX + (block.x - blockBounds.minX) * minimapScale}px`,
                  top: `${minimapOffsetY + (block.y - blockBounds.minY) * minimapScale}px`,
                  width: `${Math.max(4, block.width * minimapScale)}px`,
                  height: `${Math.max(4, block.height * minimapScale)}px`,
                }}
              />
            ))}
            <span
              aria-hidden="true"
              className="canvas-minimap-viewport"
              style={{
                left: `${minimapOffsetX + ((-camera.x / camera.zoom) - blockBounds.minX) * minimapScale}px`,
                top: `${minimapOffsetY + ((-camera.y / camera.zoom) - blockBounds.minY) * minimapScale}px`,
                width: `${(window.innerWidth / camera.zoom) * minimapScale}px`,
                height: `${(window.innerHeight / camera.zoom) * minimapScale}px`,
              }}
            />
          </>
        ) : (
          <span className="canvas-minimap-empty">空画布</span>
        )}
      </div>
      {isSearchOpen && (
        <div className="canvas-search" onMouseDown={(e) => e.stopPropagation()}>
          <input
            ref={searchInputRef}
            aria-label="搜索块"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsSearchOpen(false)
              }
            }}
            placeholder="搜索块标题或内容"
          />
          <div className="canvas-search-results">
            {searchResults.length > 0 ? (
              searchResults.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => {
                    focusBlock(block)
                    setIsSearchOpen(false)
                  }}
                >
                  <span>{block.title || 'Untitled'}</span>
                  <small>{block.type}</small>
                </button>
              ))
            ) : (
              <p>{searchQuery.trim() ? '没有匹配的块' : '输入关键词搜索画布块'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Canvas
