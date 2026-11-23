import {roofBays} from './reference-roofs.js'
import {roomAccess} from './room-access.js'

const headroom=15
const area=({x0,x1,z0,z1})=>(x1-x0)*(z1-z0)
const bounds=(x,z,w,d)=>({x0:x,x1:x+w,z0:z,z1:z+d})
const inside=(b,{x,z,w,d})=>x>=b.x0&&z>=b.z0&&x+w<=b.x1&&z+d<=b.z1
const overlaps=(a,b)=>b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z
const inner=(b,x,z=x)=>bounds(b.x0+x,b.z0+z,b.x1-b.x0-2*x,b.z1-b.z0-2*z)

function roomsBelowRoof(house) {
  if(house.roof==='hip') return [inner(house.bounds,1+Math.ceil((headroom-2)/3))]
  return roofBays(house).flatMap(({box,across,steep,shingled})=>{
    const span=across?box.x1-box.x0:box.z1-box.z0
    const levels=Math.min(steep?10:4,Math.floor(span/2)-1)
    if(!shingled&&(levels*3+2<headroom||span-2*levels>8)) return []
    const inset=shingled?2*Math.ceil((headroom-2)/6)+2:1+Math.ceil((headroom-2)/3)
    return [inner(box,across?inset:1,across?1:inset)]
  })
}

function stairAt(x,z,alongX,backwards,length,rise,floor) {
  const offset=(step,wide=1)=>alongX?{x:x+step,z,w:wide,d:2}:{x,z:z+step,w:2,d:wide}
  const treads=Array.from({length},(_,i)=>({...offset(backwards?length-i-1:i),rise:Math.floor((i+1)*rise/length)}))
  return {...offset(0,length),kind:'straight',name:'Лестница на чердак',floor,treads,
    entry:offset(backwards?length:-2,2),exit:offset(backwards?-2:length,2)}
}

function lowerAccess(b,arrival,blocked) {
  const left=b.x0,front=b.z0,width=b.x1-b.x0,depth=b.z1-b.z0
  const access=roomAccess({left,front,width,depth,aisleX:left+Math.floor((width-2)/2)})
  for(const box of blocked) access.mark(box)
  const start=access.circulation(arrival,[])?.start
  if(!start) return ()=>false
  return stair=>{
    access.mark(stair)
    const open=access.reach(start)
    access.mark(stair,0)
    return open(stair.entry.x,stair.entry.z)&&open(stair.entry.x+stair.entry.w-1,stair.entry.z+stair.entry.d-1)
  }
}

export function planAttic(house,lower,{roofY,lowerY,arrival,blocked=[],layout=0,cabin=false}) {
  const floor=house.floors
  const y=roofY+2
  const distance=y-lowerY
  const length=Math.ceil(distance/3.3)
  const roofBox=house.topBounds??house.bounds
  const roof={...house,bounds:roofBox}
  const allowed=cabin?lower:inner(lower,1)
  const clearance=cabin?13:headroom
  let roomCandidates, deck, posts=[]
  if(cabin) {
    const base=house.cabin?9:3+(house.bounds.x1-house.bounds.x0>=16?2:house.bounds.x1-house.bounds.x0>=12?3:4)*3
    const inset=1+Math.ceil((y+clearance-base)/(house.cabin?6:3))
    const insetDeck=1+Math.ceil((y-base)/(house.cabin?6:3))
    // Keep the space over the entry open. The stair reaches the edge of the loft.
    const end=roofBox.z1-1
    const start=Math.max(roofBox.z0+length+3,end-Math.round((roofBox.z1-roofBox.z0)*0.56))
    deck={...inner(roofBox,insetDeck,1),z0:start,z1:end}
    roomCandidates=[{...inner(roofBox,inset,1),z0:start,z1:end}]
    if(deck.x1-deck.x0<4||end-start<4) return
    posts=[deck.x0,deck.x1-1].flatMap(x=>[start,end-1].map(z=>({x,z,w:1,d:1})))
  } else {
    deck=roofBox
    roomCandidates=roomsBelowRoof(roof)
  }
  const rooms=roomCandidates.filter(b=>b.x1-b.x0>=4&&b.z1-b.z0>=4&&area(b)>=(cabin?16:24))
  if(!rooms.length) return
  const obstacles=[...blocked,...posts]
  const candidates=[]
  for(const room of rooms) {
    for(const alongX of cabin?[false]:[false,true]) for(const backwards of cabin?[false]:[false,true]) {
      for(let z=allowed.z0;z<allowed.z1;z++) for(let x=allowed.x0;x<allowed.x1;x++) {
        if(cabin&&z+length!==deck.z0) continue
        const stair=stairAt(x,z,alongX,backwards,length,distance,floor-1)
        if(!inside(allowed,stair)||!inside(allowed,stair.entry)||!inside(room,stair.exit)) continue
        if(!cabin&&!inside(inner(deck,2),stair)) continue
        if(obstacles.some(box=>overlaps(stair,box)||overlaps(stair.entry,box))) continue
        if(!cabin&&!stair.treads.slice(-3).every(step=>inside(room,step))) continue
        const score=area(room)-Math.abs((layout?allowed.x1:allowed.x0)-x)*0.25-
          (cabin?0:Math.abs(stair.exit.z-(room.z0+room.z1)/2)*0.5)
        candidates.push({room,stair,score})
      }
    }
  }
  if(!candidates.length) return
  const reachable=lowerAccess(allowed,arrival,obstacles)
  candidates.sort((a,b)=>b.score-a.score)
  const chosen=candidates.find(({stair})=>reachable(stair))
  if(!chosen) return
  const {room,stair}=chosen
  const alongX=stair.w>stair.d
  const nearExit=alongX?Math.min(stair.x+stair.w-4,Math.max(stair.x,stair.exit.x-2)):
    Math.min(stair.z+stair.d-4,Math.max(stair.z,stair.exit.z-2))
  const guards=cabin?[
    {x:stair.x-4,z:deck.z0,w:4,d:1},{x:stair.x+2,z:deck.z0,w:4,d:1}
  ]:alongX?[
    {x:nearExit,z:stair.z-1,w:4,d:1},{x:nearExit,z:stair.z+stair.d,w:4,d:1}
  ]:[{x:stair.x-1,z:nearExit,w:1,d:4},{x:stair.x+stair.w,z:nearExit,w:1,d:4}]
  return {floor,y,base:roofY,room,deck,stair,posts,headroom:clearance,cabin,
    guards:guards.filter(guard=>inside(room,guard))}
}

