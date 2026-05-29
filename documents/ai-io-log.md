# AI IO Log

TreeWorld records Agent input/output logs in the browser for debugging and harness inspection.

## Storage

- Runtime storage key: `treeworld.agentIoLogs`
- Storage backend: browser `localStorage`
- Retention: latest 100 entries
- API keys are not stored in log entries

Read logs in the browser console or a harness:

```js
JSON.parse(localStorage.getItem('treeworld.agentIoLogs') || '[]')
```

Clear logs:

```js
localStorage.removeItem('treeworld.agentIoLogs')
```

## Entry Shape

```ts
interface AgentIoLogEntry {
  id: string
  createdAt: string
  durationMs: number
  status: 'success' | 'error'
  provider: 'anthropic' | 'openai'
  modelId: string
  baseUrl: string
  hasApiKey: boolean
  userInput: string
  canvasContext: string
  rawOutput?: string
  parsedResponse?: {
    message: string
    commands: Array<{
      type: 'canvas.create'
      block: {
        type: 'markdown' | 'note'
        title: string
        content: string
        x?: number
        y?: number
        width?: number
        height?: number
      }
    }>
  }
  errorMessage?: string
}
```

## Notes

- `userInput` is the text submitted through the floating Agent input.
- `canvasContext` is the block summary sent to the model.
- `rawOutput` is the model's raw text response before JSON parsing.
- `parsedResponse` is the validated canvas command response.
- Missing API key attempts are also logged as `status: 'error'`.
- Each log entry is also printed with `console.info('[TreeWorld Agent IO]', entry)`.
