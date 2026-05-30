import { describe, it, expect } from 'vitest'
import { screenToWorld } from '../canvas/camera'
import type { Camera } from '../store'

describe('screenToWorld', () => {
  const identityCamera: Camera = { x: 0, y: 0, zoom: 1 }

  it('should return same coordinates at identity camera', () => {
    const result = screenToWorld(100, 200, identityCamera)
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })

  it('should account for camera pan', () => {
    const camera: Camera = { x: 50, y: 30, zoom: 1 }
    const result = screenToWorld(100, 200, camera)
    expect(result.x).toBe(50)
    expect(result.y).toBe(170)
  })

  it('should account for zoom', () => {
    const camera: Camera = { x: 0, y: 0, zoom: 2 }
    const result = screenToWorld(200, 400, camera)
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })

  it('should account for pan and zoom together', () => {
    const camera: Camera = { x: 100, y: 50, zoom: 2 }
    const result = screenToWorld(300, 250, camera)
    expect(result.x).toBe(100) // (300 - 100) / 2
    expect(result.y).toBe(100) // (250 - 50) / 2
  })

  it('should handle zoom < 1', () => {
    const camera: Camera = { x: 0, y: 0, zoom: 0.5 }
    const result = screenToWorld(100, 200, camera)
    expect(result.x).toBe(200)
    expect(result.y).toBe(400)
  })
})
