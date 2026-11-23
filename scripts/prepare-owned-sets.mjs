import fs from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createInterface} from 'node:readline'
import {gzipSync,gunzipSync} from 'node:zlib'

const cache=process.env.BRICK_DATA??path.join(os.tmpdir(),'kirpichik-catalog')
await fs.mkdir(cache,{recursive:true})
async function source(name) {
  const filename=path.join(cache,name+'.csv')
  try { await fs.access(filename) }
  catch {
    const response=await fetch('https://cdn.rebrickable.com/media/downloads/'+name+'.csv.gz')
    if(!response.ok) throw Error('Rebrickable '+name+': '+response.status)
    await fs.writeFile(filename,gunzipSync(Buffer.from(await response.arrayBuffer())))
  }
  return filename
}
const [setFile,inventoryFile,partFile]=await Promise.all(['sets','inventories','inventory_parts'].map(source))
const sets=new Map()
for(const line of (await fs.readFile(setFile,'utf8')).split(/\r?\n/)) {
  const match=line.match(/^(\d{3,8}-\d+),("(?:[^"]|"")*"|[^,]+),(\d+),\d+,(\d+),/)
  if(!match||Number(match[4])<1) continue
  const [,id,title,year,count]=match
  sets.set(id,{title:title.replace(/^"|"$/g,'').replaceAll('""','"'),year:+year,count:+count,parts:[]})
}
const newest=new Map()
for(const line of (await fs.readFile(inventoryFile,'utf8')).split(/\r?\n/)) {
  const [id,version,set]=line.split(',')
  if(sets.has(set)&&+version>(newest.get(set)?.version??0)) newest.set(set,{id,version:+version})
}
const active=new Map([...newest].map(([set,{id}])=>[id,sets.get(set)]))
for await(const line of createInterface({input:createReadStream(partFile),crlfDelay:Infinity})) {
  const [id,part,color,count,spare]=line.split(',',5)
  const set=active.get(id)
  if(set&&spare==='False') set.parts.push([part,+color,+count])
}
const shards=new Map()
for(const [id,set] of sets) {
  if(!set.parts.length) continue
  const prefix=id.slice(0,2)
  if(!shards.has(prefix)) shards.set(prefix,{})
  shards.get(prefix)[id]=set
}
const output='public/owned-sets'
await fs.mkdir(output,{recursive:true})
let bytes=0, indexed=0
for(const [prefix,data] of shards) {
  const payload=gzipSync(JSON.stringify(data),{level:9})
  await fs.writeFile(path.join(output,prefix+'.json.gz'),payload)
  bytes+=payload.length
  indexed+=Object.keys(data).length
}
await fs.writeFile(path.join(output,'index.json'),JSON.stringify([...shards.keys()].sort()))
console.log(`Indexed ${indexed} set inventories · ${(bytes/1e6).toFixed(2)} MB`)
