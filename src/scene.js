import {catalog, colors, legacyColors, inventoryColor, isTransparent, sizeId} from './catalog.js'
import availability from './availability.json' with {type:'json'}
import {furnishInterior} from './interiors.js'
import {profiles, referenceByNumber, paletteFromReference} from './architecture.js'
import {referenceRecipe, streetRecipe} from './reference-architecture.js'
import {referenceLayout} from './reference-layouts.js'
import {buildingForm,facadeStyle} from './architecture-options.js'
import {architectureDirection} from './architecture-directions.js'
import {buildChaletGround,buildSteepChalet,chaletSite} from './chalet.js'
import {buildReferenceRoof,roofForBounds} from './reference-roofs.js'
import {addStairGuard,buildStaircase,planStaircases,stairBlocksPassage} from './stairs.js'
import {buildingType} from './building-types.js'
import {buildSiteUse,planSiteUse,siteUseColor} from './site-usage.js'
import {buildAtticDeck,buildAtticPosts,planAttic} from './attic.js'
import {planBay,buildBayCourse,buildStripedAwning,planWindowPiers,buildWindowPier,buildWindowBand} from './shopfronts.js'

export const schemes = {
  cabin:'Шале с крышей до земли',
  wing:'Дом с отдельным крылом',
  street:'Несколько домов на улице',
  wharf:'Мастерская у причала',
  house:'Городской дом'
}
export const streetPlans = { row:'Ряд домов', square:'Улица с площадью', mews:'Улица с проходом во двор', double:'Дома по обе стороны улицы', custom:'Свой план участка' }

const massings={
  narrow:{kind:'narrow',label:'Узкий дом с боковым садом'},
  stepped:{roof:'terrace',setback:4,label:'Дом с открытой террасой верхнего этажа'},
  octagonal:{kind:'chamfer',label:'Садовый дом со скошенными углами',
    wing:{ratio:0.28,depth:0.54,lead:3,rows:6,roof:'gable'}},
  gables:{roof:'gable',label:'Дом из двух разновысоких корпусов',
    wing:{ratio:0.39,depth:0.52,lead:4,rows:6,roof:'hip'}},
  lantern:{roof:'lantern',label:'Крытая галерея со световым фонарём',
    wing:{ratio:0.32,depth:0.80,lead:0,rows:7,roof:'shed'}},
  patio:{roof:'terrace',setback:3,label:'Дом с террасой и низким крылом',
    wing:{ratio:0.25,depth:0.64,lead:2,rows:6,roof:'gable'}}
}

export function massingChoices(options,scheme) {
  if(options.photoRoof||options.sitePlan) return []
  if(scheme==='wing'&&options.width>=16&&options.depth>=16) return ['gables','lantern','patio']
  if(scheme==='house'&&options.width>=16&&options.depth>=16) {
    if(options.floors===1) return ['narrow','octagonal']
    return options.depth>=20?['narrow','stepped']:['narrow']
  }
  return []
}

export function streetChoices(options) {
  return options.depth>=32&&options.width>=27?['row','square','mews','double']:['row','square','mews']
}

export function schemeForReference(reference) {
  if(!reference) return ''
  const recipe=referenceRecipe(reference)
  if(recipe) return recipe.scheme
  if(reference.profile==='aframe'||reference.profile==='woodland') return 'cabin'
  if(reference.profile==='dock'||reference.number==='21335') return 'wharf'
  if(['21359','60380','60097','76457','75978','76444','10217'].includes(reference.number)||reference.profile==='arcade') return 'street'
  if(['terrace','pavilion','greenhouse','crooked','timber'].includes(reference.profile)) return 'wing'
  return 'house'
}

const styleColors = {
  old:[['tan','white','green','darkRed'],['darkRed','tan','black','dark'],['orange','tan','brown','dark'],['sandGreen','white','green','dark']],
  modern:[['white','dark','black','dark'],['gray','white','blue','dark'],['darkTan','gray','black','dark'],['lightBlue','white','black','dark']],
  coastal:[['sandGreen','white','green','darkRed'],['lightBlue','white','blue','dark'],['orange','tan','brown','darkRed'],['tan','white','green','brown']]
}

// Ground floor, upper masonry, top floor, trim, frame, roof, accent, glazing.
export const legoPalettes = {
  old:[
    ['green','mediumNougat','white','tan','black','darkRed','gold','glass'],
    ['brown','darkRed','tan','tan','black','dark','green','glass'],
    ['blue','brightBlue','white','white','black','dark','gold','glass'],
    ['green','orange','tan','tan','brown','darkRed','gold','glass'],
    ['darkRed','tan','white','darkTan','black','dark','green','glass'],
    ['brown','sandGreen','white','tan','green','darkRed','gold','glass']
  ],
  modern:[
    ['teal','white','azure','gray','black','dark','lime','glassBlue'],
    ['blue','brightBlue','white','gray','black','dark','amber','glassCyan'],
    ['darkAzure','white','teal','gray','black','dark','magenta','glassBlue'],
    ['magenta','gray','white','white','black','dark','darkAzure','glassBlue'],
    ['darkAzure','white','lime','gray','black','dark','teal','glassCyan'],
    ['teal','gray','white','white','black','dark','yellow','glassBlue']
  ],
  coastal:[
    ['white','azure','white','white','blue','blue','yellow','glassBlue'],
    ['white','lightYellow','tan','white','teal','darkRed','teal','glass'],
    ['teal','sandGreen','white','white','black','dark','amber','glassBlue'],
    ['white','brightBlue','white','white','blue','dark','teal','glassBlue'],
    ['azure','white','brightBlue','white','blue','darkRed','amber','glassBlue'],
    ['white','mediumNougat','tan','tan','brown','darkRed','leafGreen','glass']
  ]
}

const availableColor=(id,color)=>availability[id]?.[inventoryColor(color)]

// Wall, upper storey, top storey, stonework, joinery, roof, accent, glazing.
const architecturalPalettes={
  old:[
    ['darkRed','darkRed','darkRed','tan','black','dark','green','glass'],
    ['sandGreen','sandGreen','sandGreen','white','brown','dark','green','glass'],
    ['mediumNougat','tan','tan','darkTan','brown','darkRed','green','glass'],
    ['tan','tan','tan','white','green','dark','darkRed','glass'],
    ['orange','orange','orange','darkTan','black','dark','darkRed','glass'],
    ['darkTan','darkTan','darkTan','tan','brown','blue','green','glass']
  ],
  modern:[
    ['dark','white','white','gray','black','dark','brown','glass'],
    ['brown','darkTan','darkTan','dark','black','dark','teal','glass'],
    ['gray','white','white','dark','black','gray','orange','glassBlue'],
    ['darkRed','darkRed','darkRed','gray','black','dark','tan','glass'],
    ['white','white','white','tan','dark','dark','green','glass'],
    ['dark','sandGreen','sandGreen','gray','black','dark','white','glassBlue']
  ],
  coastal:[
    ['tan','tan','tan','white','blue','darkRed','teal','glass'],
    ['white','white','white','darkTan','green','darkRed','green','glass'],
    ['sandGreen','sandGreen','sandGreen','white','white','gray','green','glass'],
    ['mediumNougat','mediumNougat','mediumNougat','tan','green','darkRed','white','glass'],
    ['lightBlue','lightBlue','lightBlue','white','white','dark','blue','glass'],
    ['tan','lightYellow','lightYellow','white','blue','dark','blue','glass']
  ]
}

function facadePalette(set,floor,total) {
  const [ground,upper,top,trim,frame,roof,accent,glass]=set
  return [floor===0?ground:floor===total-1?top:upper,trim,frame,roof,accent,glass]
}

function paletteForRecipe(base,recipe,design) {
  const result=[...base]
  const {facade,roof,wallColors,roofColors}=recipe
  const timber=facade==='timber'||facade==='logs'
  const chosen=wallColors.find(color=>timber
    ? ['tan','darkTan','brown','orange','nougat','mediumNougat'].includes(color)
    : !['black','dark','gray','white'].includes(color))
  if(chosen) result[1]=chosen
  if(facade==='timber') result[2]='white'
  if(facade==='logs') {
    result[0]=chosen??'brown'
    result[1]=result[0]
    result[2]='tan'
  }
  if(facade==='glass'&&['lantern','monitor'].includes(roof)) {
    result[0]='white'
    result[3]='white'
    result[7]='glass'
  }
  if(roof==='snow') result[5]='dark'
  else if(roofColors.length&&!design.colorEdit) result[5]=roofColors[design.form%Math.min(2,roofColors.length)]
  return result
}

function floorCapacity(bounds) {
  const w=bounds.x1-bounds.x0,d=bounds.z1-bounds.z0
  if(w<8||d<12) return 1
  if(w<10||d<14) return 2
  if(w<13||d<16) return 3
  if(w<16||d<18) return 4
  return 5
}

function rectangle(x,z,w,d) {
  return {x0:x,z0:z,x1:x+w,z1:z+d}
}
function splitLots(width,count,gaps,bias) {
  const space=width-2-gaps.reduce((total,gap)=>total+gap,0)
  const widths=Array.from({length:count},(_,i)=>Math.floor((i+1)*space/count)-Math.floor(i*space/count))
  if(count===2) {
    const adjustment=Math.max(8-widths[0],Math.min(widths[1]-8,bias))
    widths[0]+=adjustment
    widths[1]-=adjustment
  }
  let x=1
  return widths.map((w,i)=>{
    const lot={x,w}
    x+=w+(gaps[i]??0)
    return lot
  })
}

function referenceVolumes({width,depth,mode},layout,design) {
  const front=mode==='city'?3:2
  const available=layout.kind==='chamfer'?Math.min(27,width-2):width-2
  const origin=Math.floor((width-available)/2)
  const run=depth-front-1
  const lead=Math.min(layout.wing.lead+design.form%2,Math.max(0,run-8))
  const minimum=layout.kind==='chamfer'?8:7
  const wingWidth=available>=minimum+5?Math.max(5,Math.min(available-minimum,Math.round(available*layout.wing.ratio))):0
  const mainWidth=available-wingWidth
  const left=design.layout===1, mainX=left?origin+wingWidth:origin
  const mainDepth=layout.kind==='chamfer'?Math.min(run-lead,mainWidth+1):run-lead
  const bounds=rectangle(mainX,front+Number(wingWidth>0)*lead,mainWidth,mainDepth)
  if(!wingWidth) return {bounds}
  const wingDepth=Math.max(7,Math.min(run,Math.round(run*layout.wing.depth)))
  const wing=rectangle(left?origin:origin+mainWidth,front,wingWidth,layout.kind==='chamfer'?Math.min(11,wingDepth):wingDepth)
  return {bounds,wing,wingSide:left?'left':'right'}
}

function formVolumes({width,depth,mode},shape,design) {
  let w=Math.max(shape.branches?20:shape.wing?13:shape.dock?10:8,Math.min(width-2,Math.round(width*shape.width)))
  const face=mode==='city'?3:2
  const d=Math.max(7,Math.min(depth-face-1,Math.round(depth*shape.depth)))
  let x=shape.anchor==='side'?(design.layout?width-w-1:1):Math.floor((width-w)/2)
  const dock=shape.dock
  const z=dock?Math.min(depth-d-1,dock[1]+1):face
  if(shape.cabin) {
    w=Math.max(10,w)
    x=Math.floor((width-w)/2)
    return {bounds:rectangle(x,Math.min(depth-d-1,Math.max(3,face)),w,d),cabin:shape.cabin}
  }
  if(dock) {
    const [tw,,towerRows]=dock, towerWidth=Math.min(tw,w-6)
    const bounds=rectangle(x,z,w-towerWidth,d)
    const tower=rectangle(bounds.x1,z+1,towerWidth,Math.min(7,d-1))
    return {bounds,tower,pier:rectangle(x-1,1,w+2,z-1),towerRows}
  }
  if(!shape.wing) return {bounds:rectangle(x,z,w,d),shape:shape.clipped?'chamfer':undefined,clip:shape.clipped}
  const [ratio,extension,lead,wingRows,wingRoof]=shape.wing
  const split=Boolean(shape.branches)
  const sideWidth=Math.min(w-8,Math.max(split?10:5,Math.round(w*ratio)))
  const first=split?Math.floor(sideWidth/2):sideWidth
  const second=split?sideWidth-first:0
  const left=split||design.layout===1
  const mainX=x+(left?first:0), mainWidth=w-sideWidth
  const start=z+(lead>0?Math.min(lead,depth-z-d-1):0)
  const bounds=rectangle(mainX,start,mainWidth,d)
  const run=Math.max(5,Math.min(depth-z-1,Math.round(d*extension)))
  const position=(rear=false)=>{
    if(shape.branches==='cross') return Math.min(depth-run-1,start+Math.floor((d-run)/2))
    if(rear||lead<0) return Math.max(z,start+d-run)
    return z
  }
  const wing=rectangle(left?x:mainX+mainWidth,position(),first,run)
  const extra=split?rectangle(mainX+mainWidth,position(shape.branches==='stagger'),second,run):null
  return {bounds,wing,wingRows,wingRoof,wingSide:left?'left':'right',extra}
}

