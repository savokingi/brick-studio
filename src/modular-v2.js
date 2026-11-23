import { build as legacyBuild, editVariant as legacyEdit } from './legacy-generator.js'
import { catalog, colors, sizeId, inventoryColor } from './catalog.js'
import availability from './availability.json' with {type:'json'}
export { colors }
export const types = { bakery:'Пекарня', cafe:'Кафе', flowers:'Цветочный магазин', book:'Книжный магазин', home:'Жилой дом' }
export const styles = { old:'Европейская классика', modern:'Городской модерн', coastal:'Приморский город' }
const palettes = {
  old: [['tan','white','green','dark'],['darkRed','tan','black','dark'],['olive','white','brown','dark'],['sandGreen','white','green','dark'],['orange','tan','brown','dark'],['lightBlue','white','black','dark']],
  modern: [['white','gray','black','dark'],['tan','dark','black','dark'],['dark','gray','black','black'],['gray','white','blue','dark'],['darkRed','darkTan','black','dark'],['olive','gray','black','dark']],
  coastal: [['white','tan','blue','dark'],['sandGreen','white','green','dark'],['lightBlue','white','blue','dark'],['tan','white','green','brown'],['white','gray','blue','dark'],['orange','white','green','dark']]
}
export function random(seed) {
  return () => {
    seed=(seed+0x6d2b79f5)|0
    let t=Math.imul(seed^seed>>>15,1|seed)
    t^=t+Math.imul(t^t>>>7,61|t)
    return ((t^t>>>14)>>>0)/4294967296
  }
}
export function normalize(options) {
  const dimension=value=>Math.min(32,Math.max(12,Math.round(Number(value)||24)))
  const width=dimension(options.width), depth=dimension(options.depth)
  return { width, depth, type:Object.hasOwn(types,options.type)?options.type:'bakery',
    style:Object.hasOwn(styles,options.style)?options.style:'old', mode:options.mode==='solo'?'solo':'city',
    floors:Math.min(width<16||depth<18?1:2,Math.max(1,Number(options.floors)||2)) }
}
export function parameters(options,seed) {
  const rng=random(seed), roll=n=>Math.floor(rng()*n)
  return { palette:roll(6), entry:roll(2), roof:roll(3), cornice:roll(3),
    masonry:roll(3), window:roll(2), layout:roll(2), tables:1+roll(3),
    awning:roll(3), garden:roll(3), setback:options.depth>=24?roll(2):0,
    footprint:options.width>=24?roll(2):0, paving:roll(3), shelves:roll(3) }
}
export function newVariant(options, history=[], nextSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0]) {
  const recent=history.filter(v=>v.version===2)
  const seen=new Set(recent.map(v=>v.signature))
  const keys=['palette','entry','roof','cornice','masonry','window','layout','awning','garden','setback','footprint']
  let best, distance=-1
  for(let i=0;i<512;i++) {
    const seed=nextSeed(), design=parameters(options,seed), signature=Object.values(design).join(',')
    if(seen.has(signature)) continue
    const score=Math.min(keys.length,...recent.slice(-6).map(v=>keys.filter(k=>v.design[k]!==design[k]).length))
    if(score>distance) { best={version:2,seed,design,signature}; distance=score }
    if(score>=5) return best
  }
  if(best) return best
  throw new Error('Попробуйте изменить настройки постройки.')
}

function checkConnections(parts,joins,modules) {
  const parents=parts.map((_,index)=>index)
  const supported=new Set()
  function root(index) {
    while(parents[index]!==index) {
      parents[index]=parents[parents[index]]
      index=parents[index]
    }
    return index
  }
  for(const [support,child] of joins) {
    supported.add(child)
    if(parts[support].module===parts[child].module) parents[root(support)]=root(child)
  }
  for(const module of modules) {
    const indices=parts.flatMap((part,index)=>part.module===module.id?[index]:[])
    if(new Set(indices.map(root)).size!==1) throw new Error('Модуль содержит разъединённые детали')
    for(const index of indices) {
      const part=parts[index]
      if(!supported.has(index)&&part.y!==0&&part.y!==module.base) throw new Error('У детали отсутствует опора')
    }
  }
}

