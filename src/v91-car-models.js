/**
 * Mandalay Life V9.1 — shaped vehicle shells and independent steering wheels.
 * Pure procedural Three.js meshes (no GLB). Matches V9 dimensions and controls.
 * Local forward = -Z. Player steering is applied by Vehicles.update() to the
 * frontSteerPivots; wheelSpinners rotate about X independently.
 */
import * as THREE from 'three'

const standard = (color, extra={}) => new THREE.MeshStandardMaterial({
  color, metalness:.16, roughness:.50, ...extra
})
const black = standard(0x202732,{roughness:.76})
const tireMat = standard(0x171d25,{roughness:.93})
const hubMat = standard(0xd5d8d4,{metalness:.64,roughness:.30})
const glassMat = standard(0x344e65,{roughness:.20,metalness:.17,side:THREE.DoubleSide})
const glassRear = standard(0x263b4c,{roughness:.26,metalness:.12,side:THREE.DoubleSide})
const lightMat = standard(0xfff6df,{emissive:0xffe6ad,emissiveIntensity:.48})
const tailMat = standard(0xe44845,{emissive:0xde3737,emissiveIntensity:.35})
const amberMat = standard(0xffb43a,{emissive:0xffa72c,emissiveIntensity:.27})
const brightMetal = standard(0xb7c4c9,{metalness:.59,roughness:.33})
const boxG = new THREE.BoxGeometry(1,1,1)
const sphereG = new THREE.SphereGeometry(1,12,8)

function mesh(parent, geometry, material, cast=true) {
  const m=new THREE.Mesh(geometry,material)
  m.castShadow=cast;m.receiveShadow=true;parent.add(m)
  return m
}
function box(parent,mat,pos,dim,cast=true) {
  const o=mesh(parent,boxG,mat,cast)
  o.position.set(...pos);o.scale.set(...dim)
  return o
}
function sphere(parent,mat,pos,dim) {
  const o=mesh(parent,sphereG,mat)
  o.position.set(...pos);o.scale.set(...dim)
  return o
}
function quad(parent,mat,a,b,c,d) {
  const geo=new THREE.BufferGeometry()
  geo.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...d],3))
  geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals()
  return mesh(parent,geo,mat,false)
}
function rail(parent,mat,a,b,width=.055) {
  const pa=new THREE.Vector3(...a),pb=new THREE.Vector3(...b)
  const dist=pa.distanceTo(pb)
  if(dist<.001)return null
  const m=box(parent,mat,[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[width,dist,width],false)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),pb.sub(pa).normalize())
  return m
}
// Curved-ish shell with tapered front/rear and beveled shoulders. Unlike the
// V9 box stack, these are single continuous indexed polygon meshes.
function bodyShell(parent,spec,body) {
  const w=spec.width,d=spec.length
  const sport=spec.id==='sport', jeep=spec.id==='jeep', bus=spec.id==='bus'
  const front=sport?1.00:bus?1.08:1.11
  const center=sport?1.04:bus?1.12:1.24
  const ends=[
    [-.50,.79,front*.75],[-.46,.95,front],[-.33,1,center],
    [.33,1,center*.98],[.47,.93,front*.94],[.50,.78,front*.76]
  ]
  const rings=[]
  for(const [p,t,deck] of ends){
    const half=w*.5*t
    rings.push([
      [0,deck+.035,p*d], [half*.73,deck+.02,p*d],
      [half*.94,deck-.065,p*d],[half,.72,p*d],
      [half*.88,.42,p*d],[-half*.88,.42,p*d],
      [-half,.72,p*d],[-half*.94,deck-.065,p*d],
      [-half*.73,deck+.02,p*d]
    ])
  }
  const verts=rings.flat().flat()
  const faces=[],n=9
  for(let i=0;i<rings.length-1;i++)for(let k=0;k<n;k++){
    const a=i*n+k,b=i*n+(k+1)%n,c=(i+1)*n+(k+1)%n,d=(i+1)*n+k
    faces.push(a,b,c,a,c,d)
  }
  for(let k=1;k<n-1;k++){
    faces.push(0,k+1,k)
    const b=(rings.length-1)*n
    faces.push(b,b+k,b+k+1)
  }
  const geo=new THREE.BufferGeometry()
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3))
  geo.setIndex(faces);geo.computeVertexNormals()
  const o=mesh(parent,geo,body)
  o.material.side=THREE.DoubleSide
  return o
}

