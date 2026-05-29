import { useState } from 'react'
import type { ReactNode } from 'react'
import { downloadCanvas } from './canvasFiles'
import { useCanvasStore } from './store'
import type { Block } from './store'
import Canvas from './canvas/Canvas'
import FloatingInput from './chat/FloatingInput'
import HomePage from './home/HomePage'
import SettingsPanel from './settings/SettingsPanel'

const BLOCK_CREATE_GAP = 48
const BLOCK_VISUAL_PADDING: Record<Block['type'], number> = {
  bubble: 20,
  collection: 24,
  html: 24,
  image: 36,
  markdown: 24,
  note: 28,
  svg: 18,
  code: 24,
  table: 24,
  link: 24,
}

interface ToolButtonProps {
  icon: ReactNode
  title: string
  variant: 'settings' | 'markdown' | 'note' | 'html' | 'svg' | 'code' | 'table' | 'link'
  onClick: () => void
}

type Rect = { x: number; y: number; width: number; height: number }

function visualBoundsForBlock(block: Block): Rect {
  const padding = BLOCK_VISUAL_PADDING[block.type] ?? 32

  return {
    x: block.x - padding,
    y: block.y - padding,
    width: block.width + padding * 2,
    height: block.height + padding * 2,
  }
}

function blocksOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width + BLOCK_CREATE_GAP <= b.x ||
    b.x + b.width + BLOCK_CREATE_GAP <= a.x ||
    a.y + a.height + BLOCK_CREATE_GAP <= b.y ||
    b.y + b.height + BLOCK_CREATE_GAP <= a.y
  )
}

function findOpenBlockPosition(
  existingBlocks: Block[],
  baseX: number,
  baseY: number,
  width: number,
  height: number,
  visibleBounds: { left: number; top: number; right: number; bottom: number },
  visualPadding: number
): { x: number; y: number } {
  const candidates: Array<{ x: number; y: number }> = []
  const seenCandidates = new Set<string>()
  const columnOffsets = [0, 1, -1, 2, -2, 3, -3]
  const footprintWidth = width + visualPadding * 2
  const footprintHeight = height + visualPadding * 2
  const footprintBaseX = baseX - visualPadding
  const footprintBaseY = baseY - visualPadding
  const addCandidate = (candidate: { x: number; y: number }) => {
    const key = `${Math.round(candidate.x)}:${Math.round(candidate.y)}`

    if (!seenCandidates.has(key)) {
      seenCandidates.add(key)
      candidates.push(candidate)
    }
  }

  for (let row = 0; row < 10; row += 1) {
    for (const columnOffset of columnOffsets) {
      addCandidate({
        x: footprintBaseX + columnOffset * (footprintWidth + BLOCK_CREATE_GAP),
        y: footprintBaseY + row * (footprintHeight + BLOCK_CREATE_GAP),
      })
    }
  }

  const visibleOverflowAllowance = 0
  const gridCandidates: Array<{ x: number; y: number }> = []
  const gridLeft = visibleBounds.left + visualPadding
  const gridTop = visibleBounds.top + visualPadding
  const gridRight = visibleBounds.right - width - visualPadding + visibleOverflowAllowance
  const gridBottom = visibleBounds.bottom - height - visualPadding + visibleOverflowAllowance
  const gridStepX = width + BLOCK_CREATE_GAP
  const gridStepY = height + BLOCK_CREATE_GAP

  for (let y = gridTop; y <= gridBottom; y += gridStepY) {
    for (let x = gridLeft; x <= gridRight; x += gridStepX) {
      gridCandidates.push({
        x: x - visualPadding,
        y: y - visualPadding,
      })
    }
  }

  gridCandidates
    .sort((a, b) => {
      const distanceA = (a.x - footprintBaseX) ** 2 + (a.y - footprintBaseY) ** 2
      const distanceB = (b.x - footprintBaseX) ** 2 + (b.y - footprintBaseY) ** 2

      return distanceA - distanceB
    })
    .forEach(addCandidate)

  const isWithinVisibleBounds = (candidate: { x: number; y: number }) =>
    candidate.x >= visibleBounds.left - visibleOverflowAllowance &&
    candidate.y >= visibleBounds.top &&
    candidate.x + footprintWidth <= visibleBounds.right + visibleOverflowAllowance &&
    candidate.y + footprintHeight <= visibleBounds.bottom + visibleOverflowAllowance
  const existingVisualBounds = existingBlocks.map(visualBoundsForBlock)
  const doesNotOverlap = (candidate: { x: number; y: number }) =>
    existingVisualBounds.every((bounds) =>
      !blocksOverlap({ ...candidate, width: footprintWidth, height: footprintHeight }, bounds)
    )
  const openCandidates = candidates
    .filter(doesNotOverlap)
    .sort((a, b) => {
      const distanceA = (a.x - footprintBaseX) ** 2 + (a.y - footprintBaseY) ** 2
      const distanceB = (b.x - footprintBaseX) ** 2 + (b.y - footprintBaseY) ** 2

      return distanceA - distanceB
    })
  const offscreenOpenCandidate =
    openCandidates.find(isWithinVisibleBounds) ?? openCandidates[0]

  if (offscreenOpenCandidate) {
    return {
      x: offscreenOpenCandidate.x + visualPadding,
      y: offscreenOpenCandidate.y + visualPadding,
    }
  }

  const fallbackOffset = existingBlocks.length * 72
  return {
    x: Math.min(
      Math.max(baseX + fallbackOffset, visibleBounds.left + visualPadding),
      visibleBounds.right - width - visualPadding
    ),
    y: Math.min(
      Math.max(baseY + fallbackOffset, visibleBounds.top + visualPadding),
      visibleBounds.bottom - height - visualPadding
    ),
  }
}

