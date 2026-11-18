/**
 * Mandalay Life — Creative Royal City Map
 * Three.js landmarks + interactive in-game world map.
 * Written for the existing V7 project (Three.js / Vite).
 * The geography is intentionally stylized, not a survey or GPS map.
 */
import * as THREE from 'three'
import { MAP_HALF, ROADS_X, ROADS_Z, RIVER } from './world.js'
import { PALACE, BRIDGES, ROOFTOPS } from './v5layout.js'

const palette = {
  ink: '#172b34', river: '#397f9c', road: '#627074', street: '#d1bd98',
  earth: '#a7b98e', park: '#719b76', gold: '#f5ca79', ivory: '#f7efdb',
  brick: '#ae6654', pin: '#fcdb83', blue: '#7dc2dc'
}

function createLandmarks (scene, world) {
  const root = new THREE.Group()
  root.name = 'Mandalay Cultural Landmarks'
  ;(world?.city || scene).add(root)
  const materials = new Map()
  const material = hex => {
    if (!materials.has(hex)) materials.set(hex, new THREE.MeshStandardMaterial({
      color: hex, roughness: 0.78, metalness: hex === 0xe6b753 ? 0.24 : 0.02
    }))
    return materials.get(hex)
  }
  function block (parent, hex, x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material(hex))
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  function cylinder (parent, hex, x, y, z, top, bottom, height, sides = 12) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), material(hex))
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    parent.add(m)
    return m
  }
  function stupa (x, z, scale = 1, baseY = 0) {
    const g = new THREE.Group()
    g.position.set(x, baseY, z)
    g.scale.setScalar(scale)
    root.add(g)
    block(g, 0xd8c9a5, 0, 0.6, 0, 25, 1.2, 25)
    for (let i = 0; i < 3; i++) {
      block(g, 0xf2e3ba, 0, 1.6 + i * 1.4, 0, 20 - i * 4, 1.4, 20 - i * 4)
    }
    cylinder(g, 0xe6b753, 0, 7, 0, 6, 8.3, 4, 16)
    cylinder(g, 0xf9d277, 0, 11, 0, 3.7, 5.6, 4.5, 16)
    cylinder(g, 0xe6b753, 0, 15, 0, 1.8, 3.5, 5.0, 12)
    cylinder(g, 0xffdc86, 0, 20, 0, 0, 1.6, 6, 12)
    for (const [px, pz] of [[-9,-9],[9,-9],[-9,9],[9,9]]) {
      cylinder(g, 0xe4b85d, px, 2.7, pz, 0, 1.25, 5.3, 8)
    }
    return g
  }
  // Kuthodaw-inspired pagoda and a teak monastery north of the palace.
  stupa(410, -1094, 0.82)
  if (typeof world.addObstacle === 'function') world.addObstacle(410, -1094, 24, 24, 1, 26)
  const monastery = new THREE.Group()
  monastery.position.set(283, 0, -1090)
  root.add(monastery)
  block(monastery, 0xc2ac84, 0, 0.6, 0, 54, 1.2, 35)
  for (const x of [-20,-7,7,20]) for (const z of [-11,11]) {
    block(monastery, 0x704c36, x, 5.5, z, 2.4, 9.2, 2.4)
  }
  block(monastery, 0x794a33, 0, 10, 0, 53, 2.2, 32)
  for (let i = 0; i < 3; i++) {
    const roof = block(monastery, i % 2 ? 0xa94735 : 0x913d35,
      0, 12.6 + i * 3.2, 0, 63 - i * 13, 2, 40 - i * 8)
    roof.rotation.z = i % 2 ? -0.04 : 0.04
    block(monastery, 0xdab66a, 0, 13.8 + i * 3.2, 0, 64 - i * 13, 0.34, 41 - i * 8)
  }
  cylinder(monastery, 0xe6b753, 0, 23.5, 0, 0, 2.3, 6, 8)
  if (typeof world.addObstacle === 'function') world.addObstacle(283, -1090, 53, 33, 1, 25)

  // Mahamuni-inspired southern landmark, outside the main generated street grid.
  stupa(185, 1060, 1.55)
  for (const px of [-34,34]) for (const pz of [-34,34]) {
    stupa(185 + px, 1060 + pz, 0.28)
  }
  if (typeof world.addObstacle === 'function') world.addObstacle(185, 1060, 46, 46, 0, 41)

  // Riverside promenade and decorative boats on the west edge of the city.
  for (let i = -2; i <= 2; i++) {
    const z = 240 + i * 40
    block(root, 0xd9c49c, -889, 0.2, z, 22, 0.4, 10)
    block(root, 0x876a4e, -901, 0.58, z, 2, 1.2, 12)
    block(root, 0xdab96c, -881, 2.8, z + 4.5, 0.7, 5, 0.7)
  }
  return root
}

