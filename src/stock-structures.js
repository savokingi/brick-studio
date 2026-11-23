import {catalog,colors,inventoryColor,isTransparent,sizeId} from './catalog.js'
import availability from './availability.json' with {type:'json'}
import {fitStockLayer} from './stock-builder.js'
import {buildingType} from './building-types.js'

const colorKeys=new Map(Object.keys(colors).map(color=>[inventoryColor(color),color]))
const neutral=['dark','gray','tan','darkTan','brown','black','white']
const byStyle={
  old:['mediumNougat','tan','darkTan','darkRed','sandGreen','brown','gray','white'],
  modern:['white','gray','dark','black','teal','azure','brightBlue'],
  coastal:['white','sandGreen','tan','lightBlue','blue','teal','yellow']
}
const walls=new Set(['brick','masonry','fluted','log','round','panel'])
const archIds=new Set(['3659','4490','6182','92950','15254','16577','3307'])
const tileIds=new Set(['3070b','3069b','63864','2431','6636','4162','3068b','26603','87079','2412b','4150'])
const plantIds=new Set(['32607','33291','24866','2423'])
const roofEnds=new Set(['54200','85984','11477','15068','3044b','93273'])
const slopes=new Set(['3039','3037','3040b'])
const supplies=new Set(['3899','4599a','98138','6141'])
const glazingIds={60592:'60601',60593:'60602',60594:'60603',51239:'51266'}
const titles={
  terraces:'Дом с террасой и сдвинутым верхом', arcade:'Торговая аркада',
  pavilion:'Садовый павильон с ярусной крышей', garden:'Угловой сад с оградой',
  glasshouse:'Павильон с панорамными окнами', tower:'Башня с навесом',
  gate:'Садовые ворота', landscape:'Мини-сцена с террасами',
  workshop:'Мастерская с двускатной крышей', monument:'Декоративный павильон'
}
const cell=(x,z)=>x+':'+z
const rect=(x,z,w,d)=>Array.from({length:Math.max(0,w*d)},(_,i)=>[x+i%w,z+Math.floor(i/w)])
const distinct=items=>[...new Set(items)]

function stockParts(stock) {
  return [...stock].flatMap(([key,count])=>{
    const [id,colorId]=key.split('|'), p=catalog[id],color=colorKeys.get(+colorId)
    if(!p||!color||count<=0||!availability[id]?.[colorId]) return []
    const plate=p.h===1&&p.kind==='plate'&&sizeId('plate',p.w,p.d)===id
    const block=walls.has(p.kind)&&p.studs&&p.h%3===0&&p.h<=18&&p.w<=8&&p.d<=3&&!isTransparent(color)
    const arch=archIds.has(id),tile=tileIds.has(id),plant=plantIds.has(id),ornament=roofEnds.has(id),fence=p.kind==='fence'
    const glass=p.kind==='panel'&&p.studs&&p.h>=6&&p.d===1&&isTransparent(color)
    const slope=slopes.has(id),window=Boolean(glazingIds[id]),insert=p.kind==='insert'&&isTransparent(color)
    const roundPlate=p.kind==='round'&&p.studs&&p.h===1&&p.w===2
    const supply=supplies.has(id)
    if(!plate&&!block&&!arch&&!tile&&!plant&&!ornament&&!glass&&!fence&&!slope&&!window&&!insert&&!roundPlate&&!supply) return []
    return [{id,key,color,count,plate,block,arch,tile,plant,ornament,glass,fence,slope,window,insert,roundPlate,supply,
      w:p.w,d:p.d,h:p.h,area:p.w*p.d}]
  })
}

function footprint([id,x,,z,,angle]) {
  const {w,d}=catalog[id]
  return angle%180?rect(x,z,d,w):rect(x,z,w,d)
}

