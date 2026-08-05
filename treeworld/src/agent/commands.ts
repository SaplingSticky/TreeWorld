import type { Block } from '../store'
import { arrangeIntoGrid, computeCollectionBounds } from '../canvas/layout'
import type { AgentResponse, CanvasCommand } from './types'

interface Camera {
  x: number
  y: number
  zoom: number
}

export interface CanvasCommandStore {
  blocks: Record<string, Block>
  camera: Camera
  addBlock: (block: Block) => void
  updateBlock: (id: string, changes: Partial<Block>) => void
  deleteBlock: (id: string) => void
}

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

  const positions = arrangeIntoGrid(blocks, { sort: false })

  // Collision avoidance: shift the whole grid down until it no longer
  // overlaps blocks outside this layout group (existing user content or
  // older agent output). Collections created in the same batch share the
  // layoutGroupId and are excluded so children stay inside their collection.
  const groupId = blocks[0]?.layoutGroupId
  const others = Object.values(store.blocks).filter((block) => block.layoutGroupId !== groupId)
  const PADDING = 24
  let shiftY = 0

  for (let attempt = 0; attempt < 40; attempt++) {
    const collides = others.some((other) =>
      blocks.some((block) => {
        const position = positions.get(block.id)

        if (!position) {
          return false
        }

        return !(
          position.x + block.width + PADDING <= other.x ||
          other.x + other.width + PADDING <= position.x ||
          position.y + shiftY + block.height + PADDING <= other.y ||
          other.y + other.height + PADDING <= position.y + shiftY
        )
      })
    )

    if (!collides) {
      break
    }

    shiftY += 80
  }

  for (const block of blocks) {
    const position = positions.get(block.id)

    if (!position) {
      continue
    }

    guardedUpdate(block.id, { x: position.x, y: position.y + shiftY }, store)
  }
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

