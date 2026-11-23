// Dimensions are in studs on plan and in plates vertically.
export function planBay(a,spans,x,y,z,rows) {
  const windows=spans.filter(o=>!o.door&&!o.post&&!o.passage&&[2,4,6].includes(o.span)&&o.top<rows)
  for(const o of windows.sort((a,b)=>b.span-a.span)) {
    const bottom=y+Math.max(0,o.low-2)*3
    const height=y+(o.top+1)*3-bottom
    for(const depth of [3,2]) {
      if(Array.from({length:depth},(_,i)=>a.clearLedge(x+o.offset,bottom,z-1-i,o.span,height)).every(Boolean)) {
        o.bay=depth
        return
      }
    }
  }
}

function windowPair(a,x,y,z,rotation,height,frame,glass) {
  while(height>0) {
    const tall=height===9||height>=15
    const mount=a.add(tall?'60593':'60592',x,y,z,frame,rotation)
    a.add(tall?'60602':'60601',x,y,z,glass,rotation,mount)
    height-=tall?9:6
    y+=tall?9:6
  }
}

export function buildBayCourse(a,o,x,y,z,row,palette,style) {
  const [wall,trim,frame,,,glass]=palette
  const front=z-o.bay
  const span=o.span
  if(row===o.low-2) {
    for(let dx=0;dx<span;dx++) {
      if(dx===0||dx===span-1) a.add(style==='old'?'20310':'3665',x+dx,y,z-1,trim)
      else a.put('brick',x+dx,y,z,1,1,wall)
    }
  } else if(row===o.low-1||row===o.top) {
    // Each cantilever has a tail inside the wall. Cross-lay the next course.
    for(let dx=0;dx<span;dx++) a.put('plate',x+dx,y,front,1,o.bay+1,trim)
    for(let dz=0;dz<=o.bay;dz++) {
      a.strip('plate',x,y+1,front+dz,span,trim)
      a.strip(row===o.top&&dz<o.bay?'tile':'plate',x,y+2,front+dz,span,dz===o.bay?wall:trim)
    }
  } else if(row===o.low) {
    const height=(o.top-o.low)*3
    for(let dx=0;dx<span;dx+=2) windowPair(a,x+dx,y,front,0,height,frame,glass)
    for(const end of [x,x+span-1]) {
      if(o.bay===3) windowPair(a,end,y,front+1,90,height,frame,glass)
      else for(let dy=0;dy<height;dy+=3) a.put('brick',end,y+dy,z-1,1,1,trim)
    }
  }
}

export function buildStripedAwning(a,x,y,z,span,trim,accent) {
  for(let dx=0;dx<span;dx++) {
    // The rear stud stays in the wall and the nose projects over the glass.
    a.put('plate',x+dx,y,z-2,1,3,trim)
    a.add('11477',x+dx,y+1,z-2,dx%2?'white':accent)
  }
  a.strip('plate',x,y+1,z,span,trim)
  a.strip('plate',x,y+2,z,span,trim)
}

export function planWindowPiers(a,side,y,rows) {
  const dx=Number(Boolean(side.right))-Number(Boolean(side.left))
  const dz=Number(Boolean(side.back))-Number(Boolean(side.front))
  // Keep the masonry that carries a passage lintel clear, including its ends.
  const used=new Set()
  for(const o of side.spans) {
    const reach=Number(Boolean(o.passage))
    for(let i=o.offset-reach;i<o.offset+o.span+reach;i++) used.add(i)
  }
  const additions=[]
  for(const o of side.spans) {
    if(o.door||o.post||o.passage||o.bay) continue
    const jambs=[o.offset-1,o.offset+o.span],low=o.low-1,top=Math.min(rows,o.top+1)
    if(!jambs.every(i=>{
      const [x,z]=side.coordinate(i)
      return i>=0&&i<side.length&&!used.has(i)&&a.clearLedge(x+dx,y+low*3,z+dz,1,(top-low)*3)
    })) continue
    const [wx,wz]=side.coordinate(o.offset)
    const alongX=!side.vertical
    if(!a.clearLedge(wx+dx,y+low*3,wz+dz,alongX?o.span:1,(top-low)*3,alongX?1:o.span)) continue
    o.surround=true
    for(const i of jambs) {
      used.add(i)
      additions.push({offset:i,span:1,low,top,pier:true,dx,dz})
    }
  }
  side.spans.push(...additions)
  side.spans.sort((a,b)=>a.offset-b.offset)
}

export function buildWindowPier(a,gap,side,y,row,[wall,trim,frame],style) {
  const [x,z]=side.coordinate(gap.offset)
  const fx=x+gap.dx,fz=z+gap.dz
  const rotation=side.front?0:side.back?180:side.left?90:270
  if(row===gap.top-1) {
    buildWindowBand(a,side,gap,y,wall,trim)
  } else if(row===gap.low) {
    a.add(style==='old'?'20310':'3665',Math.min(x,fx),y,Math.min(z,fz),trim,rotation)
  } else {
    a.put('brick',x,y,z,1,1,wall)
    const coastal=style==='coastal'
    a.add(coastal||style==='modern'?'3005':'3062b',fx,y,fz,coastal?frame:trim)
  }
}

export function buildWindowBand(a,side,gap,y,wall,trim) {
  const [x,z]=side.coordinate(gap.offset),vertical=Boolean(side.vertical)
  const fx=x+Number(Boolean(side.right))-Number(Boolean(side.left))
  const fz=z+Number(Boolean(side.back))-Number(Boolean(side.front))
  const len=gap.span,px=Math.min(x,fx),pz=Math.min(z,fz)
  a.put('plate',px,y,pz,vertical?2:len,vertical?len:2,trim)
  a.put('plate',px,y+1,pz,vertical?2:len,vertical?len:2,trim)
  a.strip('plate',x,y+2,z,len,wall,vertical)
  a.strip('tile',fx,y+2,fz,len,trim,vertical)
}
