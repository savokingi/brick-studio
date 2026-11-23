const box=(x0,z0,x1,z1)=>({x0,z0,x1,z1})

function cap(a,b,y,color) {
  a.deck(b,y,color)
  a.deck(b,y+1,color,true)
}

function chimney(a,x,y,z,trim,rotation=0) {
  a.step('Соберите кирпичную трубу с карнизом')
  for(let row=0;row<3;row++) a.add('98283',x,y+row*3,z,'brown',rotation)
  a.add('35480',x,y+9,z,trim,rotation)
  for(let i=0;i<2;i++) a.add('3062b',x+(rotation?0:i),y+10,z+(rotation?i:0),'dark')
}

function shingledGable(a,b,y,palette,across,open=false) {
  const {x0,x1,z0,z1}=b
  const [wallColor,trim,frame]=palette
  const run=across?x1-x0:z1-z0,span=across?z1-z0:x1-x0
  let inset=0
  for(let course=0;run-inset*2>=7;course++,inset+=2,y+=6) {
    const far=run-inset-1
    a.step('Соберите опоры под черепицу · ряд '+(course+1))
    for(const height of [y,y+3]) {
      if(open) {
        const outer=inset+Number(course!==0)
        if(run-(inset+2)*2<7) {
          for(let s=0;s<span;s++) a.strip('brick',x0+(across?outer:s),height,z0+(across?s:outer),
            run-2*outer,trim,!across,height>y)
          continue
        }
        const railWidth=Math.min(course===0?4:3,Math.floor((run-outer*2)/2))
        for(const edge of [outer,run-outer-railWidth]) for(let s=0;s<span;) {
          const length=s===0&&height>y?1:Math.min(2,span-s)
          a.put('brick',x0+(across?edge:s),height,z0+(across?s:edge),
            across?railWidth:length,across?length:railWidth,trim)
          s+=length
        }
        const start=outer+railWidth
        for(const s of [0,span-1]) a.strip('brick',x0+(across?start:s),height,z0+(across?s:start),run-2*start,wallColor,!across)
        continue
      }
      for(const edge of [inset+1,far-1]) {
        a.strip('brick',x0+(across?edge:0),height,z0+(across?0:edge),span,trim,across,course%2===1)
      }
      for(let s=0;s<span;s++) {
        if(s%2===1&&s!==span-1) continue
        const length=far-inset-3
        a.strip('brick',x0+(across?inset+2:s),height,z0+(across?s:inset+2),length,'dark',!across)
      }
    }
    a.step('Уложите черепицу со смещением швов')
    for(let s=0;s<span;) {
      const width=(course%2===1&&s===0)||s+2>span?1:2
      const shade=course===0&&s%9===2?'sandGreen':['blue','royalBlue','blue','black'][(course+Math.floor(s/2)*3)%4]
      for(const [edge,rotation] of [[inset,across?90:0],[far-2,across?270:180]]) {
        const x=x0+(across?edge:s),z=z0+(across?s:edge)
        if(width===2) a.add('22385',x,y+6,z,shade,rotation)
        else a.put('tile',x,y+6,z,across?3:1,across?1:3,shade)
      }
      s+=width
    }
  }
  const ridge=across?box(x0+inset+1,z0,x1-inset-1,z1):box(x0,z0+inset+1,x1,z1-inset-1)
  a.step('Свяжите скаты пластинами конька')
  cap(a,ridge,y,frame)
  return across?{x:ridge.x0,z:z1-2,y:y+2,rotation:90}:{x:x1-2,z:ridge.z0,y:y+2}
}

