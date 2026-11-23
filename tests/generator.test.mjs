import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {build,editVariant,newVariant,newSceneVariant,newArchitecturalModel,normalize,parameters,types,styles,inventory} from '../src/generator.js'
import {generationRequest,resolveGenerationOptions} from '../src/generator.js'
import {modelSnapshot,readProject} from '../src/projects.js'
import {catalog,inventoryColor} from '../src/catalog.js'
import {references,profiles} from '../src/architecture.js'
import {referenceRecipe} from '../src/reference-architecture.js'
import {buildingForms,facadeStyles} from '../src/architecture-options.js'
import {architectureDirections} from '../src/architecture-directions.js'
import {buildingTypes,legacyTypes} from '../src/building-types.js'
import {lotSilhouette,silhouetteDistance} from '../src/scene.js'
import {exportLDraw,exportInventory} from '../src/export.js'
import availability from '../src/availability.json' with {type:'json'}

function checkStructure(model) {
  const parents=model.parts.map((_,i)=>i)
  function root(i) { while(parents[i]!==i) i=parents[i]; return i }
  const supported=new Set()
  for(const [a,b] of model.joins) {
    supported.add(b)
    if(model.parts[a].module===model.parts[b].module) parents[root(a)]=root(b)
  }
  for(const module of model.modules) {
    const indices=model.parts.flatMap((p,i)=>p.module===module.id?[i]:[])
    assert.equal(new Set(indices.map(root)).size,1,'Disconnected module '+module.id)
    for(const i of indices) {
      const p=model.parts[i]
      assert.ok(supported.has(i)||p.y===0||p.y===module.base,'Missing support '+JSON.stringify(p))
    }
  }
  for(const p of model.parts) {
    assert.ok(catalog[p.id])
    assert.equal(p.element,availability[p.id]?.[inventoryColor(p.color)],'Unknown manufactured element')
  }
  assert.equal(inventory(model.parts).reduce((sum,p)=>sum+p.count,0),model.parts.length)
}

test('automatic generation settings resolve with variety and respect explicit dimensions and street layouts',()=>{
  const request=generationRequest({width:'auto',depth:'auto',type:'auto',mode:'auto',floors:'auto',direction:'auto'})
  const seeds=Array.from({length:16},(_,i)=>i+1)
  const plans=seeds.map(seed=>resolveGenerationOptions(request,seed))
  assert.deepEqual(new Set(plans.map(plan=>plan.mode)),new Set(['solo','street','city']))
  assert.ok(new Set(plans.map(plan=>plan.type)).size>=6)
  for(const [i,plan] of plans.entries()) {
    const model=newArchitecturalModel(plan,[],{nextSeed:()=>seeds[i]})
    assert.equal(model.options.type,plan.type)
    assert.deepEqual(resolveGenerationOptions(request,99,plan),plan)
    checkStructure(model)
  }
  const mixed=generationRequest({...request,depth:40,streetLayout:'double',type:'school',floors:2,facadeStyle:'alpine'})
  const options=resolveGenerationOptions(mixed,541)
  assert.equal(options.mode,'street')
  assert.equal(options.streetLayout,'double')
  assert.ok(options.width>=27)
  assert.equal(options.depth,40)
  assert.equal(options.floors,2)
  assert.equal(options.type,'school')
  assert.equal(options.facadeStyle,'alpine')
  const sitePlan=[{kind:'house',x:28,z:30,w:12,d:10}]
  const survey=resolveGenerationOptions(generationRequest({...request,sitePlan,streetLayout:'custom'}),541)
  assert.deepEqual(survey.sitePlan,sitePlan)
  assert.ok(survey.width>=41&&survey.depth>=41)
  for(const seed of seeds) {
    const compact=resolveGenerationOptions(generationRequest({...request,partLimit:450}),seed)
    assert.ok(compact.mode!=='street'&&compact.floors===1)
  }
})

test('architectural generation sustains twenty different projects with the same brief',()=>{
  for(const [options,layoutCount] of [
    [{width:32,depth:32,mode:'solo',type:'home'},8],
    [{width:24,depth:24,type:'bakery'},7],
    [{width:40,depth:36,mode:'solo',type:'hotel',floors:3},8],
    [{width:48,depth:48,mode:'street',type:'school',floors:3},4]
  ]) {
    const history=[]
    let seed=2901
    for(let i=0;i<20;i++) {
      const model=newArchitecturalModel(options,history,{nextSeed:()=>seed++})
      checkStructure(model)
      assert.equal(model.version,9)
      assert.equal(model.houses[0].type,options.type)
      assert.ok(model.interiors.some(plan=>plan.floor===0&&plan.rooms?.length&&plan.objects.length))
      assert.ok(!history.some(previous=>previous.design.blueprint.fingerprint===model.blueprint.fingerprint))
      assert.ok(!history.some(previous=>previous.silhouette===model.variant.silhouette))
      history.push(model.variant)
    }
    assert.ok(new Set(history.map(variant=>variant.design.blueprint.layout)).size>=layoutCount)
  }
})

