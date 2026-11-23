import {catalog,colors} from './catalog.js'
import {inventory} from './generator.js'

export function download(filename,data,mime='text/plain') {
  const link=document.createElement('a'), url=URL.createObjectURL(new Blob([data],{type:mime}))
  link.href=url
  link.download=filename
  link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export function exportLDraw(model) {
  const lines=['0 FILE model.ldr','0 '+model.title,'0 Name: model.ldr','0 Author: Brick Studio','0 !LDRAW_ORG Unofficial_Model']
  const stepStarts=new Set(model.steps.slice(1).map(s=>s.start))
  model.parts.forEach((p,index)=>{
    if(stepStarts.has(index)) lines.push('0 STEP')
    const spec=catalog[p.id], a=(p.rotation??(p.w<p.d?90:0))*Math.PI/180, c=Math.round(Math.cos(a)), s=Math.round(Math.sin(a))
    const orientation=a+(spec?.insertRotation??0)*Math.PI/180
    const cos=Math.round(Math.cos(orientation)), sin=Math.round(Math.sin(orientation))
    const ox=spec?.originX??0, oz=spec?.originZ??0
    const x=(p.x+p.w/2+c*ox+s*oz)*20, y=-(p.y+p.h)*8-(spec?.originY??0)*20, z=(p.z+p.d/2-s*ox+c*oz)*20
    lines.push([1,colors[p.color][2],x,y,z,cos,0,sin,0,1,0,-sin,0,cos,(spec?.ldraw??p.id)+'.dat'].join(' '))
  })
  lines.push('0 NOFILE')
  return lines.join('\r\n')
}
export function exportInventory(model) {
  const rows=[['Артикул','Element ID','Деталь','Цвет','Код LDraw','Количество'],...inventory(model.parts).map(p=>[p.id,p.element??'',p.label,colors[p.color][0],colors[p.color][2],p.count])]
  return '\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(';')).join('\r\n')
}
