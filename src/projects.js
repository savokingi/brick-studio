export const statusNames={draft:'Черновик',building:'В сборке',built:'Собрано'}

export function splitInstructions(steps,partCount,limit=16,parts) {
  const result=[]
  for(const [index,step] of steps.entries()) {
    const end=steps[index+1]?.start??partCount
    const chunks=Math.max(1,Math.ceil((end-step.start)/limit))
    for(let n=0;n<chunks;n++) {
      result.push({...step,start:step.start+n*limit,
        title:chunks>1?step.title+' · '+(n+1)+'/'+chunks:step.title})
    }
  }
  if(parts) {
    const layouts=new Map()
    for(const [index,step] of result.entries()) {
      const placed=parts.slice(step.start,result[index+1]?.start??partCount)
      if(placed.length<2) continue
      const x=Math.min(...placed.map(part=>part.x))
      const y=Math.min(...placed.map(part=>part.y))
      const z=Math.min(...placed.map(part=>part.z))
      const key=JSON.stringify([step.module,step.section,placed.map(part=>[part.id,part.color,part.x-x,part.y-y,part.z-z,part.rotation].join('/')).sort()])
      const first=layouts.get(key)
      if(first===undefined) layouts.set(key,index)
      else {
        result[first].repeatCount=(result[first].repeatCount??1)+1
        step.repeatFrom=first+1
      }
    }
  }
  return result
}

export function modelSnapshot(model,name,project={}) {
  return {
    id:project.id??globalThis.crypto.randomUUID(),name,options:model.options,variant:model.variant,
    status:project.status??'draft',nextPart:project.nextPart??0,locks:project.locks??{},
    district:project.district,thumbnail:project.thumbnail,partCount:model.parts?.length??project.partCount,updated:Date.now()
  }
}

export function readProject(text) {
  const data=JSON.parse(text)
  const {name,options,variant,status,nextPart,locks,district}=data.project??{}
  if(data.format!=='kirpichik-project-v1'||typeof name!=='string'||!options||!variant
    ||!Number.isFinite(variant.seed)||typeof variant.design!=='object'||!variant.design
    ||(variant.version!==undefined&&![1,2,3,4,5,6,7,8,9].includes(variant.version))) {
    throw Error('Файл проекта «Кирпичика» не распознан.')
  }
  return {
    name:name.trim().slice(0,80)||'Импортированный проект',options,variant,
    status:Object.hasOwn(statusNames,status)?status:'draft',
    nextPart:Number.isInteger(nextPart)&&nextPart>=0?nextPart:0,
    locks:Object.fromEntries(Object.entries(locks??{}).filter(([key,value])=>/^house-\d+\/(all|roof|facade|interior)$/.test(key)&&value===true)),
    district:typeof district==='string'?district.slice(0,80):undefined
  }
}
