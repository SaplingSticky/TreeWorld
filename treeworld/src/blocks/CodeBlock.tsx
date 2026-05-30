import React, { useEffect, useMemo, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import type { Block } from '../store'
import { useCanvasStore } from '../store'
import BlockMenu from './BlockMenu'
import ResizeHandle from './ResizeHandle'
import { useBlockInteractions } from './useBlockInteractions'

// Lazy-loaded language registry
const LANGUAGE_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  js: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  ts: () => import('highlight.js/lib/languages/typescript'),
  python: () => import('highlight.js/lib/languages/python'),
  py: () => import('highlight.js/lib/languages/python'),
  css: () => import('highlight.js/lib/languages/css'),
  html: () => import('highlight.js/lib/languages/xml'),
  xml: () => import('highlight.js/lib/languages/xml'),
  json: () => import('highlight.js/lib/languages/json'),
  bash: () => import('highlight.js/lib/languages/bash'),
  sh: () => import('highlight.js/lib/languages/bash'),
  shell: () => import('highlight.js/lib/languages/bash'),
  sql: () => import('highlight.js/lib/languages/sql'),
  rust: () => import('highlight.js/lib/languages/rust'),
  go: () => import('highlight.js/lib/languages/go'),
  java: () => import('highlight.js/lib/languages/java'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  c: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  cs: () => import('highlight.js/lib/languages/csharp'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  yml: () => import('highlight.js/lib/languages/yaml'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  md: () => import('highlight.js/lib/languages/markdown'),
}

const loadedLanguages = new Set<string>()

async function ensureLanguage(lang: string): Promise<void> {
  if (loadedLanguages.has(lang) || !LANGUAGE_LOADERS[lang]) return
  const mod = await LANGUAGE_LOADERS[lang]()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hljs.registerLanguage(lang, mod.default as any)
  loadedLanguages.add(lang)
}

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
  const { titleBarMouseDown, handleResizeMouseDown, isMenuOpen, zIndex, cursor, userSelect, closeMenu } =
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
  const copyTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => { if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current) }, [])

  // Lazy-load language on demand
  useEffect(() => {
    const lang = language === 'auto' ? detectLanguage(block.content) : language
    if (lang && lang !== 'plaintext') ensureLanguage(lang)
  }, [language, block.content])

  const detectedLanguage = useMemo(() => language === 'auto' ? detectLanguage(block.content) : language, [language, block.content])
  const highlighted = useMemo(() => highlightCode(block.content, language), [block.content, language])

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
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500)
    }).catch(() => { /* clipboard permission denied or non-secure context */ })
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
