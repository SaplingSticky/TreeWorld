import { create } from 'zustand'
import type { AgentProvider, AgentSettings } from './agent/types'

export type BlockType = 'markdown' | 'note' | 'bubble' | 'html' | 'image' | 'collection' | 'svg' | 'code' | 'table' | 'link' | 'canvas2d'
export type CanvasTheme = 'cork' | 'leather' | 'linen'

export interface Block {
  id: string
  type: BlockType
  x: number
  y: number
  width: number
  height: number
  heightMode?: 'auto' | 'manual'
  layoutGroupId?: string
  content: string
  locked: boolean
  parentCollectionId: string | null
  title: string
  createdBy: 'user' | 'agent'
  createdAt: number
}

export interface Camera {
  x: number
  y: number
  zoom: number
}

export type BlockTypeSummary = Partial<Record<BlockType, number>>

export interface CanvasMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  blockCount: number
  blockTypes: BlockTypeSummary
}

export interface CanvasDocument {
  id: string
  name: string
  blocks: Record<string, Block>
  camera: Camera
  createdAt: number
  updatedAt: number
}

export type ImportCanvasResult = { ok: true; id: string } | { ok: false; error: string }

interface CanvasState {
  blocks: Record<string, Block>
  camera: Camera
  canvasMetas: CanvasMeta[]
  activeCanvasId: string | null
  activeCanvasName: string
  isAgentThinking: boolean
  agentProvider: AgentProvider
  agentApiKey: string
  agentBaseUrl: string
  agentModelId: string
  agentSearchApiKey: string
  agentStatusText: string
  canvasTheme: CanvasTheme
  frontBlockId: string | null
  undoStack: Record<string, Block>[]
  redoStack: Record<string, Block>[]
  undo: () => void
  redo: () => void
  addBlock: (block: Block) => void
  updateBlock: (id: string, changes: Partial<Block>) => void
  deleteBlock: (id: string) => void
  toggleLock: (id: string) => void
  moveCollection: (id: string, dx: number, dy: number) => void
  fitCollectionToChildren: (id: string) => void
  resolveLayoutOverlaps: () => void
  setCamera: (camera: Camera) => void
  createCanvas: (name?: string) => string
  loadCanvas: (id: string) => boolean
  closeCanvas: () => void
  renameCanvas: (id: string, name: string) => void
  deleteCanvas: (id: string) => void
  exportCanvas: (id?: string) => CanvasDocument | null
  importCanvas: (data: unknown) => ImportCanvasResult
  setAgentThinking: (isThinking: boolean) => void
  setAgentStatusText: (statusText: string) => void
  setAgentSettings: (settings: AgentSettings) => void
  setCanvasTheme: (theme: CanvasTheme) => void
  duplicateBlock: (id: string) => void
  bringToFront: (id: string) => void
  clearFrontBlock: () => void
}

const CANVASES_KEY = 'treeworld:canvases'
const ACTIVE_CANVAS_KEY = 'treeworld:activeCanvasId'
const CANVAS_THEME_KEY = 'treeworld.canvasTheme'
const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 }
const BLOCK_TYPES: BlockType[] = ['markdown', 'note', 'bubble', 'html', 'image', 'collection', 'svg', 'code', 'table', 'link', 'canvas2d']
const COLLECTION_PADDING = 24
const COLLECTION_HEADER_HEIGHT = 42
const LAYOUT_GAP_X = 36
const LAYOUT_GAP_Y = 34
const LAYOUT_COLUMNS = 2

let saveTimer: number | undefined
let needsLayoutResolve = false

export function markNeedsLayoutResolve() {
  needsLayoutResolve = true
}

function canvasKey(id: string): string {
  return `treeworld:canvas:${id}`
}

function safeJsonParse(value: string | null): unknown {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // QuotaExceededError or SecurityError — silently ignore
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readCanvasTheme(): CanvasTheme {
  const theme = safeGetItem(CANVAS_THEME_KEY)

  if (theme === 'cork' || theme === 'leather' || theme === 'linen') {
    return theme
  }

  return 'cork'
}

function isCamera(value: unknown): value is Camera {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.zoom === 'number'
  )
}

