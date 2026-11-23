const directions=[[0,-1],[-1,0],[1,0],[0,1]]
const groundUse={bakery:'service',cafe:'terrace',flowers:'garden',book:'terrace',home:'garden'}

export function planSiteUse({width,depth},plan,details,entries,{extra=true}={}) {
  const {houses,streets,approaches,gardens,outsideStair,skybridge}=plan
  const land=new Uint8Array(width*depth)
  const plots=[], paths=new Set()
  const index=(x,z)=>z*width+x
  function mark(bounds,value) {
    if(!bounds) return
    for(let z=Math.max(0,bounds.z0);z<Math.min(depth,bounds.z1);z++) {
      for(let x=Math.max(0,bounds.x0);x<Math.min(width,bounds.x1);x++) land[index(x,z)]=value
    }
  }
  for(const box of approaches) mark(box,2)
  for(const box of streets) mark(box,3)
  for(const house of houses) {
    const {bounds,wing,pier,tower,entrySteps,chaletSite}=house
    for(const box of [bounds,wing,pier,tower,entrySteps,chaletSite?.porch,chaletSite?.step,
      ...(chaletSite?.trees??[]),...(chaletSite?.rocks??[])]) mark(box,1)
    if(pier) mark({x0:0,x1:width,z0:0,z1:bounds.z0},1)
  }
  for(const box of [...gardens,outsideStair,skybridge]) mark(box,1)
  for(const cell of details.blocked) land[cell]=1

  const free=(x,z,w=1,d=1)=>x>=0&&z>=0&&x+w<=width&&z+d<=depth
  function connect(starts,allowEdge) {
    const previous=new Int32Array(land.length).fill(-1), queue=[]
    const allowed=(x,z)=>free(x,z,2,2)&&[0,1,width,width+1].every(offset=>land[index(x,z)+offset]===0||land[index(x,z)+offset]===2)
    function visit(x,z,from) {
      if(!allowed(x,z)||previous[index(x,z)]!==-1) return
      previous[index(x,z)]=from
      queue.push(index(x,z))
    }
    for(const {x,z} of starts) visit(x,z,-2)
    const reachesStreet=(x,z)=>[0,1,width,width+1].some(offset=>{
      const at=index(x,z)+offset, a=at%width,b=Math.floor(at/width)
      if(land[at]===2) return true
      return directions.some(([dx,dz])=>free(a+dx,b+dz)&&land[index(a+dx,b+dz)]===3)
    })
    const reachesEdge=(x,z)=>!x||!z||x+2===width||z+2===depth
    let goal, edge
    for(let i=0;i<queue.length;i++) {
      const cell=queue[i], x=cell%width,z=Math.floor(cell/width)
      if(reachesStreet(x,z)||allowEdge&&!streets.length&&reachesEdge(x,z)) {goal=cell;break}
      if(edge===undefined&&reachesEdge(x,z)) edge=cell
      for(const [dx,dz] of directions) visit(x+dx,z+dz,cell)
    }
    const endpoint=goal??(allowEdge?edge:undefined)
    for(let cell=endpoint;cell>=0;cell=previous[cell]) {
      for(const offset of [0,1,width,width+1]) {
        paths.add(cell+offset)
        land[cell+offset]=2
      }
    }
    return endpoint!==undefined
  }
  for(const {x,z,w,reverse} of entries) {
    const openings=Array.from({length:w-1},(_,offset)=>x+offset)
    openings.sort((a,b)=>Math.abs(a-x-(w-2)/2)-Math.abs(b-x-(w-2)/2))
    if(connect(openings.map(x=>({x,z:reverse?z:z-1})),true)) continue
    // One clear row still makes an entry usable on a narrow ledge.
    for(const a of [openings[0],openings[0]+1]) if(free(a,z)&&land[index(a,z)]===0) {
      paths.add(index(a,z))
      land[index(a,z)]=2
    }
  }
  for(const cell of details.pads) if(land[cell]===0) land[cell]=1

  function allocate(kind,entry,house,nearby=false) {
    const sizes=kind==='service'||kind==='platform'?[[8,4],[6,3],[4,3]]
      :nearby?[[7,5],[5,4],[4,3],[3,3]]:[[10,7],[7,5],[5,4],[4,3]]
    let best, bestScore=-Infinity
    for(const [w,d] of sizes) for(const [a,b] of [[w,d],[d,w]]) {
      for(let z=0;z+b<=depth;z++) for(let x=0;x+a<=width;x++) {
        const distance=Math.max(x-entry.x-entry.w,entry.x-x-a,0)+Math.max(z-entry.z,entry.z-z-b,0)
        if(nearby&&distance>3) continue
        let clear=true, touches=0
        for(let dz=-1;dz<=b&&clear;dz++) for(let dx=-1;dx<=a;dx++) {
          const at=land[index(x+dx,z+dz)]
          const inside=dx>=0&&dx<a&&dz>=0&&dz<b
          if(inside&&at!==0) {clear=false;break}
          if(!inside&&free(x+dx,z+dz)&&(at===2||at===3)) touches++
        }
        if(!clear) continue
        const score=a*b-distance*3+Math.min(touches,6)*4
        if(score>bestScore) {
          best={x0:x,x1:x+a,z0:z,z1:z+b,kind,house}
          bestScore=score
        }
      }
    }
    if(best) {
      mark(best,4)
      plots.push(best)
      const {x0,x1,z0,z1}=best, access=[]
      for(let x=x0;x+1<x1;x++) access.push({x,z:z0-2},{x,z:z1})
      for(let z=z0;z+1<z1;z++) access.push({x:x0-2,z},{x:x1,z})
      connect(access,false)
    }
  }
  if(extra) entries.forEach((entry,i)=>{
    const house=houses[i]
    allocate(entry.use??groundUse[house.type]??'garden',entry,house.id,true)
  })
  // Broad gaps behind or between buildings get a second use even when there is no front yard.
  if(extra&&width*depth>=576) for(let i=0;i<(width*depth>=1600?2:1);i++) {
    const entry=entries[i%entries.length]
    allocate(i%2?'courtyard':'garden',{...entry,z:Math.floor(depth*0.7)},null)
  }
  return {plots,paths}
}