function scenePlan({width,depth,type,floors,mode,style,sitePlan,photoRhythm,buildingForm:requestedForm,
  facadeStyle:requestedFinish},design,reference,detailed,recipe,newStairs) {
  const houses=[], streets=[], approaches=[], gardens=[], lampPosts=[]
  let outsideStair, skybridge
  const scheme=design.scheme
  const layout=referenceLayout(design.referenceLayout)
  const form=buildingForm(design.formProfile)
  const finish=facadeStyle(design.styleProfile)
  const direction=design.referenceDetail?null:architectureDirection(design.direction)
  const mix=scheme==='street'&&!requestedFinish?direction?.facades:null
  const roofs=scheme==='street'&&direction?[...new Set(direction.forms.map(id=>buildingForm(id)?.roof)
    .filter(kind=>kind&&kind!=='aframe'&&kind!=='octagonal'))]:null
  if(roofs&&!roofs.length) roofs.push('gable','hip')
  const finishOffset=mix?Math.max(0,mix.indexOf(design.styleProfile)):0
  const shape=form??layout??massings[design.massing]
  const shift=design.form%3
  const side=design.layout
  function addHouse(bounds,settings={}) {
    houses.push({id:'house-'+(houses.length+1),bounds,type,style,floors,reverse:false,...settings})
  }
  const blueprint=design.blueprint
  if(blueprint) {
    for(const [i,volume] of blueprint.volumes.entries()) {
      const {bounds,...settings}=volume
      const finishId=design.styleProfile??direction?.facades.find(id=>facadeStyle(id)?.facade===settings.facade)??direction?.facades[0]
      const finish=facadeStyle(finishId)
      const plannedRecipe={...recipe,key:null,composition:'axis',facade:finish?.facade??(settings.facade==='plain'?'bays':settings.facade),
        finish,detail:settings.levels[0].rooms.some(room=>room.fixtures.includes('hotKitchen'))||
          design.exteriorDetail&&['home','bakery','restaurant'].includes(settings.type)&&style!=='modern'?'chimney':
          settings.roof==='terrace'?'planters':'frame',textures:[],wallColors:[],roofColors:[]}
      addHouse(bounds,{...settings,roof:roofForBounds(settings.roof,bounds),recipe:plannedRecipe,colorIndex:i})
    }
    streets.push(...blueprint.streets??[])
    approaches.push(...blueprint.approaches??[])
    gardens.push(...blueprint.gardens??[])
  } else if(scheme==='street'&&sitePlan?.length) {
    const roads=sitePlan.filter(zone=>zone.kind==='road')
    const distance=(a,b)=>Math.max(0,a.x-b.x-b.w,b.x-a.x-a.w)+Math.max(0,a.z-b.z-b.d,b.z-a.z-a.d)
    for(const zone of sitePlan) {
      const b=rectangle(zone.x,zone.z,zone.w,zone.d)
      if(zone.kind==='house') {
        const road=roads.reduce((closest,item)=>!closest||distance(zone,item)<distance(zone,closest)?item:closest,null)
        addHouse(b,{
          type:[type,type==='home'?'cafe':'home','book','flowers','home'][houses.length],
          colorIndex:houses.length,roof:design.roof===0?'flat':'gable',
          reverse:Boolean(road&&road.z>=zone.z+zone.d)
        })
      }
      else ({road:streets,path:approaches,garden:gardens}[zone.kind]).push(b)
    }
  } else if(scheme==='street') {
    const street=design.streetPlan
    const double=street==='double'&&depth>=32&&width>=27
    const roadDepth=Math.min(depth-13,form?.road??(depth<24?4:6))
    const roadZ=double?Math.floor((depth-roadDepth)/2):street==='mews'?2:0
    streets.push(rectangle(0,roadZ,width,roadDepth))
    const count=width>=43&&street==='row'?4:width>=35&&street!=='square'?3:2
    const gap=form?.gap?Math.min(form.gap,width-18-(count-2)*10):
      layout&&reference?.number==='60380'?width>=36?6:4
      :street==='square'?width>=32?8:6:street==='mews'||width<30?4:2
    const gaps=Array.from({length:count-1},(_,i)=>i===0?gap:2)
    const lots=splitLots(width,count,gaps,form?.bias??(recipe?.composition==='mews'?2+shift:shift-1))
    const front=roadZ+roadDepth+3
    const typeSequence=design.spacePlan&&!design.referenceDetail
      ?[type,...streetNeighbours(type,shift)]:[type,type==='home'?'cafe':'home','book','flowers','home','cafe']
    const lowSide=design.entry%2
    for(const [i,lot] of lots.entries()) {
      const downtown=layout&&reference?.number==='60380'
      const setback=downtown?i%2:form?.street==='mews'?i*(form.gap>=8?1:2):recipe?.composition==='mews'?i*2
        :street==='square'&&i===1?3:street==='mews'&&i%2===0?2:(i+shift)%2
      const z=form?Math.min(depth-8,front+setback):front+setback
      const available=depth-z-1
      const expansion=Math.max(0,Math.floor((available-17)*0.5))
      const standard=(downtown?14:12)+((i+design.form)%3)*3+expansion
      const compactYard=design.spacePlan&&!design.referenceDetail&&!requestedForm
      const d=Math.min(available,compactYard?Math.max(standard,Math.floor(available*0.84)):standard)
      addHouse(rectangle(lot.x,z,lot.w,d),{
        type:typeSequence[i],
        floors:floors===2&&i%2!==lowSide&&d>=12?2:1,
        roof:(i+design.roof)%3===0?'flat':'gable',
        tall:i%2!==lowSide,
        colorIndex:i+(design.form%2)
      })
    }
    if(double) {
      const rearLots=splitLots(width,2,[width>=34?6:3],1-shift)
      for(const [i,lot] of rearLots.entries()) {
        const d=Math.min(roadZ-3,11+i+shift)
        addHouse(rectangle(lot.x+1,roadZ-2-d,lot.w-2,d),{
          type:design.spacePlan&&!design.referenceDetail?typeSequence[count+i]:i===0?'home':'cafe',
          floors:1,roof:i===0?'gable':'flat',reverse:true,colorIndex:i+2
        })
      }
    }
    if(street==='square'||street==='mews') {
      const start=lots[0].x+lots[0].w
      approaches.push(rectangle(start,roadZ+roadDepth,gap,depth-roadZ-roadDepth))
      if(reference?.number==='21359'&&depth>=22) {
        outsideStair=rectangle(start+1,roadZ+roadDepth+3,2,6)
      }
    }
    for(let x=3;x<width-2;x+=12) lampPosts.push({x,z:roadZ+roadDepth+1})
  } else if(form) {
    const {bounds,extra,...volumes}=formVolumes({width,depth,mode},form,design)
    addHouse(bounds,{...volumes,colorIndex:0,roof:form.roof,setback:form.setback})
    if(extra) {
      const annex=Boolean(design.spacePlan&&buildingType(type)?.annex)
      addHouse(extra,{colorIndex:1,floorLimit:1,roof:form.branches==='stagger'?'hip':volumes.wingRoof,
        type:annex||type==='home'?type:'cafe',annex})
    }
  } else if(shape?.wing) {
    const volumes=referenceVolumes({width,depth,mode},shape,design)
    const {bounds,...wing}=volumes
    addHouse(bounds,{...wing,wingRows:shape.wing.rows,wingRoof:shape.wing.roof,colorIndex:0,
      shape:shape.kind==='chamfer'?'chamfer':undefined,roof:shape.roof,setback:shape.setback})
  } else if(shape?.kind==='narrow') {
    const z=(mode==='city'?4:2)+shift
    const w=Math.max(10,Math.min(width-5,Math.round(width*(0.54+shift*0.03))))
    const x=side?width-w-1:1
    const d=depth-z-1
    addHouse(rectangle(x,z,w,d),{colorIndex:0})
    gardens.push(rectangle(side?1:x+w+1,z+1,width-w-3,Math.max(4,d-2)))
  } else if(scheme==='cabin') {
    const cabin=design.referenceDetail&&reference?.number==='21338'?'forest':undefined
    const w=cabin?Math.min(20,width>=24?width-10:width-2):Math.min(width-2,15+shift*2+(width>=28?4:0))
    const z=cabin?3:mode==='city'?3+shift:2+shift
    const d=cabin?Math.min(depth-z-1,Math.max(9,Math.round(depth*0.58))):depth-z-1-(design.form%2)
    const x=side&&!cabin?width-w-1:Math.floor((width-w)/2)
    addHouse(rectangle(x,z,w,d),{floors:1,roof:'aframe',colorIndex:0,cabin})
  } else if(scheme==='wing') {
    const w=width-2, z=mode==='city'?4:2
    const composition=recipe?.composition
    const frontShift=depth>=22?(composition==='offset'?5:composition==='courtyard'?4:3)+shift:2
    const wingWidth=Math.max(3,Math.floor(w*((composition==='platform'?0.40:composition==='offset'?0.24:0.31)+0.04*shift)))
    const desiredWingDepth=Math.max(5,Math.floor((depth-z-1)*(composition==='courtyard'?0.36:composition==='platform'?0.64:0.53)))
    const wingDepth=recipe?Math.min(depth-z-frontShift-1,desiredWingDepth):desiredWingDepth
    const mainWidth=w-wingWidth
    const mainX=side?1+wingWidth:1
    const wingX=side?1:1+mainWidth
    const main=rectangle(mainX,z+frontShift,mainWidth,depth-z-frontShift-1)
    const wing=rectangle(wingX,z,wingWidth,wingDepth+frontShift)
    addHouse(main,{wing,wingSide:side?'left':'right',floors:floors===2&&mainWidth>=9&&main.z1-main.z0>=12?2:1,roof:design.roof===0?'flat':'gable',colorIndex:0})
  } else if(scheme==='wharf') {
    const x=2, z=depth>=22?7:4
    const w=width-4, d=Math.max(7,Math.min(depth-z-1,12+shift*2))
    const towerWidth=w>=15?5:4
    const workshop=rectangle(x,z,w-towerWidth,d)
    const tower=rectangle(workshop.x1,z+1,towerWidth,Math.min(6,d-1))
    const pier=rectangle(x-1,1,w+2,z-1)
    addHouse(workshop,{tower,pier,floors:1,roof:'gable',colorIndex:0})
  } else {
    const composition=recipe?.composition
    const margin=Math.max(0,Math.floor((width-14)*0.16))
    const x=1+shift+(composition==='axis'?Math.floor(shift/2):composition==='garden'?margin:0)
    const z=(mode==='city'?4:2)+shift+(composition==='garden'&&depth>=21?2:0)
    const trimRight=composition==='axis'?x:composition==='narrow'||composition==='garden'?1+margin:1
    const trimBack=composition==='garden'?1+Number(depth>=21)*2:1
    addHouse(rectangle(x,z,width-x-trimRight,depth-z-trimBack),{
      floors:floors===2&&depth-z-1>=12?2:1,roof:design.roof===0?'flat':'gable',colorIndex:0,setback:shape?.setback
    })
  }
  if(recipe&&!blueprint) {
    for(const [i,house] of houses.entries()) {
      house.recipe=scheme==='street'&&!direction?streetRecipe(recipe,i):recipe
      if(photoRhythm) house.recipe={...house.recipe,photoRhythm}
      const nearbyFinishes=design.typeFinish&&i>0&&scheme==='street'?buildingType(house.type)?.finishes:null
      const houseFinish=nearbyFinishes?facadeStyle(nearbyFinishes[(design.form+i)%nearbyFinishes.length])
        :mix?facadeStyle(mix[(finishOffset+i)%mix.length]):design.typeFinish&&i>0&&scheme==='street'?null:finish
      if(houseFinish) house.recipe={...house.recipe,facade:houseFinish.facade,finish:houseFinish}
      if(design.spacePlan&&!design.referenceDetail&&!requestedFinish&&['garage','fireStation'].includes(house.type)) {
        house.recipe={...house.recipe,facade:'service'}
      }
      const roofType=roofs?roofs[(design.roof+i)%roofs.length]:
        (form&&i>0&&scheme!=='street'?house.roof:design.referenceForm?null:shape?.roof)??house.recipe.roof
      if(house.shape==='chamfer') house.roof=roofType==='hip'&&!form?'octagonal':roofForBounds(roofType,house.bounds)
      else if(house.roof!=='aframe') house.roof=roofForBounds(roofType==='aframe'?'gable':roofType,house.bounds)
    }
  }
  if(design.roofEdit) {
    for(const house of houses) house.roof=design.roof===0?'flat':'gable'
    if(recipe) for(const house of houses) house.roof=roofForBounds(design.roofChoice??(design.roof===0?'terrace':'gable'),house.bounds)
  }
  if(!blueprint&&detailed&&scheme!=='cabin'&&scheme!=='wharf') {
    const tallest=houses.reduce((best,house,index)=>
      floorCapacity(house.bounds)>floorCapacity(houses[best].bounds)?index:best,0)
    for(const [index,house] of houses.entries()) {
      const drop=scheme==='street'&&index!==tallest?1+(index+design.form)%3:0
      house.floors=house.shape==='chamfer'?1:Math.min(house.floorLimit??5,floorCapacity(house.bounds),Math.max(1,floors-drop))
    }
  }
  if(form&&['wharf','cabin'].includes(scheme)) for(const house of houses) house.floors=1
  if(!blueprint&&!sitePlan&&recipe?.key==='riviera'&&scheme==='street') {
    for(const house of houses.slice(1).filter(house=>!house.reverse)) {
      house.elevation=3
      const {x0,x1,z0}=house.bounds
      house.entrySteps=rectangle(x0+entranceOffset(x1-x0,design,house.recipe,design.houseEdits?.[house.id]?.entry),z0-2,4,2)
    }
  }
  if(houses.length>=2&&floors>=2&&(blueprint?.bridge||!blueprint&&!sitePlan&&recipe?.key==='downtown'&&scheme==='street')) {
    const [left,right]=houses
    const x0=left.bounds.x1,x1=right.bounds.x0
    const neighbours=[[left,'right'],[right,'left']]
    if(x1-x0>=2&&x1-x0<=8&&floorCapacity(left.bounds)>=2&&floorCapacity(right.bounds)>=2) {
      const end=Math.min(left.bounds.z1,right.bounds.z1)-5
      const shafts=neighbours.map(([house,side])=>{
        if(layout) house.stairLayout=side==='right'?1:0
        const stairDesign=house.stairLayout===undefined?design:{...design,layout:house.stairLayout}
        return newStairs?planStaircases(house,stairDesign,Math.max(2,house.floors)):null
      })
      for(let z=Math.max(left.bounds.z0,right.bounds.z0)+2;z<=end;z++) {
        if(neighbours.some(([house,side],index)=>[0,1].some(floor=>{
          if(floor>=Math.max(2,house.floors)-1) return false
          const well=shafts[index]?.[floor]??planStair(house.bounds,design,house,floor)
          return stairBlocksPassage(well,house.bounds,{side,offset:z-house.bounds.z0})
        }))) continue
        for(const [house,side] of neighbours) {
          house.floors=Math.max(2,house.floors)
          house.bridgeDoor={side,offset:z-house.bounds.z0}
        }
        skybridge=rectangle(x0,z,x1-x0,4)
        break
      }
    }
  }
  for(const house of houses) {
    const edit=design.houseEdits?.[house.id]
    if(edit?.roof) house.roof=recipe?roofForBounds(edit.roof,house.bounds):edit.roof
    const stairEdits=edit?.floors
    const stairDesign=house.stairLayout===undefined?design:{...design,layout:house.stairLayout}
    if(newStairs) house.stairs=planStaircases(house,stairDesign,house.floors,stairEdits)
    else if(recipe&&Object.values(stairEdits??{}).some(floor=>floor.stairKind)) {
      house.stairs=planStaircases(house,design,house.floors,stairEdits)
        .map((stair,floor)=>stairEdits[floor]?.stairKind?stair:planStair(house.bounds,design,house,floor))
    }
    if(house.setback&&house.stairs?.length) {
      const stair=stairEdits?planStaircases(house,stairDesign,house.floors).at(-1):house.stairs.at(-1)
      const space=Math.min(stair.z,stair.exit.z,stair.guard?.z??Infinity)-house.bounds.z0-1
      const inset=Math.max(0,Math.min(house.setback,space))
      if(inset) house.topBounds={...house.bounds,z0:house.bounds.z0+inset}
    }
    if(house.cabin) {
      house.elevation=3
      house.chaletSite=chaletSite(house,width,depth)
    }
  }
  return {houses,streets,approaches,gardens,reference,outsideStair,lampPosts,skybridge}
}