function isBlock(value: unknown): value is Block {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    BLOCK_TYPES.includes(value.type as BlockType) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    (value.heightMode === undefined || value.heightMode === 'auto' || value.heightMode === 'manual') &&
    (value.layoutGroupId === undefined || typeof value.layoutGroupId === 'string') &&
    typeof value.content === 'string' &&
    typeof value.locked === 'boolean' &&
    (typeof value.parentCollectionId === 'string' || value.parentCollectionId === null) &&
    typeof value.title === 'string' &&
    (value.createdBy === 'user' || value.createdBy === 'agent') &&
    typeof value.createdAt === 'number'
  )
}

function isBlockMap(value: unknown): value is Record<string, Block> {
  return isRecord(value) && Object.values(value).every(isBlock)
}

function blockTypeSummary(blocks: Record<string, Block>): BlockTypeSummary {
  return Object.values(blocks).reduce<BlockTypeSummary>((summary, block) => {
    summary[block.type] = (summary[block.type] ?? 0) + 1
    return summary
  }, {})
}

function createCanvasMeta(document: CanvasDocument): CanvasMeta {
  const blocks = Object.values(document.blocks)

  return {
    id: document.id,
    name: document.name,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    blockCount: blocks.length,
    blockTypes: blockTypeSummary(document.blocks),
  }
}

function isCanvasMeta(value: unknown): value is CanvasMeta {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number' &&
    typeof value.blockCount === 'number' &&
    isRecord(value.blockTypes)
  )
}

function readCanvasMetas(): CanvasMeta[] {
  const parsed = safeJsonParse(safeGetItem(CANVASES_KEY))

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.filter(isCanvasMeta)
}

function writeCanvasMetas(metas: CanvasMeta[]): void {
  safeSetItem(CANVASES_KEY, JSON.stringify(metas))
}

function readCanvasDocument(id: string): CanvasDocument | null {
  const parsed = safeJsonParse(safeGetItem(canvasKey(id)))

  if (!isRecord(parsed)) {
    return null
  }

  if (
    typeof parsed.id !== 'string' ||
    typeof parsed.name !== 'string' ||
    !isBlockMap(parsed.blocks) ||
    !isCamera(parsed.camera) ||
    typeof parsed.createdAt !== 'number' ||
    typeof parsed.updatedAt !== 'number'
  ) {
    return null
  }

  return {
    id: parsed.id,
    name: parsed.name,
    blocks: parsed.blocks,
    camera: parsed.camera,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  }
}

function writeCanvasDocument(document: CanvasDocument): void {
  safeSetItem(canvasKey(document.id), JSON.stringify(document))
}

function upsertCanvasMeta(metas: CanvasMeta[], meta: CanvasMeta): CanvasMeta[] {
  const nextMetas = metas.filter((item) => item.id !== meta.id)
  nextMetas.unshift(meta)
  return nextMetas.sort((a, b) => b.updatedAt - a.updatedAt)
}

function buildCurrentCanvasDocument(state: CanvasState, updatedAt = Date.now()): CanvasDocument | null {
  if (!state.activeCanvasId) {
    return null
  }

  const existing = readCanvasDocument(state.activeCanvasId)

  return {
    id: state.activeCanvasId,
    name: state.activeCanvasName || existing?.name || 'Untitled Canvas',
    blocks: state.blocks,
    camera: state.camera,
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
  }
}

function persistCanvasDocument(document: CanvasDocument): CanvasMeta[] {
  writeCanvasDocument(document)
  const metas = upsertCanvasMeta(readCanvasMetas(), createCanvasMeta(document))
  writeCanvasMetas(metas)
  safeSetItem(ACTIVE_CANVAS_KEY, document.id)
  return metas
}