test('architectural variation and imported projects keep their plan, openings and building instructions',()=>{
  const options={width:36,depth:35,mode:'solo',type:'home',floors:2}
  const first=newArchitecturalModel(options,[],{nextSeed:()=>1})
  const saved=readProject(JSON.stringify({format:'kirpichik-project-v1',project:modelSnapshot(first,'Дом')}))
  assert.deepEqual(build(saved.options,saved.variant).parts,first.parts)
  const variation=newArchitecturalModel(options,[first.variant],{current:first.variant,intent:'variation',nextSeed:()=>2})
  assert.equal(variation.blueprint.fingerprint,first.blueprint.fingerprint)
  assert.deepEqual(variation.blueprint.volumes,first.blueprint.volumes)
  const include=(model)=>model.parts.filter(p=>p.kind==='door'||p.kind==='window').map(p=>[p.id,p.x,p.y,p.z])
  assert.deepEqual(include(first),include(variation))
  assert.equal(first.steps.at(-1).title,variation.steps.at(-1).title)
})
test('shop emblems sit above the entrance on plates anchored inside the facade',()=>{
  for(const [type,id] of [['cafe','3899'],['bakery','1126']]) {
    const options={width:32,depth:28,type,style:'old',floors:2}
    const model=newArchitecturalModel(options,[],{nextSeed:()=>21})
    const emblem=model.parts.find(p=>p.role==='wall'&&p.id===id)
    assert.ok(emblem)
    const house=model.houses.find(h=>h.id===emblem.building)
    assert.equal(emblem.z,house.bounds.z0-2)
    assert.ok(model.parts.some(p=>p.building===house.id&&p.kind==='door'&&
      p.x<=emblem.x&&p.x+p.w>=emblem.x+emblem.w&&p.y+p.h<=emblem.y))
    checkStructure(model)
  }
})

test('modular facades, dormers and figures survive rebuilding and LDraw export',()=>{
  const settings={width:32,depth:32,mode:'solo',type:'home',style:'old',floors:2}
  const model=newArchitecturalModel(settings,[],{nextSeed:()=>106})
  assert.ok(model.houses.some(house=>house.roof==='mansard'))
  assert.ok(model.parts.some(p=>p.id==='3455'&&p.role==='roof'))
  assert.ok(model.parts.some(p=>p.id==='20310'&&p.role==='wall'))
  assert.ok(model.parts.some(p=>p.id==='2417'))
  const head=model.parts.find(p=>p.id==='3626bpr0001')
  assert.ok(head)
  const lines=exportLDraw(model).split('\r\n')
  assert.ok(lines.some(line=>line.endsWith(' 3626bp01.dat')))
  const manifest=JSON.parse(fs.readFileSync(new URL('../public/parts.json',import.meta.url)))
  assert.deepEqual(new Set(manifest[head.id].groups.map(g=>g.color)),new Set([0,16]))
  assert.deepEqual(build(model.options,JSON.parse(JSON.stringify(model.variant))).parts,model.parts)
  checkStructure(model)
})

test('supported dimensions, styles and furniture produce connected modules with real elements',()=>{
  for(let seed=0;seed<1500;seed++) {
    const options=normalize({
      width:12+seed%21,depth:12+Math.floor(seed/21)%21,
      floors:1+seed%2,type:Object.keys(types)[seed%5],style:Object.keys(styles)[seed%3],
      mode:seed%2?'solo':'city'
    })
    checkStructure(build(options,{version:3,seed,design:parameters(options,seed)}))
  }
})
test('edits preserve structure, exports and deterministic reconstruction',()=>{
  const options=normalize({width:24,depth:24})
  for(let seed=0;seed<50;seed++) {
    const variant={version:3,seed,design:parameters(options,seed)}
    const model=build(options,variant)
    for(const [region,command] of [['facade','перенеси вход'],['facade','смени цвет'],['interior','переставь прилавок'],['roof','смени крышу']]) {
      checkStructure(editVariant(options,variant,region,command).model)
    }
    assert.deepEqual(build(options,variant).parts,model.parts)
    const exported=exportLDraw(model).split('\r\n')
    assert.equal(exported.filter(s=>s.startsWith('1 ')).length,model.parts.length)
    assert.equal(exported.filter(s=>s==='0 STEP').length,model.steps.length-1)
    assert.equal(exportInventory(model).split('\r\n').length,inventory(model.parts).length+1)
  }
})
test('same settings generate 500 distinct assemblies with recent structural differences',()=>{
  const options=normalize({width:24,depth:24})
  const history=[], assemblies=new Set(), outlines=new Set(), families=new Set()
  let ideas=0
  let candidate=0
  for(let i=0;i<500;i++) {
    const variant=newVariant(options,history,()=>++candidate)
    const keys=['palette','entry','roof','cornice','masonry','window','layout','awning','garden','setback','footprint','floorPattern']
    for(const previous of history.slice(-6)) assert.ok(keys.filter(k=>previous.design[k]!==variant.design[k]).length>=5)
    history.push(variant)
    const model=build(options,variant)
    assemblies.add(JSON.stringify(model.parts))
    outlines.add(variant.outline)
    families.add(model.reference.profile)
    if(model.reference.series==='Ideas') ideas++
  }
  assert.equal(assemblies.size,500)
  assert.equal(outlines.size,500)
  assert.equal(families.size,Object.keys(profiles).length)
  assert.ok(ideas>250)
})
test('every catalog part has locally bundled finite LDraw geometry',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../public/parts.json',import.meta.url)))
  const binary=fs.readFileSync(new URL('../public/parts.bin',import.meta.url))
  for(const id of Object.keys(catalog)) {
    const meta=manifest[id]
    assert.ok(meta?.count>0,id)
    const floats=new Float32Array(binary.buffer,binary.byteOffset+meta.offset,meta.count*6)
    assert.ok(floats.every(Number.isFinite),id)
  }
})
test('previously saved generation remains readable',()=>{
  const options={width:16,depth:24,style:'old',type:'bakery',mode:'city'}
  const variant={seed:42,design:{palette:0,entry:0,window:2,windowLevel:0,courses:5,trim:1,side:1,roof:0,layout:0,tables:1,decor:0,bond:0,setback:0,footprint:0}}
  assert.ok(build(options,variant).parts.length>100)
})

