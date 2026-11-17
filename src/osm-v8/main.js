import * as THREE from 'three'
import { OSMCity, roadWidth } from './osm-world.js'
import { FacadeSystem } from './facades.js'
import { Character } from './character.js'
import { VehicleSystem } from './vehicles.js'
import { CityLife } from './citylife.js'
import { WeatherSystem } from './weather.js'
import { DeliveryMission } from './missions.js'
import { loadBlenderAssets } from './assets.js'
import { createStreetFurniture } from './street-props.js'
import { noiseTexture } from './textures.js'
import './style.css'

const $ = id => document.getElementById(id)
const mobile = matchMedia('(pointer: coarse)').matches
const canvas = $('world')
const renderer = new THREE.WebGLRenderer({canvas, antialias: !mobile, powerPreference: 'high-performance'})
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.7))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.22
renderer.shadowMap.enabled = !mobile
renderer.shadowMap.type = THREE.PCFSoftShadowMap
const scene = new THREE.Scene()
scene.background = new THREE.Color('#a8d6e8')
scene.fog = new THREE.FogExp2('#a8d6e8', 0.00046)
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 4500)
const hemi = new THREE.HemisphereLight('#f0faff', '#647353', 2.65)
scene.add(hemi)
const sun = new THREE.DirectionalLight('#ffecbd', 2.7)
sun.position.set(-160, 240, 140)
sun.castShadow = !mobile
sun.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024)
sun.shadow.camera.left = -110
sun.shadow.camera.right = 110
sun.shadow.camera.top = 110
sun.shadow.camera.bottom = -110
sun.shadow.camera.far = 560
sun.shadow.bias = -0.00045
scene.add(sun, sun.target)

const controller = new Set()
const keys = {
  KeyW:'forward', ArrowUp:'forward', KeyS:'back', ArrowDown:'back',
  KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right',
  ShiftLeft:'run', ShiftRight:'run'
}
let isAerial = false
let isNight = false
let mapVisible = false
let city = null
let data = null
let facades = null
let fleet = null
let pedestrians = null
let weather = null
let mission = null
let quality = mobile ? 'low' : 'balanced'
let spawn = [0,0]
const character = new Character(scene)
const hero = character.root
let yaw = 0, velocityY=0, yLift=0
const cameraPos = new THREE.Vector3()
const targetPos = new THREE.Vector3()
const tmp = new THREE.Object3D()
const lastPlayerDraw = { x:Infinity, z:Infinity }

function nearestRoad(x, z) {
  if (!data) return [x,z]
  let best = [x,z], score=Infinity
  for (const road of data.roads) {
    if (['steps', 'path', 'footway', 'track'].includes(road.kind)) continue
    for (let i=1;i<road.path.length;i++) {
      const a=road.path[i-1],b=road.path[i]
      const dx=b[0]-a[0],dz=b[1]-a[1]
      const denominator=dx*dx+dz*dz
      if (!denominator)continue
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/denominator))
      const px=a[0]+t*dx,pz=a[1]+t*dz
      const d=(px-x)**2+(pz-z)**2
      if(d<score){score=d;best=[px,pz]}
    }
  }
  return best
}
function teleport(x,z) {
  if(!city)return
  if(fleet?.driving){fleet.driving=false;fleet.speed=0;hero.visible=true}
  const [rx,rz]=nearestRoad(x,z)
  const [xx,zz]=city.isBlocked(rx,rz,1)?nearestRoad(rx+7,rz+7):[rx,rz]
  hero.position.set(xx,0,zz)
  velocityY=0;yLift=0
  city.update(xx,zz,isAerial)
  drawPlayerOnMaps()
}