function streetNeighbours(type,offset) {
  const surroundings={restaurant:['market','hotel'],market:['restaurant','apartment'],
    library:['school','book'],school:['library','apartment'],museum:['cafe','hotel'],
    office:['apartment','market'],greenhouse:['flowers','market'],station:['hotel','market'],
    garage:['workshop','market'],fireStation:['clinic','workshop'],workshop:['garage','market']}
  const mixed=['home','cafe','book','flowers','market','apartment','library','office']
  return [...new Set([...(surroundings[type]??[]),...mixed.slice(offset),...mixed.slice(0,offset)])].filter(id=>id!==type)
}

export function createAssembly(options,exteriorPlan,exteriorDetail=0) {
  const {width,depth}=options
  const parts=[], steps=[], joins=[], modules=[]
  const occupancy=new Map(), studs=new Map()
  let section='Основание', module='ground', floor=0, building=null, reverse=false, role='site', cut=false, elevation=0
  const key=(x,y,z)=>(y*depth+z)*width+x
  // Reserve later buildings too. They are still absent from the occupancy map.
  const reserved=exteriorPlan?exteriorPlan.houses.flatMap(house=>
    [house.bounds,house.wing,house.tower,house.pier,house.entrySteps]).concat(
    exteriorPlan.streets,exteriorPlan.outsideStair,exteriorPlan.skybridge).filter(Boolean):[]
  function clearLedge(x,y,z,w,h,d=1) {
    if(reverse) {
      x=building.bounds.x0+building.bounds.x1-x-w
      z=building.bounds.z0+building.bounds.z1-z-d
    }
    if(x<0||x+w>width||z<0||z+d>depth||reserved.some(b=>
      x<b.x1&&x+w>b.x0&&z<b.z1&&z+d>b.z0)) return false
    for(let dx=0;dx<w;dx++) for(let dz=0;dz<d;dz++) for(let dy=0;dy<h;dy++) {
      if(occupancy.has(key(x+dx,y+elevation+dy,z+dz))) return false
    }
    return true
  }
  function exposedStud(x,y,z) {
    if(reverse) {
      x=building.bounds.x0+building.bounds.x1-x-1
      z=building.bounds.z0+building.bounds.z1-z-1
    }
    const cell=key(x,y+elevation,z)
    return studs.has(cell)&&!occupancy.has(cell)
  }
  function context(next) {
    ({section,module,floor,building,reverse,role,cut,elevation}={section,module,floor,building,reverse,role,cut,elevation,...next})
  }
  function step(title) {
    if(steps.at(-1)?.start===parts.length) steps.pop()
    steps.push({title,start:parts.length,module,section})
  }
  function covered(id,x,y,z,w,d,rotation,profile) {
    const index=parts.length, contacts=new Set()
    for(let a=x;a<x+w;a++) for(let b=z;b<z+d;b++) {
      const contact=studs.get(key(a,y,b))
      if(contact!==undefined) contacts.add(contact)
      for(let h=0;h<profile.h;h++) {
        const cell=key(a,y+h,b)
        if(occupancy.has(cell)) throw new Error('Пересечение '+id+' с '+parts[occupancy.get(cell)].id+' в '+[a,y+h,b])
        occupancy.set(cell,index)
      }
      const high=profile.kind==='hipCorner'
        ? a===x+Number(rotation===0||rotation===270)&&b===z+Number(rotation>=180)
        : profile.kind!=='slope'||(rotation===0&&b===z+d-1)||(rotation===180&&b===z)||
          (rotation===90&&a===x+w-1)||(rotation===270&&a===x)
      if(profile.studs&&high) studs.set(key(a,y+profile.h,b),index)
    }
    return contacts
  }
  function add(id,x,y,z,color,rotation=0,mount=null) {
    const spec=catalog[id]
    if(!spec) throw new Error('Неизвестная форма '+id)
    const w=rotation%180?spec.d:spec.w, d=rotation%180?spec.w:spec.d
    y+=elevation
    if(reverse&&building) {
      const box=building.bounds
      x=box.x0+box.x1-x-w
      z=box.z0+box.z1-z-d
      rotation=(rotation+180)%360
    }
    if(x<0||z<0||y<0||x+w>width||z+d>depth) throw new Error('Деталь вне участка '+id)
    const contact=mount===null?covered(id,x,y,z,w,d,rotation,spec):new Set(Array.isArray(mount)?mount:[mount])
    const index=parts.length
    parts.push({id,x,y,z,w,d,h:spec.h,color,rotation,mount,module,layer:module,floor,
      building:building?.id,role,cut,kind:spec.kind,size:spec.w+'x'+spec.d})
    for(const support of contact) joins.push([support,index])
    return index
  }
  function put(kind,x,y,z,w,d,color) {
    const id=sizeId(kind,w,d)
    if(!id) throw new Error('Нет формы '+kind+' '+w+' × '+d)
    return add(id,x,y,z,color,w<d?90:0)
  }
  function strip(kind,x,y,z,length,color,vertical=false,stagger=false) {
    for(let offset=0;offset<length;) {
      const sizes=kind==='brick'?[6,4,3,2,1]:[8,6,4,3,2,1]
      const size=stagger&&offset===0&&length>4?3:sizes.find(size=>size<=length-offset&&sizeId(kind,1,size))
      put(kind,x+(vertical?0:offset),y,z+(vertical?offset:0),vertical?1:size,vertical?size:1,color)
      offset+=size
    }
  }
  function deck(box,y,color,stagger=false,alternate=false) {
    const {x0,x1,z0,z1}=box
    for(let z=z0;z<z1;) {
      const d=Math.min(stagger&&z===z0?1:2,z1-z)
      for(let x=x0;x<x1;) {
        const offset=alternate&&(z-z0)%4===2
        const sizes=(stagger||offset)&&x===x0?[3,2,1]:[8,6,4,3,2,1]
        const w=sizes.find(w=>w<=x1-x&&sizeId('plate',w,d))
        put('plate',x,y,z,w,d,color)
        x+=w
      }
      z+=d
    }
  }
  function addModule(id,label,base) {
    modules.push({id,label,base:base+elevation})
    context({module:id})
  }
  return {parts,steps,joins,modules,context,step,add,put,strip,deck,addModule,exposedStud,exteriorDetail,clearLedge:exteriorPlan&&clearLedge}
}

function entranceOffset(length,design,recipe,side) {
  if(side!==undefined) return side?length-5:1
  if(recipe&&['axis','lodge'].includes(recipe.composition)) return Math.max(1,Math.floor((length-4)/2))
  return design.entry?length-5:1
}

function frontOpening(length,entry,recipe,side,position) {
  const service=recipe?.facade==='service'&&length>=10
  if(position!==undefined&&side===undefined) {
    const span=service?6:4
    return {offset:Math.max(1,Math.min(length-span-1,Math.round(length*position-span/2))),span,service}
  }
  return service?{offset:side===undefined?Math.floor((length-6)/2):side?length-7:1,span:6,service}
    :{offset:entranceOffset(length,{entry},recipe,side),span:4,service}
}

function houseOpening(house,design,box=house.bounds) {
  const {id,bounds,wing,recipe,roof,shape,clip}=house
  const edit=design.houseEdits?.[id]
  const side=box===wing?undefined:edit?.entry
  const width=bounds.x1-bounds.x0
  if(roof==='aframe') return {x:bounds.x0+Math.floor((width-4)/2),w:4}
  if(shape==='chamfer'&&box!==wing) {
    const inset=Math.min(clip??3,Math.floor((Math.min(width,bounds.z1-bounds.z0)-4)/2))
    const x=side===undefined?bounds.x0+Math.floor((width-4)/2):side?bounds.x1-inset-4:bounds.x0+inset
    return {x,w:4}
  }
  const {offset,span}=frontOpening(box.x1-box.x0,box===wing?1-design.entry:design.entry,
    edit?.facade?{...recipe,facade:edit.facade}:recipe,side,box===wing?(house.wingLevels?0.5:undefined):house.entry)
  return {x:box.x0+offset,w:span}
}

function streetFurniture(plan,options,design,palettes) {
  const occupied=new Set(plan.lampPosts.map(({x,z})=>z*options.width+x))
  const blocked=new Set(occupied)
  const furniture=[]
  const sites=plan.houses.flatMap(house=>[house.bounds,house.wing,house.tower,house.pier,house.entrySteps].filter(Boolean))
  const excluded=[...sites,...plan.streets,...plan.gardens,plan.outsideStair,plan.skybridge].filter(Boolean)
  function place(id,x,z,w,d,color) {
    const pads=[]
    for(let dz=0;dz<d;dz++) for(let dx=0;dx<w;dx++) {
      const px=x+dx,pz=z+dz,cell=pz*options.width+px
      if(px<0||px>=options.width||pz<0||pz>=options.depth||occupied.has(cell)
        ||excluded.some(box=>px>=box.x0&&px<box.x1&&pz>=box.z0&&pz<box.z1)) return false
      pads.push(cell)
    }
    for(const cell of pads) occupied.add(cell)
    for(const cell of id==='planter'||id==='figure'?pads:[pads[0],pads[w-1]]) blocked.add(cell)
    furniture.push({id,x,z,w,d,color})
    return true
  }
  for(const [index,house] of plan.houses.entries()) {
    if(house.roof==='aframe'||house.shape==='chamfer'||house.pier) continue
    const {x0,x1,z0,z1}=house.bounds
    const front=house.reverse?z1:z0-1
    const accent=palettes[index][4]
    const side=design.houseEdits?.[house.id]?.entry
    const planned=house.levels?.[0].rooms.some(room=>room.light==='wide'&&room.wall==='front')
    if(house.levels&&(!planned||house.recipe.facade==='service')) continue
    const entry=house.levels?houseOpening(house,design).x:x0+entranceOffset(x1-x0,design,house.recipe,side)
    if(design.spacePlan&&!design.referenceDetail&&houseOpening(house,design).w===6) continue
    if(!house.reverse&&x1-x0>=8&&(house.recipe?.facade==='arcade'||house.style==='modern'||(design.form+index)%2===0)) {
      const id=house.recipe?.facade==='arcade'||house.style==='old'?'15254':house.style==='modern'?'88930':'24309'
      if(id==='15254'&&x1-x0>=9) place(id,entry-1,front,6,1,'tan')
      else place(id==='15254'?'88930':id,entry,front-1,4,2,accent)
    }
    const other=(side??design.entry)?x0+1:x1-3
    place('planter',other,front,2,1,house.style==='old'?'green':accent)
  }
  if(design.exteriorDetail>=2&&!options.sitePlan) for(const house of plan.houses) {
    if(house.pier||house.chaletSite||house.shape==='chamfer') continue
    const b=house.bounds,door=houseOpening(house,design)
    const entry=house.reverse?b.x0+b.x1-door.x-door.w:door.x
    const z=house.reverse?b.z1:b.z0-2
    // Leave the full doorway open, including its approach to the street.
    const spots=[b.x0,b.x1-4].filter(x=>x+4<=entry||x>=entry+door.w)
    for(const x of spots) {
      if(plan.approaches.some(p=>x<p.x1&&x+4>p.x0&&z<p.z1&&z+2>p.z0)) continue
      if(place('figure',x,z,4,2,house.type)) {
        furniture.at(-1).reverse=house.reverse
        break
      }
    }
  }
  return {furniture,pads:occupied,blocked}
}

