import references from './references.json' with {type:'json'}

export { references }
export const referenceByNumber = new Map(references.map(reference => [reference.number, reference]))
export const profiles = {
  aframe: { label:'Шале с высоким фронтоном', roof:1, reverse:true, levels:8, front:'porch', wall:'log', window:'small', topRows:6, low:true },
  timber: { label:'Фахверковый дом с крыльцом', roof:1, levels:6, front:'porch', wall:'log', window:'paired', top:'chimney' },
  dock: { label:'Здание с деревянным настилом', roof:2, levels:4, front:'deck', wall:'log', window:'small', top:'chimney', topRows:7, low:true },
  woodland: { label:'Лесной дом с верандой', roof:1, reverse:true, levels:5, front:'deck', wall:'log', window:'small', top:'chimney', topRows:6, low:true },
  townhouse: { label:'Таунхаус с дворовой галереей', roof:2, levels:3, front:'portico', wall:'masonry', window:'paired', top:'chimney' },
  greenhouse: { label:'Оранжерея с верхним остеклением', roof:0, front:'greenhouse', wall:'fluted', window:'tall', top:'lantern', low:true },
  pavilion: { label:'Павильон с панорамными окнами', roof:0, front:'glass', wall:'plain', window:'tall', top:'garden', low:true },
  terrace: { label:'Дом с террасой и балюстрадой', roof:0, front:'deck', wall:'masonry', window:'paired', top:'garden' },
  civic: { label:'Здание с арочным портиком', roof:0, front:'portico', wall:'fluted', window:'paired', top:'lantern' },
  crooked: { label:'Дом с асимметричной надстройкой', roof:0, front:'porch', wall:'masonry', window:'lattice', top:'turret' },
  beacon: { label:'Башня над низким основным объёмом', roof:0, front:'glass', wall:'fluted', window:'small', top:'tower' },
  arcade: { label:'Торговый фасад с аркадой', roof:2, levels:3, front:'portico', wall:'masonry', window:'paired', top:'chimney' },
  depot: { label:'Станция с широким навесом', roof:0, front:'canopy', wall:'fluted', window:'tall', top:'canopy' },
  studio: { label:'Студия с панорамным фасадом', roof:0, front:'glass', wall:'plain', window:'tall', top:'lantern' }
}

export function selectReference(options, previous, rng, eligible=references, {matchStyle=false}={}) {
  if(options.reference) return referenceByNumber.get(options.reference)
  if(matchStyle) {
    const matching=eligible.filter(reference=>reference.style===options.style)
    if(matching.length) eligible=matching
  }
  const blockedProfiles=new Set(previous.slice(-3).map(item=>referenceByNumber.get(item.design.reference)?.profile))
  const blockedSets=new Set(previous.slice(-18).map(item=>item.design.reference))
  const unshown=eligible.filter(reference=>!blockedSets.has(reference.number))
  const different=unshown.filter(reference=>!blockedProfiles.has(reference.profile))
  const pool=different.length?different:unshown.length?unshown:eligible
  const compact=options.width*options.depth<=360
  const commercial=['bakery','cafe','flowers','book']
  const weights=pool.map(reference=>{
    const series=reference.series==='Ideas'?6:reference.series==='Harry Potter'?2:1
    if(!matchStyle) return series*(reference.style===options.style?2:1)*(reference.type===options.type?2:1)
    const type=reference.type===options.type?5:commercial.includes(options.type)&&commercial.includes(reference.type)?2:1
    return series*type*(compact&&reference.count<=850?2:1)
  })
  let pick=rng()*weights.reduce((sum,value)=>sum+value,0)
  return pool.find((_,index)=>(pick-=weights[index])<0)??pool.at(-1)
}

export function paletteFromReference(reference, colors, inventoryColor, fallback, sample) {
  function ranked(ids, minimum) {
    const totals={}
    for(const id of ids) {
      for(const [color,quantity] of reference.swatches[id]??[]) totals[color]=(totals[color]??0)+quantity
    }
    return Object.keys(colors).filter(color=>color!=='glass'&&totals[inventoryColor(color)]>=minimum)
      .sort((a,b)=>totals[inventoryColor(b)]-totals[inventoryColor(a)])
  }
  const bodyColors=ranked(['3001','3004','3005','3010','98283','15533','30137'],8)
  const preferred=bodyColors.filter(color=>!['black','dark','gray'].includes(color))
  const choices=preferred.length?preferred:bodyColors
  const profile=profiles[reference.profile]
  const material=profile.wall==='log'?['brown','darkTan','tan','orange']:reference.profile==='crooked'?['brown','darkTan','darkRed','tan']:null
  const filtered=material?choices.filter(color=>material.includes(color)):choices
  const wall=filtered[Math.min(sample,filtered.length-1)]??material?.[sample]??fallback[0]
  const trim=wall===fallback[1]?wall==='white'?'gray':'white':fallback[1]
  const frame=wall===fallback[2]?wall==='black'?'white':'black':fallback[2]
  const slopes=ranked(['3039','3037','3040b','3298','3043','85984','54200'],6)
  const roof=profile.roof===0?fallback[3]:slopes[0]??(profile.front==='deck'?'brown':fallback[3])
  return [wall,trim,frame,roof]
}

