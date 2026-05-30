import Anthropic from '@anthropic-ai/sdk'
import { recordAgentIoLog } from './ioLog'
import { buildPlanUserContent, EXECUTION_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT } from './prompt'
import { parseAgentPlan, parseAgentResponse } from './response'
import type { AgentPlan, AgentResponse, AgentSettings } from './types'

export async function askAnthropicAgent(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings
): Promise<AgentResponse> {
  const startedAt = performance.now()
  let rawOutput = ''

  if (!settings.apiKey) {
    throw new Error('请先在 Settings 中配置 Anthropic API Key。')
  }

  try {
    const anthropic = new Anthropic({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl || undefined,
      dangerouslyAllowBrowser: true,
    })

    const response = await anthropic.messages.create({
      model: settings.modelId || 'claude-sonnet-4-20250514',
      max_tokens: 1600,
      temperature: 0.2,
      system: EXECUTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Canvas context:\n${canvasContext}\n\nUser request:\n${userInput}`,
        },
      ],
    })

    rawOutput = response.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n')

    const parsedResponse = parseAgentResponse(rawOutput)

    recordAgentIoLog({
      status: 'success',
      provider: settings.provider,
      modelId: settings.modelId || 'claude-sonnet-4-20250514',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      parsedResponse,
      durationMs: Math.round(performance.now() - startedAt),
    })

    return parsedResponse
  } catch (error) {
    recordAgentIoLog({
      status: 'error',
      provider: settings.provider,
      modelId: settings.modelId || 'claude-sonnet-4-20250514',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      errorMessage: error instanceof Error ? error.message : 'Unknown Anthropic error.',
      durationMs: Math.round(performance.now() - startedAt),
    })

    throw error
  }
}

async function requestAnthropicText(systemPrompt: string, userContent: string, settings: AgentSettings): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl || undefined,
    dangerouslyAllowBrowser: true,
  })

  const response = await anthropic.messages.create({
    model: settings.modelId || 'claude-sonnet-4-20250514',
    max_tokens: 2400,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userContent,
      },
    ],
  })

  const text = response.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')

  if (!text) {
    throw new Error('Anthropic 返回了空响应（无文本内容）。请重试。')
  }

  return text
}

export async function askAnthropicPlan(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings,
  currentPlan?: AgentPlan
): Promise<AgentPlan> {
  const startedAt = performance.now()
  let rawOutput = ''

  if (!settings.apiKey) {
    throw new Error('请先在 Settings 中配置 Anthropic API Key。')
  }

  try {
    rawOutput = await requestAnthropicText(PLAN_SYSTEM_PROMPT, buildPlanUserContent(userInput, canvasContext, currentPlan), settings)
    const parsedResponse = parseAgentPlan(rawOutput)

    recordAgentIoLog({
      status: 'success',
      provider: settings.provider,
      modelId: settings.modelId || 'claude-sonnet-4-20250514',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      parsedResponse,
      durationMs: Math.round(performance.now() - startedAt),
    })

    return parsedResponse
  } catch (error) {
    recordAgentIoLog({
      status: 'error',
      provider: settings.provider,
      modelId: settings.modelId || 'claude-sonnet-4-20250514',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      errorMessage: error instanceof Error ? error.message : 'Unknown Anthropic error.',
      durationMs: Math.round(performance.now() - startedAt),
    })

    throw error
  }
}

export async function executeAnthropicPlan(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings,
  plan: AgentPlan
): Promise<AgentResponse> {
  const startedAt = performance.now()
  let rawOutput = ''

  if (!settings.apiKey) {
    throw new Error('请先在 Settings 中配置 Anthropic API Key。')
  }

  try {
    rawOutput = await requestAnthropicText(
      EXECUTION_SYSTEM_PROMPT,
      `Canvas context:\n${canvasContext}\n\nOriginal user request:\n${userInput}\n\nConfirmed plan:\n${JSON.stringify(plan, null, 2)}`,
      settings
    )
    const parsedResponse = parseAgentResponse(rawOutput)

    recordAgentIoLog({
      status: 'success',
      provider: settings.provider,
      modelId: settings.modelId || 'claude-sonnet-4-20250514',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      parsedResponse,
      durationMs: Math.round(performance.now() - startedAt),
    })

    return parsedResponse
  } catch (error) {
    recordAgentIoLog({
      status: 'error',
      provider: settings.provider,
      modelId: settings.modelId || 'claude-sonnet-4-20250514',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      errorMessage: error instanceof Error ? error.message : 'Unknown Anthropic error.',
      durationMs: Math.round(performance.now() - startedAt),
    })

    throw error
  }
}
