import React, { useMemo } from 'react'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

interface SvgBlockProps {
  block: Block
}

function sanitizeSvg(content: string): string {
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    return ''
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(trimmedContent, 'image/svg+xml')
  const parserError = document.querySelector('parsererror')
  const svg = document.querySelector('svg')

  if (parserError || !svg) {
    return ''
  }

  document.querySelectorAll('script, foreignObject, iframe, object, embed, link, meta').forEach((node) => {
    node.remove()
  })

  document.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      const isExternalReference =
        (name === 'href' || name === 'xlink:href' || name.endsWith(':href')) &&
        (value.startsWith('http:') || value.startsWith('https:') || value.startsWith('javascript:'))

      if (name.startsWith('on') || isExternalReference) {
        node.removeAttribute(attribute.name)
      }
    })
  })

  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid meet')

  return new XMLSerializer().serializeToString(svg)
}

const SvgBlock: React.FC<SvgBlockProps> = ({ block }) => {
  const { titleBarMouseDown, handleResizeMouseDown, isMenuOpen, zIndex, cursor, closeMenu } =
    useBlockInteractions(block, { minWidth: 260, minHeight: 200 })

  const sanitizedSvg = useMemo(() => sanitizeSvg(block.content), [block.content])

  return (
    <div
      className="physical-block svg-whiteboard-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '1px solid #d8d8d8',
        borderRadius: '4px',
        backgroundColor: '#FAFAFA',
        boxShadow: '0 18px 36px rgba(15, 23, 42, 0.13)',
        cursor,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex,
      }}
      onMouseDown={titleBarMouseDown}
    >
      <div
        className="svg-whiteboard-title"
        style={{
          borderBottom: '1px solid #e5e7eb',
          color: '#4b5563',
          flex: '0 0 auto',
          fontSize: '12px',
          fontWeight: 800,
          overflow: 'hidden',
          padding: '8px 40px 8px 18px',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {block.title || 'SVG'}
      </div>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
          minHeight: 0,
          padding: '14px',
        }}
      >
        {sanitizedSvg ? (
          <div
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div style={{ color: '#9f1239', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>
            Invalid SVG content
          </div>
        )}
      </div>
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#3a62a0" size={20} />
    </div>
  )
}

export default SvgBlock