export function frontExtension({profile, design, bounds, entrance, put, add, deck, step, trim, frame, roofColor}) {
  const {x0,x1,z0}=bounds
  if(z0<4) return
  const wide=x1-x0>=14
  const span=wide&&['deck','greenhouse','portico'].includes(profile.front)?10:6
  const z=z0-3
  const kind=profile.front
  const center=Math.floor((x0+x1-span)/2)
  const coversDoor=['porch','portico','canopy'].includes(kind)
  const desired=coversDoor?entrance-Math.floor((span-4)/2):center+(design.layout===0?0:2)
  const x=Math.max(x0,Math.min(x1-span,desired))
  const labels={deck:'Соберите настил и ограду',porch:'Соберите крытое крыльцо',portico:'Соберите арочный портик',glass:'Соберите панорамную витрину',greenhouse:'Соберите остеклённую галерею',canopy:'Соберите остановку с навесом'}
  step(labels[kind])
  deck(x,3,z,span,2,kind==='deck'||kind==='porch'?'brown':trim)
  if(kind==='deck') {
    add(design.form%2===0?'3633':'15332',x,4,z,frame)
    if(span>=10) add('3633',x+span-4,4,z,frame)
    const rail=['15207','14718','6005'][design.form%3]
    add(rail,x+2,4,z+1,'brown')
    return
  }
  // Return walls are two studs deep so that the canopy can bridge between them.
  const height=kind==='greenhouse'?15:kind==='glass'?9:12
  let y=4
  if(kind==='glass'||kind==='greenhouse') {
    const panel=kind==='greenhouse'?'59349':'87544'
    add('87544',x,y,z,'glass',90)
    add('87544',x+span-1,y,z,'glass',90)
    if(kind==='greenhouse') {
      for(const end of [x,x+span-1]) {
        put('brick',end,y+9,z,1,2,trim)
        put('brick',end,y+12,z,1,2,trim)
      }
      if(span>=10) add(panel,x+2,y,z,'glass')
    } else {
      add('60581',x+1,y,z,'glass')
    }
  } else {
    for(let level=0;level<height;level+=3) {
      put('brick',x,y+level,z,1,2,trim)
      put('brick',x+span-1,y+level,z,1,2,trim)
      if(kind==='portico'&&span===10) {
        put('brick',x+3,y+level,z,4,1,trim)
      }
      if(kind==='portico'&&span===6&&design.form%2===0) {
        put('brick',x+1,y+level,z,1,1,trim)
        put('brick',x+4,y+level,z,1,1,trim)
      }
    }
  }
  y+=height
  if(kind==='portico') {
    for(let offset=0;offset<span;offset+=span===6?6:5) {
      if(span===10) {
        add('6182',x+(offset===0?0:6),y,z,trim)
        put('brick',x+offset+(offset===0?4:0),y,z,1,1,trim)
        put('brick',x+offset+(offset===0?4:0),y+3,z,1,1,trim)
    } else if(design.form%2===0) {
      add('80543',x+1,y,z,trim)
      put('brick',x,y,z,1,1,trim)
      put('brick',x+5,y,z,1,1,trim)
      put('tile',x,y+3,z,1,1,roofColor)
      put('tile',x+5,y+3,z,1,1,roofColor)
    } else add('92950',x,y,z,trim)
    }
    // Each lintel spans the porch. The cap runs along the front edge.
    if(span===6) {
      if(design.form%2===0) put('tile',x+1,y+9,z,4,1,roofColor)
      else put('tile',x,y+3,z,6,1,roofColor)
    }
    else {
      put('plate',x,y+6,z,4,1,trim)
      put('plate',x+4,y+6,z,2,1,trim)
      put('plate',x+6,y+6,z,4,1,trim)
    }
    return
  }
  if(span===10) {
    for(let offset=0;offset<span;offset+=2) put('plate',x+offset,y,z,2,2,roofColor)
    put('plate',x,y+1,z,6,2,trim)
    put('plate',x+6,y+1,z,4,2,trim)
    return
  }
  put('plate',x,y,z,span,2,roofColor)
  if(kind==='porch') {
    for(let offset=0;offset<span;offset++) {
      if(design.form%2===0) add('11477',x+offset,y+1,z,roofColor)
      else if(offset%2===0) add('15068',x+offset,y+1,z,roofColor)
    }
  } else {
    for(let offset=0;offset<span;offset+=2) add('2412b',x+offset,y+1,z,kind==='canopy'?frame:trim)
  }
}

