import {colors, inventoryColor} from './catalog.js'

export const compositionNames = {
  narrow:'Узкий объём', courtyard:'Дом с двором', garden:'Дом среди сада',
  wing:'Дом с низким крылом', offset:'Объёмы со смещением', axis:'Фасад по центральной оси',
  row:'Ряд соседних домов', square:'Дома вокруг площади', mews:'Переулок со ступенями',
  quay:'Здание на настиле', lodge:'Шале', platform:'Здание вдоль платформы'
}
export const facadeNames = {
  timber:'Фахверк', logs:'Деревянная обшивка', shop:'Витрины и навесы',
  arches:'Арки и простенки', bays:'Узкие секции фасада', ribbons:'Ленточное остекление',
  glass:'Панорамное остекление', arcade:'Аркада и большой парадный вход',
  service:'Широкие проёмы первого этажа', studio:'Открытая планировка'
}
export const roofNames = {
  mansard:'Мансардная крыша с люкарнами',
  aframe:'Скаты почти до земли', gable:'Двускатная кровля', split:'Два фронтона',
  hip:'Четырёхскатная кровля', shed:'Односкатная кровля', lantern:'Световой фонарь',
  terrace:'Крыша-терраса', setback:'Кровля с разноуровневой надстройкой',
  monitor:'Приподнятый конёк с остеклением', snow:'Скатная кровля со снегом',
  octagonal:'Коническая крыша со скосами', stepped:'Ступенчатая кровля', capped:'Крыша со скосами 45°'
}

