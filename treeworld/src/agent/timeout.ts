export const AGENT_REQUEST_TIMEOUT_MS = 60_000

export interface AbortTimeout {
  signal: AbortSignal
  clear: () => void
}

export function withAbortTimeout(timeoutMs: number = AGENT_REQUEST_TIMEOUT_MS): AbortTimeout {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timer),
  }
}

export function isAbortError(error: unknown): boolean {
  return (error instanceof Error || error instanceof DOMException) && error.name === 'AbortError'
}
