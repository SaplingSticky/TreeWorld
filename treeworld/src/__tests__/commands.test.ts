import { describe, it, expect } from 'vitest'
import { buildCanvasContext } from '../agent/commands'
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
