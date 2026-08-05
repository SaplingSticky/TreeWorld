import OpenAI from 'openai'
import { recordAgentIoLog } from './ioLog'
import { buildPlanUserContent, EXECUTION_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT } from './prompt'
import { parseAgentPlan, parseAgentResponse } from './response'
import { isAbortError, withAbortTimeout } from './timeout'
import type { AgentPlan, AgentResponse, AgentSettings } from './types'

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'
const DEFAULT_OLLAMA_MODEL = 'llama3.1'

function resolveOpenAIConfig(settings: AgentSettings): { apiKey: string; baseURL: string | undefined; modelId: string } {
  const isOllama = settings.provider === 'ollama'

  return {
    apiKey: isOllama ? settings.apiKey || 'ollama' : settings.apiKey,
    baseURL: isOllama ? settings.baseUrl || 'http://localhost:11434/v1' : settings.baseUrl || undefined,
    modelId: settings.modelId || (isOllama ? DEFAULT_OLLAMA_MODEL : DEFAULT_OPENAI_MODEL),
  }
}

async function requestOpenAIText(systemPrompt: string, userContent: string, settings: AgentSettings): Promise<string> {
  const { apiKey, baseURL, modelId } = resolveOpenAIConfig(settings)
  const { signal, clear } = withAbortTimeout()

  try {
    const openai = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true,
    })

    const response = await openai.chat.completions.create(
      {
        model: modelId,
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
      },
      { signal }
    )

    const rawOutput = response.choices[0]?.message.content ?? ''

    if (!rawOutput) {
      throw new Error('OpenAI response did not contain text content.')
    }

    return rawOutput
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('请求超时（60 秒），请重试或检查网络连接。', { cause: error })
    }

    throw error
  } finally {
    clear()
  }
}

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
    rawOutput = await requestOpenAIText(
      EXECUTION_SYSTEM_PROMPT,
      `Canvas context:\n${canvasContext}\n\nUser request:\n${userInput}`,
      settings
    )
    const parsedResponse = parseAgentResponse(rawOutput)

    recordAgentIoLog({
      status: 'success',
      provider: settings.provider,
      modelId: settings.modelId || DEFAULT_OPENAI_MODEL,
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
      modelId: settings.modelId || DEFAULT_OPENAI_MODEL,
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
      modelId: settings.modelId || DEFAULT_OPENAI_MODEL,
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
      modelId: settings.modelId || DEFAULT_OPENAI_MODEL,
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
      modelId: settings.modelId || DEFAULT_OPENAI_MODEL,
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
      modelId: settings.modelId || DEFAULT_OPENAI_MODEL,
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
