// Spatial studies for selected sets. All dimensions resolve to the current plot.
const layouts={
  '76428':{kind:'chamfer',floors:1,label:'Хижина со скошенными углами и конической крышей',
    palette:['darkTan','tan','tan','gray','brown','dark','olive','glass'],
    wing:{ratio:0.32,depth:0.70,lead:2,rows:6,roof:'hip'}},
  '76437':{kind:'wing',floors:4,label:'Высокий дом, низкая пристройка и красные фронтоны',
    palette:['darkTan','mediumNougat','tan','tan','brown','darkRed','olive','glass'],
    roof:'gable',setback:2,wing:{ratio:0.36,depth:0.56,lead:3,rows:6,roof:'gable'}},
  '21354':{kind:'wing',floors:2,label:'Широкие объёмы со сдвигом, панорамные окна и плоская кровля',
    palette:['darkTan','mediumNougat','darkTan','dark','black','dark','olive','glass'],
    roof:'terrace',setback:4,wing:{ratio:0.32,depth:0.83,lead:3,rows:7,roof:'terrace'}},
  '21353':{kind:'wing',floors:1,label:'Высокий стеклянный зал и низкое крыло со световым фонарём',
    palette:['white','white','white','white','white','gray','leafGreen','glass'],
    roof:'lantern',wing:{ratio:0.35,depth:0.72,lead:0,rows:7,roof:'lantern'}},
  '21325':{kind:'wing',floors:2,label:'Фахверк, синие скаты из черепицы и низкое крыло',
    palette:['gray','tan','white','tan','brown','blue','orange','glass'],
    roof:'split',wing:{ratio:0.29,depth:0.62,lead:2,rows:6,roof:'gable'}},
  '21338':{kind:'cabin',floors:1,label:'Высокая А-образная крыша и деревянный фасад',
    palette:['brown','tan','tan','tan','brown','dark','olive','glass'],
    detailPalette:['mediumNougat','tan','mediumNougat','darkTan','green','brown','orange','glass']},
  '21359':{kind:'street',floors:3,streetPlan:'mews',label:'Ступенчатый переулок, тёплые фасады и черепичные скаты',
    palettes:[
      ['mediumNougat','orange','tan','tan','brown','darkRed','leafGreen','glass'],
      ['tan','white','lightYellow','white','blue','darkRed','sandGreen','glass'],
      ['white','azure','white','tan','blue','darkRed','leafGreen','glass']
    ]},
  '60380':{kind:'street',floors:3,streetPlan:'square',label:'Остеклённый переход и городские объёмы разной высоты',
    palettes:[
      ['darkAzure','white','white','gray','black','dark','lime','glassCyan'],
      ['mediumNougat','dark','dark','gray','black','dark','magenta','glassBlue']
    ]}
}

export function referenceLayout(number) {
  return Object.hasOwn(layouts,number)?layouts[number]:undefined
}
