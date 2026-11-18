/**
 * Mandalay Life V10.6 — vehicle / flight safety rules.
 * Flight HUD altitude uses game scale: 100 vertical game units = 1 km.
 * Velocities are still interpreted as m/s for the mph HUD conversion.
 * 50 mph takeoff = 22.352 m/s; max 200 mph = 89.408 m/s.
 * All speed constraints are gameplay rules, not real aircraft physics.
 */
export const FLIGHT_RULES = Object.freeze({
  takeoffMph: 50,
  cruiseMph: 200, // maximum speed, not a forced constant speed
  takeoffSpeed: 50 * 0.44704,
  cruiseSpeed: 200 * 0.44704,
  gearAltitude: 50, // 0.50 km in the game (100 altitude units = 1 km)
  maxAltitude: 900,
  gameHeightPerKm: 100,
  planeAccelMphPerSecond: 25, // 0 -> 50 mph in ~2s; 0 -> 200 in ~8s
  planeDecelMphPerSecond: 18,
  planeBrakeMphPerSecond: 42,
  planeGroundCoastMphPerSecond: 3, // rolling friction; landing never sets speed to zero
  planeLandingDecelMphPerSecond: 32,
  planeMinAirborneMph: 35, // preserved normal flight floor
  planeMaxMph: 200,
  planeLandingMph: 25, // approach speed, intentionally below normal flight floor
  planeLandingSpeed: 25 * 0.44704,
  touchdownRearHoldSeconds: 0.55,
  touchdownNoseLowerSeconds: 0.9,
  touchdownNoseUpRadians: 0.18,
  touchdownRearHeight: 0.24,
  heliHorizontalClearance: 0.5,
  stopThreshold: 0.075
})

// ML_V1061_SMOOTH_FLIGHT: flight HUD is in game km, NOT real metres.
export function gameAltitudeKm (altitude) {
  return Math.max(0, Number(altitude) || 0) / FLIGHT_RULES.gameHeightPerKm
}

// ML_V1062_PLANE_SPEED / ML_V1063_ROLLING_LANDING:
// All velocities internal m/s, HUD in mph. Takeoff >=50 mph, cap 200 mph.
// Airborne neutral holds speed (at least 35 mph); SHIFT lands at <=25 mph.
// Grounded aircraft coast with friction and retain speed on touchdown.
export function planeTargetSpeedMph (vehicle, input) {
  const airborne = (vehicle.alt || 0) > 0.3
  const current = Math.max(0, vehicleSpeedMph(vehicle))
  if (!airborne) return input.forward ? FLIGHT_RULES.planeMaxMph : 0
  if (input.fast && !input.jump) return FLIGHT_RULES.planeLandingMph
  if (input.forward) return FLIGHT_RULES.planeMaxMph
  if (input.back) return FLIGHT_RULES.planeMinAirborneMph
  return Math.max(FLIGHT_RULES.planeMinAirborneMph,
    Math.min(FLIGHT_RULES.planeMaxMph, current))
}

/**
 * Two-stage landing-contact animation (rear/main wheels, then front/nose wheel).
 * Uses the aircraft's existing 3D pitch and altitude, no extra models.
 * This is visual/gameplay contact staging, NOT a per-wheel physics simulation.
 * `desiredAltitude` has already obeyed the <=25 mph touchdown gate.
 */