function bonded(lower,upper) {
  const base=new Map(lower.flatMap((part,i)=>footprint(part).map(([x,z])=>[cell(x,z),i])))
  const clusters=lower.map((_,i)=>i)
  const root=i=>clusters[i]===i?i:root(clusters[i])
  for(const part of upper) {
    const touched=footprint(part).map(([x,z])=>base.get(cell(x,z))).filter(i=>i!==undefined)
    if(!touched.length) return false
    for(const i of touched.slice(1)) clusters[root(i)]=root(touched[0])
  }
  return clusters.every((_,i)=>root(i)===root(0))
}

function draft(entries,palette,bounds,limit,foundation=[]) {
  let remaining=new Map(entries.map(p=>[p.key,p.count]))
  for(const [id,,,,color] of foundation) {
    const key=id+'|'+inventoryColor(color)
    remaining.set(key,remaining.get(key)-1)
  }
  const groups=[]
  const lookup=(test,ordered)=>distinct(ordered).flatMap(color=>entries.filter(p=>p.color===color&&test(p)))
  const take=(test,ordered)=>lookup(test,ordered).find(p=>(remaining.get(p.key)??0)>0)
  function place(part,x,y,z,angle=0) {
    remaining.set(part.key,remaining.get(part.key)-1)
    return [part.id,x,y,z,part.color,angle]
  }
  function step(title,role,parts,{module='ground',cut=false,object}={}) {
    if(!parts.length) return
    const group={title,role,module,parts,cut,object}
    const roofIndex=module==='ground'?groups.findIndex(item=>item.module==='roof'):-1
    if(roofIndex<0) groups.push(group)
    else groups.splice(roofIndex,0,group)
  }
  function availableFloor(target,y) {
    const occupied=new Set(groups.filter(group=>group.module==='ground').flatMap(group=>group.parts
      .filter(part=>part[2]>=y).flatMap(part=>footprint(part).map(([x,z])=>cell(x,z)))))
    return target.every(([x,z])=>!occupied.has(cell(x,z)))
  }
  function fit(target,pool,y,across,stock=remaining) {
    return fitStockLayer(target,pool,stock,y,{across,limit:120})
  }
  function layer(target,kind,ordered,y,across) {
    for(const color of distinct(ordered)) {
      const parts=fit(target,lookup(kind,[color]),y,across)
      if(parts) return parts
    }
    return null
  }
  function slab(target,y,ordered,foundation=false) {
    const plates=p=>p.plate
    const bricks=p=>p.block&&p.h===3&&p.d>=2
    const choices=foundation?[plates,bricks]:[plates]
    for(const kind of choices) {
      const thickness=kind===plates?1:3
      const pools=distinct(ordered).map(color=>lookup(kind,[color]))
      if(pools.length>1) pools.push(lookup(kind,ordered))
      for(const pool of pools) for(const across of [true,false]) {
        const trial=new Map(remaining)
        const bottom=fit(target,pool,y,across,trial)
        if(!bottom) continue
        if(bottom.length===1) {
          remaining=trial
          return {parts:bottom,top:y+thickness}
        }
        for(const tie of distinct(ordered)) {
          const crossed=new Map(trial)
          const top=fit(target,lookup(plates,[tie]),y+thickness,!across,crossed)
          if(!top||!bonded(bottom,top)) continue
          remaining=crossed
          return {parts:[...bottom,...top],top:y+thickness+1}
        }
      }
    }
  }
  function stack(target,y,height,ordered) {
    const original=new Map(remaining)
    const parts=[]
    for(let left=height;left>0;) {
      const max=left-left%3
      let found, thickness=1
      for(const h of [18,15,12,9,6,3]) {
        if(h>max) continue
        found=layer(target,p=>p.block&&p.h===h,ordered,y,(parts.length%2)===0)
        if(found) {thickness=h;break}
      }
      found??=layer(target,p=>p.plate,ordered,y,(parts.length%2)===0)
      if(!found) {remaining=original;return}
      parts.push(...found)
      y+=thickness
      left-=thickness
    }
    return parts
  }
  function ridge(x,z,w,d,y,ordered) {
    const levels=d/2-1
    for(const color of distinct(ordered)) {
      const trial=new Map(remaining),courses=[]
      const pool=lookup(p=>p.slope,[color])
      const slopeArea=pool.reduce((sum,p)=>sum+(trial.get(p.key)??0)*p.area,0)
      if(slopeArea<4*w*levels) continue
      for(let inset=0;inset<levels;inset++) {
        const level=y+3*inset
        const near=fitStockLayer(rect(x,z+inset,w,2),pool,trial,level,{rotate:false,limit:90})
        const far=near&&fitStockLayer(rect(x,z+d-inset-2,w,2),pool,trial,level,{rotate:false,limit:90})
        if(!far) break
        courses.push([...near,...far.map(part=>[...part.slice(0,5),180])])
      }
      if(courses.length!==levels) continue
      const lid=fit(rect(x,z+levels,w,2),lookup(p=>p.plate,ordered),y+levels*3,true,trial)
      if(lid) {remaining=trial;return [...courses,lid]}
    }
  }
  function output(family,roof,roofY,geometry,title=titles[family]) {
    const count=groups.reduce((n,group)=>n+group.parts.length,0)
    if(count>=(['landscape','gate','garden','monument'].includes(family)?5:8)&&(!limit||count<=limit)) {
      return {bounds,roofY,roof,family,title,geometry,groups,colors:palette}
    }
  }
  return {take,place,step,slab,stack,layer,ridge,output,availableFloor}
}

