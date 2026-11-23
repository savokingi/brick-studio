import { build as legacyBuild, editVariant as legacyEdit } from './legacy-generator.js'
import { build as modularBuild, editVariant as modularEdit } from './modular-v2.js'
import {fitsRoomPlan,furnishInterior} from './interiors.js'
import { referenceByNumber, profiles, selectReference, paletteFromReference, frontExtension, roofLandmark } from './architecture.js'
import { catalog, colors, legacyColors, sizeId, inventoryColor } from './catalog.js'
import availability from './availability.json' with {type:'json'}
import {buildScene,lotSilhouette,massingChoices,schemes,schemeForReference,silhouetteDistance,streetChoices} from './scene.js'
import {referenceRecipe} from './reference-architecture.js'
import {referenceLayout} from './reference-layouts.js'
import {buildingForm,buildingForms,facadeStyle,facadeStyles} from './architecture-options.js'
import {architectureDirection,architectureDirections} from './architecture-directions.js'
import {roofForBounds} from './reference-roofs.js'
import {planStaircases,stairBlocksPassage,stairKindsFor} from './stairs.js'
import {applyStockSwaps,compareStock} from './collection.js'
import {buildOwnedScene,ownedPlans} from './stock-builder.js'
import {rankedStockFamilies,stockPlanner} from './stock-structures.js'
import {validateSitePlan} from './site-plan.js'
import {buildingType,types} from './building-types.js'
import {architecturalPlans} from './architectural-plan.js'
export {colors,types}
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
  const dimension=value=>Math.min(48,Math.max(12,Math.round(Number(value)||24)))
  const form=buildingForm(options.buildingForm)
  const finish=facadeStyle(options.facadeStyle)
  const direction=architectureDirection(options.direction)
  const baseStyle=Object.hasOwn(styles,options.direction)?options.direction:options.style
  const mode=form?.scheme==='street'?'street':form&&options.mode==='street'?'city':
    ['solo','street'].includes(options.mode)?options.mode:'city'
  const architecture=form?.scheme??(mode==='street'?'street':Object.hasOwn(schemes,options.architecture)?options.architecture:'')
  const street=mode==='street'||architecture==='street'
  const width=Math.max(form?.street==='double'?27:street?24:form?.branches?22:form?.wing?16:12,dimension(options.width))
  const depth=Math.max(form?.street==='double'?32:street?18:form?.wing?16:12,dimension(options.depth))
  const preferences={}
  const limit=Math.round(Number(options.partLimit))
  if(limit>=200&&limit<=15000) preferences.partLimit=limit
  if(street&&Array.isArray(options.sitePlan)&&options.sitePlan.some(zone=>zone?.kind==='house')&&!validateSitePlan(options.sitePlan,width,depth)) {
    preferences.sitePlan=options.sitePlan.map(({kind,x,z,w,d})=>({kind,x,z,w,d}))
  }
  if(roofChoices.includes(options.photoRoof)) preferences.photoRoof=options.photoRoof
  if(['dense','open'].includes(options.photoRhythm)) preferences.photoRhythm=options.photoRhythm
  if(Number.isInteger(options.photoPalette)&&options.photoPalette>=0&&options.photoPalette<=5) preferences.photoPalette=options.photoPalette
  if(form) preferences.buildingForm=options.buildingForm
  if(finish) preferences.facadeStyle=options.facadeStyle
  if(direction) preferences.direction=options.direction
  return { width, depth, type:Object.hasOwn(types,options.type)?options.type:'bakery',
    style:finish?.theme??direction?.theme??(Object.hasOwn(styles,baseStyle)?baseStyle:'old'), mode,architecture,
    floors:Math.min(5,Math.max(1,Math.round(Number(options.floors)||2))),
    flooring:['studs','mixed','tiled'].includes(options.flooring)?options.flooring:'auto',
    reference: referenceByNumber.has(options.reference)?options.reference:'',
    streetLayout:preferences.sitePlan?'custom':streetChoices({width,depth}).includes(options.streetLayout)?options.streetLayout:'',
    ...preferences }
}

const automaticFields=['width','depth','type','mode','direction','floors']

export function generationRequest(options) {
  const auto=automaticFields.filter(name=>options[name]==='auto')
  const streetRequest=options.mode==='auto'&&(options.sitePlan||options.streetLayout)
  const request=normalize({...options,mode:streetRequest?'street':options.mode,
    width:options.sitePlan&&options.width==='auto'?48:options.width,
    depth:options.sitePlan&&options.depth==='auto'?48:options.depth})
  const maximumWidth=options.width==='auto'?48:request.width
  const maximumDepth=options.depth==='auto'?48:request.depth
  if(streetChoices({width:maximumWidth,depth:maximumDepth}).includes(options.streetLayout)) {
    request.streetLayout=options.streetLayout
  }
  for(const name of auto) request[name]='auto'
  return request
}

export function resolveGenerationOptions(request,seed,previous) {
  const proposed={...request}
  const roll=random(seed)
  const pick=values=>values[Math.floor(roll()*values.length)]
  const form=buildingForm(request.buildingForm)
  const reference=referenceByNumber.get(request.reference)
  const limit=request.partLimit??Infinity
  const forcedMode=form?.scheme==='street'||request.architecture==='street'||request.sitePlan||
    request.streetLayout||reference&&schemeForReference(reference)==='street'?'street':
    form||request.architecture||reference?'solo':null
  if(request.mode==='auto') {
    const streetFits=limit>=1100&&(request.width==='auto'||request.width>=24)&&(request.depth==='auto'||request.depth>=18)
    proposed.mode=forcedMode??previous?.mode??pick(streetFits?['city','solo','street']:['city','solo'])
  }
  if(request.type==='auto') proposed.type=reference?.type??previous?.type??pick(Object.keys(types))
  if(request.direction==='auto') {
    const finish=facadeStyle(request.facadeStyle)
    proposed.style=finish?.theme??reference?.style??previous?.style??pick(Object.keys(styles))
    const matching=Object.entries(architectureDirections).filter(([,direction])=>direction.theme===proposed.style)
    proposed.direction=reference||finish?'':previous?previous.direction??'':pick(['',...matching.map(([id])=>id)])
  }

  const street=proposed.mode==='street'||forcedMode==='street'
  const double=request.streetLayout==='double'||form?.street==='double'
  const siteSize=name=>Math.max(0,...(request.sitePlan??[]).map(zone=>
    (name==='width'?zone.x+zone.w:zone.z+zone.d)+Number(zone.kind==='house')))
  function chooseDimension(name,sizes,minimum,other){
    if(request[name]!=='auto') return
    const required=Math.max(minimum,siteSize(name))
    const targets=sizes.filter(size=>size>=required&&size*(Number(other)||size)<=limit*0.48)
    proposed[name]=Math.max(required,previous?.[name]??(targets.length?pick(targets):required))
  }
  chooseDimension('width',street?[24,28,32,36,40,48]:[12,16,20,24,28,32,40],
    double?27:street?24:form?.branches?22:form?.wing?16:12,request.depth)
  chooseDimension('depth',street?[18,24,28,32,36,40,48]:[12,16,20,24,28,32,40],
    double?32:street?18:form?.wing?16:12,proposed.width)

  if(request.floors==='auto') {
    const compact=proposed.width<16||proposed.depth<16||limit<650
    const singleFloor=form?.scheme==='cabin'||form?.scheme==='wharf'||['cabin','wharf'].includes(proposed.architecture)
    const tall=['home','hotel','apartment','office'].includes(proposed.type)&&proposed.width>=26&&proposed.depth>=24
    proposed.floors=singleFloor||compact?1:previous?.floors??pick(tall?[2,3,4]:[1,2,3])
  }
  return normalize(proposed)
}

