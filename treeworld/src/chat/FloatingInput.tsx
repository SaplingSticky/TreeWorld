import React, { useCallback, useEffect, useRef, useState } from 'react'
import { buildCanvasContext, executeCommands } from '../agent/commands'
import { recordAgentIoLog } from '../agent/ioLog'
import { askAgentPlan, executeAgentPlan } from '../agent/provider'
import { formatSearchContext, searchWeb } from '../agent/search'
import { markNeedsLayoutResolve, useCanvasStore } from '../store'
import type { AgentPlan, AgentSettings } from '../agent/types'

type ChatRole = 'user' | 'ai'
const CHAT_FADE_DELAY_MS = 4200
const CHAT_HIDE_DELAY_MS = 5600

type ChatMessage =
  | {
      id: string
      role: ChatRole
      kind: 'text'
      text: string
    }
  | {
      id: string
      role: 'ai'
      kind: 'plan'
      plan: AgentPlan
      hasSearchContext: boolean
    }

function isConfirmPrompt(prompt: string): boolean {
  return ['确认', '确认执行', '执行', 'ok', 'okay', 'yes', 'confirm'].includes(prompt.trim().toLowerCase())
}

function createTextMessage(role: ChatRole, text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    kind: 'text',
    text,
  }
}

function createPlanMessage(plan: AgentPlan, hasSearchContext: boolean): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'ai',
    kind: 'plan',
    plan,
    hasSearchContext,
  }
}