function setNight(enabled) {
  isNight=enabled
  scene.background.set(enabled ? '#101c35' : '#a8d6e8')
  scene.fog.color.copy(scene.background)
  hemi.intensity=enabled ? 1.05 : 2.65
  sun.intensity=enabled ? .25 : 2.7
  renderer.toneMappingExposure=enabled ? .85 : 1.22
  $('night').textContent=enabled ? 'Day mode' : 'Night mode'
}
function toggleMap(force) {
  mapVisible=typeof force==='boolean' ? force : !mapVisible
  $('overview').hidden=!mapVisible
  $('map-toggle').setAttribute('aria-expanded',String(mapVisible))
  if(mapVisible){controller.clear();renderOverview()}
}
function toggleQuality() {
  quality=quality==='low'?'balanced':quality==='balanced'?'high':'low'
  facades?.setQuality(quality)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='low'?1.0:quality==='balanced'?1.45:1.8))
  renderer.shadowMap.enabled=quality==='high'&&!mobile
  $('quality').textContent=`Quality: ${quality}`
  $('quality-readout').textContent=`Visual quality: ${quality} · dynamic facade detail`
}
function toggleVehicle() {
  if(!fleet)return
  fleet.toggleDrive(hero)
  $('vehicle-action').textContent=fleet.driving?'Exit car [E]':'Drive [E]'
  $('touch-action').textContent=fleet.driving?'EXIT':'E'
}
function actionParcel() {
  if(!mission)return
  const did=mission.action(hero.position.x,hero.position.z)
  if(did)$('notice').textContent=mission.phase==='dropoff'?'Parcel collected. Reach the green delivery marker.':'Delivery complete! +35 coins.'
}
function toggleWeather() {
  if(!weather)return
  $('weather').textContent=weather.toggle()?'Rain: ON':'Rain: OFF'
}
function toggleCamera() {
  isAerial=!isAerial
  $('camera-mode').textContent=isAerial ? 'Street camera' : 'Aerial camera'
  city?.update(hero.position.x,hero.position.z,isAerial)
}
window.addEventListener('keydown', e=>{
  if(e.target instanceof HTMLInputElement)return
  if(keys[e.code]){controller.add(keys[e.code]);e.preventDefault()}
  if(e.repeat)return
  if(e.code==='KeyM')toggleMap()
  if(e.code==='KeyC')toggleCamera()
  if(e.code==='KeyN')setNight(!isNight)
  if(e.code==='KeyE')toggleVehicle()
  if(e.code==='KeyF')actionParcel()
  if(e.code==='KeyV')toggleWeather()
  if(e.code==='KeyQ')toggleQuality()
  if(e.code==='KeyR')teleport(...spawn)
  if(e.code==='Escape')toggleMap(false)
  if(e.code==='Space' && yLift<.01 && !fleet?.driving)velocityY=8
})
window.addEventListener('keyup',e=>{if(keys[e.code])controller.delete(keys[e.code])})
window.addEventListener('blur',()=>controller.clear())
for(const button of document.querySelectorAll('[data-control]')){
  const control=button.dataset.control
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();button.setPointerCapture(event.pointerId);controller.add(control)
  })
  for (const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>controller.delete(control))
}
$('map-toggle').addEventListener('click',()=>toggleMap())
$('close-map').addEventListener('click',()=>toggleMap(false))
$('camera-mode').addEventListener('click',toggleCamera)
$('night').addEventListener('click',()=>setNight(!isNight))
$('vehicle-action').addEventListener('click',toggleVehicle)
$('touch-action').addEventListener('click',toggleVehicle)
$('parcel-action').addEventListener('click',actionParcel)
$('weather').addEventListener('click',toggleWeather)
$('quality').addEventListener('click',toggleQuality)
$('reset').addEventListener('click',()=>teleport(...spawn))
$('poi-search').addEventListener('input',updatePoiList)
$('overview-map').addEventListener('click',e=>{
  if(!data)return
  const c=$('overview-map'),rect=c.getBoundingClientRect()
  const dims=mapView(c)
  const px=(e.clientX-rect.left)*c.width/rect.width, py=(e.clientY-rect.top)*c.height/rect.height
  const x=(px-dims.cx)/dims.scale, z=(py-dims.cy)/dims.scale
  teleport(x,z)
  toggleMap(false)
})

