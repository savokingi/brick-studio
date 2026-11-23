import fs from 'node:fs/promises'
import path from 'node:path'
import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'
import { catalog } from '../src/catalog.js'

const ids = ['54200','2412b','85984','15068','11477','60592','60601','59349','60581','87544','2877','15207','60593','60602','60607','3037','92950','3633','6182','15533','30137','15332','3043','80543','92589','57894','57895','14718','6005','3298','3005','3004','3622','3010','3009','3008','3003','3002','3001','2456','3024','3023','3623','3710','3666','3460','3022','3021','3020','3795','3034','3031','3032','3035','3958','3036','41539','92438','91405','3070b','3069b','63864','2431','6636','3068b','26603','87079','60594','60603','60596','60623','3659','3039','3040b','4070','98283','3062b','98138','24866','3941','6141','2423','37762','30136','4865b','22885','87580','4162','4079','3899','4599a','4740']
for (const id of Object.keys(catalog)) if(!ids.includes(id)) ids.push(id)
const root = path.resolve('public/ldraw')
await fs.mkdir(root,{recursive:true})
const cache = new Map()
const authors = new Map()
async function source(name) {
  name = name.toLowerCase().replaceAll('\\','/')
  if (cache.has(name)) return cache.get(name)
  const task = (async()=>{
    let text, location
    try { text = await fs.readFile(path.join(root,name),'utf8') }
    catch {
      if (process.env.LDRAW_SOURCE) {
        for (const folder of ['parts','p']) {
          try {
            text = await fs.readFile(path.join(process.env.LDRAW_SOURCE,folder,name),'utf8')
            location = 'https://library.ldraw.org/library/official/'+folder+'/'+name
            break
          } catch {}
        }
      }
      if (!text) {
      for (const folder of ['parts','p']) {
        const url='https://library.ldraw.org/library/official/'+folder+'/'+name
        const response=await fetch(url)
        if(response.ok) {text=await response.text(); location=url; break}
      }
      }
      if (!text || !text.startsWith('0 ')) throw new Error('Missing LDraw file '+name)
      await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true})
      await fs.writeFile(path.join(root,name),text)
    }
    authors.set(name,{ name, author:text.match(/^0 Author: (.*)/m)?.[1]?.trim(), license:text.match(/^0 !LICENSE (.*)/m)?.[1]?.trim(), url:location ?? 'https://library.ldraw.org/library/official/'+(/!LDRAW_ORG (Part|Subpart)/.test(text)?'parts/':'p/')+name })
    const references = text.split(/\r?\n/).filter(line=>line.startsWith('1 ')).map(line=>line.trim().split(/\s+/).slice(14).join(' '))
    await Promise.all([...new Set(references)].map(source))
    return text
  })()
  cache.set(name,task)
  return task
}
const filename=id=>(catalog[id].ldraw??id)+'.dat'
for(let i=0;i<ids.length;i+=4) await Promise.all(ids.slice(i,i+4).map(id=>source(filename(id))))
console.log('Downloaded '+cache.size+' LDraw files')

async function flatten(name, matrix, positions, reverse=false, paints=null, inherited=16) {
  const text=await source(name)
  let clockwise=false, invert=false
  for(const line of text.split(/\r?\n/)) {
    const t=line.trim().split(/\s+/), type=Number(t[0])
    if (type===0) {
      if(line.includes('BFC CERTIFY CW')) clockwise=true
      if(line.includes('BFC CERTIFY CCW')) clockwise=false
      if(line.includes('BFC INVERTNEXT')) invert=true
      continue
    }
    const color=Number(t[1])===16?inherited:Number(t[1])
    if(type===1) {
      const n=t.slice(2,14).map(Number)
      const local=new Matrix4().set(n[3],n[4],n[5],n[0],n[6],n[7],n[8],n[1],n[9],n[10],n[11],n[2],0,0,0,1)
      await flatten(t.slice(14).join(' ').toLowerCase().replaceAll('\\','/'),matrix.clone().multiply(local),positions,reverse!==invert!==(local.determinant()<0),paints,color)
      invert=false
    } else if(type===3 || type===4) {
      const vertices=[]
      for(let i=2;i<t.length;i+=3) vertices.push(new Vector3(Number(t[i]),Number(t[i+1]),Number(t[i+2])).applyMatrix4(matrix))
      const triangles=type===3?[[0,1,2]]:[[0,1,2],[0,2,3]]
      for(const triangle of triangles) {
        if(clockwise!==reverse) triangle.reverse()
        if(paints&&!paints.has(color)) paints.set(color,[])
        const target=paints?paints.get(color):positions
        for(const i of triangle) target.push(...vertices[i].toArray())
      }
    }
  }
}
const chunks=[], manifest={}
let offset=0
for(const id of ids) {
  const positions=[]
  const paints=catalog[id].painted?new Map():null
  await flatten(filename(id),new Matrix4().makeScale(0.05,-0.05,0.05),positions,true,paints)
  const groups=[]
  if(paints) for(const [color,vertices] of paints) {
    groups.push({color,start:positions.length/3,count:vertices.length/3})
    for(const v of vertices) positions.push(v)
  }
  const geometry=toCreasedNormals(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(positions,3)),Math.PI/4.1)
  const pos=geometry.getAttribute('position').array, normal=geometry.getAttribute('normal').array
  geometry.computeBoundingBox()
  manifest[id]={offset,count:pos.length/3,bounds:{min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()},name:(await source(filename(id))).split(/\r?\n/)[0].slice(2)}
  if(groups.length) manifest[id].groups=groups
  chunks.push(Buffer.from(pos.buffer),Buffer.from(normal.buffer))
  offset+=pos.byteLength+normal.byteLength
}
await fs.writeFile('public/parts.bin',Buffer.concat(chunks))
await fs.writeFile('public/parts.json',JSON.stringify(manifest))
await fs.writeFile('public/ldraw/ATTRIBUTION.json',JSON.stringify([...authors.values()],null,2))
await fs.writeFile('public/ldraw/LICENSE.txt','LDraw parts library files and compiled geometry are licensed under CC BY 4.0.\nhttps://creativecommons.org/licenses/by/4.0/\nhttps://www.ldraw.org/article/349.html\nOriginal authors and source filenames are listed in ATTRIBUTION.json.\nCompiled geometry changes: flattening, unit conversion and vertex normals.\n')
console.log('Compiled '+ids.length+' parts, '+(offset/1024/1024).toFixed(2)+' MiB')