export function buildAtticPosts(a,attic,lowerY,color) {
  if(!attic.posts.length) return
  a.context({role:'wall',cut:false})
  a.step('Поставьте опоры под площадку чердака')
  for(const {x,z} of attic.posts) for(let y=lowerY;y<attic.base;) {
    const brick=y+3<=attic.base
    a.put(brick?'brick':'plate',x,y,z,1,1,color)
    y+=brick?3:1
  }
}

export function buildAtticDeck(a,attic,color) {
  const {x0,x1,z0,z1}=attic.deck
  const {stair,base,cabin}=attic
  a.step(cabin?'Перевяжите пластины площадки чердака':'Перевяжите пол чердака вокруг лестничного проёма')
  if(cabin) {
    a.deck(attic.deck,base,color)
    a.deck(attic.deck,base+1,color,true,true)
    return
  }
  const {x,z,w,d}=stair
  const rear=z+d
  a.deck(bounds(x0,z0,x1-x0,z-z0),base,color,false,true)
  a.deck(bounds(x0,z,x-x0,d),base,color,false,true)
  a.deck(bounds(x+w,z,x1-x-w,d),base,color,false,true)
  const rearDepth=z1-rear
  const rearBand=rearDepth%2===1?3:2
  for(let column=x0;column<x1;column+=2) {
    a.put('plate',column,base,rear,Math.min(2,x1-column),rearBand,color)
  }
  a.deck(bounds(x0,rear+rearBand,x1-x0,rearDepth-rearBand),base,color,false,true)
  for(const edge of [z0,z1-1]) {
    a.strip('plate',x0,base+1,edge,x1-x0-2,color,false,true)
    a.put('plate',x1-2,base+1,edge,2,1,color)
  }
  const frontBridge=z-1-Number((z-z0)%2===1)
  const rearBridge=rear-1-Number(d%2===1)
  for(let column=x0;column<x1;column++) {
    if(column>=x&&column<x+w) {
      a.strip('plate',column,base+1,z0+1,z-z0-1,color,true)
      a.strip('plate',column,base+1,rear,z1-1-rear,color,true,column%2===1)
      continue
    }
    a.strip('plate',column,base+1,z0+1,frontBridge-z0-1,color,true)
    a.put('plate',column,base+1,frontBridge,1,z+1-frontBridge,color)
    a.strip('plate',column,base+1,z+1,rearBridge-z-1,color,true)
    a.put('plate',column,base+1,rearBridge,1,rear+1-rearBridge,color)
    a.strip('plate',column,base+1,rear+1,z1-rear-2,color,true,column%2===1)
  }
}
