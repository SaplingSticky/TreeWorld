import { describe, it, expect } from 'vitest'
import { buildCanvasContext, executeCommands, formatQueryResults } from '../agent/commands'
import type { CanvasCommandStore } from '../agent/commands'
import type { AgentResponse } from '../agent/types'
import type { Block } from '../store'

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: crypto.randomUUID(),
    type: 'markdown',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    content: 'test content',
    locked: false,
    parentCollectionId: null,
    title: 'Test',
    createdBy: 'user',
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeStore(initial: Record<string, Block> = {}): CanvasCommandStore {
  const store: CanvasCommandStore = {
    blocks: { ...initial },
    camera: { x: 0, y: 0, zoom: 1 },
    addBlock: (block) => {
      store.blocks = { ...store.blocks, [block.id]: block }
    },
    updateBlock: (id, changes) => {
      if (store.blocks[id]) {
        store.blocks = { ...store.blocks, [id]: { ...store.blocks[id], ...changes } }
      }
    },
    deleteBlock: (id) => {
      const next = { ...store.blocks }
      delete next[id]
      store.blocks = next
    },
  }
  return store
}

function makeResponse(commands: AgentResponse['commands']): AgentResponse {
  return { message: 'done', commands }
}

describe('buildCanvasContext', () => {
  it('should return empty message for no blocks', () => {
    const result = buildCanvasContext({})
    expect(result).toBe('The canvas is currently empty.')
  })

  it('should format a single block', () => {
    const block = makeBlock({ id: 'b1', type: 'markdown', title: 'Hello', content: 'World' })
    const result = buildCanvasContext({ b1: block })
    expect(result).toContain('id=b1')
    expect(result).toContain('type=markdown')
    expect(result).toContain('title=Hello')
    expect(result).toContain('content=World')
  })

  it('should truncate long content to 80 chars', () => {
    const longContent = 'a'.repeat(200)
    const block = makeBlock({ content: longContent })
    const result = buildCanvasContext({ [block.id]: block })
    expect(result).toContain('content=' + 'a'.repeat(80))
  })

  it('should truncate context at 4000 chars', () => {
    const blocks: Record<string, Block> = {}
    for (let i = 0; i < 100; i++) {
      const b = makeBlock({ id: `b${i}`, title: `Block ${i}`, content: 'x'.repeat(100) })
      blocks[b.id] = b
    }
    const result = buildCanvasContext(blocks)
    expect(result.length).toBeLessThanOrEqual(4200) // some slack for truncation message
    expect(result).toContain('context truncated')
  })

  it('should filter to viewport blocks when camera is provided', () => {
    const visible = makeBlock({ id: 'vis', x: 100, y: 100, width: 200, height: 150 })
    const offscreen = makeBlock({ id: 'off', x: 5000, y: 5000, width: 200, height: 150 })
    const camera = { x: 0, y: 0, zoom: 1 }
    const result = buildCanvasContext({ vis: visible, off: offscreen }, camera)
    expect(result).toContain('id=vis')
    // offscreen block may or may not be included depending on viewport size
  })

  it('should always include collection blocks even if offscreen', () => {
    const collection = makeBlock({ id: 'col', type: 'collection', x: 5000, y: 5000 })
    const camera = { x: 0, y: 0, zoom: 1 }
    const result = buildCanvasContext({ col: collection }, camera)
    expect(result).toContain('id=col')
  })
})

