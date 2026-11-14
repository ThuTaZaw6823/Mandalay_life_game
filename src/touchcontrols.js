const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export class TouchControls {
  constructor () {
    this.enabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    this.move = { x: 0, y: 0 }
    this.camera = { x: 0, y: 0 }
    this.buttons = {
      sprint: false,
      jump: false,
      interact: false,
      delivery: false,
      weather: false,
      avatar: false
    }

    this.joystick = document.getElementById('touchJoystick')
    this.knob = document.getElementById('joystickKnob')
    this.cameraPad = document.getElementById('touchCamera')

    this.btnSprint = document.getElementById('btnSprint')
    this.btnJump = document.getElementById('btnJump')
    this.btnInteract = document.getElementById('btnInteract')
    this.btnDelivery = document.getElementById('btnDelivery')
    this.btnWeather = document.getElementById('btnWeather')
    this.btnAvatar = document.getElementById('btnAvatar')

    this.activeStickId = null
    this.activeCamId = null
    this.stickCenter = { x: 0, y: 0 }
    this.stickRadius = 46
    this.lastCam = null

    if (this.enabled) this.bind()
  }

  bind () {
    if (this.joystick) {
      this.joystick.addEventListener('pointerdown', this.onStickDown, {
        passive: false
      })
      window.addEventListener('pointermove', this.onStickMove, {
        passive: false
      })
      window.addEventListener('pointerup', this.onStickUp, { passive: false })
      window.addEventListener('pointercancel', this.onStickUp, {
        passive: false
      })
    }

    if (this.cameraPad) {
      this.cameraPad.addEventListener('pointerdown', this.onCamDown, {
        passive: false
      })
      window.addEventListener('pointermove', this.onCamMove, { passive: false })
      window.addEventListener('pointerup', this.onCamUp, { passive: false })
      window.addEventListener('pointercancel', this.onCamUp, { passive: false })
    }

    this.bindButton(this.btnSprint, 'sprint', true)
    this.bindButton(this.btnJump, 'jump', true)
    this.bindButton(this.btnInteract, 'interact', false)
    this.bindButton(this.btnDelivery, 'delivery', false)
    this.bindButton(this.btnWeather, 'weather', false)
    this.bindButton(this.btnAvatar, 'avatar', false)
  }

  bindButton (node, key, hold) {
    if (!node) return

    if (hold) {
      node.addEventListener(
        'pointerdown',
        e => {
          e.preventDefault()
          this.buttons[key] = true
          node.classList.add('pressed')
        },
        { passive: false }
      )

      const off = () => {
        this.buttons[key] = false
        node.classList.remove('pressed')
      }

      node.addEventListener('pointerup', off)
      node.addEventListener('pointercancel', off)
      node.addEventListener('pointerleave', off)
    } else {
      node.addEventListener(
        'pointerdown',
        e => {
          e.preventDefault()
          this.buttons[key] = true
          node.classList.add('pressed')
          setTimeout(() => {
            this.buttons[key] = false
            node.classList.remove('pressed')
          }, 120)
        },
        { passive: false }
      )
    }
  }

  onStickDown = e => {
    if (this.activeStickId !== null) return
    e.preventDefault()
    this.activeStickId = e.pointerId
    const rect = this.joystick.getBoundingClientRect()
    this.stickCenter.x = rect.left + rect.width / 2
    this.stickCenter.y = rect.top + rect.height / 2
    this.updateStick(e.clientX, e.clientY)
  }

  onStickMove = e => {
    if (e.pointerId !== this.activeStickId) return
    e.preventDefault()
    this.updateStick(e.clientX, e.clientY)
  }

  onStickUp = e => {
    if (e.pointerId !== this.activeStickId) return
    e.preventDefault()
    this.activeStickId = null
    this.move.x = 0
    this.move.y = 0
    if (this.knob) {
      this.knob.style.transform = 'translate(0px, 0px)'
    }
  }

  updateStick (x, y) {
    const dx = x - this.stickCenter.x
    const dy = y - this.stickCenter.y
    const len = Math.hypot(dx, dy)
    const max = this.stickRadius
    const scale = len > max ? max / len : 1
    const sx = dx * scale
    const sy = dy * scale

    this.move.x = clamp(sx / max, -1, 1)
    this.move.y = clamp(sy / max, -1, 1)

    if (this.knob) {
      this.knob.style.transform = `translate(${sx}px, ${sy}px)`
    }
  }

  onCamDown = e => {
    if (this.activeCamId !== null) return
    e.preventDefault()
    this.activeCamId = e.pointerId
    this.lastCam = { x: e.clientX, y: e.clientY }
  }

  onCamMove = e => {
    if (e.pointerId !== this.activeCamId || !this.lastCam) return
    e.preventDefault()
    const dx = e.clientX - this.lastCam.x
    const dy = e.clientY - this.lastCam.y
    this.camera.x += dx
    this.camera.y += dy
    this.lastCam = { x: e.clientX, y: e.clientY }
  }

  onCamUp = e => {
    if (e.pointerId !== this.activeCamId) return
    e.preventDefault()
    this.activeCamId = null
    this.lastCam = null
  }

  consumeCameraDelta () {
    const out = { ...this.camera }
    this.camera.x = 0
    this.camera.y = 0
    return out
  }

  consumeClicks () {
    const out = {
      interact: this.buttons.interact,
      delivery: this.buttons.delivery,
      weather: this.buttons.weather,
      avatar: this.buttons.avatar
    }
    this.buttons.interact = false
    this.buttons.delivery = false
    this.buttons.weather = false
    this.buttons.avatar = false
    return out
  }

  getMoveState () {
    return {
      forward: this.move.y < -0.2,
      back: this.move.y > 0.2,
      left: this.move.x < -0.2,
      right: this.move.x > 0.2,
      fast: this.buttons.sprint,
      jump: this.buttons.jump,
      analogX: this.move.x,
      analogY: this.move.y
    }
  }
}
