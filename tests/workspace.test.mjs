import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {applyStockSwaps,compareStock,ownedStock,parseOwnedInventory,parseSetLink,tuneToStock} from '../src/collection.js'
import {build,inventory,newOwnedModel,normalize,parameters} from '../src/generator.js'
import {isTransparent} from '../src/catalog.js'
import {modelSnapshot,readProject,splitInstructions} from '../src/projects.js'
import {validateSitePlan} from '../src/site-plan.js'

test('official products and instruction links can resolve through the local catalogue',()=>{
  const product=parseSetLink('https://www.lego.com/en-us/product/tudor-corner-10350?tracking=1')
  assert.equal(product.id,'10350-1')
  assert.equal(product.url,'https://www.lego.com/en-us/product/tudor-corner-10350')
  assert.equal(parseSetLink('https://www.lego.com/en-us/service/building-instructions/60380').id,'60380-1')
  assert.equal(parseSetLink('https://lego.com.example.org/product/60380'),null)
  const shard=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public/owned-sets/10.json.gz',import.meta.url))))
  assert.ok(shard[product.id].parts.length>200)
  assert.equal(shard[product.id].title,'Tudor Corner')
  assert.deepEqual(parseOwnedInventory('part_num,color_id,quantity\r\n3004,15,4'),[['3004',15,4]])
  assert.throws(()=>parseOwnedInventory('part_num,color_id,quantity\n3004,15,-1'))
})

test('collection quantities are reserved before color and compatible form substitutions',()=>{
  const stock=ownedStock([{quantity:2,parts:[['3004',15,1],['3004',0,1],['98283',71,1]]}])
  const parts=[
    {id:'3004',color:'white',x:1,y:3,z:2,rotation:0,kind:'brick'},
    {id:'3004',color:'white',x:3,y:3,z:2,rotation:0,kind:'brick'},
    {id:'3004',color:'white',x:5,y:3,z:2,rotation:0,kind:'brick'},
    {id:'3004',color:'black',x:7,y:3,z:2,rotation:0,kind:'brick'},
    {id:'3004',color:'black',x:9,y:3,z:2,rotation:0,kind:'brick'}
  ]
  const before=compareStock(inventory(parts),stock)
  assert.equal(before.missing,1)
  assert.deepEqual(before.rows[0].substitutes,[])
  const fit=tuneToStock(parts,stock)
  assert.equal(fit.missing,0)
  applyStockSwaps(parts,fit.swaps)
  assert.equal(parts[2].id,'98283')
  assert.equal(compareStock(inventory(parts),stock).missing,0)
})

test('strict collection mode fits the house to stock and preserves the exact parts on reload',()=>{
  const shard=JSON.parse(gunzipSync(fs.readFileSync(new URL('../public/owned-sets/10.json.gz',import.meta.url))))
  const stock=ownedStock([{...shard['10350-1'],quantity:1}])
  const options={width:48,depth:48,mode:'street',floors:5}
  const model=newOwnedModel(options,stock,[],1)
  assert.ok(model.ownedFootprint.every(size=>size<48))
  assert.equal(compareStock(inventory(model.parts),stock).missing,0)
  assert.ok(new Set(model.parts.filter(part=>part.role==='wall'||part.role==='roof')
    .map(part=>part.color).filter(color=>!isTransparent(color))).size<=3)
  assert.equal(model.variant.stockSwaps,undefined)
  const restored=build(model.options,JSON.parse(JSON.stringify(model.variant)))
  assert.deepEqual(restored.parts,model.parts)
  assert.ok(restored.modules.some(module=>module.id==='roof'))
  assert.throws(()=>newOwnedModel(options,ownedStock([{quantity:1,parts:[['3004',15,3]]}]),[],1),/Из деталей коллекции/)
})

test('strict collection generation handles small kits and changes construction between variants',()=>{
  const lookup=id=>{
    const filename='../public/owned-sets/'+id.slice(0,2)+'.json.gz'
    const shard=JSON.parse(gunzipSync(fs.readFileSync(new URL(filename,import.meta.url))))
    return ownedStock([{...shard[id+'-1'],quantity:1}])
  }
  const options={type:'home',style:'old',width:24,depth:24}
  for(const id of ['10696','31088','31134','40647']) {
    const stock=lookup(id)
    const model=newOwnedModel(options,stock,[],1)
    assert.ok(model.stockFamily,id)
    assert.equal(compareStock(inventory(model.parts),stock).missing,0,id)
    assert.deepEqual(build(model.options,JSON.parse(JSON.stringify(model.variant))).parts,model.parts)
  }
  const stock=lookup('10350'),history=[]
  for(let i=0;i<4;i++) {
    const model=newOwnedModel(options,stock,history,i+1,'different')
    assert.equal(compareStock(inventory(model.parts),stock).missing,0)
    history.push(model.variant)
  }
  assert.equal(new Set(history.map(item=>item.stockFamily)).size,4)
})

test('custom zones place houses and road exactly at the chosen coordinates',()=>{
  const sitePlan=[
    {kind:'road',x:0,z:0,w:27,d:4},
    {kind:'path',x:0,z:4,w:27,d:2},
    {kind:'house',x:2,z:7,w:10,d:12},
    {kind:'house',x:15,z:8,w:10,d:12},
    {kind:'garden',x:2,z:21,w:8,d:5}
  ]
  assert.equal(validateSitePlan(sitePlan,27,27),'')
  assert.match(validateSitePlan([...sitePlan,{kind:'path',x:1,z:4,w:1,d:1}],27,27),/пересекаются/)
  const options=normalize({width:27,depth:27,mode:'street',sitePlan})
  const seed=21, design={...parameters(options,seed),scheme:'street',streetPlan:'custom',reference:'60380',form:3}
  const model=build(options,{version:8,seed,design})
  assert.deepEqual(model.houses.map(house=>house.bounds),[{x0:2,z0:7,x1:12,z1:19},{x0:15,z0:8,x1:25,z1:20}])
  assert.deepEqual(model.streets,[{x0:0,z0:0,x1:27,z1:4}])
  assert.ok(model.parts.some(part=>part.x===2&&part.z===21&&['olive','leafGreen'].includes(part.color)))
})

test('short instructions preserve piece order and projects preserve progress',()=>{
  const steps=splitInstructions([{title:'Основание',start:0},{title:'Финиш',start:35}],35)
  assert.deepEqual(steps.map(step=>step.start),[0,16,32,35])
  const p=modelSnapshot({options:{width:24},variant:{version:8,seed:3,design:{}}},'Мой дом',{status:'building',nextPart:16})
  const saved=readProject(JSON.stringify({format:'kirpichik-project-v1',project:p}))
  assert.equal(saved.nextPart,16)
  assert.equal(saved.status,'building')
  assert.equal(saved.name,'Мой дом')
})