function ToolIcon({ variant }: Pick<ToolButtonProps, 'variant'>) {
  const commonProps = {
    'aria-hidden': true,
    className: 'canvas-tool-icon',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  }

  if (variant === 'settings') {
    return (
      <svg {...commonProps}>
        <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
        <path d="m4.7 10.1 1.5-2.6 3 .4 1.8-2.4h2l1.8 2.4 3-.4 1.5 2.6-1.8 2 1.8 2-1.5 2.6-3-.4-1.8 2.4h-2l-1.8-2.4-3 .4-1.5-2.6 1.8-2-1.8-2Z" />
      </svg>
    )
  }

  if (variant === 'markdown') {
    return (
      <svg {...commonProps}>
        <path d="M7 3.5h7.2L19 8.3v12.2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
        <path d="M14 3.5v5h5" />
        <path d="M8.8 12h6.4M8.8 15h5M8.8 18h3.6" />
      </svg>
    )
  }

  if (variant === 'note') {
    return (
      <svg {...commonProps}>
        <path d="M5.8 4.8h12.4v10.8l-4.2 3.6H5.8V4.8Z" />
        <path d="M14 19.2v-3.7h4.2" />
        <path d="M8.6 8.6h6.8M8.6 11.7h5.1" />
      </svg>
    )
  }

  if (variant === 'html') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="14" rx="2.4" />
        <path d="m10 10-2.5 2 2.5 2M14 10l2.5 2-2.5 2" />
        <path d="M12.8 9.5 11.2 14.5" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M6.5 7.5 12 4l5.5 3.5v9L12 20l-5.5-3.5v-9Z" />
      <path d="M12 4v16M6.5 7.5 12 11l5.5-3.5" />
      <circle cx="12" cy="4" r="1.4" />
      <circle cx="6.5" cy="16.5" r="1.4" />
      <circle cx="17.5" cy="16.5" r="1.4" />
    </svg>
  )
}