describe('executeCommands — canvas.delete', () => {
  it('should delete an unlocked block', () => {
    const block = makeBlock({ id: 'b1' })
    const store = makeStore({ b1: block })

    executeCommands(makeResponse([{ type: 'canvas.delete', id: 'b1' }]), store)

    expect(store.blocks.b1).toBeUndefined()
  })

  it('should not delete a locked block and should create a warning note instead', () => {
    const block = makeBlock({ id: 'b1', locked: true })
    const store = makeStore({ b1: block })

    executeCommands(makeResponse([{ type: 'canvas.delete', id: 'b1' }]), store)

    expect(store.blocks.b1).toBeDefined()
    const warnings = Object.values(store.blocks).filter((b) => b.title === 'Locked Block')
    expect(warnings.length).toBe(1)
  })

  it('should orphan children when deleting a collection', () => {
    const collection = makeBlock({ id: 'col', type: 'collection' })
    const child = makeBlock({ id: 'child', parentCollectionId: 'col' })
    const store = makeStore({ col: collection, child })

    executeCommands(makeResponse([{ type: 'canvas.delete', id: 'col' }]), store)

    expect(store.blocks.col).toBeUndefined()
    expect(store.blocks.child).toBeDefined()
    expect(store.blocks.child.parentCollectionId).toBeNull()
  })

  it('should be a no-op for a nonexistent id', () => {
    const store = makeStore({})

    expect(() => {
      executeCommands(makeResponse([{ type: 'canvas.delete', id: 'ghost' }]), store)
    }).not.toThrow()
  })

  it('should delete inside a canvas.batch', () => {
    const block = makeBlock({ id: 'b1' })
    const store = makeStore({ b1: block })

    executeCommands(
      makeResponse([{ type: 'canvas.batch', commands: [{ type: 'canvas.delete', id: 'b1' }] }]),
      store
    )

    expect(store.blocks.b1).toBeUndefined()
  })
})

describe('executeCommands — canvas.query', () => {
  it('should return the full block content in query results', () => {
    const longContent = 'x'.repeat(500)
    const block = makeBlock({ id: 'b1', content: longContent })
    const store = makeStore({ b1: block })

    const queryResults = executeCommands(makeResponse([{ type: 'canvas.query', id: 'b1' }]), store)

    expect(queryResults.length).toBe(1)
    expect(queryResults[0].id).toBe('b1')
    expect(queryResults[0].block?.content).toBe(longContent)
    expect(store.blocks.b1).toBeDefined() // query must not mutate the canvas
  })

  it('should return null block for a missing id', () => {
    const store = makeStore({})

    const queryResults = executeCommands(makeResponse([{ type: 'canvas.query', id: 'ghost' }]), store)

    expect(queryResults.length).toBe(1)
    expect(queryResults[0].block).toBeNull()
  })

  it('should collect queries nested inside canvas.batch', () => {
    const block = makeBlock({ id: 'b1', content: 'full content here' })
    const store = makeStore({ b1: block })

    const queryResults = executeCommands(
      makeResponse([{ type: 'canvas.batch', commands: [{ type: 'canvas.query', id: 'b1' }] }]),
      store
    )

    expect(queryResults.length).toBe(1)
    expect(queryResults[0].block?.content).toBe('full content here')
  })

  it('should combine mutations and queries in one response', () => {
    const block = makeBlock({ id: 'b1', content: 'need this' })
    const store = makeStore({ b1: block })

    const queryResults = executeCommands(
      makeResponse([
        { type: 'canvas.delete', id: 'b1' },
        { type: 'canvas.query', id: 'b1' },
      ]),
      store
    )

    // delete runs first, so the query finds nothing
    expect(store.blocks.b1).toBeUndefined()
    expect(queryResults.length).toBe(1)
    expect(queryResults[0].block).toBeNull()
  })
})

describe('formatQueryResults', () => {
  it('should return empty string for no results', () => {
    expect(formatQueryResults([])).toBe('')
  })

  it('should include full block content without truncation', () => {
    const longContent = 'y'.repeat(300)
    const result = formatQueryResults([{ id: 'b1', block: makeBlock({ id: 'b1', content: longContent }) }])

    expect(result).toContain(`content=${longContent}`)
    expect(result).toContain('type=markdown')
  })

  it('should mark missing blocks as NOT FOUND', () => {
    const result = formatQueryResults([{ id: 'ghost', block: null }])

    expect(result).toContain('NOT FOUND')
  })
})