function structureBounds(options,{w,d}) {
  const x=Math.floor((options.width-w)/2),z=Math.floor((options.depth-d)/2)
  return {x0:x,x1:x+w,z0:z,z1:z+d}
}

function buildVariant(entries,options,palette,{w,d},pad,family,detail) {
  const bounds=structureBounds(options,{w,d})
  const {x0:x,z0:z,x1,z1}=bounds,end=x1-1,back=z1-1
  const a=draft(entries,palette,bounds,options.partLimit,pad.parts)
  const {base,wall,roof}=palette, body=[wall,base,roof],cap=[roof,base,wall]
  a.step('Соберите основание и перевяжите швы','site',pad.parts)
  const y=pad.top
  const height=detail
  const mid=x+Math.floor(w/2)
  function wallAt(cells,h=height,title='Соберите стойки и простенки',cut=false) {
    const parts=a.stack(cells,y,h,body)
    if(!parts) return false
    a.step(title,'wall',parts,{cut})
    return true
  }
  function topAt(cells,start,title='Свяжите перекрытие поперёк швов') {
    const roofSlab=a.slab(cells,start,cap)
    if(roofSlab) a.step(title,'roof',roofSlab.parts,{module:'roof'})
    return roofSlab?.top
  }
  function decorate(px,pz,level=y) {
    const p=a.take(part=>part.tile&&part.w===1&&part.d===1,[base,roof,wall])
    if(p) a.step('Выложите отделку площадки','site',[a.place(p,px,level,pz)])
  }
  function seat(px,pz) {
    const legs=a.stack([[px,pz],[px+1,pz]],y,3,body)
    if(!legs) return
    const p=a.take(part=>part.tile&&part.w===2&&part.d===1,cap)
    a.step('Поставьте лавку на площадке','interior',
      [...legs,...(p?[a.place(p,px,y+3,pz)]:[])],{object:'Лавка'})
  }
  function plant(px,pz) {
    const p=a.take(part=>part.plant&&part.w===1&&part.d===1,['leafGreen','brightGreen','green','olive',...body])
    if(p) a.step('Высадите растения','site',[a.place(p,px,y,pz)])
  }
  function furnish(clearance) {
    if(w<8||d<6) return
    const names={
      home:['Кухонная тумба','Комод у стены'],
      cafe:['Стойка для посуды','Сервировочная станция'],
      bakery:['Стол для выпечки','Полка для ингредиентов'],
      book:['Стол для книг','Низкий книжный шкаф'],
      flowers:['Стол для букетов','Полка для горшков']
    }
    const labels=buildingType(options.type)?.stock??(family==='workshop'?['Верстак','Стеллаж для инструментов']:names[options.type])
    const positions=[[x+1,back-2,2,2],[end-2,back-2,2,2],[end-2,back-1,2,1],[x+1,z+2,2,1]]
    for(const [i,name] of labels.entries()) {
      for(const [px,pz,fw,fd] of positions) {
        const position=rect(px,pz,fw,fd)
        if(i===0&&fd!==2||!a.availableFloor(position,y)) continue
        const baseParts=a.stack(position,y,3,body)
        if(!baseParts) continue
        const surface=a.layer(position,p=>p.plate,cap,y+3,true)??[]
        const item=surface.length&&a.take(p=>p.supply&&p.w<=fw&&p.d<=fd&&p.h+4<=clearance,cap)
        a.step('Соберите предмет обстановки · '+name,'interior',
          [...baseParts,...surface,...(item?[a.place(item,px,y+4,pz)]:[])],{object:name})
        break
      }
    }
  }
  function showWindow(frame,px,pz,sill) {
    const glaze=a.take(p=>p.insert&&p.id===glazingIds[frame.id],['glass','glassBlue','glassCyan'])
    const placed=[a.place(frame,px,y+sill,pz)]
    if(glaze) placed.push([...a.place(glaze,px,y+sill,pz),'pane'])
    const foot=sill?a.stack(rect(px,pz,frame.w,1),y,sill,body):[]
    const header=a.stack(rect(px,pz,frame.w,1),y+sill+frame.h,height-sill-frame.h,cap)
    if(!foot||!header) return false
    a.step('Соберите подоконник, раму и перемычку','wall',[...foot,...placed,...header],{cut:true})
    return true
  }

  if(family==='monument') {
    const pedestalWidth=w>=6?4:2
    const center=rect(x+Math.floor((w-pedestalWidth)/2),z+Math.floor((d-2)/2),pedestalWidth,2)
    const [[px,pz]]=center
    const pedestal=a.stack(center,y,3,body)??a.stack(center,y,1,body)
    if(!pedestal) return
    a.step('Соберите пьедестал','site',pedestal)
    const last=pedestal.at(-1)
    let top=last[2]+catalog[last[0]].h
    const medallion=a.take(p=>p.roundPlate,[...cap,'white','yellow','brightGreen'])
    if(medallion) {
      a.step('Установите круглую площадку','site',[a.place(medallion,px,top,pz)])
      top++
    }
    const ledge=a.layer(center,p=>p.plate,cap,top,true)
    if(ledge) {
      a.step('Закрепите верх пьедестала','site',ledge)
      top++
    }
    const crown=a.take(p=>p.ornament&&p.w===2&&p.d===2,[...cap,'white'])
    if(crown) a.step('Завершите павильон криволинейным скосом','site',[a.place(crown,px,top,pz)])
    else if(w>=4) {
      const rear=rect(x,back,Math.min(4,w),1).filter(([cx,cz])=>!center.some(([ax,az])=>cx===ax&&cz===az))
      if(rear.length) {
        const railing=a.stack(rear,y,3,body)
        if(railing) a.step('Возведите заднюю стенку площадки','site',railing)
      }
      if(pz>z) {
        const marker=a.take(p=>p.tile&&p.w===2&&p.d===1,[...cap,'tan','gray'])
        if(marker) a.step('Выложите дорожку к пьедесталу','site',[a.place(marker,x,y,z)])
      }
    }
    return a.output(family,'garden',y,'пьедестал/'+(top-y),'Мини-сцена с пьедесталом')
  }

  if(family==='landscape') {
    const tiers=[]
    const count=Math.min(3,d-1,w-1)
    for(let inset=0;inset<count;inset++) {
      const wx=w-inset,wz=back-count+inset+1
      const band=a.layer(rect(detail%2?x:x+inset,wz,wx,count-inset),p=>p.plate,
        inset===0?[wall,base,roof]:cap,y+inset,inset%2===0)
      if(!band) break
      tiers.push(band)
    }
    if(tiers.length<2) return
    for(const [i,parts] of tiers.entries()) a.step('Уложите уступ '+(i+1),'site',parts)
    decorate(mid,z)
    return a.output(family,'garden',y,'ступени/'+tiers.length)
  }

  if(family==='garden') {
    const legs=[...rect(x,back,w,1),...rect(x,z+(d>3?1:0),1,d-(d>3?2:1))]
    if(!wallAt(legs,height,'Соберите Г-образную садовую ограду')) return
    const coping=a.layer(legs,p=>p.tile,cap,y+height,true)
    if(coping) a.step('Накройте ограду плитками','wall',coping)
    if(w>=5&&d>=4) seat(mid,z+1)
    plant(x+1,back-1)
    if(w>=7) plant(end,back-1)
    decorate(end,z)
    return a.output(family,'garden',y,'угол/'+height)
  }

  if(family==='gate'||family==='arcade') {
    const pairs=family==='arcade'?2:1
    const arch=a.take(p=>p.arch&&p.w*pairs===w&&p.d===1&&p.count>=pairs,cap)
    const piers=pairs===1?[x,end]:arch?[x,mid-1,mid,end]:[x,mid,end]
    const front=d>=4?z+1:z
    if(!wallAt(piers.map(px=>[px,front]),height,'Поднимите столбы',true)) return
    if(d>=4&&w>=5) seat(x+1,back)
    const top=y+height
    if(arch) {
      const pieces=pairs===1?[a.place(arch,x,top,front)]:[a.place(arch,x,top,front),a.place(arch,mid,top,front)]
      a.step('Установите арки на опоры','roof',pieces,{module:'roof'})
      if(pairs===2&&!topAt(rect(x,front,w,1),top+arch.h,'Свяжите арки карнизом')) return
    } else {
      const depth=pairs===2&&d>=6?3:d>=4?2:1
      const slab=topAt(rect(x,front,w,depth),top,'Соедините столбы перекрытием')
      if(!slab) return
      const trim=a.layer(rect(x+1,front,w-2,1),p=>p.tile||p.ornament,cap,slab,true)
      if(trim) a.step('Добавьте карниз над проходом','roof',trim,{module:'roof'})
    }
    return a.output(family,arch?'arcade':'terrace',top,'пролёты/'+pairs+'/'+height+'/'+Boolean(arch),
      family==='arcade'&&!arch?'Крытые торговые ряды':titles[family])
  }

  if(family==='tower') {
    const tw=w>=7?3:2,tx=end-tw+1
    const tower=rect(tx,back-1,tw,2)
    if(!wallAt(tower,height,'Соберите высокий корпус башни')) return
    if(w>=5) {seat(x,z);plant(x,back)}
    const roofY=y+height
    const slab=topAt(rect(tx-1,back-1,tw+1,2),roofY,'Установите выступающую площадку башни')
    if(!slab) return
    const top=a.stack([[end-1,back-1]],slab,3,body)
    if(top) {
      a.step('Установите надстройку на площадку','roof',top,{module:'roof'})
      const endPiece=a.take(p=>p.ornament&&p.w===1&&p.d===1,cap)
      if(endPiece) a.step('Завершите верх башни','roof',[a.place(endPiece,end-1,slab+3,back-1)],{module:'roof'})
    }
    return a.output(family,'tower',roofY,'башня/'+height)
  }

  if(family==='glasshouse') {
    const panel=a.take(p=>p.glass&&p.w<=w-2&&p.h>=6&&p.count>=2&&p.w<=d-2,
      ['glass','glassBlue','glassCyan'])
    if(!panel) return
    const glazings=[a.place(panel,x+1,y,back),a.place(panel,end,y,z+1,90)]
    if(!wallAt([[x,z],[end,z],[x,back],[end,back]],panel.h,'Соберите угловые стойки павильона')) return
    a.step('Установите панели в двух стенах','wall',glazings)
    if(d>=5&&w>=5) seat(x+1,z+1)
    const roofY=y+panel.h
    if(!topAt(rect(x,z,w,d),roofY,'Соберите лёгкое перекрытие над остеклением')) return
    furnish(panel.h)
    return a.output(family,'lantern',roofY,'панели/'+panel.w+'/'+panel.h)
  }

  if(family==='pavilion') {
    if(!wallAt([[x,z],[end,z],[x,back],[end,back]],height,'Соберите четыре опоры навеса')) return
    if(w>=6&&d>=4) seat(mid-1,z+1)
    if(w>=7&&d>=5) plant(x+1,back-1)
    const roofY=y+height
    const slab=topAt(rect(x,z,w,d),roofY)
    if(!slab) return
    const tier=topAt(rect(x+1,z+1,w-2,d-2),slab,'Поднимите второй ярус крыши')
    if(!tier) return
    const finial=a.layer(rect(mid-Number(w%2===0),z+Math.floor(d/2),w%2===0?2:1,1),p=>p.plate||p.ornament,cap,tier,true)
    if(finial) a.step('Установите верхний пояс','roof',finial,{module:'roof'})
    furnish(height)
    return a.output(family,'tiered',roofY,'ярусы/'+height)
  }

  if(family==='workshop') {
    if(d%2||d<6) return
    const front=z+1,buildingDepth=d-2
    const sides=[...rect(x,front,1,buildingDepth),...rect(end,front,1,buildingDepth),...rect(x+1,back-1,w-2,1)]
    const frame=a.take(p=>p.window&&p.w<=w-5&&p.h<=height-3,cap)
    const entry=frame?end-2:x+Math.floor((w-2)/2)
    const frontWall=rect(x+1,front,w-2,1).filter(([px])=>(px<entry||px>=entry+2)&&(!frame||px>x+frame.w))
    if(!wallAt([...sides,...frontWall],height,'Соберите стены мастерской и оставьте открытый вход')) return
    if(frame&&!showWindow(frame,x+1,front,3)) return
    if(d>=7&&w>=6) seat(x+1,back-2)
    const roofY=y+height
    const slab=topAt(rect(x,z,w,d),roofY)
    if(!slab) return
    const roofLayers=a.ridge(x,z,w,d,slab,cap)
    if(roofLayers) {
      for(const parts of roofLayers) a.step('Соберите скаты и конёк','roof',parts,{module:'roof'})
      furnish(height)
      return a.output(family,'gable',roofY,'скаты/'+height)
    }
    const inner=rect(x,z+1,w,d-2)
    const riser=a.stack(inner,slab,3,cap)
    if(!riser) return
    a.step('Соберите первый уступ кровли','roof',riser,{module:'roof'})
    if(!topAt(rect(x,z+Math.floor(d/2)-1,w,2),slab+3,'Поставьте конёк')) return
    furnish(height)
    return a.output(family,'stepped',roofY,'конёк/'+height)
  }

  const front=z+1
  const wingStart=x+Math.max(2,Math.floor(w/3))
  const opening=a.take(p=>p.glass&&p.w<=end-wingStart-2&&p.h<=height-3,['glass','glassBlue','glassCyan'])
  const bay=wingStart+1
  const insetWindow=a.take(p=>p.window&&p.w<=wingStart-x-1&&p.h<=height-3,cap)
  const shell=[
    ...rect(x,back,w,1),...rect(x,front,1,d-2),...rect(end,front+1,1,d-3),
    ...rect(x+1,front,wingStart-x-1,1),...rect(wingStart,front+1,end-wingStart,1)
  ].filter(([px,pz])=>(pz!==front+1||px<bay||px>=bay+(opening?.w??1))&&
    (pz!==front||!insetWindow||px<=x||px>x+insetWindow.w))
  if(!wallAt(shell,height,'Соберите стены со сдвигом по фасаду')) return
  if(insetWindow&&!showWindow(insetWindow,x+1,front,3)) return
  if(opening) {
    const glazed=[a.place(opening,bay,y,front+1)]
    const header=a.stack(rect(bay,front+1,opening.w,1),y+opening.h,height-opening.h,cap)
    if(!header) return
    a.step('Установите витрину и перемычку','wall',[...glazed,...header],{cut:true})
  }
  if(w>=7&&d>=5) seat(x+1,back-1)
  plant(end,z)
  const roofY=y+height
  const slab=topAt(rect(x,front,w,d-1),roofY)
  if(!slab) return
  const upper=rect(wingStart,front+2,end+1-wingStart,d-3)
  const upperWalls=upper.filter(([px,pz])=>px===wingStart||px===end||pz===back)
  const block=a.stack(upperWalls,slab,6,body)
  if(!block) return
  a.step('Возведите сдвинутую надстройку','roof',block,{module:'roof'})
  const railing=a.take(p=>p.fence&&p.w<wingStart-x+2&&p.d===1,cap)
  if(railing) a.step('Установите ограждение террасы','roof',[a.place(railing,x,slab,front)],{module:'roof'})
  if(!topAt(upper,slab+6,'Накройте верхний объём')) return
  furnish(height)
  return a.output(family,'setback',roofY,'уступ/'+(wingStart-x)+'/'+height)
}

