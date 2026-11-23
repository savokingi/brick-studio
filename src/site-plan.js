export const zoneNames={house:'Дом',road:'Дорога',path:'Тротуар',garden:'Сад'}

function separated(a,b,padding=0) {
  return a.x+a.w+padding<=b.x||b.x+b.w+padding<=a.x||a.z+a.d+padding<=b.z||b.z+b.d+padding<=a.z
}

export function validateSitePlan(plan,width,depth) {
  if(!Array.isArray(plan)||plan.length>40) return 'Участок поддерживает до 40 зон.'
  for(const zone of plan) {
    if(!zone||!Object.hasOwn(zoneNames,zone.kind)||!['x','z','w','d'].every(key=>Number.isInteger(zone[key]))
      ||zone.x<0||zone.z<0||zone.w<1||zone.d<1||zone.x+zone.w>width||zone.z+zone.d>depth) {
      return 'Зона выходит за размеры участка.'
    }
    if(zone.kind==='house'&&(zone.w<8||zone.d<8||zone.x<1||zone.z<1||zone.x+zone.w>=width||zone.z+zone.d>=depth)) {
      return 'Для дома нужны минимум 8 × 8 пинов и один пин до края участка.'
    }
  }
  if(plan.filter(zone=>zone.kind==='house').length>5) return 'На одном участке помещается до пяти домов.'
  for(const [index,zone] of plan.entries()) for(const other of plan.slice(0,index)) {
    const homes=zone.kind==='house'&&other.kind==='house'
    if(!separated(zone,other,homes?2:0)) return homes?'Между домами оставьте два пина.':'Зоны пересекаются.'
  }
  return ''
}