function addCab(parent,spec,body,roof,lowDetail=false,override={}) {
  const w=spec.width,d=spec.length,id=spec.id
  const h=override.h??Math.max(1.42,spec.height)
  const frontB=override.frontB??(-d*(id==='compact'?.36:id==='sport'?.32:.33))
  const frontT=override.frontT??(-d*(id==='sport'?.11:.18))
  const backT=override.backT??(d*(id==='minivan'?.28:id==='sport'?.20:.17))
  const backB=override.backB??(d*(id==='compact'?.40:id==='minivan'?.36:.33))
  const bottom=override.bottom??1.15
  const q=w*.39,t=w*.33,slop=.01
  const frontBottomL=[-q,bottom,frontB],frontBottomR=[q,bottom,frontB]
  const roofFrontL=[-t,h,frontT],roofFrontR=[t,h,frontT]
  const roofBackL=[-t,h,backT],roofBackR=[t,h,backT]
  const backBottomL=[-q,bottom,backB],backBottomR=[q,bottom,backB]
  // Cabin side shell: glass trapezoids rather than solid rectangular blocks.
  quad(parent,glassMat,frontBottomL,frontBottomR,roofFrontR,roofFrontL)
  quad(parent,glassRear,roofBackL,roofBackR,backBottomR,backBottomL)
  quad(parent,roof,roofFrontL,roofFrontR,roofBackR,roofBackL)
  for(const s of [-1,1]){
    const xb=s*q,xt=s*t
    const p0=[xb+s*slop,bottom,frontB]
    const p1=[xt+s*slop,h,frontT]
    const p2=[xt+s*slop,h,backT]
    const p3=[xb+s*slop,bottom,backB]
    // Split windows with a B-pillar; length varies by model.
    const midB=frontB+(backB-frontB)*(id==='sport'?.55:.47)
    const midT=frontT+(backT-frontT)*(id==='sport'?.57:.47)
    const mB=[xb+s*slop,bottom,midB],mT=[xt+s*slop,h,midT]
    quad(parent,glassMat,p0,p1,mT,mB)
    quad(parent,glassRear,mB,mT,p2,p3)
    rail(parent,black,p0,p1,.065);rail(parent,black,mB,mT,.07)
    rail(parent,black,p2,p3,.064)
    rail(parent,roof,p1,p2,.085)
    rail(parent,body,p0,p3,.075)
    // Side mirrors and small door handles.
    box(parent,black,[s*w*.51,bottom+.09,frontB+.15],[.14,.11,.26])
    box(parent,body,[s*w*.52,bottom+.12,frontB+.16],[.19,.12,.25])
    if(!lowDetail){
      box(parent,brightMetal,[s*w*.497,.96,d*.05],[.035,.056,.25],false)
      box(parent,brightMetal,[s*w*.497,.96,d*.26],[.035,.056,.25],false)
    }
  }
  // Windshield perimeter / wipers.
  rail(parent,black,frontBottomL,roofFrontL,.06)
  rail(parent,black,frontBottomR,roofFrontR,.06)
  rail(parent,black,frontBottomL,frontBottomR,.055)
  rail(parent,black,backBottomL,backBottomR,.062)
  rail(parent,roof,roofFrontL,roofFrontR,.095)
  rail(parent,roof,roofBackL,roofBackR,.09)
  if(!lowDetail){
    rail(parent,black,[-w*.28,bottom+.03,frontB-.02],[0,bottom+.13,frontB+.05],.025)
    rail(parent,black,[0,bottom+.03,frontB-.02],[w*.28,bottom+.13,frontB+.05],.025)
  }
}