test('interiors have functional groups, accessible aisles and furniture clear of the stairs',()=>{
  for(const type of Object.keys(legacyTypes)) for(let seed=0;seed<30;seed++) {
    const options=normalize({width:24,depth:24,type})
    const model=build(options,{version:3,seed,design:parameters(options,seed)})
    assert.equal(model.interiors.length,2)
    for(const plan of model.interiors) {
      assert.ok(plan.objects.length>=10,type+' missing furnishing')
      assert.ok(plan.coverage>=25,type+' sparse room '+plan.coverage)
      for(const object of plan.objects) for(const route of plan.routes) {
        const overlaps=object.x<route.x+route.w&&object.x+object.w>route.x&&object.z<route.z+route.d&&object.z+object.d>route.z
        assert.equal(overlaps,false,'Blocked circulation '+object.name)
      }
      assert.ok(model.parts.filter(p=>p.role==='interior'&&p.floor===plan.floor).length>=100)
    }
    if(type!=='home') assert.ok(model.interiors[0].objects.some(o=>o.name.includes('Касса')))
    assert.ok(model.interiors[1].objects.some(o=>o.name.includes('Санузел')))
    assert.ok(model.interiors[1].objects.some(o=>o.name.includes('кровать')))
  }
})

test('new building types choose suitable forms and have different furnishing at compact and full sizes',()=>{
  const newTypes=Object.keys(types).filter(type=>!Object.hasOwn(legacyTypes,type))
  assert.equal(newTypes.length,14)
  const interiors=new Set()
  for(const type of newTypes) for(const width of [12,32]) {
    const options=normalize({width,depth:width,mode:'solo',type,floors:3})
    let seed=32
    const variant=newSceneVariant(options,[],{nextSeed:()=>seed++})
    const model=build(options,variant)
    checkStructure(model)
    assert.equal(model.houses[0].type,type)
    assert.ok(buildingTypes[type].forms.includes(variant.design.formProfile))
    assert.ok(model.interiors[0].objects.length>=2,type)
    if(width===32) interiors.add(model.interiors[0].objects.map(object=>object.name).join('|'))
  }
  assert.equal(interiors.size,newTypes.length)
})

test('new plans reserve less room for circulation and furnish usable outdoor space',()=>{
  const options=normalize({width:48,depth:48,mode:'solo',architecture:'house',type:'cafe',floors:3})
  const variant=newSceneVariant(options,[],{nextSeed:()=>42})
  const model=build(options,variant)
  const previous=build(options,{...variant,design:{...variant.design,spacePlan:undefined}})
  const area=({routes})=>new Set(routes.flatMap(({x,z,w,d})=>
    Array.from({length:w*d},(_,i)=>(x+i%w)+','+(z+Math.floor(i/w))))).size
  for(const [i,plan] of model.interiors.entries()) {
    assert.ok(area(plan)<area(previous.interiors[i]))
    assert.ok(plan.furnitureArea>=previous.interiors[i].furnitureArea)
  }
  assert.ok(model.siteUse.paths.size>0)
  assert.ok(model.siteUse.plots.some(plot=>plot.kind==='terrace'))
  assert.ok(model.parts.some(part=>part.role==='landscape'&&part.id==='4079'))
  checkStructure(model)

  const streetOptions=normalize({width:48,depth:48,mode:'street',type:'school',floors:3})
  const streetVariant=newSceneVariant(streetOptions,[],{nextSeed:()=>42})
  const street=build(streetOptions,streetVariant)
  assert.ok(street.houses.length>=2)
  assert.equal(new Set(street.houses.map(house=>house.type)).size,street.houses.length)
  assert.ok(street.siteUse.plots.some(plot=>plot.house==='house-1'&&plot.kind==='courtyard'))
  const school=street.interiors.find(plan=>plan.building==='house-1'&&plan.floor===0)
  assert.ok(school.objects.some(object=>/парт/i.test(object.name)))
  checkStructure(street)
})