// Each entry is an interpretation for original models. The assignments also
// cover room sets, whose facade and roof are extrapolated from their interiors.
const families = {
  alpine:       ['lodge','logs','aframe','cabin','ridge'],
  blacksmith:   ['wing','timber','split','wing','chimney'],
  fishing:      ['quay','logs','gable','wharf','chimney'],
  treehouse:    ['garden','logs','hip','house','ridge'],
  cottage:      ['garden','logs','split','wing','chimney'],
  manor:        ['axis','arches','hip','house','chimney'],
  gothic:       ['offset','timber','split','wing','chimney'],
  nordic:       ['courtyard','logs','gable','wing','ridge'],
  conservatory: ['wing','glass','lantern','wing','frame'],
  modernHouse:  ['offset','glass','terrace','wing','planters'],
  riviera:      ['mews','shop','hip','street','chimney'],
  factory:      ['wing','service','monitor','wing','vents'],
  estate:       ['axis','arcade','hip','house','chimney'],
  crooked:      ['offset','timber','setback','wing','chimney'],
  lighthouse:   ['quay','bays','shed','wharf','vents'],
  brownstones:  ['row','bays','terrace','street','chimney'],
  prehistoric:  ['courtyard','logs','shed','wing','ridge'],
  tavern:       ['wing','timber','split','wing','chimney'],
  shipyard:     ['quay','logs','split','wharf','ridge'],
  attic:        ['narrow','studio','gable','house','chimney'],
  workplace:    ['platform','studio','monitor','house','vents'],
  diner:        ['row','shop','terrace','street','planters'],
  apartment:    ['narrow','bays','setback','house','planters'],
  winter:       ['square','shop','snow','street','chimney'],
  hut:          ['garden','logs','hip','house','chimney'],
  suburb:       ['garden','bays','hip','house','chimney'],
  bank:         ['axis','arcade','lantern','house','frame'],
  bazaar:       ['mews','shop','split','street','chimney'],
  downtown:     ['square','ribbons','setback','street','planters'],
  townSquare:   ['square','arcade','terrace','street','clock'],
  cityTower:    ['narrow','ribbons','setback','house','vents'],
  apartmentRow: ['row','glass','terrace','street','planters'],
  station:      ['platform','glass','monitor','wing','frame'],
  tram:         ['platform','ribbons','shed','wing','frame'],
  hospital:     ['wing','ribbons','terrace','wing','vents'],
  municipal:    ['axis','arcade','terrace','house','clock'],
  depot:        ['platform','service','shed','wing','vents'],
  fireTower:    ['offset','service','setback','wing','vents'],
  patrol:       ['courtyard','service','terrace','wing','vents'],
  island:       ['quay','bays','setback','wharf','vents'],
  garage:       ['offset','service','terrace','wing','vents'],
  airport:      ['platform','glass','lantern','wing','frame'],
  observation:  ['offset','glass','setback','wing','frame'],
  barn:         ['courtyard','logs','gable','wing','ridge']
}
const catalogAssignments = {
  alpine:'21338 60366',
  blacksmith:'21325',
  fishing:'21310 60069',
  treehouse:'21318 4440',
  cottage:'21326',
  manor:'21330',
  gothic:'21341 76407 4756',
  nordic:'21343',
  conservatory:'21353',
  modernHouse:'21354 60398',
  riviera:'21359',
  factory:'21360',
  estate:'21373',
  crooked:'21351 76437 75980 4840',
  lighthouse:'21335',
  brownstones:'21324 76408',
  prehistoric:'21316',
  tavern:'21348',
  shipyard:'21322',
  attic:'40773',
  workplace:'21369 21336 21302',
  diner:'21339 21319 60292 60306 60233 60026 76452',
  apartment:'21328',
  winter:'76457 76388',
  hut:'76428 75947 4738 4754 4707',
  suburb:'75968 76451 4728',
  bank:'76417 60317',
  bazaar:'75978 10217 76444 76471 76422 76439',
  downtown:'60380 60097',
  townSquare:'60271',
  cityTower:'60473',
  apartmentRow:'60365',
  station:'8404 60469 60335',
  tram:'60423',
  hospital:'60330 60204 4429',
  municipal:'60329 60008 60141 60047 7498 7744',
  depot:'60414 60320 60215 60110 60004 7208 7945 7642',
  fireTower:'77944 60216',
  patrol:'60316 60246 60174',
  island:'60419 60130 60096',
  garage:'60258 4207',
  airport:'60502 60104 3182 7894',
  observation:'60434 60124',
  barn:'7637'
}
const assignment = new Map(Object.entries(catalogAssignments).flatMap(([key, ids])=>ids.split(' ').map(id=>[id,key])))
const recipes = new WeakMap()
const sources = {
  '21325':'https://www.lego.com/en-us/service/buildinginstructions/21325',
  '21338':'https://www.lego.com/en-il/service/building-instructions/21338',
  '21353':'https://www.lego.com/en-us/service/buildinginstructions/21353',
  '21359':'https://www.lego.com/it-it/service/building-instructions/21359',
  '60380':'https://www.lego.com/en-us/service/buildinginstructions/60380',
  '76437':'https://www.lego.com/en-ee/service/building-instructions/76437',
  '76388':'https://www.lego.com/cdn/product-assets/product.bi.core.pdf/6429792.pdf'
}
const isolatedRooms = new Set(['40773','21336','21328','21319','21302'])
const wallParts = ['98283','15533','30136','30137','4216','2653','2877']
const roofParts = ['3039','3037','3040b','3298','3045','3044b','15068','11477','50950','93273','85984','54200','24309']
const usefulColors = Object.keys(colors).filter(key=>!['glass','glassBlue','glassCyan','pink','lime','magenta','gold','brightGreen','leafGreen'].includes(key))
function colorEvidence(reference, ids) {
  const counts = new Map()
  for(const id of ids) for(const [color,qty] of reference?.swatches[id]??[]) {
    counts.set(color,(counts.get(color)??0)+qty)
  }
  return usefulColors.map(key=>[key,counts.get(inventoryColor(key))??0])
    .filter(([,count])=>count>=4).sort((a,b)=>b[1]-a[1]).map(([key])=>key)
}
function makeRecipe(key,reference) {
  const [composition,facade,roof,scheme,detail]=families[key]
  const textures=wallParts.map(id=>[id,(reference?.swatches[id]??[]).reduce((sum,[,qty])=>sum+qty,0)])
    .filter(([,qty])=>qty>=3).sort((a,b)=>b[1]-a[1]).map(([id])=>id)
  return {key,composition,facade,roof,scheme,detail,textures,
    roofColors:colorEvidence(reference,roofParts),
    wallColors:colorEvidence(reference,['3001','3004','3005','3010',...wallParts]),
    source:sources[reference?.number],interiorOnly:isolatedRooms.has(reference?.number)}
}
export function referenceRecipe(reference) {
  const key=assignment.get(reference?.number)
  if(!key) return null
  if(!recipes.has(reference)) recipes.set(reference,makeRecipe(key,reference))
  return recipes.get(reference)
}

export function streetRecipe(recipe,index) {
  if(index===0) return recipe
  const mixes={
    riviera:['riviera','modernHouse','fishing'],
    downtown:['downtown','apartmentRow','diner','cityTower'],
    winter:['winter','gothic','hut'],
    bazaar:['bazaar','brownstones','gothic'],
    townSquare:['townSquare','municipal','tram'],
    apartmentRow:['apartmentRow','modernHouse','cityTower'],
    diner:['diner','brownstones','tram']
  }
  const mix=mixes[recipe.key]??[recipe.key,'brownstones','modernHouse']
  const key=mix[index%mix.length]
  return key===recipe.key?recipe:makeRecipe(key)
}
