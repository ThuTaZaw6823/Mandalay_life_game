import * as THREE from 'three'

// Mandalay Life V10.4 — procedural, articulated streetwear characters.
// These are stylized, original Three.js interpretations of the concept designs.
// They reuse V7's existing joints/animation rig; no external network assets.

function material(hex, roughness = 0.83, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness, metalness })
}

function add(parent, geometry, color, xyz = [0, 0, 0], scale = [1, 1, 1], rotation) {
  const mesh = new THREE.Mesh(geometry, typeof color === 'number' ? material(color) : color)
  mesh.position.set(...xyz)
  mesh.scale.set(...scale)
  if (rotation) mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function ell(parent, color, xyz, scale, segments = 18) {
  return add(parent, new THREE.SphereGeometry(1, segments, 14), color, xyz, scale)
}

function block(parent, color, xyz, dims, rotation) {
  return add(parent, new THREE.BoxGeometry(1, 1, 1), color, xyz, dims, rotation)
}

function rod(parent, color, from, to, radius = 0.022, radial = 8) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const delta = b.clone().sub(a)
  const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, delta.length(), radial), color)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())
  return mesh
}

function bezier(parent, color, points, radius = 0.018) {
  const p = points.map(v => new THREE.Vector3(...v))
  const curve = new THREE.CatmullRomCurve3(p)
  return add(parent, new THREE.TubeGeometry(curve, 16, radius, 6, false), color)
}

function tapered(parent, color, from, to, start = 0.085, finish = 0.015, sides = 7) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const diff = b.clone().sub(a)
  const mesh = add(parent, new THREE.CylinderGeometry(finish, start, diff.length(), sides, 1), color)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize())
  return mesh
}

function sculptedHead(head, female, skin, dark, hair, accent) {
  for (const child of [...head.children]) {
    head.remove(child)
    child.traverse(obj => { if (obj.isMesh) obj.geometry?.dispose() })
  }
  // Slightly stylized facial proportions: not a photo texture painted on a plane.
  ell(head, skin, [0, -0.006, 0.005], [female ? 0.237 : 0.252, 0.305, 0.238], 24)
  ell(head, skin, [0, -0.212, -0.025], [0.139, 0.077, 0.157], 20)
  for (const side of [-1, 1]) {
    ell(head, skin, [side * 0.237, -0.023, 0.026], [0.042, 0.086, 0.057], 14)
    ell(head, 0xfff3e7, [side * 0.083, 0.006, -0.230], [0.065, female ? 0.049 : 0.042, 0.019], 16)
    ell(head, 0x352a26, [side * 0.080, 0.001, -0.248], [0.034, 0.037, 0.014], 16)
    ell(head, 0x12151b, [side * 0.080, 0.001, -0.261], [0.020, 0.026, 0.009], 14)
    ell(head, 0xffffff, [side * 0.071, 0.015, -0.271], [0.008, 0.009, 0.006], 10)
    bezier(head, dark, [
      [side * 0.024, 0.101, -0.228],
      [side * 0.084, 0.118, -0.236],
      [side * 0.147, 0.098, -0.217]
    ], female ? 0.015 : 0.018)
    if (female) {
      bezier(head, 0x3d2629, [
        [side * 0.028, 0.039, -0.241],
        [side * 0.093, 0.044, -0.247],
        [side * 0.143, 0.025, -0.230]
      ], 0.010)
      ell(head, 0xeeb3a9, [side * 0.15, -0.084, -0.190], [0.054, 0.021, 0.008], 12)
    }
  }
  ell(head, skin, [0, -0.080, -0.244], [0.049, 0.076, 0.052], 14)
  ell(head, skin, [0, -0.131, -0.261], [0.071, 0.023, 0.022], 12)
  bezier(head, female ? 0x985e62 : 0x774c48, [
    [-0.052, -0.167, -0.228], [0, -0.174, -0.247], [0.052, -0.167, -0.228]
  ], 0.010)

  // Hair cap plus individually shaped locks; rear bun on the female avatar.
  ell(head, hair, [0, 0.191, 0.042], [0.274, 0.166, 0.260], 24)
  for (const side of [-1, 1]) {
    ell(head, hair, [side * 0.223, 0.124, 0.006], [0.067, 0.136, 0.170], 14)
  }
  if (female) {
    ell(head, hair, [0, 0.246, 0.242], [0.170, 0.136, 0.158], 20)
    ell(head, hair, [0.010, 0.304, 0.317], [0.138, 0.130, 0.127], 20)
    ell(head, 0xd9bd90, [0.018, 0.297, 0.432], [0.105, 0.049, 0.019], 14)
    for (let i = 0; i < 7; i++) {
      const x = -0.205 + i * 0.065
      tapered(head, hair, [x, 0.275 + Math.cos(i) * 0.023, -0.116],
        [x * 0.75, 0.095 + Math.abs(i - 3) * 0.019, -0.236], 0.077, 0.012)
    }
    tapered(head, hair, [-0.220, 0.149, -0.13], [-0.185, -0.185, -0.137], 0.060, 0.006)
    tapered(head, hair, [0.236, 0.160, -0.10], [0.205, -0.142, -0.160], 0.057, 0.005)
    for (const x of [-0.20, 0.20]) {
      const earring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 5, 12), material(0xf2d79c, 0.4, 0.6))
      earring.position.set(x > 0 ? 0.242 : -0.242, -0.110, 0)
      head.add(earring)
    }
  } else {
    for (let i = 0; i < 11; i++) {
      const x = -0.228 + i * 0.046
      const y = 0.26 + Math.sin(i * 2.1) * 0.032
      tapered(head, hair, [x, y, -0.032], [x + 0.038, y + 0.085, -0.136], 0.083, 0.012)
    }
    for (let i = 0; i < 7; i++) {
      const x = -0.18 + i * 0.053
      tapered(head, hair, [x, 0.230, -0.177], [x + 0.060, 0.098 + 0.02 * (i % 2), -0.243], 0.070, 0.010)
    }
  }
}