function buildSite(a,options,plan,design,palettes) {
  const {width,depth}=options
  const {houses,streets,approaches,gardens,outsideStair,lampPosts,skybridge}=plan
  const plot=rectangle(0,0,width,depth)
  const chalet=houses.find(house=>house.chaletSite)
  const details=palettes?streetFurniture(plan,options,design,palettes):null
  const siteUse=design.spacePlan&&!design.referenceDetail&&!options.sitePlan&&details
    ?planSiteUse(options,plan,details,houses.map(house=>{
      const {bounds,reverse,entrySteps}=house
      const opening=houseOpening(house,design)
      return {...opening,reverse,x:reverse?bounds.x0+bounds.x1-opening.x-opening.w:opening.x,
        z:reverse?bounds.z1:(entrySteps?.z0??bounds.z0)-1,use:buildingType(house.type)?.exterior}
    }),{extra:design.siteDetails!==0}):null
  const contains=(box,x,z)=>box&&x>=box.x0&&x<box.x1&&z>=box.z0&&z<box.z1
  const frontHouses=houses.filter(house=>!house.reverse)
  const backOfStreet=Math.max(...(frontHouses.length?frontHouses:houses).map(house=>house.bounds.z1))
  a.addModule('ground','Участок',0)
  a.step('Разложите пластины основания')
  a.deck(plot,0,'dark')
  a.step('Перевяжите швы основания')
  a.deck(plot,1,'gray',true)
  a.step('Выложите дорогу, тротуары и полы домов')
  for(let z=0;z<depth;z++) {
    function materialAt(x) {
      const road=streets.find(box=>contains(box,x,z))
      if(road) {
        const crossing=approaches.some(box=>x>=box.x0&&x<box.x1)&&x%2===0
        const horizontal=road.x1-road.x0>=road.z1-road.z0||design.streetPlan!=='custom'
        const marking=horizontal?z===Math.floor((road.z0+road.z1)/2)&&x%8<3
          :x===Math.floor((road.x0+road.x1)/2)&&z%8<3
        return ['tile',marking||crossing?'white':'dark']
      }
      if(lampPosts.some(post=>post.x===x&&post.z===z)) return ['plate','gray']
      if(contains(outsideStair,x,z)) return ['plate','tan']
      if(contains(skybridge,x,z)) return ['plate','gray']
      if(details?.pads.has(z*width+x)) return ['plate','gray']
      if(chalet) {
        const {porch,step,trees,rocks}=chalet.chaletSite
        if(contains(porch,x,z)||contains(step,x,z)) return ['plate','darkTan',chalet.id]
        if(trees.some(tree=>contains(tree,x,z))) return ['plate','leafGreen']
        if(rocks.some(rock=>contains(rock,x,z))) return ['plate','darkTan']
      }
      for(const house of houses) {
        if(contains(house.entrySteps,x,z)) return ['plate','darkTan',house.id]
        if(contains(house.bounds,x,z)||contains(house.wing,x,z)||contains(house.tower,x,z)) return ['plate','darkTan',house.id]
        if(contains(house.pier,x,z)) return [z===2||x===house.pier.x0||x===house.pier.x1-1?'plate':'tile','brown']
      }
      if(approaches.some(box=>contains(box,x,z))) return ['tile',z%3?'gray':'tan']
      if(gardens.some(box=>contains(box,x,z))) return ['plate',design.exteriorDetail?'olive':(x+z)%5===0?'leafGreen':'olive']
      const area=siteUse?.plots.find(box=>contains(box,x,z))
      if(area) return ['plate',siteUseColor(area.kind)]
      if(siteUse?.paths.has(z*width+x)) return ['tile',design.exteriorDetail&&options.style==='coastal'?'darkTan':'gray']
      const water=design.scheme==='wharf'&&z<houses[0].bounds.z0
      if(water) return ['tile',(x+z)%4?'blue':'lightBlue']
      const sidewalk=streets.some(box=>z>=box.z0-2&&z<=box.z1+1)
      const courtyard=design.scheme==='street'&&z>=backOfStreet
      if(courtyard) return ['tile',design.exteriorDetail?(z===backOfStreet?'gray':'darkTan'):(x+z)%5===0?'darkTan':'olive']
      if(chalet) return ['plate',(Math.floor(x/5)+Math.floor(z/4)+design.garden)%4===0?'darkTan':'olive']
      return ['tile',sidewalk?'gray':design.scheme==='cabin'?'olive':'tan']
    }
    for(let x=0;x<width;) {
      const material=materialAt(x)
      const [kind,color,building]=material
      const joint=design.exteriorDetail&&kind==='tile'&&!streets.some(box=>contains(box,x,z))?4-(x+(z%2)*2)%4:8
      let w=1
      while(x+w<width&&w<joint&&materialAt(x+w).join()===material.join()) w++
      a.context({building:building?houses.find(house=>house.id===building):null})
      a.strip(kind,x,2,z,w,color)
      x+=w
    }
  }
  if(chalet) buildChaletGround(a,chalet)
  for(const house of houses.filter(house=>house.entrySteps)) {
    const {x0,z0}=house.entrySteps
    a.context({role:'site',section:'Перепад уровня улицы',building:house})
    a.step('Поднимите цоколь и выложите подход ко входу')
    for(let y=3;y<3+house.elevation;y++) a.deck(house.bounds,y,y===5?'darkTan':'gray',y===4)
    a.put('tile',x0,3,z0,4,1,'gray')
    a.put('plate',x0,3,z0+1,4,1,'gray')
    a.put('tile',x0,4,z0+1,4,1,'gray')
  }
  a.context({role:'landscape',section:'Улица',building:null})
  if(siteUse) buildSiteUse(a,siteUse.plots,design)
  for(const {x0,x1,z0,z1} of gardens) {
    if(x1-x0<3||z1-z0<3) continue
    if(design.exteriorDetail) {
      buildSiteUse(a,[{x0,x1,z0,z1,kind:'garden'}],design)
      continue
    }
    a.step('Посадите цветы и кусты')
    for(let x=x0+1;x<x1-1;x+=3) {
      const z=z0+1+(x-x0)%(z1-z0-2)
      a.add('3062b',x,3,z,'brown')
      a.add('32607',x,6,z,'leafGreen',180)
      a.add('24866',x,7,z,(x+z)%2===0?'yellow':'pink')
    }
  }
  if(lampPosts.length) {
    a.step('Установите фонари вдоль тротуара')
    for(const {x,z} of lampPosts) {
      for(let y=3;y<=12;y+=3) a.add('3062b',x,y,z,y===12?'white':'black')
      a.add('98138',x,15,z,'black')
    }
  }
  for(const {id,x,z,w,color,reverse} of details?.furniture??[]) {
    if(id==='figure') {
      const cook=['restaurant','cafe','bakery'].includes(color)
      a.step(cook?'Поставьте повара у входа':'Соберите прохожего перед домом')
      const front=z+Number(!reverse), rotation=reverse?180:0
      a.add('970c03',x+1,3,front,'black',rotation)
      a.add(cook?'973c27h01':'973c22h01',x+1,8,front,cook?'white':'red',rotation)
      a.add('3626bpr0001',x+1,12,front,'yellow',rotation)
      a.add(cook?'3898':'3901',x+1,15,front,cook?'white':'brown',rotation)
    } else if(id==='planter') {
      a.step('Установите ящик с цветами у фасада')
      a.add('4216',x,3,z,color)
      a.add('35480',x,6,z,'darkTan')
      a.add('32607',x,7,z,'leafGreen',180)
      a.add('33291',x+1,7,z,'pink')
      a.add('24866',x,8,z,'amber')
    } else {
      a.step('Соберите козырёк над входом')
      const column=id==='15254'?'tan':'white'
      for(const end of [x,x+w-1]) a.add('43888',end,3,z,column)
      if(id==='15254') a.add(id,x,21,z,color)
      else {
        a.put('plate',x,21,z,4,2,'dark')
        if(id==='24309') {
          a.add('24309',x,22,z,color,90)
          a.add('25269',x+3,22,z,color)
          a.add('25269',x+3,22,z+1,color,180)
        } else a.add(id,x,22,z,color)
      }
    }
  }
  if(outsideStair) {
    a.step('Соберите наружную лестницу между домами')
    for(let i=0;i<6;i++) {
      const rise=Math.min(i+1,6-i)
      for(let row=0;row<rise;row++) a.put('plate',outsideStair.x0,3+row,outsideStair.z0+i,2,1,'tan')
      a.put('tile',outsideStair.x0,3+rise,outsideStair.z0+i,2,1,'gray')
    }
  }
  return siteUse
}

function buildSkybridge(a,b) {
  const {x0,x1,z0,z1}=b
  a.context({elevation:0,building:null,reverse:false,module:'ground',floor:0,role:'landscape',section:'Переход над улицей'})
  a.step('Соберите опоры перехода между домами')
  for(const x of [x0,x1-1]) for(const z of [z0,z1-1]) {
    a.add('14716',x,3,z,'white')
    a.add('14716',x,12,z,'white')
    a.add('3005',x,21,z,'white')
    a.add('3005',x,24,z,'white')
  }
  a.context({floor:1,role:'bridge'})
  a.addModule('skybridge','Остеклённый переход',27)
  a.step('Перевяжите площадку остеклённого перехода')
  a.deck(b,27,'teal')
  a.deck(b,28,'dark',true)
  a.step('Установите прозрачные стены перехода и перекрытие')
  for(const y of [29,35,41]) for(const z of [z0,z1-1]) {
    for(let x=x0;x<x1;) {
      if(x+2<=x1) {a.add('87552',x,y,z,'glassCyan');x+=2}
      else {
        a.add('3005',x,y,z,'white')
        a.add('3005',x,y+3,z,'white')
        x++
      }
    }
  }
  a.deck(b,47,'white')
  a.deck(b,48,'azure',true)
}

function shopCanopy(a,x,y,z,type,trim,accent) {
  if(!['bakery','book','cafe','flowers'].includes(type)||!a.clearLedge(x,y,z-2,4,5)) return false
  for(const dx of [0,2]) a.put('plate',x+dx,y,z-2,2,3,trim)
  a.strip('tile',x,y+1,z-1,4,accent)
  for(const dx of [0,3]) a.add('54200',x+dx,y+1,z-2,accent)
  if(type==='cafe') {
    a.add('3899',x+1,y+1,z-2,'white',90)
  } else if(type==='book') {
    for(const [i,color] of ['darkRed','tan','green'].entries())
      a.put('plate',x+1,y+1+i,z-2,2,1,color)
    a.put('tile',x+1,y+4,z-2,2,1,'green')
  } else if(type==='bakery') {
    a.add('35480',x+1,y+1,z-2,'brown')
    a.add('1126',x+1,y+2,z-2,'mediumNougat')
  } else {
    a.add('32607',x+1,y+1,z-2,'leafGreen',180)
    a.add('24866',x+1,y+2,z-2,'pink')
    a.add('33291',x+2,y+1,z-2,'white')
  }
  return true
}