export function advancePlaneTouchdown (v, desiredAltitude, floor, climbInput, dt) {
  const step = Math.max(0, Math.min(0.1, Number(dt) || 0))
  const rearHeight = FLIGHT_RULES.touchdownRearHeight
  const stage = v.touchdownStage
  if (stage === 'REAR_GEAR' || stage === 'NOSE_GEAR') {
    v.touchdownElapsed = (v.touchdownElapsed || 0) + step
    if (stage === 'REAR_GEAR') {
      v.touchdownPitch = FLIGHT_RULES.touchdownNoseUpRadians
      if (v.touchdownElapsed < FLIGHT_RULES.touchdownRearHoldSeconds) {
        return floor + rearHeight
      }
      v.touchdownStage = 'NOSE_GEAR'
      v.touchdownElapsed = 0
    }
    const progress = Math.min(1,
      (v.touchdownElapsed || 0) / FLIGHT_RULES.touchdownNoseLowerSeconds)
    v.touchdownPitch = FLIGHT_RULES.touchdownNoseUpRadians * (1 - progress)
    if (progress >= 1) {
      v.touchdownStage = 'ROLLOUT'
      v.touchdownPitch = 0
      return floor
    }
    return floor + rearHeight * (1 - progress)
  }
  // Begin wheel contact only when descending gently at/under approach speed.
  const touchesRear = climbInput < 0 &&
    v.alt > floor + rearHeight + 0.05 &&
    desiredAltitude <= floor + rearHeight + 0.05 &&
    v.velocity <= FLIGHT_RULES.planeLandingSpeed + 0.001
  if (touchesRear) {
    v.touchdownStage = 'REAR_GEAR'
    v.touchdownElapsed = 0
    v.touchdownPitch = FLIGHT_RULES.touchdownNoseUpRadians
    return floor + rearHeight
  }
  if (v.alt > floor + 0.5) {
    v.touchdownStage = null
  } else if (v.touchdownStage === 'ROLLOUT') {
    v.touchdownStage = 'GROUND'
  }
  v.touchdownPitch = 0
  return desiredAltitude
}

/** Smooth throttle, braking and landing deceleration; no frame jumps. */
export function smoothPlaneVelocity (current, target, dt, overrideMphPerSecond = null) {
  const from = Math.max(0, Number(current) || 0)
  const to = Math.max(0, Number(target) || 0)
  // A suspended background tab must not create a huge one-frame speed jump.
  const stepSeconds = Math.max(0, Math.min(0.1, Number(dt) || 0))
  const mphPerSecond = overrideMphPerSecond ?? (
    to > from ? FLIGHT_RULES.planeAccelMphPerSecond
      : FLIGHT_RULES.planeDecelMphPerSecond
  )
  const change = Math.max(0, mphPerSecond) * 0.44704 * stepSeconds
  if (Math.abs(to - from) <= change) return to
  return from + Math.sign(to - from) * change
}

export function vehicleSpeedMph (vehicle) {
  return Math.abs(Number(vehicle?.velocity) || 0) / 0.44704
}

export function isVehicleStopped (vehicle) {
  return Math.abs(Number(vehicle?.velocity) || 0) <= FLIGHT_RULES.stopThreshold
}

/**
 * V10.6.1 uses the same V10.6 fixed-wing GLBs have independently named landing_gear_* nodes.
 * Pre-V10.6 aircraft are supported best-effort through wheelSpinners.
 * A changed GLB scene is rediscovered after the asynchronous GLTF load.
 */
export function syncLandingGear (vehicle) {
  if (vehicle.kind !== 'plane' || !vehicle.modelHolder) return
  const model = vehicle.modelHolder.children.find(
    child => child.name?.startsWith('Mandalay_V10_GLTF_')
  ) || vehicle.modelHolder
  if (vehicle.__v106GearModel !== model) {
    const nodes = []
    model.traverse(child => {
      if (child.name?.startsWith('landing_gear_')) nodes.push(child)
    })
    vehicle.__v106GearModel = model
    vehicle.__v106GearNodes = nodes
  }
  const extended = (vehicle.alt || 0) < FLIGHT_RULES.gearAltitude
  for (const gear of vehicle.__v106GearNodes || []) gear.visible = extended
  // Older procedural aircraft have separately constructed wheel groups.
  for (const wheel of vehicle.wheelSpinners || []) wheel.visible = extended
  vehicle.gearExtended = extended
  vehicle.gearVisualSupported = (vehicle.__v106GearNodes || []).length > 0 ||
    (vehicle.wheelSpinners || []).length > 0
}