function makeTrees(scene, data) {
  // Decorative stylization only: these are NOT surveyed OSM tree locations.
  const count=mobile?120:260
  const coords=[]
  let tick=0
  for(const road of data.roads){
    if(!['primary','secondary','tertiary','residential'].includes(road.kind))continue
    const width=roadWidth(road.kind)
    for(let i=1;i<road.path.length;i++){
      const a=road.path[i-1],b=road.path[i]
      const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz)
      if(d<12 || d>500)continue
      for(let t=20;t<d;t+=45){
        tick++
        if(tick%3===0)continue
        const nx=-dz/d,nz=dx/d, sign=tick%2?1:-1
        const x=a[0]+dx*t/d+nx*(width*.5+4)*sign
        const z=a[1]+dz*t/d+nz*(width*.5+4)*sign
        if(!city.isBlocked(x,z,1.3))coords.push([x,z, (tick%4)*.17 + .85])
        if(coords.length>=count)break
      }
      if(coords.length>=count)break
    }
    if(coords.length>=count)break
  }
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.3,.43,3.5,5),new THREE.MeshStandardMaterial({color:'#654d35'}),coords.length)
  const crowns=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(2.3,0),new THREE.MeshStandardMaterial({color:'#537e54',roughness:1}),coords.length)
  coords.forEach(([x,z,s],i)=>{
    tmp.position.set(x,1.75*s,z);tmp.scale.set(s,s,s);tmp.rotation.set(0,0,0);tmp.updateMatrix();trunks.setMatrixAt(i,tmp.matrix)
    tmp.position.set(x,4.4*s,z);tmp.updateMatrix();crowns.setMatrixAt(i,tmp.matrix)
  })
  trunks.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true
  trunks.frustumCulled=false;crowns.frustumCulled=false
  scene.add(trunks,crowns)
}

function mapView(canvas) {
  const width=data.sizeMeters.width,height=data.sizeMeters.height
  return {scale:Math.min((canvas.width-20)/width,(canvas.height-20)/height),cx:canvas.width/2,cy:canvas.height/2}
}
function drawMiniBase(canvas) {
  if(!data)return null
  const clone=document.createElement('canvas')
  clone.width=canvas.width;clone.height=canvas.height
  const ctx=clone.getContext('2d')
  const {scale,cx,cy}=mapView(clone)
  ctx.fillStyle='#a7b5a1';ctx.fillRect(0,0,clone.width,clone.height)
  const coords=(p)=>[cx+p[0]*scale,cy+p[1]*scale]
  function path(points){
    if(!points?.length)return
    ctx.beginPath()
    const a=coords(points[0]);ctx.moveTo(...a)
    for(let i=1;i<points.length;i++)ctx.lineTo(...coords(points[i]))
    ctx.closePath()
  }
  for(const area of data.areas){
    path(area.ring)
    ctx.fillStyle=area.kind==='water'?'#477e9c':'#759776';ctx.fill()
  }
  ctx.fillStyle='#cbbdab'
  for(const item of data.buildings){
    path(item.ring);ctx.fill()
  }
  for(const r of data.roads){
    ctx.beginPath()
    r.path.forEach((pt,i)=>i?ctx.lineTo(...coords(pt)):ctx.moveTo(...coords(pt)))
    ctx.strokeStyle=['primary','secondary','tertiary'].includes(r.kind)?'#555e66':'#777c7d'
    ctx.lineWidth=Math.max(.75,roadWidth(r.kind)*scale)
    ctx.lineJoin='round';ctx.stroke()
  }
  for(const wall of data.walls){
    ctx.beginPath();wall.path.forEach((pt,i)=>i?ctx.lineTo(...coords(pt)):ctx.moveTo(...coords(pt)))
    ctx.strokeStyle='#a8624c';ctx.lineWidth=3;ctx.stroke()
  }
  return clone
}
let smallBase=null,bigBase=null
function drawDot(canvas,base) {
  if(!data || !base)return
  const ctx=canvas.getContext('2d')
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(base,0,0)
  const {scale,cx,cy}=mapView(canvas)
  if(mission){
    const goal=mission.phase==='pickup'?mission.pickup:mission.drop
    const mx=cx+goal.x*scale,mz=cy+goal.z*scale
    ctx.beginPath();ctx.arc(mx,mz,7,0,Math.PI*2)
    ctx.fillStyle=mission.phase==='pickup'?'#e9b75d':'#58c2a7';ctx.fill()
    ctx.lineWidth=2;ctx.strokeStyle='#122732';ctx.stroke()
  }
  const x=cx+hero.position.x*scale,z=cy+hero.position.z*scale
  ctx.beginPath();ctx.arc(x,z,6,0,Math.PI*2);ctx.fillStyle='#ff6146';ctx.fill()
  ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke()
  const fx=Math.sin(yaw),fz=-Math.cos(yaw)
  ctx.beginPath();ctx.moveTo(x,z);ctx.lineTo(x+fx*14,z+fz*14);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()
}
function drawPlayerOnMaps() {
  drawDot($('mini-map'),smallBase)
  if(mapVisible)drawDot($('overview-map'),bigBase)
}
function renderOverview(){
  if(!data)return
  if(!bigBase)bigBase=drawMiniBase($('overview-map'))
  drawPlayerOnMaps()
}
function updatePoiList() {
  if(!data)return
  const query=$('poi-search').value.trim().toLowerCase()
  const results=data.pois.filter(p=>!query || `${p.name} ${p.type}`.toLowerCase().includes(query))
    .sort((a,b)=> ((a.at[0]-hero.position.x)**2+(a.at[1]-hero.position.z)**2) -
                   ((b.at[0]-hero.position.x)**2+(b.at[1]-hero.position.z)**2)).slice(0,35)
  $('poi-total').textContent=query?`${results.length} matches (up to 35)`: `Nearest places · ${data.pois.length} named POIs`
  const frag=document.createDocumentFragment()
  for(const poi of results){
    const button=document.createElement('button')
    button.className='poi-item'
    const name=document.createElement('strong');name.textContent=poi.name
    const type=document.createElement('small');type.textContent=poi.type.replace(/_/g,' ')
    button.append(name,type)
    button.addEventListener('click',()=>{teleport(...poi.at);toggleMap(false)})
    frag.append(button)
  }
  $('poi-list').replaceChildren(frag)
}

