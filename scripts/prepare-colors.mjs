import fs from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {catalog,colors,inventoryColor} from '../src/catalog.js'
const response=await fetch('https://cdn.rebrickable.com/media/downloads/elements.csv.gz')
if(!response.ok) throw new Error('Inventory dataset unavailable')
const csv=gunzipSync(Buffer.from(await response.arrayBuffer())).toString()
const availability={}
for(const line of csv.trim().split(/\r?\n/).slice(1)) {
 const [element,part,color]=line.split(',')
 const spec=catalog[part]
 if(spec&&(!spec.assemblyColor||inventoryColor(spec.assemblyColor)===Number(color))) {
   availability[part]??={}
   availability[part][color]=element
 }
}
await fs.writeFile('src/availability.json',JSON.stringify(availability))
const retrieved=new Date().toISOString().slice(0,10)
await fs.writeFile('public/ldraw/COLOR-SOURCE.txt','Part and color availability derived from Rebrickable elements.csv.gz, retrieved '+retrieved+'.\nhttps://rebrickable.com/downloads/\nhttps://rebrickable.com/terms/\n')
console.log(Object.fromEntries(Object.keys(catalog).map(id=>[id,Object.entries(colors).filter(([,v])=>availability[id]?.[v[2]]).map(([k])=>k)])))
