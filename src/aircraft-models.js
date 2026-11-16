import * as THREE from 'three'

// Mandalay Life V7 — Aircraft 3D Models
// Inspired by the three supplied aircraft references.

const cache = new Map()

function mat(color) {
  if (!cache.has(color)) {
    cache.set(color, new THREE.MeshStandardMaterial({
      color,
      roughness: 0.58,
      metalness: 0.14,
      side: THREE.DoubleSide
    }))
  }
  return cache.get(color)
}

function mesh(parent, geometry, color, pos = [0,0,0], rot = [0,0,0]) {
  const m = new THREE.Mesh(geometry, mat(color))
  m.position.set(...pos)
  m.rotation.set(...rot)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

function group(parent, pos = [0,0,0]) {
  const g = new THREE.Group()
  g.position.set(...pos)
  parent.add(g)
  return g
}

function box(p, c, pos, size, rot = [0,0,0]) {
  return mesh(p, new THREE.BoxGeometry(...size), c, pos, rot)
}

function sphere(p, c, pos, size) {
  const m = mesh(p, new THREE.SphereGeometry(1,16,12), c, pos)
  m.scale.set(...size)
  return m
}

function cylinder(p, c, pos, radius, length, rot = [0,0,0]) {
  return mesh(
    p,
    new THREE.CylinderGeometry(radius,radius,length,16),
    c,pos,rot
  )
}

function rod(p,c,a,b,r=.07) {
  const start = new THREE.Vector3(...a)
  const end = new THREE.Vector3(...b)
  const d = end.clone().sub(start)
  const m = cylinder(
    p,c,start.add(end).multiplyScalar(.5).toArray(),
    r,d.length()
  )
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0,1,0),
    d.normalize()
  )
  return m
}

function wheel(p,x,y,z,r=.35) {
  const m = cylinder(
    p,0x20252a,[x,y,z],r,.25,[0,0,Math.PI/2]
  )
  cylinder(
    p,0xabb0b4,[x+.135,y,z],r*.4,.03,[0,0,Math.PI/2]
  )
  return m
}

function wing(p,c,points,y,thickness=.15) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0],points[0][1])
  for (const [x,z] of points.slice(1)) shape.lineTo(x,z)
  shape.closePath()

  const geom = new THREE.ShapeGeometry(shape)
  geom.rotateX(Math.PI/2)

  const m = mesh(p,geom,c,[0,y,0])
  m.material.side = THREE.DoubleSide

  return m
}

function wingPair(p,c,points,y) {
  wing(p,c,points,y)
  wing(p,c,points.map(([x,z])=>[-x,z]).reverse(),y)
}

function fuselage(p,c,rings,cy) {
  const vertices = []
  const indices = []
  const segments = 24

  for (const [z,rx,ry] of rings) {
    for(let i=0;i<=segments;i++) {
      const a=i*Math.PI*2/segments
      vertices.push(
        Math.cos(a)*rx,
        cy+Math.sin(a)*ry,
        z
      )
    }
  }

  for(let i=0;i<rings.length-1;i++) {
    for(let j=0;j<segments;j++) {
      const a=i*(segments+1)+j
      const b=a+segments+1
      indices.push(a,a+1,b,a+1,b+1,b)
    }
  }

  const geo=new THREE.BufferGeometry()
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices,3)
  )
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return mesh(p,geo,c)
}

// 1 — Orange/Gray Propeller Trainer