test('large buildings add distinct room groups on each floor without blocking circulation',()=>{
  const options=normalize({width:48,depth:48,type:'cafe',style:'old',mode:'solo',architecture:'house',floors:3})
  const variant=newSceneVariant(options,[],{nextSeed:()=>42})
  const dense=build(options,variant)
  const previous=build(options,{...variant,design:{...variant.design,interiorPlan:undefined}})
  checkStructure(dense)
  assert.equal(dense.interiors.length,3)
  for(const [i,plan] of dense.interiors.entries()) {
    assert.ok(plan.furnitureArea>=previous.interiors[i].furnitureArea*2)
    assert.ok(plan.coverage>=34)
    for(const object of plan.objects) for(const route of plan.routes) {
      assert.ok(object.x+object.w<=route.x||route.x+route.w<=object.x||
        object.z+object.d<=route.z||route.z+route.d<=object.z,object.name)
    }
  }
  const [shop,home,studio]=dense.interiors.map(plan=>plan.objects.map(object=>object.name))
  assert.ok(shop.some(name=>name.includes('кофемашина')))
  assert.ok(home.some(name=>name.includes('Гостевая')))
  assert.ok(studio[0].includes('Кабинет'))
  const changes=editVariant(options,variant,'interior','Убери столик',{houseId:dense.houses[0].id,floor:0})
  assert.ok(changes.model,changes.error)
  const tables=plan=>plan.objects.filter(object=>object.name.includes('столик')).length
  assert.equal(tables(changes.model.interiors[0]),tables(dense.interiors[0])-1)
  assert.deepEqual(build(options,JSON.parse(JSON.stringify(variant))).parts,dense.parts)
  const revised=editVariant(options,previous.variant,'interior','Обставь этаж',{houseId:dense.houses[0].id,floor:1})
  assert.ok(revised.model,revised.error)
  assert.equal(revised.model.interiors[1].coverage,dense.interiors[1].coverage)
  const unedited=model=>model.parts.filter(part=>part.floor!==1||part.role==='wall').map(({mount,...part})=>part)
  assert.deepEqual(unedited(revised.model),unedited(previous))
})
test('bare stud floors retain studs and mixed floors contain exposed plates',()=>{
  const seed=3
  const base=normalize({width:24,depth:24})
  const variant={version:3,seed,design:parameters(base,seed)}
  const studded=build({...base,flooring:'studs'},variant)
  const mixed=build({...base,flooring:'mixed'},variant)
  const tiled=build({...base,flooring:'tiled'},variant)
  const floors=model=>model.parts.filter(p=>p.role==='floor'&&p.x>=model.bounds.x0&&p.x+p.w<=model.bounds.x1&&p.z>=model.bounds.z0&&p.z+p.d<=model.bounds.z1)
  assert.ok(floors(studded).every(p=>p.kind==='plate'))
  assert.ok(floors(mixed).some(p=>p.kind==='tile'))
  assert.ok(floors(mixed).some(p=>p.kind==='plate'))
  assert.ok(floors(tiled).filter(p=>p.kind==='tile').length>floors(mixed).filter(p=>p.kind==='tile').length)
  const edited=editVariant(base,variant,'interior','сделай пол с шипами').model
  assert.equal(edited.options.flooring,'studs')
  assert.deepEqual(edited.interiors,studded.interiors)
})
test('version 2 library models retain their original generation',async()=>{
  const {build:buildPrevious}=await import('../src/modular-v2.js')
  const options={width:24,depth:24,floors:2,type:'cafe',mode:'city',style:'old'}
  const variant={version:2,seed:3,design:{palette:0,entry:0,roof:1,cornice:1,masonry:1,window:0,layout:1,tables:2,awning:1,garden:1,setback:0,footprint:0,paving:1,shelves:1}}
  assert.deepEqual(build(options,variant),buildPrevious(options,variant))
})
test('interior commands distinguish shelves from floor and change actual table count',()=>{
  const options=normalize({width:24,depth:24,type:'cafe'})
  const seed=3,variant={version:3,seed,design:parameters(options,seed)}
  const initial=build(options,variant)
  const count=model=>model.interiors[0].objects.filter(o=>/столик|Место для посетителя/.test(o.name)).length
  const fewer=editVariant(options,variant,'interior','убери столик')
  assert.ok(fewer.model)
  assert.equal(count(fewer.model),count(initial)-1)
  checkStructure(fewer.model)
  assert.ok(editVariant(options,variant,'interior','добавь полки').error)
})

test('all catalog references work at compact and full building sizes and have source inventories',()=>{
  assert.equal(references.length,102)
  assert.equal(new Set(references.map(r=>r.number)).size,references.length)
  let seed=0
  for(const reference of references) {
    const csv=fs.readFileSync(new URL('../public/reference-inventory/'+reference.id+'.csv',import.meta.url),'utf8')
    assert.match(csv,/^part_num,color_id,quantity/)
    assert.ok(csv.split('\r\n').length>20)
    for(const [width,depth,floors,mode] of [[12,12,1,'solo'],[24,24,1,'city'],[24,24,2,'city'],[30,19,2,'city'],[32,32,2,'city']]) {
      const options=normalize({width,depth,floors,mode,type:reference.type,style:reference.style,reference:reference.number})
      const variant=newVariant(options,[],()=>++seed*97531)
      const model=build(options,variant)
      assert.equal(model.reference.number,reference.number)
      checkStructure(model)
    }
  }
})

