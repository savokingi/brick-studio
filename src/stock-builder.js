import {catalog,colors,inventoryColor,isTransparent,sizeId} from './catalog.js'
import availability from './availability.json' with {type:'json'}
import {createAssembly} from './scene.js'

const wallTones={
  old:['mediumNougat','tan','darkTan','white','darkRed','gray','brown','sandGreen','orange'],
  modern:['white','gray','dark','tan','darkTan','teal','brightBlue','black','darkAzure'],
  coastal:['white','tan','lightYellow','brightBlue','sandGreen','darkTan','gray','azure','teal']
}
const muted=['gray','dark','tan','darkTan','white','black','brown','darkRed','sandGreen','blue','mediumNougat','orange']
const roofTones=['darkRed','dark','black','brown','blue','gray','darkTan','tan','white','sandGreen','mediumNougat']
const brickKinds=new Set(['brick','masonry','log','fluted'])
const slopes=new Set(['3037','3039','3040b'])
const accents=new Set(['60592','60601','4864b','3659','3069b'])
const byColorId=new Map(Object.keys(colors).map(color=>[inventoryColor(color),color]))
const token=(x,z)=>x+':'+z

function entriesFor(stock) {
  return [...stock].flatMap(([key,count])=>{
    const [id,colorId]=key.split('|')
    const p=catalog[id],color=byColorId.get(+colorId)
    if(!p||!color||count<=0||!availability[id]?.[colorId]) return []
    const brick=p.h===3&&brickKinds.has(p.kind)&&p.studs&&p.w<=8&&p.d<=2
    const plate=p.h===1&&sizeId('plate',p.w,p.d)===id
    const slope=slopes.has(id)
    if(!brick&&!plate&&!slope&&!accents.has(id)) return []
    return [{id,color,key,count,brick,plate,slope,w:p.w,d:p.d,area:p.w*p.d}]
  })
}

function cells(x,z,w,d) {
  const result=[]
  for(let row=z;row<z+d;row++) for(let col=x;col<x+w;col++) result.push([col,row])
  return result
}

export function fitStockLayer(target,pool,remaining,y,{across=true,support,rotate=true,limit=1800}={}) {
  const available=pool.filter(part=>(remaining.get(part.key)??0)>0)
  if(available.reduce((sum,part)=>sum+part.area*remaining.get(part.key),0)<target.length) return null
  const ordered=target.slice().sort((a,b)=>across?a[1]-b[1]||a[0]-b[0]:a[0]-b[0]||a[1]-b[1])
  const open=new Set(ordered.map(([x,z])=>token(x,z)))
  const pieces=[]
  const orientations=available.flatMap(item=>!rotate||item.w===item.d?[{...item,angle:0}]
    :[{...item,angle:0},{...item,w:item.d,d:item.w,angle:90}])
    .sort((a,b)=>b.area-a.area||(across?b.w-a.w:b.d-a.d))
  let visits=0
  function place(index) {
    if(!open.size) return true
    if(++visits>limit) return false
    while(index<ordered.length&&!open.has(token(...ordered[index]))) index++
    if(index>=ordered.length) return false
    const [x,z]=ordered[index]
    for(const {id,color,key,w,d,angle} of orientations) {
      const quantity=remaining.get(key)??0
      if(!quantity) continue
      const footprint=cells(x,z,w,d).map(([x,z])=>token(x,z))
      if(!footprint.every(cell=>open.has(cell))||support&&!footprint.some(cell=>support.has(cell))) continue
      remaining.set(key,quantity-1)
      footprint.forEach(cell=>open.delete(cell))
      pieces.push([id,x,y,z,color,angle])
      if(place(index+1)) return true
      pieces.pop()
      footprint.forEach(cell=>open.add(cell))
      remaining.set(key,quantity)
    }
    return false
  }
  return place(0)?pieces:null
}
const fill=fitStockLayer