function guardedDelete(id: string, store: CanvasCommandStore): void {
  const block = store.blocks[id]

  if (!block) {
    return
  }

  if (block.locked) {
    store.addBlock(createLockWarning(block))
    return
  }

  // Deleting a collection orphans its children instead of deleting them.
  if (block.type === 'collection') {
    for (const child of Object.values(store.blocks)) {
      if (child.parentCollectionId === id) {
        guardedUpdate(child.id, { parentCollectionId: null }, store)
      }
    }
  }

  store.deleteBlock(id)
  const next = { ...store.blocks }
  delete next[id]
  store.blocks = next
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

  const bounds = computeCollectionBounds(children)

  if (!bounds) {
    return
  }

  // Grow-only policy: the agent never shrinks a collection it sized.
  const nextX = Math.min(collection.x, bounds.x)
  const nextY = Math.min(collection.y, bounds.y)
  const nextWidth = Math.max(collection.width, bounds.width)
  const nextHeight = Math.max(collection.height, bounds.height)

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

export interface QueryResult {
  id: string
  block: Block | null
}

function executeCommand(
  command: CanvasCommand,
  index: number,
  store: CanvasCommandStore,
  createdBlockIds: string[] = [],
  layoutGroupId = crypto.randomUUID(),
  queryResults: QueryResult[] = []
): void {
  if (command.type === 'canvas.batch') {
    const batchedCreatedBlockIds: string[] = []
    const createCommands = command.commands.filter((batchedCommand) => batchedCommand.type === 'canvas.create')
    const otherCommands = command.commands.filter((batchedCommand) => batchedCommand.type !== 'canvas.create')

    createCommands.forEach((batchedCommand, batchedIndex) => {
      executeCommand(batchedCommand, batchedIndex, store, batchedCreatedBlockIds, layoutGroupId, queryResults)
    })
    layoutCreatedBlocks(batchedCreatedBlockIds, store)
    otherCommands.forEach((batchedCommand, batchedIndex) => {
      executeCommand(batchedCommand, batchedIndex, store, batchedCreatedBlockIds, layoutGroupId, queryResults)
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

  if (command.type === 'canvas.delete') {
    guardedDelete(command.id, store)
    return
  }

  if (command.type === 'canvas.query') {
    queryResults.push({ id: command.id, block: store.blocks[command.id] ?? null })
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

export function executeCommands(response: AgentResponse, store: CanvasCommandStore): QueryResult[] {
  const layoutGroupId = crypto.randomUUID()
  const createdBlockIds: string[] = []
  const queryResults: QueryResult[] = []
  const createCommands = response.commands.filter((command) => command.type === 'canvas.create')
  const otherCommands = response.commands.filter((command) => command.type !== 'canvas.create')

  createCommands.forEach((command, index) => {
    executeCommand(command, index, store, createdBlockIds, layoutGroupId, queryResults)
  })
  layoutCreatedBlocks(createdBlockIds, store)
  otherCommands.forEach((command, index) => {
    executeCommand(command, index, store, createdBlockIds, layoutGroupId, queryResults)
  })

  return queryResults
}

const MAX_QUERY_BLOCK_CHARS = 2000

export function formatQueryResults(queryResults: QueryResult[]): string {
  if (queryResults.length === 0) {
    return ''
  }

  const lines = queryResults.map((result) => {
    const block = result.block

    if (!block) {
      return `- id=${result.id}; NOT FOUND (this block does not exist on the canvas)`
    }

    const fullContent = block.content.slice(0, MAX_QUERY_BLOCK_CHARS)

    return [
      `- id=${block.id}`,
      `type=${block.type}`,
      `title=${block.title || 'Untitled'}`,
      `position=(${Math.round(block.x)}, ${Math.round(block.y)})`,
      `size=${Math.round(block.width)}x${Math.round(block.height)}`,
      `locked=${block.locked}`,
      `parentCollectionId=${block.parentCollectionId || 'none'}`,
      `content=${fullContent || '(empty)'}`,
    ].join('; ')
  })

  return `Block query results:\n${lines.join('\n')}`
}

const MAX_CONTEXT_CHARS = 4000
const MAX_CONTEXT_BLOCKS = 30

export function buildCanvasContext(blocks: Record<string, Block>, camera?: Camera): string {
  const blockList = Object.values(blocks)

  if (blockList.length === 0) {
    return 'The canvas is currently empty.'
  }

  // Filter to viewport blocks if camera is provided
  let visibleBlocks = blockList
  if (camera) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
    const left = -camera.x / camera.zoom - 200
    const top = -camera.y / camera.zoom - 200
    const right = (vw - camera.x) / camera.zoom + 200
    const bottom = (vh - camera.y) / camera.zoom + 200

    visibleBlocks = blockList.filter(
      (b) => b.x + b.width > left && b.x < right && b.y + b.height > top && b.y < bottom
    )

    // Always include collection blocks
    const collections = blockList.filter((b) => b.type === 'collection')
    visibleBlocks = [...new Map([...visibleBlocks, ...collections].map((b) => [b.id, b])).values()]
  }

  // Cap at MAX_CONTEXT_BLOCKS
  const capped = visibleBlocks.length > MAX_CONTEXT_BLOCKS
  const blocksToProcess = capped ? visibleBlocks.slice(0, MAX_CONTEXT_BLOCKS) : visibleBlocks

  const lines: string[] = []
  let totalChars = 0

  if (capped || (camera && visibleBlocks.length < blockList.length)) {
    const summary = `Showing ${blocksToProcess.length} of ${blockList.length} blocks${camera ? ' (viewport + collections)' : ''}.`
    lines.push(summary)
    totalChars += summary.length + 1
  }

  for (const block of blocksToProcess) {
    const contentPreview = block.content.replace(/\s+/g, ' ').slice(0, 80)
    const isTruncated = block.content.replace(/\s+/g, ' ').length > 80
    const line = [
      `id=${block.id}`,
      `type=${block.type}`,
      `title=${block.title || 'Untitled'}`,
      `position=(${Math.round(block.x)}, ${Math.round(block.y)})`,
      `size=${Math.round(block.width)}x${Math.round(block.height)}`,
      `locked=${block.locked}`,
      `parentCollectionId=${block.parentCollectionId || 'none'}`,
      `content=${contentPreview || '(empty)'}`,
      ...(isTruncated ? ['contentTruncated=true'] : []),
    ].join('; ')

    if (totalChars + line.length + 1 > MAX_CONTEXT_CHARS) {
      lines.push(`... context truncated (${blocksToProcess.length - lines.length + 1} blocks remaining)`)
      break
    }

    lines.push(line)
    totalChars += line.length + 1
  }

  return lines.join('\n')
}