export function roofLandmark({profile, design, bounds, y, add, put, line, deck, step, trim, frame, wall, roofColor}) {
  const {x0,x1,z0,z1}=bounds
  const w=x1-x0,d=z1-z0
  const x=design.layout?x0+2:x1-6, z=z0+2
  const kind=profile.top
  if(kind==='chimney') {
    step('Соберите дымоход')
    for(let row=0;row<3;row++) add('98283',x,y+row*3,z,'brown')
    put('plate',x,y+9,z,2,2,roofColor)
    add('2412b',x,y+10,z,roofColor)
  } else if(kind==='garden') {
    step('Устройте террасу на крыше')
    add('15332',x0+1,y,z0+1,trim)
    if(w>=13) add('3633',x0+6,y,z0+1,frame)
    for(const [a,b] of [[x0+2,z0+3],[x1-3,z1-3],[x1-3,z0+3]]) {
      add('3062b',a,y,b,'brown')
      add('6141',a,y+3,b,'leafGreen')
      add('24866',a,y+4,b,'yellow')
    }
  } else if(kind==='lantern') {
    step('Соберите застеклённый верхний фонарь')
    const a=x0+Math.floor((w-6)/2), b=z0+Math.floor((d-4)/2)
    const glass=profile.front==='greenhouse'?'59349':'60581'
    const span=glass==='59349'?6:4, h=glass==='59349'?15:9
    const left=a+Math.floor((6-span)/2)
    add(glass,left,y,b,'glass')
    add(glass,left,y,b+3,'glass')
    for(let level=0;level<h;level+=3) {
      put('brick',left,y+level,b+1,1,2,frame)
      put('brick',left+span-1,y+level,b+1,1,2,frame)
    }
    deck(left,y+h,b,span,4,trim)
    for(let offset=0;offset<span;offset+=2) {
      add('85984',left+offset,y+h+1,b+1,roofColor)
      add('54200',left+offset,y+h+1,b+2,trim)
    }
  } else if(kind==='tower'||kind==='turret') {
    step(kind==='tower'?'Соберите башню с окнами':'Соберите смещённую башенку')
    deck(x,y,z,4,4,trim)
    const extraRows=(kind==='tower'?3:2)+(design.form%3)
    for(let row=0;row<extraRows;row++) {
      const level=y+1+row*3
      put('brick',x,level,z,4,2,row===0?trim:wall)
      put('brick',x,level,z+2,4,2,row===0?trim:wall)
    }
    const a=y+1+extraRows*3
    put('brick',x,a,z,4,1,wall)
    put('brick',x,a,z+3,4,1,wall)
    for(let row=1;row<=2;row++) {
      put('brick',x,a+3*row,z,1,1,trim)
      put('brick',x+3,a+3*row,z,1,1,trim)
      put('brick',x,a+3*row,z+3,1,1,trim)
      put('brick',x+3,a+3*row,z+3,1,1,trim)
    }
    for(const edge of [z,z+3]) {
      const mount=add('60592',x+1,a+3,edge,frame)
      add('60601',x+1,a+3,edge,'glass',0,mount)
    }
    for(let row=0;row<3;row++) {
      put('brick',x,a+row*3,z+1,1,2,wall)
      put('brick',x+3,a+row*3,z+1,1,2,wall)
    }
    deck(x,a+9,z,4,4,trim)
    deck(x,a+10,z,4,4,roofColor,'plate',1)
    for(let i=0;i<4;i+=2) {
      add('3039',x+i,a+11,z,roofColor)
      add('3039',x+i,a+11,z+2,roofColor,180)
      add('3043',x+i,a+14,z+1,roofColor)
    }
  } else if(kind==='canopy') {
    step('Добавьте технические панели на крыше')
    put('brick',x,y,z,4,2,trim)
    add('3298',x,y+3,z,roofColor,180)
    add('3298',x+2,y+3,z,roofColor,180)
  }
}
