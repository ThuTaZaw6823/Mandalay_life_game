// Geographic meters for a city-sized bounded OSM export.
export const METERS_PER_DEGREE = 111320
export function lonLatToWorld(lon, lat, center) {
  if (![lon, lat, center?.lon, center?.lat].every(Number.isFinite)) {
    throw new TypeError('Coordinates and center must be finite longitude/latitude numbers')
  }
  return {
    x: (lon - center.lon) * METERS_PER_DEGREE * Math.cos(center.lat * Math.PI / 180),
    z: (center.lat - lat) * METERS_PER_DEGREE
  }
}
export function worldToLonLat(x, z, center) {
  if (![x, z, center?.lon, center?.lat].every(Number.isFinite)) throw new TypeError('Coordinates and center must be finite numbers')
  return {
    lon: center.lon + x / (METERS_PER_DEGREE * Math.cos(center.lat * Math.PI / 180)),
    lat: center.lat - z / METERS_PER_DEGREE
  }
}