export function installMandalayMap ({ scene, world, player, getMission, isReady, onPauseChange }) {
  createLandmarks(scene, world)
  const spots = [
    { id:'palace', label:'Royal Palace', category:'Heritage', x:PALACE.x,z:PALACE.z, icon:'♛',desc:'Historic citadel, moat, four bridges and royal architecture.' },
    { id:'hill', label:'Mandalay Hill', category:'Heritage', x:PALACE.x + 285,z:PALACE.z - 255,icon:'▲',desc:'New scenic hill and golden lookout on the northern skyline.' },
    { id:'kuthodaw', label:'Kuthodaw Pagoda',category:'Heritage',x:410,z:-1094,icon:'✦',desc:'New stylized pagoda landmark near the palace quarter.' },
    { id:'monastery',label:'Royal Teak Monastery',category:'Heritage',x:283,z:-1090,icon:'⌂',desc:'New tiered teak-roof monastery inspired by Mandalay architecture.' },
    { id:'mahamuni', label:'Mahamuni Quarter',category:'Heritage',x:185,z:1060,icon:'✦',desc:'New southern golden pagoda and temple court.' },
    { id:'zaycho',label:'Zay Cho Plaza',category:'Shopping',x:world.plaza.x,z:world.plaza.z,icon:'◆',desc:'Existing market, storefronts, clock tower and shopping district.' },
    { id:'depot',label:'Delivery Depot',category:'Activities',x:world.depot.x,z:world.depot.z,icon:'▣',desc:'Pick up jobs and earn coins by making deliveries.' },
    { id:'home',label:'Your Land Plot',category:'Activities',x:world.plot.x,z:world.plot.z,icon:'⌂',desc:'Buy land, build your own house, and plant trees.' },
    { id:'river',label:'Ayeyarwady Riverside',category:'Nature',x:-874,z:320,icon:'≈',desc:'A new western riverside promenade, piers and sunset views.' },
    { id:'airport',label:'City Airfield',category:'Transport',x:world.airport.x,z:world.airport.z,icon:'✈',desc:'Existing runway and terminal in the game world.' },
    ...ROOFTOPS.map((r,i)=>({id:`roof${i}`,label:`Rooftop Helipad ${i+1}`,category:'Transport',x:r.x,z:r.z,icon:'H',desc:'Existing rooftop helicopter landing area.'}))
  ]
  const css = document.createElement('style')
  css.id = 'creative-mandalay-map-style'
  css.textContent = `
  .mdMapOpen{position:absolute;right:8px;top:7px;border:1px solid #f3d59880;background:#132d36e6;color:#ffdfa0;border-radius:8px;font-size:9px;font-weight:900;padding:5px 8px;cursor:pointer;z-index:1}
  .minimapCard{position:fixed}.minimapCard #minimap{cursor:pointer}
  .mdMapOverlay[hidden]{display:none!important}
  .mdMapOverlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:clamp(8px,2vw,22px);background:#081923e8;backdrop-filter:blur(12px);font-family:Inter,system-ui,-apple-system,sans-serif;color:#f9efd8}
  .mdMapShell{height:min(92dvh,900px);width:min(1330px,98vw);display:flex;flex-direction:column;border:1px solid #d6b76b80;border-radius:20px;overflow:hidden;background:linear-gradient(150deg,#21383c,#102631 65%);box-shadow:0 20px 90px #0009}
  .mdMapHead{min-height:72px;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 20px;border-bottom:1px solid #ffffff21}
  .mdMapEyebrow{font-size:10px;letter-spacing:.24em;color:#eacb8b;font-weight:800}
  .mdMapTitle{font-size:clamp(18px,2vw,29px);font-weight:950;letter-spacing:.04em;margin:1px 0 0}
  .mdMapHeadBtns,.mdMapControls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
  .mdMapBtn{border:1px solid #ead19a70;background:#223e43;color:#fbe9bc;border-radius:9px;padding:9px 12px;cursor:pointer;font-weight:800;font-size:12px;white-space:nowrap}
  .mdMapBtn:hover,.mdMapBtn:focus-visible{background:#456065;outline-color:#eacb8b}
  .mdMapBtn.primary{background:#e0b965;color:#16323b}
  .mdMapBody{display:grid;grid-template-columns:minmax(0,1fr) 292px;min-height:0;flex:1}
  .mdMapStage{position:relative;min-height:0;overflow:hidden;background:#9fad91;touch-action:none}
  .mdMapCanvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
  .mdMapCanvas:active{cursor:grabbing}
  .mdMapStageTop{position:absolute;left:12px;right:12px;top:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;pointer-events:none}
  .mdMapTag{border:1px solid #ddcc9a;background:#143943e8;color:#ffe2a8;padding:8px 11px;border-radius:8px;font-weight:900;font-size:10px;letter-spacing:.1em}
  .mdMapControls{pointer-events:auto;justify-content:flex-end}
  .mdMapSide{padding:18px;overflow:auto;background:#183039;border-left:1px solid #ffffff24}
  .mdMapSide h3{font-size:10px;letter-spacing:.14em;color:#c3af84;margin:4px 0 10px}
  .mdMapSpotList{display:grid;gap:6px;margin:0 0 15px}
  .mdMapSpot{display:flex;gap:8px;align-items:center;width:100%;border:1px solid #ffffff24;background:#ffffff0d;color:#f3e7d0;padding:9px;text-align:left;border-radius:10px;cursor:pointer;font-size:12px}
  .mdMapSpot:hover,.mdMapSpot[aria-pressed=true]{border-color:#edc875;background:#d8b76a2d}
  .mdMapSpotIcon{width:25px;height:25px;display:grid;place-items:center;border-radius:7px;background:#dfc08033;color:#f5d083;font-size:16px;font-weight:900}
  .mdMapSpot small{display:block;color:#9fbdc4;font-size:10px;margin-top:2px}
  .mdMapSpotDetail{background:#f3d99c12;border:1px solid #edce9061;padding:14px;border-radius:12px}
  .mdMapSpotDetail strong{font-size:16px}.mdMapSpotDetail p{font-size:12px;color:#c8d4d4;line-height:1.5;margin:8px 0 12px}
  .mdMapFooter{padding:9px 16px;font-size:10px;letter-spacing:.04em;color:#a9c3c3;border-top:1px solid #ffffff19;display:flex;justify-content:space-between;gap:10px}
  .mdMapFilters{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px}
  .mdMapFilter{border:1px solid #ffffff30;border-radius:30px;background:transparent;color:#bfd0ce;padding:5px 9px;font-size:10px;cursor:pointer}
  .mdMapFilter[aria-pressed=true]{background:#d1b678;color:#102a32;border-color:#d1b678}
  @media(max-width:720px){
    .mdMapOverlay{padding:0}.mdMapShell{width:100vw;height:100dvh;border:0;border-radius:0}
    .mdMapHead{padding:12px;min-height:62px}.mdMapTitle{font-size:18px}.mdMapEyebrow{font-size:8px}
    .mdMapBody{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(210px,1fr) minmax(150px,32%)}
    .mdMapSide{border-left:0;border-top:1px solid #ffffff33;padding:11px}
    .mdMapSpotList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
    .mdMapTag{font-size:8px;padding:6px}.mdMapBtn{font-size:11px;padding:8px}.mdMapFooter{font-size:9px}
  }`
  document.head.appendChild(css)

  const overlay = document.createElement('section')
  overlay.className = 'mdMapOverlay'
  overlay.hidden = true
  overlay.setAttribute('role','dialog')
  overlay.setAttribute('aria-label','Mandalay city map')
  overlay.setAttribute('aria-modal','true')
  overlay.innerHTML = `
    <div class="mdMapShell">
      <header class="mdMapHead"><div><div class="mdMapEyebrow">MANDALAY LIFE • EXPLORER'S ATLAS</div><div class="mdMapTitle">THE ROYAL CITY MAP</div></div><div class="mdMapHeadBtns"><button class="mdMapBtn" data-md-action="center">⌖ Center on me</button><button class="mdMapBtn primary" data-md-action="close" aria-label="Close map">✕ Close</button></div></header>
      <div class="mdMapBody"><div class="mdMapStage"><canvas class="mdMapCanvas" aria-label="Interactive map: drag to pan, scroll to zoom, select a landmark"></canvas><div class="mdMapStageTop"><div class="mdMapTag">N ↑ &nbsp; • &nbsp; STYLIZED CITY</div><div class="mdMapControls"><button class="mdMapBtn" data-md-action="zoom-in" aria-label="Zoom in">＋</button><button class="mdMapBtn" data-md-action="zoom-out" aria-label="Zoom out">－</button></div></div></div>
      <aside class="mdMapSide"><h3>DISCOVER THE CITY</h3><div class="mdMapFilters"></div><div class="mdMapSpotList"></div><div class="mdMapSpotDetail" aria-live="polite"><strong>Choose a destination</strong><p>Select a landmark to see its location, description and distance from you.</p><button class="mdMapBtn primary" data-md-action="guide" disabled>Set waypoint</button></div></aside></div>
      <footer class="mdMapFooter"><span>Drag to explore • Wheel / ＋ − to zoom • M to close</span><span>Fictionalized game layout • Distances are straight-line</span></footer>
    </div>`
  document.body.appendChild(overlay)
  const canvas = overlay.querySelector('canvas')
  const ctx = canvas.getContext('2d')
  const stage = overlay.querySelector('.mdMapStage')
  const list = overlay.querySelector('.mdMapSpotList')
  const filters = overlay.querySelector('.mdMapFilters')
  const detail = overlay.querySelector('.mdMapSpotDetail')
  let selected = null
  let waypoint = null
  let category = 'All'
  let opened = false
  let zoom = 1.55
  let viewX = player.x
  let viewZ = player.z - 180
  let width = 0
  let height = 0
  let scale = 1
  let pointer = null
  let tick = null
  const cats = ['All','Heritage','Shopping','Activities','Nature','Transport']
  const spotById = id => spots.find(s => s.id === id)
  const coord = (x,z) => ({ x: width / 2 + (x - viewX) * scale, y: height / 2 + (z - viewZ) * scale })
  const rect = (x,z,w,h) => { const p=coord(x,z);ctx.fillRect(p.x,p.y,w*scale,h*scale) }
  const visible = s => category === 'All' || s.category === category

  function fitCanvas () {
    const r = stage.getBoundingClientRect()
    width = Math.max(100,r.width); height = Math.max(100,r.height)
    const dpr = Math.min(window.devicePixelRatio || 1,2)
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr,0,0,dpr,0,0)
    scale = Math.min(width,height) / (2 * MAP_HALF) * zoom
  }
  function textAt (label,x,z,size=10,color='#294448') {
    const p=coord(x,z)
    if(p.x < -200 || p.x > width+200 || p.y < -30 || p.y > height+30) return
    ctx.font = `800 ${size}px system-ui,sans-serif`
    ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(label,p.x,p.y)
  }
  function draw () {
    if(!opened) return
    ctx.clearRect(0,0,width,height)
    const bg=ctx.createLinearGradient(0,0,width,height)
    bg.addColorStop(0,'#b7c49b');bg.addColorStop(1,'#92b299')
    ctx.fillStyle=bg;ctx.fillRect(0,0,width,height)
    // Soft surrounding countryside and the western Ayeyarwady waterway.
    ctx.fillStyle='#78a08b';rect(-MAP_HALF,-MAP_HALF,MAP_HALF*2,MAP_HALF*2)
    ctx.fillStyle='#b7c7a6';rect(-890,-990,1850,2010)
    ctx.fillStyle=palette.river;rect(RIVER.minX,-MAP_HALF,RIVER.maxX-RIVER.minX,MAP_HALF*2)
    ctx.fillStyle='#75b2c4';rect(RIVER.minX+12,-MAP_HALF,7,MAP_HALF*2)
    ctx.fillStyle='#d7cda7';rect(RIVER.maxX, -MAP_HALF, 12,MAP_HALF*2)
    // City blocks and road grid mirror the actual generated 3D world.
    ctx.strokeStyle='#c7b898';ctx.lineWidth=Math.max(.6,1.6*zoom/1.7)
    for(const x of ROADS_X){const a=coord(x,-MAP_HALF+20),b=coord(x,MAP_HALF-20);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    for(const z of ROADS_Z){const a=coord(-830,z),b=coord(MAP_HALF-20,z);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    ctx.strokeStyle='#5a6664';ctx.lineWidth=Math.max(2,12*scale)
    for(const x of ROADS_X){const a=coord(x,-MAP_HALF+20),b=coord(x,MAP_HALF-20);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    for(const z of ROADS_Z){const a=coord(-830,z),b=coord(MAP_HALF-20,z);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    // Royal City complex: square moat, central lawn, walls and gate bridges.
    const o=PALACE.outerHalf,i=PALACE.innerHalf,m=PALACE.wallHalf
    ctx.fillStyle='#448fb0';rect(PALACE.x-o,PALACE.z-o,2*o,2*o)
    ctx.fillStyle='#7b9d70';rect(PALACE.x-i,PALACE.z-i,2*i,2*i)
    ctx.strokeStyle='#ac5143';ctx.lineWidth=Math.max(2,7*scale)
    const w=coord(PALACE.x-m,PALACE.z-m)
    ctx.strokeRect(w.x,w.y,2*m*scale,2*m*scale)
    ctx.fillStyle='#c79870';rect(PALACE.x-26,PALACE.z-26,52,52)
    ctx.fillStyle='#be4736';rect(PALACE.x-19,PALACE.z-19,38,38)
    ctx.fillStyle='#f2d185';rect(PALACE.x-8,PALACE.z-8,16,16)
    for(const b of BRIDGES){ctx.fillStyle='#e2c78c';rect(b.x-(b.axis==='z'?8:23),b.z-(b.axis==='z'?23:8),b.axis==='z'?16:46,b.axis==='z'?46:16)}
    // Mandalay Hill and its terrace contours.
    const h=coord(666,-1125)
    for(const [r,c] of [[130,'#648961'],[108,'#739669'],[80,'#90a97a'],[49,'#afbc8a']]){
      ctx.beginPath();ctx.fillStyle=c;ctx.ellipse(h.x,h.y,r*scale,r*scale,0,0,2*Math.PI);ctx.fill()
    }
    // Airfield and existing player's building plot.
    ctx.fillStyle='#45535b';rect(world.airport.x-world.airport.runwayWidth/2,world.airport.z-world.airport.runwayLength/2,world.airport.runwayWidth,world.airport.runwayLength)
    ctx.fillStyle='#f7edd4';for(let i=-160;i<=160;i+=40)rect(world.airport.x-1,world.airport.z+i,2,19)
    ctx.fillStyle='#ecd393';rect(world.plot.x-14,world.plot.z-15,28,30)
    ctx.fillStyle='#a4c188';rect(185-56,1060-56,112,112)
    // Atmospheric district names.
    textAt('ROYAL QUARTER',PALACE.x,PALACE.z+104,10,'#f8eed0')
    textAt('DOWNTOWN', 20,230,11,'#456257')
    textAt('SOUTH CITY',185,880,10,'#476656')
    textAt('AIRFIELD DISTRICT',580,-185,10,'#475e64')
    textAt('RIVER BANK',-810,660,10,'#486e78')
    // Chosen waypoint: a straight-line guide, not road navigation.
    if(waypoint){const a=coord(player.x,player.z),b=coord(waypoint.x,waypoint.z)
      ctx.beginPath();ctx.setLineDash([7,6]);ctx.lineWidth=2.2;ctx.strokeStyle='#f2c968';ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])}
    // POIs are rendered above roads for easy tapping.
    for(const s of spots){if(!visible(s))continue;const p=coord(s.x,s.z)
      if(p.x < -40 || p.x > width+40 || p.y < -40 || p.y > height+40)continue
      const r=s===selected?13:10
      ctx.beginPath();ctx.fillStyle=s===selected?'#f7d27f':'#153b42';ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='#f8d494';ctx.lineWidth=2;ctx.stroke()
      ctx.fillStyle=s===selected?'#203b3e':'#ffe4a7';ctx.font='bold 13px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.icon,p.x,p.y)
      if(zoom>1.25 || s===selected){ctx.textBaseline='alphabetic';ctx.font='700 10px system-ui,sans-serif';
        const tw=ctx.measureText(s.label).width;ctx.fillStyle='#14343edc';ctx.fillRect(p.x-tw/2-7,p.y+13,tw+14,16)
        ctx.fillStyle='#fff0ca';ctx.fillText(s.label,p.x,p.y+25)}
    }
    // Existing delivery job stays visible even if no manual waypoint is set.
    const job = typeof getMission === 'function' ? getMission() : null
    const target = job?.destination || world.depot
    if (target) {
      const j = coord(target.x,target.z)
      if (j.x > -18 && j.x < width+18 && j.y > -18 && j.y < height+18) {
        ctx.save();ctx.translate(j.x,j.y);ctx.rotate(Math.PI/4)
        ctx.fillStyle='#f5a85e';ctx.fillRect(-5,-5,10,10)
        ctx.strokeStyle='#fff3d3';ctx.lineWidth=1.5;ctx.strokeRect(-5,-5,10,10)
        ctx.restore()
        ctx.font='800 10px system-ui,sans-serif';ctx.fillStyle='#31535c';ctx.textAlign='left'
        ctx.fillText(job ? 'ACTIVE DELIVERY' : 'DELIVERY DEPOT',j.x+11,j.y-7)
      }
    }
    const me=coord(player.x,player.z)
    ctx.beginPath();ctx.fillStyle='#fff';ctx.arc(me.x,me.y,7,0,Math.PI*2);ctx.fill()
    ctx.strokeStyle='#244e57';ctx.lineWidth=3;ctx.stroke()
    ctx.beginPath();ctx.fillStyle='#eebd5d';ctx.arc(me.x,me.y,2.5,0,Math.PI*2);ctx.fill()
    ctx.fillStyle='#1d3e45';ctx.font='900 10px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText('YOU',me.x+12,me.y+4)
    // Compass rose, lower-left.
    ctx.fillStyle='#f8e6c2';ctx.font='900 18px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText('N ↑',15,height-19)
  }
  function renderList () {
    filters.replaceChildren()
    for(const c of cats){const b=document.createElement('button');b.type='button';b.className='mdMapFilter';b.textContent=c;b.setAttribute('aria-pressed',String(category===c));b.addEventListener('click',()=>{category=c;renderList();draw()});filters.appendChild(b)}
    list.replaceChildren()
    for(const s of spots.filter(visible)){
      const b=document.createElement('button');b.type='button';b.className='mdMapSpot';b.setAttribute('aria-pressed',String(s===selected))
      const icon=document.createElement('span');icon.className='mdMapSpotIcon';icon.textContent=s.icon
      const label=document.createElement('span');label.textContent=s.label
      const sub=document.createElement('small');sub.textContent=s.category;label.appendChild(sub)
      b.append(icon,label);b.addEventListener('click',()=>select(s,true));list.appendChild(b)
    }
  }
  function select (s, center=false) {
    selected=s
    if(center){viewX=s.x;viewZ=s.z;zoom=Math.max(zoom,1.75);fitCanvas()}
    const distance=Math.round(Math.hypot(player.x-s.x,player.z-s.z))
    detail.replaceChildren()
    const strong=document.createElement('strong');strong.textContent=s.label
    const p=document.createElement('p');p.textContent=`${s.desc} Approx. ${distance} in-game units away.`
    const btn=document.createElement('button');btn.type='button';btn.className='mdMapBtn primary';btn.textContent='Set waypoint'
    btn.addEventListener('click',()=>{waypoint=s;btn.textContent='✓ Waypoint active';draw()})
    detail.append(strong,p,btn)
    renderList();draw()
  }
  function open () {
    if(opened || (typeof isReady==='function' && !isReady())) return
    opened=true;overlay.hidden=false
    if(onPauseChange)onPauseChange(true)
    viewX=player.x;viewZ=player.z-160
    zoom=window.innerWidth<720?1.35:1.65
    fitCanvas();renderList();draw();tick=setInterval(draw,175)
    overlay.querySelector('[data-md-action="close"]').focus()
  }
  function close () {
    if(!opened)return
    opened=false;overlay.hidden=true;clearInterval(tick);tick=null
    if(onPauseChange)onPauseChange(false)
  }
  for(const b of overlay.querySelectorAll('[data-md-action]')){
    b.addEventListener('click',()=>{
      const a=b.dataset.mdAction
      if(a==='close')close()
      if(a==='center'){viewX=player.x;viewZ=player.z;draw()}
      if(a==='zoom-in'||a==='zoom-out'){zoom=Math.min(7,Math.max(.7,zoom*(a==='zoom-in'?1.3:1/1.3)));fitCanvas();draw()}
    })
  }
  overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)close()})
  stage.addEventListener('wheel',event=>{event.preventDefault();zoom=Math.min(7,Math.max(.7,zoom*(event.deltaY<0?1.15:1/1.15)));fitCanvas();draw()},{passive:false})
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,originX:viewX,originZ:viewZ};canvas.setPointerCapture(e.pointerId)})
  canvas.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;viewX=pointer.originX-(e.clientX-pointer.x)/scale;viewZ=pointer.originZ-(e.clientY-pointer.y)/scale;draw()})
  canvas.addEventListener('pointerup',e=>{
    if(!pointer||e.pointerId!==pointer.id)return
    const moved=Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)
    pointer=null
    if(moved>10)return
    const r=canvas.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top
    const found=spots.filter(visible).map(s=>({s,p:coord(s.x,s.z)})).find(({p})=>Math.hypot(p.x-mx,p.y-my)<24)
    if(found)select(found.s)
  })
  canvas.addEventListener('pointercancel',()=>{pointer=null})
  document.addEventListener('keydown',e=>{
    if(e.code==='KeyM'){e.preventDefault();e.stopImmediatePropagation();opened?close():open();return}
    if(opened){e.stopImmediatePropagation();if(e.code==='Escape'){e.preventDefault();close()}}
  },true)
  window.addEventListener('resize',()=>{if(opened){fitCanvas();draw()}})
  const minimap=document.getElementById('minimap')
  minimap?.addEventListener('click',open)
  minimap?.addEventListener('keydown',e=>{if(e.code==='Enter'){e.preventDefault();open()}})
  if(minimap){minimap.setAttribute('role','button');minimap.setAttribute('aria-label','Open full Mandalay city map');minimap.tabIndex=0}
  const mm=minimap?.closest('.minimapCard')
  if(mm){const b=document.createElement('button');b.className='mdMapOpen';b.type='button';b.textContent='MAP ⛶';b.addEventListener('click',open);mm.appendChild(b)}
  const mobile=document.querySelector('.mobileButtons')
  if(mobile){const b=document.createElement('button');b.className='mobileBtn';b.type='button';b.textContent='MAP';b.addEventListener('click',open);mobile.appendChild(b)}
  return { open,close,isOpen:()=>opened,getWaypoint:()=>waypoint,landmarks:spots }
}