function hip(a,b,y,palette) {
  const [,,frame,roof]=palette
  let {x0,z0,x1,z1}=b
  for(let row=0;x1-x0>=5&&z1-z0>=5;row++,y+=3) {
    a.step('Соберите скаты и угловые скосы · ряд '+(row+1))
    a.add('3045',x0,y,z0,roof,270)
    a.add('3045',x1-2,y,z0,roof,180)
    a.add('3045',x0,y,z1-2,roof)
    a.add('3045',x1-2,y,z1-2,roof,90)
    const line=(start,end,place)=>{
      for(let position=start;position<end;) {
        const length=end-position>=4?4:end-position>=2?2:1
        place(length===4?'3037':length===2?'3039':'3040b',position)
        position+=length
      }
    }
    line(x0+2,x1-2,(id,x)=>{
      a.add(id,x,y,z0,roof)
      a.add(id,x,y,z1-2,roof,180)
    })
    line(z0+2,z1-2,(id,z)=>{
      a.add(id,x0,y,z,roof,90)
      a.add(id,x1-2,y,z,roof,270)
    })
    x0++;z0++;x1--;z1--
  }
  a.step('Свяжите четыре ската коньком')
  const across=x1-x0<=z1-z0
  for(let s=across?z0:x0;s<(across?z1:x1);s++) {
    if(across) a.put('plate',x0,y,s,x1-x0,1,roof)
    else a.put('plate',s,y,z0,1,z1-z0,roof)
  }
  a.deck(box(x0,z0,x1,z1),y+1,roof,true)
  a.strip('tile',x0,y+2,z0+Math.floor((z1-z0)/2),x1-x0,frame)
  return {x:x0,z:z1-1,y:y+2}
}

function shed(a,b,y,palette) {
  const {x0,x1,z0,z1}=b
  const [wall,trim,,roof]=palette
  const runs=[]
  for(let z=z0;z<z1;) {
    const depth=Math.min(z1-z,3)
    runs.push({z,depth})
    z+=depth
  }
  a.step('Соберите разновысокие опоры односкатной крыши')
  for(const [row,{z,depth}] of runs.entries()) {
    for(let level=0;level<Math.min(row,7);level++) {
      const beam=y+level*3
      a.strip('brick',x0,beam,z+depth-1,x1-x0,wall)
      for(const x of [x0,x1-1]) a.strip('brick',x,beam,z,depth-1,trim,true)
    }
  }
  a.step('Уложите скосы 33° в одном направлении')
  for(const [row,{z,depth}] of runs.entries()) {
    const surface=y+Math.min(row,7)*3
    if(row>7||depth===1) {
      for(let x=x0;x<x1;x++) a.put('plate',x,surface,z,1,depth,roof)
      continue
    }
    for(let x=x0;x<x1;) {
      if(depth===3&&x+1<x1) {a.add('3298',x,surface,z,roof);x+=2}
      else {
        a.add('3040b',x,surface,z,roof)
        if(depth===3) a.put('brick',x,surface,z+2,1,1,roof)
        x++
      }
    }
  }
}

function terrace(a,b,y,palette,detail) {
  const {x0,x1,z0,z1}=b
  const [,trim,frame,,accent]=palette
  a.step('Выложите дорожку и поставьте ограждение крыши')
  const fence=detail==='planters'?'19121':'3185'
  for(const z of [z0,z1-1]) {
    for(let x=x0;x<x1;) {
      if(x+4<=x1) {a.add(fence,x,y,z,frame);x+=4}
      else {a.add('3062b',x,y,z,trim);x++}
    }
  }
  if(a.clearLedge) {
    for(const x of [x0,x1-1]) for(let z=z0+1;z<z1-1;) {
      if(z+4<=z1-1) {a.add(fence,x,y,z,frame,90);z+=4}
      else {a.add('3062b',x,y,z,trim);z++}
    }
  }
  if(x1-x0<6||z1-z0<6) return
  a.strip('tile',x0+1,y,z0+2,x1-x0-2,trim)
  if(detail==='chimney') {
    chimney(a,x1-3,y,z1-2,trim)
  } else if(detail==='planters') {
    a.step('Соберите кадки с цветами на крыше')
    for(const x of [x0+1,x1-3]) {
      a.add('92947',x,y,z1-3,'brown')
      a.add('4032a',x,y+3,z1-3,'darkTan')
      a.add('32607',x,y+4,z1-3,'leafGreen',180)
      a.add('24866',x,y+5,z1-3,accent)
    }
  } else {
    a.put('brick',x0+2,y,z1-3,2,2,'gray')
    a.add('2412b',x0+2,y+3,z1-3,frame)
  }
}