function rollingWheel(parent,x,y,z,radius,steer,wheels,pivots,lowDetail=false) {
  const pivot=new THREE.Group();pivot.position.set(x,y,z);parent.add(pivot)
  const spinner=new THREE.Group();pivot.add(spinner)
  const width=radius*.53
  const cylinder=mesh(spinner,new THREE.CylinderGeometry(radius,radius,width,16,1),tireMat)
  cylinder.rotation.z=Math.PI/2
  const cap=mesh(spinner,new THREE.CylinderGeometry(radius*.64,radius*.64,width+.018,12,1),hubMat)
  cap.rotation.z=Math.PI/2
  for(const side of [-1,1]) {
    const rim=mesh(spinner,new THREE.CircleGeometry(radius*.43,12),brightMetal)
    rim.position.x=side*(width*.5+.016);rim.rotation.y=side*Math.PI/2
    if(!lowDetail)for(let a=0;a<5;a++){
      const theta=a*Math.PI*2/5
      // Spokes belong to wheel spinner, so they visibly rotate while driving.
      const spoke=box(spinner,black,[side*(width*.5+.025),Math.sin(theta)*radius*.22,Math.cos(theta)*radius*.22],[.023,.085,.22],false)
      spoke.rotation.x=-theta
    }
  }
  wheels.push(spinner)
  if(steer)pivots.push(pivot)
  return pivot
}
function wheels(parent,spec,wheelsOut,steerOut,lowDetail) {
  const d=spec.length,w=spec.width,id=spec.id
  const rad=id==='bus'?.64:id==='jeep'?.67:id==='pickup'?.62:id==='sport'?.51:.56
  const axles=id==='bus'?[-d*.34,d*.07,d*.34]:[-d*.31,d*.32]
  axles.forEach((z,i)=>{
    for(const s of [-1,1])rollingWheel(parent,s*(w*.51),rad+.055,z,rad,i===0,wheelsOut,steerOut,lowDetail)
  })
  // Arch outlines over each axle, more legible at low camera angles.
  if(!lowDetail)for(const z of axles)for(const s of [-1,1]){
    const a=new THREE.Mesh(new THREE.TorusGeometry(rad*.99,.055,7,15,Math.PI),black)
    a.rotation.y=s*Math.PI/2;a.rotation.x=Math.PI
    a.position.set(s*(w*.505),rad+.08,z)
    parent.add(a)
  }
}

function lightsAndTrim(parent,spec,lowDetail) {
  const d=spec.length,w=spec.width,id=spec.id
  const zF=-d*.497,zR=d*.497
  // Angled, short front / rear bumpers fit shaped body shell.
  box(parent,black,[0,.55,zF-.06],[w*.73,.17,.18])
  box(parent,black,[0,.56,zR+.07],[w*.74,.15,.17])
  box(parent,black,[0,.90,zF-.075],[w*.61,.29,.075],false)
  for(const s of [-1,1]){
    const lightX=s*w*.365
    if(id==='jeep'||id==='compact'||id==='suv')sphere(parent,lightMat,[lightX,1.04,zF-.085],[w*.117,.165,.085])
    else box(parent,lightMat,[lightX,1.055,zF-.095],[w*.226,.14,.11],false)
    box(parent,tailMat,[lightX,.98,zR+.08],[w*.20,.17,.087],false)
    if(!lowDetail){
      sphere(parent,amberMat,[s*w*.467,.92,-d*.30],[.035,.09,.14])
      box(parent,brightMetal,[s*w*.46,.65,0],[.036,.055,d*.43],false)
    }
  }
  // Grille ribs, simple emblem on a distinct nose.
  for(let i=0;i<4;i++)box(parent,brightMetal,[0,.81+i*.06,zF-.13],[w*.48,.017,.028],false)
  box(parent,brightMetal,[0,1.03,zF-.14],[.20,.17,.027],false)
}
function taxiDetail(parent,spec,roofY) {
  box(parent,standard(0xfff8d6),[0,roofY+.18,0],[.91,.33,.51])
  box(parent,black,[0,roofY+.19,-.258],[.79,.15,.025],false)
  for(const s of [-1,1])for(let i=0;i<4;i++)
    box(parent,standard((i%2)?0xffffff:0x222222),[s*spec.width*.502,1.05,-.70+i*.30],[.03,.12,.28],false)
}
function cargoDetail(parent,spec,body,roof,lowDetail) {
  const w=spec.width,d=spec.length,id=spec.id
  const boxStart=d*.005,boxDepth=d*.53
  if(id==='pickup'){
    // Open loading bed and raised side rails; not another full-size car cabin.
    box(parent,black,[0,1.15,d*.265],[w*.84,.11,d*.46],false)
    for(const s of [-1,1])box(parent,body,[s*w*.44,1.31,d*.265],[.19,.40,d*.50])
    box(parent,body,[0,1.32,d*.49],[w*.89,.40,.13])
  } else {
    // Cargo / passenger van: roof is rectangular by design, front cab slopes.
    const top=id==='delivery'?2.81:id==='bus'?3.14:2.20
    const high=id==='bus'?2.52:id==='delivery'?2.05:1.46
    box(parent,body,[0,high*.6,d*.18],[w*.93,high,d*.62])
    box(parent,roof,[0,top,d*.18],[w*.96,.13,d*.62])
    for(const s of [-1,1]){
      if(id==='minivan'||id==='bus'){
        for(let z=-d*.07;z<d*.47;z+=id==='bus'?1.38:.98){
          box(parent,glassMat,[s*w*.473,top-.65,z],[.032,id==='bus'?.96:.58,id==='bus'?1.09:.74],false)
        }
      } else {
        box(parent,standard(0xe0ebee),[s*w*.473,high*.70,d*.22],[.035,.78,d*.42],false)
      }
      if(!lowDetail)box(parent,black,[s*w*.48,1.13,d*.18],[.04,.07,d*.44],false)
    }
    if(id==='bus')box(parent,black,[0,2.88,-d*.49],[w*.7,.33,.04],false)
  }
}
function sportDetail(parent,spec,body,lowDetail) {
  const w=spec.width,d=spec.length
  box(parent,black,[0,.60,-d*.50],[w*.91,.10,.26])
  box(parent,black,[0,1.20,d*.43],[w*.88,.09,.25])
  for(const s of [-1,1])box(parent,black,[s*w*.37,1.09,d*.42],[.09,.29,.11])
  if(!lowDetail){
    for(const s of [-1,1])box(parent,body,[s*w*.24,1.23,-d*.31],[.30,.045,d*.16],false)
  }
}
function jeepDetail(parent,spec) {
  const d=spec.length,w=spec.width
  for(const s of [-1,1])box(parent,black,[s*w*.33,2.16,0],[.08,.09,d*.57])
  box(parent,black,[0,2.16,-d*.21],[w*.66,.08,.09])
  const spare=mesh(parent,new THREE.TorusGeometry(.46,.15,8,18),tireMat)
  spare.position.set(0,1.14,d*.508)
}

