import type { AgentPlan, AgentProvider, AgentResponse } from './types'

const STORAGE_KEY = 'treeworld.agentIoLogs'
const MAX_LOG_ENTRIES = 100

export interface AgentIoLogEntry {
  id: string
  createdAt: string
  durationMs: number
  status: 'success' | 'error'
  provider: AgentProvider
  modelId: string
  baseUrl: string
  hasApiKey: boolean
  userInput: string
  canvasContext: string
  rawOutput?: string
  parsedResponse?: AgentResponse | AgentPlan
  errorMessage?: string
}

export type AgentIoLogInput = Omit<AgentIoLogEntry, 'id' | 'createdAt'>

function readLogs(): AgentIoLogEntry[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY)

    return value ? JSON.parse(value) as AgentIoLogEntry[] : []
  } catch {
    return []
  }
}

export function recordAgentIoLog(entry: AgentIoLogInput): AgentIoLogEntry {
  const nextEntry: AgentIoLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  const nextLogs = [nextEntry, ...readLogs()].slice(0, MAX_LOG_ENTRIES)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLogs))
  console.info('[TreeWorld Agent IO]', nextEntry)

  return nextEntry
}

export function getAgentIoLogs(): AgentIoLogEntry[] {
  return readLogs()
}

export function clearAgentIoLogs(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export { STORAGE_KEY as AGENT_IO_LOG_STORAGE_KEY }
