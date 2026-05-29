import React, { useEffect, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import htmlLang from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import rust from 'highlight.js/lib/languages/rust'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import type { Block } from '../store'
import { useCanvasStore } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', htmlLang)
hljs.registerLanguage('xml', htmlLang)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('cs', csharp)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)

interface CodeBlockProps {
  block: Block
}

const LANGUAGES = ['auto', 'javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'sql', 'rust', 'go', 'java', 'cpp', 'csharp', 'yaml', 'markdown', 'plaintext']

function detectLanguage(content: string): string {
  try { return hljs.highlightAuto(content.slice(0, 2000)).language || 'plaintext' } catch { return 'plaintext' }
}

function highlightCode(content: string, language: string): string {
  if (!content.trim()) return ''
  try {
    if (language === 'auto') return hljs.highlightAuto(content.slice(0, 5000)).value
    if (hljs.getLanguage(language)) return hljs.highlight(content, { language }).value
  } catch { /* fall through */ }
  return hljs.highlight(content, { language: 'plaintext' }).value
}

const CodeBlock: React.FC<CodeBlockProps> = ({ block }) => {
  const updateBlock = useCanvasStore((s) => s.updateBlock)
  const { titleBarMouseDown, handleResizeMouseDown, isMenuOpen, zIndex, cursor, closeMenu } =
    useBlockInteractions(block, { minWidth: 260, minHeight: 180 })

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(block.content)
  const [editTitle, setEditTitle] = useState(block.title)
  const [copied, setCopied] = useState(false)
  const [language, setLanguage] = useState(() => {
    if (block.title && LANGUAGES.includes(block.title.toLowerCase())) return block.title.toLowerCase()
    return 'auto'
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const detectedLanguage = language === 'auto' ? detectLanguage(block.content) : language
  const highlighted = highlightCode(block.content, language)

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus()
  }, [isEditing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (block.locked) return
    setEditContent(block.content)
    setEditTitle(block.title)
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (!block.locked) updateBlock(block.id, { content: editContent, title: editTitle || detectedLanguage })
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(block.content).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value
    setLanguage(lang)
    updateBlock(block.id, { title: lang === 'auto' ? detectLanguage(block.content) : lang })
  }

  return (
    <div
      className="physical-block code-block"
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: block.locked ? '2px solid #f97316' : '1px solid #374151',
        borderRadius: '6px',
        backgroundColor: '#1e1e2e',
        boxShadow: '0 18px 36px rgba(15, 23, 42, 0.28)',
        cursor,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex,
      }}
      onMouseDown={titleBarMouseDown}
    >
      {isMenuOpen && <BlockMenu block={block} onClose={closeMenu} />}
      <div
        className="code-block-header"
        onDoubleClick={handleDoubleClick}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #313244', backgroundColor: '#181825', flexShrink: 0, gap: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f38ba8', flexShrink: 0 }} />
          <select
            value={language}
            onChange={handleLanguageChange}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{ background: '#313244', border: '1px solid #45475a', borderRadius: '4px', color: '#cdd6f4', fontSize: '11px', padding: '2px 6px', cursor: 'pointer', outline: 'none' }}
          >
            {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{ background: copied ? '#a6e3a1' : '#313244', border: '1px solid #45475a', borderRadius: '4px', color: copied ? '#1e1e2e' : '#cdd6f4', fontSize: '11px', padding: '2px 8px', cursor: 'pointer', flexShrink: 0 }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }} onDoubleClick={handleDoubleClick}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleBlur}
            style={{ width: '100%', height: '100%', border: 'none', outline: 'none', resize: 'none', background: 'transparent', color: '#cdd6f4', fontFamily: '"JetBrains Mono", "Fira Code", Monaco, Menlo, monospace', fontSize: '13px', lineHeight: '1.6', tabSize: 2 }}
            spellCheck={false}
          />
        ) : (
          <pre style={{ margin: 0, fontFamily: '"JetBrains Mono", "Fira Code", Monaco, Menlo, monospace', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#cdd6f4' }}>
            <code dangerouslySetInnerHTML={{ __html: highlighted || '<span style="color:#6c7086">Empty code block</span>' }} />
          </pre>
        )}
      </div>
      <ResizeHandle block={block} onMouseDown={handleResizeMouseDown} color="#89b4fa" />
    </div>
  )
}

export default CodeBlock