async function initialize() {
  const response=await fetch(`${import.meta.env.BASE_URL}data/mandalay.json`)
  if(!response.ok)throw new Error(`Offline map missing (HTTP ${response.status}). Run npm run import:map.`)
  data=await response.json()
  if(data.format!=='mandalay-life-offline-osm-v1')throw new Error('Unknown offline map format. Run npm run import:map.')
  city=new OSMCity(scene,data,mobile)
  const turf=noiseTexture([216,224,195])
  turf.repeat.set(75,55)
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(data.sizeMeters.width+350,data.sizeMeters.height+350),
    new THREE.MeshStandardMaterial({color:'#91a481',roughness:1,map:turf}))
  ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground)
  spawn=nearestRoad(0,0)
  teleport(...spawn)
  facades=new FacadeSystem(scene,data.buildings,mobile)
  facades.setQuality(quality)
  fleet=new VehicleSystem(scene,data,city,spawn,mobile)
  pedestrians=new CityLife(scene,data,city,mobile)
  weather=new WeatherSystem(scene,mobile)
  mission=new DeliveryMission(scene,data,spawn)
  makeTrees(scene,data)
  createStreetFurniture(scene,data,city,mobile)
  $('feature-count').textContent=`${data.counts.roads.toLocaleString()} roads · ${data.counts.buildings.toLocaleString()} buildings · ${data.counts.pois} places`
  $('map-size').textContent=`${(data.sizeMeters.width/1000).toFixed(2)} × ${(data.sizeMeters.height/1000).toFixed(2)} km • OSM source`
  $('mode').textContent='OFFLINE • REAL OSM DATA'
  $('notice').textContent='Actual OSM streets and footprints. Most building heights are estimated; landscaping is decorative.'
  smallBase=drawMiniBase($('mini-map'))
  drawPlayerOnMaps()
  updatePoiList()
  const glb=await loadBlenderAssets(scene,data,city,spawn)
  $('model-status').textContent=glb.loaded?`${glb.loaded} .glb model(s) loaded · demo kiosk is fictional`:'No optional .glb assets loaded'
  if(glb.errors.length)console.warn('Optional GLB assets:',glb.errors)
  $('quality-readout').textContent=`Visual quality: ${quality} · dynamic facade detail`
}
initialize().catch(error=>{console.error(error);$('mode').textContent='MAP LOAD ERROR';$('notice').textContent=error.message})

