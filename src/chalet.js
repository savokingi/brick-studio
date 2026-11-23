const box=(x,z,w,d)=>({x0:x,x1:x+w,z0:z,z1:z+d})
export const centeredDoor=({x0,x1})=>x0+Math.floor((x1-x0-4)/2)

export function chaletSite(house,width,depth) {
  const {x0,x1,z0,z1}=house.bounds
  const trees=[]
  const rocks=[]
  if(house.cabin==='forest'||house.cabin==='long') {
    if(x0>=5) trees.push({...box(x0-5,Math.max(0,z0+1),4,3),shade:'orange',height:6})
    if(width-x1>=5) {
      const z=Math.min(depth-3,z1-4)
      trees.push({...box(x1+1,z,4,3),shade:'leafGreen',height:9})
    }
    if(x0>=3) rocks.push(box(x0-3,z0-1,2,2))
    if(width-x1>=2) rocks.push(box(x1,z0+2,2,2))
  }
  return {porch:box(x0,z0-2,x1-x0,2),step:box(centeredDoor(house.bounds),z0-3,4,1),trees,rocks}
}

export function buildChaletGround(a,house) {
  const {porch,step,trees,rocks}=house.chaletSite
  const {x0,x1,z0}=porch, door=centeredDoor(house.bounds)
  a.context({module:'ground',floor:0,role:'site',section:'Каменный цоколь и крыльцо',building:house})
  a.step('Перевяжите пластины цоколя и настила')
  for(let y=3;y<6;y++) {
    a.deck(house.bounds,y,['gray','dark','darkTan'][y-3],y%2===0,true)
    a.deck(porch,y,['gray','dark','brown'][y-3],y%2===0,true)
  }
  a.step('Сделайте ступень и деревянные ограждения')
  a.put('plate',step.x0,3,step.z0,4,1,'darkTan')
  a.put('tile',step.x0,4,step.z0,4,1,'tan')
  for(const [start,end] of [[x0,door],[door+4,x1]]) {
    for(let x=start;x<end;x+=4) {
      if(end-x>=4) a.add('3633',x,6,z0,'brown')
      else if(end-x>=2) {
        for(const column of [x,end-1]) a.add('3062b',column,6,z0,'brown')
        a.strip('plate',x,9,z0,end-x,'brown')
      }
    }
  }
  a.context({role:'landscape',section:'Деревья у шале',building:null})
  for(const tree of trees) {
    const {x0,z0,shade,height}=tree
    a.step('Соберите ствол и разновысокую крону')
    const trunkX=a.clearLedge?x0+3:x0+1
    a.add('92947',Math.min(x0+2,trunkX),3,z0+1,'brown')
    const tall=height===9
    if(tall) a.add('43888',trunkX,6,z0+1,'brown')
    else for(let y=6;y<=6+height;y+=3) a.add('3062b',trunkX,y,z0+1,'brown')
    const start=tall?24:9+height
    for(let tier=0;tier<3;tier++) {
      const y=start+tier*5
      const color=tier%2?(shade==='orange'?'darkRed':'olive'):shade
      a.add('2423',x0,y,z0,color,tier%2?180:0)
      if(tier<2) {
        if(a.clearLedge) a.add('6141',trunkX,y+1,z0+1,'brown')
        else a.add('35480',x0+1,y+1,z0+1,'brown')
        a.add('3062b',trunkX,y+2,z0+1,'brown')
      } else a.add('33291',trunkX,y+1,z0+1,shade==='orange'?'amber':'leafGreen')
    }
  }
  if(rocks.length) {
    a.step('Добавьте камни рядом с крыльцом')
    for(const [i,{x0,z0}] of rocks.entries()) a.add('3039',x0,3,z0,i?'gray':'dark',i?90:270)
  }
}