const referenceForms={
  alpine:'deep-lodge',fishing:'fishing-pier',cottage:'l-front',manor:'manor',gothic:'l-rear',
  nordic:'u-rear',conservatory:'greenhouse-wing',modernHouse:'terraced-wing',factory:'workshop-wing',
  estate:'manor',crooked:'split-wings',lighthouse:'light-station',brownstones:'close-row',
  prehistoric:'u-front',tavern:'l-front',shipyard:'boat-workshop',apartment:'tower-cap',
  winter:'market-square',suburb:'corner-lot',bank:'atrium',bazaar:'stepped-mews',townSquare:'museum-square',
  downtown:'market-square',cityTower:'lantern-tower',apartmentRow:'high-street',station:'gallery-link',
  tram:'workshop-wing',hospital:'t-hall',municipal:'station-hall',depot:'workshop-wing',
  fireTower:'split-wings',patrol:'u-front',island:'harbor-office',garage:'terraced-wing',
  airport:'greenhouse-wing',observation:'gallery-link',barn:'l-rear'
}

function supportsForm(form,options,layouts) {
  return form&&options.width>=(form.branches?22:form.wing?16:12)&&options.depth>=(form.wing?16:12)&&
    (!form.street||layouts.includes(form.street))
}

function finishForReference(recipe,theme) {
  const named={alpine:'autumn-cabin',blacksmith:'blacksmith',modernHouse:'cullen',
    conservatory:'conservatory',downtown:'neon',riviera:'riviera'}
  const authored=named[recipe?.key]
  if(authored) return authored
  const compatible=Object.entries(facadeStyles).filter(([,style])=>style.facade===recipe?.facade)
  function score(style) {
    const [ground,upper,,,frame,roof]=style.palette
    const weight=(value,choices)=>choices.includes(value)?Math.max(1,6-choices.indexOf(value)):0
    return Number(style.theme===theme)*4+weight(ground,recipe.wallColors)*2+
      weight(upper,recipe.wallColors)+weight(frame,recipe.wallColors)*0.5+weight(roof,recipe.roofColors)
  }
  return compatible.sort((a,b)=>score(b[1])-score(a[1]))[0]?.[0]
}

