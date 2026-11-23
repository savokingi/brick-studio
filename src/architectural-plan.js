import {buildingType} from './building-types.js'

const rect=(x0,z0,w,d)=>({x0,z0,x1:x0+w,z1:z0+d})
const width=b=>b.x1-b.x0
const depth=b=>b.z1-b.z0
const clamp=(n,min,max)=>Math.max(min,Math.min(n,max))

function outlineFor({width:w,depth:d},volumes){
  const sections=volumes.flatMap(body=>[
    {box:body.bounds,floors:body.floors,roof:body.roof,setback:body.setback},
    ...(body.wing?[{box:body.wing,floors:1,roof:body.wingRoof}]:[])
  ])
  const rows=[]
  for(let z=0;z<8;z++) {
    const row=[]
    for(let x=0;x<8;x++) {
      const px=(x+0.5)*w/8,pz=(z+0.5)*d/8
      const section=sections.find(({box})=>px>=box.x0&&px<box.x1&&pz>=box.z0&&pz<box.z1)
      if(!section) {row.push(0);continue}
      const {box,floors,roof,setback}=section
      const elevated=setback&&pz<box.z0+setback&&floors>1?floors-1:floors
      const distance=width(box)<depth(box)?Math.min(px-box.x0,box.x1-px):Math.min(pz-box.z0,box.z1-pz)
      const slope=['gable','hip','split','shed'].includes(roof)?Math.min(2,Math.floor(distance/3)):Number(roof==='monitor'||roof==='lantern')
      row.push(Math.min(9,elevated*2+slope))
    }
    rows.push(row.join(''))
  }
  return [rows.join(''),rows.map(row=>[...row].reverse().join('')).join('')].sort()[0]
}

const domestic={
  home:[['sofa','dining'],['kitchenette','bed','bath'],['bed','wardrobe','desk','bath']],
  bakery:[['checkout','produce'],['hotKitchen','pantry','wash'],['bed','kitchenette','wardrobe']],
  cafe:[['checkout','dining'],['service','wash','pantry'],['dining','service','equipment']],
  flowers:[['planter','checkout'],['cultivation','wash','stock'],['planter','desk','stock']],
  book:[['checkout','books'],['reading','archive'],['books','reading','desk']]
}
const needs={
  sofa:['Гостиная','window'],dining:['Столовая','wide'],checkout:['Приём посетителей','wide'],
  planter:['Зимний сад','light'],books:['Читальный зал','window'],bed:['Спальня','private'],
  kitchenette:['Кухня','window'],hotKitchen:['Кухня','window'],reading:['Читальный уголок','light'],
  workbench:['Рабочий зал','light'],desk:['Кабинет','light'],bath:['Санузел','closed'],
  reception:['Приёмная','wide'],examination:['Кабинет осмотра','private'],guestRoom:['Гостевая комната','private'],
  waiting:['Зал ожидания','wide'],librarian:['Выдача книг','window'],showcase:['Выставочный зал','wide'],
  board:['Учебный класс','light'],pupils:['Учебный класс','light'],lift:['Ремонтный зал','wide'],
  ticket:['Билетный зал','wide'],exhibit:['Выставочный зал','window'],meeting:['Зал совещаний','wide'],
  machine:['Цех','window'],medicine:['Хранение','closed'],wash:['Подсобное помещение','closed'],
  service:['Служебная зона','window'],produce:['Торговый зал','wide'],cultivation:['Зал растений','light']
}
const landmarks=[
  ['hall','Общий зал со стороны улицы'],['garden','Дом с залом у заднего сада'],
  ['gallery','Дом с боковой галереей'],['court','Два крыла у открытого двора'],
  ['corner','Угловой дом с отступом'],['porch','Дом с вынесенным входным крылом'],
  ['terrace','Дом с верхней террасой'],['bridge','Два корпуса с переходом'],
  ['pavilion','Дом с отдельным павильоном'],['loft','Дом со светом из-под конька']
]

function program(type){
  const authored=domestic[type]
  if(authored) return authored
  const {ground,upper,annex}=buildingType(type)
  const split=Math.ceil(ground.length/2)
  return [ground.slice(0,split),ground.slice(split),upper,annex]
}

