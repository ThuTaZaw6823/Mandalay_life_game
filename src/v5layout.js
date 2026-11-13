export const WORLD_LIMIT = 1320
export const PALACE = Object.freeze({
  x: -18,
  z: -768,
  outerHalf: 192,
  innerHalf: 155,
  wallHalf: 141
})
export const BRIDGES = Object.freeze([
  { id: 'north', axis: 'z', x: PALACE.x, z: PALACE.z - 173.5 },
  { id: 'south', axis: 'z', x: PALACE.x, z: PALACE.z + 173.5 },
  { id: 'west', axis: 'x', x: PALACE.x - 173.5, z: PALACE.z },
  { id: 'east', axis: 'x', x: PALACE.x + 173.5, z: PALACE.z }
])
export const ROOFTOPS = Object.freeze([
  { id: 'north-business', x: -342, z: 246, h: 34 },
  { id: 'east-office', x: 282, z: 354, h: 38 },
  { id: 'south-tower', x: -276, z: 444, h: 32 },
  { id: 'river-view', x: 216, z: 516, h: 36 }
])
export const HELIPADS = Object.freeze([
  { id: 'palace', x: PALACE.x + 98, z: PALACE.z + 99, y: 0.36, r: 9.5 },
  ...ROOFTOPS.map(p => ({ id: p.id, x: p.x, z: p.z, y: p.h + 1.0, r: 8.7 }))
])
export function inPalaceSquare (x, z, margin = 0) {
  return (
    Math.abs(x - PALACE.x) < PALACE.outerHalf + margin &&
    Math.abs(z - PALACE.z) < PALACE.outerHalf + margin
  )
}
export function isMoat (x, z) {
  const dx = Math.abs(x - PALACE.x),
    dz = Math.abs(z - PALACE.z)
  return (
    dx < PALACE.outerHalf &&
    dz < PALACE.outerHalf &&
    (dx > PALACE.innerHalf || dz > PALACE.innerHalf)
  )
}
export function onBridge (x, z, halfWidth = 7.5) {
  return BRIDGES.some(b =>
    b.axis === 'z'
      ? Math.abs(x - b.x) <= halfWidth && Math.abs(z - b.z) <= 21
      : Math.abs(z - b.z) <= halfWidth && Math.abs(x - b.x) <= 21
  )
}
export function moatBlocks (x, z) {
  return isMoat(x, z) && !onBridge(x, z)
}
export function padAt (x, z, margin = 0) {
  return (
    HELIPADS.find(p => Math.hypot(p.x - x, p.z - z) <= p.r + margin) || null
  )
}
export function onPalaceRoad (x, z) {
  return (
    inPalaceSquare(x, z) &&
    (Math.abs(x - PALACE.x) < 7 || Math.abs(z - PALACE.z) < 7)
  )
}