/** Create a drivable model that follows the original V9 size and speed rules. */
export function createV91Model(parent,spec,lowDetail=false) {
  const root=new THREE.Group();parent.add(root)
  const body=standard(spec.color,{metalness:.22,roughness:.43,side:THREE.DoubleSide})
  const roof=standard(spec.roof,{metalness:.14,roughness:.51,side:THREE.DoubleSide})
  const wheelSpinners=[],frontSteerPivots=[]
  bodyShell(root,spec,body)
  const id=spec.id
  if(id==='bus'){
    addCab(root,spec,body,roof,lowDetail,{h:2.92,frontB:-spec.length*.49,frontT:-spec.length*.45,backT:-spec.length*.36,backB:-spec.length*.32,bottom:1.13})
    cargoDetail(root,spec,body,roof,lowDetail)
  } else if(id==='delivery'){
    addCab(root,spec,body,roof,lowDetail,{h:2.27,frontB:-spec.length*.48,frontT:-spec.length*.38,backT:-spec.length*.10,backB:-spec.length*.03,bottom:1.14})
    cargoDetail(root,spec,body,roof,lowDetail)
  } else if(id==='pickup'){
    addCab(root,spec,body,roof,lowDetail,{h:2.05,frontB:-spec.length*.42,frontT:-spec.length*.35,backT:-spec.length*.07,backB:spec.length*.04,bottom:1.16})
    cargoDetail(root,spec,body,roof,lowDetail)
  } else {
    addCab(root,spec,body,roof,lowDetail)
    if(id==='taxi')taxiDetail(root,spec,spec.height)
    if(id==='sport')sportDetail(root,spec,body,lowDetail)
    if(id==='jeep')jeepDetail(root,spec)
  }
  lightsAndTrim(root,spec,lowDetail)
  wheels(root,spec,wheelSpinners,frontSteerPivots,lowDetail)
  return {root,wheelSpinners,frontSteerPivots}
}
