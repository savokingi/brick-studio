import {sizeId} from './catalog.js'

const labels = {
  straight:'Прямая лестница с закрытыми ступенями',
  stringer:'Лестница на боковой тетиве',
  molded:'Открытая лестница с литым маршем',
  turn:'Г-образная лестница с площадкой',
  return:'П-образная лестница с двумя маршами'
}

function run(x,z,w,d,count,backwards=false) {
  return Array.from({length:count},(_,i)=>({
    x:x+(d===1?0:backwards?count-i-1:i),
    z:z+(d===1?backwards?count-i-1:i:0),w,d
  }))
}

function maxStairWidth(house,floors) {
  const width=house.bounds.x1-house.bounds.x0
  return floors>2?Math.floor((width-4)/2):width-4
}

export function stairKindsFor(house,floors=house.floors) {
  const depth=house.bounds.z1-house.bounds.z0
  const maxWidth=maxStairWidth(house,floors)
  const kinds=['straight','stringer']
  if(maxWidth>=4&&depth>=15) kinds.push('molded')
  if(maxWidth>=5) kinds.push('turn','return')
  return kinds
}

export function planStaircases(house,design,floors=house.floors,floorEdits) {
  const {x0,x1,z0,z1}=house.bounds
  const width=x1-x0,depth=z1-z0
  const maxWidth=maxStairWidth(house,floors)
  const straightLength=depth>=13?9:8
  const kinds=stairKindsFor(house,floors)
  const first=(design.form+house.colorIndex+(design.stairShift??0))%kinds.length
  const requested=kinds.indexOf(design.stairChoice)
  return Array.from({length:floors-1},(_,floor)=>{
    const choice=floorEdits?.[floor]?.stairKind
    const kind=kinds.includes(choice)?choice:kinds[((requested<0?first:requested)+floor)%kinds.length]
    const right=(design.layout+floor)%2===0
    const side=kind==='turn'||kind==='return'
    const w=side?5:kind==='molded'?4:kind==='straight'&&maxWidth>=3?3:2
    const d=kind==='molded'?10:kind==='turn'?7:kind==='return'?6:straightLength
    const rear=depth>=14?3:2
    const x=right?x1-1-w:x0+1, z=z1-rear-d
    const reversed=!side&&kind!=='molded'&&rear===3&&(design.shelves+floor+house.colorIndex)%3===0
    const steps=kind==='turn'?[...run(0,0,2,1,5),{x:0,z:5,w:2,d:2,landing:true},...run(2,5,1,2,3)]
      :kind==='return'?[...run(0,0,2,1,4),{x:0,z:4,w:5,d:2,landing:true},...run(3,0,2,1,4,true)]
      :kind==='molded'?[]:run(0,0,w,1,d)
    const project=block=>({...block,x:x+(right?w-block.x-block.w:block.x),z:z+(reversed?d-block.z-block.d:block.z)})
    const entry=project({x:kind==='molded'?1:0,z:-1,w:side||kind==='molded'?2:w,d:1})
    const exit=project(kind==='turn'?{x:w,z:5,w:1,d:2}
      :kind==='return'?{x:3,z:-1,w:2,d:1}
      :{x:kind==='molded'?1:0,z:d,w:kind==='molded'?2:w,d:1})
    const infill=kind==='turn'?project({x:2,z:0,w:3,d:5}):null
    const guard=infill?{x:right?infill.x+infill.w-1:infill.x,z:z+1,w:1,d:4}
      :width>=w+8&&(floors===2||width-2-w-maxWidth>=3)?{x:right?x-1:x+w,z:z+1,w:1,d:4}:null
    return {kind,name:labels[kind],floor,right,x,z,w,d,entry,exit,guard,infill,
      treads:steps.map((step,i)=>({...project(step),rise:Math.floor((i+1)*26/steps.length)}))}
  })
}

export function stairBlocksPassage(well,bounds,{side,offset}) {
  const z=bounds.z0+offset
  return well.right===(side==='right')&&z+1<well.z+well.d&&z+3>well.z
}

function fill(a,kind,box,y,color) {
  const {x,z,w,d}=box
  if(sizeId(kind,w,d)) return a.put(kind,x,y,z,w,d,color)
  if(w<=3) {
    for(let offset=0;offset<d;) {
      const length=[6,4,3,2,1].find(length=>offset+length<=d&&sizeId(kind,w,length))
      a.put(kind,x,y,z+offset,w,length,color)
      offset+=length
    }
    return
  }
  throw new Error('Нет размера для опоры лестницы')
}

function plinth(a,box,y,height,color) {
  let top
  for(let level=0;level<height;) {
    const brick=height-level>=3
    top=fill(a,brick?'brick':'plate',box,y+level,color)
    level+=brick?3:1
  }
  return top
}