export function newSceneVariant(options,history=[],{current,intent='generate',nextSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0]}={}) {
  const recent=history.filter(variant=>[5,6,7,8].includes(variant.version)&&!variant.stockOnly&&!variant.design?.ownedPlan)
  const signatures=new Set(recent.map(variant=>variant.signature))
  const previous=[5,6,7,8].includes(current?.version)&&!current.design.ownedPlan?current:recent.at(-1)
  const pinned=referenceByNumber.get(options.reference)
  const layout=referenceLayout(pinned?.number)
  const requestedForm=buildingForm(options.buildingForm)
  const direction=architectureDirection(options.direction)
  const streetMode=options.mode==='street'
  const fitsStreet=options.width>=24&&options.depth>=18
  const layouts=streetChoices(options)
  const programme=buildingType(options.type)
  const suitableForms=ids=>!pinned&&!requestedForm&&!options.photoRoof&&!options.sitePlan
    ?ids.filter(id=>{
      const form=buildingForm(id)
      if(!supportsForm(form,options,layouts)||options.architecture&&options.architecture!==form.scheme) return false
      if(form.scheme!=='street') return !streetMode
      return fitsStreet&&(options.mode!=='solo'||options.architecture==='street')&&
        (!options.streetLayout||options.streetLayout===form.street)
    }):[]
  const typeForms=suitableForms(programme?.forms??[])
  const directionForms=suitableForms(direction?.forms??[])
  const sharedForms=directionForms.filter(id=>typeForms.includes(id))
  const preferredForms=sharedForms.length?sharedForms:directionForms.length?directionForms:typeForms
  let best, bestDistance=-1, failure
  const attempts=options.partLimit?32:120
  for(let attempt=0;attempt<attempts;attempt++) {
    const seed=nextSeed(), rng=random(seed^0x7bd9f32)
    const choose=values=>values[Math.floor(rng()*values.length)]
    let reference=pinned||selectReference(options,recent,rng,undefined,{matchStyle:true})
    const preferred=schemeForReference(reference)
    let available=Object.keys(schemes).filter(scheme=>fitsStreet||scheme!=='street')
    if(options.floors>1&&options.depth>=18&&!pinned&&!options.architecture) {
      available=available.filter(scheme=>!['cabin','wharf'].includes(scheme))
    }
    const same=intent==='variation'&&(!pinned||previous?.design.reference===pinned.number)&&
      (!direction||previous?.design.direction===options.direction)?previous:null
    const newProfile=(ids,key,length)=>{
      if(ids.includes(same?.design[key])) return same.design[key]
      const recentIds=recent.slice(-length).map(variant=>variant.design[key])
      const alternatives=intent==='different'&&ids.length>1?ids.filter(id=>id!==previous?.design[key]):ids
      const fresh=alternatives.filter(id=>!recentIds.includes(id))
      return choose(fresh.length?fresh:alternatives)
    }
    const preferredForm=preferredForms.length?newProfile(preferredForms,'formProfile',6):undefined
    if(intent==='different'&&previous&&!streetMode) available=available.filter(scheme=>scheme!==previous.design.scheme)
    let scheme
    if(requestedForm) scheme=requestedForm.scheme
    else if(preferredForm) scheme=buildingForm(preferredForm).scheme
    else if(streetMode) scheme='street'
    else if(layout&&preferred!=='street') scheme=preferred
    else if(same&&available.includes(same.design.scheme)) scheme=same.design.scheme
    else if(intent==='different') scheme=choose(available)
    else if(options.architecture) scheme=options.architecture
    else if(pinned&&available.includes(preferred)) scheme=preferred
    else {
      const last=recent.slice(-2).map(variant=>variant.design.scheme)
      const fresh=available.filter(candidate=>!last.includes(candidate))
      scheme=fresh.includes(preferred)&&rng()<0.68?preferred:choose(fresh.length?fresh:available)
    }
    if(same&&!pinned) reference=referenceByNumber.get(same.design.reference)??reference
    if(!pinned&&!same&&scheme!==preferred) {
      const compatible=[...referenceByNumber.values()].filter(item=>schemeForReference(item)===scheme)
      reference=selectReference(options,recent,rng,compatible,{matchStyle:true})??reference
    }
    const recipe=referenceRecipe(reference)
    const composition=recipe?.composition
    const referenceForm=pinned&&!layout&&!recipe?.interiorOnly?referenceForms[recipe?.key]:undefined
    const proposed=buildingForm(referenceForm)
    const supportedReferenceForm=proposed?.scheme===scheme&&supportsForm(proposed,options,layouts)?referenceForm:undefined
    const seenForms=new Set(recent.slice(-6).map(item=>item.design.formProfile))
    const automatic=streetMode?!options.streetLayout:!options.architecture||intent==='different'
    const automaticForms=!pinned&&automatic&&!options.photoRoof&&!options.sitePlan&&options.width>=18&&options.depth>=18
      ?Object.entries(buildingForms).filter(([key,form])=>form.scheme===scheme&&!seenForms.has(key)&&
        supportsForm(form,options,layouts))
      :[]
    const sameForm=same?.design.formProfile
    const existingForm=buildingForm(sameForm)
    const formProfile=options.buildingForm||supportedReferenceForm||preferredForm||(existingForm?.scheme===scheme&&supportsForm(existingForm,options,layouts)?sameForm:
      automaticForms.length?choose(automaticForms)[0]:undefined)
    const plannedStreet=buildingForm(formProfile)?.street
    const streetPlan=options.sitePlan?'custom':scheme==='street'
      ? plannedStreet??(same&&layouts.includes(same.design.streetPlan)?same.design.streetPlan
        : options.streetLayout&&intent==='generate'?options.streetLayout
        : layout?.streetPlan&&intent==='generate'?layout.streetPlan
        : intent==='generate'&&['square','mews','row'].includes(composition)&&rng()<0.8?composition
        : choose(layouts.filter(value=>intent!=='different'||value!==previous?.design.streetPlan)))
      : ''
    const form=Math.floor(rng()*24)
    const design={...parameters(options,seed),scheme,streetPlan,reference:reference?.number,form,exteriorDetail:2}
    if(direction) design.direction=options.direction
    if(layout&&scheme===preferred) design.referenceLayout=pinned.number
    if(formProfile) design.formProfile=formProfile
    if(!options.buildingForm&&formProfile&&formProfile===supportedReferenceForm) design.referenceForm=true
    let styleProfile=options.facadeStyle
    if(!styleProfile&&pinned) styleProfile=finishForReference(recipe,options.style)
    if(!styleProfile&&direction) styleProfile=newProfile(direction.facades,'styleProfile',3)
    if(!styleProfile&&programme?.finishes) {
      const matching=programme.finishes.filter(id=>facadeStyle(id).theme===options.style)
      styleProfile=newProfile(matching.length?matching:programme.finishes,'styleProfile',3)
      design.typeFinish=true
    }
    if(!styleProfile&&formProfile&&!options.buildingForm) {
      const choices=Object.entries(facadeStyles).filter(([,style])=>style.theme===options.style)
      const recentStyles=new Set(recent.slice(-3).map(item=>item.design.styleProfile))
      const fresh=choices.filter(([key])=>!recentStyles.has(key))
      const matched=fresh.filter(([,style])=>style.facade===recipe?.facade)
      styleProfile=same?.design.styleProfile??choose(matched.length?matched:fresh.length?fresh:choices)[0]
    }
    if(styleProfile) design.styleProfile=styleProfile
    design.spacePlan=1
    design.atticPlan=1
    if(pinned) design.referenceDetail=1
    if(!pinned&&!formProfile) {
      const masses=massingChoices(options,scheme)
      const previousMass=recent.filter(item=>item.design.scheme===scheme).slice(-2).map(item=>item.design.massing)
      const fresh=masses.filter(kind=>!previousMass.includes(kind))
      const mass=same&&masses.includes(same.design.massing)?same.design.massing:choose(fresh.length?fresh:masses)
      if(mass) design.massing=mass
    }
    if(options.photoPalette!==undefined) design.palette=options.photoPalette
    if(options.photoRoof&&scheme!=='cabin') design.houseEdits={'house-1':{roof:options.photoRoof}}
    if(options.width*options.depth>=480) design.interiorPlan=1
    let signature=Object.values(design).join(',')
    if(signatures.has(signature)) continue
    let candidate={version:8,seed,design,signature}
    let model
    try {
      model=build(options,candidate)
      if(options.partLimit&&model.parts.length>options.partLimit) {
        design.exteriorDetail=0
        signature=Object.values(design).join(',')
        candidate={...candidate,signature}
        model=build(options,candidate)
      }
      if(design.interiorPlan&&options.partLimit&&model.parts.length>options.partLimit) {
        for(const interiorPlan of [2,0]) {
          design.interiorPlan=interiorPlan
          signature=Object.values(design).join(',')
          candidate={...candidate,signature}
          model=build(options,candidate)
          if(model.parts.length<=options.partLimit) break
        }
      }
      if(options.partLimit&&model.siteUse?.plots.length&&model.parts.length>options.partLimit) {
        design.siteDetails=0
        signature=Object.values(design).join(',')
        candidate={...candidate,signature}
        model=build(options,candidate)
      }
      if(options.partLimit&&model.houses.some(house=>house.attic)&&model.parts.length>options.partLimit) {
        design.atticPlan=0
        signature=Object.values(design).join(',')
        candidate={...candidate,signature}
        model=build(options,candidate)
      }
    }
    catch(error) {
      if(!layout&&!design.massing&&!design.formProfile&&!design.styleProfile) throw error
      failure=error
      continue
    }
    if(signatures.has(signature)) continue
    if(options.partLimit&&model.parts.length>options.partLimit) continue
    const silhouette=lotSilhouette(model)
    if(recent.some(item=>item.silhouette===silhouette&&(intent!=='variation'||item.signature===signature))) {
      // A compact plot may fit just one form. Keep the next facade usable on it.
      if(direction&&directionForms.length<=1&&intent==='generate'&&styleProfile!==recent.at(-1)?.design.styleProfile) {
        return {...candidate,silhouette}
      }
      continue
    }
    const compared=intent==='different'&&previous?[previous]:recent.slice(-5)
    const distance=Math.min(1,...compared.map(item=>silhouetteDistance(silhouette,item.silhouette)))
    if(distance>bestDistance) {
      best={...candidate,silhouette}
      bestDistance=distance
    }
    if(distance>=(intent==='variation'?0.035:0.14)) return best
    if(intent!=='different'&&attempt>=24&&best) return best
  }
  if(best) return best
  if(failure&&layout) throw Error('Эта форма пока не помещается на участке. Попробуйте увеличить ширину или длину.',{cause:failure})
  if(options.partLimit) throw new Error('Пока ни один вариант не вошёл в лимит деталей. Уменьшите участок или этажность.')
  throw new Error('Не удалось подобрать другой силуэт для этого участка.')
}
export function parameters(options,seed) {
  const rng=random(seed), roll=n=>Math.floor(rng()*n)
  return { palette:roll(6), entry:roll(2), roof:roll(3), cornice:roll(3),
    masonry:roll(3), window:roll(2), layout:roll(2), tables:1+roll(3),
    awning:roll(3), garden:roll(3), setback:options.depth>=24?roll(2):0,
    footprint:options.width>=24?roll(2):0, paving:roll(3), shelves:roll(3), floorPattern:roll(4) }
}

