import type { Block } from '../store'
import type { AgentResponse, CanvasCommand } from './types'

interface Camera {
  x: number
  y: number
  zoom: number
}

interface CanvasCommandStore {
  blocks: Record<string, Block>
  camera: Camera
  addBlock: (block: Block) => void
  updateBlock: (id: string, changes: Partial<Block>) => void
}

const COLLECTION_PADDING = 24
const COLLECTION_HEADER_HEIGHT = 42
const GRID_GAP_X = 36
const GRID_GAP_Y = 34
const GRID_COLUMNS = 2

function viewportCenter(camera: Camera): { x: number; y: number } {
  return {
    x: (window.innerWidth / 2 - camera.x) / camera.zoom,
    y: (window.innerHeight / 2 - camera.y) / camera.zoom,
  }
}

function fallbackBlockSize(type: Block['type']): { width: number; height: number } {
  if (type === 'collection') {
    return { width: 600, height: 400 }
  }

  if (type === 'image') {
    return { width: 240, height: 180 }
  }

  if (type === 'html') {
    return { width: 400, height: 300 }
  }

  if (type === 'svg') {
    return { width: 400, height: 300 }
  }

  if (type === 'code') {
    return { width: 420, height: 300 }
  }

  if (type === 'table') {
    return { width: 440, height: 300 }
  }

  if (type === 'link') {
    return { width: 340, height: 200 }
  }

  return type === 'markdown' ? { width: 320, height: 240 } : type === 'bubble' ? { width: 180, height: 52 } : { width: 200, height: 200 }
}

function estimateTextHeight(type: Block['type'], content: string, width: number, fallbackHeight: number): number {
  if (type !== 'markdown' && type !== 'note' && type !== 'bubble') {
    return fallbackHeight
  }

  const usableWidth = Math.max(140, width - 48)
  const averageCharWidth = type === 'markdown' ? 7.4 : type === 'bubble' ? 7.8 : 7.8
  const lineHeight = type === 'markdown' ? 23 : type === 'bubble' ? 20 : 21
  const headerHeight = type === 'markdown' ? 36 : type === 'bubble' ? 32 : 34
  const explicitLines = (content || 'Double click to edit').split(/\r?\n/)
  const visualLines = explicitLines.reduce((total, line) => {
    const lineLength = Math.max(1, line.length)
    return total + Math.max(1, Math.ceil((lineLength * averageCharWidth) / usableWidth))
  }, 0)

  return Math.max(fallbackHeight, headerHeight + visualLines * lineHeight + 42)
}

function normalizeCreateCommand(
  command: Extract<CanvasCommand, { type: 'canvas.create' }>,
  index: number,
  camera: Camera,
  blocks: Record<string, Block>,
  layoutGroupId: string
): Block {
  const center = viewportCenter(camera)
  const type = command.block.type
  const size = fallbackBlockSize(type)
  const requestedId = command.block.id?.trim()
  const id = requestedId && !blocks[requestedId] ? requestedId : crypto.randomUUID()

  const width = Number.isFinite(command.block.width) ? Math.max(80, command.block.width as number) : size.width
  const height = Number.isFinite(command.block.height)
    ? Math.max(80, command.block.height as number)
    : estimateTextHeight(type, command.block.content, width, size.height)

  return {
    id,
    type,
    title: command.block.title || (type === 'markdown' ? 'Agent Document' : 'Agent Block'),
    content: command.block.content,
    x: Number.isFinite(command.block.x) ? command.block.x as number : center.x + index * 44,
    y: Number.isFinite(command.block.y) ? command.block.y as number : center.y + index * 44,
    width,
    height,
    heightMode: type === 'markdown' || type === 'note' || type === 'bubble' ? 'auto' : undefined,
    layoutGroupId,
    locked: false,
    parentCollectionId: null,
    createdBy: 'agent',
    createdAt: Date.now(),
  }
}

function layoutCreatedBlocks(blockIds: string[], store: CanvasCommandStore): void {
  const blocks = blockIds
    .map((id) => store.blocks[id])
    .filter((block): block is Block => !!block && block.type !== 'collection')

  if (blocks.length <= 1) {
    return
  }

  const minX = Math.min(...blocks.map((block) => block.x))
  const minY = Math.min(...blocks.map((block) => block.y))
  const columnWidths = Array.from({ length: GRID_COLUMNS }, (_, column) =>
    Math.max(0, ...blocks.filter((_, index) => index % GRID_COLUMNS === column).map((block) => block.width))
  )
  const columnX = columnWidths.reduce<number[]>((positions, _width, index) => {
    if (index === 0) {
      return [minX]
    }

    return [...positions, positions[index - 1] + columnWidths[index - 1] + GRID_GAP_X]
  }, [])
  const rowY: number[] = []

  blocks.forEach((block, index) => {
    const row = Math.floor(index / GRID_COLUMNS)
    const column = index % GRID_COLUMNS
    const x = columnX[column]
    const y = rowY[row] ?? minY

    guardedUpdate(block.id, { x, y }, store)

    rowY[row] = Math.max(rowY[row] ?? minY, y)

    const nextRow = row + 1
    const nextRowY = y + block.height + GRID_GAP_Y
    rowY[nextRow] = Math.max(rowY[nextRow] ?? minY, nextRowY)
  })
}