function paletteChoices(entries,style,reference) {
  const combined=new Map()
  for(const p of entries) if(!isTransparent(p.color)) {
    const stats=combined.get(p.color)??{plate:0,wall:0,slope:0}
    if(p.plate) stats.plate+=p.area*p.count
    if(p.block||p.plate) stats.wall+=p.area*p.count*p.h
    if(p.slope) stats.slope+=p.area*p.count
    combined.set(p.color,stats)
  }
  const known=[...combined.keys()]
  const bias=distinct([...(reference?.palette??[]),...byStyle[style],...neutral,...known])
  const preference=color=>bias.length-bias.indexOf(color)
  const groundTones={darkTan:20,gray:17,tan:16,dark:14,brown:10,white:8,black:3}
  const grounded=color=>groundTones[color]??0
  const base=known.filter(c=>combined.get(c).plate>=4||combined.get(c).wall>=12)
    .sort((a,b)=>Math.sqrt(combined.get(b).plate)*3+grounded(b)-Math.sqrt(combined.get(a).plate)*3-grounded(a))
  const faces=known.filter(c=>combined.get(c).wall>=4)
    .sort((a,b)=>Math.sqrt(combined.get(b).wall)+preference(b)-Math.sqrt(combined.get(a).wall)-preference(a))
  const scored=[]
  for(const foundation of base.slice(0,5)) for(const wall of faces.slice(0,6)) for(const roof of base.slice(0,5)) {
    const score=base.indexOf(foundation)*2+faces.indexOf(wall)*1.2+base.indexOf(roof)+
      Number(foundation===wall)*2+Number(wall===roof)*2.5+Number(foundation===roof)
    scored.push({base:foundation,wall,roof,score})
  }
  const ordinary=scored.sort((a,b)=>a.score-b.score).slice(0,16)
  const sloping=known.filter(c=>combined.get(c).slope>=24).sort((a,b)=>combined.get(b).slope-combined.get(a).slope)
  const pitched=[]
  for(const roof of sloping.slice(0,3)) for(const foundation of base.slice(0,3)) {
    for(const wall of faces.slice(0,2)) pitched.push({base:foundation,wall,roof})
  }
  return {ordinary:ordinary.map(({base,wall,roof})=>({base,wall,roof})),pitched}
}

