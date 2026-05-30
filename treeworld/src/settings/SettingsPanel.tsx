import React, { useEffect, useRef, useState } from 'react'
import type { AgentProvider } from '../agent/types'
import { clearAgentIoLogs, getAgentIoLogs } from '../agent/ioLog'
import type { AgentIoLogEntry } from '../agent/ioLog'
import { useCanvasStore } from '../store'
import type { CanvasTheme } from '../store'

interface SettingsPanelProps {
  onClose: () => void
}

type SettingsTab = 'api' | 'canvas' | 'shortcuts' | 'logs'

const DEFAULT_MODELS: Record<AgentProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4.1-mini',
  ollama: 'llama3',
}

const THEME_LABELS: Record<CanvasTheme, string> = {
  cork: '软木',
  leather: '深色皮革',
  linen: '浅色亚麻',
}

const TAB_DEFINITIONS: Array<{ key: SettingsTab; label: string }> = [
  { key: 'api', label: 'API 配置' },
  { key: 'canvas', label: '画布' },
  { key: 'shortcuts', label: '快捷键' },
  { key: 'logs', label: '日志' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  color: '#111827',
  fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
  fontSize: '13px',
  outline: 'none',
  padding: '10px 12px',
}

const labelStyle: React.CSSProperties = {
  color: '#374151',
  display: 'block',
  fontSize: '13px',
  fontWeight: 700,
  marginBottom: '6px',
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const {
    agentApiKey,
    agentBaseUrl,
    agentModelId,
    agentProvider,
    agentSearchApiKey,
    canvasTheme,
    setAgentSettings,
    setCanvasTheme,
  } = useCanvasStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('api')
  const [draftProvider, setDraftProvider] = useState<AgentProvider>(agentProvider)
  const [draftApiKey, setDraftApiKey] = useState(agentApiKey)
  const [draftBaseUrl, setDraftBaseUrl] = useState(agentBaseUrl)
  const [draftModelId, setDraftModelId] = useState(agentModelId || DEFAULT_MODELS[agentProvider])
  const [draftSearchApiKey, setDraftSearchApiKey] = useState(agentSearchApiKey)
  const [draftCanvasTheme, setDraftCanvasTheme] = useState<CanvasTheme>(canvasTheme)
  const [savedMessage, setSavedMessage] = useState('')
  const saveTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current) }, [])
  const [logEntries, setLogEntries] = useState<AgentIoLogEntry[]>(() => getAgentIoLogs())
  const providerLabel = draftProvider === 'anthropic' ? 'Anthropic' : draftProvider === 'ollama' ? 'Ollama' : 'OpenAI'

  const refreshLogs = () => setLogEntries(getAgentIoLogs())
  const handleClearLogs = () => {
    clearAgentIoLogs()
    setLogEntries([])
  }

  const save = () => {
    setAgentSettings({
      provider: draftProvider,
      apiKey: draftApiKey,
      baseUrl: draftBaseUrl,
      modelId: draftModelId,
      searchApiKey: draftSearchApiKey,
    })
    setCanvasTheme(draftCanvasTheme)
    setSavedMessage(draftApiKey.trim() ? '已保存' : '已清空')
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => setSavedMessage(''), 2000)
  }

  const clear = () => {
    setDraftApiKey('')
    setDraftBaseUrl('')
    setDraftSearchApiKey('')
    setAgentSettings({
      provider: draftProvider,
      apiKey: '',
      baseUrl: '',
      modelId: draftModelId,
      searchApiKey: '',
    })
    setSavedMessage('已清空')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') onClose()
  }

  const renderApiTab = () => (
    <>
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>模型供应商</label>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', overflow: 'hidden' }}>
          {(['anthropic', 'openai', 'ollama'] as AgentProvider[]).map((provider) => (
            <button
              key={provider}
              onClick={() => {
                setDraftProvider(provider)
                if (provider === 'ollama' && !draftBaseUrl.trim()) {
                  setDraftBaseUrl('http://localhost:11434/v1')
                }
                setDraftModelId((current) => {
                  const trimmed = current.trim()
                  if (!trimmed || Object.values(DEFAULT_MODELS).includes(trimmed)) return DEFAULT_MODELS[provider]
                  return current
                })
                setSavedMessage('')
              }}
              style={{
                border: 'none',
                borderRight: provider !== 'ollama' ? '1px solid #cbd5e1' : 'none',
                backgroundColor: draftProvider === provider ? '#111827' : '#ffffff',
                color: draftProvider === provider ? '#ffffff' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                padding: '10px 12px',
              }}
            >
              {provider === 'anthropic' ? 'Anthropic' : provider === 'ollama' ? 'Ollama' : 'OpenAI'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>{providerLabel} API Key</label>
        <input value={draftApiKey} onChange={(e) => { setDraftApiKey(e.target.value); setSavedMessage('') }} onKeyDown={handleKeyDown} placeholder={draftProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'} spellCheck={false} style={inputStyle} type="password" />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>模型 ID</label>
        <input value={draftModelId} onChange={(e) => { setDraftModelId(e.target.value); setSavedMessage('') }} onKeyDown={handleKeyDown} placeholder={DEFAULT_MODELS[draftProvider]} spellCheck={false} style={inputStyle} type="text" />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Base URL</label>
        <input value={draftBaseUrl} onChange={(e) => { setDraftBaseUrl(e.target.value); setSavedMessage('') }} onKeyDown={handleKeyDown} placeholder={draftProvider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'} spellCheck={false} style={inputStyle} type="url" />
        <p style={{ color: '#9ca3af', fontSize: '11px', margin: '6px 0 0' }}>留空使用默认地址。Ollama 默认 http://localhost:11434/v1</p>
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Tavily 搜索 API Key</label>
        <input value={draftSearchApiKey} onChange={(e) => { setDraftSearchApiKey(e.target.value); setSavedMessage('') }} onKeyDown={handleKeyDown} placeholder="tvly-..." spellCheck={false} style={inputStyle} type="password" />
        <p style={{ color: '#9ca3af', fontSize: '11px', margin: '6px 0 0' }}>可选。配置后 Agent 会在需要时自动搜索网络。</p>
      </div>
    </>
  )

  const renderCanvasTab = () => (
    <div>
      <label style={labelStyle}>画布材质</label>
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', overflow: 'hidden' }}>
        {(['cork', 'leather', 'linen'] as CanvasTheme[]).map((theme) => (
          <button
            key={theme}
            onClick={() => { setDraftCanvasTheme(theme); setSavedMessage('') }}
            style={{
              border: 'none',
              borderRight: theme === 'linen' ? 'none' : '1px solid #cbd5e1',
              backgroundColor: draftCanvasTheme === theme ? '#111827' : '#ffffff',
              color: draftCanvasTheme === theme ? '#ffffff' : '#374151',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              padding: '10px 8px',
            }}
            type="button"
          >
            {THEME_LABELS[theme]}
          </button>
        ))}
      </div>
    </div>
  )

  const renderShortcutsTab = () => (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', fontSize: '12px', color: '#4b5563', lineHeight: 2.2 }}>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>Cmd+K</kbd> 或 <kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>/</kbd> — 唤起 Agent 对话</div>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>Cmd+Z</kbd> — 撤销</div>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>Cmd+Shift+Z</kbd> — 重做</div>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>Cmd+0</kbd> — 缩放到全局视图</div>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>Cmd+1</kbd> — 缩放到 100%</div>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>Cmd+F</kbd> — 搜索块</div>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>Alt+拖拽</kbd> — 平移画布</div>
      <div><kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>滚轮</kbd> — 缩放画布</div>
      <div>点击块标题栏 — 打开块操作菜单</div>
      <div>双击块内容 — 编辑块内容</div>
    </div>
  )

  const renderLogsTab = () => (
    <div>
      {logEntries.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>暂无日志记录</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>最近 {logEntries.length} 条记录</span>
            <button
              type="button"
              onClick={handleClearLogs}
              style={{ border: '1px solid #fecaca', borderRadius: '4px', backgroundColor: '#fff1f2', color: '#be123c', cursor: 'pointer', fontSize: '11px', padding: '4px 8px' }}
            >
              清空日志
            </button>
          </div>
          <div style={{ maxHeight: '320px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
            {logEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '11px',
                  fontFamily: 'Monaco, Menlo, monospace',
                  color: entry.status === 'error' ? '#be123c' : '#374151',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 700 }}>
                    {entry.status === 'error' ? '❌' : '✅'} {entry.provider}/{entry.modelId}
                  </span>
                  <span style={{ color: '#9ca3af' }}>{entry.durationMs}ms</span>
                </div>
                <div style={{ color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.userInput.slice(0, 80)}
                </div>
                {entry.errorMessage && (
                  <div style={{ color: '#be123c', marginTop: '2px' }}>{entry.errorMessage.slice(0, 120)}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  const tabContent: Record<SettingsTab, () => React.ReactNode> = {
    api: renderApiTab,
    canvas: renderCanvasTab,
    shortcuts: renderShortcutsTab,
    logs: renderLogsTab,
  }

  return (
    <div
      className="settings-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        backgroundColor: 'rgba(15, 23, 42, 0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onMouseDown={onClose}
    >
      <section
        className="settings-paper"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          border: '1px solid #d1d5db',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(640px, 85vh)',
        }}
      >
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <h2 style={{ color: '#111827', fontSize: '16px', lineHeight: 1.2, margin: 0 }}>设置</h2>
          <button
            aria-label="关闭设置"
            onClick={onClose}
            style={{ width: '28px', height: '28px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', color: '#374151', cursor: 'pointer', fontSize: '16px', lineHeight: 1, display: 'grid', placeItems: 'center' }}
          >
            ×
          </button>
        </header>

        {/* Tabs */}
        <nav style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          {TAB_DEFINITIONS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                if (tab.key === 'logs') refreshLogs()
              }}
              style={{
                flex: 1,
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #111827' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.key ? '#111827' : '#6b7280',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 700 : 500,
                padding: '10px 8px',
                transition: 'color 0.1s, border-color 0.1s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
          {tabContent[activeTab]()}
        </div>

        {/* Footer */}
        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <button
            onClick={clear}
            style={{ border: '1px solid #fecaca', borderRadius: '6px', backgroundColor: '#fff1f2', color: '#be123c', cursor: 'pointer', fontSize: '13px', fontWeight: 700, padding: '7px 12px' }}
          >
            清空 API
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {savedMessage && <span style={{ color: '#047857', fontSize: '13px', fontWeight: 700 }}>{savedMessage}</span>}
            <button
              onClick={save}
              style={{ border: 'none', borderRadius: '6px', backgroundColor: '#111827', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 700, padding: '8px 16px' }}
            >
              保存
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default SettingsPanel
