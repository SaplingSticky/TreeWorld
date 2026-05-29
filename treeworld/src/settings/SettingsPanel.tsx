import React, { useState } from 'react'
import type { AgentProvider } from '../agent/types'
import { useCanvasStore } from '../store'
import type { CanvasTheme } from '../store'

interface SettingsPanelProps {
  onClose: () => void
}

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
  const [draftProvider, setDraftProvider] = useState<AgentProvider>(agentProvider)
  const [draftApiKey, setDraftApiKey] = useState(agentApiKey)
  const [draftBaseUrl, setDraftBaseUrl] = useState(agentBaseUrl)
  const [draftModelId, setDraftModelId] = useState(agentModelId || DEFAULT_MODELS[agentProvider])
  const [draftSearchApiKey, setDraftSearchApiKey] = useState(agentSearchApiKey)
  const [draftCanvasTheme, setDraftCanvasTheme] = useState<CanvasTheme>(canvasTheme)
  const [savedMessage, setSavedMessage] = useState('')
  const providerLabel = draftProvider === 'anthropic' ? 'Anthropic' : draftProvider === 'ollama' ? 'Ollama' : 'OpenAI'

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
          width: 'min(560px, 100%)',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.22)',
          overflow: 'hidden',
        }}
      >
        <header
          className="settings-paper-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
            padding: '16px 18px',
          }}
        >
          <div>
            <h2
              className="settings-title"
              style={{
                color: '#111827',
                fontSize: '18px',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              工作台设置
            </h2>
            <div
              className="settings-status"
              style={{
                color: agentApiKey ? '#047857' : '#b45309',
                fontSize: '13px',
                marginTop: '6px',
              }}
            >
              {agentProvider === 'anthropic' ? 'Anthropic' : agentProvider === 'ollama' ? 'Ollama' : 'OpenAI'} API Key{' '}
              {agentProvider === 'ollama' ? (agentApiKey ? '已配置' : '可选（Ollama 默认不需要') : (agentApiKey ? '已配置' : '未配置')}
            </div>
          </div>
          <button
            className="settings-close"
            aria-label="关闭设置"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>

        <div style={{ padding: '18px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                color: '#374151',
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              模型供应商
            </label>
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                overflow: 'hidden',
              }}
            >
              {(['anthropic', 'openai', 'ollama'] as AgentProvider[]).map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    setDraftProvider(provider)
                    if (provider === 'ollama' && !draftBaseUrl.trim()) {
                      setDraftBaseUrl('http://localhost:11434/v1')
                    }
                    setDraftModelId((currentModelId) => {
                      const trimmedModelId = currentModelId.trim()

                      if (!trimmedModelId || Object.values(DEFAULT_MODELS).includes(trimmedModelId)) {
                        return DEFAULT_MODELS[provider]
                      }

                      return currentModelId
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
          <label
            style={{
              color: '#374151',
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '8px',
            }}
          >
            {providerLabel} API Key
          </label>
          <input
            autoFocus
            value={draftApiKey}
            onChange={(e) => {
              setDraftApiKey(e.target.value)
              setSavedMessage('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                save()
              }

              if (e.key === 'Escape') {
                onClose()
              }
            }}
            placeholder={draftProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
            spellCheck={false}
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#111827',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              outline: 'none',
              padding: '12px',
            }}
            type="password"
          />
          <label
            style={{
              color: '#374151',
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '8px',
              marginTop: '16px',
            }}
          >
            模型 ID
          </label>
          <input
            value={draftModelId}
            onChange={(e) => {
              setDraftModelId(e.target.value)
              setSavedMessage('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                save()
              }

              if (e.key === 'Escape') {
                onClose()
              }
            }}
            placeholder={DEFAULT_MODELS[draftProvider]}
            spellCheck={false}
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#111827',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              outline: 'none',
              padding: '12px',
            }}
            type="text"
          />
          <label
            style={{
              color: '#374151',
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '8px',
              marginTop: '16px',
            }}
          >
            Base URL
          </label>
          <input
            value={draftBaseUrl}
            onChange={(e) => {
              setDraftBaseUrl(e.target.value)
              setSavedMessage('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                save()
              }

              if (e.key === 'Escape') {
                onClose()
              }
            }}
            placeholder={
              draftProvider === 'anthropic'
                ? 'https://api.anthropic.com'
                : 'https://api.openai.com/v1'
            }
            spellCheck={false}
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#111827',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              outline: 'none',
              padding: '12px',
            }}
            type="url"
          />
          <p
            style={{
              color: '#6b7280',
              fontSize: '12px',
              lineHeight: 1.5,
              margin: '10px 0 0',
            }}
          >
            设置只保存在当前浏览器。Base URL 留空会使用供应商默认地址，也可以填入兼容 OpenAI 的自定义端点。Ollama 默认地址为 http://localhost:11434/v1。
          </p>
          <label
            style={{
              color: '#374151',
              display: 'block',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '8px',
              marginTop: '16px',
            }}
          >
            Tavily 搜索 API Key
          </label>
          <input
            value={draftSearchApiKey}
            onChange={(e) => {
              setDraftSearchApiKey(e.target.value)
              setSavedMessage('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                save()
              }

              if (e.key === 'Escape') {
                onClose()
              }
            }}
            placeholder="tvly-..."
            spellCheck={false}
            style={{
              width: '100%',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#111827',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              outline: 'none',
              padding: '12px',
            }}
            type="password"
          />
          <p
            style={{
              color: '#6b7280',
              fontSize: '12px',
              lineHeight: 1.5,
              margin: '10px 0 0',
            }}
          >
            可选。配置后，Agent 会在研究、实时事实、来源链接、价格、新闻和趋势类请求前先检索网络。
          </p>

          <div style={{ marginTop: '16px' }}>
            <label
              style={{
                color: '#374151',
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              画布材质
            </label>
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                overflow: 'hidden',
              }}
            >
              {(['cork', 'leather', 'linen'] as CanvasTheme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => {
                    setDraftCanvasTheme(theme)
                    setSavedMessage('')
                  }}
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


          <div style={{ marginTop: '16px' }}>
            <label
              style={{
                color: '#374151',
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px',
              }}
            >
              快捷键
            </label>
            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#4b5563',
                lineHeight: 2,
              }}
            >
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
          </div>

          <footer
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '18px',
            }}
          >
            <button
              onClick={clear}
              style={{
                border: '1px solid #fecaca',
                borderRadius: '8px',
                backgroundColor: '#fff1f2',
                color: '#be123c',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                padding: '9px 12px',
              }}
            >
              清空
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {savedMessage && (
                <span style={{ color: '#047857', fontSize: '13px', fontWeight: 700 }}>
                  {savedMessage}
                </span>
              )}
              <button
                onClick={save}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#111827',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  padding: '10px 16px',
                }}
              >
                保存
              </button>
            </div>
          </footer>
        </div>
      </section>
    </div>
  )
}

export default SettingsPanel