function dimensionsFor(entries,options) {
  const common=[[16,12],[14,10],[12,8],[10,8],[10,6],[8,8],[8,6],[8,5],[6,6],[6,5],[6,4],[5,4],[4,4],[4,3],[4,2],[3,2],[2,2]]
  const unique=new Map()
  for(const [w,d] of [...common,...entries.filter(p=>p.plate||p.block&&p.h===3).map(p=>[Math.max(p.w,p.d),Math.min(p.w,p.d)])]) {
    if(w>=2&&d>=2&&w<=Math.min(18,options.width)&&d<=Math.min(16,options.depth)) unique.set(w+'/'+d,{w,d})
  }
  return [...unique.values()].sort((a,b)=>b.w*b.d-a.w*a.d)
}

const rules={
  terraces:[7,5,16,12,[15,12,9]], arcade:[6,3,14,8,[12,9,6]], pavilion:[4,4,12,10,[12,9,6]],
  garden:[4,3,12,10,[6,3]], glasshouse:[5,4,12,10,[6]], tower:[4,3,8,6,[18,15,12,9]],
  gate:[3,2,8,5,[9,6,3]], landscape:[3,2,8,6,[0,1]],
  workshop:[5,6,12,8,[15,12,9]], monument:[2,2,6,4,[0]]
}

