import * as THREE from 'three'

/** Seeded, tiny, generated textures; no external tiles or network fetch. */
export function noiseTexture(rgb=[202,203,193],size=128) {
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size
  const context=canvas.getContext('2d');const pixels=context.createImageData(size,size)
  let seed=71
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  for(let i=0;i<size*size;i++){
    const deviation=(random()-.5)*28
    for(let c=0;c<3;c++)pixels.data[i*4+c]=Math.max(0,Math.min(255,rgb[c]+deviation))
    pixels.data[i*4+3]=255
  }
  context.putImageData(pixels,0,0)
  const texture=new THREE.CanvasTexture(canvas)
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.colorSpace=THREE.SRGBColorSpace
  texture.anisotropy=4
  return texture
}
