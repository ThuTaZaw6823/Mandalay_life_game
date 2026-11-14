import * as THREE from 'three'
import {
  WEATHER_MODES,
  nextWeather,
  scheduledWeather,
  effectiveWeather,
  weatherLabel
} from './weatherstate.js'

export {
  WEATHER_MODES,
  nextWeather,
  scheduledWeather,
  effectiveWeather,
  weatherLabel
}

function particleTexture (kind) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')

  if (kind === 'snow') {
    const gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 31)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.28, 'rgba(255,255,255,0.88)')
    gradient.addColorStop(0.65, 'rgba(255,255,255,0.35)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
  } else {
    const gradient = ctx.createLinearGradient(0, 8, 0, 57)
    gradient.addColorStop(0, 'rgba(220,242,255,0)')
    gradient.addColorStop(0.25, 'rgba(220,242,255,0.45)')
    gradient.addColorStop(0.75, 'rgba(220,242,255,0.8)')
    gradient.addColorStop(1, 'rgba(220,242,255,0)')
    ctx.strokeStyle = gradient
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(36, 8)
    ctx.lineTo(28, 57)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class WeatherSystem {
  constructor (scene) {
    this.scene = scene
    this.mode = 'auto'
    this.kind = 'clear'
    this.elapsed = 0
    this.flash = 0
    this.thunderCooldown = 7
    this.audio = null

    const mobile = window.matchMedia?.('(pointer: coarse)')?.matches ?? false

    this.rainCount = mobile ? 650 : 1300
    this.snowCount = mobile ? 350 : 800

    this.rainPositions = new Float32Array(this.rainCount * 3)
    this.snowPositions = new Float32Array(this.snowCount * 3)
    this.rainSpeeds = new Float32Array(this.rainCount)
    this.snowSpeeds = new Float32Array(this.snowCount)

    this.makeParticleCloud(
      'rain',
      this.rainPositions,
      this.rainSpeeds,
      this.rainCount
    )

    this.makeParticleCloud(
      'snow',
      this.snowPositions,
      this.snowSpeeds,
      this.snowCount
    )

    this.lightningLight = new THREE.PointLight(0xd7edff, 0, 500, 1.5)
    this.scene.add(this.lightningLight)
  }

  makeParticleCloud (kind, positions, speeds, count) {
    const rng = n => {
      const v = Math.sin(n * 81.7 + 11.3) * 43758.5453
      return v - Math.floor(v)
    }

    for (let i = 0; i < count; i++) {
      const j = i * 3

      positions[j] = (rng(i + 37) - 0.5) * 110
      positions[j + 1] = 4 + rng(i + 738) * 50
      positions[j + 2] = (rng(i + 273) - 0.5) * 110

      speeds[i] =
        kind === 'rain' ? 24 + rng(i + 921) * 15 : 1.8 + rng(i + 921) * 2.5
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      map: particleTexture(kind),
      size: kind === 'rain' ? 15 : 5,
      sizeAttenuation: false,
      transparent: true,
      opacity: kind === 'rain' ? 0.72 : 0.82,
      alphaTest: 0.025,
      depthWrite: false,
      fog: true
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    points.visible = false

    this.scene.add(points)
    this[kind] = {
      points,
      positions,
      speeds,
      count
    }
  }

  setMode (mode) {
    if (WEATHER_MODES.includes(mode)) this.mode = mode
    this.kind = effectiveWeather(this.mode, this.elapsed)
    return this.mode
  }

  get label () {
    return weatherLabel(this.kind) + (this.mode === 'auto' ? ' · AUTO' : '')
  }

  unlockAudio () {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext

      if (!AudioContextClass) return
      if (!this.audio) this.audio = new AudioContextClass()

      if (this.audio.state === 'suspended') {
        this.audio.resume().catch(() => {})
      }
    } catch {
      // Audio is optional.
    }
  }

  thunder () {
    try {
      if (!this.audio || this.audio.state !== 'running') return

      const seconds = 1.2
      const samples = Math.floor(this.audio.sampleRate * seconds)
      const buffer = this.audio.createBuffer(1, samples, this.audio.sampleRate)
      const output = buffer.getChannelData(0)

      let low = 0
      for (let i = 0; i < samples; i++) {
        low = low * 0.98 + (Math.random() * 2 - 1) * 0.02
        output[i] = low
      }

      const source = this.audio.createBufferSource()
      const filter = this.audio.createBiquadFilter()
      const gain = this.audio.createGain()

      source.buffer = buffer
      filter.type = 'lowpass'
      filter.frequency.value = 190

      const now = this.audio.currentTime
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.26, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds)

      source.connect(filter)
      filter.connect(gain)
      gain.connect(this.audio.destination)
      source.start(now)
      source.stop(now + seconds)
    } catch {
      // Sound errors never stop gameplay.
    }
  }

  update (dt, player, timecycle) {
    this.elapsed += dt

    const previous = this.kind
    this.kind = effectiveWeather(this.mode, this.elapsed)

    this.rain.points.visible = this.kind === 'rain' || this.kind === 'storm'
    this.snow.points.visible = this.kind === 'snow'

    for (const key of ['rain', 'snow']) {
      const effect = this[key]
      if (!effect.points.visible) continue

      const positions = effect.positions

      for (let i = 0; i < effect.count; i++) {
        const j = i * 3

        positions[j + 1] -= effect.speeds[i] * dt
        positions[j] += (key === 'rain' ? 5 : 1.1) * dt

        if (positions[j + 1] < -3) {
          positions[j + 1] = 50 + Math.random() * 7
          positions[j] = (Math.random() - 0.5) * 110
          positions[j + 2] = (Math.random() - 0.5) * 110
        }

        if (positions[j] > 55) {
          positions[j] -= 110
        }
      }

      effect.points.position.set(player.x, player.y, player.z)

      effect.points.geometry.attributes.position.needsUpdate = true
    }

    this.flash = Math.max(0, this.flash - dt * 5)
    this.thunderCooldown -= dt

    if (this.kind === 'storm' && this.thunderCooldown <= 0) {
      this.flash = 1
      this.thunderCooldown = 7 + Math.random() * 8
      this.thunder()
    }

    this.lightningLight.intensity = this.flash * 95
    this.lightningLight.position.set(
      player.x + 25,
      player.y + 85,
      player.z - 18
    )

    if (timecycle) {
      const overcast =
        this.kind === 'storm'
          ? 0.75
          : this.kind === 'rain'
          ? 0.45
          : this.kind === 'snow'
          ? 0.25
          : 0

      timecycle.sun.intensity *= 1 - overcast * 0.35
      timecycle.hemi.intensity *= 1 - overcast * 0.12

      if (timecycle.moonLight) {
        timecycle.moonLight.intensity *= 1 - overcast * 0.25
      }

      const night = timecycle.night > 0.5
      const skyTint = new THREE.Color(night ? 0x30425a : 0x788d99)

      timecycle.scene.background.lerp(skyTint, overcast * (night ? 0.2 : 0.42))
      timecycle.scene.fog.color.copy(timecycle.scene.background)

      if (this.flash > 0.02) {
        timecycle.scene.background.lerp(
          new THREE.Color(0xc2d8ef),
          this.flash * 0.35
        )
        timecycle.scene.fog.color.copy(timecycle.scene.background)
      }

      if (overcast > 0.3) {
        timecycle.stars.visible = false
        timecycle.moon.visible = false
      }
    }

    return previous !== this.kind
  }
}
