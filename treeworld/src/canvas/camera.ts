interface Camera {
  x: number
  y: number
  zoom: number
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  }
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  }
}