test('24-stud plans differ without color and preserve their connected structure',()=>{
  const models=['cabin','street','wing'].map((architecture,i)=>{
    const options=normalize({width:24,depth:24,architecture,type:'bakery'})
    const model=build(options,newSceneVariant(options,[],{nextSeed:()=>180+i}))
    checkStructure(model)
    return model
  })
  const [cabin,street,wing]=models
  assert.equal(cabin.houses[0].roof,'aframe')
  assert.ok(Math.min(...cabin.parts.filter(p=>p.role==='roof').map(p=>p.y))<=12)
  assert.equal(street.houses.length,2)
  assert.ok(wing.houses[0].wing)
  assert.ok(wing.modules.some(module=>/-terrace$|-wing-roof$/.test(module.id)))
  const masks=models.map(lotSilhouette)
  for(let i=0;i<masks.length;i++) for(let j=i+1;j<masks.length;j++) assert.ok(silhouetteDistance(masks[i],masks[j])>0.12)
})
test('street generation fits 48 × 48 and can vary or replace the current street plan',()=>{
  const options=normalize({width:48,depth:48,mode:'street',streetLayout:'double'})
  let seed=921
  const nextSeed=()=>seed++
  const first=newSceneVariant(options,[],{nextSeed})
  const model=build(options,first)
  checkStructure(model)
  assert.equal(model.houses.length,5)
  assert.ok(model.houses.some(house=>house.reverse))
  assert.ok(model.houses.some(house=>!house.reverse))
  assert.ok(model.parts.every(p=>p.x>=0&&p.z>=0&&p.x+p.w<=48&&p.z+p.d<=48))
  assert.equal(model.streets[0].x1,48)
  assert.ok(model.houses.every(house=>model.interiors.some(plan=>plan.building===house.id)))
  assert.ok(exportLDraw(model).includes(model.title))
  const change=newSceneVariant(options,[first],{current:first,intent:'variation',nextSeed})
  assert.equal(change.design.streetPlan,first.design.streetPlan)
  assert.notEqual(change.signature,first.signature)
  const different=newSceneVariant(options,[first,change],{current:change,intent:'different',nextSeed})
  assert.notEqual(different.design.streetPlan,change.design.streetPlan)
  assert.ok(silhouetteDistance(change.silhouette,different.silhouette)>=0.14)
})
test('selected Ideas references determine actual building features',()=>{
  for(const [reference,scheme] of [['21338','cabin'],['21359','street'],['21310','wharf']]) {
    const options=normalize({width:24,depth:24,reference})
    const model=build(options,newSceneVariant(options,[],{nextSeed:()=>57}))
    assert.equal(model.scheme,scheme)
    assert.equal(model.reference.number,reference)
    if(scheme==='street') assert.ok(model.steps.some(step=>step.title.includes('наружную лестницу')))
    if(scheme==='wharf') assert.ok(model.houses[0].pier&&model.houses[0].tower)
  }
})

test('the 50 construction forms change the silhouette at a common plot size',()=>{
  assert.equal(Object.keys(buildingForms).length,50)
  const outlines=new Set()
  for(const name of Object.keys(buildingForms)) {
    const options=normalize({width:40,depth:38,type:'home',floors:3,buildingForm:name})
    let seed=300
    const model=build(options,newSceneVariant(options,[],{nextSeed:()=>seed++}))
    assert.equal(model.form,buildingForms[name],name)
    checkStructure(model)
    outlines.add(lotSilhouette(model))
  }
  assert.equal(outlines.size,50)
})

test('the 50 facade styles specify actual different wall assemblies',()=>{
  assert.equal(Object.keys(facadeStyles).length,50)
  const wallLayouts=new Set()
  for(const name of Object.keys(facadeStyles)) {
    const options=normalize({width:32,depth:28,type:'home',floors:2,buildingForm:'manor',facadeStyle:name})
    let seed=200
    const model=build(options,newSceneVariant(options,[],{nextSeed:()=>seed++}))
    assert.equal(model.finish,facadeStyles[name])
    checkStructure(model)
    wallLayouts.add(JSON.stringify(model.parts.filter(p=>p.role==='wall').map(p=>[p.id,p.x,p.y,p.z,p.rotation])))
  }
  assert.equal(wallLayouts.size,50)
})

test('architectural directions choose compatible forms and facades for houses and compact streets',()=>{
  assert.equal(Object.keys(architectureDirections).length,32)
  for(const [direction,profile] of Object.entries(architectureDirections)) {
    for(const form of profile.forms) assert.ok(buildingForms[form],form)
    for(const facade of profile.facades) assert.ok(facadeStyles[facade],facade)
    for(const mode of ['solo','street']) {
      const options=normalize({width:24,depth:mode==='street'?18:24,type:'home',mode,direction})
      let seed=103
      const variant=newSceneVariant(options,[],{nextSeed:()=>seed++})
      const model=build(options,variant)
      assert.equal(model.direction,profile)
      assert.ok(profile.forms.includes(variant.design.formProfile),direction)
      assert.ok(profile.facades.includes(variant.design.styleProfile),direction)
      checkStructure(model)
      if(mode==='street') assert.ok(new Set(model.houses.map(house=>house.recipe.finish)).size>1,direction)
    }
  }
})

test('repeated direction generation rotates forms and keeps an explicitly selected facade',()=>{
  const options=normalize({width:30,depth:24,mode:'solo',direction:'forest-lodges',facadeStyle:'alpine'})
  let seed=24
  const first=newSceneVariant(options,[],{nextSeed:()=>seed++})
  const next=newSceneVariant(options,[first],{current:first,intent:'different',nextSeed:()=>seed++})
  assert.notEqual(next.design.formProfile,first.design.formProfile)
  assert.equal(next.design.styleProfile,'alpine')
  const model=build(JSON.parse(JSON.stringify(options)),JSON.parse(JSON.stringify(next)))
  assert.equal(model.direction,architectureDirections['forest-lodges'])
  assert.equal(model.finish,facadeStyles.alpine)
})