export function createTrainerAircraft(parent) {
  const g=group(parent)
  const orange=0xffa11e
  const gray=0x9d9d9e
  const dark=0x30343b
  const silver=0xc4c6c5

  fuselage(g,gray,[
    [-5.1,.39,.38],[-4.4,.83,.72],
    [-2.7,1.03,.78],[-.8,1.03,.77],
    [1.8,.83,.68],[3.9,.51,.53],
    [5.1,.14,.18]
  ],1.64)

  fuselage(g,orange,[
    [-5.45,.08,.12],[-5.1,.45,.47],
    [-4.3,.89,.77],[-2.85,1.04,.79]
  ],1.64)

  // Cockpit
  sphere(g,dark,[0,2.3,-1.56],[1.04,.71,1.72])

  for(const x of [-.82,.82]) {
    rod(g,silver,[x,2.16,-2.65],[x,2.66,-.85])
  }

  // Main wings
  wingPair(g,gray,[
    [.7,-1.3],[2.4,-1.25],
    [7.95,-.78],[7.75,1.1],
    [2,1.36],[.7,1.44]
  ],1.76)

  // Three white stripes on each wing
  for(const side of [-1,1]) {
    for(const x of [2.12,2.72,3.32]) {
      wing(g,0xffffff,[
        [side*x,-1.17],
        [side*(x+.24),-1.17],
        [side*(x+.24),1.29],
        [side*x,1.29]
      ],1.785)
    }

    // Landing gear
    rod(
      g,0x48505a,
      [side*1.1,.99,.7],
      [side*1.4,.4,.7]
    )
    wheel(g,side*1.44,.36,.7,.31)
  }

  // Tail wings
  wingPair(g,orange,[
    [.25,3.61],[2.55,3.9],
    [2.48,4.75],[.22,4.57]
  ],1.83)

  // Vertical stabilizer
  box(g,orange,[0,2.45,4.45],[.22,2.3,1.7],[-.25,0,0])

  wheel(g,0,.39,-4.14,.25)

  // Animated front propeller
  const prop=group(g,[0,1.64,-5.55])
  cylinder(prop,0xd68b1c,[0,0,-.09],.24,.22,[Math.PI/2,0,0])
  box(prop,0x232629,[0,0,-.18],[.22,3.6,.075])
  box(prop,orange,[0,1.64,-.2],[.24,.34,.082])
  box(prop,orange,[0,-1.64,-.2],[.24,.34,.082])

  return {g,prop,spinners:[]}
}

// 2 — CH-47 Chinook Tandem Rotor

function mainRotor(g,z,y=4.62) {
  cylinder(g,0x494e4a,[0,y-.28,z],.23,.65)
  cylinder(g,0x252b2c,[0,y,z],.50,.22)

  const rotor=group(g,[0,y+.13,z])

  for(let i=0;i<3;i++) {
    const arm=group(rotor)
    arm.rotation.y=i*Math.PI*2/3

    box(arm,0x262c2c,[3,0,0],[5.4,.09,.44])
    box(arm,0x4d5250,[5.6,0,0],[.32,.1,.44])
  }

  return rotor
}

export function createChinookAircraft(parent) {
  const g=group(parent)

  const olive=0x747c6c
  const tan=0xaaa38a
  const dark=0x404e46
  const glass=0x243b40

  // Cargo fuselage
  box(g,olive,[0,2.05,0],[3.48,2.35,10.8])
  sphere(g,olive,[0,2.02,-5.24],[1.74,1.19,1.52])
  sphere(g,tan,[0,2.13,5.10],[1.73,1.21,1.07])

  box(g,tan,[0,3.22,.8],[3.38,.35,9.8])
  box(g,dark,[0,3.31,-4.12],[3.2,.33,2.34])
  box(g,tan,[0,3.39,4.45],[3.18,.36,2.35])

  for(const side of [-1,1]) {
    const sx=side*1.755

    // Camouflage
    for(const [z,y,color] of [
      [-3.9,2.72,tan],
      [-2.1,1.33,dark],
      [-.2,2.88,tan],
      [1.6,1.46,dark],
      [3.35,2.75,tan],
      [4.6,1.52,dark]
    ]) {
      box(g,color,[sx,y,z],[.09,.62,1.4])
    }

    // Cabin windows
    for(const z of [-2.55,-.95,.68,2.35,3.83]) {
      cylinder(
        g,glass,
        [sx+side*.05,2.3,z],
        .24,.08,[0,0,Math.PI/2]
      )
    }

    // Landing wheels
    wheel(g,side*1.64,.49,4.18,.46)
    wheel(g,side*1.64,.49,-3.68,.48)

    // Side cargo door
    box(g,dark,[side*1.83,1.75,.15],[.09,1.75,1.8])
  }

  // Cockpit windows
  box(g,glass,[0,2.52,-6.45],[1.68,.82,.1])

  // Front and rear rotor mounts
  box(g,dark,[0,3.65,-4.3],[2.98,.88,2.6])
  box(g,tan,[0,3.69,4.19],[2.98,1,2.38])

  // Two animated rotors
  const rotor=mainRotor(g,-4.28,4.62)
  const secondaryRotor=mainRotor(g,4.2,4.76)

  return {
    g,
    rotor,
    secondaryRotor,
    tail:null,
    spinners:[]
  }
}