export function newArchitecturalModel(rawOptions,history=[],{current,intent='generate',stock,nextSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0]}={}) {
  const options=normalize(rawOptions)
  if(options.reference||options.buildingForm||options.photoRoof||['cabin','wharf'].includes(options.architecture)) {
    const model=build(options,newSceneVariant(options,history,{current,intent,nextSeed}))
    if(stock&&compareStock(inventory(model.parts),stock).missing) throw Error('Для этого проекта не хватает деталей.')
    return stock?{...model,variant:{...model.variant,stockOnly:true}}:model
  }

  const seed=nextSeed(), noise=random(seed)
  const plans=architecturalPlans(options)
  if(!plans.length) throw Error('На участке мало места для выбранной компоновки. Увеличьте участок или выберите автоматический план.')
  const key=[options.width,options.depth,options.type,options.floors,options.mode,options.architecture,options.streetLayout,
    JSON.stringify(options.sitePlan??[])].join('/')
  const past=history.filter(variant=>variant.version===9&&variant.design.blueprint?.key===key)
  const used=new Set(past.map(variant=>variant.design.blueprint.fingerprint))
  const silhouettes=new Set(past.map(variant=>variant.silhouette))
  const last=current?.design?.blueprint?.key===key?current:past.at(-1)
  if(last) used.add(last.design.blueprint.fingerprint)
  if(last?.silhouette) silhouettes.add(last.silhouette)
  const variation=intent==='variation'&&last
  const previousPlan=variation?(last.design.blueprint.volumes?last.design.blueprint:plans.find(plan=>
    plan.fingerprint===last.design.blueprint.fingerprint&&plan.band===last.design.blueprint.band&&plan.phase===last.design.blueprint.phase)):null
  const seenLayouts=new Map()
  for(const variant of past) {
    const layout=variant.design.blueprint.layout
    seenLayouts.set(layout,(seenLayouts.get(layout)??0)+1)
  }
  const previousOutlines=past.map(variant=>variant.design.blueprint.outline).filter(Boolean)
  const candidates=previousPlan?[previousPlan]:plans.filter(plan=>!used.has(plan.fingerprint)).map(plan=>({plan,
    rank:(seenLayouts.get(plan.layout)??0)*2+(intent==='different'&&plan.layout===last?.design.blueprint.layout?18:0)+
      Math.abs(plan.fit-0.53)*2+noise()*0.55-4*Math.min(1,...previousOutlines.map(outline=>silhouetteDistance(plan.outline,outline)))}))
    .sort((a,b)=>a.rank-b.rank).map(item=>item.plan)
  let failure
  const checked=new Set()
  for(const plan of stock?candidates.slice(0,10):candidates) {
    const signature=[key,plan.fingerprint,plan.band,plan.phase,seed].join('|')
    if(checked.has(signature)) continue
    checked.add(signature)
    const design={...parameters(options,seed),scheme:plan.scheme,streetPlan:plan.streetPlan,form:plan.phase+plan.band*3,
      layout:plan.volumes[0].entry<0.5?1:0,stairChoice:plan.layout==='gallery'?'straight':plan.layout==='court'?'turn':undefined,
      exteriorDetail:2,spacePlan:1,atticPlan:1,interiorPlan:options.width*options.depth>=480?1:0,
      blueprint:{...plan,key}}
    if(options.direction) design.direction=options.direction
    if(options.facadeStyle) design.styleProfile=options.facadeStyle
    if(previousPlan) design.palette=(last.design.palette+1)%6
    try {
      const variant={version:9,seed,signature,design}
      let model=build(options,variant)
      if(options.partLimit&&model.parts.length>options.partLimit) {
        design.exteriorDetail=0
        design.interiorPlan=2
        design.siteDetails=0
        design.atticPlan=0
        model=build(options,variant)
      }
      if(options.partLimit&&model.parts.length>options.partLimit) continue
      if(stock&&compareStock(inventory(model.parts),stock).missing) continue
      if(plan.bridge&&!model.skybridge) continue
      if(!model.interiors.some(interior=>interior.building===model.houses[0].id&&interior.floor===0&&interior.objects.length)) continue
      const silhouette=lotSilhouette(model)
      if(!previousPlan&&silhouettes.has(silhouette)) continue
      return {...model,variant:{...variant,silhouette,...(stock?{stockOnly:true}:{})}}
    } catch(error) {failure=error}
  }
  if(stock) throw Error('Для этих проектов не хватает деталей коллекции.')
  if(options.partLimit) throw Error('Цельная постройка не помещается в лимит. Увеличьте лимит деталей или уменьшите участок.')
  if(used.size) throw Error('Для этих условий уже показаны доступные проекты. Измените ограничения или выберите вариацию.')
  throw Error('Для участка не удалось собрать связанный проект.',{cause:failure})
}
export function newVariant(options, history=[], nextSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0]) {
  const recent=history.filter(v=>v.version===4)
  const seen=new Set(recent.map(v=>v.signature))
  const previousOutlines=new Set(recent.map(v=>v.outline))
  const keys=['palette','entry','roof','cornice','masonry','window','layout','awning','garden','setback','footprint','floorPattern']
  let best, distance=-1
  for(let i=0;i<512;i++) {
    const seed=nextSeed(), design=parameters(options,seed)
    const rng=random(seed ^ 0xad91f457)
    const reference=selectReference(options,recent,rng)
    const profile=profiles[reference.profile]
    design.reference=reference.number
    design.form=Math.floor(rng()*8)
    design.roof=profile.roof
    const signature=Object.values(design).join(',')
    if(seen.has(signature)) continue
    const score=Math.min(keys.length,...recent.slice(-6).map(v=>keys.filter(k=>v.design[k]!==design[k]).length))
    if(score<=distance) continue
    const candidate={version:4,seed,design,signature}
    const outline=buildingOutline(build(options,candidate))
    if(previousOutlines.has(outline)) continue
    best={...candidate,outline}
    distance=score
    if(score>=5&&recent.slice(-3).every(v=>v.design.form!==design.form||v.design.reference!==design.reference)) return best
  }
  if(best) return best
  throw new Error('Попробуйте изменить настройки постройки.')
}

export function buildingOutline(model) {
  let hash=2166136261
  for(const p of model.parts) {
    if(p.role!=='wall'&&p.role!=='extension'&&p.module!=='roof') continue
    const placement=[p.id,p.x,p.y,p.z,p.rotation].join(',')
    for(const char of placement) hash=Math.imul(hash^char.charCodeAt(0),16777619)
    hash=Math.imul(hash^59,16777619)
  }
  return (hash>>>0).toString(36)
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
    const clusters=new Map()
    for(const index of indices) {
      const parent=root(index)
      if(!clusters.has(parent)) clusters.set(parent,[])
      clusters.get(parent).push(index)
    }
    if(clusters.size!==1) {
      const loose=[...clusters.values()].sort((a,b)=>b.length-a.length)[1].slice(0,2)
        .map(i=>{const p=parts[i];return [p.id,p.x,p.y,p.z].join('/')}).join(', ')
      throw new Error('Модуль содержит разъединённые детали: '+module.id+' '+loose)
    }
    for(const index of indices) {
      const part=parts[index]
      if(!supported.has(index)&&part.y!==0&&part.y!==module.base) throw new Error('У детали отсутствует опора')
    }
  }
}

export function newOwnedModel(rawOptions,stock,history=[],seed=crypto.getRandomValues(new Uint32Array(1))[0],intent='generate') {
  const options=normalize({...rawOptions,mode:'solo',architecture:'house',buildingForm:'',floors:1,reference:'',sitePlan:undefined})
  const reference=referenceLayout(rawOptions.reference)
  const direction=architectureDirection(rawOptions.direction)
  const finish=facadeStyle(rawOptions.facadeStyle)??(direction&&!reference?facadeStyle(direction.facades[seed%direction.facades.length]):undefined)
  const layout=finish?{...reference,palette:finish.palette}:reference
  const seen=new Set(history.map(item=>item.signature))
  const outlines=new Set(history.slice(-12).map(item=>item.stockOutline))
  const planner=stockPlanner(options,stock,layout)
  let repeated
  function candidate(plan) {
    const stockOutline=[plan.family??'house',plan.bounds.x1-plan.bounds.x0,plan.bounds.z1-plan.bounds.z0,
      plan.roofY,plan.roof,plan.geometry].join('/')
    const signature=[stockOutline,...Object.values(plan.colors)].join('/')
    if(repeated&&seen.has(signature)) return
    const variant={version:8,seed,stockOnly:true,design:{scheme:'house',palette:0,ownedPlan:plan},
      signature,stockOutline,stockFamily:plan.family??'house'}
    let model
    try { model=build(options,variant) }
    catch { return }
    if(compareStock(inventory(model.parts),stock).missing) return
    if(!seen.has(signature)&&!outlines.has(stockOutline)) return model
    repeated??=model
  }
  for(const family of rankedStockFamilies(options,history,intent,seed)) {
    for(const plan of planner.plans(family,seed)) {
      const next=candidate(plan)
      if(next) return next
    }
  }
  if(!repeated) for(const plan of ownedPlans(options,stock,seed,layout)) {
    const next=candidate(plan)
    if(next) return next
  }
  if(repeated) return {...repeated,stockRepeated:true}
  throw Error('Из деталей коллекции не удалось подобрать постройку с устойчивым основанием. Добавьте пластины или второй набор.')
}

