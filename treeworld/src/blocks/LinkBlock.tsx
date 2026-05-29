import React, { useState } from 'react'
import type { Block } from '../store'
import { useCanvasStore } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

interface LinkBlockProps {
  block: Block
}

function extractUrl(content: string): string {
  try {
    const parsed = JSON.parse(content) as { url?: string }
    if (typeof parsed.url === 'string') return parsed.url
  } catch { /* fall through */ }

  const trimmed = content.trim()
  if (/^https?:\/\//.test(trimmed)) return trimmed
  return ''
}

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url || 'No URL' }
}

const LinkBlock: React.FC<LinkBlockProps> = ({ block }) => {
  const updateBlock = useCanvasStore((s) => s.updateBlock)
  const { titleBarMouseDown, handleResizeMouseDown, isMenuOpen, zIndex, cursor, userSelect, closeMenu } =
    useBlockInteractions(block, { minWidth: 300, minHeight: 200 })

  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [editUrl, setEditUrl] = useState('')

  const url = extractUrl(block.content)
  const domain = getDomain(url)

  const handleUrlSubmit = () => {
    setIsEditingUrl(false)
    let finalUrl = editUrl.trim()
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }
    if (finalUrl) {
      updateBlock(block.id, { content: finalUrl, title: getDomain(finalUrl) })
    }
  }

  return (
    <div
      className="physical-block link-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '1px solid #93c5fd',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.1)',
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
        className="link-block-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          borderBottom: '1px solid #dbeafe',
          backgroundColor: '#eff6ff',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#6b7280', flexShrink: 0 }}>🔗</span>
        {isEditingUrl ? (
          <input
            autoFocus
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            onBlur={handleUrlSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit()
              if (e.key === 'Escape') setIsEditingUrl(false)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            placeholder="https://example.com"
            style={{ flex: 1, border: '1px solid #93c5fd', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', outline: 'none', minWidth: 0 }}
          />
        ) : (
          <span
            style={{ fontSize: '12px', color: '#1d4ed8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, cursor: 'text' }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditUrl(url)
              setIsEditingUrl(true)
            }}
          >
            {url || 'Double-click to set URL'}
          </span>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{ fontSize: '11px', color: '#6b7280', textDecoration: 'none', flexShrink: 0 }}
          >
            ↗
          </a>
        )}
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {url ? (
          <iframe
            src={url}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            style={{ border: 'none', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            title={domain}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>
            Double-click the URL above to set a link
          </div>
        )}
      </div>
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#93c5fd" />
    </div>
  )
}

export default LinkBlock
