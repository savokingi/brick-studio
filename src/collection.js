import {catalog,colors,inventoryColor} from './catalog.js'
import availability from './availability.json' with {type:'json'}

export function parseSetLink(value) {
  const input=value.trim()
  if(/^\d{3,8}(?:-\d{1,2})?$/.test(input)) return {id:input.includes('-')?input:input+'-1'}
  try {
    const url=new URL(input)
    if(url.protocol!=='https:'||!['lego.com','www.lego.com'].includes(url.hostname)||url.username||url.password) return null
    const match=url.pathname.match(/\/product\/[^/]*?(\d{3,8})(?:\/|$)|\/service\/building-?instructions\/(\d{3,8})(?:\/|$)/i)
    const number=match?.[1]??match?.[2]
    if(number) return {id:number+'-1',url:url.origin+url.pathname}
  } catch {}
  return null
}

const shards=new Map()
export async function lookupSet(id,base=import.meta.env.BASE_URL) {
  const prefix=id.slice(0,2)
  if(!shards.has(prefix)) {
    shards.set(prefix,(async()=>{
      const keys=await fetch(base+'owned-sets/index.json')
      if(!keys.ok) throw Error('Каталог наборов временно недоступен.')
      if(!(await keys.json()).includes(prefix)) return {}
      const response=await fetch(base+'owned-sets/'+prefix+'.json.gz')
      if(!response.ok) throw Error('Каталог наборов временно недоступен.')
      const data=await response.arrayBuffer()
      const payload=new Uint8Array(data)
      // Some hosts transparently decode files served with Content-Encoding.
      if(payload[0]!==0x1f||payload[1]!==0x8b) return JSON.parse(new TextDecoder().decode(payload))
      const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))
      return new Response(stream).json()
    })().catch(error=>{shards.delete(prefix);throw error}))
  }
  return (await shards.get(prefix))[id]??null
}

export function parseOwnedInventory(csv) {
  const [first,...lines]=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/)
  const separator=first.includes(';')?';':','
  const cells=line=>line.split(separator).map(value=>value.trim().replace(/^"|"$/g,''))
  const columns=cells(first).map(value=>value.toLowerCase())
  const indices=['part_num','color_id','quantity'].map(key=>columns.indexOf(key))
  if(indices.includes(-1)) throw Error('Нужен CSV с колонками part_num, color_id и quantity.')
  const parts=[]
  for(const line of lines) {
    if(!line.trim()) continue
    const fields=cells(line)
    const [id,color,count]=indices.map(index=>fields[index])
    if(!/^[\w.-]{1,40}$/.test(id??'')||!/^\d{1,6}$/.test(color??'')||!/^\d{1,6}$/.test(count??'')||+count<1) {
      throw Error('Проверьте артикул, цвет и количество в CSV.')
    }
    parts.push([id,+color,+count])
  }
  if(!parts.length) throw Error('В таблице нет деталей.')
  return parts
}

const key=(id,color)=>id+'|'+color

export function ownedStock(sets) {
  const stock=new Map()
  for(const set of sets) for(const [id,color,count] of set.parts) {
    const sku=key(id,color)
    stock.set(sku,(stock.get(sku)??0)+count*set.quantity)
  }
  return stock
}

export function compareStock(inventory,stock) {
  const used=new Map()
  const rows=inventory.map(part=>{
    const sku=key(part.id,inventoryColor(part.color))
    const have=Math.min(part.count,stock.get(sku)??0)
    used.set(sku,have)
    return {...part,have,missing:part.count-have}
  })
  // Offer other colors from stock after reserving pieces needed by exact matches.
  for(const row of rows) {
    row.substitutes=[]
    if(!row.missing) continue
    let remaining=row.missing
    for(const [sku,count] of stock) {
      const [id,color]=sku.split('|')
      const free=count-(used.get(sku)??0)
      if(id!==row.id||free<=0||+color===inventoryColor(row.color)) continue
      const quantity=Math.min(free,remaining)
      row.substitutes.push({color:+color,quantity})
      used.set(sku,(used.get(sku)??0)+quantity)
      remaining-=quantity
      if(!remaining) break
    }
  }
  return {rows,missing:rows.reduce((sum,row)=>sum+row.missing,0),available:rows.reduce((sum,row)=>sum+row.have,0)}
}

const compatible=new Set(['brick','masonry','log','fluted','plate','tile'])
const colorGroups=Object.keys(colors)
const family=part=>[part.w,part.d,part.h,part.studs??false,
  ['brick','masonry','log','fluted'].includes(part.kind)?'brick':part.kind].join('/')
const coordinate=part=>[part.id,part.building,part.floor,part.role,part.x,part.y,part.z,part.rotation].join('/')

export function tuneToStock(parts,stock) {
  const free=new Map(stock)
  const missing=[]
  for(const part of parts) {
    const sku=key(part.id,inventoryColor(part.color))
    const count=free.get(sku)??0
    if(count) free.set(sku,count-1)
    else missing.push(part)
  }
  const pools=new Map()
  for(const [sku,count] of free) {
    if(!count) continue
    const [id,colorId]=sku.split('|')
    const spec=catalog[id]
    const color=colorGroups.find(color=>inventoryColor(color)===+colorId)
    if(!spec||!color||!availability[id]?.[colorId]) continue
    const group=compatible.has(spec.kind)?family(spec):id
    if(!pools.has(group)) pools.set(group,[])
    pools.get(group).push({sku,id,color})
  }
  const swaps={}
  for(const part of missing) {
    const spec=catalog[part.id]
    const pool=pools.get(compatible.has(spec.kind)?family(spec):part.id)??[]
    const feasible=pool.filter(item=>free.get(item.sku)>0)
    const match=feasible.find(item=>item.color===part.color)
      ??feasible.sort((a,b)=>(free.get(b.sku)??0)-(free.get(a.sku)??0))[0]
    if(!match) continue
    free.set(match.sku,free.get(match.sku)-1)
    swaps[coordinate(part)]=[match.id,match.color]
  }
  return {swaps,missing:missing.length-Object.keys(swaps).length}
}

export function applyStockSwaps(parts,swaps) {
  for(const part of parts) {
    const swap=swaps[coordinate(part)]
    if(!Array.isArray(swap)) continue
    const [id,color]=swap
    const original=catalog[part.id],replacement=catalog[id]
    if(!replacement||!Object.hasOwn(colors,color)||
      !(id===part.id||compatible.has(original.kind)&&compatible.has(replacement.kind)&&family(original)===family(replacement))) continue
    const element=availability[id]?.[inventoryColor(color)]
    if(!element) continue
    Object.assign(part,{id,color,element,kind:replacement.kind})
  }
}