export function build(rawOptions,variant) {
  if(variant.version!==2) {
    const legacy=legacyBuild(rawOptions,variant)
    return {...legacy,options:{...legacy.options,floors:1},parts:legacy.parts.map(p=>({
      ...p,rotation:p.w<p.d?90:0,floor:p.layer==='roof'?1:0,module:p.layer==='roof'?'roof':'ground'
    }))}
  }
  const options=normalize(rawOptions)
  const {width,depth,floors,type,style,mode}=options, {design}=variant
  const [wall,trim,frame,roofColor]=palettes[style][design.palette]
  const x0=1, x1=width-1-(design.footprint?2:0), z0=mode==='city'?4:2, z1=depth-1-(design.setback?2:0)
  const W=x1-x0, D=z1-z0, groundY=3, story=32
  const parts=[], steps=[], modules=[], occupied=new Map(), tops=new Map(), joins=[]
  let module='ground', section='Основание', currentFloor=0
  const key=(x,y,z)=>[x,y,z].join(',')
  function step(title) { steps.push({title,start:parts.length,module,section}) }
  function add(id,x,y,z,color,rotation=0,mount=null) {
    const spec=catalog[id]
    if(!spec || !colors[color]) throw new Error('Неизвестная деталь '+id+'/'+color)
    const swapped=rotation%180!==0
    const w=swapped?spec.d:spec.w, d=swapped?spec.w:spec.d, h=spec.h
    const part={id,x,y,z,w,d,h,color,rotation,kind:spec.kind,size:spec.w+'x'+spec.d,layer:module,module,floor:currentFloor,mount}
    const index=parts.length
    if(x<0||z<0||x+w>width||z+d>depth) throw new Error('Деталь вне участка '+id)
    const contacts=new Set()
    if(mount!==null) {
      if(!parts[mount]) throw new Error('Отсутствует крепление')
      contacts.add(mount)
    } else {
      for(let a=x;a<x+w;a++) for(let b=z;b<z+d;b++) {
        const contact=tops.get(key(a,y,b))
        if(contact!==undefined) contacts.add(contact)
        for(let dy=0;dy<h;dy++) {
          const k=key(a,y+dy,b)
          if(occupied.has(k)) throw new Error('Пересечение '+id+' at '+k+' with '+parts[occupied.get(k)].id)
          occupied.set(k,index)
        }
        const slopeStud=spec.kind!=='slope'||(rotation===180?b===z:b===z+d-1)
        if(spec.studs&&slopeStud) tops.set(key(a,y+h,b),index)
      }
    }
    parts.push(part)
    for(const contact of contacts) joins.push([contact,index])
    return index
  }
  function put(kind,x,y,z,w,d,color) {
    const id=sizeId(kind,w,d)
    if(!id) throw new Error('Размер вне каталога '+kind+' '+w+'x'+d)
    return add(id,x,y,z,color,w<d?90:0)
  }
  function line(kind,x,y,z,length,color,vertical=false,stagger=0,texture=false) {
    let offset=0
    const order=stagger%2?[3,4,2,1]:[4,2,3,1]
    while(offset<length) {
      const lengths=kind==='plate'&&vertical
        ? (stagger%2&&offset===0?[3,2,1]:[8,6,4,3,2,1])
        : order
      let n=lengths.find(n=>n<=length-offset && sizeId(kind,1,n))
      if(texture && n>=2) n=2
      const facadeColumn=kind==='brick'&&!vertical&&z===z0&&n===1&&(x+offset===x0||x+offset===x1-1)
      if(facadeColumn && style!=='modern') add('3062b',x+offset,y,z,trim)
      else if(texture && n===2) add('98283',x+(vertical?0:offset),y,z+(vertical?offset:0),color,vertical?90:0)
      else put(kind,x+(vertical?0:offset),y,z+(vertical?offset:0),vertical?1:n,vertical?n:1,color)
      offset+=n
    }
  }
  function deck(x,y,z,w,d,color,kind='plate',stagger=0) {
    for(let b=0;b<d;) {
      const rows=stagger&&b===0?1:Math.min(2,d-b)
      let a=0
      while(a<w) {
        const n=w-a===5?3:Math.min(a===0&&stagger?3:4,w-a)
        put(kind,x+a,y,z+b,n,rows,color)
        a+=n
      }
      b+=rows
    }
  }
  function rim(y,color,kind='plate',overhang=false) {
    const a=x0-(overhang?1:0), b=x1+(overhang?1:0), c=z0-(overhang?1:0), d=z1+(overhang?1:0)
    if(overhang) {
      deck(a,y,c,b-a,2,color,kind)
      deck(a,y,d-2,b-a,2,color,kind)
      deck(a,y,c+2,2,d-c-4,color,kind)
      deck(b-2,y,c+2,2,d-c-4,color,kind)
      return
    }
    line(kind,a,y,c,b-a,color)
    line(kind,a,y,d-1,b-a,color)
    line(kind,a,y,c+1,d-c-2,color,true,1)
    line(kind,b-1,y,c+1,d-c-2,color,true,1)
  }
  function roundStack(x,y,z,height,color) {
    for(let n=0;n<height;n++) add('3062b',x,y+3*n,z,color)
  }
  function planter(x,y,z,length=2) {
    put('plate',x,y,z,length,1,'brown')
    for(let i=0;i<length;i++) {
      add('6141',x+i,y+1,z,'leafGreen')
      add('24866',x+i,y+2,z,design.garden===0?'pink':'yellow')
    }
  }
  function furniture(y,upper=false) {
    section=upper?'Интерьер верхнего этажа':'Интерьер магазина'
    if(upper || type==='home') {
      step(upper?'Соберите диван и журнальный столик':'Соберите гостиную')
      const sofaX=x0+2+design.layout
      put('plate',sofaX,y,z0+3,4,2,'dark')
      put('brick',sofaX,y+1,z0+4,4,1,frame)
      put('tile',sofaX,y+1,z0+3,4,1,frame)
      const tx=sofaX+1,tz=z0+7
      if(tz+2<z1-1) {
        add('3941',tx,y,tz,'brown')
        put('tile',tx,y+3,tz,2,2,'tan')
      }
      if(D>=14) {
        step('Добавьте письменный стол')
        put('brick',x0+2,y,z1-4,1,2,'brown')
        put('brick',x0+5,y,z1-4,1,2,'brown')
        put('plate',x0+2,y+3,z1-4,4,2,'brown')
        put('tile',x0+3,y+4,z1-4,1,2,'white')
      }
      return
    }
    step(type==='book'?'Соберите книжные стеллажи':type==='flowers'?'Соберите прилавок флориста':'Соберите рабочий прилавок')
    const cx=design.layout?x0+2:Math.max(x0+2,x1-8), cz=z1-4
    for(let i=0;i<2;i++) put('brick',cx,y+3*i,cz,4,2,'brown')
    put('plate',cx,y+6,cz,4,2,trim)
    if(type==='book') {
      for(let i=0;i<4;i++) {
        put('plate',cx+i,y+7,cz,1,1,['red','green','tan','blue'][(i+design.shelves)%4])
        put('tile',cx+i,y+8,cz,1,1,['red','green','tan','blue'][(i+design.shelves)%4])
      }
    } else if(type==='flowers') {
      planter(cx,y+7,cz,2)
      planter(cx+2,y+7,cz,2)
    } else {
      add('6141',cx,y+7,cz,'white')
      add('6141',cx,y+8,cz,'tan')
      add('6141',cx+2,y+7,cz,'white')
      add('6141',cx+2,y+8,cz,'orange')
    }
    if(D>=14&&type==='bakery') {
      step('Соберите печь для выпечки')
      const ox=x0+2,oz=z1-7
      put('brick',ox,y,oz,4,2,'dark')
      put('brick',ox,y+3,oz,4,2,'gray')
      put('tile',ox,y+6,oz,4,2,'dark')
    }
    if(D>=14&&type==='cafe') {
      step('Соберите кофейную станцию')
      const ox=x0+2,oz=z1-7
      put('brick',ox,y,oz,4,2,'brown')
      put('plate',ox,y+3,oz,4,2,'black')
      add('3941',ox,y+4,oz,'gray')
      put('tile',ox,y+7,oz,2,2,'black')
      add('6141',ox+3,y+4,oz,'white')
    }
    if(D>=12) {
      step('Соберите столики и стулья')
      const locations=[[x0+2,z0+3],[x0+6,z0+3],[x0+2,z0+7]]
      for(const [x,z] of locations.slice(0,Math.min(W<16?1:3,design.tables))) {
        if(z+2>=cz) continue
        if((type==='bakery'||type==='cafe')&&D>=14&&z+3>z1-7&&z<z1-5&&x<x0+6) continue
        add('3941',x,y,z,'brown')
        put('tile',x,y+3,z,2,2,trim)
        put('plate',x,y,z+2,2,1,frame)
        put('brick',x,y+1,z+2,2,1,frame)
        put('tile',x,y+4,z+2,2,1,frame)
      }
    }
  }

  modules.push({id:'ground',label:'Первый этаж',base:0})
  step('Соедините пластины основания')
  deck(0,0,0,width,depth,'dark')
  deck(0,1,0,width,depth,'gray','plate',1)
  step('Выложите тротуар и пол')
  const streetSockets=mode==='city'&&width>=16?[x0,x1-2,width-1]:[]
  for(let z=0;z<depth;z++) {
    if(z<z0||z>=z1) {
      const color=z===0?'dark':design.paving===1?'darkTan':design.paving===2&&z%2===0?'dark':'gray'
      if(z===z0-2&&streetSockets.length) {
        for(let x=0;x<width;x++) put(streetSockets.includes(x)?'plate':'tile',x,2,z,1,1,color)
      } else line('tile',0,2,z,width,color)
    } else {
      line('tile',0,2,z,x0,'gray')
      line('tile',x1,2,z,width-x1,'gray')
      line('plate',x0,2,z,W,'darkTan')
    }
  }
  if(streetSockets.length) {
    step('Добавьте уличные детали')
    for(const x of streetSockets.slice(0,2)) {
      add('3062b',x,3,z0-2,'brown')
      add('6141',x,6,z0-2,'leafGreen')
      add('24866',x,7,z0-2,design.garden===0?'pink':'yellow')
    }
    const lampX=streetSockets[2]
    roundStack(lampX,3,z0-2,4,'black')
    add('3062b',lampX,15,z0-2,'white')
    add('98138',lampX,18,z0-2,'black')
  }
  const bayCount=Math.max(1,Math.floor((W-1)/5)-(W>=20&&design.window===1?1:0))
  const baySpace=(W-4*bayCount)/(bayCount+1)
  const bays=Array.from({length:bayCount},(_,i)=>Math.round(x0+baySpace+i*(4+baySpace)))
  const doorBay=design.entry?bays.length-1:0
  const sideWindows=D>=12?[z0+3+(design.window?2:0)]:[]

  for(let floor=0;floor<floors;floor++) {
    currentFloor=floor
    const y=groundY+floor*story
    if(floor>0) {
      module='floor-'+floor
      modules.push({id:module,label:floor===1?'Второй этаж':'Третий этаж',base:y-2})
      section='Модуль этажа'
      step('Соберите съёмное перекрытие с проёмом лестницы')
      const stairZ=z1-11
      const stairX=x1-3
      for(let dy=0;dy<2;dy++) {
        if(dy===1) {
          for(let x=x0;x<x1;x++) {
            if(x===stairX||x===stairX+1) {
              line('plate',x,y-1,z0,stairZ-z0,'darkTan',true,x%2)
              put('plate',x,y-1,z1-1,1,1,'darkTan')
            } else line('plate',x,y-1,z0,D,'darkTan',true,x%2)
          }
        } else {
          deck(x0,y-2,z0,W,stairZ-z0,'darkTan')
          deck(x0,y-2,stairZ,stairX-x0,10,'darkTan')
          deck(x1-1,y-2,stairZ,1,10,'darkTan')
          deck(x0,y-2,z1-1,W,1,'darkTan')
        }
      }
    }
    section=floor===0?'Фасад магазина':'Жилой этаж'
    const openings=bays.map((x,i)=>({x,width:4,low:floor===0&&i===doorBay?0:2,high:floor===0?(i===doorBay?6:5):5,door:floor===0&&i===doorBay}))
    for(let row=0;row<9;row++) {
      step((floor+1)+' этаж · '+(row===0?'цоколь':row===8?'верхняя обвязка':'кладка '+(row+1)))
      const Y=y+row*3
      const rowColor=row===0?trim:wall
      const texture=style!=='modern' && (design.masonry===1?row<2:design.masonry===2&&row%3===0)
      const awning=floor===0&&type!=='home'&&design.awning!==0
      const gaps=openings.filter(o=>(row>=o.low&&row<o.high)||(!o.door&&(row===1||(row===5&&style!=='modern')))||(awning&&row===6))
      let at=x0
      for(const o of gaps) {
        line('brick',at,Y,z0,o.x-at,rowColor,false,row,texture)
        at=o.x+o.width
      }
      line('brick',at,Y,z0,x1-at,rowColor,false,row,texture)
      if(row===1) for(const o of openings.filter(o=>!o.door)) {
        line('plate',o.x,Y,z0,4,trim)
        line('plate',o.x,Y+1,z0,4,trim)
        put('plate',o.x,Y+2,z0-1,4,2,trim)
      }
      if(row===5&&style!=='modern') for(const o of openings.filter(o=>!o.door)) add('3659',o.x,Y,z0,trim)
      if(awning&&row===6) for(const o of openings) {
        put('plate',o.x,Y,z0-1,4,2,trim)
        line('plate',o.x,Y+1,z0,4,wall)
        line('plate',o.x,Y+2,z0,4,wall)
        if(design.awning===1) {
          for(let i=0;i<4;i++) add('3040b',o.x+i,Y+1,z0-2,i%2===0?'white':frame)
        } else {
          add('3039',o.x,Y+1,z0-2,frame)
          add('3039',o.x+2,Y+1,z0-2,frame)
        }
      }
      // Alternating corner ownership interlocks the front, side and rear walls.
      line('brick',x0+(row%2),Y,z1-1,W-2*(row%2),rowColor,false,row,texture)
      for(const [x,side] of [[x0,0],[x1-1,1]]) {
        const start=z0+1, end=z1-1+(row%2)
        const sideGaps=row>=2&&row<5?sideWindows:[]
        let z=start
        for(const opening of sideGaps) {
          line('brick',x,Y,z,opening-z,rowColor,true,row,texture)
          z=opening+4
        }
        line('brick',x,Y,z,end-z,rowColor,true,row,texture)
        if(row===2) {
          for(const opening of sideWindows) {
            const frameIndex=add('60594',x,Y,opening,frame,90)
            add('60603',x,Y,opening,'glass',90,frameIndex)
          }
        }
      }
      for(const o of openings) {
        if((o.door&&row===0)||(!o.door&&row===(floor===0?2:2))) {
          const frameIndex=add(o.door?'60596':'60594',o.x,Y,z0,frame)
          add(o.door?'60623':'60603',o.x,Y,z0,o.door?frame:'glass',0,frameIndex)
        }
      }
    }
    section='Детали фасада'
    step('Соберите карниз и разъём этажа')
    rim(y+27,trim,'plate',design.cornice!==0)
    rim(y+28,trim,'plate',design.cornice===2)
    for(let x=x0;x<x1;x++) for(const z of [z0,z1-1]) {
      put(x===x0+1||x===x1-2?'plate':'tile',x,y+29,z,1,1,trim)
    }
    line('tile',x0,y+29,z0+1,D-2,trim,true)
    line('tile',x1-1,y+29,z0+1,D-2,trim,true)
    furniture(y,floor>0)

    if(floor<floors-1) {
      section='Лестница'
      step('Соберите лестницу к следующему этажу')
      const stairX=x1-3, stairStart=z1-11
      for(let n=0;n<10;n++) {
        for(let level=0;level<=n;level++) {
          put('brick',stairX,y+3*level,stairStart+n,2,1,'brown')
        }
        put('plate',stairX,y+3*(n+1),stairStart+n,2,1,'brown')
        put('tile',stairX,y+3*(n+1)+1,stairStart+n,2,1,'brown')
      }
    }
  }

  currentFloor=floors
  module='roof'
  const roofY=groundY+floors*story-2
  modules.push({id:'roof',label:'Крыша',base:roofY})
  section='Крыша'
  step('Соберите основание съёмной крыши')
  deck(x0,roofY,z0,W,D,roofColor)
  deck(x0,roofY+1,z0,W,D,roofColor,'plate',1)
  if(design.roof===0) {
    step('Соберите парапет крыши')
    rim(roofY+2,trim,'brick')
    rim(roofY+5,roofColor,'tile')
    step('Добавьте вентиляцию')
    put('brick',x0+2,roofY+2,z1-4,2,2,'gray')
    put('tile',x0+2,roofY+5,z1-4,2,2,'dark')
  } else {
    const levels=Math.min(design.roof===1?6:3,Math.floor(D/2)-1)
    for(let n=0;n<levels;n++) {
      step('Соберите скаты крыши · ряд '+(n+1))
      const Y=roofY+2+n*3
      const front=z0+n, rear=z1-2-n
      for(let x=x0;x<x1;x+=2) {
        const id=x1-x>=2?'3039':'3040b'
        add(id,x,Y,front,roofColor,0)
        add(id,x,Y,rear,roofColor,180)
      }
      // Gable ends join the two roof slopes.
      if(rear>front+2) {
        line('brick',x0,Y,front+2,rear-front-2,wall,true,n)
        line('brick',x1-1,Y,front+2,rear-front-2,wall,true,n)
        // Interior ribs carry the ridge plates while leaving the attic hollow.
        for(let x=x0+1;x<x1-1;x+=3) line('brick',x,Y,front+2,rear-front-2,roofColor,true,n)
      }
    }
    step('Перекройте конёк')
    deck(x0,roofY+2+levels*3,z0+levels,W,D-2*levels,roofColor)
    line('tile',x0,roofY+3+levels*3,z0+levels,W,roofColor)
  }

  // Furniture is built with the floor before the next detachable module.
  const cleanSteps=steps.filter((s,i)=>i===steps.length-1||s.start!==steps[i+1].start)
  const usedStuds=new Set(joins.map(([support])=>support))
  parts.forEach((p,index)=>{
    const walkable=p.y===2||modules.some(m=>m.id===p.module&&m.id!=='roof'&&p.y===m.base+1)
    const tileId=p.w===8||p.d===8?undefined:sizeId('tile',p.w,p.d)
    if(walkable&&p.kind==='plate'&&!usedStuds.has(index)&&tileId) {
      p.id=tileId
      p.kind='tile'
    }
    if(!availability[p.id]?.[inventoryColor(p.color)]) {
      const target=colors[p.color][1]
      const distance=color=>{
        const value=colors[color][1]
        return [0,8,16].reduce((sum,shift)=>sum+(((target>>shift)&255)-((value>>shift)&255))**2,0)
      }
      const alternatives=Object.keys(colors).filter(c=>c!=='glass'&&availability[p.id]?.[inventoryColor(c)])
      alternatives.sort((a,b)=>distance(a)-distance(b))
      if(!alternatives.length) throw new Error('Нет доступного цвета детали '+p.id)
      p.color=alternatives[0]
    }
    p.element=availability[p.id][inventoryColor(p.color)]
  })
  const result={version:2,options,variant,parts,steps:cleanSteps,modules,joins,title:types[type],palette:{wall,trim,frame,roof:roofColor}}
  checkConnections(parts,joins,modules)
  return result
}