function scheduleActiveCanvasSave(getState: () => CanvasState): void {
  if (saveTimer) {
    window.clearTimeout(saveTimer)
  }

  saveTimer = window.setTimeout(() => {
    const document = buildCurrentCanvasDocument(getState())

    if (document) {
      const metas = persistCanvasDocument(document)
      useCanvasStore.setState({ canvasMetas: metas })
    }
  }, 800)
}

function validateImportedCanvas(data: unknown): CanvasDocument | null {
  if (!isRecord(data) || !isBlockMap(data.blocks) || !isCamera(data.camera)) {
    return null
  }

  const now = Date.now()
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Imported Canvas'

  return {
    id: typeof data.id === 'string' && data.id ? data.id : crypto.randomUUID(),
    name,
    blocks: data.blocks,
    camera: data.camera,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : now,
  }
}

function rectanglesOverlap(a: Block, b: Block): boolean {
  return !(
    a.x + a.width + LAYOUT_GAP_X <= b.x ||
    b.x + b.width + LAYOUT_GAP_X <= a.x ||
    a.y + a.height + LAYOUT_GAP_Y <= b.y ||
    b.y + b.height + LAYOUT_GAP_Y <= a.y
  )
}

function hasBlockOverlaps(blocks: Block[]): boolean {
  if (blocks.length <= 1) return false

  // Sweep-line optimization: sort by x, only check nearby blocks
  const sorted = [...blocks].sort((a, b) => a.x - b.x)

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]
      // If b starts past a's right edge + gap, no further blocks can overlap a
      if (b.x > a.x + a.width + LAYOUT_GAP_X) break
      if (rectanglesOverlap(a, b)) return true
    }
  }

  return false
}