test('A-Frame Cabin carries the porch, steep roof, green windows and forest scene into the model',()=>{
  const options=normalize({width:24,depth:24,type:'home',reference:'21338',floors:1})
  const variant=newSceneVariant(options,[],{nextSeed:()=>41})
  const model=build(options,variant)
  const house=model.houses[0]
  assert.ok(model.parts.some(p=>p.id==='3678b'&&p.color==='brown'))
  assert.ok(model.parts.filter(p=>['60592','60593'].includes(p.id)&&p.z===house.bounds.z0&&p.color==='green').length>=3)
  assert.ok(model.parts.some(p=>p.id==='60592'&&p.role==='roof'&&p.z>house.bounds.z0))
  assert.ok(model.parts.some(p=>p.id==='3633'&&p.z===house.chaletSite.porch.z0))
  assert.equal(house.chaletSite.trees.length,2)
  checkStructure(model)
  assert.deepEqual(build(options,JSON.parse(JSON.stringify(variant))).parts,model.parts)
})

test('tall roofs provide a furnished attic, stair landing and separate removable roof',()=>{
  for(const configuration of [
    {buildingForm:'longhouse',width:40,depth:40,floors:2},
    {buildingForm:'manor',width:40,depth:40,floors:2},
    {buildingForm:'double-gable',width:46,depth:44,floors:2},
    {reference:'21325',width:40,depth:40,floors:2},
    {reference:'21338',width:24,depth:24,floors:1}
  ]) {
    const options=normalize({type:'home',mode:'solo',...configuration})
    let seed=42
    const variant=newSceneVariant(options,[],{nextSeed:()=>seed++})
    const model=build(options,variant)
    const [house]=model.houses
    const attic=house.attic
    assert.ok(attic,configuration.buildingForm??configuration.reference)
    checkStructure(model)
    assert.equal(attic.floor,house.floors)
    const plan=model.interiors.find(plan=>plan.attic)
    assert.equal(plan.floor,attic.floor)
    assert.ok(plan.objects.some(o=>/кровать/i.test(o.name)))
    assert.ok(plan.objects.some(o=>/сундук/i.test(o.name)))
    assert.ok(model.modules.some(module=>module.id===house.id+'-attic'))
    assert.ok(model.modules.some(module=>module.id===house.id+'-roof'))
    const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z
    assert.ok(plan.objects.every(object=>!overlap(object,attic.stair.exit)))
    assert.ok(model.parts.filter(p=>p.role==='roof'&&p.building===house.id).every(p=>
      !overlap(p,plan.usable)||p.y+p.h<=attic.y+(house.elevation??0)||p.y>=attic.y+(house.elevation??0)+attic.headroom))
    if(!attic.cabin) assert.ok(model.parts.filter(p=>p.floor===attic.floor&&p.role==='floor').every(p=>!overlap(p,attic.stair)))
    const ascent=model.parts.filter(p=>p.role==='stair'&&p.floor===attic.floor-1&&overlap(p,attic.stair))
    assert.equal(Math.max(...ascent.map(p=>p.y+p.h)),attic.y+(house.elevation??0))
    assert.deepEqual(build(options,JSON.parse(JSON.stringify(model.variant))).parts,model.parts)
  }
})

test('flat and small roofs pass on the attic, and saved roofs can add one locally',()=>{
  const small=normalize({buildingForm:'longhouse',width:12,depth:12,floors:1,mode:'solo'})
  const low=normalize({buildingForm:'garden-room',width:32,depth:28,floors:1,mode:'solo'})
  for(const options of [small,low]) {
    const variant=newSceneVariant(options,[],{nextSeed:()=>42})
    assert.equal(build(options,variant).interiors.some(plan=>plan.attic),false)
    assert.match(editVariant(options,variant,'roof','добавь чердак').error,/мало места/)
  }
  const options=normalize({buildingForm:'longhouse',width:40,depth:40,floors:2,mode:'solo'})
  const fresh=newSceneVariant(options,[],{nextSeed:()=>42})
  const saved={...fresh,design:{...fresh.design,atticPlan:undefined}}
  assert.ok(!build(options,saved).houses[0].attic)
  const result=editVariant(options,saved,'roof','добавь чердак')
  assert.ok(result.model?.houses[0].attic,result.error)
  checkStructure(result.model)
  const removed=editVariant(options,result.model.variant,'roof','убери чердак')
  assert.deepEqual(removed.model.parts,build(options,saved).parts)
})
test('five-storey house alternates its stairwells and keeps each slab connected',()=>{
  const options=normalize({width:32,depth:28,floors:5,mode:'solo',style:'modern',type:'home'})
  const seed=4
  const design={...parameters(options,seed),scheme:'house',form:seed}
  const model=build(options,{version:6,seed,design})
  checkStructure(model)
  const [house]=model.houses
  assert.equal(house.floors,5)
  assert.deepEqual(house.stairs.map(stair=>stair.kind),['straight','turn','open','return'])
  assert.deepEqual(model.interiors.map(interior=>interior.floor),[0,1,2,3,4])
  const levels=model.modules.filter(module=>module.id.includes('-floor-'))
  for(const [index,well] of house.stairs.entries()) {
    const next=house.stairs[index+1]
    if(next) assert.ok(well.x+well.w<=next.x||next.x+next.w<=well.x)
    const slab=model.parts.filter(p=>p.module===levels[index].id&&p.role==='floor')
    assert.ok(slab.every(p=>p.x+p.w<=well.x||p.x>=well.x+well.w||p.z+p.d<=well.z||p.z>=well.z+well.d))
    const stairParts=model.parts.filter(p=>p.role==='stair'&&p.floor===index)
    assert.equal(Math.max(...stairParts.map(p=>p.y+p.h)),levels[index].base+2)
  }
  assert.ok(model.parts.some(p=>p.color==='glassBlue'||p.color==='glassCyan'))
})

