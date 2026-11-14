const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export class TouchControls {
  constructor () {
    this.enabled = Boolean(
      window.matchMedia?.('(any-pointer: coarse)').matches ||
        window.matchMedia?.('(pointer: coarse)').matches ||
        navigator.maxTouchPoints > 0 ||
        'ontouchstart' in window
    )

    this.move = { x: 0, y: 0 }
    this.camera = { x: 0, y: 0 }
    this.buttons = {
      sprint: false,
      jump: false
    }

    this.queue = new Set()

    this.joystick = document.getElementById('touchJoystick')
    this.knob = document.getElementById('joystickKnob')
    this.cameraPad = document.getElementById('touchCamera')

    this.stickPointer = null
    this.cameraPointer = null
    this.cameraLast = { x: 0, y: 0 }

    if (this.enabled) this.bind()
  }

  bind () {
    const stick = this.joystick

    if (stick) {
      stick.addEventListener('pointerdown', event => {
        if (this.stickPointer !== null) return

        event.preventDefault()
        this.stickPointer = event.pointerId
        stick.setPointerCapture(event.pointerId)
        this.updateStick(event)
      })

      stick.addEventListener('pointermove', event => {
        if (event.pointerId !== this.stickPointer) return

        event.preventDefault()
        this.updateStick(event)
      })

      const stopStick = event => {
        if (event.pointerId !== this.stickPointer) return

        this.stickPointer = null
        this.move.x = 0
        this.move.y = 0

        if (this.knob) {
          this.knob.style.transform = 'translate(0px, 0px)'
        }
      }

      stick.addEventListener('pointerup', stopStick)
      stick.addEventListener('pointercancel', stopStick)
      stick.addEventListener('lostpointercapture', stopStick)
    }

    const pad = this.cameraPad

    if (pad) {
      pad.addEventListener('pointerdown', event => {
        if (this.cameraPointer !== null) return

        event.preventDefault()
        this.cameraPointer = event.pointerId
        this.cameraLast.x = event.clientX
        this.cameraLast.y = event.clientY

        pad.setPointerCapture(event.pointerId)
      })

      pad.addEventListener('pointermove', event => {
        if (event.pointerId !== this.cameraPointer) return

        event.preventDefault()

        this.camera.x += event.clientX - this.cameraLast.x
        this.camera.y += event.clientY - this.cameraLast.y

        this.cameraLast.x = event.clientX
        this.cameraLast.y = event.clientY
      })

      const stopCamera = event => {
        if (event.pointerId === this.cameraPointer) {
          this.cameraPointer = null
        }
      }

      pad.addEventListener('pointerup', stopCamera)
      pad.addEventListener('pointercancel', stopCamera)
      pad.addEventListener('lostpointercapture', stopCamera)
    }

    this.bindHold('btnSprint', 'sprint')
    this.bindHold('btnJump', 'jump')

    for (const [id, key] of [
      ['btnInteract', 'interact'],
      ['btnDelivery', 'delivery'],
      ['btnWeather', 'weather'],
      ['btnAvatar', 'avatar']
    ]) {
      document.getElementById(id)?.addEventListener('pointerdown', event => {
        event.preventDefault()
        this.queue.add(key)
      })
    }

    window.addEventListener('blur', () => this.reset())

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset()
    })
  }

  bindHold (id, key) {
    const button = document.getElementById(id)
    if (!button) return

    let currentPointer = null

    const release = event => {
      if (event.pointerId !== currentPointer) return

      currentPointer = null
      this.buttons[key] = false
      button.classList.remove('pressed')
    }

    button.addEventListener('pointerdown', event => {
      if (currentPointer !== null) return

      event.preventDefault()
      currentPointer = event.pointerId

      this.buttons[key] = true
      button.classList.add('pressed')
      button.setPointerCapture(event.pointerId)
    })

    button.addEventListener('pointerup', release)
    button.addEventListener('pointercancel', release)
    button.addEventListener('lostpointercapture', release)
  }

  updateStick (event) {
    if (!this.joystick) return

    const rect = this.joystick.getBoundingClientRect()

    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.38)

    const deltaX = event.clientX - (rect.left + rect.width / 2)

    const deltaY = event.clientY - (rect.top + rect.height / 2)

    const length = Math.hypot(deltaX, deltaY)

    const scale = length > radius ? radius / length : 1

    const x = deltaX * scale
    const y = deltaY * scale

    this.move.x = clamp(x / radius, -1, 1)
    this.move.y = clamp(y / radius, -1, 1)

    if (this.knob) {
      this.knob.style.transform = `translate(${x}px, ${y}px)`
    }
  }

  getMoveState () {
    return {
      forward: this.move.y < -0.18,
      back: this.move.y > 0.18,
      left: this.move.x < -0.18,
      right: this.move.x > 0.18,
      fast: this.buttons.sprint,
      jump: this.buttons.jump,
      analogX: this.move.x,
      analogY: this.move.y
    }
  }

  consumeCameraDelta () {
    const delta = { ...this.camera }

    this.camera.x = 0
    this.camera.y = 0

    return delta
  }

  consumeClicks () {
    const result = {
      interact: this.queue.has('interact'),
      delivery: this.queue.has('delivery'),
      weather: this.queue.has('weather'),
      avatar: this.queue.has('avatar')
    }

    this.queue.clear()
    return result
  }

  reset () {
    this.stickPointer = null
    this.cameraPointer = null

    this.move.x = 0
    this.move.y = 0
    this.camera.x = 0
    this.camera.y = 0

    this.buttons.sprint = false
    this.buttons.jump = false
    this.queue.clear()

    if (this.knob) {
      this.knob.style.transform = 'translate(0px, 0px)'
    }

    for (const id of ['btnSprint', 'btnJump']) {
      document.getElementById(id)?.classList.remove('pressed')
    }
  }
}
