import * as THREE from 'three'

import {
  START_TIME_SECONDS,
  gameSeconds,
  hourOfDay,
  daylightPhase,
  nightBlend
} from './gameclock.js'
const NIGHT = new THREE.Color('#09162f')
const MORNING = new THREE.Color('#f0af83')
const DAY = new THREE.Color('#abd9ea')
const SUNSET = new THREE.Color('#df806e')
function smooth (a, b, t) {
  const u = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1)
  return u * u * (3 - 2 * u)
}
function colorOfHour (h) {
  if (h < 5) return NIGHT.clone()
  if (h < 7) return NIGHT.clone().lerp(MORNING, smooth(5, 7, h))
  if (h < 10) return MORNING.clone().lerp(DAY, smooth(7, 10, h))
  if (h < 16) return DAY.clone()
  if (h < 18.5) return DAY.clone().lerp(SUNSET, smooth(16, 18.5, h))
  if (h < 20) return SUNSET.clone().lerp(NIGHT, smooth(18.5, 20, h))
  return NIGHT.clone()
}
export class TimeCycle {
  constructor (scene, renderer, sun, hemi, start = START_TIME_SECONDS) {
    this.scene = scene
    this.renderer = renderer
    this.sun = sun
    this.hemi = hemi
    this.elapsed = 0
    this.start = start
    this.time = start
    this.hour = hourOfDay(start)
    this.phase = 'MORNING'
    this.night = 0
    const starCount = 560,
      points = new Float32Array(starCount * 3),
      random = n => Math.sin(n * 12.9898 + 38.3) * 43758.5453
    for (let i = 0; i < starCount; i++) {
      const a = (random(i) - Math.floor(random(i))) * Math.PI * 2
      const t = 0.16 + (random(i + 114) - Math.floor(random(i + 114))) * 1.17
      const r = 470
      points[i * 3] = Math.cos(a) * Math.sin(t) * r
      points[i * 3 + 1] = Math.cos(t) * r + 135
      points[i * 3 + 2] = Math.sin(a) * Math.sin(t) * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(points, 3))
    this.stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xf6f5ef,
        size: 1.8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: false
      })
    )
    this.stars.frustumCulled = false
    scene.add(this.stars)
    this.moon = new THREE.Mesh(
      new THREE.SphereGeometry(9, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff3ca })
    )
    scene.add(this.moon)
    this.update(0, { x: 0, y: 0, z: 0 })
  }
  update (dt, player) {
    this.elapsed += dt
    this.time = gameSeconds(this.elapsed, this.start)
    this.hour = hourOfDay(this.time)
    this.phase = daylightPhase(this.hour)
    this.night = nightBlend(this.hour)
    const h = this.hour,
      night = this.night
    const c = colorOfHour(h)
    this.scene.background.copy(c)
    this.scene.fog.color.copy(c)
    this.scene.fog.density = 0.00072 + night * 0.00095
    const elevation = Math.max(-0.17, Math.sin(((h - 6) * Math.PI) / 12))
    const azimuth = ((h - 6) * Math.PI) / 12
    this.sun.position.set(
      player.x + Math.cos(azimuth) * 160,
      player.y + Math.max(10, elevation * 210),
      player.z - Math.sin(azimuth) * 140
    )
    this.sun.target.position.set(player.x, player.y, player.z)
    this.sun.target.updateMatrixWorld()
    this.sun.color.copy(
      new THREE.Color(
        h >= 16 && h < 19 ? '#ff9b6d' : h < 8 ? '#ffcb99' : '#ffe6c3'
      )
    )
    this.sun.intensity =
      2.4 * (1 - night) * Math.max(0.16, Math.min(1, (elevation + 0.15) * 1.5))
    this.hemi.intensity = 0.32 + 1.85 * (1 - night)
    this.stars.position.set(player.x, 0, player.z)
    this.stars.material.opacity = Math.max(0, night - 0.18)
    this.stars.visible = night > 0.2
    this.moon.visible = night > 0.28
    this.moon.position.set(player.x - 135, 190 + player.y, player.z - 175)
    // A dim moonlit exposure, but not a totally black unplayable city.
    this.renderer.toneMappingExposure = 1.08 + 0.25 * (1 - night)
  }
}
