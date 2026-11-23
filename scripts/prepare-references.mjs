import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import os from 'node:os'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { catalog } from '../src/catalog.js'

const cache = process.env.BRICK_DATA ?? path.join(os.tmpdir(), 'kirpichik-catalog')
await fs.mkdir(cache, { recursive: true })
const selected = new Map()
let series
for (const line of (await fs.readFile('scripts/reference-selection.txt', 'utf8')).trim().split(/\r?\n/)) {
  if (line.startsWith('#')) { series = line.slice(2); continue }
  const [number, profile, type, style] = line.split('|')
  selected.set(number+'-1', { number, series, profile, type, style })
}
async function source(name) {
  const file = path.join(cache, name+'.csv')
  try { await fs.access(file) }
  catch {
    const response = await fetch('https://cdn.rebrickable.com/media/downloads/'+name+'.csv.gz')
    if (!response.ok) throw new Error(name+' '+response.status)
    await fs.writeFile(file, gunzipSync(Buffer.from(await response.arrayBuffer())))
  }
  return file
}
const names = ['sets', 'inventories', 'inventory_parts']
const files = Object.fromEntries(await Promise.all(names.map(async name => [name, await source(name)])))
const sets = new Map()
for (const line of (await fs.readFile(files.sets, 'utf8')).split(/\r?\n/)) {
  const match = line.match(/^([^,]+),("(?:[^"]|"")*"|[^,]+),(\d+),(\d+),(\d+),(.+)$/)
  if (!match || !selected.has(match[1])) continue
  const [,id,title,year,,count,image] = match
  sets.set(id, { ...selected.get(id), id, title: title.replace(/^"|"$/g, '').replaceAll('""', '"'), year:+year, count:+count, image })
}
for (const id of selected.keys()) if (!sets.has(id)) throw new Error('Не найден набор '+id)
const inventories = new Map()
for (const line of (await fs.readFile(files.inventories, 'utf8')).split(/\r?\n/)) {
  const [id, version, code] = line.split(',')
  if (sets.has(code) && (inventories.get(code)?.version ?? 0) < +version) inventories.set(code, {id,version:+version})
}
const active = new Map([...inventories].map(([code, {id}]) => [id, code]))
const inventory = new Map()
const usage = new Map()
for await (const line of createInterface({input:createReadStream(files.inventory_parts),crlfDelay:Infinity})) {
  const [id, part, color, quantity, spare] = line.split(',', 5)
  const set = active.get(id)
  if (!set || spare !== 'False') continue
  if (!inventory.has(set)) inventory.set(set, [])
  inventory.get(set).push([part, +color, +quantity])
  if (!usage.has(part)) usage.set(part, new Set())
  usage.get(part).add(set)
}
const references = [...selected.keys()].map(id => {
  const rows = inventory.get(id)
  if (!rows?.length) throw new Error('Нет состава набора '+id)
  const swatches = {}
  for (const [part,color,quantity] of rows) {
    if (catalog[part]) {
      swatches[part] ??= []
      swatches[part].push([color, quantity])
    }
  }
  return {...sets.get(id), distinct:new Set(rows.map(row=>row[0])).size, swatches}
})
await fs.mkdir('public/reference-inventory', {recursive:true})
for (const [set,rows] of inventory) {
  await fs.writeFile('public/reference-inventory/'+set+'.csv', 'part_num,color_id,quantity\r\n'+rows.map(row=>row.join(',')).join('\r\n'))
}
await fs.writeFile('src/references.json', JSON.stringify(references))
await fs.writeFile(path.join(cache,'reference-usage.json'), JSON.stringify(Object.fromEntries([...usage].map(([id,sets])=>[id,[...sets]]))))
console.log('Indexed', references.length, 'sets and', usage.size, 'distinct inventory part numbers')