export function build(rawOptions,variant) {
  if([5,6,7,8,9].includes(variant.version)) {
    const options=normalize(rawOptions)
    if(variant.version===5) options.floors=Math.min(options.width<16||options.depth<18?1:2,options.floors)
    const model=variant.design.ownedPlan?buildOwnedScene(options,variant):buildScene(options,variant)
    checkConnections(model.parts,model.joins,model.modules)
    if(model.stockFamily) {
      const attached=new Set(model.joins.flatMap(([support,child])=>{
        const unit=model.parts[child].module
        return model.parts[support].module===unit?[]:[unit]
      }))
      if(model.modules.some(module=>module.base>0&&!attached.has(module.id))) {
        throw Error('Съёмный модуль не соединён с основанием постройки.')
      }
    }
    if(variant.stockSwaps&&!variant.stockOnly&&!variant.design.ownedPlan) applyStockSwaps(model.parts,variant.stockSwaps)
    return model
  }
  if(variant.version===2) return modularBuild(rawOptions,variant)
  if(variant.version!==3&&variant.version!==4) {
    const legacy=legacyBuild(rawOptions,variant)
    return {...legacy,options:{...legacy.options,floors:1},parts:legacy.parts.map(p=>({
      ...p,rotation:p.w<p.d?90:0,floor:p.layer==='roof'?1:0,module:p.layer==='roof'?'roof':'ground'
    }))}
  }
  const options=normalize(rawOptions)
  options.floors=Math.min(options.width<16||options.depth<18?1:2,options.floors)
  const {width,depth,floors,type,style,mode}=options, {design}=variant
  const reference=variant.version===4?referenceByNumber.get(design.reference):null
  const profile=reference?profiles[reference.profile]:null
  const fallback=palettes[style][design.palette]
  const [wall,trim,frame,roofColor]=reference
    ? paletteFromReference(reference,legacyColors,inventoryColor,fallback,design.palette%2)
    : fallback
  const margin=profile&&width>=22?design.form%3:0
  const x0=1+margin, x1=width-1-(design.footprint?2:0)-(margin===2?1:0)
  const entranceDepth=profile&&depth>=21?4+design.form%3:mode==='city'?4:2
  const z0=entranceDepth, z1=depth-1-(design.setback?2:0)
  const W=x1-x0, D=z1-z0, groundY=3, story=32
  const upperRows=profile?.topRows?profile.topRows+(design.form%2):9
  const bayCount=Math.max(1,Math.floor((W-1)/5)-(W>=20&&design.window===1?1:0))
  const baySpace=(W-4*bayCount)/(bayCount+1)
  const bays=Array.from({length:bayCount},(_,i)=>Math.round(x0+baySpace+i*(4+baySpace)))
  const doorBay=design.entry?bays.length-1:0
  const parts=[], steps=[], modules=[], occupied=new Map(), tops=new Map(), joins=[], interiors=[]
  let module='ground', section='Основание', currentFloor=0, role='structure'
  const key=(x,y,z)=>[x,y,z].join(',')
  function step(title) { steps.push({title,start:parts.length,module,section}) }
  function add(id,x,y,z,color,rotation=0,mount=null) {
    const spec=catalog[id]
    if(!spec || !colors[color]) throw new Error('Неизвестная деталь '+id+'/'+color)
    const swapped=rotation%180!==0
    const w=swapped?spec.d:spec.w, d=swapped?spec.w:spec.d, h=spec.h
    const part={id,x,y,z,w,d,h,color,rotation,kind:spec.kind,size:spec.w+'x'+spec.d,layer:module,module,floor:currentFloor,mount,role}
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
        const slopeStud=spec.kind!=='slope'||
          (rotation===0&&b===z+d-1)||(rotation===180&&b===z)||
          (rotation===90&&a===x+w-1)||(rotation===270&&a===x)
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
      if(texture===true && n>=2) n=2
      const textured = texture==='log'?(n===4?'30137':n===2?'30136':null)
        : texture==='fluted'&&n===2?'2877'
        : texture==='masonry'&&n===4?'15533':texture&&n===2?'98283':null
      const facadeColumn=kind==='brick'&&!vertical&&z===z0&&n===1&&(x+offset===x0||x+offset===x1-1)
      if(facadeColumn && style!=='modern') add('3062b',x+offset,y,z,trim)
      else if(textured) add(textured,x+(vertical?0:offset),y,z+(vertical?offset:0),color,vertical?90:0)
      else put(kind,x+(vertical?0:offset),y,z+(vertical?offset:0),vertical?1:n,vertical?n:1,color)
      offset+=n
    }
  }
  function deck(x,y,z,w,d,color,kind='plate',stagger=0,alternate=false) {
    for(let b=0;b<d;) {
      const rows=stagger&&b===0?1:Math.min(2,d-b)
      let a=0
      while(a<w) {
        const offset=alternate&&b%4===2
        const n=w-a===5?3:Math.min(a===0&&(stagger||offset)?3:4,w-a)
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
  modules.push({id:'ground',label:'Первый этаж',base:0})
  step('Соедините пластины основания')
  deck(0,0,0,width,depth,'dark')
  deck(0,1,0,width,depth,'gray','plate',1)
  role='floor'
  step('Выложите тротуар и пол')
  const hasExtension=profile&&z0>=4
  const streetSockets=!hasExtension&&mode==='city'&&width>=16?[x0,x1-2,width-1]:[]
  for(let z=0;z<depth;z++) {
    if(z<z0||z>=z1) {
      const color=z===0?'dark':design.paving===1?'darkTan':design.paving===2&&z%2===0?'dark':'gray'
      if(z===z0-2&&streetSockets.length) {
        for(let x=0;x<width;x++) put(streetSockets.includes(x)?'plate':'tile',x,2,z,1,1,color)
      } else if(hasExtension&&(z===z0-3||z===z0-2)) line('plate',0,2,z,width,color)
      else line('tile',0,2,z,width,color)
    } else {
      line('tile',0,2,z,x0,'gray')
      line('tile',x1,2,z,width-x1,'gray')
      line('plate',x0,2,z,W,'darkTan')
    }
  }
  role='structure'
  if(hasExtension) {
    section='Вход и улица'
    role='extension'
    frontExtension({profile,design,bounds:{x0,x1,z0,z1},entrance:bays[doorBay],put,add,deck,step,trim,frame,roofColor})
    role='structure'
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
  const sideWindows=D>=12?[z0+3+(design.window?2:0)]:[]

  for(let floor=0;floor<floors;floor++) {
    currentFloor=floor
    const y=groundY+floor*story
    const courses=floor===floors-1?upperRows:9
    role='floor'
    if(floor>0) {
      module='floor-'+floor
      modules.push({id:module,label:floor===1?'Второй этаж':'Третий этаж',base:y-2})
      section='Модуль этажа'
      step('Соберите съёмное перекрытие с проёмом лестницы')
      const stairZ=z1-11
      const stairX=x1-3
      const floorTie=(x,start,length)=>{
        if(length<=0) return
        const lead=Math.min(length,3)
        put('plate',x,y-1,start,1,lead,'darkTan')
        for(let offset=lead;offset<length;) {
          const span=[8,6,4,2,1].find(n=>n<=length-offset)
          put('plate',x,y-1,start+offset,1,span,'darkTan')
          offset+=span
        }
      }
      for(let dy=0;dy<2;dy++) {
        if(dy===1) {
          for(let x=x0;x<x1;x++) {
            if(x===stairX||x===stairX+1) {
              if(profile) floorTie(x,z0,stairZ-z0)
              else line('plate',x,y-1,z0,stairZ-z0,'darkTan',true,x%2)
              put('plate',x,y-1,z1-1,1,1,'darkTan')
            } else if(profile) {
              const overlap=(stairZ-z0)%2===0?1:2
              floorTie(x,z0,stairZ-z0-overlap)
              put('plate',x,y-1,stairZ-overlap,1,overlap+1,'darkTan')
              put('plate',x,y-1,stairZ+1,1,8,'darkTan')
              put('plate',x,y-1,z1-2,1,2,'darkTan')
            } else line('plate',x,y-1,z0,D,'darkTan',true,x%2)
          }
        } else {
          deck(x0,y-2,z0,W,stairZ-z0,'darkTan','plate',0,Boolean(profile))
          deck(x0,y-2,stairZ,stairX-x0,10,'darkTan','plate',0,Boolean(profile))
          deck(x1-1,y-2,stairZ,1,10,'darkTan')
          deck(x0,y-2,z1-1,W,1,'darkTan')
        }
      }
    }
    role='wall'
    section=floor===0?'Фасад магазина':'Жилой этаж'
    const openings=bays.map((x,i)=>{
      const door=floor===0&&i===doorBay
      const window=profile?.window
      const form=door?'door':window==='tall'?'tall':window==='small'?'small':window==='lattice'?'lattice':window==='paired'&&(i+design.form)%3!==2?'paired':'standard'
      return {x,width:4,low:door?0:2,high:door?6:form==='tall'?8:form==='small'?4:5,door,form}
    })
    for(let row=0;row<courses;row++) {
      step((floor+1)+' этаж · '+(row===0?'цоколь':row===courses-1?'верхняя обвязка':'кладка '+(row+1)))
      const Y=y+row*3
      const wallAccent=profile&&floor===0&&(reference.profile==='terrace'||reference.profile==='crooked')&&row<4
      const rowColor=row===0?trim:wallAccent&&design.form%2?frame:wall
      const texture=profile
        ? (profile.wall==='log'||(profile.wall!=='plain'&&(row<2||row%3===0))?profile.wall:false)
        : style!=='modern' && (design.masonry===1?row<2:design.masonry===2&&row%3===0)
      const awning=!profile&&floor===0&&type!=='home'&&design.awning!==0
      const arched=o=>!o.door&&o.form!=='tall'&&(style!=='modern'||profile?.front==='portico')
      const gaps=openings.filter(o=>(row>=o.low&&row<o.high)||(!o.door&&(row===1||(row===5&&arched(o))))||(awning&&row===6))
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
      if(row===5) for(const o of openings.filter(arched)) add('3659',o.x,Y,z0,trim)
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
        const tallSide=profile?.window==='tall'
        const glazing=tallSide?Array.from({length:Math.floor((D-3)/5)},(_,i)=>z0+2+i*5):sideWindows
        const sideGaps=row>=2&&row<(tallSide?8:5)?glazing:[]
        let z=start
        for(const opening of sideGaps) {
          line('brick',x,Y,z,opening-z,rowColor,true,row,texture)
          z=opening+4
        }
        line('brick',x,Y,z,end-z,rowColor,true,row,texture)
        if(row===2) {
          for(const opening of glazing) {
            const frameIndex=add(tallSide?'57894':'60594',x,Y,opening,frame,90)
            add(tallSide?'57895':'60603',x,Y,opening,'glass',90,frameIndex)
          }
        }
      }
      for(const o of openings) {
        if(row!==o.low) continue
        const pairs = {
          door:['60596',profile?.window==='lattice'?'92589':'60623',4],
          standard:['60594','60603',4], tall:['57894','57895',4],
          small:['60592','60601',2], paired:['60593','60602',2], lattice:['60593','60607',2]
        }
        const [frameId,paneId,span]=pairs[o.form]
        const coloredInsert=o.door||o.form==='lattice'
        const fits=id=>Boolean(availability[id]?.[inventoryColor(frame)])
        const together=profile&&coloredInsert&&(!fits(frameId)||!fits(paneId))?'black':frame
        for(let offset=0;offset<4;offset+=span) {
          const frameIndex=add(frameId,o.x+offset,Y,z0,together)
          add(paneId,o.x+offset,Y,z0,coloredInsert?together:'glass',0,frameIndex)
        }
      }
    }
    section='Детали фасада'
    step('Соберите карниз и разъём этажа')
    const lintelY=y+courses*3
    rim(lintelY,trim,'plate',design.cornice!==0)
    rim(lintelY+1,trim,'plate',design.cornice===2)
    for(let x=x0;x<x1;x++) for(const z of [z0,z1-1]) {
      put(x===x0+1||x===x1-2?'plate':'tile',x,lintelY+2,z,1,1,trim)
    }
    line('tile',x0,lintelY+2,z0+1,D-2,trim,true)
    line('tile',x1-1,lintelY+2,z0+1,D-2,trim,true)
    role='interior'
    section=floor===0&&type!=='home'?'Интерьер магазина':'Жилые помещения'
    const stair=floors>1?{x:x1-3,z:z1-11,w:2,d:10}:null
    interiors.push(furnishInterior({add,put,step,bounds:{x0,x1,z0,z1},baseY:y,floor,
      options,design,frame,trim,stair,doorX:bays[doorBay],partCount:()=>parts.length}))
    role='structure'

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

  role='structure'
  currentFloor=floors
  module='roof'
  const roofY=groundY+(floors-1)*story+upperRows*3+3
  modules.push({id:'roof',label:'Крыша',base:roofY})
  section='Крыша'
  step('Соберите основание съёмной крыши')
  deck(x0,roofY,z0,W,D,roofColor)
  deck(x0,roofY+1,z0,W,D,roofColor,'plate',1)
  const landmark={profile,design,bounds:{x0,x1,z0,z1},add,put,line,deck,step,trim,frame,wall,roofColor}
  if(design.roof===0) {
    step('Соберите парапет крыши')
    rim(roofY+2,trim,'brick')
    rim(roofY+5,roofColor,'tile')
    if(profile?.top) roofLandmark({...landmark,y:roofY+2})
    else {
      step('Добавьте вентиляцию')
      put('brick',x0+2,roofY+2,z1-4,2,2,'gray')
      put('tile',x0+2,roofY+5,z1-4,2,2,'dark')
    }
  } else {
    const rotate=Boolean(profile?.reverse) !== Boolean(profile&&design.form===7)
    const span=rotate?D:W, run=rotate?W:D
    const levels=Math.min(profile?(design.roof===1?(profile.levels??6)+design.form%2:3+design.form%2):design.roof===1?6:3,Math.floor(run/2)-1)
    function slope(id,x,y,z,rotation) {
      const d=catalog[id].d
      if(rotate) add(id,x1-z-d,y,z0+x,roofColor,(rotation+270)%360)
      else add(id,x0+x,y,z0+z,roofColor,rotation)
    }
    function gable(x,y,z,length,color,stagger) {
      if(rotate) line('brick',x1-z-length,y,z0+x,length,color,false,stagger)
      else line('brick',x0+x,y,z0+z,length,color,true,stagger)
    }
    for(let n=0;n<levels;n++) {
      step('Соберите скаты крыши · ряд '+(n+1))
      const Y=roofY+2+n*3
      const front=n, rear=run-2-n
      for(let x=0;x<span;) {
        const id=profile&&span-x>=4?'3037':span-x>=2?'3039':'3040b'
        slope(id,x,Y,front,0)
        slope(id,x,Y,rear,180)
        x+=catalog[id].w
      }
      // Gable ends join the two roof slopes.
      if(rear>front+2) {
        gable(0,Y,front+2,rear-front-2,wall,n)
        gable(span-1,Y,front+2,rear-front-2,wall,n)
        // Interior ribs carry the ridge plates while leaving the attic hollow.
        for(let x=1;x<span-1;x+=profile?2:3) gable(x,Y,front+2,rear-front-2,roofColor,n)
      }
    }
    step('Перекройте конёк')
    const ridgeY=roofY+2+levels*3
    const ridgeX=rotate?x0+levels:x0, ridgeZ=rotate?z0:z0+levels
    deck(ridgeX,ridgeY,ridgeZ,rotate?run-2*levels:W,rotate?D:run-2*levels,roofColor)
    if(profile) {
      deck(ridgeX,ridgeY+1,ridgeZ,rotate?run-2*levels:W,rotate?D:run-2*levels,roofColor,'plate',1)
      const ridge=levels+Math.floor((run-2*levels-2)/2)
      const chimney=profile.top==='chimney'&&span>=12
      const capSpan=span-(chimney?2:0)
      for(let offset=0;offset+1<capSpan;offset+=2) slope('3043',offset,ridgeY+2,ridge,0)
      if(chimney) {
        step('Соберите кирпичный дымоход')
        const capOffset=Math.floor(span/2)*2-2
        const x=rotate?x1-ridge-2:x0+capOffset
        const z=rotate?z0+capOffset:z0+ridge
        for(let row=0;row<3;row++) put('brick',x,ridgeY+2+row*3,z,2,2,row%2?'darkRed':'brown')
        add('2412b',x,ridgeY+11,z,'dark')
        add('2412b',x,ridgeY+11,z+1,'dark')
      }
    } else line('tile',x0,ridgeY+1,ridgeZ,W,roofColor)
  }

  // Furniture is built with the floor before the next detachable module.
  const cleanSteps=steps.filter((s,i)=>i===steps.length-1||s.start!==steps[i+1].start)
  const usedStuds=new Set(joins.map(([support])=>support))
  parts.forEach((p,index)=>{
    const walkable=p.y===2||modules.some(m=>m.id===p.module&&m.id!=='roof'&&p.y===m.base+1)
    const tileId=sizeId('tile',p.w,p.d)
    const floorPlan=interiors.find(plan=>plan.floor===p.floor)
    const centerX=p.x+p.w/2,centerZ=p.z+p.d/2
    const route=floorPlan?.routes.some(r=>centerX>=r.x&&centerX<r.x+r.w&&centerZ>=r.z&&centerZ<r.z+r.d)
    const pattern=design.floorPattern??0
    let tiled=options.flooring==='tiled'
    if(options.flooring==='mixed') tiled=route
    if(options.flooring==='auto') {
      tiled=pattern===1?route:pattern===2?(p.floor>0||centerZ>z1-5):pattern===3?(Math.floor(centerX/2)+Math.floor(centerZ/2))%2===0:false
    }
    const inside=p.x>=x0&&p.x+p.w<=x1&&p.z>=z0&&p.z+p.d<=z1
    if(walkable&&inside&&floorPlan&&p.kind==='plate'&&!usedStuds.has(index)&&tileId&&tiled) {
      p.id=tileId
      p.kind='tile'
    }
    if(walkable&&inside&&floorPlan&&!usedStuds.has(index)) {
      if(options.flooring==='auto'&&pattern===3) p.color=p.floor>0?'lightBlue':'darkTan'
      if(options.flooring==='tiled'&&type!=='home'&&p.floor===0) p.color=(Math.floor(centerX/2)+Math.floor(centerZ/2))%2?'white':'dark'
    }
    if(!availability[p.id]?.[inventoryColor(p.color)]) {
      const target=colors[p.color][1]
      const distance=color=>{
        const value=colors[color][1]
        return [0,8,16].reduce((sum,shift)=>sum+(((target>>shift)&255)-((value>>shift)&255))**2,0)
      }
      const alternatives=Object.keys(legacyColors).filter(c=>c!=='glass'&&availability[p.id]?.[inventoryColor(c)])
      alternatives.sort((a,b)=>distance(a)-distance(b))
      if(!alternatives.length) throw new Error('Нет доступного цвета детали '+p.id)
      p.color=alternatives[0]
    }
    p.element=availability[p.id][inventoryColor(p.color)]
  })
  const result={version:variant.version,options,variant,parts,steps:cleanSteps,modules,joins,interiors,bounds:{x0,x1,z0,z1},title:types[type],reference,palette:{wall,trim,frame,roof:roofColor}}
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

const roofChoices=['gable','hip','terrace','shed','setback','split','lantern','snow']
const tablePattern=/столик|Место для посетителя/

function roofRequest(words,house) {
  if(/плоск|террас/.test(words)) return house.recipe?'terrace':'flat'
  if(/двускат/.test(words)) return 'gable'
  if(house.recipe) {
    if(/односкат/.test(words)) return 'shed'
    if(/четыр[её]хскат|вальм/.test(words)) return 'hip'
    if(/фонар|остекл/.test(words)) return 'lantern'
    if(/снег/.test(words)) return 'snow'
    if(/фронтон/.test(words)) return 'split'
    if(/мансард/.test(words)) return 'setback'
  }
  if(/смен|замен|друг/.test(words)) {
    if(!house.recipe) return house.roof==='flat'?'gable':'flat'
    const start=roofChoices.indexOf(house.roof)+1
    return [...roofChoices.slice(start),...roofChoices.slice(0,start)]
      .find(kind=>roofForBounds(kind,house.bounds)!==house.roof)
  }
}

function editSceneVariant(options,original,region,words,{houseId,floor=0}={}) {
  const before=build(options,original)
  const house=houseId?before.houses.find(house=>house.id===houseId):before.houses.length===1?before.houses[0]:null
  if(!house) return {error:'Выберите дом в мастерской.'}
  if(region==='interior'&&(!Number.isInteger(floor)||floor<0||floor>=house.floors+Number(Boolean(house.attic)))) {
    return {error:'Выберите этаж выбранного дома.'}
  }
  const base=original.design
  const edit={...base.houseEdits?.[house.id]}
  const floorEdit={...edit.floors?.[floor]}
  const plan=before.interiors.find(plan=>plan.building===house.id&&plan.floor===floor)
  let expectedTables
  let furnishing=false
  let atticRequest
  if(region==='facade') {
    if(/цвет|палитр/.test(words)) edit.palette=((edit.palette??base.palette)+1)%6
    else if(/вход|двер/.test(words)) {
      if(house.roof==='aframe'||house.bounds.x1-house.bounds.x0<(house.shape==='chamfer'?11:7)) {
        return {error:'В этом фасаде есть место для входа только в одной позиции.'}
      }
      const centered=house.recipe?.facade==='service'||house.recipe?.composition==='axis'
      edit.entry=1-(edit.entry??(centered?0:base.entry))
    } else return {error:'Можно перенести вход или сменить цвет фасада.'}
  } else if(region==='roof') {
    if(/чердак/.test(words)&&original.version>=8) {
      atticRequest=!/убер|удал|без/.test(words)
      if(atticRequest===Boolean(house.attic)) return {error:atticRequest?'У дома уже есть чердак.':'У дома сейчас нет чердака.'}
      edit.attic=atticRequest
    } else {
      if(house.roof==='aframe') return {error:'Скаты образуют стены шале. Для другой крыши нужна другая архитектура.'}
      const roof=roofRequest(words,house)
      if(!roof) return {error:'Попробуйте «добавь чердак», «сделай двускатную крышу» или «сделай крышу плоской».'}
      if(house.recipe&&roofForBounds(roof,house.bounds)!==roof) {
        const fitted=roofForBounds(roof,house.bounds)
        if(fitted===house.roof) return {error:'Эта крыша требует более широкого или глубокого дома.'}
        edit.roof=fitted
      } else edit.roof=roof
      if(edit.roof===house.roof) return {error:'У этого дома уже такая крыша.'}
    }
  } else if(region==='interior') {
    if(!plan) return {error:'На выбранном этаже нет помещения для этой правки.'}
    if(plan.attic&&!/прилав|план|перестав/.test(words)) return {error:'Для чердака попробуйте «переставь мебель».'}
    if(original.version>=7&&/лестниц|тетив/.test(words)) {
      const current=house.stairs?.[floor]
      if(!current) return {error:'С этого этажа нет лестницы наверх. Выберите этаж, с которого начинается марш.'}
      const choice=/п-образ|двумя марш/.test(words)?'return':/г-образ|поворот/.test(words)?'turn'
        :/лит|открыт/.test(words)?'molded':/тетив/.test(words)?'stringer':/прям/.test(words)?'straight':null
      const kinds=stairKindsFor(house)
      if(choice&&!kinds.includes(choice)) return {error:'Этот марш не помещается в выбранном доме.'}
      if(choice===current.kind&&current.entry) return {error:'На этом этаже уже стоит такая лестница.'}
      const start=kinds.indexOf(current.kind)+1
      const alternatives=[...kinds.slice(start),...kinds.slice(0,start)].filter(kind=>kind!==current.kind)
      const fits=kind=>{
        const stairsDesign=house.stairLayout===undefined?base:{...base,layout:house.stairLayout}
        const well=planStaircases(house,stairsDesign,house.floors,{[floor]:{stairKind:kind}})[floor]
        if(house.topBounds&&floor===house.floors-2&&
          Math.min(well.z,well.exit.z,well.guard?.z??Infinity)<=house.topBounds.z0) return false
        return !house.bridgeDoor||floor>1||!stairBlocksPassage(well,house.bounds,house.bridgeDoor)
      }
      const kind=(choice?[choice]:alternatives).find(fits)
      if(!kind) return {error:'Этот марш перекроет проход. Выберите другой тип лестницы.'}
      floorEdit.stairKind=kind
    } else if(/(^|\s)пол(?:а|у|ом)?(?=\s|$|[.,!?])|шип|гладк|плитк/.test(words)) {
      floorEdit.flooring=/шип/.test(words)?'studs':/смеш|дорож/.test(words)?'mixed':'tiled'
      if(floorEdit.flooring===(edit.floors?.[floor]?.flooring??before.options.flooring)) {
        return {error:'На этом этаже уже такое покрытие пола.'}
      }
    } else if(/обстав|наполн|(?:добав|больше).*(?:мебел|обстановк)/.test(words)) {
      if(!fitsRoomPlan(plan.usable,plan.heightLimit)) {
        return {error:'На этом этаже используется компактная обстановка, чтобы оставить проходы.'}
      }
      floorEdit.interiorPlan=1
      furnishing=true
    } else if(/прилав|план|перестав/.test(words)) {
      floorEdit.layout=1-(floorEdit.layout??base.layout)
    } else if(/добав|больше|убер|меньше/.test(words)&&/столик|посадоч/.test(words)) {
      if(floor!==0||!['bakery','cafe'].includes(house.type)) return {error:'Столики для посетителей доступны на первом этаже кафе или пекарни.'}
      const count=plan.objects.filter(object=>tablePattern.test(object.name)).length
      expectedTables=Math.max(1,Math.min(8,count+(/убер|меньше/.test(words)?-1:1)))
      if(expectedTables===count) return {error:'Количество столиков уже достигло предела.'}
      floorEdit.tables=expectedTables
      floorEdit.manualTables=true
    } else return {error:'Попробуйте «обставь этаж», «смени лестницу» или «измени пол».'}
    edit.floors={...edit.floors,[floor]:floorEdit}
  }
  const design={...base,houseEdits:{...base.houseEdits,[house.id]:edit}}
  const model=build(options,{...original,design,signature:JSON.stringify(design)})
  if(atticRequest) {
    if(!model.houses.find(item=>item.id===house.id)?.attic) return {error:'Под этой крышей мало места для чердака и лестницы.'}
    if(options.partLimit&&model.parts.length>options.partLimit) return {error:'Чердак не помещается в лимит деталей.'}
  }
  if(furnishing) {
    if(options.partLimit&&model.parts.length>options.partLimit) return {error:'Дополнительная обстановка не помещается в лимит деталей.'}
    const next=model.interiors.find(plan=>plan.building===house.id&&plan.floor===floor)
    if(next.furnitureArea<=plan.furnitureArea) return {error:'Дополнительную мебель на этом этаже разместить не удалось с сохранением проходов.'}
  }
  if(expectedTables!==undefined) {
    const next=model.interiors.find(plan=>plan.building===house.id&&plan.floor===floor)
    if(next.objects.filter(object=>tablePattern.test(object.name)).length!==expectedTables) {
      return {error:'Столько столиков не помещается с сохранением проходов.'}
    }
  }
  return {model}
}

export function editVariant(options,original,region,message,scope) {
  if(original.stockOnly) return {error:'Подберите новый вариант из коллекции, чтобы сохранить комплектность деталей.'}
  if(original.version===2) return modularEdit(options,original,region,message)
  if([5,6,7,8,9].includes(original.version)) return editSceneVariant(options,original,region,message.toLowerCase(),scope)
  if(![3,4].includes(original.version)) {
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
    if(/(^|\s)пол(?:а|у|ом)?(?=\s|$|[.,!?])|шип|гладк|плитк/.test(words)) {
      const flooring=/шип/.test(words)?'studs':/смеш|дорож/.test(words)?'mixed':'tiled'
      return {model:build({...options,flooring},original)}
    }
    if(/прилав|план|перестав/.test(words)) design.layout=1-design.layout
    else if(/добав|больше|убер|меньше/.test(words)&&/столик|посадоч/.test(words)) {
      if(options.type!=='bakery'&&options.type!=='cafe') return {error:'Посадочные столики доступны для кафе и пекарни.'}
      const current=build(options,original)
      const count=current.interiors[0]?.objects.filter(o=>/столик|Место для посетителя/.test(o.name)).length??0
      design.tables=Math.max(1,Math.min(8,count+(/убер|меньше/.test(words)?-1:1)))
      design.manualTables=true
    }
    else return {error:'Попробуйте «переставь прилавок», «добавь столик» или «убери столик».'}
  } else {
    if(/плоск|террас/.test(words)) design.roof=0
    else if(/скат|двускат/.test(words)) design.roof=1
    else if(/мансард/.test(words)) design.roof=2
    else if(/смен|замен|друг/.test(words)) design.roof=(design.roof+1)%3
    else return {error:'Попробуйте «сделай двускатную крышу» или «сделай крышу плоской».'}
  }
  const signature=Object.values(design).join(',')
  if(signature===original.signature) return {error:'У постройки уже такой вариант.'}
  const model=build(options,{...original,design,signature})
  if(design.manualTables&&design.tables!==original.design.tables) {
    const count=model.interiors[0]?.objects.filter(o=>/столик|Место для посетителя/.test(o.name)).length??0
    if(count!==design.tables) return {error:'Столько столиков не помещается с сохранением проходов. Увеличьте участок или выберите другую планировку.'}
  }
  return {model}
}