function ToolButton({ icon, title, variant, onClick }: ToolButtonProps) {
  const colors = {
    settings: { background: '#3e2600', border: '#f0ddb0', color: '#f0ddb0' },
    markdown: { background: '#f8f3e6', border: '#c8b088', color: '#6a4a1d' },
    note: { background: '#fff176', border: '#d6b900', color: '#5c4a00' },
    html: { background: '#ece7de', border: '#bdb5a5', color: '#3a3530' },
    svg: { background: '#eef2f8', border: '#b8cce0', color: '#3a62a0' },
    code: { background: '#1e1e2e', border: '#45475a', color: '#cdd6f4' },
    table: { background: '#f0fdf4', border: '#86efac', color: '#166534' },
    link: { background: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' },
  }[variant]

  return (
    <button
      aria-label={title}
      className={`canvas-tool-button canvas-tool-${variant}`}
      onClick={onClick}
      title={title}
      style={{
        width: '46px',
        height: '46px',
        border: `1px solid ${colors.border}`,
        borderRadius: '999px',
        backgroundColor: colors.background,
        boxShadow: '3px 4px 0 rgba(62, 38, 0, 0.38), 0 12px 24px rgba(49, 31, 13, 0.18)',
        color: colors.color,
        cursor: 'pointer',
        display: 'grid',
        fontSize: '19px',
        fontWeight: 800,
        lineHeight: 1,
        placeItems: 'center',
      }}
    >
      {icon}
    </button>
  )
}

function App() {
  const { activeCanvasId, activeCanvasName, addBlock, camera, closeCanvas, exportCanvas } = useCanvasStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const createBlock = (type: 'markdown' | 'note' | 'html' | 'svg' | 'code' | 'table' | 'link' | 'link') => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const worldX = (viewportWidth / 2 - camera.x) / camera.zoom
    const worldY = (viewportHeight / 2 - camera.y) / camera.zoom
    const width = type === 'html' || type === 'svg' ? 400 : type === 'markdown' ? 320 : 200
    const height = type === 'html' || type === 'svg' ? 300 : type === 'markdown' ? 240 : 200
    const visualPadding = BLOCK_VISUAL_PADDING[type]
    const visibleBounds = {
      left: (86 - camera.x) / camera.zoom,
      top: (92 - camera.y) / camera.zoom,
      right: (viewportWidth - 24 - camera.x) / camera.zoom,
      bottom: (viewportHeight - 24 - camera.y) / camera.zoom,
    }
    const position = findOpenBlockPosition(
      Object.values(useCanvasStore.getState().blocks),
      worldX - width / 2,
      worldY - height / 2,
      width,
      height,
      visibleBounds,
      visualPadding
    )

    const block: Block = {
      id: crypto.randomUUID(),
      type,
      x: position.x,
      y: position.y,
      width,
      height,
      heightMode: type === 'markdown' || type === 'note' ? 'auto' : undefined,
      content:
        type === 'html'
          ? '<!doctype html><html><body><main><p>HTML</p><button id="count">记录 0 次灵感</button></main><script>let n=0;document.getElementById("count").onclick=()=>{n+=1;document.getElementById("count").textContent=`记录 ${n} 次灵感`;};</script><style>body{font-family:Georgia,serif;display:grid;place-items:center;height:100vh;margin:0;background:#0c180c;color:#72d272}main{border:1px solid rgba(114,210,114,.45);padding:22px;text-align:center;box-shadow:0 0 22px rgba(114,210,114,.18)}p{font-family:"Courier New",monospace;font-size:12px;letter-spacing:.16em;margin:0 0 16px;text-transform:uppercase}button{border:1px solid #72d272;border-radius:2px;background:#102410;color:#72d272;font-size:16px;padding:12px 16px;cursor:pointer}</style></body></html>'
          : type === 'code'
          ? ''
          : type === 'link'
          ? '{"url":"https://example.com","title":"Link"}'
          : type === 'table'
          ? '{"headers":["Column 1","Column 2","Column 3"],"rows":[[","," "]]}'
          : type === 'svg'
            ? '<svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" rx="4" fill="#eef2f8"/><path d="M56 92h110v72H56z" fill="#f8f3e6" stroke="#d8c39b" stroke-width="3"/><path d="M232 76h92v108h-92z" fill="#fff176" stroke="#d6b900" stroke-width="3"/><path d="M116 165c42 28 98 32 150 8" fill="none" stroke="#3e2600" stroke-width="5" stroke-linecap="round" stroke-dasharray="12 10"/><circle cx="111" cy="92" r="10" fill="#8b3a3a"/><circle cx="278" cy="76" r="10" fill="#8b3a3a"/><text x="112" y="136" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#2e2010">Idea</text><text x="278" y="136" text-anchor="middle" font-family="Courier New,monospace" font-size="18" fill="#5c4a00">SVG</text></svg>'
          : '',
      locked: false,
      parentCollectionId: null,
      title: type === 'html' ? 'HTML 原型' : type === 'svg' ? '白板 SVG' : type === 'code' ? '代码片段' : type === 'link' ? '链接预览' : type === 'table' ? '数据表格' : type === 'markdown' ? '纸页文档' : '灵感便签',
      createdBy: 'user',
      createdAt: Date.now(),
    }

    addBlock(block)
  }

  const handleExportCurrentCanvas = () => {
    const document = exportCanvas()

    if (document) {
      downloadCanvas(document)
    }
  }

  if (!activeCanvasId) {
    return <HomePage />
  }

  return (
    <div>
      <Canvas />
      <FloatingInput />
      {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
      <div
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '20px',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <ToolButton
          icon={<ToolIcon variant="settings" />}
          title="打开设置"
          variant="settings"
          onClick={() => setIsSettingsOpen(true)}
        />
      </div>
      <div
        className="canvas-topbar"
        style={{
          position: 'fixed',
          left: '82px',
          top: '20px',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <button type="button" className="canvas-topbar-button" onClick={closeCanvas}>
          ← 首页
        </button>
        <span className="canvas-topbar-title">{activeCanvasName}</span>
        <button type="button" className="canvas-topbar-button" onClick={handleExportCurrentCanvas}>
          导出
        </button>
      </div>
      <div
        style={{
          position: 'fixed',
          left: '20px',
          top: '20px',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <ToolButton
          icon={<ToolIcon variant="markdown" />}
          title="添加纸页文档"
          variant="markdown"
          onClick={() => createBlock('markdown')}
        />
        <ToolButton
          icon={<ToolIcon variant="note" />}
          title="添加灵感便签"
          variant="note"
          onClick={() => createBlock('note')}
        />
        <ToolButton
          icon={<ToolIcon variant="html" />}
          title="添加 HTML 块"
          variant="html"
          onClick={() => createBlock('html')}
        />
        <ToolButton
          icon={<ToolIcon variant="svg" />}
          title="添加白板 SVG"
          variant="svg"
          onClick={() => createBlock('svg')}
        />
        <ToolButton
          icon={<ToolIcon variant="code" />}
          title="添加代码片段"
          variant="code"
          onClick={() => createBlock('code')}
        />
        <ToolButton
          icon={<ToolIcon variant="table" />}
          title="添加数据表格"
          variant="table"
          onClick={() => createBlock('table')}
        />
        <ToolButton
          icon={<ToolIcon variant="link" />}
          title="添加链接预览"
          variant="link"
          onClick={() => createBlock('link')}
        />
      </div>
    </div>
  )
}

export default App