function arrangeBlocksIntoGrid(blocks: Block[]): Record<string, Pick<Block, 'x' | 'y'>> {
  if (blocks.length <= 1) {
    return {}
  }

  const orderedBlocks = [...blocks].sort((a, b) => a.createdAt - b.createdAt || a.y - b.y || a.x - b.x)
  const minX = Math.min(...orderedBlocks.map((block) => block.x))
  const minY = Math.min(...orderedBlocks.map((block) => block.y))
  const columnWidths = Array.from({ length: LAYOUT_COLUMNS }, (_, column) =>
    Math.max(0, ...orderedBlocks.filter((_, index) => index % LAYOUT_COLUMNS === column).map((block) => block.width))
  )
  const columnX = columnWidths.reduce<number[]>((positions, _width, index) => {
    if (index === 0) {
      return [minX]
    }

    return [...positions, positions[index - 1] + columnWidths[index - 1] + LAYOUT_GAP_X]
  }, [])
  const rowY: number[] = []

  return orderedBlocks.reduce<Record<string, Pick<Block, 'x' | 'y'>>>((positions, block, index) => {
    const row = Math.floor(index / LAYOUT_COLUMNS)
    const column = index % LAYOUT_COLUMNS
    const x = columnX[column]
    const y = rowY[row] ?? minY

    positions[block.id] = { x, y }
    rowY[row] = Math.max(rowY[row] ?? minY, y)
    rowY[row + 1] = Math.max(rowY[row + 1] ?? minY, y + block.height + LAYOUT_GAP_Y)

    return positions
  }, {})
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  blocks: {},
  camera: DEFAULT_CAMERA,
  canvasMetas: readCanvasMetas(),
  activeCanvasId: null,
  activeCanvasName: '',
  isAgentThinking: false,
  agentProvider: (safeGetItem('treeworld.agentProvider') as AgentProvider | null) ?? 'anthropic',
  agentApiKey: safeGetItem('treeworld.anthropicApiKey') ?? '',
  agentBaseUrl: safeGetItem('treeworld.agentBaseUrl') ?? '',
  agentModelId: safeGetItem('treeworld.agentModelId') ?? 'claude-sonnet-4-20250514',
  agentSearchApiKey: safeGetItem('treeworld.searchApiKey') ?? '',
  agentStatusText: 'Agent 思考中...',
  canvasTheme: readCanvasTheme(),
  frontBlockId: null,
  undoStack: [],
  redoStack: [],
  addBlock: (block) => {
    const prev = get().blocks
    set((state) => ({
      blocks: { ...state.blocks, [block.id]: block },
      undoStack: [...state.undoStack, prev].slice(-50),
      redoStack: [],
    }))
    scheduleActiveCanvasSave(get)
  },
  updateBlock: (id, changes) => {
    if (!get().blocks[id]) return
    const prev = get().blocks
    set((state) => ({
      blocks: {
        ...state.blocks,
        ...(state.blocks[id] ? { [id]: { ...state.blocks[id], ...changes } } : {}),
      },
      undoStack: [...state.undoStack, prev].slice(-50),
      redoStack: [],
    }))
    scheduleActiveCanvasSave(get)
  },
  deleteBlock: (id) => {
    const prev = get().blocks
    set((state) => {
      const rest = { ...state.blocks }
      delete rest[id]

      return { blocks: rest, undoStack: [...state.undoStack, prev].slice(-50), redoStack: [] }
    })
    scheduleActiveCanvasSave(get)
  },
  toggleLock: (id) => {
    const prev = get().blocks
    set((state) => {
      const block = state.blocks[id]

      if (!block) {
        return state
      }

      return {
        blocks: {
          ...state.blocks,
          [id]: { ...block, locked: !block.locked },
        },
        undoStack: [...state.undoStack, prev].slice(-50),
        redoStack: [],
      }
    })
    scheduleActiveCanvasSave(get)
  },
  moveCollection: (id, dx, dy) => {
    set((state) => {
      const blocks = { ...state.blocks }
      const collection = blocks[id]

      if (!collection || collection.locked) {
        return state
      }

      Object.values(blocks).forEach((block) => {
        if (block.id === id || block.parentCollectionId === id) {
          blocks[block.id] = {
            ...block,
            x: block.x + dx,
            y: block.y + dy,
          }
        }
      })

      return { blocks }
    })
    scheduleActiveCanvasSave(get)
  },
  fitCollectionToChildren: (id) => {
    set((state) => {
      const collection = state.blocks[id]

      if (!collection || collection.locked) {
        return state
      }

      const children = Object.values(state.blocks).filter((block) => block.parentCollectionId === id)

      if (children.length === 0) {
        return state
      }

      const minX = Math.min(...children.map((block) => block.x))
      const minY = Math.min(...children.map((block) => block.y))
      const maxX = Math.max(...children.map((block) => block.x + block.width))
      const maxY = Math.max(...children.map((block) => block.y + block.height))
      const nextX = minX - COLLECTION_PADDING
      const nextY = minY - COLLECTION_HEADER_HEIGHT
      const nextWidth = maxX - nextX + COLLECTION_PADDING
      const nextHeight = maxY - nextY + COLLECTION_PADDING

      if (
        Math.abs(collection.x - nextX) < 1 &&
        Math.abs(collection.y - nextY) < 1 &&
        Math.abs(collection.width - nextWidth) < 1 &&
        Math.abs(collection.height - nextHeight) < 1
      ) {
        return state
      }

      return {
        blocks: {
          ...state.blocks,
          [id]: {
            ...collection,
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
          },
        },
      }
    })
    scheduleActiveCanvasSave(get)
  },
  resolveLayoutOverlaps: () => {
    if (!needsLayoutResolve) return
    needsLayoutResolve = false
    set((state) => {
      const groupedBlocks = Object.values(state.blocks).reduce<Record<string, Block[]>>((groups, block) => {
        if (block.type === 'collection' || block.locked || block.createdBy !== 'agent') {
          return groups
        }

        const scopeId = block.parentCollectionId ?? 'root'
        const groupId = block.layoutGroupId ?? (block.parentCollectionId ? `collection:${scopeId}` : 'legacy-root')
        const key = `${groupId}:${scopeId}`

        groups[key] = [...(groups[key] ?? []), block]
        return groups
      }, {})

      const positionChanges = Object.values(groupedBlocks).reduce<Record<string, Pick<Block, 'x' | 'y'>>>(
        (changes, groupBlocks) => {
          if (groupBlocks.length <= 1 || !hasBlockOverlaps(groupBlocks)) {
            return changes
          }

          return { ...changes, ...arrangeBlocksIntoGrid(groupBlocks) }
        },
        {}
      )

      if (Object.keys(positionChanges).length === 0) {
        return state
      }

      return {
        blocks: Object.entries(positionChanges).reduce(
          (nextBlocks, [id, position]) => {
            const block = nextBlocks[id]

            if (!block) {
              return nextBlocks
            }

            nextBlocks[id] = { ...block, ...position }
            return nextBlocks
          },
          { ...state.blocks }
        ),
      }
    })
    scheduleActiveCanvasSave(get)
  },
  setCamera: (camera) => {
    set({ camera })
    scheduleActiveCanvasSave(get)
  },
  createCanvas: (name) => {
    const now = Date.now()
    const id = crypto.randomUUID()
    const document: CanvasDocument = {
      id,
      name: name?.trim() || `Untitled Canvas ${get().canvasMetas.length + 1}`,
      blocks: {},
      camera: DEFAULT_CAMERA,
      createdAt: now,
      updatedAt: now,
    }
    const metas = persistCanvasDocument(document)

    set({
      activeCanvasId: id,
      activeCanvasName: document.name,
      blocks: document.blocks,
      camera: document.camera,
      canvasMetas: metas,
      undoStack: [],
      redoStack: [],
    })

    return id
  },
  loadCanvas: (id) => {
    const document = readCanvasDocument(id)

    if (!document) {
      return false
    }

    safeSetItem(ACTIVE_CANVAS_KEY, id)
    set({
      activeCanvasId: id,
      activeCanvasName: document.name,
      blocks: document.blocks,
      camera: document.camera,
      canvasMetas: readCanvasMetas(),
      undoStack: [],
      redoStack: [],
    })

    return true
  },
  closeCanvas: () => {
    if (saveTimer) {
      window.clearTimeout(saveTimer)
      saveTimer = undefined
    }

    const document = buildCurrentCanvasDocument(get())

    if (document) {
      const metas = persistCanvasDocument(document)
      set({ canvasMetas: metas })
    }

    set({
      activeCanvasId: null,
      activeCanvasName: '',
      blocks: {},
      camera: DEFAULT_CAMERA,
      undoStack: [],
      redoStack: [],
    })
  },
  renameCanvas: (id, name) => {
    const nextName = name.trim()

    if (!nextName) {
      return
    }

    const document = readCanvasDocument(id)

    if (!document) {
      return
    }

    const renamedDocument = { ...document, name: nextName, updatedAt: Date.now() }
    const metas = persistCanvasDocument(renamedDocument)
    const isActive = get().activeCanvasId === id

    set({
      canvasMetas: metas,
      ...(isActive ? { activeCanvasName: nextName } : {}),
    })
  },
  deleteCanvas: (id) => {
    safeRemoveItem(canvasKey(id))
    const metas = readCanvasMetas().filter((meta) => meta.id !== id)
    writeCanvasMetas(metas)

    if (safeGetItem(ACTIVE_CANVAS_KEY) === id) {
      safeRemoveItem(ACTIVE_CANVAS_KEY)
    }

    if (get().activeCanvasId === id) {
      set({
        activeCanvasId: null,
        activeCanvasName: '',
        blocks: {},
        camera: DEFAULT_CAMERA,
        canvasMetas: metas,
        undoStack: [],
        redoStack: [],
      })
      return
    }

    set({ canvasMetas: metas })
  },
  exportCanvas: (id) => {
    const state = get()

    if (!id || id === state.activeCanvasId) {
      return buildCurrentCanvasDocument(state)
    }

    return readCanvasDocument(id)
  },
  importCanvas: (data) => {
    const document = validateImportedCanvas(data)

    if (!document) {
      return { ok: false, error: '导入失败：文件不是有效的 TreeWorld 画布 JSON。' }
    }

    const now = Date.now()
    const importedDocument: CanvasDocument = {
      ...document,
      id: crypto.randomUUID(),
      name: `${document.name} Copy`,
      createdAt: now,
      updatedAt: now,
    }
    const metas = persistCanvasDocument(importedDocument)

    set({
      activeCanvasId: importedDocument.id,
      activeCanvasName: importedDocument.name,
      blocks: importedDocument.blocks,
      camera: importedDocument.camera,
      canvasMetas: metas,
      undoStack: [],
      redoStack: [],
    })

    return { ok: true, id: importedDocument.id }
  },
  setAgentThinking: (isThinking) => set({ isAgentThinking: isThinking }),
  setAgentStatusText: (statusText) => set({ agentStatusText: statusText }),
  setAgentSettings: (settings) => {
    const nextSettings = {
      provider: settings.provider,
      apiKey: settings.apiKey.trim(),
      baseUrl: settings.baseUrl.trim(),
      modelId: settings.modelId.trim(),
      searchApiKey: settings.searchApiKey.trim(),
    }

    safeSetItem('treeworld.agentProvider', nextSettings.provider)

    if (nextSettings.apiKey) {
      safeSetItem('treeworld.anthropicApiKey', nextSettings.apiKey)
    } else {
      safeRemoveItem('treeworld.anthropicApiKey')
    }

    if (nextSettings.baseUrl) {
      safeSetItem('treeworld.agentBaseUrl', nextSettings.baseUrl)
    } else {
      safeRemoveItem('treeworld.agentBaseUrl')
    }

    if (nextSettings.modelId) {
      safeSetItem('treeworld.agentModelId', nextSettings.modelId)
    } else {
      safeRemoveItem('treeworld.agentModelId')
    }

    if (nextSettings.searchApiKey) {
      safeSetItem('treeworld.searchApiKey', nextSettings.searchApiKey)
    } else {
      safeRemoveItem('treeworld.searchApiKey')
    }

    set({
      agentProvider: nextSettings.provider,
      agentApiKey: nextSettings.apiKey,
      agentBaseUrl: nextSettings.baseUrl,
      agentModelId: nextSettings.modelId,
      agentSearchApiKey: nextSettings.searchApiKey,
    })
  },
  setCanvasTheme: (theme) => {
    safeSetItem(CANVAS_THEME_KEY, theme)
    set({ canvasTheme: theme })
  },
  undo: () => {
    const { undoStack, blocks } = get()

    if (undoStack.length === 0) {
      return
    }

    const prev = undoStack[undoStack.length - 1]
    set({
      blocks: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, blocks].slice(-50),
    })
    scheduleActiveCanvasSave(get)
  },
  redo: () => {
    const { redoStack, blocks } = get()

    if (redoStack.length === 0) {
      return
    }

    const next = redoStack[redoStack.length - 1]
    set({
      blocks: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, blocks].slice(-50),
    })
    scheduleActiveCanvasSave(get)
  },
  duplicateBlock: (id) => {
    const block = get().blocks[id]

    if (!block) {
      return
    }

    const now = Date.now()
    const duplicate: Block = {
      id: crypto.randomUUID(),
      type: block.type,
      x: block.x + 24,
      y: block.y + 24,
      width: block.width,
      height: block.height,
      heightMode: block.heightMode,
      content: block.content,
      locked: false,
      parentCollectionId: block.parentCollectionId,
      title: block.title,
      createdBy: 'user',
      createdAt: now,
    }

    get().addBlock(duplicate)
  },
  bringToFront: (id) => {
    set({ frontBlockId: id })
  },
  clearFrontBlock: () => {
    set({ frontBlockId: null })
  },
}))