export function inventory(parts) {
  const grouped=new Map()
  for(const part of parts) {
    const key=part.id+'/'+part.color
    if(!grouped.has(key)) grouped.set(key,{...part,label:catalog[part.id]?.label??part.id,count:0})
    grouped.get(key).count++
  }
  return [...grouped.values()].sort((a,b)=>b.count-a.count)
}

export function editVariant(options,original,region,message) {
  if(original.version!==2) {
    const result=legacyEdit(options,original,region,message)
    return result.model?{model:build(options,result.model.variant)}:result
  }
  const design={...original.design}, words=message.toLowerCase()
  if(region==='facade') {
    if(/цвет|палитр/.test(words)) design.palette=(design.palette+1)%6
    else if(/вход|двер/.test(words)) design.entry=1-design.entry
    else if(/фактур|кирпич|кладк/.test(words)) design.masonry=(design.masonry+1)%3
    else if(/навес|маркиз/.test(words)) design.awning=(design.awning+1)%3
    else return {error:'Можно перенести вход, сменить цвет, изменить кладку или маркизу.'}
  } else if(region==='interior') {
    if(/прилав|план|перестав/.test(words)) design.layout=1-design.layout
    else if(/добав|больше/.test(words)) design.tables=Math.min(3,design.tables+1)
    else if(/убер|меньше/.test(words)) design.tables=Math.max(1,design.tables-1)
    else return {error:'Попробуйте «переставь прилавок», «добавь столик» или «убери столик».'}
  } else {
    if(/плоск/.test(words)) design.roof=0
    else if(/скат|двускат/.test(words)) design.roof=1
    else if(/мансард/.test(words)) design.roof=2
    else if(/смен|замен|друг/.test(words)) design.roof=(design.roof+1)%3
    else return {error:'Попробуйте «сделай двускатную крышу» или «сделай крышу плоской».'}
  }
  const signature=Object.values(design).join(',')
  if(signature===original.signature) return {error:'У постройки уже такой вариант.'}
  return {model:build(options,{...original,design,signature})}
}
