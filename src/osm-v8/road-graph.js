/** Pure, deterministic street geometry helpers. Distances are OSM projected meters. */
export const VEHICLE_ROADS = new Set(['motorway','trunk','primary','secondary','tertiary','residential','unclassified','service','living_street','primary_link','secondary_link','tertiary_link'])

export function closestPointOnSegment(x,z,a,b) {
  const dx=b[0]-a[0], dz=b[1]-a[1], len2=dx*dx+dz*dz
  if(len2<1e-8) return {x:a[0],z:a[1],t:0,distance2:(x-a[0])**2+(z-a[1])**2}
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/len2))
  const px=a[0]+t*dx,pz=a[1]+t*dz
  return {x:px,z:pz,t,distance2:(x-px)**2+(z-pz)**2}
}

export function nearestDriveableRoad(data,x,z) {
  let best={x,z,distance2:Infinity,heading:0}
  for(const road of data.roads){
    if(!VEHICLE_ROADS.has(road.kind)) continue
    for(let i=1;i<road.path.length;i++){
      const a=road.path[i-1],b=road.path[i]
      const result=closestPointOnSegment(x,z,a,b)
      if(result.distance2<best.distance2) best={...result,heading:Math.atan2(b[0]-a[0],-(b[1]-a[1])),road}
    }
  }
  return best
}

export function validRoadRoutes(data, bounds=data.sizeMeters) {
  const maxX=bounds.width/2-8,maxZ=bounds.height/2-8
  const routes=[]
  for(const r of data.roads) {
    if(!VEHICLE_ROADS.has(r.kind))continue
    let run=[]
    const flush=()=>{
      if(run.length>=2&&run.slice(1).some((p,i)=>Math.hypot(p[0]-run[i][0],p[1]-run[i][1])>15))
        routes.push({...r,path:run})
      run=[]
    }
    for(const point of r.path) {
      if(Math.abs(point[0])>=maxX||Math.abs(point[1])>=maxZ){flush();continue}
      const previous=run[run.length-1]
      if(previous&&Math.hypot(previous[0]-point[0],previous[1]-point[1])>475)flush()
      run.push(point)
    }
    flush()
  }
  return routes
}

export function hashNumber(v) {
  let h=2166136261>>>0
  for(let i=0;i<String(v).length;i++){h^=String(v).charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return h>>>0
}