function shell(a,box,{y,rows,palette,frontDoor=true,doorSide=0,sideDoor=null,detail=false,windowStyle,reverse=false,type,
  treatment,floor=0,variant=0,recipe,entrySide,entryPosition,programLevel}) {
  const [wall,trim,frame,,accent,glazing]=palette
  const facade=recipe?.facade
  const finish=recipe?.finish
  const {x0,x1,z0,z1}=box
  const w=x1-x0,d=z1-z0
  const sides=[
    {length:w,x:x0,z:z0,front:true},
    {length:w,x:x0,z:z1-1,back:true},
    {length:d-2,x:x0,z:z0+1,vertical:true,left:true},
    {length:d-2,x:x1-1,z:z0+1,vertical:true,right:true}
  ]
  for(const side of sides) {
    const {length,vertical=false,x,z}=side
    const spans=[]
    if(side.front&&frontDoor&&length>=6&&rows>=6) {
      const opening=frontOpening(length,doorSide,recipe,entrySide,entryPosition)
      spans.push({...opening,low:0,top:opening.service?5:6,door:true})
    }
    if(sideDoor&&side[sideDoor.side]) {
      spans.push({offset:sideDoor.offset,span:2,low:0,top:5,passage:true})
    }
    if(programLevel&&length>=5&&rows>=5) {
      const fits=(offset,span)=>offset>=1&&offset+span<length&&
        !spans.some(o=>offset<o.offset+o.span+1&&offset+span>o.offset-1)
      for(const room of programLevel.rooms) {
        if(room.light==='closed') continue
        const [rx,rz,rw,rd]=room.area
        const primary=side[room.wall]||side.front&&programLevel.split==='side'
        const touches=side.front?rz===0:side.back?rz+rd>=0.99:side.left?rx===0:rx+rw>=0.99
        if(!primary&&!(a.clearLedge&&touches&&room.light!=='private')) continue
        const start=(vertical?rz:rx)*length, extent=(vertical?rd:rw)*length
        const sash=a.clearLedge&&extent>=6&&room.light!=='private'
        const sizes=rows>=7&&room.light==='wide'&&primary?[6,4,2]:
          (sash||rows>=7&&room.light==='light'&&primary)?[4,2]:[2]
        const bays=a.clearLedge?Math.max(1,Math.floor(extent/(sizes[0]+4))):1
        for(let bay=0;bay<bays;bay++) {
          const ideal=start+extent*(bay+0.5)/bays
          for(const span of sizes) {
            const locations=Array.from({length:Math.max(0,length-span-1)},(_,i)=>i+1)
              .filter(offset=>fits(offset,span)&&(!a.clearLedge||offset>=Math.floor(start)&&offset+span<=Math.ceil(start+extent)))
            const offset=locations.sort((a,b)=>Math.abs(a+span/2-ideal)-Math.abs(b+span/2-ideal))[0]
            if(offset===undefined) continue
            const shortFrame=sash&&span===4&&(room.light!=='wide'||rows<7)
            const low=shortFrame?2:span>=4?1:room.light==='private'?3:2
            const top=low+(shortFrame?3:span===6?5:span===4?6:room.light==='light'||a.clearLedge&&low+3<=rows?3:2)
            spans.push({offset,span,low,top,curtain:span===6,shortFrame})
            break
          }
        }
      }
    } else if(length>=5&&rows>=5) {
      for(let offset=1;offset+2<length;) {
        const fits=span=>offset+span<length&&!spans.some(o=>offset<o.offset+o.span+1&&offset+span>o.offset-1)
        const dense=recipe?.photoRhythm==='dense'&&side.front
        const wide=!dense&&(facade?['shop','glass','ribbons','studio'].includes(facade):windowStyle==='tall')&&rows>=7
        const curtain=!dense&&rows>=7&&fits(6)&&(facade?(['glass','ribbons'].includes(facade)&&(side.front||facade==='glass'&&side.vertical))
          :treatment==='modern'&&side.front&&variant%3!==2)
        const bay=(facade?(['arches','arcade'].includes(facade)||facade==='bays'&&offset%2===1)
          :treatment&&(variant+floor+offset)%3===0)&&fits(3)
        const span=curtain?6:bay?3:wide&&fits(4)?4:2
        if(spans.some(o=>offset<o.offset+o.span+1&&offset+span>o.offset-1)) {
          offset++
          continue
        }
        const low=span>=4?1:2
        const top=span===6?6:span===4?7:span===3||detail&&rows>=7?5:4
        spans.push({offset,span,low,top,curtain})
        offset+=span+(dense?1:side.front&&finish?finish.cadence:
          facade==='ribbons'||facade==='glass'?1:side.front&&recipe?.photoRhythm==='open'||facade==='bays'&&floor%2===0?3:2)
        if(!side.front&&!vertical) break
      }
    }
    if((facade==='timber'||!facade&&treatment==='old'&&wall==='white')&&rows>=8&&side.front) {
      for(const offset of [0,length-1]) spans.push({offset,span:1,low:1,top:7,post:true})
    }
    spans.sort((a,b)=>a.offset-b.offset)
    if(a.exteriorDetail>=2&&side.front&&floor===1&&treatment) planBay(a,spans,x,y,z,rows)
    if(a.clearLedge&&floor>0&&side.front&&treatment!=='modern') {
      const windows=spans.filter(o=>!o.door&&!o.post&&!o.passage&&o.span>=2)
      const feature=windows.sort((left,right)=>right.span-left.span||
        Math.abs(left.offset+left.span/2-length/2)-Math.abs(right.offset+right.span/2-length/2))[0]
      if(feature) feature.railing=true
    }
    side.spans=spans
    side.coordinate=offset=>[x+(vertical?0:offset),z+(vertical?offset:0)]
    if(a.exteriorDetail>=2&&treatment&&side.length>=6) planWindowPiers(a,side,y,rows)
  }
  for(let row=0;row<rows;row++) {
    a.step(row===0?'Соберите цоколь и установите вход':'Возведите стены · ряд '+(row+1))
    for(const side of sides) {
      const {length,vertical,spans,coordinate}=side
      a.context({role:'wall',cut:Boolean(reverse?(side.back||side.left):(side.front||side.right))})
      // An opening without a door uses a lintel resting on both jambs.
      const gaps=spans.flatMap(o=>o.pier?(row>=o.low&&row<o.top?[o]:[])
        : o.bay&&row>=o.low-2&&row<=o.top?[o]
        : a.exteriorDetail>=2&&side.front&&floor===0&&['book','cafe','bakery','flowers','restaurant','market'].includes(type)&&
          !o.door&&!o.post&&!o.passage&&row===o.top&&o.span>=2&&[1,2].every(d=>a.clearLedge(side.x+o.offset,y+row*3,side.z-d,o.span,3))
          ?[{...o,awning:true}]
        : o.surround&&(row===o.top||!side.front&&row===o.low-1)?[{...o,band:true}]
        : o.passage&&row===o.top
        ? [{...o,offset:o.offset-1,span:4,lintel:true}]
        : a.clearLedge&&o.door&&!o.service&&row===o.top+Number(treatment==='old'||facade==='arcade')&&
          a.clearLedge(side.x+o.offset,y+row*3,side.z-1,o.span,3)?[{...o,hood:true}]
        : o.door&&!o.service&&row===o.top&&(treatment==='old'||facade==='arcade')?[{...o,arch:'3659'}]
        : facade&&['arcade','arches'].includes(facade)&&o.span===3&&row===o.top?[{...o,arch:'4490'}]
        : treatment&&side.front&&!o.door&&!o.passage&&!o.post&&row===o.low-1?[{...o,sill:true}]
        : row>=o.low&&row<o.top?[o]:[])
      let pos=0
      const masonry=(offset,len,color)=>{
        if(len<=0)return
        const [x,z]=coordinate(offset)
        const relief=finish?.relief
        const textured=Boolean((finish?(relief==='brick'||relief==='stone'||relief==='posts'&&row%2===0||
          relief==='plinth'&&row<3||relief==='sills'&&(row===1||row===4)||relief==='bands'&&row%3===0)
          :detail&&row%3===0||facade==='logs')&&len>=2)
        let used=0
        if(textured) {
          const ribbed=treatment==='modern'||treatment==='coastal'&&variant%2===0
          const evidence=recipe?.textures.find(id=>catalog[id].w===(len>=4?4:2)&&availableColor(id,color))
          const id=evidence??(len>=4?(facade==='logs'?'30137':ribbed?'2653':'15533'):(facade==='logs'?'30136':ribbed?'4216':'98283'))
          const selected=finish&&catalog[finish.texture].w<=len&&availableColor(finish.texture,color)?finish.texture:
            !treatment||availableColor(id,color)?id:len>=4?'3010':'3004'
          a.add(selected,x,y+row*3,z,color,vertical?90:0)
          used=catalog[selected].w
        }
        a.strip('brick',x+(vertical?0:used),y+row*3,z+(vertical?used:0),len-used,color,vertical,row%2===1)
      }
      function matches(offset,len,color) {
        if(side.front&&row===rows-1&&len>=2&&a.clearLedge?.(side.x+offset,y+row*3,side.z-1,len,3)) {
          const x=side.x+offset,z=side.z,base=y+row*3
          a.strip('plate',x,base,z,len,wall)
          for(let dx=0;dx<len;) {
            const span=[6,4,3,2,1].find(size=>size<=len-dx)
            a.put('plate',x+dx,base+1,z-1,span,2,trim)
            dx+=span
          }
          a.strip('tile',x,base+2,z-1,len,trim)
          a.strip('plate',x,base+2,z,len,trim)
          return
        }
        if(!a.clearLedge||treatment!=='old'||row===0||row===rows-1||len<=0||facade==='timber') {
          masonry(offset,len,color)
          return
        }
        const edge=vertical?row%2:1+row%2
        const left=offset===0?Math.min(len,edge):0
        const right=offset+len===length?Math.min(len-left,edge):0
        masonry(offset,left,trim)
        masonry(offset+left,len-left-right,color)
        masonry(offset+len-right,right,trim)
      }
      const band=side.front&&(finish?.relief==='bands'&&row===3||finish?.relief==='stone'&&row===2)
      const color=band?trim:facade==='timber'&&side.front&&(row===1||row===rows-1)?frame
        :row===0||treatment&&row===rows-1?(treatment==='modern'&&row===0?accent:trim):wall
      for(const gap of gaps) {
        matches(pos,gap.offset-pos,color)
        if(gap.pier) buildWindowPier(a,gap,side,y+row*3,row,palette,treatment)
        if(gap.band) buildWindowBand(a,side,gap,y+row*3,wall,trim)
        if(gap.bay) buildBayCourse(a,gap,side.x+gap.offset,y+row*3,side.z,row,palette,treatment)
        if(gap.awning) buildStripedAwning(a,side.x+gap.offset,y+row*3,side.z,gap.span,trim,accent)
        if(gap.hood) {
          const [x,z]=coordinate(gap.offset),base=y+row*3
          if(!shopCanopy(a,x,base,z,type,trim,accent)) {
            a.put('plate',x,base,z-1,gap.span,2,trim)
            for(let dx=0;dx<gap.span;dx++) a.add('54200',x+dx,base+1,z-1,
              facade==='shop'&&dx%2?'white':treatment==='modern'?frame:accent)
          }
          a.strip('plate',x,base+1,z,gap.span,trim)
          a.strip('plate',x,base+2,z,gap.span,wall)
        }
        if(gap.lintel) {
          const [x,z]=coordinate(gap.offset)
          a.put('brick',x,y+row*3,z,vertical?1:4,vertical?4:1,trim)
        }
        if(gap.arch||gap.sill) {
          const [x,z]=coordinate(gap.offset)
          if(gap.arch) a.add(gap.arch,x,y+row*3,z,trim,vertical?90:0)
          else if(a.clearLedge?.(x,y+row*3+1,z-1,gap.span,3)) {
            const base=y+row*3
            a.strip('plate',x,base,z,gap.span,wall)
            a.put('plate',x,base+1,z-1,gap.span,2,trim)
            a.strip('plate',x,base+2,z,gap.span,trim)
            if(gap.railing&&a.clearLedge(x,base+2,z-1,gap.span,5)) {
              if(gap.span>=4) {
                a.add('3633',x,base+2,z-1,frame)
                if(gap.span>4) a.strip('tile',x+4,base+2,z-1,gap.span-4,trim)
              } else {
                a.add('4216',x,base+2,z-1,'brown')
                a.add('32607',x,base+5,z-1,'leafGreen',180)
                a.add('24866',x+1,base+5,z-1,treatment==='coastal'?'white':'pink')
                if(gap.span===3) a.put('tile',x+2,base+2,z-1,1,1,trim)
              }
            } else if(treatment==='coastal'&&gap.span>=3) {
              a.strip('plate',x,base+2,z-1,gap.span,'brown')
              for(let dx=0;dx<gap.span;dx++) a.add(dx%2?'24866':'32607',x+dx,base+3,z-1,
                dx%2?'white':'leafGreen',dx%2?0:180)
            } else a.strip('tile',x,base+2,z-1,gap.span,trim)
          } else a.strip('brick',x,y+row*3,z,gap.span,treatment==='modern'?accent:trim,vertical)
        }
        pos=gap.offset+gap.span
      }
      matches(pos,length-pos,color)
      for(const post of gaps.filter(gap=>gap.post&&(row-1)%3===0)) {
        const [x,z]=coordinate(post.offset)
        a.add('14716',x,y+row*3,z,'black')
      }
      for(const gap of gaps.filter(o=>row===o.low&&!o.passage)) {
        if(gap.post||gap.bay||gap.pier) continue
        const [x,z]=coordinate(gap.offset)
        const lattice=windowStyle==='lattice'
        if(gap.service) {
          a.add('59349',x,y+row*3,z,frame,vertical?90:0)
          continue
        }
        if(gap.curtain) {
          if(a.clearLedge&&treatment!=='modern') {
            for(let i=0;i<6;i+=2) {
              const [wx,wz]=coordinate(gap.offset+i)
              const rotation=vertical?90:0
              const lower=a.add('60593',wx,y+row*3,wz,frame,rotation)
              a.add('60602',wx,y+row*3,wz,glazing,rotation,lower)
              const upper=a.add('60592',wx,y+row*3+9,wz,frame,rotation)
              a.add('60601',wx,y+row*3+9,wz,glazing,rotation,upper)
            }
          } else a.add('59349',x,y+row*3,z,glazing,vertical?90:0)
          continue
        }
        const panel=treatment==='modern'&&gap.span===2&&gap.top-gap.low===2
        if(panel) {
          a.add(variant%2?'87552':'4864b',x,y+row*3,z,glazing,vertical?90:0)
          continue
        }
        const id=gap.door?'60596':gap.shortFrame?'60594':gap.span===4?'57894':gap.span===3?'51239':gap.top-gap.low===3?'60593':'60592'
        const pane=gap.door?(lattice?'92589':'60623'):id==='60594'?'60603':id==='57894'?'57895':id==='51239'?'51266':id==='60593'?(lattice?'60607':'60602'):'60601'
        const opaque=gap.door||pane==='60607'
        const fitted=opaque&&(!availability[id]?.[inventoryColor(frame)]||!availability[pane]?.[inventoryColor(frame)])?'black':frame
        const rotation=vertical?90:0
        const mount=a.add(id,x,y+row*3,z,fitted,rotation)
        a.add(pane,x,y+row*3,z,opaque?fitted:glazing??'glass',rotation,mount)
      }
    }
  }
  a.context({role:'wall',cut:false})
}

