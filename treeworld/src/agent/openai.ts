import OpenAI from 'openai'
import { recordAgentIoLog } from './ioLog'
import { EXECUTION_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT, SYSTEM_PROMPT } from './prompt'
import { parseAgentPlan, parseAgentResponse } from './response'
import type { AgentPlan, AgentResponse, AgentSettings } from './types'

export async function askOpenAIAgent(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings
): Promise<AgentResponse> {
  const startedAt = performance.now()
  let rawOutput = ''

  if (!settings.apiKey) {
    throw new Error('请先在 Settings 中配置 OpenAI API Key。')
  }

  try {
    const apiKey = settings.provider === 'ollama' ? (settings.apiKey || 'ollama') : settings.apiKey
    const baseURL = settings.provider === 'ollama' ? (settings.baseUrl || 'http://localhost:11434/v1') : (settings.baseUrl || undefined)
    const openai = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true,
    })

    const response = await openai.chat.completions.create({
      model: settings.modelId || (settings.provider === 'ollama' ? 'llama3' : 'gpt-4.1-mini'),
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Canvas context:\n${canvasContext}\n\nUser request:\n${userInput}`,
        },
      ],
    })

    rawOutput = response.choices[0]?.message.content ?? ''

    if (!rawOutput) {
      throw new Error('OpenAI response did not contain text content.')
    }

    const parsedResponse = parseAgentResponse(rawOutput)

    recordAgentIoLog({
      status: 'success',
      provider: settings.provider,
      modelId: settings.modelId || 'gpt-4.1-mini',
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
      modelId: settings.modelId || 'gpt-4.1-mini',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      errorMessage: error instanceof Error ? error.message : 'Unknown OpenAI error.',
      durationMs: Math.round(performance.now() - startedAt),
    })

    throw error
  }
}

function buildPlanUserContent(userInput: string, canvasContext: string, currentPlan?: AgentPlan): string {
  return [
    `Canvas context:\n${canvasContext}`,
    currentPlan ? `Current plan to revise:\n${JSON.stringify(currentPlan, null, 2)}` : '',
    `User request:\n${userInput}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function requestOpenAIText(systemPrompt: string, userContent: string, settings: AgentSettings): Promise<string> {
  const apiKey = settings.provider === 'ollama' ? (settings.apiKey || 'ollama') : settings.apiKey
  const baseURL = settings.provider === 'ollama' ? (settings.baseUrl || 'http://localhost:11434/v1') : (settings.baseUrl || undefined)
  const openai = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  })

  const response = await openai.chat.completions.create({
    model: settings.modelId || (settings.provider === 'ollama' ? 'llama3' : 'gpt-4.1-mini'),
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
  })

  const rawOutput = response.choices[0]?.message.content ?? ''

  if (!rawOutput) {
    throw new Error('OpenAI response did not contain text content.')
  }

  return rawOutput
}

export async function askOpenAIPlan(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings,
  currentPlan?: AgentPlan
): Promise<AgentPlan> {
  const startedAt = performance.now()
  let rawOutput = ''

  if (!settings.apiKey) {
    throw new Error('请先在 Settings 中配置 OpenAI API Key。')
  }

  try {
    rawOutput = await requestOpenAIText(PLAN_SYSTEM_PROMPT, buildPlanUserContent(userInput, canvasContext, currentPlan), settings)
    const parsedResponse = parseAgentPlan(rawOutput)

    recordAgentIoLog({
      status: 'success',
      provider: settings.provider,
      modelId: settings.modelId || 'gpt-4.1-mini',
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
      modelId: settings.modelId || 'gpt-4.1-mini',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      errorMessage: error instanceof Error ? error.message : 'Unknown OpenAI error.',
      durationMs: Math.round(performance.now() - startedAt),
    })

    throw error
  }
}

export async function executeOpenAIPlan(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings,
  plan: AgentPlan
): Promise<AgentResponse> {
  const startedAt = performance.now()
  let rawOutput = ''

  if (!settings.apiKey) {
    throw new Error('请先在 Settings 中配置 OpenAI API Key。')
  }

  try {
    rawOutput = await requestOpenAIText(
      EXECUTION_SYSTEM_PROMPT,
      `Canvas context:\n${canvasContext}\n\nOriginal user request:\n${userInput}\n\nConfirmed plan:\n${JSON.stringify(plan, null, 2)}`,
      settings
    )
    const parsedResponse = parseAgentResponse(rawOutput)

    recordAgentIoLog({
      status: 'success',
      provider: settings.provider,
      modelId: settings.modelId || 'gpt-4.1-mini',
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
      modelId: settings.modelId || 'gpt-4.1-mini',
      baseUrl: settings.baseUrl,
      hasApiKey: Boolean(settings.apiKey),
      userInput,
      canvasContext,
      rawOutput,
      errorMessage: error instanceof Error ? error.message : 'Unknown OpenAI error.',
      durationMs: Math.round(performance.now() - startedAt),
    })

    throw error
  }
}