function roomsFor(box,type,layout,floors,service,accent){
  const [front,back,upper,annex]=program(type)
  const living=['home','apartment','hotel'].includes(type)
  const first=layout==='garden'||layout==='gallery'?[back,front]:[front,back]
  const visual=accent===0?['reading','books']:accent===1?['desk','equipment']:['planter','cultivation']
  if(living&&width(box)>=13&&depth(box)>=13&&accent) first[0]=[visual[0],...first[0]]
  if(living&&accent===2&&floors>1) first[1]=[...first[1],visual[1]]
  if(!living&&accent&&width(box)>=11&&depth(box)>=11&&back.length>=2) {
    const publicIndex=first[0]===front?0:1
    const serviceIndex=1-publicIndex
    const [visible,...serviceFixtures]=back
    if(accent===1) {
      first[publicIndex]=[...front,visible]
      first[serviceIndex]=serviceFixtures
    } else {
      first[publicIndex]=[...front,back.at(-1)]
      first[serviceIndex]=back.slice(0,-1)
    }
  }
  const split=width(box)>=14&&(['gallery','court','corner','bridge'].includes(layout)||accent===2)?'side':'depth'
  return Array.from({length:floors},(_,level)=>{
    const groups=service?[[...(annex??back)]]:level===0?first:
      [upper.slice(0,Math.ceil(upper.length/2)),[...upper.slice(Math.ceil(upper.length/2)),...visual.slice(0,Number(living))]]
    const keys=groups.filter(g=>g.length)
    const rooms=keys.map((fixtures,i)=>{
      const label=fixtures.map(key=>needs[key]).find(Boolean)??['Хранение и обслуживание','closed']
      const area=keys.length===1?[0,0,1,1]:split==='depth'?[0,i?0.51:0,1,0.49]:[i?0.52:0,0,0.48,1]
      const wall=split==='depth'?(i===0?'front':'back'):(i===0?'left':'right')
      return {label:label[0],light:label[1],wall,area,fixtures}
    })
    return {rooms,split}
  })
}

function house(box,options,kind,phase,settings={}){
  const {type=options.type,floors=options.floors,service=false}=settings
  const w=width(box),d=depth(box)
  const n=Math.min(floors,w<8||d<12?1:w<10||d<14?2:w<13||d<16?3:w<16||d<18?4:5)
  const plan=roomsFor(box,type,kind,n,service,phase)
  const daylight=plan[0].rooms.some(room=>room.light==='light')
  const front=plan[0].rooms[0]
  const enclosed=['home','hotel','apartment'].includes(type)
  const mansard=options.style==='old'&&!service&&w>=10&&d>=9&&
    (['book','hotel','apartment','home'].includes(type)?['corner','hall','pavilion','garden','bridge'].includes(kind):
      kind==='gallery'&&phase===1)
  const roof=mansard?'mansard':kind==='terrace'?'terrace':kind==='loft'||kind==='gallery'&&daylight?'lantern':
    service||kind==='pavilion'&&(floors===1||options.style==='modern')||Math.min(w,d)<8?'shed':kind==='corner'||kind==='court'?'hip':
    kind==='bridge'?'terrace':kind==='garden'&&daylight?'monitor':enclosed&&w>d*1.55?'split':
    d>w*1.35?'gable':daylight?'monitor':w>d?'hip':'gable'
  const facade=['fireStation','garage'].includes(type)&&w>=10?'service':front.light==='wide'?'shop':
    daylight&&['greenhouse','office','workshop'].includes(type)?'glass':kind==='court'?'arches':
    kind==='loft'?'timber':kind==='corner'?'bays':'plain'
  const entry=kind==='gallery'||kind==='corner'?0.23:kind==='garden'||kind==='porch'?0.76:0.5
  return {bounds:box,type,roof,facade,entry,levels:plan,...settings,floors:n}
}

