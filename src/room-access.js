const directions=[[1,0],[-1,0],[0,1],[0,-1]]

export function roomAccess({left,front,width,depth,aisleX}) {
  const solid=new Uint8Array(width*depth)
  const index=(x,z)=>x-left+(z-front)*width
  const inside=(x,z)=>x>=left&&x<left+width&&z>=front&&z<front+depth
  function mark({x,z,w,d},value=1) {
    for(let a=x;a<x+w;a++) for(let b=z;b<z+d;b++) {
      if(inside(a,b)) solid[index(a,b)]=value
    }
  }
  function explore(start,trace=false) {
    const previous=new Int32Array(solid.length).fill(-1)
    const open=new Uint8Array(solid.length)
    const queue=[]
    const enqueue=(x,z,from)=>{
      if(x<left||z<front||x+1>=left+width||z+1>=front+depth) return
      const i=index(x,z)
      if(previous[i]!==-1||solid[i]||solid[i+1]||solid[i+width]||solid[i+width+1]) return
      previous[i]=from
      queue.push(i)
    }
    enqueue(start.x,start.z,-2)
    for(let p=0;p<queue.length;p++) {
      const i=queue[p], x=left+i%width, z=front+Math.floor(i/width)
      open[i]=open[i+1]=open[i+width]=open[i+width+1]=1
      for(const [dx,dz] of directions) enqueue(x+dx,z+dz,i)
    }
    const reached=(x,z)=>inside(x,z)&&open[index(x,z)]===1
    return trace?{previous,queue,reached}:reached
  }
  function reach(start={x:aisleX,z:front}) {
    return explore(start)
  }
  function circulation(origin,thresholds) {
    const candidates=[]
    for(let z=front;z+1<front+depth;z++) for(let x=left;x+1<left+width;x++) {
      const i=index(x,z)
      if(solid[i]||solid[i+1]||solid[i+width]||solid[i+width+1]) continue
      const gap=Math.max(0,origin.x-x-1,x-origin.x-origin.w+1)+
        Math.max(0,origin.z-z-1,z-origin.z-origin.d+1)
      candidates.push({x,z,score:gap*100+Math.abs(x-aisleX)})
    }
    candidates.sort((a,b)=>a.score-b.score)
    const start=candidates[0]
    if(!start) return
    const {previous,queue,reached}=explore(start,true)
    const reserved=new Uint8Array(solid.length)
    for(const target of [origin,...thresholds]) {
      const match=queue.find(i=>{
        const x=left+i%width,z=front+Math.floor(i/width)
        return x<target.x+target.w&&x+2>target.x&&z<target.z+target.d&&z+2>target.z
      })
      for(let i=match;i>=0;i=previous[i]) {
        reserved[i]=reserved[i+1]=reserved[i+width]=reserved[i+width+1]=1
      }
    }
    const routes=[]
    for(let z=0;z<depth;z++) for(let x=0;x<width;) {
      if(!reserved[z*width+x]) {x++;continue}
      let w=1
      while(x+w<width&&reserved[z*width+x+w]) w++
      routes.push({x:left+x,z:front+z,w,d:1})
      x+=w
    }
    return {start,routes,reached}
  }
  function adjacent(open,{x,z,w,d}) {
    for(let a=x;a<x+w;a++) if(open(a,z-1)||open(a,z+d)) return true
    for(let b=z;b<z+d;b++) if(open(x-1,b)||open(x+w,b)) return true
    return false
  }
  return {mark,reach,circulation,adjacent}
}
