import type { AgentPlan, AgentPlanBlock, AgentResponse, CanvasCommand } from './types'

function extractJson(text: string): string {
  const trimmed = text.trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)

  if (fencedMatch) {
    return fencedMatch[1]
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

function isValidCommand(command: unknown): command is CanvasCommand {
  if (!command || typeof command !== 'object') {
    return false
  }

  const maybeCommand = command as CanvasCommand

  if (maybeCommand.type === 'canvas.create') {
    return (
      !!maybeCommand.block &&
      ['markdown', 'note', 'image', 'collection', 'html', 'svg', 'code', 'table', 'link', 'canvas2d'].includes(maybeCommand.block.type) &&
      typeof maybeCommand.block.title === 'string' &&
      typeof maybeCommand.block.content === 'string'
    )
  }

  if (maybeCommand.type === 'canvas.batch') {
    return Array.isArray(maybeCommand.commands) && maybeCommand.commands.every(isValidCommand)
  }

  if (
    maybeCommand.type === 'canvas.update' ||
    maybeCommand.type === 'canvas.move' ||
    maybeCommand.type === 'canvas.resize' ||
    maybeCommand.type === 'canvas.lock'
  ) {
    return typeof maybeCommand.id === 'string'
  }

  if (maybeCommand.type === 'canvas.group') {
    return typeof maybeCommand.collectionId === 'string' && Array.isArray(maybeCommand.blockIds)
  }

  return false
}

function isValidPlanBlock(block: unknown): block is AgentPlanBlock {
  if (!block || typeof block !== 'object') {
    return false
  }

  const maybeBlock = block as AgentPlanBlock

  return (
    ['markdown', 'note', 'image', 'collection', 'html', 'svg', 'code', 'table', 'link', 'canvas2d'].includes(maybeBlock.type) &&
    typeof maybeBlock.title === 'string' &&
    typeof maybeBlock.reason === 'string'
  )
}

function isValidPlan(value: unknown): value is AgentPlan {
  if (!value || typeof value !== 'object') {
    return false
  }

  const maybePlan = value as AgentPlan

  return (
    maybePlan.type === 'plan' &&
    typeof maybePlan.summary === 'string' &&
    Array.isArray(maybePlan.collections) &&
    maybePlan.collections.every(
      (collection) =>
        !!collection &&
        typeof collection === 'object' &&
        typeof collection.title === 'string' &&
        Array.isArray(collection.blocks) &&
        collection.blocks.every(isValidPlanBlock)
    )
  )
}

export function parseAgentResponse(text: string): AgentResponse {
  const parsed = JSON.parse(extractJson(text)) as Partial<AgentResponse>

  if (typeof parsed.message !== 'string' || !Array.isArray(parsed.commands)) {
    throw new Error('Agent response does not match the expected schema.')
  }

  const commands = parsed.commands.filter(isValidCommand)

  if (commands.length === 0) {
    throw new Error('Agent response did not contain any supported canvas commands.')
  }

  return {
    message: parsed.message,
    commands,
  }
}

export function parseAgentPlan(text: string): AgentPlan {
  const parsed = JSON.parse(extractJson(text)) as unknown

  if (!isValidPlan(parsed)) {
    throw new Error('Agent plan does not match the expected schema.')
  }

  return parsed
}