function single(options,layout,band,phase){
  const {width:w,depth:d}=options
  const minimum=w>=18&&d>=18
  const complex=w>=22&&d>=21
  const bias=[0.04,0.10,0.16][band]
  const z0=clamp(Math.round(d*(0.08+bias/2)),2,d-9)
  const usable=w-2
  let bounds, wing, yard, companion
  switch(layout){
    case 'garden': {
      const length=clamp(Math.round(d*(0.43+bias)),8,d-z0-2)
      bounds=rect(1,z0,usable,length)
      yard=rect(2,z0+length+1,usable-2,d-z0-length-2)
      break
    }
    case 'gallery': {
      if(!minimum) return
      const strip=clamp(Math.round(w*(0.53+bias)),8,w-5)
      bounds=rect(1,z0,strip,d-z0-1)
      yard=rect(strip+2,z0,w-strip-3,d-z0-1)
      break
    }
    case 'corner': case 'porch': case 'court': {
      if(!minimum||layout==='court'&&!complex) return
      const annexWidth=clamp(Math.round(w*(0.27+bias)),5,usable-9)
      const annexDepth=clamp(Math.round(d*(0.38+bias)),7,d-z0-1)
      const setback=layout==='corner'?Math.min(4,Math.floor(d/8)):0
      const face=z0+setback
      const mainDepth=d-face-1
      const mainWidth=usable-annexWidth-(layout==='court'?11:0)
      if(mainWidth<8) return
      const onLeft=layout==='porch'
      bounds=rect(onLeft?1+annexWidth:1,face,mainWidth,mainDepth)
      const offset=layout==='corner'?face-2:layout==='court'?face:z0-1
      const wingZ=Math.max(1,offset),wingX=onLeft?1:bounds.x1
      wing=rect(wingX,wingZ,annexWidth,Math.min(d-wingZ-1,annexDepth+setback))
      yard=rect(wingX,wing.z1+1,annexWidth,d-wing.z1-2)
      if(layout==='court') {
        const pairWidth=w-wing.x1-4
        if(pairWidth>=7) companion=rect(wing.x1+3,z0+1,pairWidth,Math.max(8,d-z0-5))
      }
      break
    }
    case 'bridge': case 'pavilion': {
      if(!complex||layout==='bridge'&&(options.floors<2||w<27||d<23)) return
      const gap=3+band
      const left=clamp(Math.round(usable*(0.45+bias)),9,usable-gap-8)
      bounds=rect(1,z0,left,d-z0-3)
      companion=rect(1+left+gap,z0+(layout==='pavilion'?3:0),usable-left-gap,Math.round((d-z0-4)*(layout==='bridge'?0.95:0.8)))
      break
    }
    default: {
      const across=layout==='hall'
      const breadth=across?usable:clamp(Math.round(w*(0.69+bias)),8,usable)
      const length=clamp(Math.round(d*(across?0.58+bias:0.78+bias)),8,d-z0-1)
      bounds=rect(Math.floor((w-breadth)/2),z0,breadth,length)
      break
    }
  }
  if(options.architecture==='wing'&&!wing) return
  const core=house(bounds,options,layout,phase,{setback:layout==='terrace'?3+band:0})
  if(wing) Object.assign(core,{wing,wingSide:wing.x0<bounds.x0?'left':'right',wingRows:7,
    wingRoof:layout==='court'?'lantern':'shed',wingLevels:roomsFor(wing,options.type,layout,1,true,phase)})
  const volumes=[core]
  if(companion) volumes.push(house(companion,options,layout==='bridge'?'terrace':'pavilion',phase,
    {type:options.type==='home'?'workshop':options.type==='school'?'library':'cafe',floors:layout==='bridge'?2:1}))
  const yards=yard&&width(yard)>=4&&depth(yard)>=4?[yard]:[]
  return {volumes,gardens:yards,scheme:wing?'wing':'house',streetPlan:'',bridge:layout==='bridge'}
}

const neighbours={school:['library','cafe','book'],hotel:['restaurant','market','apartment'],museum:['cafe','book','hotel'],
  home:['cafe','book','workshop'],market:['restaurant','flowers','apartment'],station:['hotel','cafe','market']}
