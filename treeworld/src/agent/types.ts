export type AgentBlockType = 'markdown' | 'note' | 'image' | 'collection' | 'html' | 'svg' | 'code' | 'table' | 'link'
export type AgentProvider = 'anthropic' | 'openai' | 'ollama'

export interface AgentSettings {
  provider: AgentProvider
  apiKey: string
  baseUrl: string
  modelId: string
  searchApiKey: string
}

export interface AgentBlockInput {
  id?: string
  type: AgentBlockType
  title: string
  content: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface CanvasCreateCommand {
  type: 'canvas.create'
  block: AgentBlockInput
}

export interface CanvasUpdateCommand {
  type: 'canvas.update'
  id: string
  changes: Partial<AgentBlockInput>
}

export interface CanvasMoveCommand {
  type: 'canvas.move'
  id: string
  x: number
  y: number
}

export interface CanvasResizeCommand {
  type: 'canvas.resize'
  id: string
  width: number
  height: number
}

export interface CanvasLockCommand {
  type: 'canvas.lock'
  id: string
  locked: boolean
}

export interface CanvasGroupCommand {
  type: 'canvas.group'
  collectionId: string
  blockIds: string[]
}

export interface CanvasBatchCommand {
  type: 'canvas.batch'
  commands: CanvasCommand[]
}

export type CanvasCommand =
  | CanvasCreateCommand
  | CanvasUpdateCommand
  | CanvasMoveCommand
  | CanvasResizeCommand
  | CanvasLockCommand
  | CanvasGroupCommand
  | CanvasBatchCommand

export interface AgentResponse {
  message: string
  commands: CanvasCommand[]
}

export interface AgentPlanBlock {
  type: AgentBlockType
  title: string
  reason: string
}

export interface AgentPlanCollection {
  title: string
  blocks: AgentPlanBlock[]
}

export interface AgentPlan {
  type: 'plan'
  summary: string
  collections: AgentPlanCollection[]
}