test('every reference generates its facade and a connected version of its roof',()=>{
  const families=new Set()
  const roofs=new Set()
  let seed=4001
  for(const reference of references) {
    const recipe=referenceRecipe(reference)
    assert.ok(recipe?.facade&&recipe?.composition&&recipe?.roof,reference.number)
    families.add(recipe.key)
    for(const [width,depth] of [[12,12],[32,30]]) {
      const options=normalize({width,depth,floors:2,type:reference.type,style:reference.style,reference:reference.number})
      const model=build(options,newSceneVariant(options,[],{nextSeed:()=>seed++}))
      assert.equal(model.reference.number,reference.number)
      assert.equal(model.houses[0].recipe.facade,recipe.facade)
      assert.ok(model.parts.some(part=>part.role==='roof'))
      roofs.add(model.houses[0].roof)
      checkStructure(model)
    }
  }
  assert.equal(families.size,44)
  assert.equal(roofs.size,11)
})

test('selected complex references change massing as well as palette and roof',()=>{
  const create=(reference,floors,size=30)=>{
    const options=normalize({width:size,depth:size,style:reference==='21354'?'modern':'old',reference,floors})
    const model=build(options,newSceneVariant(options,[],{nextSeed:()=>5820}))
    checkStructure(model)
    return model
  }
  const hut=create('76428',1,24),[chamfered]=hut.houses
  assert.equal(chamfered.roof,'octagonal')
  assert.ok(chamfered.wing)
  assert.ok(hut.parts.some(p=>p.role==='wall'&&p.z===chamfered.bounds.z0&&p.x>chamfered.bounds.x0))
  assert.ok(!hut.parts.some(p=>p.role==='wall'&&p.z===chamfered.bounds.z0&&p.x===chamfered.bounds.x0))
  const burrow=create('76437',4)
  assert.equal(burrow.houses[0].floors,4)
  assert.ok(burrow.parts.some(p=>p.module==='house-1-wing-roof'&&p.color==='darkRed'))
  const modern=create('21354',2),[stepped]=modern.houses
  assert.ok(stepped.topBounds.z0>stepped.bounds.z0)
  assert.ok(modern.parts.some(p=>p.role==='wall'&&p.id==='59349'&&p.color==='glass'))
})

test('unconstrained wing generation changes the height and roof of the secondary volume',()=>{
  const options=normalize({width:28,depth:26,architecture:'wing',floors:2})
  const history=[]
  let seed=5800
  const wingRoofs=new Set()
  for(let i=0;i<3;i++) {
    const variant=newSceneVariant(options,history,{nextSeed:()=>seed++})
    const model=build(options,variant)
    checkStructure(model)
    assert.ok(model.houses[0].wing)
    assert.ok(model.modules.some(module=>module.id==='house-1-wing-roof'))
    wingRoofs.add(model.houses[0].wingRoof)
    history.push(variant)
  }
  assert.equal(wingRoofs.size,3)
})

test('reference techniques change the actual construction and are available through editing',()=>{
  const create=(reference,extra={})=>{
    const options=normalize({width:48,depth:36,floors:3,reference,...extra})
    const model=build(options,newSceneVariant(options,[],{nextSeed:()=>7143}))
    checkStructure(model)
    return model
  }
  const downtown=create('60380',{mode:'street',streetLayout:'square',style:'modern'})
  assert.ok(downtown.parts.some(part=>part.module==='skybridge'&&part.color==='glassCyan'))
  assert.ok(downtown.houses.filter(house=>house.bridgeDoor).length===2)
  const riviera=create('21359',{mode:'street',streetLayout:'mews',style:'coastal'})
  assert.ok(riviera.houses.some(house=>house.elevation===3&&house.entrySteps))
  assert.ok(riviera.parts.some(part=>part.role==='roof'&&part.id==='3045'))
  // The LDraw origin of the convex slope is its single high stud.
  const corners=riviera.parts.filter(part=>part.id==='3045')
  const cornerLines=exportLDraw(riviera).split('\r\n').filter(line=>line.endsWith(' 3045.dat'))
  for(const [i,p] of corners.entries()) {
    const [, ,x,,z]=cornerLines[i].split(' ').map(Number)
    assert.equal(x,(p.x+0.5+Number([0,270].includes(p.rotation)))*20)
    assert.equal(z,(p.z+0.5+Number(p.rotation>=180))*20)
  }
  const blacksmith=create('21325',{style:'old'})
  const shingles=blacksmith.parts.filter(part=>part.role==='roof'&&part.id==='22385')
  assert.ok(new Set(shingles.map(part=>part.y)).size>=2)
  assert.ok(shingles.some(part=>part.color==='blue'||part.color==='royalBlue'))
  const garden=create('21353',{style:'modern'})
  assert.equal(garden.houses[0].roof,'lantern')
  assert.ok(garden.parts.some(part=>part.role==='roof'&&part.color==='glass'))
  const changed=editVariant(garden.options,garden.variant,'roof','сделай односкатную крышу').model
  checkStructure(changed)
  assert.ok(changed.parts.some(part=>part.role==='roof'&&part.id==='3298'))
  assert.deepEqual(changed.parts.filter(p=>p.role!=='roof'),garden.parts.filter(p=>p.role!=='roof'))
})