function street(options,layout,band,phase){
  const {width:w,depth:d,sitePlan}=options
  const uses=neighbours[options.type]??['home','cafe','book']
  const types=[options.type,...uses.filter(type=>type!==options.type),'apartment','workshop']
  const make=(box,i,reverse=false)=>{
    const kind=i===0?(layout==='square'?'terrace':layout==='mews'?'garden':'hall'):
      ['gallery','corner','loft'][(i-1+phase)%3]
    const floorCount=i===0?options.floors:Math.max(1,options.floors-(i+band)%3)
    return house(box,options,kind,phase,{type:types[i],floors:floorCount,reverse})
  }
  if(sitePlan) {
    const zones=kind=>sitePlan.filter(zone=>zone.kind===kind).map(({x,z,w,d})=>rect(x,z,w,d))
    const streets=zones('road'),volumes=zones('house').map((box,i)=>make(box,i,streets.some(road=>road.z0>=box.z1&&road.x1>box.x0&&road.x0<box.x1)))
    return {scheme:'street',streetPlan:'custom',volumes,streets,gardens:zones('garden'),approaches:zones('path')}
  }
  if(layout==='double'&&(w<27||d<32)) return
  const r=layout==='double'?Math.floor(d/2)-2:layout==='mews'?2:0
  const road=rect(0,r,w,4+Number(w>=36))
  const front=road.z1+2
  const gap=layout==='square'?5+band:layout==='mews'?3+band:2+Number(band===2)
  const count=w>=37&&layout!=='square'?3:2
  const available=w-2-(count-1)*gap
  if(available<count*8) return
  let x=1
  const volumes=[]
  for(let i=0;i<count;i++) {
    const nominal=Math.floor(available/count)+(i<available%count?1:0)
    const change=clamp(band-1,-(nominal-8),nominal-8)
    const size=nominal+(i===0?change:i===1?-change:0)
    const set=layout==='mews'?i*2:layout==='square'&&i===1?2+phase%2:phase===2?i:0
    const z=front+set
    const run=d-z-1
    if(run<8) return
    volumes.push(make(rect(x,z,size,clamp(Math.round(run*(i===0?0.88:0.61+0.12*((i+phase)%3))),8,run)),i))
    x+=size+gap
  }
  if(layout==='double') {
    const homes=volumes.slice(0,2)
    homes.forEach(({bounds},i)=>{
      const length=Math.min(r-3,8+(band+i)*2)
      if(length>=8) volumes.push(make(rect(bounds.x0,r-2-length,width(bounds),length),count+i,true))
    })
  }
  const plaza=volumes[0].bounds.x1+(layout==='square'?1:0)
  const approaches=['square','mews'].includes(layout)?[rect(plaza,road.z1,Math.max(2,gap-1),d-road.z1)]:[]
  return {scheme:'street',streetPlan:layout,volumes,streets:[road],approaches}
}

export function architecturalPlans(options){
  const isStreet=options.mode==='street'||options.architecture==='street'
  const streets=[['row','Торговый фронт вдоль улицы'],['square','Квартал вокруг площади'],
    ['mews','Переулок с проходом во двор'],['double','Бульвар с двумя сторонами'],['custom','Квартал на своём участке']]
  const plans=[]
  for(const [layout,title] of isStreet?streets:landmarks) {
    if(isStreet&&(options.sitePlan?layout!=='custom':layout==='custom'||options.streetLayout&&options.streetLayout!==layout)) continue
    for(let band=0;band<3;band++) for(let phase=0;phase<3;phase++) {
      const plan=isStreet?street(options,layout,band,phase):single(options,layout,band,phase)
      if(!plan) continue
      const structural=plan.volumes.map(v=>[v.roof,v.floors,v.wingRoof??'',Number(Boolean(v.reverse)),
        v.levels[0].rooms.map(r=>[r.wall,r.light,r.fixtures.join('+')].join('-')).join(','),
        v.levels[1]?.rooms.map(r=>r.fixtures[0]).join(',')??''].join(':'))
      const fit=plan.volumes.reduce((sum,{bounds,wing})=>sum+width(bounds)*depth(bounds)+(wing?width(wing)*depth(wing):0),0)/(options.width*options.depth)
      const fingerprint=[layout,...structural].join('/')
      plans.push({...plan,layout,title,fingerprint,outline:outlineFor(options,plan.volumes),fit,phase,band})
    }
  }
  return plans
}