function sneaker(foot, female) {
  // Preserve the V7 walk/jump rig by decorating the original animated foot object.
  foot.material = material(female ? 0xf3f0ef : 0xeeeef3)
  foot.scale.set(1.28, 1.17, 1.25)
  block(foot, 0xe1e1e4, [0, -0.066, -0.005], [0.19, 0.030, 0.36])
  ell(foot, 0xffffff, [0, 0.007, -0.121], [0.100, 0.065, 0.118], 12)
  for (let i = 0; i < 3; i++) {
    rod(foot, female ? 0xa8a0c2 : 0xb6a5a7,
      [-0.05, 0.070, -0.10 + i * 0.055],
      [0.05, 0.070, -0.10 + i * 0.055], 0.006)
  }
  block(foot, female ? 0xc4b8ca : 0xd6bc7d, [0.075, 0.018, 0.088], [0.022, 0.049, 0.077])
}

function stylizedStreetwear(rig, female, colors) {
  const torso = rig.torso
  const head = rig.head
  for (const child of [...torso.children]) {
    if (child === head) continue
    torso.remove(child)
    child.traverse(obj => { if (obj.isMesh) obj.geometry?.dispose() })
  }
  const jacket = female ? 0xd4c8d4 : 0x292d37
  const jacketLight = female ? 0xe8e0df : 0x353b47
  const accent = female ? 0x8d82aa : 0xf2b637
  const shirt = female ? 0xfaf4ee : 0xf3f3ef
  const pants = female ? 0x45404b : 0x373a42
  const bag = female ? 0x7b655f : 0x27262a
  const skin = colors.skin
  const hair = colors.hair
  const deep = female ? 0x56434a : 0x1b1a1e

  // Volumetric layered jacket over shirt, with zip and separated front lapels.
  add(torso, new THREE.CylinderGeometry(0.345, 0.255, 0.73, 20), jacket,
    [0, 0.375, 0], [1.05, 1, 0.95])
  ell(torso, jacket, [0, 0.660, 0.018], [0.347, 0.175, 0.238], 20)
  block(torso, shirt, [0, 0.359, -0.266], [0.265, 0.573, 0.045])
  for (const side of [-1, 1]) {
    block(torso, jacketLight, [side * 0.178, 0.37, -0.254], [0.135, 0.62, 0.05])
    bezier(torso, accent, [
      [side * 0.085, 0.691, -0.278],
      [side * 0.108, 0.434, -0.288],
      [side * 0.110, 0.115, -0.278]
    ], female ? 0.012 : 0.011)
    ell(torso, jacketLight, [side * 0.268, 0.686, 0.034], [0.16, 0.11, 0.180])
  }
  // Padded hood behind neck and drawstrings.
  for (const side of [-1, 1]) {
    ell(torso, jacketLight, [side * 0.164, 0.735, 0.160], [0.157, 0.150, 0.135], 16)
    rod(torso, female ? 0xf4e5e0 : 0xd9b85b,
      [side * 0.11, 0.682, -0.252], [side * 0.11, 0.487, -0.298], 0.012)
  }
  // Concept-inspired gold/lavender crest: 3D geometry, not external trademarks.
  const crest = new THREE.Group()
  crest.position.set(-0.196, 0.535, -0.295)
  torso.add(crest)
  block(crest, accent, [0, 0, 0], [0.086, 0.025, 0.006])
  for (let i = 0; i < 3; i++) {
    tapered(crest, accent, [-0.028 + i * 0.026, 0.004, 0],
      [-0.028 + i * 0.026, 0.062 + (i === 1 ? 0.025 : 0), 0], 0.017, 0.002, 5)
  }
  // Crossbody strap and bag, visually tied to upper body so it survives animation.
  bezier(torso, female ? 0x816a60 : 0x1d2028, [
    [-0.30, 0.710, -0.185], [-0.155, 0.490, -0.301],
    [0.16, 0.203, -0.302], [0.40, 0.08, -0.150]
  ], 0.035)
  block(torso, bag, [0.434, 0.082, -0.065], [0.232, 0.300, 0.158], [0.0, 0.0, -0.13])
  block(torso, female ? 0x8a746d : 0x37343b, [0.442, 0.165, -0.149], [0.217, 0.078, 0.028])
  block(torso, accent, [0.438, 0.143, -0.165], [0.055, 0.019, 0.008])
  ell(torso, accent, [0.396, 0.066, -0.152], [0.015, 0.014, 0.011], 10)

  // Jacket sleeves are attached to the moving V7 limb geometry.
  for (let i = 0; i < 2; i++) {
    const arm = rig.arms[i]
    arm.upper.material = material(jacket)
    arm.lower.material = material(jacket)
    ell(arm.upper, jacket, [0, 0.360, 0], [0.135, 0.154, 0.135], 12)
    ell(arm.lower, jacketLight, [0, -0.370, 0], [0.110, 0.093, 0.110], 12)
    if (!female) {
      block(arm.upper, accent, [0, 0.215, -0.126], [0.154, 0.065, 0.020])
    } else {
      block(arm.upper, accent, [0, 0.16, -0.126], [0.113, 0.022, 0.020])
    }
    if (i === 0) {
      add(arm.lower, new THREE.CylinderGeometry(0.112, 0.112, 0.10, 16), 0x272a31,
        [0, -0.381, 0])
      block(arm.lower, 0x4d5969, [0, -0.398, -0.112], [0.150, 0.09, 0.028])
    }
  }

  for (let i = 0; i < 2; i++) {
    const leg = rig.legs[i]
    leg.upper.material = material(pants)
    leg.lower.material = material(pants)
    const sign = i === 0 ? -1 : 1
    block(leg.upper, pants, [sign * 0.141, 0.10, -0.022], [0.114, 0.210, 0.182])
    block(leg.upper, 0x67626a, [sign * 0.142, 0.18, -0.117], [0.075, 0.019, 0.008])
    ell(leg.lower, female ? 0x4f4a55 : 0x454750,
      [0, -0.37, 0], [0.140, 0.090, 0.13], 12)
    sneaker(leg.end, female)
  }
  // Draw 3D face last, preserving existing rig's head rotation animation.
  sculptedHead(head, female, skin, deep, hair, accent)
}

/** Visual upgrade only; existing poseRig, collisions, vehicles and save logic remain untouched. */
export function decorateMandalayHero(rig, preset, gender) {
  stylizedStreetwear(rig, gender === 'female', preset)
}