export function buildSteepChalet(a,house,facade,roofColor) {
  const {x0,x1,z0,z1}=house.bounds
  const w=x1-x0,d=z1-z0,door=centeredDoor(house.bounds)
  const [wall,trim,frame]=facade
  const windows=w>=14?[{x:x0+2,w:2,y:6,h:6},{x:x1-4,w:2,y:6,h:6}]:[]
  const loft=w>=12?{x:door+1,w:2,y:21,h:w>=14?9:6}:null
  const ridgeSteps=Math.floor((w-2)/2)
  function glazing(x,y,z,tall=false,angle=0) {
    const mount=a.add(tall?'60593':'60592',x,y,z,frame,angle)
    a.add(tall?'60602':'60601',x,y,z,'glass',angle,mount)
  }
  function boarding(start,end,y,z,openings) {
    let from=start
    function section(to) {
      const width=to-from
      if(width<=0) return
      if(width>=2&&(y+from)%3!==0) {
        a.add('30136',from,y,z,wall)
        from+=2
      }
      a.strip('brick',from,y,z,to-from,wall,false,y%2===0)
    }
    for(const gap of openings.filter(gap=>gap.y<=y&&y<gap.y+gap.h).sort((a,b)=>a.x-b.x)) {
      section(gap.x)
      from=gap.x+gap.w
    }
    section(end)
  }
  const entry={x:door,w:4,y:3,h:18}
  a.context({role:'wall',cut:true})
  a.step('Соберите дощатый фасад и нижние окна')
  for(const y of [3,6]) {
    a.strip('brick',x0,y,z0,d,wall,true,y===6)
    a.strip('brick',x1-1,y,z0,d,wall,true,y===3)
    a.strip('brick',x0+1,y,z1-1,w-2,wall)
    boarding(x0+1,x1-1,y,z0,[entry,...windows])
  }
  const mount=a.add('60596',door,3,z0,frame)
  a.add('60623',door,3,z0,'brown',0,mount)
  for(const window of windows) glazing(window.x,window.y,z0)
  a.context({role:'roof',cut:false,floor:1,section:'Шале · скаты и фронтон'})
  a.addModule(house.id+'-roof','Съёмные скаты 65°',9)
  const paneStarts=d>=13?[3,d-5]:d>=11?[4]:[]
  for(let row=0;row<ridgeSteps;row++) {
    const y=9+row*6,left=x0+row,right=x1-row-2
    a.step('Возведите скаты 65° и фронтон · пояс '+(row+1))
    const paneRow=row===2&&house.cabin!=='compact'
    for(let s=0;s<d;) {
      const l=paneRow&&paneStarts.includes(s)?2:
        d-s>=2&&!(paneRow&&paneStarts.includes(s+1))&&!(row%2&&s===0)?2:1
      a.add(l===2?'3678b':'60481',left,y,z0+s,roofColor,90)
      if(paneRow&&paneStarts.includes(s)) {
        a.put('plate',right,y,z0+s,2,2,trim)
        a.put('brick',right,y+1,z0+s,1,2,roofColor)
        a.put('plate',right,y+4,z0+s,1,2,roofColor)
        a.put('plate',right,y+5,z0+s,1,2,roofColor)
        glazing(right+1,y+1,z0+s,false,90)
      } else a.add(l===2?'3678b':'60481',right,y,z0+s,roofColor,270)
      s+=l
    }
    if(left+2>=right) continue
    for(const level of [y,y+3]) {
      boarding(left+2,right,level,z0,[entry,...windows,...(loft?[loft]:[])])
      a.strip('brick',left+2,level,z1-1,right-left-2,wall,false,level%2===0)
      if(loft&&level===loft.y) glazing(loft.x,loft.y,z0,loft.h===9)
    }
  }
  const ridgeY=9+ridgeSteps*6,ridgeX=x0+ridgeSteps
  const ridgeWidth=w-2*ridgeSteps
  a.step('Свяжите оба ската пластинами конька')
  a.deck(box(ridgeX,z0,ridgeWidth,d),ridgeY,roofColor)
  for(let x=ridgeX;x<ridgeX+ridgeWidth;x++) a.strip('plate',x,ridgeY+1,z0,d,roofColor,true,true)
  const pipeZ=z1-3
  for(let z=z0;z+1<z1;z+=2) if(z+1<pipeZ||z>pipeZ) a.add('3043',ridgeX,ridgeY+2,z,roofColor,90)
  a.add('3062b',ridgeX,ridgeY+2,pipeZ,'black')
  a.add('3062b',ridgeX,ridgeY+5,pipeZ,'black')
  a.add('98138',ridgeX,ridgeY+8,pipeZ,'black')
}
