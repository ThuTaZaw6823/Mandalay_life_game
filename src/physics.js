export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
export const distance2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
export const forward = yaw => ({ x: Math.sin(yaw), z: -Math.cos(yaw) })
export const turnYaw = (yaw, turn, speed, dt) => yaw + turn * speed * dt
export const worldBounds = { minX: -1300, maxX: 1300, minZ: -1300, maxZ: 1300 }

export function circleBoxCollision (x, z, r, box) {
  const px = clamp(x, box.minX, box.maxX),
    pz = clamp(z, box.minZ, box.maxZ)
  return (x - px) ** 2 + (z - pz) ** 2 < r * r
}

export function collides (x, z, r, boxes, bounds = worldBounds) {
  if (
    x - r < bounds.minX ||
    x + r > bounds.maxX ||
    z - r < bounds.minZ ||
    z + r > bounds.maxZ
  )
    return true
  return boxes.some(box => circleBoxCollision(x, z, r, box))
}

export function box (cx, cz, width, depth, padding = 0) {
  return {
    minX: cx - width / 2 - padding,
    maxX: cx + width / 2 + padding,
    minZ: cz - depth / 2 - padding,
    maxZ: cz + depth / 2 + padding
  }
}

export function sweptMove (pos, dx, dz, r, boxes, bounds = worldBounds) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(dx, dz) / Math.max(0.35, r * 0.45))
  )
  let x = pos.x,
    z = pos.z,
    blocked = false
  for (let i = 0; i < steps; i++) {
    const nx = x + dx / steps,
      nz = z + dz / steps
    if (!collides(nx, z, r, boxes, bounds)) x = nx
    else blocked = true
    if (!collides(x, nz, r, boxes, bounds)) z = nz
    else blocked = true
  }
  return { x, z, blocked }
}

export function integrateJump (body, dt, gravity = -25, groundY = 0) {
  if (!body.grounded || body.vy > 0) {
    body.vy += gravity * dt
    body.y += body.vy * dt
  }
  if (body.y <= groundY) {
    body.y = groundY
    body.vy = 0
    body.grounded = true
  }
}

export function vehicleBounds (v, pad = 0.18) {
  const dims =
    v.kind === 'bus'
      ? [2.8, 9.4]
      : v.kind === 'motorbike'
      ? [1.2, 2.9]
      : v.kind === 'bicycle'
      ? [0.9, 2.6]
      : v.kind === 'car' || v.kind === 'police'
      ? [2.45, 4.95]
      : v.kind === 'helicopter'
      ? [2.9, 6.5]
      : v.kind === 'boat'
      ? [6.8, 18.5]
      : [4.0, 8.8]
  const w = v.width || dims[0],
    d = v.length || dims[1]
  const a = v.yaw || 0,
    c = Math.abs(Math.cos(a)),
    s = Math.abs(Math.sin(a))
  return box(v.x, v.z, c * w + s * d, s * w + c * d, pad)
}

export function boxesOverlap (a, b) {
  return (
    a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ
  )
}
