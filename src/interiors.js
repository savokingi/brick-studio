import {roomAccess} from './room-access.js'
import {catalog,sizeId} from './catalog.js'
import {buildingType} from './building-types.js'
import {furnishProgram} from './programmed-rooms.js'

export function fitsRoomPlan({w,d}={},height=24) {
  return w>=10&&d>=12&&w*d>=340&&height>=15
}

/** Plans minifigure-scale furnishing groups around a continuous circulation aisle. */
export function furnishInterior(context) {
  const { add:addPart, put:putPart, step, bounds, baseY, floor, options, design, trim, stair, doorX, doorWidth=4, bridgeDoor,
    sideAccess, section, heightLimit=24, attic=false, obstacles=[], rooms } = context
  const { x0, x1, z0, z1 } = bounds
  const margin=attic?0:1
  const left=x0+margin, right=x1-margin, front=z0+margin, back=z1-margin
  const width=right-left, depth=back-front
  const planned=design.spacePlan===1
  const program=buildingType(options.type)
  const expanded=Boolean(design.interiorPlan&&fitsRoomPlan({w:width,d:depth},heightLimit))
  const upholstery=['green','blue','darkRed'][(design.palette+(expanded?floor:0))%3]
  const bedding=['lightBlue','sandGreen','darkRed'][(design.shelves+(expanded?floor:0))%3]
  const objects=[], blocked=new Set(), routes=[]
  const cell=(x,z)=>x+','+z
  function reserve(x,z,w,d) {
    for(let a=x;a<x+w;a++) for(let b=z;b<z+d;b++) blocked.add(cell(a,b))
  }
  function route(box) {
    reserve(box.x,box.z,box.w,box.d)
    routes.push(box)
  }
  const aisleX=Math.min(right-2,Math.max(left,Math.floor((left+right-2)/2)))
  const access=expanded||planned?roomAccess({left,front,width,depth,aisleX}):null
  const doors=[]
  let arrival
  function solid(box) {
    reserve(box.x,box.z,box.w,box.d)
    access?.mark(box)
  }
  for(const box of obstacles) solid(box)
  const entranceDepth=depth>=10?2:1
  if(!planned) {
    route({x:aisleX,z:front,w:2,d:depth})
    route({x:left,z:front,w:width,d:entranceDepth})
  }
  if(floor===0) {
    arrival={x:doorX,z:front,w:doorWidth,d:1}
    doors.push(arrival)
  }
  function sideRoute(side,z) {
    const x=side==='left'?left:aisleX
    const w=(side==='left'?aisleX+2:right)-x
    if(!planned) route({x,z,w,d:2})
    doors.push({x:side==='left'?left:right-1,z,w:1,d:2})
  }
  if(bridgeDoor) {
    sideRoute(bridgeDoor.side,front+bridgeDoor.offset)
  }
  if((planned||design.interiorPlan)&&sideAccess) sideRoute(sideAccess.side,sideAccess.z)
  if(Array.isArray(stair)) {
    for(const well of stair.filter(well=>well.floor===floor||well.floor===floor-1)) {
      solid(well)
      if(well.entry) {
        const landing=well.floor===floor?well.entry:well.exit
        doors.push(landing)
        if(well.floor!==floor) arrival=landing
        if(well.floor!==floor&&well.guard) solid(well.guard)
        if(planned) continue
        const x=Math.min(aisleX,landing.x),w=Math.max(aisleX+2,landing.x+landing.w)-x
        const extend=landing.d===1&&(landing.z<well.z?landing.z>front:landing.z+1<back)
        const z=landing.z-Number(extend&&landing.z<well.z)
        const d=landing.d+Number(extend)
        reserve(x,z,w,d)
        routes.push({x,z,w,d})
        continue
      }
      const from=Math.min(aisleX,well.x), to=Math.max(aisleX+2,well.x+well.w)
      const landings=[well.z-1,well.z+well.d]
      if(well.kind==='turn') landings.push(well.z+well.d-2,well.z+well.d-1)
      for(const z of landings) {
        reserve(from,z,to-from,1)
        routes.push({x:from,z,w:to-from,d:1})
      }
    }
  } else if(stair) {
    solid(stair)
    // The landing stays accessible from the central aisle.
    reserve(aisleX,stair.z-1,right-aisleX,1)
    routes.push({x:aisleX,z:stair.z-1,w:right-aisleX,d:1})
  }

  function reached(open,rect) {
    for(let x=rect.x;x<rect.x+rect.w;x++) for(let z=rect.z;z<rect.z+rect.d;z++) if(open(x,z)) return true
    return false
  }
  if(planned&&width*depth>=80) doors.push({x:aisleX,z:back-2,w:2,d:2})
  const network=planned?access.circulation(arrival??{x:aisleX,z:front,w:2,d:1},doors):null
  if(network) {
    for(const box of network.routes) route(box)
    for(const box of doors) reserve(box.x,box.z,box.w,box.d)
  }
  const originalReach=network?.reached??access?.reach()
  const thresholds=originalReach?doors.filter(door=>reached(originalReach,door)):[]
  if(!planned&&expanded&&width>=20&&depth>=23) {
    for(const fraction of depth>=34?[0.34,0.67]:[0.52]) {
      const z=front+Math.floor(depth*fraction)
      reserve(left,z,width,2)
      routes.push({x:left,z,w:width,d:2})
    }
  }
  let currentReach=originalReach
  function accessible(position) {
    if(!access) return true
    if(!access.adjacent(currentReach,position)) return false
    access.mark(position)
    const open=access.reach(network?.start)
    if(access.adjacent(open,position)&&objects.every(object=>access.adjacent(open,object))&&
      thresholds.every(door=>reached(open,door))) {
      currentReach=open
      return true
    }
    access.mark(position,0)
    return false
  }
  let turned
  function add(id,x,y,z,color,angle=0,mount=null) {
    if(!turned) return addPart(id,x,y,z,color,angle,mount)
    const spec=catalog[id], d=angle%180?spec.w:spec.d
    return addPart(id,turned.x+turned.w-(z-turned.z)-d,y,turned.z+x-turned.x,color,(angle+270)%360,mount)
  }
  function put(kind,x,y,z,w,d,color) {
    if(!turned) return putPart(kind,x,y,z,w,d,color)
    return add(sizeId(kind,w,d),x,y,z,color,w<d?90:0)
  }
  function place(name,w,d,construct,preference='back',zone) {
    const candidates=[]
    const orientations=planned&&w!==d?[[w,d,false],[d,w,true]]:[[w,d,false]]
    for(const [w,d,rotated] of orientations) {
      for(let z=front;z+d<=back;z++) for(let x=left;x+w<=right;x++) {
        let free=true
        for(let a=x;a<x+w&&free;a++) for(let b=z;b<z+d;b++) if(blocked.has(cell(a,b))) {free=false;break}
        if(!free) continue
        const wallDistance=Math.min(x-left,right-x-w,z-front,back-z-d)
        const priority=preference==='front'?z-front:preference==='left'?x-left:preference==='right'?right-x-w:back-z-d
        const side=design.layout===0?x-left:right-x-w
        const distance=zone?Math.abs(x+(w-1)/2-zone.x)+Math.abs(z+(d-1)/2-zone.z):null
        const outside=zone?.bounds?Math.max(0,zone.bounds.x0-x,x+w-zone.bounds.x1)+
          Math.max(0,zone.bounds.z0-z,z+d-zone.bounds.z1):0
        const score=zone?distance*90+wallDistance*(zone.wall?30:-4)+side+outside*180:
          priority*100+wallDistance*20+side
        candidates.push({x,z,w,d,rotated,score:score+((x+z+design.shelves)%3)*0.1+Number(rotated)*12})
      }
    }
    candidates.sort((a,b)=>a.score-b.score)
    const position=access?candidates.filter(candidate=>access.adjacent(currentReach,candidate)).slice(0,12)
      .find(accessible):candidates[0]
    if(!position) return false
    const {x,z}=position
    reserve(x,z,position.w,position.d)
    step(name)
    const start=context.partCount()
    turned=position.rotated?position:null
    try {construct(x,baseY,z,w,d)} finally {turned=null}
    const object={name,x,z,w:position.w,d:position.d,floor,start,end:context.partCount()}
    objects.push(object)
    return true
  }

  function cabinet(x,y,z,w=4,d=2,color='brown') {
    for(let a=0;a<w;a+=2) {
      const n=Math.min(2,w-a)
      put('brick',x+a,y,z,n,d,color)
      put('brick',x+a,y+3,z,n,d,color)
    }
    put('plate',x,y+6,z,w,d,trim)
  }
  function shelf(x,y,z,w=4,contents='books') {
    for(let level=0;level<3;level++) {
      const Y=y+level*4
      put('plate',x,Y,z,w,1,'brown')
      put('brick',x,Y+1,z,1,1,'brown')
      put('brick',x+w-1,Y+1,z,1,1,'brown')
      for(let a=1;a<w-1;a++) {
        const color=contents==='jars'?(a%2?'white':'tan'):['darkRed','blue','green','tan','orange'][(a+level+design.shelves)%5]
        put('plate',x+a,Y+1,z,1,1,color)
        put('plate',x+a,Y+2,z,1,1,color)
        put('tile',x+a,Y+3,z,1,1,color)
      }
    }
    put('tile',x,y+12,z,w,1,'brown')
  }
  function plant(x,y,z) {
    add('3062b',x,y,z,'brown')
    add('3062b',x,y+3,z,'leafGreen')
    add('6141',x,y+6,z,'leafGreen')
    add('24866',x,y+7,z,design.garden===0?'pink':'yellow')
  }
  function cashDesk(x,y,z) {
    cabinet(x,y,z,2,2)
    add('3039',x,y+7,z,'dark')
    put('tile',x,y+10,z+1,1,1,'black')
  }
  function prepBench(x,y,z) {
    cabinet(x,y,z,4,2,'white')
    put('tile',x,y+7,z,2,2,'tan')
    add('3899',x+2,y+7,z,'white')
    put('plate',x+3,y+7,z,1,1,'white')
    add('6141',x+3,y+8,z,'orange')
  }
  function sink(x,y,z) {
    cabinet(x,y,z,2,2,'white')
    put('tile',x,y+7,z,1,2,'dark')
    add('4599a',x+1,y+7,z,'gray')
  }
  function display(x,y,z,w=4) {
    cabinet(x,y,z,w,2)
    for(let a=0;a<w;a+=2) add('4865b',x+a,y+7,z,'glass')
    for(let a=0;a<w;a++) {
      add('6141',x+a,y+7,z+1,'tan')
      add('98138',x+a,y+8,z+1,a%2?'orange':'brown')
    }
  }
  function oven(x,y,z) {
    put('brick',x,y,z,4,2,'dark')
    put('brick',x,y+3,z,4,2,'gray')
    put('plate',x,y+6,z,4,2,'dark')
    add('6141',x,y+7,z,'black')
    add('6141',x+1,y+7,z,'black')
    add('6141',x+2,y+7,z,'black')
    put('tile',x+3,y+7,z,1,2,'gray')
  }
  function espresso(x,y,z) {
    cabinet(x,y,z,4,2)
    put('brick',x,y+7,z,2,2,'dark')
    put('plate',x,y+10,z,2,2,'gray')
    add('4599a',x,y+11,z,'black')
    add('3899',x+2,y+7,z,'white')
    add('3899',x+3,y+7,z,'white')
  }
  function dining(x,y,z) {
    // A 2 × 2 table and a real minifigure seat share a compact 2 × 5 footprint.
    add('3941',x,y,z,'brown')
    put('plate',x,y+3,z,2,2,'brown')
    add('3899',x,y+4,z,'white')
    put('tile',x+1,y+4,z,1,2,trim)
    add('4079',x,y,z+2,upholstery)
  }
  function sofa(x,y,z,w=4) {
    put('plate',x,y,z,w,2,'dark')
    put('brick',x,y+1,z+1,w,1,upholstery)
    put('tile',x,y+1,z,w,1,upholstery)
  }
  function desk(x,y,z) {
    put('brick',x,y,z,1,2,'brown')
    put('brick',x+3,y,z,1,2,'brown')
    put('plate',x,y+3,z,4,2,'brown')
    put('tile',x,y+4,z,2,2,'white')
    add('3899',x+2,y+4,z,'white')
    add('4079',x+1,y,z+2,upholstery)
  }
  function bed(x,y,z,w,d) {
    put('plate',x,y,z,w,2,'brown')
    put('plate',x,y,z+2,w,2,'brown')
    if(d>4) put('plate',x,y,z+4,w,d-4,'brown')
    put('brick',x,y+1,z,w,1,'brown')
    put('plate',x,y+1,z+1,w,2,bedding)
    put('tile',x,y+2,z+1,w,1,'white')
    put('tile',x,y+2,z+2,w,1,bedding)
    for(let b=3;b<d;b++) {
      put('plate',x,y+1,z+b,w,1,bedding)
      put('tile',x,y+2,z+b,w,1,b===d-1?trim:bedding)
    }
  }
  function bathroom(x,y,z,w,d) {
    // The L-shaped screen leaves the front open to the circulation area.
    for(let row=0;row<5;row++) {
      for(let a=0;a<w;a++) put('brick',x+a,y+row*3,z+d-1,1,1,'white')
      for(let b=0;b<d-1;b++) put('brick',x+w-1,y+row*3,z+b,1,1,'white')
    }
    sink(x,y,z)
    const toiletZ=z+d-3
    put('brick',x,y,toiletZ,2,2,'white')
    put('plate',x,y+3,toiletZ,2,2,'white')
    put('tile',x,y+4,toiletZ,2,1,'white')
    put('brick',x,y+4,toiletZ+1,2,1,'white')
    put('tile',x,y+7,toiletZ+1,2,1,'white')
    if(w>=5) {
      for(let row=0;row<3;row++) add('4865b',x+2,y+row*3,z+d-2,'glass')
      put('plate',x+2,y+9,z+d-2,2,1,'gray')
      add('6141',x+2,y+10,z+d-2,'gray')
    }
  }

  function furnishRooms() {
    const rooms={
      suite:['Спальня · кровать, комод и светильник',6,6,(x,y,z)=>{
        bed(x,y,z,4,6)
        cabinet(x+4,y,z,2,2)
        add('3062b',x+4,y+7,z,'black')
        add('4740',x+4,y+10,z,'white')
        cabinet(x+4,y,z+4,2,2)
      }],
      guest:['Гостевая · две кровати',6,5,(x,y,z)=>{
        bed(x,y,z,3,5)
        bed(x+3,y,z,3,5)
      }],
      bath:['Санузел · душ, раковина и туалет',5,6,bathroom],
      lounge:['Гостиная · диван, ковёр и стол',6,5,(x,y,z)=>{
        sofa(x,y,z+3,6)
        for(const a of [0,4]) put('tile',x+a,y,z+1,2,2,upholstery)
        put('tile',x,y,z,6,1,trim)
        add('3941',x+2,y,z+1,'brown')
        put('plate',x+2,y+3,z+1,2,2,'brown')
      }],
      dining:['Столовая · общий стол и четыре кресла',4,8,(x,y,z)=>{
        for(const a of [0,2]) {
          add('4079',x+a,y,z,upholstery,180)
          add('3941',x+a,y,z+3,'brown')
          add('4079',x+a,y,z+5,upholstery)
        }
        put('plate',x,y+3,z+3,4,2,'brown')
        add('3899',x,y+4,z+3,'white')
        add('3899',x+2,y+4,z+3,'white',180)
      }],
      kitchen:['Кухня · духовка, плита и мойка',6,2,(x,y,z)=>{
        oven(x,y,z)
        sink(x+4,y,z)
      },true],
      island:['Кухонная подготовка · остров и буфет',6,3,(x,y,z)=>{
        prepBench(x,y,z+1)
        cabinet(x+4,y,z,2,2)
      }],
      studio:['Кабинет · стол, кресло и полки',6,5,(x,y,z)=>{
        desk(x,y,z)
        shelf(x+4,y,z,2)
        plant(x+5,y,z+4)
      }],
      reading:['Читальный уголок · кресла, стол и стеллаж',6,5,(x,y,z)=>{
        shelf(x,y,z,6)
        add('4079',x,y,z+2,upholstery)
        add('4079',x+4,y,z+2,upholstery)
        cabinet(x+2,y,z+2,2,2)
        put('tile',x+2,y+7,z+2,2,2,'tan')
      }],
      laundry:['Хозяйственная · стиральные машины и корзины',6,2,(x,y,z)=>{
        cabinet(x,y,z,6,2,'white')
        for(const a of [0,2]) add('4032a',x+a,y+7,z,'gray')
        add('3899',x+4,y+7,z,'white')
      },true],
      foyer:['Прихожая · лавка, шкаф и растение',6,3,(x,y,z)=>{
        sofa(x,y,z,4)
        cabinet(x+4,y,z,2,2)
        plant(x+5,y,z+2)
      },true],
      warmth:['Гостиная · камин и диван',6,5,(x,y,z)=>{
        for(let a=0;a<3;a++) {
          put('brick',x+1,y+a*3,z,4,1,'gray')
          put('brick',x+2,y+a*3,z+1,2,1,a%2?'dark':'brown')
        }
        put('plate',x+1,y+9,z,4,2,'darkTan')
        sofa(x,y,z+3,6)
      }],
      wardrobe:['Гардеробная · шкафы и полка',6,3,(x,y,z)=>{
        cabinet(x,y,z,6,2)
        if(heightLimit>=20) shelf(x,y+7,z,6,'jars')
        else put('tile',x,y+7,z,6,1,'brown')
      },true],
      garden:['Зимний сад · растения и лавка',6,4,(x,y,z)=>{
        for(let a=0;a<6;a++) plant(x+a,y,z)
        sofa(x+1,y,z+2,4)
      }],
      stock:['Кладовая · банки, ящики и рабочая полка',6,3,(x,y,z)=>{
        shelf(x,y,z,6,'jars')
        cabinet(x,y,z+1,4,2)
        put('plate',x+1,y+7,z+1,2,2,'tan')
      },true],
      retail:['Зал · островные витрины',6,4,(x,y,z)=>{
        display(x,y,z,6)
        display(x,y,z+2,6)
      }],
      bakery:['Пекарня · печь, тесто и запасы',8,3,(x,y,z)=>{
        oven(x,y,z)
        prepBench(x+4,y,z+1)
        add('3062b',x,y,z+2,'tan')
        add('98138',x,y+3,z+2,'white')
      },true],
      cafe:['Кафе · кофемашина и станция выдачи',8,3,(x,y,z)=>{
        espresso(x,y,z)
        prepBench(x+4,y,z+1)
      },true],
      book:['Книжный · остров с книгами и стойкой',6,4,(x,y,z)=>{
        shelf(x,y,z,6)
        shelf(x,y,z+1,6)
        cabinet(x+1,y,z+2,4,2)
        put('tile',x+2,y+7,z+2,2,2,'blue')
      }],
      flowers:['Флорист · витрина букетов и упаковка',6,4,(x,y,z)=>{
        prepBench(x+2,y,z+2)
        cabinet(x,y,z,6,2)
        for(const a of [0,2,4]) plant(x+a,y+7,z)
      }],
      seating:['Зал · мягкие места для посетителей',6,5,(x,y,z)=>{
        sofa(x,y,z,6)
        add('4079',x,y,z+2,upholstery)
        add('4079',x+4,y,z+2,upholstery)
        plant(x+3,y,z+4)
      }]
    }
    const compact={
      suite:['Спальня · кровать и изголовье',3,5,bed],
      guest:['Гостевая · кровать и тумба',4,5,(x,y,z)=>{
        bed(x,y,z,3,5)
        put('brick',x+3,y,z+3,1,2,'brown')
        put('tile',x+3,y+3,z+3,1,2,trim)
      }],
      bath:['Санузел · раковина и туалет',3,5,bathroom],
      lounge:['Гостиная · диван и напольный ковёр',4,4,(x,y,z)=>{
        sofa(x,y,z+2,4)
        put('tile',x+1,y,z,2,2,upholstery)
      }],
      dining:['Столовая · стол и кресло',2,5,dining],
      kitchen:['Кухня · плита и духовка',4,2,oven,true],
      studio:['Кабинет · стол и кресло',4,5,desk],
      reading:['Читальный уголок · кресло и полка',4,4,(x,y,z)=>{
        shelf(x,y,z,4)
        add('4079',x+1,y,z+1,upholstery)
      }],
      garden:['Зимний сад · растения и лавка',4,4,(x,y,z)=>{
        for(let a=0;a<4;a++) plant(x+a,y,z)
        sofa(x,y,z+2,4)
      }],
      stock:['Кладовая · стеллаж и ящики',4,3,(x,y,z)=>{
        shelf(x,y,z,4,'jars')
        cabinet(x,y,z+1,4,2)
      },true]
    }
    const zone=(side,fraction,wall)=>({
      x:side==='left'?(left+aisleX-1)/2:(aisleX+2+right-1)/2,
      z:front+fraction*(depth-1),wall
    })
    let sequence=0,usedArea=0
    function group(key,preferred,side) {
      const alternate=(sequence++ +design.layout+floor)%2
      const band=preferred??[0.24,0.72,0.45,0.85][sequence%4]
      const choice=side??(alternate?'right':'left')
      for(const recipe of [rooms[key],compact[key]].filter(Boolean)) {
        const [name,w,d,assemble,wall]=recipe
        if(place(name,w,d,assemble,'back',zone(choice,band,wall))) {
          usedArea+=w*d
          return
        }
      }
    }
    const residential=floor>0||options.type==='home'
    const commercial=options.type==='cafe'||options.type==='bakery'
    const small=design.interiorPlan===2
    const targetArea=width*depth*(small?0.27:0.40)
    if(residential) {
      const priorities=floor===0?['foyer','lounge','kitchen','dining','bath','suite','island','laundry']
        :floor%3===1?['suite','guest','bath','wardrobe','studio','reading','laundry','lounge']
        :floor%3===2?['studio','reading','lounge','bath','garden','suite','wardrobe','stock']
        :['warmth','guest','reading','bath','studio','garden','suite','wardrobe']
      for(const [i,key] of priorities.entries()) group(key,[0.15,0.33,0.77,0.57,0.83,0.86,0.50,0.69][i])
    } else {
      const cashZone=zone(design.layout?'right':'left',0.17,true)
      if(place('Касса · стойка и терминал',2,2,cashDesk,'front',cashZone)) usedArea+=4
      if(commercial&&section!=='wing') {
        const count=design.manualTables?design.tables:Math.min(8,3+Math.floor(width*depth/215)+design.tables-1)
        for(let i=0;i<count;i++) {
          const side=(i+design.layout)%2?'right':'left'
          if(place('Зал · столик с креслом '+(i+1),2,5,dining,'front',zone(side,0.25+(i%4)*0.13))) usedArea+=10
        }
      }
      group(options.type,0.84)
      if(commercial) {
        group('retail',0.27)
        group('kitchen',0.85)
        group('island',0.72)
      }
      for(const key of options.type==='book'?['book','reading','stock','studio']
        :options.type==='flowers'?['flowers','garden','stock','retail']
        :['seating','stock','laundry']) group(key)
    }
    const extras=residential?['reading','garden','warmth','studio','dining','wardrobe','lounge','guest','laundry','stock']
      :options.type==='book'?['reading','book','stock','studio','seating']
      :options.type==='flowers'?['flowers','garden','retail','stock','seating']
      :section==='wing'?['island','stock','laundry','kitchen']:['seating','retail','stock','seating','island']
    const limit=small?12:Math.min(34,Math.ceil(width*depth/48)+6)
    for(let i=0;usedArea<targetArea&&i<limit;i++) group(extras[(i+floor)%extras.length])
    for(const [i,side] of ['left','right'].entries()) place('Растение в горшке '+(i+1),1,1,plant,'front',zone(side,0.17,true))
  }

  function furnishCompact() {
    const residential=floor>0||options.type==='home'
    if(residential) {
      if(width>=16&&depth>=12) {
        place('Спальня · кровать, тумба и комод',6,6,(x,y,z)=>{
          bed(x,y,z,4,6)
          cabinet(x+4,y,z,2,2)
          add('3062b',x+4,y+7,z,'black')
          add('4740',x+4,y+10,z,'white')
          cabinet(x+4,y,z+3,2,2)
          plant(x+4,y+7,z+3)
        },'back')
      } else place('Спальня · кровать с изголовьем',3,5,bed,'back')
      place('Санузел · раковина и туалет',width>=16?5:3,width>=16?6:5,bathroom,'front')
      place('Кухня · плита и духовка',4,2,oven,'back')
      place('Кухня · мойка с краном',2,2,sink,'back')
      place('Гостиная · диван',width>=16?6:4,2,sofa,'left')
      place('Рабочее место · стол и кресло',4,5,desk,'front')
      place('Книжный шкаф',4,1,shelf,'left')
      place('Гостиная · столик с кружкой',2,2,(x,y,z)=>{
        add('3941',x,y,z,'brown')
        put('plate',x,y+3,z,2,2,'brown')
        add('3899',x,y+4,z,'white')
      },'front')
      place('Прикроватная тумба и лампа',2,2,(x,y,z)=>{
        cabinet(x,y,z,2,2)
        add('3062b',x,y+7,z,'black')
        add('4740',x,y+10,z,'white')
      },'left')
    } else {
      const type=options.type
      const counterWidth=width>=16?6:4
      if(type==='bakery') {
        place('Пекарня · печь и варочная поверхность',4,2,oven,'back')
        place('Пекарня · рабочий стол с посудой',4,2,prepBench,'back')
        place('Пекарня · витрина с выпечкой',counterWidth,2,display,'front')
        place('Пекарня · замес теста и запасы муки',4,2,(x,y,z)=>{
          cabinet(x,y,z,4,2,'white')
          add('4740',x,y+7,z,'white')
          add('3899',x+2,y+7,z,'white')
          add('3062b',x+3,y+7,z,'tan')
          add('98138',x+3,y+10,z,'white')
        },'left')
        place('Пекарня · стеллаж с ингредиентами',4,1,(x,y,z)=>shelf(x,y,z,4,'jars'),'left')
      } else if(type==='cafe') {
        place('Кафе · кофемашина и кружки',4,2,espresso,'back')
        place('Кафе · витрина с десертами',counterWidth,2,display,'front')
        place('Кафе · сервировочная станция',4,2,prepBench,'back')
        place('Кафе · полка для запасов',4,1,(x,y,z)=>shelf(x,y,z,4,'jars'),'left')
      } else if(type==='book') {
        for(let i=0;i<3;i++) place('Книжный · стеллаж с книгами '+(i+1),4,1,shelf,i===2?'back':'left')
        place('Книжный · островной стеллаж',4,2,(x,y,z)=>{
          shelf(x,y,z)
          shelf(x,y,z+1)
        },'front')
        place('Книжный · упаковочный стол',4,2,prepBench,'back')
        place('Книжный · кресло для чтения',2,3,(x,y,z)=>add('4079',x,y,z,upholstery),'front')
      } else if(type==='flowers') {
        place('Флорист · стол для букетов',4,2,(x,y,z)=>{
          cabinet(x,y,z,4,2)
          plant(x,y+7,z)
          plant(x+2,y+7,z)
          put('tile',x+1,y+7,z,1,2,'tan')
        },'back')
        for(let i=0;i<2;i++) place('Флорист · многоуровневая стойка '+(i+1),4,2,(x,y,z)=>{
          put('brick',x,y,z,4,1,'brown')
          put('plate',x,y+3,z,4,1,'brown')
          for(let a=0;a<4;a++) plant(x+a,y+4,z)
          for(let a=0;a<4;a++) plant(x+a,y,z+1)
        },i?'front':'left')
        place('Флорист · стеллаж для горшков',4,1,(x,y,z)=>shelf(x,y,z,4,'jars'),'left')
      }
      place('Касса · стойка и терминал',2,2,cashDesk,'front')
      place('Мойка и хозяйственная зона',2,2,sink,'back')
      if(type==='cafe'||type==='bakery') {
        const count=design.manualTables?design.tables:design.tables+(width*depth>=240?2:0)
        for(let i=0;i<count;i++) place('Зал · столик с креслом '+(i+1),2,5,dining,'front')
      }
      if(depth>=10) place('Хранение · шкаф у стены',4,1,(x,y,z)=>shelf(x,y,z,4,'jars'),'back')
    }

    // Extra wall storage fills larger rooms without consuming the main aisle.
    const targetArea=width*depth*(residential?0.45:0.38)
    const domesticExtras=[
      ['Гардероб · двустворчатый шкаф',4,2,(x,y,z)=>{
        const courses=Math.min(6,Math.floor((heightLimit-1)/3))
        for(let level=0;level<courses;level++) {
          put('brick',x,y+3*level,z,1,2,'brown')
          put('brick',x+1,y+3*level,z,2,2,'white')
          put('brick',x+3,y+3*level,z,1,2,'brown')
        }
        put('tile',x,y+courses*3,z,4,2,'brown')
      }],
      ['Обеденная зона · стол и два кресла',2,8,(x,y,z)=>{
        add('4079',x,y,z,upholstery,180)
        add('3941',x,y,z+3,'brown')
        put('plate',x,y+3,z+3,2,2,'brown')
        add('3899',x,y+4,z+3,'white')
        add('4079',x,y,z+5,upholstery)
      }],
      ['Уголок для чтения · кресло и лампа',4,3,(x,y,z)=>{
        add('4079',x,y,z,upholstery)
        cabinet(x+2,y,z,2,2)
        add('3062b',x+2,y+7,z,'black')
        add('4740',x+2,y+10,z,'white')
      }],
      ['Комод с книгами',4,2,(x,y,z)=>{
        cabinet(x,y,z)
        put('tile',x,y+7,z,2,2,'darkRed')
        put('tile',x+2,y+7,z,2,1,'blue')
      }],
      ['Библиотека · узкий стеллаж',4,1,shelf]
    ]
    for(let i=0;i<(residential?domesticExtras.length:8);i++) {
      if(objects.reduce((sum,o)=>sum+o.w*o.d,0)>=targetArea) break
      let placed
      if(residential) {
        placed=place(...domesticExtras[i],i%2?'front':'left')
      } else if(design.manualTables&&(options.type==='bakery'||options.type==='cafe')) {
        placed=place('Полка для посуды и запасов '+(i+1),3,1,(x,y,z)=>shelf(x,y,z,3,'jars'),'back')
      } else {
        const arrangement=options.type==='flowers'
          ? (x,y,z)=>{for(let n=0;n<5;n++)plant(x,y,z+n);plant(x+1,y,z+2)}
          : dining
        placed=place(options.type==='flowers'?'Цветочные композиции '+(i+1):'Место для посетителя '+(i+1),2,5,arrangement,i%2?'front':'left')
      }
      if(!placed) {
        if(!place('Шкаф для хранения '+(i+1),3,1,(x,y,z)=>shelf(x,y,z,3,residential?'books':'jars'),'back')) break
      }
    }
    for(let i=0;i<2;i++) place('Растение в горшке '+(i+1),1,1,plant,i?'front':'back')
  }

  if(attic) {
    const residential=['home','apartment','hotel'].includes(options.type)
    const zone=(x,z,wall=false)=>({x:left+x*(width-1),z:front+z*(depth-1),wall})
    const side=design.layout?0.2:0.8
    if(residential) {
      place('Кровать под скатом',2,4,bed,'back',zone(side,0.8,true))
      place('Лавка у фронтона',2,2,sofa,'front',zone(1-side,0.18,true))
    } else place('Полка для запасов',4,1,(x,y,z,w)=>shelf(x,y,z,w,'jars'),'back',zone(side,0.8,true))
    const trunk=(x,y,z)=>{
      put('brick',x,y,z,2,1,'brown')
      put('plate',x,y+3,z,2,1,'brown')
      put('tile',x,y+4,z,2,1,'tan')
    }
    place('Деревянный сундук',2,1,trunk,'left',zone(side,0.58,true))
    if(width*depth>=64) place('Шкаф под скатом',2,1,cabinet,'right',zone(1-side,0.8,true))
    if(width*depth>=90) {
      place('Читальный столик и кресло',2,5,dining,'front',zone(side,0.25))
      place('Сундук для хранения',2,1,trunk,'back',zone(1-side,0.55,true))
    }
    if(width*depth>=140) {
      place(residential?'Письменный стол у фронтона':'Стол для разбора коробок',4,5,desk,'front',zone(1-side,0.25))
      place(residential?'Книжный стеллаж':'Стеллаж с расходниками',4,1,
        (x,y,z,w)=>shelf(x,y,z,w,residential?'books':'jars'),'right',zone(side,0.45,true))
      if(width*depth>=200) {
        if(residential) place('Гостевая кровать под скатом',2,4,bed,'back',zone(1-side,0.68,true))
        else place('Тумба для инструментов',4,2,cabinet,'back',zone(1-side,0.68,true))
      }
    }
  } else if(rooms||program?.ground) {
    furnishProgram({keys:rooms?rooms.flatMap(room=>room.fixtures):floor>0?program.upper:section==='wing'?program.annex:program.ground,rooms,place,put,add,
    fixtures:{cabinet,shelf,plant,prepBench,sink,oven,dining,sofa,desk,bed,bathroom,display},
    room:{left,front,width,depth},design,floor,heightLimit})
    if(rooms?.length===2&&width>=12&&depth>=12&&objects.length>=4) {
      const byDepth=rooms[0].wall==='front'
      const x=byDepth?left+1:left+Math.floor(width/2)
      const z=byDepth?front+Math.floor(depth/2):front+1
      place('Низкая перегородка между помещениями',byDepth?3:1,byDepth?1:3,(x,y,z,w,d)=>{
        put('brick',x,y,z,w,d,trim)
        put('tile',x,y+3,z,w,d,'brown')
      },'left',{x,z,bounds:{x0:x-1,x1:x+4,z0:z-1,z1:z+4}})
    }
  }
  else if(expanded) furnishRooms()
  else furnishCompact()

  const furnitureArea=objects.reduce((sum,o)=>sum+o.w*o.d,0)
  return {
    floor,objects,routes,usable:{x:left,z:front,w:width,d:depth},heightLimit,
    ...(attic?{attic:true,label:'Чердак'}:{}),...(rooms?{rooms:rooms.map(room=>room.label)}:{}),
    furnitureArea,coverage:Math.round(100*furnitureArea/(width*depth)),
    stair,
    entrance:floor===0?{x:doorX,z:front,w:doorWidth,d:entranceDepth}:null
  }
}