function moldedFlight(a,stair,y,colors) {
  const {x,z}=stair
  const [base,tread,frame]=colors
  // 30134 sits on two studs at its foot and under the narrow two-stud nose.
  const foot=plinth(a,{x:x+1,z:z+1,w:2,d:1},y,2,base)
  const nose=plinth(a,{x:x+1,z:z+7,w:2,d:1},y,18,base)
  a.put('plate',x+1,y,z,2,1,base)
  a.put('tile',x+1,y+1,z,2,1,tread)
  a.step('Установите литой марш на нижнюю и верхнюю опоры')
  const flight=a.add('30134',x,y+2,z+1,frame,0,[foot,nose])
  a.add('3069b',x+1,y+19,z+7,tread,0,flight)
  a.step('Соедините верх марша с полом')
  for(const [offset,height] of [[8,23],[9,26]]) {
    plinth(a,{x:x+1,z:z+offset,w:2,d:1},y,height-1,base)
    a.put('tile',x+1,y+height-1,z+offset,2,1,tread)
  }
}

function supports(kind,treads,right) {
  if(kind==='stringer') return treads.map(({x,z,rise,d})=>({x:x+Number(right),z,w:1,d,rise}))
  if(kind==='return') {
    return treads.flatMap(step=>step.landing
      ? [{...step,w:2},{...step,x:step.x+3,w:2}]
      : [step])
  }
  return treads
}

function addSecondFlight(a,landing,flight,y,tread,frame) {
  const first=flight[0]
  const height=y+landing.rise-1
  if(landing.w===5) {
    a.put('plate',first.x,height,Math.min(first.z,landing.z),2,3,tread)
    const rest=first.x===landing.x?first.x+2:landing.x
    a.put('plate',rest,height,landing.z,3,2,tread)
    a.add('4083',landing.x,height+1,landing.z+1,frame)
  } else {
    a.put('plate',Math.min(first.x,landing.x),height,landing.z,3,2,tread)
  }
  a.step('Соберите верхний марш от площадки')
  let rise=landing.rise
  for(const [index,step] of flight.entries()) {
    const next=flight[index+1]??step
    const box={
      x:Math.min(step.x,next.x),z:Math.min(step.z,next.z),
      w:step.w+Math.abs(step.x-next.x),d:step.d+Math.abs(step.z-next.z)
    }
    plinth(a,box,y+rise,step.rise-rise,tread)
    rise=step.rise
  }
}

function surfaceBands(rectangles) {
  const byWidth=new Map()
  for(const {x,z,w,d} of rectangles) for(let row=z;row<z+d;row++) {
    const key=x+':'+w
    if(!byWidth.has(key)) byWidth.set(key,{x,w,rows:[]})
    byWidth.get(key).rows.push(row)
  }
  const bands=[]
  for(const {x,w,rows} of byWidth.values()) for(const z of rows.sort((a,b)=>a-b)) {
    const last=bands.at(-1)
    if(last?.x===x&&last.w===w&&last.z+last.d===z) last.d++
    else bands.push({x,z,w,d:1})
  }
  return bands
}

function builtFlight(a,stair,y,[base,tread,frame]) {
  const landingIndex=stair.treads.findIndex(step=>step.landing)
  const lower=landingIndex<0?stair.treads:stair.treads.slice(0,landingIndex+1)
  const foundation=supports(stair.kind,lower,stair.right)
  const height=Math.max(...foundation.map(step=>step.rise))-1
  let level=0
  while(level<height) {
    const remaining=foundation.filter(step=>step.rise-1>level)
    const minHeight=Math.min(...remaining.map(step=>step.rise-1-level))
    const brick=minHeight>=3
    for(const band of surfaceBands(remaining)) fill(a,brick?'brick':'plate',band,y+level,base)
    level+=brick?3:1
  }
  a.step('Уложите ступени и площадку')
  for(const {x,z,w,d,rise,landing} of lower) {
    if(!landing) fill(a,'tile',{x,z,w,d},y+rise-1,tread)
  }
  if(landingIndex>=0) addSecondFlight(a,lower.at(-1),stair.treads.slice(landingIndex+1),y,tread,frame)
}

export function buildStaircase(a,stair,y,house,palette) {
  const {style}=house
  const colors=stair.kind==='stringer'?['black',style==='old'?'brown':'darkTan',palette[2]]
    :stair.kind==='turn'?['brown','tan',palette[2]]
    :stair.kind==='return'?['gray','dark',palette[2]]
    :style==='old'?['darkTan','tan',palette[2]]:['gray','white',palette[2]]
  a.context({role:'stair',cut:false})
  a.step(stair.name+' · соберите опоры')
  if(stair.kind==='molded') moldedFlight(a,stair,y,colors)
  else builtFlight(a,stair,y,colors)
}

export function addStairGuard(a,stair,y,frame) {
  if(!stair.guard) return
  a.context({role:'stairGuard',cut:false})
  a.step('Поставьте ограждение у проёма')
  a.add(stair.kind==='turn'?'30055':'4083',stair.guard.x,y,stair.guard.z,frame,90)
}