// 3 — Myanmar Airways International A320

function logoTexture() {
  const c=document.createElement('canvas')
  c.width=1024
  c.height=256
  const ctx=c.getContext('2d')

  ctx.fillStyle='#194375'
  ctx.font='bold 150px Arial'
  ctx.fillText('MAI',60,162)

  ctx.font='bold 37px Arial'
  ctx.fillText('Myanmar Airways International',70,218)

  return new THREE.CanvasTexture(c)
}

function addLogo(p,texture,x,y,z,rotationY) {
  const m=new THREE.Mesh(
    new THREE.PlaneGeometry(4.9,.87),
    new THREE.MeshBasicMaterial({
      map:texture,
      transparent:true,
      side:THREE.DoubleSide,
      depthWrite:false
    })
  )

  m.position.set(x,y,z)
  m.rotation.y=rotationY
  p.add(m)
}

export function createMAIAirbus(parent) {
  const g=group(parent)

  const white=0xf6f8f8
  const navy=0x133d77
  const gold=0xe7a325
  const silver=0xc9d2db
  const glass=0x1d343d

  // A320 passenger fuselage
  fuselage(g,white,[
    [-9.55,.02,.08],
    [-9.2,.52,.52],
    [-8.45,1.06,1.09],
    [-7.1,1.42,1.37],
    [-5.2,1.51,1.49],
    [5.5,1.51,1.49],
    [7.25,1.19,1.21],
    [9.32,.1,.14]
  ],2.24)

  // MAI colored stripes and windows
  for(const side of [-1,1]) {
    box(g,navy,[side*1.49,1.40,.5],[.065,.17,12.1])

    for(let z=-5.05;z<=5.6;z+=.71) {
      box(g,glass,[side*1.49,2.66,z],[.055,.23,.29])
    }

    // Cockpit window
    box(
      g,glass,
      [side*.88,3.04,-8.21],
      [.065,.53,.72]
    )
  }

  // Main wings
  wingPair(g,silver,[
    [.95,-2.15],
    [2.55,-2],
    [10.7,1.9],
    [10.52,3.05],
    [2.25,1.95],
    [.95,1.8]
  ],1.55)

  for(const side of [-1,1]) {
    // Gold wing tips
    box(g,gold,[side*10.55,1.7,2.4],[.3,.25,.7])

    // Jet engine
    const x=side*4.25

    rod(g,silver,[x,1.56,-.28],[x,1.03,-.55],.16)

    cylinder(
      g,white,
      [x,.92,-1.31],
      .85,2.58,[Math.PI/2,0,0]
    )

    cylinder(
      g,glass,
      [x,.92,-2.63],
      .72,.09,[Math.PI/2,0,0]
    )

    // Landing gear
    rod(
      g,0x7a8790,
      [side*1.68,1.47,1.14],
      [side*1.68,.53,1.14],.13
    )

    wheel(g,side*1.72,.42,1.14,.4)
    wheel(g,side*2.06,.42,1.14,.4)
  }

  // Rear stabilizers
  wingPair(g,white,[
    [.44,7],
    [3.55,7.37],
    [3.8,8.44],
    [.36,8.17]
  ],3.2)

  // Tall blue tail fin
  box(
    g,navy,
    [0,4.35,7.4],
    [.3,4.0,3.1],
    [-.35,0,0]
  )

  // Nose landing gear
  rod(g,0x82909a,[0,1.43,-7.18],[0,.47,-7.33],.14)
  wheel(g,0,.42,-7.4,.3)

  // MAI branding
  if(typeof document!=='undefined') {
    const texture=logoTexture()
    addLogo(g,texture,1.545,2.87,-3.55,Math.PI/2)
    addLogo(g,texture,-1.545,2.87,-3.55,-Math.PI/2)
  }

  return {
    g,
    propellers:[],
    spinners:[]
  }
}