function gable(a,box,y,palette,{across=true,cabin=false,doorX,doorSide=0,knee=0,steep=false,finish,alternating=false,offset=0,roofModule,open=false}={}) {
  const [wall,trim,frame,roof]=palette
  const W=box.x1-box.x0,D=box.z1-box.z0
  const span=across?D:W,run=across?W:D
  const levels=cabin?Math.max(1,Math.floor(run/2)-1):Math.min(steep?10:4,Math.floor(run/2)-1)
  const roofBase=y
  const windowRow=Math.max(0,Math.ceil((21-y)/3))
  const cabinWindow=cabin&&windowRow+1<levels&&run-2*(windowRow+1)-4>=4
  function addSlope(id,s,t,height,far,color=roof) {
    if(across) a.add(id,box.x0+t,height,box.z0+s,color,far?270:90)
    else a.add(id,box.x0+s,height,box.z0+t,color,far?180:0)
  }
  if(cabin) {
    a.context({role:'wall',cut:true})
    a.step('Соберите низкие боковые стены и вход во фронтоне')
    for(let row=0;row<knee;row++) {
      const Y=3+row*3
      a.strip('brick',box.x0,Y,box.z0,D,wall,true,row%2===1)
      a.strip('brick',box.x1-1,Y,box.z0,D,wall,true,row%2===1)
      a.strip('brick',box.x0+1,Y,box.z1-1,W-2,trim)
      a.strip('brick',box.x0+1,Y,box.z0,doorX-box.x0-1,trim)
      a.strip('brick',doorX+4,Y,box.z0,box.x1-doorX-5,trim)
    }
    const door=a.add('60596',doorX,3,box.z0,frame)
    a.add('60623',doorX,3,box.z0,frame,0,door)
  } 
  if(roofModule) {
    a.context({floor:1,section:'Шале · съёмная крыша'})
    a.addModule(roofModule,'Скаты шале',y)
  }
  a.context({role:'roof',cut:false})
  for(let row=0;row<levels;row++) {
    const Y=roofBase+row*3, far=run-2-row
    a.step('Соберите скаты · ряд '+(row+1))
    for(let s=0;s<span;) {
      const id=alternating&&row%2===1&&s===0?'3040b':span-s>=4?'3037':span-s>=2?'3039':'3040b'
      const color=finish==='snow'&&(row===0||(row+offset)%6===1&&(s+offset)%7===0)?'white':roof
      addSlope(id,s,row,Y,false,color)
      addSlope(id,s,far,Y,true,color)
      s+=catalog[id].w
    }
    const gap=far-row-2
    if(gap<=0) continue
    for(const end of [0,span-1]) {
      if(across&&cabin&&end===0&&Y<21) {
        const start=box.x0+row+2, stop=box.x0+far
        if(doorX<start||doorX+4>stop) throw new Error('Дверь выше линии ската')
        a.strip('brick',start,Y,box.z0,doorX-start,trim)
        a.strip('brick',doorX+4,Y,box.z0,stop-doorX-4,trim)
      } else if(across&&end===0&&cabinWindow&&row>=windowRow&&row<=windowRow+1) {
        const west=box.x0+row+2,east=box.x0+far,windowX=doorX+1
        a.strip('brick',west,Y,box.z0,windowX-west,wall)
        a.strip('brick',windowX+2,Y,box.z0,east-windowX-2,wall)
        if(row===windowRow) {
          const mount=a.add('60592',windowX,Y,box.z0,frame)
          a.add('60601',windowX,Y,box.z0,'glass',0,mount)
        }
      } else if(a.clearLedge&&!cabin&&finish&&run>=10&&row>=1&&row<=2&&end===0) {
        const from=row+2, center=Math.floor((run-2)/2)
        const gx=box.x0+(across?from:0),gz=box.z0+(across?0:from)
        a.strip('brick',gx,Y,gz,center-from,wall,!across)
        const wx=box.x0+(across?center:0),wz=box.z0+(across?0:center)
        a.strip('brick',wx+(across?2:0),Y,wz+(across?0:2),far-center-2,wall,!across)
        if(row===1) {
          const mount=a.add('60592',wx,Y,wz,frame,across?0:90)
          a.add('60601',wx,Y,wz,'glass',across?0:90,mount)
        }
      } else if(across) {
        a.strip('brick',box.x0+row+2,Y,box.z0+end,gap,wall,false,row%2===1)
      } else a.strip('brick',box.x0+end,Y,box.z0+row+2,gap,wall,true,row%2===1)
    }
    if(!cabin&&!open) {
      for(let s=2;s<span-1;s+=2) {
        if(across) a.strip('brick',box.x0+row+2,Y,box.z0+s,gap,wall)
        else a.strip('brick',box.x0+s,Y,box.z0+row+2,gap,wall,true)
      }
    }
  }
  a.step('Свяжите скаты коньком')
  const ridgeY=y+levels*3
  if(cabin) {
    const ridgeX=box.x0+levels
    const ridgeWidth=run-2*levels
    for(let s=0;s<span;) {
      const length=Math.min(ridgeWidth===3?2:4,span-s)
      a.put('plate',ridgeX,ridgeY,box.z0+s,ridgeWidth,length,roof)
      s+=length
    }
    for(let z=box.z0;z+1<box.z1;z+=2) a.add('3043',ridgeX,ridgeY+1,z,roof,90)
  } else {
    const ridge=across?rectangle(box.x0+levels,box.z0,run-2*levels,D)
      :rectangle(box.x0,box.z0+levels,W,run-2*levels)
    const ridgeWidth=run-2*levels
    if(open&&!sizeId('plate',ridgeWidth,1)) {
      for(const layer of [0,1]) for(let s=0;s<span;) {
        const length=Math.min(s===0&&layer?1:2,span-s)
        const split=Math.ceil(ridgeWidth/2)-layer
        for(const [from,width] of [[0,split],[split,ridgeWidth-split]]) {
          a.put('plate',ridge.x0+(across?from:s),ridgeY+layer,ridge.z0+(across?s:from),
            across?width:length,across?length:width,roof)
        }
        s+=length
      }
    } else {
      if(open) for(let s=0;s<span;s++) a.put('plate',ridge.x0+(across?0:s),ridgeY,ridge.z0+(across?s:0),
        across?ridgeWidth:1,across?1:ridgeWidth,roof)
      else a.deck(ridge,ridgeY,roof)
      a.deck(ridge,ridgeY+1,roof,true)
    }
    if(finish) {
      const middle=levels+Math.floor((run-2*levels-2)/2)
      for(let s=0;s+2<=span-2;s+=2) {
        if(across) a.add('3043',box.x0+middle,ridgeY+2,box.z0+s,frame,90)
        else a.add('3043',box.x0+s,ridgeY+2,box.z0+middle,frame)
      }
      return across?{x:ridge.x0,z:ridge.z1-1,y:ridgeY+2}:{x:ridge.x1-2,z:ridge.z0,y:ridgeY+2}
    }
  }
}
function walkingFloor(a,box,y,hole,color) {
  if(!hole) {
    a.deck(box,y,color)
    a.deck(box,y+1,color,true)
    return
  }
  const frontGap=hole.z-box.z0
  const rear=hole.z+hole.d
  a.deck(rectangle(box.x0,box.z0,box.x1-box.x0,frontGap),y,color,false,true)
  a.deck(rectangle(box.x0,hole.z,hole.x-box.x0,hole.d),y,color,false,true)
  a.deck(rectangle(box.x1-1,hole.z,1,hole.d),y,color)
  a.deck(rectangle(box.x0,rear,box.x1-box.x0,box.z1-rear),y,color)
  const overlap=frontGap%2===0?1:2
  for(let x=box.x0;x<box.x1;x++) {
    if(x>=hole.x&&x<hole.x+2) {
      a.strip('plate',x,y+1,box.z0,frontGap,color,true,true)
      a.strip('plate',x,y+1,rear,box.z1-rear,color,true)
      continue
    }
    const frontLength=frontGap-overlap
    a.strip('plate',x,y+1,box.z0,frontLength,color,true,true)
    a.put('plate',x,y+1,hole.z-overlap,1,overlap+1,color)
    const middle=hole.d-2
    a.strip('plate',x,y+1,hole.z+1,middle,color,true,true)
    a.put('plate',x,y+1,rear-1,1,box.z1-rear+1,color)
  }
}
function roofDeck(a,box,y,palette) {
  a.deck(box,y,palette[3])
  a.deck(box,y+1,palette[3],true)
}

function stairFlight(a,stair,y) {
  a.step('Соберите лестницу и выход на верхний этаж')
  for(let row=0;row<stair.d;row++) {
    for(let rise=0;rise<=row;rise++) a.put('brick',stair.x,y+rise*3,stair.z+row,2,1,'brown')
    a.put('tile',stair.x,y+(row+1)*3,stair.z+row,2,1,'brown')
  }
}

const stairNames = {
  straight:'прямая лестница', open:'открытая лестница',
  turn:'лестница с поворотом на 90°', return:'П-образная лестница'
}

function planStair(box,design,house,floor) {
  const wide=box.x1-box.x0>=12
  const kinds=wide?['straight','turn','open','return']:['straight','open']
  const kind=kinds[(design.form+house.colorIndex+floor)%kinds.length]
  const right=(design.layout+floor)%2===0
  const w=kind==='turn'||kind==='return'?4:2
  const d=kind==='turn'?7:kind==='return'?6:8
  const setback=box.z1-box.z0>=14?3:2
  return {kind,name:stairNames[kind],floor,right,w,d,
    x:right?box.x1-1-w:box.x0+1,z:box.z1-setback-d}
}

function floorWithWell(a,box,y,hole,color) {
  const {x0,x1,z0,z1}=box
  const {x,z,w,d,infill}=hole
  const rear=z+d
  const seam=infill?(hole.right?x-1:x+w):null
  a.deck(rectangle(x0,z0,x1-x0,z-z0),y,color,false,true)
  a.deck(rectangle(x0,z,x-x0,d),y,color,false,true)
  a.deck(rectangle(x+w,z,x1-x-w,d),y,color,false,true)
  for(let column=x0;column<x1;column+=2) {
    a.put('plate',column,y,rear,Math.min(2,x1-column),z1-rear,color)
  }
  if(infill) {
    const {x,z,w,d}=infill
    a.deck(rectangle(x,z,w,d),y,color)
    a.put('plate',x,y+1,z,w,1,color)
    // Extend the top layer across the seam to bind the infill to the landing.
    for(let row=z+1;row<z+d;row+=2) a.put('plate',Math.min(x,seam),y+1,row,w+1,2,color)
  }
  a.strip('plate',x0,y+1,z0,x1-x0,color,false,true)
  a.strip('plate',x0,y+1,z1-1,x1-x0,color,false,true)
  // The bottom deck uses two-stud rows. Keep the top joints on the other grid.
  const frontBridge=z-1-Number((z-z0)%2===1)
  const rearBridge=rear-1-Number(d%2===1)
  const bind=(column,from,to)=>{
    for(let pos=from;pos<to;) {
      const length=[8,6,4,2,1].find(size=>size<=to-pos)
      a.put('plate',column,y+1,pos,1,length,color)
      pos+=length
    }
  }
  for(let column=x0;column<x1;column++) {
    const inside=column>=x&&column<x+w
    if(inside) {
      bind(column,z0+1,z)
      bind(column,rear,z1-1)
      continue
    }
    bind(column,z0+1,frontBridge)
    a.put('plate',column,y+1,frontBridge,1,z+1-frontBridge,color)
    bind(column,column===seam?infill.z+infill.d:z+1,rearBridge)
    a.put('plate',column,y+1,rearBridge,1,rear+1-rearBridge,color)
    bind(column,rear+1,z1-1)
  }
}

function buildStair(a,stair,y,style) {
  const {x,z,w,d,right,kind,name}=stair
  const solid=kind==='straight'
  const color=style==='modern'?'dark':style==='old'?'brown':'white'
  const tread=style==='modern'?'gray':style==='old'?'darkTan':'tan'
  const steps=[]
  const add=(x,z,w,d)=>steps.push({x,z,w,d})
  if(kind==='turn') {
    for(let i=0;i<5;i++) add(0,i,2,1)
    add(0,5,2,2)
    add(2,5,1,2)
    add(3,5,1,2)
  } else if(kind==='return') {
    for(let i=1;i<4;i++) add(0,i,2,1)
    add(0,4,4,2)
    for(let i=3;i>=0;i--) add(2,i,2,1)
  } else {
    for(let i=0;i<d;i++) add(0,i,2,1)
  }
  a.context({role:'stair'})
  a.step('Соберите подъём · '+name)
  for(const [i,step] of steps.entries()) {
    const x0=x+(right?w-step.x-step.w:step.x), z0=z+step.z
    const rise=(i+1)*3+Number(i>=6)
    const landing=step.w>1&&step.d>1
    const postWidth=solid||landing?step.w:1
    const postDepth=solid||landing?step.d:1
    const postX=x0+(right?step.w-postWidth:0)
    let level=0
    if(!solid&&!landing) {
      for(;level+9<=rise;level+=9) a.add('14716',postX,y+level,z0,color)
    }
    for(;level+3<=rise;level+=3) a.put('brick',postX,y+level,z0,postWidth,postDepth,color)
    for(;level<rise;level++) a.put('plate',postX,y+level,z0,postWidth,postDepth,color)
    if(landing) a.put('plate',x0,y+rise,z0,step.w,step.d,tread)
    else if(solid) a.put('tile',x0,y+rise,z0,step.w,step.d,tread)
    else a.add('35480',x0,y+rise,z0,tread,step.d===2?90:0)
  }
}

function finishFloor(a,house,options,design,box,y,floor,stair,palette,interiors,heightLimit=24) {
  if(box.x1-box.x0<6||box.z1-box.z0<6) return
  const [,,frame]=palette
  const houseEdit=design.houseEdits?.[house.id]
  const floorEdit=houseEdit?.floors?.[floor]
  const baseDesign=house.attic?.stair.floor===floor?{...design,spacePlan:1}:design
  const localDesign=floorEdit?{
    ...baseDesign,
    layout:floorEdit.layout??design.layout,
    interiorPlan:floorEdit.interiorPlan??design.interiorPlan,
    tables:box===house.bounds?floorEdit.tables??design.tables:design.tables,
    manualTables:box===house.bounds?floorEdit.manualTables??design.manualTables:design.manualTables
  }:baseDesign
  a.context({role:'interior',cut:false})
  const wing=box===house.wing
  const passage=floor===0?house.passage:null
  const sideAccess=passage&&wing?{...passage,side:passage.side==='left'?'right':'left'}:passage
  const opening=localDesign.spacePlan?houseOpening(house,design,box):null
  const interior=furnishInterior({add:a.add,put:a.put,step:a.step,bounds:box,baseY:y,floor,
    options:{...options,type:house.type},design:localDesign,frame,trim:palette[1],stair,
    doorX:opening?.x??box.x0+entranceOffset(box.x1-box.x0,design,house.recipe,box===house.bounds?houseEdit?.entry:undefined),
    doorWidth:opening?.w,
    rooms:wing?house.wingLevels?.[0]?.rooms:house.levels?.[floor]?.rooms,
    bridgeDoor:floor===1?house.bridgeDoor:null,sideAccess,section:wing||house.annex?'wing':'main',
    obstacles:floor===0&&!wing?house.attic?.posts:undefined,partCount:()=>a.parts.length,heightLimit})
  interior.building=house.id
  interiors.push(interior)
}

