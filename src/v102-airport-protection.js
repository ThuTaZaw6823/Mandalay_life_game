/**
 * Mandalay Life V10.2 — protected airfield geometry.
 * Install LAST (after V8/V9 prototype wrappers) and BEFORE new World(scene).
 * Prevents houses, trees, lamps and their collision/door records being generated
 * inside the actual extended runway, west aircraft apron, or five heli pads.
 * The existing airport terminal, flight physics, missions, and save data remain.
 */

// Expanded V10 runway: center (402,-198), 52 wide x 760 long.
// Airport aircraft bays are to the WEST; the terminal stays east at x≈488,z≈-198.
const AIRFIELD_ZONES = Object.freeze([
  { name: 'RUNWAY + WEST APRON', minX: 258, maxX: 463, minZ: -644, maxZ: 246 },
  { name: 'HELIPAD H1', minX: 464, maxX: 528, minZ: -566, maxZ: -494 },
  { name: 'HELIPAD H2', minX: 464, maxX: 528, minZ: -459, maxZ: -384 },
  { name: 'HELIPAD H3', minX: 464, maxX: 528, minZ: -361, maxZ: -284 },
  { name: 'HELIPAD H4', minX: 464, maxX: 528, minZ: 0, maxZ: 72 },
  { name: 'HELIPAD H5', minX: 464, maxX: 528, minZ: 98, maxZ: 171 }
])

const runwayIntersects = (x, z, w = 0, d = 0, extra = 0) => AIRFIELD_ZONES.some(a =>
  x + w / 2 + extra > a.minX && x - w / 2 - extra < a.maxX &&
  z + d / 2 + extra > a.minZ && z - d / 2 - extra < a.maxZ
)

const overlapCollision = box => {
  if (![box?.minX, box?.maxX, box?.minZ, box?.maxZ].every(Number.isFinite)) return false
  return AIRFIELD_ZONES.some(a => box.maxX > a.minX && box.minX < a.maxX &&
    box.maxZ > a.minZ && box.minZ < a.maxZ)
}

export function installV102AirportProtection (World) {
  if (World.prototype.__v102AirportProtected) return
  World.prototype.__v102AirportProtected = true
  const build = World.prototype.building
  const tree = World.prototype.makeTree
  const lamp = World.prototype.makeLamp
  if (typeof build !== 'function') throw new Error('V10.2: World.building not found')
  World.prototype.building = function (x, z, w, d, ...rest) {
    if (runwayIntersects(x, z, Number(w) || 0, Number(d) || 0, 2.5)) {
      this.__v102BlockedBuildings = (this.__v102BlockedBuildings || 0) + 1
      return null
    }
    return build.call(this, x, z, w, d, ...rest)
  }
  if (typeof tree === 'function') World.prototype.makeTree = function (x, z, ...rest) {
    if (runwayIntersects(x, z, 4, 4, 1)) return
    return tree.call(this, x, z, ...rest)
  }
  if (typeof lamp === 'function') World.prototype.makeLamp = function (x, z, ...rest) {
    if (runwayIntersects(x, z, 1, 1, 1)) return
    return lamp.call(this, x, z, ...rest)
  }
}

export function finalizeV102AirportProtection (world) {
  // Safety pass catches unusual direct groups left by earlier mods. The airport
  // terminal is built from meshes at x≈488,z≈-198, safely outside every zone.
  let removed = 0
  if (world?.city?.children) {
    for (const obj of [...world.city.children]) {
      if (!obj.isGroup || !obj.position || Math.abs(obj.position.y) > 1.5) continue
      if (!runwayIntersects(obj.position.x, obj.position.z, 0, 0)) continue
      world.city.remove(obj)
      removed++
    }
  }
  // A decorative mesh without a corresponding obstacle is not enough: remove
  // stale hitboxes and doors too, so landing/taxiing cannot hit invisible houses.
  const before = Array.isArray(world.obstacles) ? world.obstacles.length : 0
  if (Array.isArray(world.obstacles)) world.obstacles = world.obstacles.filter(o => !overlapCollision(o))
  if (Array.isArray(world.tallObstacles)) world.tallObstacles = world.tallObstacles.filter(o => !overlapCollision(o))
  if (Array.isArray(world.doors)) world.doors = world.doors.filter(d => !runwayIntersects(d.x, d.z, 0, 0))
  const cleaned = before - (world.obstacles?.length || 0)
  world.__v102Airport = { blocked: world.__v102BlockedBuildings || 0, removedGroups: removed, removedHitboxes: cleaned }
  console.info('[Mandalay V10.2] Airfield protected:', world.__v102Airport)
  return world.__v102Airport
}