function lightDeck(a,b,y,color) {
  const w=b.x1-b.x0,d=b.z1-b.z0
  a.step('Перевяжите рамку и прозрачные пластины фонаря')
  for(const layer of [0,1]) for(let z=0;z<d;) {
    const dz=Math.min(layer&&z===0?1:2,d-z)
    for(let x=0;x<w;) {
      const dx=Math.min(layer&&x===0?1:2,w-x)
      const glass=x>=2&&x+dx<=w-2&&z>=2&&z+dz<=d-2
      a.put('plate',b.x0+x,y+layer,b.z0+z,dx,dz,glass?'glass':color)
      x+=dx
    }
    z+=dz
  }
}

function clerestory(a,b,y,palette,tall,glazed) {
  const {x0,x1,z0,z1}=b
  const [wall,trim,frame,roof,accent,glazing]=palette
  const rows=tall?2:1
  a.step(tall?'Соберите узкую надстройку над террасой':'Установите рамы светового фонаря')
  for(let row=0;row<rows;row++) {
    const height=y+row*6
    for(const z of [z0,z1-1]) {
      a.put('brick',x0,height,z,1,1,frame)
      a.put('brick',x0,height+3,z,1,1,frame)
      for(let x=x0+1;x<x1-1;) {
        if(x+2<x1) {a.add('87552',x,height,z,glazed?glazing:'glass');x+=2}
        else {
          a.put('brick',x,height,z,1,1,wall)
          a.put('brick',x,height+3,z,1,1,wall)
          x++
        }
      }
      a.put('brick',x1-1,height,z,1,1,frame)
      a.put('brick',x1-1,height+3,z,1,1,frame)
    }
    for(const x of [x0,x1-1]) {
      a.strip('brick',x,height,z0+1,z1-z0-2,wall,true,row>0)
      a.strip('brick',x,height+3,z0+1,z1-z0-2,trim,true,true)
    }
  }
  const top=y+rows*6
  a.step('Перевяжите крышу надстройки поперечными пластинами')
  for(let x=x0;x<x1;x++) {
    a.put('plate',x,top,z0,1,z1-z0,glazed&&x>x0&&x<x1-1?'glass':roof)
  }
  for(let z=z0;z<z1;z++) {
    a.strip('plate',x0,top+1,z,x1-x0,glazed&&z>z0&&z<z1-1?'glass':roof)
  }
  return {x:x1-3,z:z1-2,y:y+rows*6+2,color:accent}
}

export function roofForBounds(kind,{x0,x1,z0,z1}) {
  const w=x1-x0,d=z1-z0
  if(Math.min(w,d)<5) return 'gable'
  if(kind==='split'&&w<12&&d<12) return 'gable'
  if(['lantern','monitor','setback'].includes(kind)&&Math.min(w,d)<8) return kind==='lantern'?'monitor':'shed'
  return kind
}

export function roofBays(house) {
  const {bounds:b,roof:kind,recipe}=house
  const {x0,x1,z0,z1}=b
  const shortSpan=x1-x0<=z1-z0
  const shingled=recipe.key==='blacksmith'
  if(kind==='split') {
    const splitX=x1-x0>=12&&(!shingled||z1-z0<12||x1-x0>z1-z0)
    const ratio=shingled?0.64:0.55
    const middle=splitX?x0+Math.ceil((x1-x0)*ratio):z0+Math.ceil((z1-z0)*ratio)
    const a=splitX?box(x0,z0,middle,z1):box(x0,z0,x1,middle)
    const b=splitX?box(middle,z0,x1,z1):box(x0,middle,x1,z1)
    return [{box:a,across:splitX,steep:true,shingled:shingled&&(splitX?a.x1-a.x0:a.z1-a.z0)>=7},
      {box:b,across:!splitX,steep:false}]
  }
  if(kind==='gable'||kind==='snow') return [{box:b,across:kind!=='snow'&&shortSpan,steep:true,
    shingled:shingled&&kind==='gable'&&Math.min(x1-x0,z1-z0)>=7}]
  return []
}