function createLockWarning(block: Block): Block {
  return {
    id: crypto.randomUUID(),
    type: 'note',
    title: 'Locked Block',
    content: `「${block.title || 'Untitled'}」已被锁定。如需修改，请先解锁该块。`,
    x: block.x + block.width + 20,
    y: block.y,
    width: 260,
    height: 160,
    locked: false,
    parentCollectionId: null,
    createdBy: 'agent',
    createdAt: Date.now(),
  }
}

function guardedUpdate(id: string, changes: Partial<Block>, store: CanvasCommandStore): void {
  const block = store.blocks[id]

  if (!block) {
    return
  }

  if (block.locked) {
    store.addBlock(createLockWarning(block))
    return
  }

  store.updateBlock(id, changes)
  store.blocks = {
    ...store.blocks,
    [id]: { ...block, ...changes },
  }
}

function fitCollectionToChildren(collectionId: string, store: CanvasCommandStore): void {
  const collection = store.blocks[collectionId]

  if (!collection || collection.locked) {
    return
  }

  const children = Object.values(store.blocks).filter((block) => block.parentCollectionId === collectionId)

  if (children.length === 0) {
    return
  }

  const minX = Math.min(...children.map((block) => block.x))
  const minY = Math.min(...children.map((block) => block.y))
  const maxX = Math.max(...children.map((block) => block.x + block.width))
  const maxY = Math.max(...children.map((block) => block.y + block.height))
  const nextX = Math.min(collection.x, minX - COLLECTION_PADDING)
  const nextY = Math.min(collection.y, minY - COLLECTION_HEADER_HEIGHT)
  const nextWidth = Math.max(collection.width, maxX - nextX + COLLECTION_PADDING)
  const nextHeight = Math.max(collection.height, maxY - nextY + COLLECTION_PADDING)

  guardedUpdate(
    collectionId,
    {
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
    },
    store
  )
}

function executeCommand(
  command: CanvasCommand,
  index: number,
  store: CanvasCommandStore,
  createdBlockIds: string[] = [],
  layoutGroupId = crypto.randomUUID()
): void {
  if (command.type === 'canvas.batch') {
    const batchedCreatedBlockIds: string[] = []
    const createCommands = command.commands.filter((batchedCommand) => batchedCommand.type === 'canvas.create')
    const otherCommands = command.commands.filter((batchedCommand) => batchedCommand.type !== 'canvas.create')

    createCommands.forEach((batchedCommand, batchedIndex) => {
      executeCommand(batchedCommand, batchedIndex, store, batchedCreatedBlockIds, layoutGroupId)
    })
    layoutCreatedBlocks(batchedCreatedBlockIds, store)
    otherCommands.forEach((batchedCommand, batchedIndex) => {
      executeCommand(batchedCommand, batchedIndex, store, batchedCreatedBlockIds, layoutGroupId)
    })
    return
  }

  if (command.type === 'canvas.create') {
    const block = normalizeCreateCommand(command, index, store.camera, store.blocks, layoutGroupId)

    store.addBlock(block)
    store.blocks = { ...store.blocks, [block.id]: block }
    createdBlockIds.push(block.id)
    return
  }

  if (command.type === 'canvas.update') {
    guardedUpdate(command.id, command.changes as Partial<Block>, store)
    return
  }

  if (command.type === 'canvas.move') {
    guardedUpdate(command.id, { x: command.x, y: command.y }, store)
    return
  }

  if (command.type === 'canvas.resize') {
    guardedUpdate(command.id, { width: command.width, height: command.height }, store)
    return
  }

  if (command.type === 'canvas.lock') {
    store.updateBlock(command.id, { locked: command.locked })
    return
  }

  if (command.type === 'canvas.group') {
    const collection = store.blocks[command.collectionId]

    if (!collection || collection.locked) {
      if (collection?.locked) {
        store.addBlock(createLockWarning(collection))
      }

      return
    }

    command.blockIds.forEach((blockId) => {
      guardedUpdate(blockId, { parentCollectionId: command.collectionId }, store)
    })

    fitCollectionToChildren(command.collectionId, store)
  }
}

export function queryBlock(id: string, store: CanvasCommandStore): Block | null {
  return store.blocks[id] ?? null
}

export function executeCommands(response: AgentResponse, store: CanvasCommandStore): void {
  const layoutGroupId = crypto.randomUUID()
  const createdBlockIds: string[] = []
  const createCommands = response.commands.filter((command) => command.type === 'canvas.create')
  const otherCommands = response.commands.filter((command) => command.type !== 'canvas.create')

  createCommands.forEach((command, index) => {
    executeCommand(command, index, store, createdBlockIds, layoutGroupId)
  })
  layoutCreatedBlocks(createdBlockIds, store)
  otherCommands.forEach((command, index) => {
    executeCommand(command, index, store, createdBlockIds, layoutGroupId)
  })
}

export function buildCanvasContext(blocks: Record<string, Block>): string {
  const blockList = Object.values(blocks)

  if (blockList.length === 0) {
    return 'The canvas is currently empty.'
  }

  return blockList
    .map((block) => {
      const contentPreview = block.content.replace(/\s+/g, ' ').slice(0, 120)

      return [
        `id=${block.id}`,
        `type=${block.type}`,
        `title=${block.title || 'Untitled'}`,
        `position=(${Math.round(block.x)}, ${Math.round(block.y)})`,
        `size=${Math.round(block.width)}x${Math.round(block.height)}`,
        `locked=${block.locked}`,
        `parentCollectionId=${block.parentCollectionId || 'none'}`,
        `content=${contentPreview || '(empty)'}`,
      ].join('; ')
    })
    .join('\n')
}