function finishAttic(a,house,options,design,palette,interiors) {
  const {attic}=house
  const {floor,y,base,room,stair,guards,headroom}=attic
  a.context({floor,role:'floor',cut:false,section:house.label+' · чердак'})
  a.addModule(house.id+'-attic','Чердак',base)
  buildAtticDeck(a,attic,palette[1])
  if(guards.length) {
    a.context({role:'stairGuard'})
    a.step('Оградите лестничный проём чердака')
    for(const guard of guards) a.add('4083',guard.x,y,guard.z,palette[2],guard.w===1?90:0)
  }
  a.context({role:'interior'})
  const localDesign={...design,spacePlan:1,layout:design.houseEdits?.[house.id]?.floors?.[floor]?.layout??design.layout}
  const interior=furnishInterior({add:a.add,put:a.put,step:a.step,bounds:room,baseY:y,floor,
    options:{...options,type:house.type},design:localDesign,trim:palette[1],stair:[stair],attic:true,
    obstacles:guards,partCount:()=>a.parts.length,heightLimit:headroom})
  interiors.push({...interior,building:house.id})
}

function chamferedHouse(a,house,options,design,[wall,trim,frame,roof,accent,glass],interiors,entrySide) {
  const {bounds:b}=house,{x0,x1,z0,z1}=b
  const cut=Math.min(house.clip??3,Math.floor((Math.min(x1-x0,z1-z0)-4)/2))
  const span=(box,clip,z)=>Math.max(0,clip-Math.min(z-box.z0,box.z1-1-z))
  const inner={x0:x0+1,x1:x1-1,z0:z0+1,z1:z1-1}
  const door=entrySide===undefined?x0+Math.floor((x1-x0-4)/2):entrySide?x1-cut-4:x0+cut
  const window=z0+cut+1
  for(let row=0;row<7;row++) {
    const y=3+row*3
    a.step(row===0?'Сложите цоколь со скошенными углами':'Соберите стены хижины · ряд '+(row+1))
    for(let z=z0;z<z1;z++) {
      const slope=span(b,cut,z)
      const inset=span(inner,Math.max(0,cut-1),z)
      let start=x0+slope
      const end=x1-slope
      const solid=x=>{
        if(z>z0&&z<z1-1&&x>=inner.x0+inset&&x<inner.x1-inset) return false
        if(z===z0&&row<6&&x>=door&&x<door+4) return false
        return !(row>=2&&row<4&&z>=window&&z<window+2&&(x===x0||x===x1-1))
      }
      for(let x=start;x<end;) {
        if(!solid(x)) {x++;continue}
        let w=1
        while(x+w<end&&solid(x+w)) w++
        a.context({role:'wall',cut:z===z0||x===x1-1})
        a.strip('brick',x,y,z,w,row===0||row===6?trim:wall,false,row%2===1)
        x+=w
      }
    }
    if(row===0) {
      a.context({role:'wall',cut:true})
      const mount=a.add('60596',door,y,z0,'black')
      a.add('92589',door,y,z0,'black',0,mount)
    }
    if(row===2) for(const x of [x0,x1-1]) {
      a.context({role:'wall',cut:x===x1-1})
      const mount=a.add('60592',x,y,window,frame,90)
      a.add('60601',x,y,window,glass,90,mount)
    }
  }
  finishFloor(a,house,options,design,{...b,x0:x0+cut-1,x1:x1-cut+1,z1:z1-1},3,0,null,
    [wall,trim,frame,roof,accent,glass],interiors,21)
  a.context({role:'roof',floor:1,cut:false,section:house.label+' · крыша'})
  a.addModule(house.id+'-roof','Съёмная коническая крыша',24)
  if(house.roof!=='octagonal') {
    buildReferenceRoof(a,house,24,[wall,trim,frame,roof,accent,glass],design,gable)
    return
  }
  const courses=Math.min(3,Math.floor((Math.min(x1-x0,z1-z0)-5)/2)+1)
  let y=24
  for(let inset=0;inset<courses;inset++) {
    const tier={x0:x0+inset,x1:x1-inset,z0:z0+inset,z1:z1-inset}
    const clip=Math.min(cut,Math.floor((Math.min(tier.x1-tier.x0,tier.z1-tier.z0)-2)/2))
    a.step('Перевяжите пластины ската · пояс '+(inset+1))
    for(let z=tier.z0;z<tier.z1;z++) {
      const offset=span(tier,clip,z)
      a.strip('plate',tier.x0+offset,y,z,tier.x1-tier.x0-2*offset,roof)
    }
    for(let x=tier.x0;x<tier.x1;x++) {
      const offset=Math.max(0,clip-Math.min(x-tier.x0,tier.x1-1-x))
      a.strip('plate',x,y+1,tier.z0+offset,tier.z1-tier.z0-2*offset,inset===0?frame:roof,true,true)
    }
    if(inset===0) {
      // Shift the joints in both directions across the four layers of the eave.
      for(let z=tier.z0;z<tier.z1;z++) {
        const offset=span(tier,clip,z)
        a.strip('plate',tier.x0+offset,y+2,z,tier.x1-tier.x0-2*offset,roof,false,true)
      }
      for(let x=tier.x0;x<tier.x1;x++) {
        const offset=Math.max(0,clip-Math.min(x-tier.x0,tier.x1-1-x))
        a.strip('plate',x,y+3,tier.z0+offset,tier.z1-tier.z0-2*offset,roof,true)
      }
    }
    y+=inset===0?4:2
  }
  const lastWidth=Math.min(x1-x0,z1-z0)-2*(courses-1)
  const lastClip=Math.min(cut,Math.floor((lastWidth-2)/2))
  const crownInset=courses-1+Math.ceil(lastClip/2)
  const crown={x0:x0+crownInset,x1:x1-crownInset,z0:z0+crownInset,z1:z1-crownInset}
  buildReferenceRoof(a,{...house,bounds:crown,roof:'hip',eaves:false,recipe:{...house.recipe,detail:'frame'}},
    y,[wall,roof,roof,roof,accent,glass],design,gable)
}

function buildHouse(a,house,options,design,palette,interiors,colorset,facade=palette,facadeSet=colorset) {
  const {bounds,reverse,wing,tower,pier}=house
  const [wall,trim,frame,roof]=palette
  const recipe=house.recipe
  const customFacade=design.houseEdits?.[house.id]?.facade
  const facadeRecipe=customFacade&&recipe?{...recipe,facade:customFacade}:recipe
  const entrySide=design.houseEdits?.[house.id]?.entry
  const withAttic=design.houseEdits?.[house.id]?.attic??design.atticPlan
  a.context({building:house,reverse,elevation:house.elevation??0,module:'ground',floor:0,section:house.label,role:'wall',cut:false})
  if(house.roof==='aframe') {
    const width=bounds.x1-bounds.x0
    const knee=width>=16?2:width>=12?3:4
    const doorX=bounds.x0+Math.floor((width-4)/2)
    const inset=width>=17?4:width>=13?3:2
    const interiorBounds={...bounds,x0:bounds.x0+inset,x1:bounds.x1-inset}
    if(withAttic) house.attic=planAttic(house,{
      x0:interiorBounds.x0+1,x1:interiorBounds.x1-1,z0:bounds.z0+1,z1:bounds.z1-1
    },{cabin:true,roofY:18,lowerY:3,arrival:{x:doorX,z:bounds.z0+1,w:4,d:1},layout:design.layout})
    if(house.attic) buildAtticPosts(a,house.attic,3,trim)
    finishFloor(a,house,options,design,interiorBounds,3,0,house.attic?[house.attic.stair]:null,
      palette,interiors,house.attic?Math.min((knee+inset)*3,15):(knee+inset)*3)
    if(house.attic) {
      buildStaircase(a,house.attic.stair,3,house,palette)
      finishAttic(a,house,options,design,palette,interiors)
      a.context({module:'ground',floor:0,section:house.label})
    }
    if(house.cabin) {
      buildSteepChalet(a,house,facade,roof)
      return
    }
    gable(a,bounds,3+knee*3,[...facade.slice(0,3),roof],{cabin:true,doorX,knee,alternating:Boolean(recipe),
      roofModule:recipe?house.id+'-roof':null})
    return
  }
  const rows=tower?6:8+(!colorset&&house.tall?1:0)
  const landing=3+rows*3
  const stair=!colorset&&house.floors===2?{x:bounds.x1-3,z:bounds.z1-1-rows,w:2,d:rows}:null
  const stairs=house.stairs??(colorset?Array.from({length:house.floors-1},(_,floor)=>planStair(bounds,design,house,floor)):null)
  if(stairs) house.stairs=stairs
  if(withAttic&&recipe&&stairs&&!tower&&house.shape!=='chamfer') {
    const lower=house.topBounds??bounds
    const last=stairs.at(-1)
    const opening=houseOpening(house,design)
    const roofY=landing+(house.floors-1)*26
    house.attic=planAttic(house,lower,{roofY,lowerY:roofY-rows*3,
      arrival:last?.exit??{x:opening.x,z:bounds.z0+1,w:opening.w,d:1},
      blocked:last?[last,...(last.guard?[last.guard]:[])]:[],layout:design.layout})
  }
  const interiorStairs=house.attic?[...stairs,house.attic.stair]:stairs??stair
  const joinZ=wing?Math.min(wing.z1,bounds.z0+5)-3:null
  const offset=wing?joinZ-bounds.z0-1:null
  const linkWing=wing&&offset>=1&&joinZ>=wing.z0+2&&joinZ+3<wing.z1&&joinZ+3<bounds.z1
  const linked=linkWing&&house.shape!=='chamfer'
  const terraceAccess=linked&&!house.wingRoof&&(colorset?house.floors>1:house.floors===2)&&wing.x1-wing.x0>=5
  if(linked) house.passage={side:house.wingSide,z:joinZ}
  if(house.shape==='chamfer') chamferedHouse(a,house,options,design,[...facade.slice(0,3),roof,...facade.slice(4)],interiors,entrySide)
  else {
    shell(a,bounds,{y:3,rows,palette:facade,doorSide:design.entry,windowStyle:house.windowStyle,reverse,entrySide,type:house.type,
      sideDoor:linked?{side:house.wingSide,offset}:null,detail:design.form%2===0,
      treatment:colorset?house.style:null,variant:design.form+house.colorIndex,recipe:facadeRecipe,
      entryPosition:house.entry,programLevel:house.levels?.[0]})
    finishFloor(a,house,options,design,bounds,3,0,interiorStairs,palette,interiors,rows*3)
  }
  if(stair) stairFlight(a,stair,3)
  if(stairs?.length) {
    if(stairs[0].entry) buildStaircase(a,stairs[0],3,house,palette)
    else buildStair(a,stairs[0],3,house.style)
  }
  if(house.attic&&house.floors===1) buildStaircase(a,house.attic.stair,3,house,palette)

  if(wing) {
    a.context({module:'ground',role:'wall',floor:0,section:house.label+' · крыло'})
    const wingPalette=[trim,wall,frame,roof,...palette.slice(4)]
    const wingFacade=[facade[1],facade[0],...facade.slice(2)]
    const wingRows=house.wingRows??6
    shell(a,wing,{y:3,rows:wingRows,palette:wingFacade,frontDoor:wing.x1-wing.x0>=6,doorSide:1-design.entry,windowStyle:house.windowStyle,
      sideDoor:linked?{side:house.wingSide==='left'?'right':'left',offset:joinZ-wing.z0-1}:null,
      treatment:recipe?house.style:null,recipe:facadeRecipe,entryPosition:house.wingLevels?0.5:undefined,programLevel:house.wingLevels?.[0]})
    finishFloor(a,house,options,{...design,layout:1-design.layout},wing,3,0,null,wingPalette,interiors,wingRows*3)
    a.context({role:'roof',floor:1})
    if(house.wingRoof) {
      const roofY=3+wingRows*3
      a.addModule(house.id+'-wing-roof','Съёмная крыша крыла',roofY)
      buildReferenceRoof(a,{...house,attic:null,bounds:wing,roof:roofForBounds(house.wingRoof,wing),
        recipe:{...facadeRecipe,detail:'frame'}},roofY,wingPalette,design,gable)
    } else {
      a.addModule(house.id+'-terrace','Терраса крыла',21)
      a.step('Соберите перекрытие крыла и ограждение террасы')
      roofDeck(a,wing,21,wingPalette)
      const fence=colorset?['19121','3185','30055','4083'][design.form%4]:'15332'
      if(wing.x1-wing.x0>=4) a.add(fence,wing.x0,23,wing.z0,frame)
      const outer=house.wingSide==='left'?wing.x0:wing.x1-1
      for(let z=wing.z0+1;z+4<wing.z1;z+=4) a.add('3633',outer,23,z,frame,90)
      const x=house.wingSide==='left'?wing.x1-2:wing.x0,z=wing.z0+1
      a.add(colorset?'92947':'3941',x,23,z,'brown')
      if(colorset) {
        a.add('4032a',x,26,z,'darkTan')
        a.add('33291',x,27,z,'leafGreen')
        a.add('24866',x,28,z,'pink')
        a.add('32607',x+1,27,z+1,'leafGreen',180)
      } else a.put('tile',x,26,z,2,2,'tan')
      if(terraceAccess) {
        a.step('Соберите ступени от террасы к верхнему этажу')
        const nearest=house.wingSide==='left'?wing.x1-1:wing.x0
        const outward=house.wingSide==='left'?-1:1
        a.put('brick',nearest+outward,23,joinZ,1,2,'brown')
        a.put('tile',nearest+outward,26,joinZ,1,2,'tan')
        for(let y=23;y<29;y+=3) a.put('brick',nearest,y,joinZ,1,2,'brown')
        a.put('tile',nearest,29,joinZ,1,2,'tan')
      }
    }
  }
  if(house.shape==='chamfer') return
  if(tower) {
    a.context({role:'wall',floor:0,module:'ground',section:house.label+' · башня'})
    const towerRows=house.towerRows??12
    const towerTop=3+towerRows*3
    shell(a,tower,{y:3,rows:towerRows,palette:facade.slice(0,4),frontDoor:false})
    a.context({role:'roof',floor:1})
    a.addModule(house.id+'-tower-roof','Крыша башни',towerTop)
    a.step('Соберите крышу башни')
    roofDeck(a,tower,towerTop,palette)
    for(let z=tower.z0;z+1<tower.z1;z+=2) {
      a.add('3039',tower.x0,towerTop+2,z,roof,90)
      a.add('3039',tower.x1-2,towerTop+2,z,roof,270)
    }
    if(tower.x1-tower.x0===5) a.strip('plate',tower.x0+2,towerTop+2,tower.z0,tower.z1-tower.z0,roof,true)
    a.context({module:'ground',floor:0,role:'site',section:'Деревянный причал'})
    a.step('Поставьте береговые столбики причала')
    for(const x of [pier.x0,pier.x1-1]) {
      for(let z=pier.z0;z<pier.z1;z+=2) {
        a.add('3062b',x,3,z,'brown')
        a.add('98138',x,6,z,'darkTan')
      }
    }
  }

  let roofY=landing
  for(const [floor,lower] of (stairs??[]).entries()) {
    const upper=floor+1
    const base=landing+floor*26
    const story=facadePalette(colorset,upper,house.floors)
    const storyBounds=upper===house.floors-1?house.topBounds??bounds:bounds
    const label=(upper+1)+'-й этаж'
    a.context({floor:upper,role:'floor',section:house.label+' · '+label})
    a.addModule(house.id+'-floor-'+upper,label,base)
    a.step('Перевяжите перекрытие вокруг лестничного проёма')
    floorWithWell(a,bounds,base,lower,story[1])
    shell(a,storyBounds,{y:base+2,rows:8,palette:facadePalette(facadeSet,upper,house.floors),frontDoor:false,detail:house.style!=='modern',
      windowStyle:house.windowStyle,reverse,treatment:house.style,floor:upper,variant:design.form+house.colorIndex,recipe:facadeRecipe,
      sideDoor:upper===1?(house.bridgeDoor??(terraceAccess?{side:house.wingSide,offset}:null)):null,programLevel:house.levels?.[upper]})
    finishFloor(a,house,options,design,storyBounds,base+2,upper,interiorStairs,story,interiors)
    if(lower.entry) addStairGuard(a,lower,base+2,story[2])
    if(stairs[upper]?.entry) buildStaircase(a,stairs[upper],base+2,house,story)
    else if(stairs[upper]) buildStair(a,stairs[upper],base+2,house.style)
    else if(house.attic) buildStaircase(a,house.attic.stair,base+2,house,story)
    roofY=base+26
  }
  if(stair) {
    a.context({floor:1,role:'floor',section:house.label+' · верхний этаж'})
    a.addModule(house.id+'-upper','Верхний этаж',landing)
    a.step('Перевяжите перекрытие вокруг лестничного проёма')
    walkingFloor(a,bounds,landing,stair,'darkTan')
    const upperRows=7+(design.form+house.colorIndex)%2
    shell(a,bounds,{y:landing+2,rows:upperRows,palette:facade,frontDoor:false,detail:true,windowStyle:house.windowStyle,
      sideDoor:terraceAccess?{side:house.wingSide,offset}:null})
    finishFloor(a,house,options,design,bounds,landing+2,1,stair,palette,interiors)
    roofY=landing+2+upperRows*3
  }

  if(house.attic) {
    finishAttic(a,house,options,design,palette,interiors)
    roofY=house.attic.y
  }
  a.context({floor:house.floors,role:'roof',cut:false,section:house.label+' · крыша'})
  a.addModule(house.id+'-roof','Крыша',roofY)
  if(recipe) {
    buildReferenceRoof(a,house.topBounds?{...house,bounds:house.topBounds}:house,roofY,palette,design,gable)
    return
  }
  a.step('Свяжите пластины съёмной крыши')
  roofDeck(a,bounds,roofY,palette)
  if(house.roof==='gable') {
    const steep=Boolean(colorset)&&house.style==='old'
    const across=steep?bounds.x1-bounds.x0<=bounds.z1-bounds.z0:!tower&&(design.form+house.colorIndex)%3!==0
    gable(a,bounds,roofY+2,palette,{across,steep})
  } else if(bounds.x1-bounds.x0>=6&&bounds.z1-bounds.z0>=6) {
    a.step('Поставьте парапет и кровельное оборудование')
    for(const z of [bounds.z0,bounds.z1-1]) a.strip('brick',bounds.x0,roofY+2,z,bounds.x1-bounds.x0,trim)
    for(const x of [bounds.x0,bounds.x1-1]) a.strip('brick',x,roofY+2,bounds.z0+1,bounds.z1-bounds.z0-2,trim,true)
    a.put('brick',bounds.x0+2,roofY+2,bounds.z0+2,2,2,'gray')
    a.add(colorset?'4150':'2412b',bounds.x0+2,roofY+5,bounds.z0+2,'black')
    if(colorset&&bounds.x1-bounds.x0>=8) {
      for(let x=bounds.x0+1;x+4<bounds.x1;x+=4) {
        a.add('93273',x,roofY+5,bounds.z0,palette[4],90)
      }
    }
  }
}

