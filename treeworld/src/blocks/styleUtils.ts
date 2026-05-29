export function hashAngle(id: string, min: number, max: number): number {
  const hash = [...id].reduce((value, char, index) => value + char.charCodeAt(0) * (index + 1), 0)
  const ratio = (hash % 1000) / 999

  return min + (max - min) * ratio
}
