import React, { useRef, useState } from 'react'
import { downloadCanvas } from '../canvasFiles'
import { useCanvasStore } from '../store'
import type { BlockType, BlockTypeSummary, CanvasMeta } from '../store'

const BLOCK_LABELS: Record<BlockType, string> = {
  markdown: 'MD',
  note: 'Note',
  bubble: 'Bubble',
  html: 'HTML',
  image: 'Image',
  collection: 'Group',
  svg: 'SVG',
  code: 'Code',
  table: 'Table',
  link: 'Link',
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function MiniMap({ blockTypes, blockCount }: { blockTypes: BlockTypeSummary; blockCount: number }) {
  const chips = Object.entries(blockTypes).flatMap(([type, count], typeIndex) =>
    Array.from({ length: Math.min(count ?? 0, 5) }, (_, index) => ({
      type: type as BlockType,
      left: 16 + ((typeIndex * 31 + index * 17) % 190),
      top: 18 + ((typeIndex * 23 + index * 29) % 82),
      width: type === 'collection' ? 78 : type === 'markdown' ? 54 : 38,
      height: type === 'collection' ? 46 : type === 'html' || type === 'svg' ? 34 : 28,
    }))
  )

  return (
    <div className="home-minimap" aria-hidden="true">
      {blockCount === 0 && <div className="home-minimap-empty">空画布</div>}
      {chips.map((chip, index) => (
        <span
          key={`${chip.type}-${index}`}
          className={`home-minimap-chip home-minimap-${chip.type}`}
          style={{
            left: chip.left,
            top: chip.top,
            width: chip.width,
            height: chip.height,
          }}
        />
      ))}
    </div>
  )
}

function TypeSummary({ blockTypes }: { blockTypes: BlockTypeSummary }) {
  const entries = Object.entries(blockTypes).filter(([, count]) => count && count > 0)

  if (entries.length === 0) {
    return <span className="home-type-empty">暂无块</span>
  }

  return (
    <div className="home-type-list">
      {entries.map(([type, count]) => (
        <span key={type} className="home-type-pill">
          {BLOCK_LABELS[type as BlockType]} {count}
        </span>
      ))}
    </div>
  )
}

function CanvasCard({ meta }: { meta: CanvasMeta }) {
  const loadCanvas = useCanvasStore((state) => state.loadCanvas)
  const renameCanvas = useCanvasStore((state) => state.renameCanvas)
  const deleteCanvas = useCanvasStore((state) => state.deleteCanvas)
  const exportCanvas = useCanvasStore((state) => state.exportCanvas)

  const handleRename = (event: React.MouseEvent) => {
    event.stopPropagation()
    const nextName = window.prompt('Rename canvas', meta.name)

    if (nextName) {
      renameCanvas(meta.id, nextName)
    }
  }

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation()

    if (window.confirm(`Delete "${meta.name}"?`)) {
      deleteCanvas(meta.id)
    }
  }

  const handleExport = (event: React.MouseEvent) => {
    event.stopPropagation()
    const document = exportCanvas(meta.id)

    if (document) {
      downloadCanvas(document)
    }
  }

  return (
    <article className="home-card" onClick={() => loadCanvas(meta.id)}>
      <MiniMap blockTypes={meta.blockTypes} blockCount={meta.blockCount} />
      <div className="home-card-body">
        <div>
          <h2>{meta.name}</h2>
          <p>更新于 {formatDate(meta.updatedAt)}</p>
        </div>
        <strong>{meta.blockCount} 个块</strong>
      </div>
      <TypeSummary blockTypes={meta.blockTypes} />
      <div className="home-card-actions">
        <button type="button" onClick={handleRename}>
          重命名
        </button>
        <button type="button" onClick={handleExport}>
          导出
        </button>
        <button type="button" className="home-danger" onClick={handleDelete}>
          删除
        </button>
      </div>
    </article>
  )
}

const HomePage: React.FC = () => {
  const canvasMetas = useCanvasStore((state) => state.canvasMetas)
  const createCanvas = useCanvasStore((state) => state.createCanvas)
  const importCanvas = useCanvasStore((state) => state.importCanvas)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const totalBlocks = canvasMetas.reduce((sum, meta) => sum + meta.blockCount, 0)

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importCanvas(JSON.parse(String(reader.result)))

        if (!result.ok) {
          setMessage(result.error)
        }
      } catch {
        setMessage('导入失败：JSON 文件无法解析。')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return (
    <main className="home-page">
      <nav className="home-nav" aria-label="TreeWorld home">
        <div className="home-brand">
          <span className="home-brand-mark">01</span>
          <span>TreeWorld</span>
        </div>
        <div className="home-nav-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            导入 JSON
          </button>
          <button type="button" className="home-primary" onClick={() => createCanvas()}>
            新建画布
          </button>
        </div>
      </nav>
      <section className="home-hero">
        <div>
          <p className="home-kicker">MIRO-LIKE AGENT CANVAS</p>
          <h1>TreeWorld 画布</h1>
          <p className="home-subtitle">
            在浅色网格画板上和 Agent 一起整理想法。画布保持现代、轻盈、像 Miro 一样开阔；纸页、便签、HTML 原型和对讲机聊天框保留可触摸的 TreeWorld 气质。
          </p>
          <div className="home-stats" aria-label="Canvas summary">
            <span>{canvasMetas.length} 个画布</span>
            <span>{totalBlocks} 个块</span>
            <span>Local autosave</span>
          </div>
        </div>
        <div className="home-board-preview" aria-hidden="true">
          <span className="home-preview-note home-preview-yellow">Idea note</span>
          <span className="home-preview-note home-preview-coral">MD</span>
          <span className="home-preview-note home-preview-teal">SVG</span>
          <span className="home-preview-line" />
          <span className="home-preview-card">HTML 原型</span>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImport} />
      </section>

      {message && (
        <button type="button" className="home-message" onClick={() => setMessage('')}>
          {message}
        </button>
      )}

      {canvasMetas.length === 0 ? (
        <section className="home-empty">
          <h2>还没有画布</h2>
          <p>先创建第一张画布。之后文档、便签、HTML 原型和 Agent 生成内容都会保存在这个本地工作空间里。</p>
          <button type="button" className="home-primary" onClick={() => createCanvas()}>
            创建第一张画布
          </button>
        </section>
      ) : (
        <section className="home-grid">
          {canvasMetas.map((meta) => (
            <CanvasCard key={meta.id} meta={meta} />
          ))}
        </section>
      )}
    </main>
  )
}

export default HomePage
