import {validateSitePlan,zoneNames} from './site-plan.js'

const swatches={house:'#e3ab5c',road:'#55636a',path:'#abb8bd',garden:'#90aa6c'}

export function openSiteEditor(dialog,{width,depth,plan,onSave}) {
  dialog.innerHTML=`<div class="dialog-title"><h2>План участка · ${width} × ${depth}</h2><form method="dialog"><button class="bare" aria-label="Закрыть">✕</button></form></div>
    <p class="muted">Выберите зону и растяните прямоугольник на сетке. Размеры можно ввести вручную.</p>
    <label class="field">Зона<select id="zone-kind"></select></label>
    <canvas class="lot-grid" aria-label="Сетка участка"></canvas>
    <form class="zone-form"><label>Слева<input name="x" type="number" min="0" required value="1"></label><label>Сверху<input name="z" type="number" min="0" required value="1"></label><label>Ширина<input name="w" type="number" min="1" required value="10"></label><label>Длина<input name="d" type="number" min="1" required value="10"></label><button class="subtle">Добавить зону</button></form>
    <p id="zone-error" role="status" class="muted"></p><ul class="zone-list"></ul><div class="feature-actions"><button class="primary" id="zone-save">Использовать план</button><button class="subtle" id="zone-clear">Очистить</button><button class="subtle" id="zone-default">Автоматический план</button></div>`
  const find=selector=>dialog.querySelector(selector)
  const canvas=find('canvas'),ctx=canvas.getContext('2d')
  const kind=find('#zone-kind'),form=find('.zone-form')
  for(const [value,name] of Object.entries(zoneNames)) kind.append(new Option(name,value))
  let zones=plan.map(zone=>({...zone})), start=null, end=null
  const cell=12
  canvas.width=width*cell
  canvas.height=depth*cell
  function draw() {
    ctx.fillStyle='#f1f6f7'
    ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.strokeStyle='#d5e0e2'
    for(let x=0;x<=width;x++) {ctx.beginPath();ctx.moveTo(x*cell,0);ctx.lineTo(x*cell,canvas.height);ctx.stroke()}
    for(let z=0;z<=depth;z++) {ctx.beginPath();ctx.moveTo(0,z*cell);ctx.lineTo(canvas.width,z*cell);ctx.stroke()}
    for(const zone of zones) {
      ctx.fillStyle=swatches[zone.kind]
      ctx.fillRect(zone.x*cell+1,zone.z*cell+1,zone.w*cell-2,zone.d*cell-2)
    }
    if(start&&end) {
      const box=selection()
      ctx.strokeStyle='#283a42'
      ctx.lineWidth=2
      ctx.strokeRect(box.x*cell,box.z*cell,box.w*cell,box.d*cell)
      ctx.lineWidth=1
    }
  }
  function refresh() {
    draw()
    const list=find('.zone-list')
    list.replaceChildren(...zones.map((zone,index)=>{
      const row=document.createElement('li'),remove=document.createElement('button')
      row.append(zoneNames[zone.kind]+' · '+zone.w+' × '+zone.d)
      remove.type='button';remove.className='subtle';remove.textContent='Убрать'
      remove.onclick=()=>{zones.splice(index,1);refresh()}
      row.append(remove)
      return row
    }))
  }
  function attempt(box) {
    const zone={kind:kind.value,...box}
    const error=validateSitePlan([...zones,zone],width,depth)
    find('#zone-error').textContent=error
    if(error) return
    zones.push(zone)
    refresh()
  }
  function point(event) {
    const b=canvas.getBoundingClientRect()
    return {x:Math.min(width-1,Math.max(0,Math.floor((event.clientX-b.left)*width/b.width))),
      z:Math.min(depth-1,Math.max(0,Math.floor((event.clientY-b.top)*depth/b.height)))}
  }
  function selection() {
    return {x:Math.min(start.x,end.x),z:Math.min(start.z,end.z),w:Math.abs(start.x-end.x)+1,d:Math.abs(start.z-end.z)+1}
  }
  canvas.onpointerdown=event=>{start=end=point(event);canvas.setPointerCapture(event.pointerId);draw()}
  canvas.onpointermove=event=>{if(start){end=point(event);draw()}}
  canvas.onpointerup=event=>{
    if(!start)return
    end=point(event)
    const box=selection()
    start=end=null
    for(const [key,value] of Object.entries(box)) form.elements[key].value=value
    attempt(box)
    draw()
  }
  canvas.onpointercancel=()=>{start=end=null;draw()}
  form.onsubmit=event=>{
    event.preventDefault()
    attempt(Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,Number(value)])))
  }
  find('#zone-clear').onclick=()=>{zones=[];find('#zone-error').textContent='';refresh()}
  find('#zone-default').onclick=()=>{dialog.close();onSave(null)}
  find('#zone-save').onclick=()=>{
    if(!zones.some(zone=>zone.kind==='house')) {find('#zone-error').textContent='Добавьте хотя бы один дом.';return}
    dialog.close()
    onSave(zones)
  }
  refresh()
  dialog.showModal()
}
