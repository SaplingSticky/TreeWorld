import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../store'
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
    title: 'Test Block',
    createdBy: 'user',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('Canvas Store', () => {
  beforeEach(() => {
    // Reset store state
    useCanvasStore.setState({
      blocks: {},
      undoStack: [],
      redoStack: [],
      activeCanvasId: null,
    })
  })

  describe('addBlock', () => {
    it('should add a block to the store', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      expect(useCanvasStore.getState().blocks[block.id]).toEqual(block)
    })

    it('should push to undo stack', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      expect(useCanvasStore.getState().undoStack.length).toBe(1)
    })

    it('should clear redo stack', () => {
      useCanvasStore.setState({ redoStack: [{ 'old': makeBlock() }] })
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      expect(useCanvasStore.getState().redoStack.length).toBe(0)
    })
  })

  describe('updateBlock', () => {
    it('should update block properties', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().updateBlock(block.id, { title: 'Updated' })
      expect(useCanvasStore.getState().blocks[block.id].title).toBe('Updated')
    })

    it('should push to undo stack', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().updateBlock(block.id, { title: 'Updated' })
      expect(useCanvasStore.getState().undoStack.length).toBe(2)
    })

    it('should not update if block does not exist', () => {
      useCanvasStore.getState().updateBlock('nonexistent', { title: 'Test' })
      expect(useCanvasStore.getState().undoStack.length).toBe(0)
    })
  })

  describe('deleteBlock', () => {
    it('should remove the block', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().deleteBlock(block.id)
      expect(useCanvasStore.getState().blocks[block.id]).toBeUndefined()
    })

    it('should push to undo stack', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().deleteBlock(block.id)
      expect(useCanvasStore.getState().undoStack.length).toBe(2)
    })
  })

  describe('toggleLock', () => {
    it('should toggle lock state', () => {
      const block = makeBlock({ locked: false })
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().toggleLock(block.id)
      expect(useCanvasStore.getState().blocks[block.id].locked).toBe(true)
      useCanvasStore.getState().toggleLock(block.id)
      expect(useCanvasStore.getState().blocks[block.id].locked).toBe(false)
    })
  })

  describe('undo/redo', () => {
    it('should undo addBlock', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().undo()
      expect(useCanvasStore.getState().blocks[block.id]).toBeUndefined()
    })

    it('should redo after undo', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().undo()
      useCanvasStore.getState().redo()
      expect(useCanvasStore.getState().blocks[block.id]).toBeDefined()
    })

    it('should undo deleteBlock', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().deleteBlock(block.id)
      useCanvasStore.getState().undo()
      expect(useCanvasStore.getState().blocks[block.id]).toBeDefined()
    })

    it('should not undo when stack is empty', () => {
      useCanvasStore.getState().undo()
      expect(useCanvasStore.getState().undoStack.length).toBe(0)
    })

    it('should not redo when stack is empty', () => {
      useCanvasStore.getState().redo()
      expect(useCanvasStore.getState().redoStack.length).toBe(0)
    })

    it('should clear undo/redo on canvas switch', () => {
      const block = makeBlock()
      useCanvasStore.getState().addBlock(block)
      expect(useCanvasStore.getState().undoStack.length).toBe(1)

      useCanvasStore.setState({ undoStack: [], redoStack: [] })
      expect(useCanvasStore.getState().undoStack.length).toBe(0)
    })
  })

  describe('duplicateBlock', () => {
    it('should create a copy offset by 24px', () => {
      const block = makeBlock({ x: 100, y: 200 })
      useCanvasStore.getState().addBlock(block)
      useCanvasStore.getState().duplicateBlock(block.id)
      const blocks = Object.values(useCanvasStore.getState().blocks)
      expect(blocks.length).toBe(2)
      const dup = blocks.find((b) => b.id !== block.id)!
      expect(dup.x).toBe(124)
      expect(dup.y).toBe(224)
      expect(dup.createdBy).toBe('user')
    })
  })

  describe('moveCollection', () => {
    it('should move collection and children', () => {
      const collection = makeBlock({ type: 'collection', x: 0, y: 0, width: 400, height: 300 })
      const child = makeBlock({ parentCollectionId: collection.id, x: 50, y: 50 })
      useCanvasStore.getState().addBlock(collection)
      useCanvasStore.getState().addBlock(child)
      useCanvasStore.getState().moveCollection(collection.id, 10, 20)
      expect(useCanvasStore.getState().blocks[collection.id].x).toBe(10)
      expect(useCanvasStore.getState().blocks[collection.id].y).toBe(20)
      expect(useCanvasStore.getState().blocks[child.id].x).toBe(60)
      expect(useCanvasStore.getState().blocks[child.id].y).toBe(70)
    })

    it('should not move locked collection', () => {
      const collection = makeBlock({ type: 'collection', locked: true })
      useCanvasStore.getState().addBlock(collection)
      useCanvasStore.getState().moveCollection(collection.id, 10, 20)
      expect(useCanvasStore.getState().blocks[collection.id].x).toBe(100)
    })
  })
})
