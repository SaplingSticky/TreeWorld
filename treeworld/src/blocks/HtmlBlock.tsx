import React, { useEffect, useRef, useState } from 'react'
import type { Block } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

interface HtmlBlockProps {
  block: Block
}

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob: https:",
  "font-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
].join('; ')

function buildSrcDoc(content: string): string {
  const trimmedContent = content.trim().replace(/CRT HTML/gi, 'HTML')
  const html = trimmedContent || '<main style="font-family: system-ui; padding: 16px;">Empty HTML block</main>'
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${cspMeta}`)
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${cspMeta}</head>`)
  }

  return `<!doctype html><html><head>${cspMeta}</head><body>${html}</body></html>`
}

const HtmlBlock: React.FC<HtmlBlockProps> = ({ block }) => {
  const { titleBarMouseDown, handleResizeMouseDown, isMenuOpen, zIndex, cursor, closeMenu } =
    useBlockInteractions(block, { minWidth: 280, minHeight: 220 })

  const [reloadToken, setReloadToken] = useState(0)
  const hasLoaded = useRef(false)
  const displayTitle = (block.title || 'HTML').replace(/CRT\s+HTML/gi, 'HTML')

  useEffect(() => {
    hasLoaded.current = false
    const timeout = window.setTimeout(() => {
      if (!hasLoaded.current) {
        setReloadToken((token) => token + 1)
      }
    }, 5000)

    return () => window.clearTimeout(timeout)
  }, [block.content, reloadToken])

  return (
    <div
      className="physical-block html-device-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '18px solid #F0EBE0',
        borderRadius: '18px',
        backgroundColor: '#F0EBE0',
        boxShadow: '0 26px 48px rgba(43, 35, 24, 0.34)',
        cursor,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex,
      }}
      onMouseDown={titleBarMouseDown}
    >
      <div
        className="html-device-title"
        style={{
          borderBottom: '0',
          color: '#7A7060',
          flex: '0 0 auto',
          fontSize: '12px',
          fontWeight: 800,
          overflow: 'hidden',
          padding: '4px 88px 8px 10px',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayTitle}
      </div>
      <div className="html-device-body">
        <iframe
          key={`${block.id}-${reloadToken}`}
          onLoad={() => { hasLoaded.current = true }}
          sandbox="allow-scripts"
          srcDoc={buildSrcDoc(block.content)}
          style={{ border: 'none', flex: 1, minWidth: 0, width: '100%', backgroundColor: '#ffffff' }}
          title={displayTitle || 'HTML block'}
        />
        <div aria-hidden className="html-device-controls">
          <span className="html-device-speaker" />
          <span className="html-device-knob html-device-knob-large" />
          <span className="html-device-slider" />
          <span className="html-device-slider" />
          <span className="html-device-knob" />
          <span className="html-device-vents" />
        </div>
      </div>
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#8a8070" size={20} right="6px" bottom="6px" />
    </div>
  )
}

export default HtmlBlock
