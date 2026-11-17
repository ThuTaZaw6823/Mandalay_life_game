import * as THREE from 'three'

/** Low-draw-call stylized character with separate limb pivots. Replaceable by GLB. */
export class Character {
  constructor(scene) {
    this.root=new THREE.Group()
    this.root.name='Player character (stylized v8.1 prototype)'
    const shirt=new THREE.MeshStandardMaterial({color:'#e67e4a',roughness:.82})
    const skin=new THREE.MeshStandardMaterial({color:'#ca9274',roughness:.9})
    const pants=new THREE.MeshStandardMaterial({color:'#223e4d',roughness:.95})
    const shoes=new THREE.MeshStandardMaterial({color:'#25303a',roughness:.95})
    const hair=new THREE.MeshStandardMaterial({color:'#302c2a',roughness:1})
    const bag=new THREE.MeshStandardMaterial({color:'#786b52',roughness:1})
    const mesh=(geo,mat,parent,pos)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);parent.add(m);return m}
    mesh(new THREE.CapsuleGeometry(.42,.79,3,8),shirt,this.root,[0,1.59,0])
    mesh(new THREE.SphereGeometry(.39,12,10),skin,this.root,[0,2.64,0])
    mesh(new THREE.SphereGeometry(.395,12,7,0,Math.PI*2,0,Math.PI*.45),hair,this.root,[0,2.81,0])
    mesh(new THREE.BoxGeometry(.59,.68,.2),bag,this.root,[0,1.58,.43])
    this.legs=[];this.arms=[]
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.2,.98,0);this.root.add(leg)
      mesh(new THREE.BoxGeometry(.29,.87,.31),pants,leg,[0,-.4,0])
      mesh(new THREE.BoxGeometry(.32,.17,.52),shoes,leg,[0,-.88,-.1])
      this.legs.push(leg)
      const arm=new THREE.Group();arm.position.set(side*.54,2.02,0);this.root.add(arm)
      mesh(new THREE.CapsuleGeometry(.13,.57,3,6),shirt,arm,[0,-.34,0])
      mesh(new THREE.SphereGeometry(.14,8,6),skin,arm,[0,-.78,0])
      this.arms.push(arm)
    }
    this.walkTime=0
    scene.add(this.root)
  }
  animate(dt,speed) {
    const gait=Math.min(1,Math.abs(speed)/6)
    if(gait>0.02)this.walkTime+=dt*(4.8+Math.abs(speed)*.45)
    const cycle=Math.sin(this.walkTime)
    this.legs[0].rotation.x=cycle*.55*gait;this.legs[1].rotation.x=-cycle*.55*gait
    this.arms[0].rotation.x=-cycle*.36*gait;this.arms[1].rotation.x=cycle*.36*gait
    this.root.position.y += 0 // leave jump integration to main loop
  }
}