export function stockPlanner(options,stock,reference) {
  const entries=stockParts(stock)
  const palettes=paletteChoices(entries,options.style,reference)
  const bounds=dimensionsFor(entries,options)
  const area=entries.reduce((total,p)=>total+(p.plate||p.block&&p.h===3?p.count*p.area:0),0)
  const foundations=new Map()
  function padFor(size,palette) {
    const key=[size.w,size.d,palette.base,palette.wall,palette.roof].join('/')
    if(!foundations.has(key)) {
      const b=structureBounds(options,size)
      const a=draft(entries,palette,b,options.partLimit)
      foundations.set(key,a.slab(rect(b.x0,b.z0,size.w,size.d),0,[palette.base,palette.wall,palette.roof],true))
    }
    return foundations.get(key)
  }
  function* plans(family,seed) {
    const [wMin,dMin,wMax,dMax,heights]=rules[family]
    if(family==='glasshouse'&&!entries.some(p=>p.glass&&p.count>=2)) return
    const paletteList=(family==='workshop'?[...palettes.pitched,...palettes.ordinary]:palettes.ordinary).slice()
    if(paletteList.length>3) {
      const [choice]=paletteList.splice(seed%3,1)
      paletteList.unshift(choice)
    }
    const withArches=family==='arcade'?new Set(entries.filter(p=>p.arch&&p.count>=2).map(p=>p.w*2)):new Set()
    const sizes=withArches.size?bounds.slice().sort((a,b)=>Number(withArches.has(b.w))-Number(withArches.has(a.w))):bounds
    for(const size of sizes) {
      if(size.w<wMin||size.d<dMin||size.w>wMax||size.d>dMax||size.w*size.d>area) continue
      for(const palette of paletteList) {
        const pad=padFor(size,palette)
        if(!pad) continue
        for(const height of heights) {
          const plan=buildVariant(entries,options,palette,size,pad,family,height)
          if(plan) yield plan
        }
      }
    }
  }
  return {plans}
}

export function rankedStockFamilies(options,history,intent,seed) {
  const recent=history.filter(item=>item.stockFamily).slice(-6)
  const {type}=options
  const wanted=['home','apartment','hotel'].includes(type)?['terraces','workshop','tower','pavilion','glasshouse','arcade']:
    ['flowers','greenhouse'].includes(type)?['glasshouse','garden','pavilion','arcade','terraces','tower','workshop']:
    ['workshop','garage','fireStation','station'].includes(type)?['workshop','arcade','pavilion','gate','terraces','glasshouse','tower']:
    ['arcade','glasshouse','terraces','workshop','pavilion','tower']
  const order=distinct([...wanted,'pavilion','garden','gate','landscape','monument'])
  const latest=recent.at(-1)?.stockFamily
  return order.slice().sort((a,b)=>{
    const rank=family=>wanted.includes(family)?wanted.indexOf(family):10+order.indexOf(family)
    const score=family=>rank(family)+recent.filter(item=>item.stockFamily===family).length*13+
      (intent==='variation'&&family===latest?-30:intent==='different'&&family===latest?1000:0)+
      ((seed>>>order.indexOf(family))%5)*0.13
    return score(a)-score(b)
  })
}