function buildPlan(entries,{w,d,x,z,wall,roof,base,rows,method,stepped,side}) {
  const remaining=new Map(entries.map(part=>[part.key,part.count]))
  const pool=(color,type)=>entries.filter(part=>part.color===color&&part[type])
  const take=(id,palette,count=1)=>{
    const part=palette.map(color=>entries.find(part=>part.id===id&&part.color===color))
      .find(part=>part&&(remaining.get(part.key)??0)>=count)
    if(part) remaining.set(part.key,remaining.get(part.key)-count)
    return part
  }
  const groups=[]
  const ground=cells(x,z,w,d), floorPool=pool(base,'plate')
  function add(title,role,parts,module='ground') {
    if(parts?.length) groups.push({title,role,module,parts})
    return Boolean(parts)
  }

  const foundation=fill(ground,floorPool,remaining,0)
  if(!add('Положите пластины основания','site',foundation)) return
  let y=1
  if(foundation.length>1) {
    const ties=fill(ground,floorPool,remaining,y,{across:false})
      ??fill(ground,pool(roof,'plate'),remaining,y,{across:false})
    if(!add('Перевяжите основание поперёк швов','site',ties)) return
    y++
  }
  const floorY=y
  const front=z+1
  const courseHeight=method==='brick'?3:1
  const courses=rows*3/courseHeight
  const doorway=x+Math.floor((w-2)/2)
  const windows=w>=10?[[x+1,x+3],[x+w-3,x+w-1]]:w>=8?[[x+1,x+2],[x+w-2,x+w-1]]:[]
  const windowHeight=w>=8?6:3
  const wallPool=pool(wall,method)
  const palette=[roof,base,wall]
  const doubleWindows=w>=10
  const frame=doubleWindows?take('60592',palette,windows.length):null
  const glazing=['glass','glassBlue','glassCyan']
  const glass=frame?take('60601',glazing,windows.length):null
  const panels=!frame&&doubleWindows?take('4864b',glazing,windows.length):null
  const arch=method==='brick'?take('3659',palette):null
  let previous=new Set(ground.map(([x,z])=>token(x,z)))
  for(let row=0;row<courses;row++) {
    const rise=row*courseHeight
    const roofRow=row===courses-1
    const wallCells=ground.filter(([col,depth])=>{
      if(depth===z) return false
      if(depth===front) {
        if(roofRow&&arch&&col>=doorway-1&&col<doorway+3) return false
        if(!roofRow&&col>=doorway&&col<doorway+2) return false
        if(rise>=3&&rise<3+windowHeight&&windows.some(([left,right])=>col>=left&&col<right)) return false
        return true
      }
      if(depth===z+d-1) return col===x||col===x+w-1||col===x+1||col===x+w-2
      return col===x||col===x+w-1
    })
    const fit={across:row%2===0,support:previous}
    const band=roofRow&&base!==wall?fill(wallCells,pool(base,method),remaining,y,fit):null
    const pieces=band??fill(wallCells,wallPool,remaining,y,fit)
    if(pieces&&roofRow&&arch) pieces.push([arch.id,doorway-1,y,front,arch.color,0])
    if(!add(roofRow?'Перекройте окна и вход':'Возведите стены и проёмы','wall',pieces)) return
    if(rise===3&&(frame||panels)) {
      const windowsills=windows.flatMap(([left])=>frame?
        [[frame.id,left,y,front,frame.color,0],...(glass?[[glass.id,left,y,front,glass.color,0,'pane']]:[])]:
        [[panels.id,left,y,front,panels.color,0]])
      add('Установите оконные рамы и остекление','wall',windowsills)
    }
    if(roofRow&&arch) for(let i=doorway-1;i<doorway+3;i++) wallCells.push([i,front])
    previous=new Set(wallCells.map(([x,z])=>token(x,z)))
    y+=courseHeight
  }
  const sill=take('3069b',[base,roof])
  if(sill) add('Уложите плитку перед входом','site',[[sill.id,doorway,floorY,z,sill.color,0]])
  const benchX=side?x+w-3:x+1
  const bench=fill(cells(benchX,z+d-3,2,1),pool(wall,'brick'),remaining,floorY)
  if(bench) {
    const seat=fill(cells(benchX,z+d-3,2,1),floorPool,remaining,floorY+3)
    add('Соберите скамью у стены','interior',[...bench,...(seat??[])])
  }
  const roofY=y
  const roofPool=pool(roof,'plate')
  const cover=fill(ground,roofPool,remaining,y)??fill(ground,floorPool,remaining,y)
  if(!add('Соберите основание съёмной крыши','roof',cover,'roof')) return
  y++
  if(cover.length>1) {
    const ties=fill(ground,roofPool,remaining,y,{across:false})
      ??fill(ground,floorPool,remaining,y,{across:false})
    if(!add('Свяжите детали крыши поперечными пластинами','roof',ties,'roof')) return
    y++
  }
  const plan={bounds:{x0:x,x1:x+w,z0:z,z1:z+d},groups,roofY,colors:{wall,roof,base}}
  let ridge=0
  const slopePool=pool(roof,'slope')
  const pitchLayers=[]
  if(stepped&&d%2===0&&slopePool.length) {
    const trial=new Map(remaining)
    const levels=d/2-1
    for(let inset=0;inset<levels;inset++) {
      const height=y+inset*3
      const near=cells(x,z+inset,w,2),far=cells(x,z+d-inset-2,w,2)
      const front=fill(near,slopePool,trial,height,{rotate:false})
      const back=front&&fill(far,slopePool,trial,height,{rotate:false})
      if(!back) break
      pitchLayers.push([...front,...back.map(part=>[...part.slice(0,5),180])])
    }
    if(pitchLayers.length===levels) {
      const peak=cells(x,z+levels,w,2)
      const cap=fill(peak,roofPool,trial,y+levels*3)??fill(peak,floorPool,trial,y+levels*3)
      if(cap) {
        for(const layer of pitchLayers) add('Уложите парные ряды скосов 45°','roof',layer,'roof')
        add('Свяжите скаты пластинами конька','roof',cap,'roof')
        return {...plan,roof:'capped'}
      }
    }
  }
  if(stepped) for(let inset=1;inset*2<=d-2&&inset<=3;inset++) {
    const layer=cells(x,z+inset,w,d-2*inset)
    const lid=fill(layer,roofPool,remaining,y,{across:inset%2===0})
    if(!lid) break
    add('Уложите пластины у конька','roof',lid,'roof')
    ridge++
    y++
  }
  if(roof!==wall) {
    const chimney=fill(cells(x+w-2,z+Math.min(d-2,ridge+1),1,1),pool(wall,'brick'),remaining,y)
    if(chimney) add('Установите трубу','roof',chimney,'roof')
  }
  return {...plan,roof:ridge?'stepped':'terrace'}
}

