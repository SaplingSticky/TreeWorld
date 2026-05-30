import { describe, it, expect } from 'vitest'
import { parseAgentResponse, parseAgentPlan } from '../agent/response'

describe('parseAgentResponse', () => {
  it('should parse a valid canvas.create command', () => {
    const input = JSON.stringify({
      message: 'Created a block',
      commands: [
        {
          type: 'canvas.create',
          block: {
            type: 'markdown',
            title: 'Test',
            content: 'Hello world',
          },
        },
      ],
    })
    const result = parseAgentResponse(input)
    expect(result.message).toBe('Created a block')
    expect(result.commands.length).toBe(1)
    expect(result.commands[0].type).toBe('canvas.create')
  })

  it('should parse a batch command', () => {
    const input = JSON.stringify({
      message: 'Batch',
      commands: [
        {
          type: 'canvas.batch',
          commands: [
            { type: 'canvas.create', block: { type: 'note', title: 'N1', content: 'c1' } },
            { type: 'canvas.create', block: { type: 'note', title: 'N2', content: 'c2' } },
          ],
        },
      ],
    })
    const result = parseAgentResponse(input)
    expect(result.commands.length).toBe(1)
    expect(result.commands[0].type).toBe('canvas.batch')
  })

  it('should filter out invalid commands', () => {
    const input = JSON.stringify({
      message: 'Mixed',
      commands: [
        { type: 'canvas.create', block: { type: 'markdown', title: 'T', content: 'C' } },
        { type: 'canvas.create' }, // missing block
        { type: 'unknown.type', id: 'x' },
      ],
    })
    const result = parseAgentResponse(input)
    expect(result.commands.length).toBe(1)
  })

  it('should handle markdown fences around JSON', () => {
    const input = '```json\n' + JSON.stringify({
      message: 'Done',
      commands: [{ type: 'canvas.create', block: { type: 'markdown', title: 'T', content: 'C' } }],
    }) + '\n```'
    const result = parseAgentResponse(input)
    expect(result.commands.length).toBe(1)
  })

  it('should throw on unparseable input', () => {
    expect(() => parseAgentResponse('not json at all')).toThrow()
  })
})

describe('parseAgentPlan', () => {
  it('should parse a valid plan', () => {
    const input = JSON.stringify({
      type: 'plan',
      summary: 'Learn K-lines',
      collections: [
        {
          title: 'K-line Basics',
          blocks: [
            { type: 'markdown', title: 'History', reason: 'Text content' },
            { type: 'svg', title: 'Diagram', reason: 'Visual explanation' },
          ],
        },
      ],
    })
    const result = parseAgentPlan(input)
    expect(result.type).toBe('plan')
    expect(result.summary).toBe('Learn K-lines')
    expect(result.collections.length).toBe(1)
    expect(result.collections[0].blocks.length).toBe(2)
  })

  it('should throw on invalid plan', () => {
    expect(() => parseAgentPlan('{}')).toThrow()
  })
})