const FloatingInput: React.FC = () => {
  const store = useCanvasStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isFading, setIsFading] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activityTick, setActivityTick] = useState(0)
  const [pendingPlan, setPendingPlan] = useState<{ userInput: string; plan: AgentPlan; searchContext: string } | null>(
    null
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const appendMessage = (message: ChatMessage) => {
    setMessages((currentMessages) => [...currentMessages, message])
  }

  const wakeChat = useCallback(() => {
    setIsOpen(true)
    setIsFading(false)
    setActivityTick((currentTick) => currentTick + 1)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      const isAgentShortcut =
        (!isTypingTarget && (e.key === '/' || e.code === 'Slash')) ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setIsFading(false)
        return
      }

      if (isAgentShortcut) {
        e.preventDefault()
        wakeChat()
        return
      }

      if (isOpen) {
        setIsFading(false)
        setActivityTick((currentTick) => currentTick + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, wakeChat])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, store.agentStatusText, store.isAgentThinking])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    if (store.isAgentThinking || pendingPlan || input.trim()) {
      return undefined
    }

    const fadeTimer = window.setTimeout(() => setIsFading(true), CHAT_FADE_DELAY_MS)
    const hideTimer = window.setTimeout(() => {
      setIsOpen(false)
      setIsFading(false)
    }, CHAT_HIDE_DELAY_MS)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(hideTimer)
    }
  }, [activityTick, input, isOpen, messages.length, pendingPlan, store.isAgentThinking])

  const getAgentSettings = (): AgentSettings => ({
    provider: useCanvasStore.getState().agentProvider,
    apiKey: useCanvasStore.getState().agentApiKey,
    baseUrl: useCanvasStore.getState().agentBaseUrl,
    modelId: useCanvasStore.getState().agentModelId,
    searchApiKey: useCanvasStore.getState().agentSearchApiKey,
  })

  const ensureApiKey = (prompt: string, canvasContext: string) => {
    const settings = getAgentSettings()

    if (!settings.apiKey) {
      recordAgentIoLog({
        status: 'error',
        provider: settings.provider,
        modelId: settings.modelId,
        baseUrl: settings.baseUrl,
        hasApiKey: false,
        userInput: prompt,
        canvasContext,
        errorMessage: '请先在 Settings 中配置 API Key。',
        durationMs: 0,
      })

      throw new Error('请先在 Settings 中配置 API Key。')
    }

    return settings
  }

  const buildContextWithSearch = async (
    prompt: string,
    settings: AgentSettings,
    existingSearchContext = ''
  ): Promise<{ canvasContext: string; searchContext: string }> => {
    const state = useCanvasStore.getState()
    const baseCanvasContext = buildCanvasContext(state.blocks, state.camera)

    if (existingSearchContext) {
      return {
        canvasContext: `${baseCanvasContext}\n\n${existingSearchContext}`,
        searchContext: existingSearchContext,
      }
    }

    useCanvasStore.getState().setAgentStatusText('Agent 正在搜索...')
    const searchContext = formatSearchContext(await searchWeb(prompt, settings.searchApiKey))

    return {
      canvasContext: searchContext ? `${baseCanvasContext}\n\n${searchContext}` : baseCanvasContext,
      searchContext,
    }
  }

  const confirmPlan = async (appendUserConfirmation: boolean) => {
    if (!pendingPlan || useCanvasStore.getState().isAgentThinking) {
      return
    }

    if (appendUserConfirmation) {
      appendMessage(createTextMessage('user', '确认执行'))
    }

    wakeChat()
    useCanvasStore.getState().setAgentThinking(true)

    try {
      const execState = useCanvasStore.getState()
      const baseCanvasContext = buildCanvasContext(execState.blocks, execState.camera)
      const settings = ensureApiKey(pendingPlan.userInput, baseCanvasContext)
      const canvasContext = pendingPlan.searchContext
        ? `${baseCanvasContext}\n\n${pendingPlan.searchContext}`
        : baseCanvasContext
      useCanvasStore.getState().setAgentStatusText('Agent 正在生成画布...')
      const response = await executeAgentPlan(pendingPlan.userInput, canvasContext, settings, pendingPlan.plan)

      markNeedsLayoutResolve()
      executeCommands(response, useCanvasStore.getState())
      setPendingPlan(null)
      appendMessage(createTextMessage('ai', response.message))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent request failed.'
      appendMessage(createTextMessage('ai', message))
    } finally {
      useCanvasStore.getState().setAgentStatusText('Agent 思考中...')
      useCanvasStore.getState().setAgentThinking(false)
    }
  }

  const submit = async () => {
    const prompt = input.trim()

    if (!prompt || store.isAgentThinking) {
      return
    }

    setInput('')
    wakeChat()
    appendMessage(createTextMessage('user', prompt))

    if (pendingPlan && isConfirmPrompt(prompt)) {
      await confirmPlan(false)
      return
    }

    useCanvasStore.getState().setAgentThinking(true)

    try {
      const submitState = useCanvasStore.getState()
      const baseCanvasContext = buildCanvasContext(submitState.blocks, submitState.camera)
      const settings = ensureApiKey(prompt, baseCanvasContext)
      const { canvasContext, searchContext } = await buildContextWithSearch(prompt, settings, pendingPlan?.searchContext)
      useCanvasStore.getState().setAgentStatusText('Agent 正在规划...')
      const plan = await askAgentPlan(prompt, canvasContext, settings, pendingPlan?.plan)
      const nextPendingPlan = {
        userInput: pendingPlan ? `${pendingPlan.userInput}\nRevision: ${prompt}` : prompt,
        searchContext: searchContext || pendingPlan?.searchContext || '',
        plan,
      }

      setPendingPlan(nextPendingPlan)
      appendMessage(createPlanMessage(plan, Boolean(nextPendingPlan.searchContext)))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent request failed.'
      appendMessage(createTextMessage('ai', message))
    } finally {
      useCanvasStore.getState().setAgentStatusText('Agent 思考中...')
      useCanvasStore.getState().setAgentThinking(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className={`agent-chat-shell${isFading ? ' agent-chat-shell-fading' : ''}`}
      aria-label="Agent chat"
      onMouseDown={wakeChat}
      onMouseMove={() => {
        if (isFading) {
          wakeChat()
        }
      }}
    >
      <div className="agent-chat-stream" aria-live="polite">
        {messages.map((message) =>
          message.kind === 'plan' ? (
            <div key={message.id} className="agent-chat-bubble agent-chat-bubble-ai agent-chat-plan">
              <strong>PLAN READY</strong>
              <h2>{message.plan.summary}</h2>
              {message.hasSearchContext && <span className="agent-chat-search-badge">已附加网页搜索结果</span>}
              <div className="agent-chat-plan-list">
                {message.plan.collections.map((collection) => (
                  <section key={`${message.id}-${collection.title}`}>
                    <h3>{collection.title}</h3>
                    {collection.blocks.map((block, index) => (
                      <p key={`${block.title}-${index}`}>
                        <b>{block.type.toUpperCase()}</b> · {block.title}
                        <span>{block.reason}</span>
                      </p>
                    ))}
                  </section>
                ))}
              </div>
              {pendingPlan?.plan === message.plan && (
                <div className="agent-chat-plan-actions">
                  <button type="button" disabled={store.isAgentThinking} onClick={() => confirmPlan(true)}>
                    确认执行
                  </button>
                  <button type="button" disabled={store.isAgentThinking} onClick={() => inputRef.current?.focus()}>
                    修改规划
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              key={message.id}
              className={`agent-chat-bubble ${
                message.role === 'user' ? 'agent-chat-bubble-user' : 'agent-chat-bubble-ai'
              }`}
            >
              <p>{message.text}</p>
            </div>
          )
        )}
        {store.isAgentThinking && (
          <div className="agent-chat-bubble agent-chat-bubble-ai agent-chat-thinking">
            <p>{store.agentStatusText || 'Agent 思考中...'}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form
        className="agent-chat-input"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
            wakeChat()
          }}
          onFocus={wakeChat}
          aria-label="Agent message"
          placeholder={pendingPlan ? '修改规划或确认...' : 'Ask Agent...'}
          disabled={store.isAgentThinking}
        />
        <button type="submit" disabled={store.isAgentThinking || input.trim().length === 0}>
          Send
        </button>
      </form>
    </div>
  )
}

export default FloatingInput