export function* ownedPlans(options,stock,seed,reference) {
  const entries=entriesFor(stock)
  const areas=new Map()
  for(const part of entries) for(const type of ['plate','brick','slope']) if(part[type]) {
    const key=part.color+'/'+type
    areas.set(key,(areas.get(key)??0)+part.area*part.count)
  }
  const area=(color,type)=>areas.get(color+'/'+type)??0
  const {palette,roof:preferredRoof}=reference??{}
  const wallPreference=[...new Set([...(palette?.slice(0,3)??[]),...wallTones[options.style],...muted])]
  const preferredTops=[...new Set([...(palette?[palette[5]]:[]),...roofTones])]
  const walls=wallPreference.filter(color=>area(color,'brick')>=26||area(color,'plate')>=90)
  const foundations=muted.filter(color=>area(color,'plate')>=25)
  const pitched=preferredRoof?preferredRoof!=='terrace':options.style!=='modern'
  const tops=preferredTops.filter(color=>area(color,'plate')>=25||pitched&&area(color,'slope')>=25)
  const rotate=(list,n)=>[...list.slice(n%Math.max(1,list.length)),...list.slice(0,n%Math.max(1,list.length))]
  const variations=[]
  for(const wall of walls) for(const roof of tops) for(const base of foundations) {
    if(wall===roof&&wall===base) continue
    variations.push({wall,roof,base,rank:wallPreference.indexOf(wall)+preferredTops.indexOf(roof)*0.3+
      muted.indexOf(base)*0.1+Number(wall===roof)*3+Number(roof===base)*0.3})
  }
  variations.sort((a,b)=>a.rank-b.rank)
  const paletteList=rotate(variations.slice(0,80),seed%7)
  const wMax=Math.min(14,options.width),dMax=Math.min(10,options.depth)
  const dimensions=[]
  for(let w=wMax;w>=5;w--) for(let d=dMax;d>=5;d--) dimensions.push({w,d})
  dimensions.sort((a,b)=>b.w*b.d-a.w*a.d||b.w-a.w)
  for(const {w,d} of dimensions) {
    for(const palette of paletteList) {
      const {wall,roof,base}=palette
      if(area(roof,'plate')<w*d&&area(roof,'slope')<w*d||area(base,'plate')<w*d||
        roof===base&&area(base,'plate')<w*d*2) continue
      const x=Math.floor((options.width-w)/2),z=Math.floor((options.depth-d)/2)
      for(const rows of [6,5,4]) for(const method of ['brick','plate']) {
        const volume=(w+d*2-4)*(rows-1)
        if(area(wall,method)<Math.max(0,volume-(w>=8?12:6))*(method==='plate'?3:1)) continue
        const plan=buildPlan(entries,{w,d,x,z,...palette,rows,method,stepped:pitched,side:seed%2})
        if(plan&&(!options.partLimit||plan.groups.reduce((n,group)=>n+group.parts.length,0)<=options.partLimit)) yield plan
      }
    }
  }
}

