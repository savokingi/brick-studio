import {colors} from './catalog.js'
import {legoPalettes} from './scene.js'

const size=96
const rgb=value=>[value>>16&255,value>>8&255,value&255]

export async function analyzePhoto(file) {
  const image=await createImageBitmap(file,{resizeWidth:480,resizeQuality:'high'})
  const canvas=document.createElement('canvas')
  canvas.width=canvas.height=size
  const ctx=canvas.getContext('2d',{willReadFrequently:true})
  ctx.drawImage(image,0,0,size,size)
  image.close()
  const {data}=ctx.getImageData(0,0,size,size)
  const bins=new Map()
  const light=(x,y)=> {
    const i=(y*size+x)*4
    return data[i]*0.3+data[i+1]*0.59+data[i+2]*0.11
  }
  for(let y=8;y<size-8;y++) for(let x=8;x<size-8;x++) {
    const i=(y*size+x)*4
    const values=[data[i],data[i+1],data[i+2]]
    if(data[i+3]<180||Math.min(...values)>233||Math.max(...values)<22) continue
    const key=values.map(value=>Math.floor(value/32)).join('/')
    if(!bins.has(key)) bins.set(key,{count:0,sum:[0,0,0]})
    const bin=bins.get(key)
    bin.count++
    values.forEach((value,index)=>{bin.sum[index]+=value})
  }
  const swatches=[...bins.values()].sort((a,b)=>b.count-a.count).slice(0,5)
    .map(({sum,count})=>sum.map(value=>Math.round(value/count)))
  if(!swatches.length) throw Error('На фото не удалось выделить цвета.')
  const ranked=[]
  for(const [style,palettes] of Object.entries(legoPalettes)) for(const [index,palette] of palettes.entries()) {
    const score=swatches.reduce((sum,sample,position)=>sum+Math.min(...palette.slice(0,7).map(key=>
      rgb(colors[key][1]).reduce((distance,value,channel)=>distance+(value-sample[channel])**2,0)))/(position+1),0)
    ranked.push({style,index,score})
  }
  ranked.sort((a,b)=>a.score-b.score)
  function edge(from,to) {
    const heights=[]
    for(let x=from;x<to;x++) {
      let y=4
      while(y<44&&Math.abs(light(x,y+3)-light(x,y-3))<26) y++
      heights.push(y)
    }
    return heights.sort((a,b)=>a-b)[Math.floor(heights.length/2)]
  }
  const left=edge(16,31),center=edge(40,55),right=edge(65,80)
  const roof=center+5<Math.min(left,right)?'gable':Math.abs(left-right)>9?'shed':'terrace'
  const rhythm=Array.from({length:11},(_,i)=>Math.abs(light(10+i*7,49)-light(14+i*7,49)))
    .filter(difference=>difference>=30).length
  return {swatches,ranked,roof,rhythm}
}