function rim(a,b,y,color) {
  const {x0,x1,z0,z1}=b,w=x1-x0,d=z1-z0
  for(const x of [x0,x1-1]) a.strip('plate',x,y,z0,d,color,true)
  for(const z of [z0,z1-1]) a.strip('plate',x0+1,y,z,w-2,color)
  for(const z of [z0,z1-1]) a.strip('plate',x0,y+1,z,w,color,false,true)
  for(const x of [x0,x1-1]) a.strip('plate',x,y+1,z0+1,d-2,color,true,true)
}

function mansard(a,b,y,palette,detail) {
  const {x0,x1,z0,z1}=b
  const [wall,trim,frame,roof]=palette,w=x1-x0
  const starts=w>=17?[x0+2,x1-8]:[x0+Math.floor((w-6)/2)]
  a.step('Соберите крутые скаты с проёмами для люкарн')
  for(const z of [z0,z1-2]) for(let x=x0;x<x1;) {
    if(z===z0&&starts.includes(x)) {x+=6;continue}
    const wide=x+1<x1&&(z!==z0||!starts.includes(x+1))
    a.add(wide?'3678b':'60481',x,y,z,roof,z===z0?0:180)
    x+=wide?2:1
  }
  for(const dy of [0,3]) {
    for(const x of starts) a.strip('brick',x,y+dy,z0+1,6,wall)
    for(let z=z0+2;z<z1-2;z++) {
      if((z-z0)%2===0) a.strip('brick',x0,y+dy,z,w,wall,false,dy>0)
      else for(const x of [x0,x1-1]) a.put('brick',x,y+dy,z,1,1,wall)
    }
  }
  a.step('Остеклите парные слуховые окна и свяжите их аркой')
  for(const x of starts) {
    for(const dx of [0,5]) for(const dy of [0,3,6]) a.put('brick',x+dx,y+dy,z0,1,1,trim)
    for(const dx of [1,3]) {
      const mount=a.add('30044',x+dx,y,z0,frame)
      a.add('30046',x+dx,y,z0,'white',0,mount)
    }
    a.add('3455',x,y+9,z0,trim)
    a.put('plate',x,y+12,z0,6,2,trim)
    a.put('tile',x,y+13,z0,4,2,roof)
    a.put('tile',x+4,y+13,z0,2,2,roof)
  }
  a.step('Перевяжите верх мансарды и уложите кровельные плитки')
  const top=box(x0,z0+1,x1,z1-1)
  cap(a,top,y+6,roof)
  // The gentler upper pitch starts at the high studs of the steep eaves.
  for(const z of [top.z0,top.z1-3]) for(let x=x0;x<x1;) {
    if(x+2<=x1) {
      a.add('3298',x,y+8,z,roof,z===top.z0?0:180)
      x+=2
    } else {
      const front=z===top.z0
      a.add('3040b',x,y+8,z+Number(!front),roof,front?0:180)
      a.put('brick',x,y+8,z+(front?2:0),1,1,roof)
      x++
    }
  }
  for(let z=top.z0+3;z<top.z1-3;z++) a.strip('brick',x0,y+8,z,w,roof)
  const ridge=box(x0,top.z0+2,x1,top.z1-2)
  a.deck(ridge,y+11,roof)
  if(detail==='chimney') chimney(a,x1-3,y+12,ridge.z1-1,trim)
  for(let z=ridge.z0;z<ridge.z1;z++) {
    const end=detail==='chimney'&&z===ridge.z1-1?x1-3:x1
    a.strip('tile',x0,y+12,z,end-x0,roof,false,z%2===0)
    if(end<x1) a.put('tile',x1-1,y+12,z,1,1,roof)
  }
}