const uses={
  garden:['Разбейте сад с посадками','olive'],
  terrace:['Обставьте открытую террасу','darkTan'],
  plaza:['Обустройте площадку перед входом','gray'],
  courtyard:['Соберите скамейки во дворе','darkTan'],
  exhibit:['Поставьте уличный экспонат','gray'],
  platform:['Разметьте платформу ожидания','gray'],
  service:['Разметьте служебную площадку','dark']
}

export const siteUseColor=kind=>uses[kind][1]

function gardenCourt(a,{x0:x,z0:z,x1,z1},variant) {
  const foliage=variant%2?'leafGreen':'olive'
  const blossom=variant%2?'white':'pink'
  const w=x1-x,d=z1-z
  a.step('Выложите бортик клумбы и посадите цветы')
  for(let dx=0;dx+1<w;dx+=2) {
    a.add('98283',x+dx,3,z,'darkTan')
    a.add('35480',x+dx,6,z,'brown')
    a.add('32607',x+dx,7,z,foliage,180)
    a.add('24866',x+dx+1,7,z,blossom)
  }
  if(w<4||d<5) return
  a.step('Соберите садовое дерево и замостите подход')
  const tx=x1-4,tz=z1-3
  if(a.exteriorDetail>=2&&w>=5&&d>=6) {
    const cx=x1-3,cz=z1-3, autumn=variant%2===0
    a.put('plate',cx,3,cz,2,2,'darkTan')
    for(let i=0;i<5;i++) {
      a.add('3062b',cx,4+i*4,cz,autumn?'white':'brown')
      a.add('6141',cx,7+i*4,cz,autumn&&i%2===0?'dark':autumn?'white':'brown')
    }
    a.add('2417',x1-5,24,z1-6,autumn?'orange':'green')
    a.put('plate',cx,25,cz-1,1,2,'brown')
    a.add('3062b',cx,26,cz-1,'brown')
    a.add('2417',x1-5,29,z1-6,autumn?'amber':'leafGreen',180)
    for(const dx of [-1,1]) {
      a.add('32607',cx+dx,30,cz,autumn?'yellow':'olive',dx<0?0:180)
    }
  } else if(a.exteriorDetail>=2&&d>=6) {
    a.add('3471',tx,3,z1-4,'leafGreen')
  } else {
    smallTree(a,tx,tz,foliage,blossom)
  }
  for(let dx=0;dx+1<w-2;dx+=3) a.put('tile',x+dx,3,z+1,2,1,'darkTan')
  if(w>=8) {
    const bz=z1-2
    for(const end of [x,x+3]) a.put('plate',end,3,bz,1,2,'dark')
    for(const dz of [0,1]) a.put('plate',x,4,bz+dz,4,1,'brown')
    a.put('tile',x,5,bz,4,1,'brown')
    a.add('3633',x,5,bz+1,'brown')
  }
}