function applyColors(parts,joins,options,detailed,houseEdits,houses) {
  const usedStuds=new Set(joins.map(([support])=>support))
  const alternativeColors=new Map()
  const byId=new Map(houses.map(house=>[house.id,house]))
  for(const [index,p] of parts.entries()) {
    const localFlooring=houseEdits?.[p.building]?.floors?.[p.floor]?.flooring
    const house=localFlooring&&byId.get(p.building)
    const inside=house&&[house.bounds,house.wing,house.tower].some(box=>box&&p.x>=box.x0&&p.x+p.w<=box.x1&&p.z>=box.z0&&p.z+p.d<=box.z1)
    const floorSurface=(p.y===2&&p.role==='site')||(p.role==='floor'&&p.y>3)||
      (inside&&p.role==='site'&&p.y===2+(house.elevation??0))
    const tile=floorSurface&&p.kind==='plate'&&!usedStuds.has(index)&&sizeId('tile',p.w,p.d)
    const flooring=inside||p.role==='floor'?localFlooring??options.flooring:options.flooring
    const tiled=flooring==='tiled'||(flooring==='mixed'&&(p.x+p.z)%3===0)
      ||(flooring==='auto'&&options.style==='modern'&&p.x%3===0)
    if(tile&&tiled) {p.id=tile;p.kind='tile'}
    const preferred=p.color
    if(!availability[p.id]?.[inventoryColor(preferred)]) {
      const key=p.id+'/'+preferred
      if(!alternativeColors.has(key)) {
        const target=colors[preferred][1]
        const distance=color=>{
          const value=colors[color][1]
          return [0,8,16].reduce((sum,shift)=>sum+(((target>>shift)&255)-((value>>shift)&255))**2,0)
        }
        const all=Object.keys(colors).filter(color=>availableColor(p.id,color))
        const allowed=detailed
          ? all.filter(color=>isTransparent(color)===isTransparent(preferred))
          : all.filter(color=>color!=='glass'&&Object.hasOwn(legacyColors,color))
        if(!allowed.length) allowed.push(...all)
        const tinted=detailed&&preferred!=='glass'&&isTransparent(preferred)
        const clearRank=color=>Number(tinted&&color==='glass')
        allowed.sort((a,b)=>clearRank(a)-clearRank(b)||distance(a)-distance(b))
        alternativeColors.set(key,allowed[0])
      }
      p.color=alternativeColors.get(key)
    }
    p.element=availability[p.id]?.[inventoryColor(p.color)]
    if(!p.element) throw new Error('Нет цвета для '+p.id)
  }
}

export function buildScene(options,variant) {
  const {design}=variant
  const detailed=variant.version>=6
  const reference=referenceByNumber.get(design.reference)
  const source=variant.version>=7
    ? referenceRecipe(reference??referenceByNumber.get({old:'21325',modern:'60380',coastal:'21359'}[options.style])):null
  const direction=architectureDirection(design.direction)
  const recipe=source&&direction&&!design.referenceDetail?{...source,key:undefined,textures:[],
    detail:{old:'chimney',modern:'vents',coastal:'planters'}[direction.theme]}:source
  const plan=scenePlan(options,design,reference,detailed,recipe,variant.version>=8)
  const layout=referenceLayout(design.referenceLayout)
  const form=buildingForm(design.formProfile)
  const finish=facadeStyle(design.styleProfile)
  const a=createAssembly(options,design.exteriorDetail?plan:null,design.exteriorDetail)
  const interiors=[]
  const sets=detailed?plan.houses.map((house,index)=>{
    const facade=house.recipe?.finish??(design.typeFinish?null:finish)
    const swatches=design.exteriorDetail&&design.blueprint?architecturalPalettes:legoPalettes
    const base=facade?.palette??swatches[house.style][(design.palette+house.colorIndex)%6]
    const pinned=options.facadeStyle||design.typeFinish||direction&&!options.reference?facade?.palette:
      (design.referenceDetail?layout?.detailPalette:undefined)??layout?.palette??layout?.palettes?.[index%layout.palettes.length]
    return pinned??(house.recipe?paletteForRecipe(base,house.recipe,design):base)
  }):null
  const siteUse=buildSite(a,options,plan,design,sets?.map((set,index)=>facadePalette(set,0,plan.houses[index].floors)))
  if(plan.skybridge) buildSkybridge(a,plan.skybridge)
  for(const [index,house] of plan.houses.entries()) {
    house.label=plan.houses.length===1?'Дом':'Дом '+(index+1)
    house.windowStyle=detailed
      ? house.recipe?.facade==='timber'?'lattice':house.style==='modern'?'tall':(design.form+index)%4===0?'lattice':house.type==='home'?'small':'tall'
      : (index===0&&reference?profiles[reference.profile].window:null)??(house.type==='home'?'small':'tall')
    const local=styleColors[house.style][(design.palette+house.colorIndex)%4]
    const set=sets?.[index]
    const colorset=set?facadePalette(set,0,house.floors)
      : reference&&index===0?paletteFromReference(reference,legacyColors,inventoryColor,local,design.palette%2):[...local]
    if(design.scheme==='cabin') {
      if(['white','gray','lightBlue'].includes(colorset[0])) colorset[0]='brown'
      if(['tan','yellow','white'].includes(colorset[3])) colorset[3]='dark'
    }
    const facadeIndex=design.houseEdits?.[house.id]?.palette
    const facadeBase=detailed&&facadeIndex!==undefined?legoPalettes[house.style][(facadeIndex+house.colorIndex)%6]:null
    const facadeSet=facadeBase&&house.recipe?paletteForRecipe(facadeBase,house.recipe,design):facadeBase??set
    const facade=facadeIndex===undefined?colorset
      :facadeSet?facadePalette(facadeSet,0,house.floors):styleColors[house.style][(facadeIndex+house.colorIndex)%4]
    buildHouse(a,house,options,design,colorset,interiors,set,facade,facadeSet)
  }
  a.context({module:'ground',section:'Завершение'})
  a.step('Установите съёмные модули на места')
  applyColors(a.parts,a.joins,options,detailed,design.houseEdits,plan.houses)
  const title=design.blueprint?.title??(design.referenceForm?undefined:form?.label)??layout?.label??massings[design.massing]?.label??streetPlans[design.streetPlan]??schemes[design.scheme]
  return {version:variant.version,options,variant,parts:a.parts,steps:a.steps,joins:a.joins,modules:a.modules,
    houses:plan.houses,streets:plan.streets,skybridge:plan.skybridge,interiors,reference,referenceLayout:layout,form,finish,direction,title,
    siteUse,blueprint:design.blueprint,
    referenceFit:layout?{wing:!layout.wing||Boolean(plan.houses[0].wing),floors:Math.max(...plan.houses.map(house=>house.floors)),
      bridge:reference?.number!=='60380'||Boolean(plan.skybridge)}:undefined,
    scheme:design.scheme,streetPlan:design.streetPlan}
}

export function lotSilhouette(model) {
  const {width,depth}=model.options
  const heights=new Uint16Array(width*depth)
  for(const p of model.parts) {
    if(p.role!=='roof'&&p.role!=='wall') continue
    const top=p.y+p.h
    for(let z=p.z;z<p.z+p.d;z++) for(let x=p.x;x<p.x+p.w;x++) {
      const i=z*width+x
      if(top>heights[i]) heights[i]=top
    }
  }
  const side=8
  const plan=[], front=[]
  for(let j=0;j<side;j++) for(let i=0;i<side;i++) {
    const left=Math.floor(i*width/side),right=Math.floor((i+1)*width/side)
    const near=Math.floor(j*depth/side),far=Math.floor((j+1)*depth/side)
    let filled=0, sum=0
    for(let z=near;z<far;z++) for(let x=left;x<right;x++) {
      const h=heights[z*width+x]
      filled+=+(h>0)
      sum+=h
    }
    const cells=(right-left)*(far-near)
    plan.push(String(Math.min(9,Math.round(filled*9/cells))))
    front.push(String(Math.min(9,Math.round(sum/(cells*7)))))
  }
  for(let i=0;i<side;i++) {
    let peak=0
    for(let x=Math.floor(i*width/side);x<Math.floor((i+1)*width/side);x++) {
      for(let z=0;z<depth;z++) peak=Math.max(peak,heights[z*width+x])
    }
    front.push(String(Math.min(9,Math.round(peak/7))))
  }
  return plan.join('')+front.join('')
}

export function silhouetteDistance(a,b) {
  if(!a||!b||a.length!==b.length) return 1
  let diff=0,total=0
  for(let i=0;i<a.length;i++) {
    diff+=Math.abs(Number(a[i])-Number(b[i]))
    total+=Math.max(Number(a[i]),Number(b[i]))
  }
  return total?diff/total:0
}