function resize(){
  const w=window.innerWidth,h=window.innerHeight
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)
}
window.addEventListener('resize',resize);resize()
let previous=performance.now(),lastMinimap=0,lastPoiUpdate=0
function frame(now){
  requestAnimationFrame(frame)
  const dt=Math.min(.05,(now-previous)/1000||0);previous=now
  if(city && !mapVisible){
    if(fleet?.driving){
      fleet.update(dt,controller,hero,data.sizeMeters)
      yaw=fleet.heading
      hero.rotation.y=-yaw
      yLift=0;velocityY=0
    } else {
      yaw+=(Number(controller.has('left'))-Number(controller.has('right')))*dt*2.05
      const movement=Number(controller.has('forward'))-Number(controller.has('back'))
      const speed=controller.has('run')?15:8
      const dx=Math.sin(yaw)*movement*speed*dt,dz=-Math.cos(yaw)*movement*speed*dt
      const limitX=data.sizeMeters.width/2-6,limitZ=data.sizeMeters.height/2-6
      const x=THREE.MathUtils.clamp(hero.position.x+dx,-limitX,limitX)
      const z=THREE.MathUtils.clamp(hero.position.z+dz,-limitZ,limitZ)
      if(!city.isBlocked(x,hero.position.z))hero.position.x=x
      if(!city.isBlocked(hero.position.x,z))hero.position.z=z
      velocityY-=20*dt;yLift=Math.max(0,yLift+velocityY*dt)
      if(yLift===0)velocityY=0
      hero.rotation.y=-yaw;hero.position.y=yLift
      character.animate(dt,movement*speed)
      fleet?.updateTraffic(dt)
    }
    city.update(hero.position.x,hero.position.z,isAerial)
    facades?.update(hero.position.x,hero.position.z,now)
    pedestrians?.update(dt)
    weather?.update(dt,hero.position.x,hero.position.z)
    mission?.update(now)
  }
  if(isAerial){
    cameraPos.set(hero.position.x+20,hero.position.y+340,hero.position.z+100)
    targetPos.set(hero.position.x,0,hero.position.z)
  } else if(fleet?.driving){
    cameraPos.set(hero.position.x-Math.sin(yaw)*15,hero.position.y+9,hero.position.z+Math.cos(yaw)*15)
    targetPos.set(hero.position.x,hero.position.y+1.9,hero.position.z)
  } else {
    cameraPos.set(hero.position.x-Math.sin(yaw)*17,hero.position.y+11,hero.position.z+Math.cos(yaw)*17)
    targetPos.set(hero.position.x,hero.position.y+2.1,hero.position.z)
  }
  camera.position.lerp(cameraPos,1-Math.exp(-5.8*dt))
  camera.lookAt(targetPos)
  sun.position.set(hero.position.x-160,hero.position.y+240,hero.position.z+140)
  sun.target.position.set(hero.position.x,0,hero.position.z)
  if(now-lastMinimap>220){
    if(city)drawPlayerOnMaps()
    if(mission){
      $('mission-status').textContent=mission.text(hero.position.x,hero.position.z)
      $('drive-status').textContent=fleet?.driving?`Driving · ${fleet.getSpeedText()}`:'On foot · approach the red car and press E'
    }
    lastMinimap=now
  }
  if(now-lastPoiUpdate>4500&&city){
    if(!$('poi-search').value)updatePoiList()
    lastPoiUpdate=now
  }
  renderer.render(scene,camera)
}
requestAnimationFrame(frame)