function smallTree(a,tx,tz,foliage,blossom) {
  a.add('92947',tx+2,3,tz+1,'brown')
  a.add('3062b',tx+3,6,tz+1,'brown')
  a.add('3062b',tx+3,9,tz+1,'brown')
  a.add('2423',tx,12,tz,'green')
  a.add('6141',tx,13,tz+1,'brown')
  a.add('32607',tx+2,13,tz+2,'leafGreen',180)
  a.add('2423',tx,14,tz,foliage,180)
  a.add('32607',tx+1,15,tz,foliage)
  a.add('33291',tx+2,15,tz+2,blossom)
}

export function buildSiteUse(a,plots,design={}) {
  for(const {x0:x,z0:z,x1,z1,kind} of plots) {
    const w=x1-x,d=z1-z
    a.step(uses[kind][0])
    if(kind==='garden'&&design.exteriorDetail) {
      gardenCourt(a,{x0:x,z0:z,x1,z1},design.garden)
    } else if(kind==='garden') {
      for(let aX=x;aX+1<x1;aX+=2) {
        a.add('98283',aX,3,z,'brown')
        a.put('plate',aX,6,z,2,1,'darkTan')
        a.add('3062b',aX,7,z,'leafGreen')
        a.add('24866',aX,10,z,(aX+z)%3?'yellow':'pink')
      }
      if(w>=4) a.add('3633',x,3,z1-1,'brown')
      else a.put('brick',x,3,z1-1,3,1,'brown')
    } else if(kind==='terrace') {
      if(design.exteriorDetail&&w>=6&&d>=4) {
        a.add('4079',x,3,z+1,'darkRed',90)
        a.add('3941',x+3,3,z+1,'brown')
        a.put('plate',x+3,6,z+1,2,2,'darkTan')
        a.add('3899',x+3,7,z+1,'white')
        a.add('6141',x+4,7,z+2,'green')
        a.add('24866',x+4,8,z+2,'yellow')
        if(w>=8) a.add('4079',x+5,3,z+1,'darkRed',270)
        a.strip('tile',x,3,z,w,'tan')
        continue
      }
      a.add('3941',x,3,z,'brown')
      a.put('plate',x,6,z,2,2,'tan')
      a.add('3899',x,7,z,'white')
      if(w>=4) a.add('4079',x+2,3,z,'darkRed')
      else if(d>=5) a.add('4079',x,3,z+2,'darkRed')
      else a.put('brick',x+2,3,z,1,2,'darkRed')
    } else if(kind==='exhibit') {
      a.put('brick',x,3,z,2,2,'dark')
      a.put('plate',x,6,z,2,2,'gray')
      a.add('3062b',x,7,z,'white')
      a.add('3062b',x,10,z,'white')
      a.add('4740',x,13,z,'tan')
    } else if(kind==='service'||kind==='platform') {
      const horizontal=w>=d
      if(horizontal) a.strip('tile',x,3,z1-1,w,'yellow')
      else a.strip('tile',x1-1,3,z,d,'yellow',true)
      if(kind==='service') {
        a.add('3062b',x,3,z,'darkTan')
        a.add('98138',x,6,z,'gray')
        if(design.exteriorDetail&&w>=4&&d>=3) {
          a.add('30136',x+1,3,z,'brown')
          a.put('plate',x+1,6,z,2,1,'darkTan')
          a.add('2412b',x+1,7,z,'brown')
        }
      } else a.put('brick',x,3,z,2,1,'brown')
    } else {
      a.put('plate',x,3,z,3,2,'dark')
      a.put('brick',x,4,z,3,1,'brown')
      a.put('tile',x,4,z+1,3,1,'brown')
      a.add('3062b',x1-1,3,z1-1,'brown')
      a.add('24866',x1-1,6,z1-1,'leafGreen')
    }
  }
}
