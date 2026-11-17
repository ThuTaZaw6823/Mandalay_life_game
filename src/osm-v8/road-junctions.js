/** Junctions are computed from shared OSM vertices, NOT guessed street coordinates. */
export function findMappedJunctions(roads) {
  const nodes = new Map()
  const driveable = new Set(['motorway','trunk','primary','secondary','tertiary',
    'residential','unclassified','service','living_street','primary_link','secondary_link'])
  const register = (point, other, kind) => {
    const key = `${point[0].toFixed(2)},${point[1].toFixed(2)}`
    if (!nodes.has(key)) nodes.set(key, { point, neighbors: new Set(), approaches: [] })
    const record = nodes.get(key)
    record.neighbors.add(`${other[0].toFixed(2)},${other[1].toFixed(2)}`)
    record.approaches.push({other, kind})
  }
  for (const road of roads) {
    if (!driveable.has(road.kind)) continue
    for (let i = 1; i < road.path.length; i++) {
      const a = road.path[i - 1], b = road.path[i]
      const length = Math.hypot(b[0]-a[0],b[1]-a[1])
      if (length < .2 || length > 475) continue
      register(a,b,road.kind); register(b,a,road.kind)
    }
  }
  return [...nodes.values()].filter(node => node.neighbors.size >= 3)
}