export function buildReferenceRoof(a,house,y,palette,design,gable) {
  const b=house.bounds
  const {x0,x1,z0,z1}=b
  const [wall,trim,frame,roof]=palette
  const {detail}=house.recipe
  const kind=house.roof
  const open=Boolean(house.attic)
  const bays=roofBays(house)
  const hasEaves=house.eaves!==false&&['hip','gable','split','snow'].includes(kind)&&z0>0
  const decking=hasEaves?box(x0,z0-1,x1,z1):b
  a.step(open?'Соберите открытый каркас съёмной крыши':'Соберите основание съёмной крыши')
  if(open) {
    rim(a,bays[0]?.box??b,y,trim)
  } else if(kind==='lantern') lightDeck(a,b,y,trim)
  else cap(a,decking,y,hasEaves?trim:roof)
  y+=2
  let peak
  if(kind==='mansard') {
    mansard(a,b,y,palette,detail)
  } else if(kind==='hip') {
    peak=hip(a,b,y,palette)
  } else if(kind==='split') {
    const [primary,secondary]=bays
    a.step('Разметьте две крыши с коньками в разных направлениях')
    peak=primary.shingled?shingledGable(a,primary.box,y,palette,primary.across,open)
      :gable(a,primary.box,y,palette,{across:primary.across,steep:true,finish:'ridge',open})
    if(open) {
      if(peak&&detail==='chimney') chimney(a,peak.x,peak.y,peak.z,trim,peak.rotation)
      peak=null
      a.addModule(house.id+'-roof-secondary','Второй скатный объём',y-2)
      a.step('Соберите основание второй съёмной крыши')
      cap(a,secondary.box,y-2,trim)
    }
    gable(a,secondary.box,y,[trim,wall,frame,roof],{across:secondary.across,finish:'ridge'})
  } else if(kind==='gable'||kind==='snow') {
    const [bay]=bays
    if(bay.shingled) peak=shingledGable(a,b,y,palette,bay.across,open)
    else peak=gable(a,b,y,palette,{across:bay.across,steep:true,finish:kind==='snow'?'snow':'ridge',
      alternating:house.recipe.facade==='timber'||house.recipe.facade==='logs',offset:design.form,open})
  } else if(kind==='shed') {
    shed(a,b,y,palette)
  } else if(kind==='lantern'||kind==='monitor'||kind==='setback') {
    const w=x1-x0,d=z1-z0
    const startX=kind==='setback'&&design.layout===1?x0+Math.floor(w/3):x0+1
    const endX=kind==='setback'&&design.layout===0?x1-Math.floor(w/3):x1-1
    const startZ=z0+Math.max(1,Math.floor(d*(kind==='setback'?0.46:0.32)))
    const depth=[8,6,4,3,2].find(size=>size<=Math.min(z1-1-startZ,kind==='setback'?8:4))
    const endZ=startZ+depth
    peak=clerestory(a,box(startX,startZ,endX,endZ),y,palette,kind==='setback',kind!=='setback')
    if(kind==='setback'&&w>=8) terrace(a,box(x0,z0,x1,startZ),y,palette,detail==='chimney'?'frame':detail)
  } else {
    terrace(a,b,y,palette,detail)
  }
  if(peak&&detail==='chimney') chimney(a,peak.x,peak.y,peak.z,trim,peak.rotation)
  if(design.exteriorDetail&&['terrace','flat','lantern','monitor','setback'].includes(kind)) {
    a.step('Замостите кровлю вокруг ограждений и светового фонаря')
    for(let z=z0;z<z1;z++) for(let x=x0;x<x1;) {
      if(!a.exposedStud(x,y,z)) {x++;continue}
      const glazed=kind==='lantern'&&z>=z0+2&&z<z1-2&&x>=x0+2&&x<x1-2
      const end=kind==='lantern'&&x<x0+2?x0+2:glazed?x1-2:x1
      const span=[4,3,2,1].find(n=>x+n<=end&&Array.from({length:n},(_,dx)=>a.exposedStud(x+dx,y,z)).every(Boolean))
      a.put('tile',x,y,z,span,1,glazed?'glass':kind==='terrace'?'darkTan':roof)
      x+=span
    }
  }
}
