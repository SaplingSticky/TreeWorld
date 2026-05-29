import { askAnthropicAgent, askAnthropicPlan, executeAnthropicPlan } from './anthropic'
import { askOpenAIAgent, askOpenAIPlan, executeOpenAIPlan } from './openai'
import type { AgentPlan, AgentResponse, AgentSettings } from './types'

export async function askAgent(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings
): Promise<AgentResponse> {
  if (settings.provider === 'openai' || settings.provider === 'ollama') {
    return askOpenAIAgent(userInput, canvasContext, settings)
  }

  return askAnthropicAgent(userInput, canvasContext, settings)
}

export async function askAgentPlan(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings,
  currentPlan?: AgentPlan
): Promise<AgentPlan> {
  if (settings.provider === 'openai' || settings.provider === 'ollama') {
    return askOpenAIPlan(userInput, canvasContext, settings, currentPlan)
  }

  return askAnthropicPlan(userInput, canvasContext, settings, currentPlan)
}

export async function executeAgentPlan(
  userInput: string,
  canvasContext: string,
  settings: AgentSettings,
  plan: AgentPlan
): Promise<AgentResponse> {
  if (settings.provider === 'openai' || settings.provider === 'ollama') {
    return executeOpenAIPlan(userInput, canvasContext, settings, plan)
  }

  return executeAnthropicPlan(userInput, canvasContext, settings, plan)
}