export function buildOwnedScene(options,variant) {
  const plan=variant.design.ownedPlan
  const {x0,x1,z0,z1}=plan.bounds??{}
  if(![x0,x1,z0,z1,plan.roofY].every(Number.isInteger)||x0<0||z0<0||x1<=x0||z1<=z0||
    x1>options.width||z1>options.depth||!Array.isArray(plan.groups)||plan.groups.length>64) {
    throw Error('Некорректная схема постройки из коллекции.')
  }
  const a=createAssembly(options)
  const house={id:'house-1',label:'Постройка',bounds:plan.bounds,type:options.type,style:options.style,floors:1,roof:plan.roof,stairs:[],colorIndex:0}
  a.addModule('ground','Основание и стены',0)
  let module='ground'
  const objects=[]
  for(const group of plan.groups) {
    if(!['ground','roof'].includes(group.module)||module==='roof'&&group.module==='ground'||
      !['site','interior','wall','roof'].includes(group.role)||!Array.isArray(group.parts)||group.parts.length>600) {
      throw Error('Некорректный шаг постройки из коллекции.')
    }
    if(group.module!==module) {
      module=group.module
      a.addModule('roof','Съёмная крыша',plan.roofY)
    }
    a.context({building:house,role:group.role,floor:module==='roof'?1:0,
      section:module==='roof'?'Крыша':'Дом',cut:false})
    const start=a.parts.length
    a.step(group.title)
    let previous
    for(const [id,x,y,z,color,rotation,mount] of group.parts) {
      if(!catalog[id]||!Object.hasOwn(colors,color)||![x,y,z].every(Number.isInteger)||![0,90,180,270].includes(rotation)
        ||mount!==undefined&&(mount!=='pane'||previous===undefined||catalog[id].kind!=='insert'||!isTransparent(color))) {
        throw Error('Некорректная деталь в проекте.')
      }
      const element=availability[id]?.[inventoryColor(color)]
      if(!element) throw Error('Неизвестное сочетание детали и цвета.')
      const index=a.add(id,x,y,z,color,rotation,mount==='pane'?previous:null)
      a.parts[index].element=element
      if(module==='ground'&&group.role==='wall') a.parts[index].cut=group.cut??z===house.bounds.z0+1
      previous=index
    }
    if(group.role==='interior') objects.push({name:group.object??'Скамья',start,end:a.parts.length,floor:0})
  }
  const w=house.bounds.x1-house.bounds.x0,d=house.bounds.z1-house.bounds.z0
  return {version:8,options,variant,parts:a.parts,joins:a.joins,steps:a.steps,modules:a.modules,
    houses:[house],interiors:[{building:house.id,floor:0,objects,routes:[]}],streets:[],
    scheme:'house',title:plan.title??'Дом из коллекции',stockFamily:plan.family,ownedFootprint:[w,d]}
}