test('redesigned stairs join both floors with continuous treads and clear landings',()=>{
  const options=normalize({width:30,depth:29,floors:2,mode:'solo',style:'old',type:'home'})
  const seed=18
  const design={...parameters(options,seed),scheme:'house',form:seed,reference:'21330'}
  const touches=(a,b)=>(
    (a.x+a.w===b.x||b.x+b.w===a.x)&&a.z<b.z+b.d&&b.z<a.z+a.d||
    (a.z+a.d===b.z||b.z+b.d===a.z)&&a.x<b.x+b.w&&b.x<a.x+a.w
  )
  for(const kind of ['straight','stringer','molded','turn','return']) {
    const m=build(options,{version:8,seed,design:{...design,stairChoice:kind}})
    checkStructure(m)
    const stair=m.houses[0].stairs[0]
    const level=m.modules.find(module=>module.id.endsWith('-floor-1')).base+2
    const parts=m.parts.filter(part=>part.role==='stair')
    assert.equal(stair.kind,kind)
    assert.equal(Math.max(...parts.map(part=>part.y+part.h)),level)
    for(const [index,access] of [stair.entry,stair.exit].entries()) {
      const interior=m.interiors.find(plan=>plan.floor===index)
      assert.ok(interior.routes.some(path=>path.x<=access.x&&path.x+path.w>=access.x+access.w
        &&path.z<=access.z&&path.z+path.d>=access.z+access.d))
    }
    if(kind==='molded') {
      const flight=parts.find(part=>part.id==='30134')
      assert.deepEqual(flight.mount.map(index=>m.parts[index].y+m.parts[index].h),[flight.y,flight.y+16])
    } else {
      const route=[stair.entry,...stair.treads,stair.exit]
      for(let i=1;i<route.length;i++) assert.ok(touches(route[i-1],route[i]),kind+' '+i)
      for(const [index,tread] of stair.treads.entries()) {
        assert.ok(tread.rise-(stair.treads[index-1]?.rise??0)<=3)
      }
    }
    if(kind==='turn') {
      assert.ok(m.parts.some(part=>part.role==='floor'&&part.y===level-1&&part.x<=stair.infill.x&&part.x+part.w>stair.infill.x&&part.z===stair.infill.z))
      assert.ok(m.parts.some(part=>part.role==='stairGuard'))
    }
  }
  const previous={version:7,seed,design}
  const edited=editVariant(options,previous,'interior','Сделай лестницу с двумя маршами').model
  assert.equal(edited.houses[0].stairs[0].kind,'return')
  const roof=model=>model.parts.filter(part=>part.role==='roof').map(({id,x,y,z,color})=>[id,x,y,z,color])
  assert.deepEqual(roof(edited),roof(build(options,previous)))
})

test('street edits preserve the other houses and only change the selected floor or component',()=>{
  const options=normalize({width:48,depth:48,floors:5,type:'home',mode:'street',streetLayout:'square',style:'modern',reference:'60380'})
  const seed=7143
  const design={...parameters(options,seed),scheme:'street',streetPlan:'square',form:6,reference:'60380'}
  const variant={version:8,seed,design}
  const before=build(options,variant)
  const [first,second]=before.houses
  const scope={houseId:second.id,floor:1}
  const parts=(model,select)=>model.parts.filter(select).map(({mount,...part})=>part)
  const unaffected=part=>part.building!==second.id
  assert.ok(before.skybridge)
  assert.ok(second.stairs[1])
  assert.match(editVariant(options,variant,'roof','Смени крышу').error,/выберите дом/i)

  const apply=(model,region,message,target=scope)=>{
    const result=editVariant(options,model.variant,region,message,target)
    assert.ok(result.model,result.error)
    const after=result.model
    assert.deepEqual(parts(after,unaffected),parts(model,unaffected))
    assert.deepEqual(after.houses.find(house=>house.id===first.id),model.houses.find(house=>house.id===first.id))
    assert.deepEqual(after.skybridge,model.skybridge)
    checkStructure(after)
    return after
  }
  const roof=apply(before,'roof','Смени крышу')
  assert.notEqual(roof.houses[1].roof,second.roof)
  assert.deepEqual(parts(roof,p=>p.role!=='roof'),parts(before,p=>p.role!=='roof'))
  const stairs=apply(roof,'interior','Смени лестницу')
  assert.notEqual(stairs.houses[1].stairs[1].kind,roof.houses[1].stairs[1].kind)
  assert.deepEqual(stairs.houses[1].stairs[0],roof.houses[1].stairs[0])
  assert.deepEqual(stairs.houses[1].stairs.slice(2),roof.houses[1].stairs.slice(2))
  const floor=apply(stairs,'interior','Сделай пол гладким')
  assert.notDeepEqual(parts(floor,p=>p.building===second.id&&p.floor===1&&p.role==='floor'),
    parts(stairs,p=>p.building===second.id&&p.floor===1&&p.role==='floor'))
  assert.deepEqual(parts(floor,p=>p.building===second.id&&p.floor!==1),parts(stairs,p=>p.building===second.id&&p.floor!==1))
  const facade=apply(floor,'facade','Смени цвет')
  assert.notDeepEqual(parts(facade,p=>p.role==='wall'&&p.building===second.id),parts(floor,p=>p.role==='wall'&&p.building===second.id))
  assert.deepEqual(parts(facade,p=>p.role!=='wall'),parts(floor,p=>p.role!=='wall'))
  assert.deepEqual(build(options,JSON.parse(JSON.stringify(facade.variant))).parts,facade.parts)
})
