// Shared layout math for the canvas renderer (store.ts) and the agent
// command engine (commands.ts). Single source of truth for grid layout,
// collection fitting, and spacing constants.

export const COLLECTION_PADDING = 24
export const COLLECTION_HEADER_HEIGHT = 42
export const LAYOUT_GAP_X = 36
export const LAYOUT_GAP_Y = 34
export const LAYOUT_COLUMNS = 2

export interface GridBlock {
  id: string
  x: number
  y: number
  width: number
  height: number
  createdAt: number
}

export interface GridPosition {
  x: number
  y: number
}

export interface ArrangeOptions {
  sort?: boolean
}

export function arrangeIntoGrid(blocks: GridBlock[], options: ArrangeOptions = {}): Map<string, GridPosition> {
  if (blocks.length <= 1) {
    return new Map()
  }

  const orderedBlocks =
    options.sort === false
      ? [...blocks]
      : [...blocks].sort((a, b) => a.createdAt - b.createdAt || a.y - b.y || a.x - b.x)

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
  const result = new Map<string, GridPosition>()

  orderedBlocks.forEach((block, index) => {
    const row = Math.floor(index / LAYOUT_COLUMNS)
    const column = index % LAYOUT_COLUMNS
    const x = columnX[column]
    const y = rowY[row] ?? minY

    result.set(block.id, { x, y })
    rowY[row] = Math.max(rowY[row] ?? minY, y)
    rowY[row + 1] = Math.max(rowY[row + 1] ?? minY, y + block.height + LAYOUT_GAP_Y)
  })

  return result
}

export interface CollectionBounds {
  x: number
  y: number
  width: number
  height: number
}

export function computeCollectionBounds(
  children: Array<{ x: number; y: number; width: number; height: number }>
): CollectionBounds | null {
  if (children.length === 0) {
    return null
  }

  const minX = Math.min(...children.map((block) => block.x))
  const minY = Math.min(...children.map((block) => block.y))
  const maxX = Math.max(...children.map((block) => block.x + block.width))
  const maxY = Math.max(...children.map((block) => block.y + block.height))
  const x = minX - COLLECTION_PADDING
  const y = minY - COLLECTION_HEADER_HEIGHT

  return {
    x,
    y,
    width: maxX - x + COLLECTION_PADDING,
    height: maxY - y + COLLECTION_PADDING,
  }
}
