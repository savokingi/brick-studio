export function furnishProgram({keys,rooms,place,put,add,fixtures,room,design,floor,heightLimit}) {
  const {cabinet,shelf,plant,prepBench,sink,oven,dining,sofa,desk,bed,bathroom,display}=fixtures
  const {left,front,width,depth}=room
  function counter(color,cap,detail) {
    return (x,y,z,w,d)=>{
      cabinet(x,y,z,w,d,color)
      put('tile',x,y+7,z,w,1,cap)
      if(d===2) add(detail,x+w-1,y+7,z+1,'black')
    }
  }
  function boxes(x,y,z,w,d,color='darkTan') {
    for(let a=0;a<w;a+=2) {
      const n=Math.min(w-a,2)
      put('brick',x+a,y,z,n,d,color)
      put('plate',x+a,y+3,z,n,d,'brown')
    }
  }
  function stand(x,y,z,w,d) {
    put('brick',x,y,z,w,d,'dark')
    put('plate',x,y+3,z,w,d,'darkTan')
    add('3062b',x,y+4,z,'white')
    add('54200',x,y+7,z,'tan')
  }
  const recipes={
    reception:['Стойка регистрации',4,2,counter('brown','tan','6141'),0.18],
    checkout:['Касса и прилавок',4,2,counter('dark','tan','6141'),0.18],
    lobby:['Прихожая · шкаф для почты',4,2,(x,y,z,w,d)=>cabinet(x,y,z,w,d,'darkTan'),0.2],
    hotKitchen:['Горячий цех · плита и рабочая поверхность',6,2,(x,y,z)=>{
      oven(x,y,z)
      sink(x+4,y,z)
    },0.8,['Плита и духовка',4,2,oven]],
    dining:['Стол и место для гостя',2,5,dining,0.46],
    pantry:['Полки с припасами',4,1,(x,y,z,w)=>shelf(x,y,z,w,'jars'),0.84],
    wash:['Мойка с краном',2,2,sink,0.75],
    produce:['Выкладка овощей и фруктов',4,2,display,0.43],
    cooler:['Холодильная витрина',4,2,(x,y,z,w,d)=>{
      cabinet(x,y,z,w,d,'white')
      for(let a=0;a<w;a+=2) add('4865b',x+a,y+7,z,'glass')
      for(let a=0;a<w;a++) add('6141',x+a,y+7,z+1,'lightBlue')
    },0.63],
    stock:['Складские ящики',4,2,boxes,0.85],
    kitchenette:['Кухня · мойка и столешница',4,2,(x,y,z)=>{
      sink(x,y,z)
      cabinet(x+2,y,z,2,2,'white')
      add('6141',x+2,y+7,z,'black')
      add('3899',x+3,y+7,z,'white')
    },0.72,['Кухонная мойка',2,2,sink]],
    bed:['Кровать с изголовьем',3,5,bed,0.82,['Компактная кровать',2,4,bed]],
    sofa:['Диван в гостиной',4,2,sofa,0.43],
    bath:['Санузел · раковина и туалет',3,5,bathroom,0.79,['Умывальник',2,2,sink]],
    desk:['Рабочий стол и кресло',4,5,desk,0.52,['Рабочий стол',2,2,counter('brown','tan','6141')]],
    waiting:['Скамья ожидания',4,2,sofa,0.34],
    service:['Станция обслуживания и хранения',4,2,prepBench,0.82],
    guestRoom:['Гостевой номер · кровать и тумба',5,5,(x,y,z)=>{
      bed(x,y,z,3,5)
      cabinet(x+3,y,z,2,2,'brown')
      add('3062b',x+3,y+7,z,'black')
      add('4740',x+3,y+10,z,'white')
    },0.67,['Кровать гостя',2,4,bed]],
    wardrobe:['Шкаф для багажа и одежды',4,2,(x,y,z,w,d)=>cabinet(x,y,z,w,d,'brown'),0.76],
    meeting:['Стол для переговоров',4,5,(x,y,z)=>{
      put('brick',x+1,y,z,2,2,'dark')
      put('plate',x,y+3,z,4,2,'brown')
      put('tile',x,y+4,z,4,2,'tan')
      add('4079',x,y,z+2,'blue')
      add('4079',x+2,y,z+2,'blue')
    },0.58,['Стол для переговоров',2,5,dining]],
    equipment:['Стеллаж с оборудованием',4,1,(x,y,z,w)=>shelf(x,y,z,w,'jars'),0.83],
    workbench:['Верстак · тиски и инструмент',4,2,(x,y,z,w,d)=>{
      cabinet(x,y,z,w,d,'brown')
      if(w===4) add('2412b',x,y+7,z,'gray')
      put('brick',x+w-2,y+7,z,2,1,'dark')
      add('6141',x+w-1,y+10,z,'gray')
    },0.56],
    machine:['Станок · направляющая и панель управления',4,2,(x,y,z)=>{
      put('brick',x,y,z,4,2,'dark')
      put('plate',x,y+3,z,4,2,'gray')
      add('87544',x,y+4,z,'dark')
      add('2412b',x,y+4,z+1,'gray')
      add('3039',x+2,y+4,z,'yellow')
    },0.72],
    materials:['Ящики с материалами',4,2,boxes,0.85],
    librarian:['Стол библиотекаря и выдача книг',4,2,counter('brown','tan','6141'),0.22],
    books:['Книжный стеллаж',6,1,shelf,0.67,['Книжный стеллаж',4,1,shelf]],
    reading:['Читальный стол и кресло',2,5,dining,0.47],
    archive:['Архивный шкаф',4,2,(x,y,z,w,d)=>cabinet(x,y,z,w,d,'darkTan'),0.85],
    board:['Классная доска',4,1,(x,y,z,w)=>{
      put('brick',x,y,z,w,1,'brown')
      for(let h=3;h<=9;h+=3) put('brick',x,y+h,z,w,1,'green')
      put('tile',x,y+12,z,w,1,'brown')
    },0.7],
    pupils:['Учебная парта и стул',2,5,(x,y,z)=>{
      put('brick',x,y,z,1,2,'brown')
      put('plate',x,y+3,z,2,2,'tan')
      put('tile',x,y+4,z,1,2,'white')
      add('4079',x,y,z+2,'blue')
    },0.45,['Парта',2,2,counter('brown','tan','6141')]],
    libraryDesk:['Настольная полка для учебников',4,1,shelf,0.78],
    lockers:['Ряд шкафчиков и снаряжение',4,1,(x,y,z,w)=>{
      for(let a=0;a<w;a++) {
        for(let h=0;h<9;h+=3) put('brick',x+a,y+h,z,1,1,a%2?'dark':'gray')
        add('98138',x+a,y+9,z,a%2?'yellow':'white')
      }
    },0.65],
    examination:['Кушетка для осмотра',2,4,(x,y,z)=>{
      put('brick',x,y,z,2,4,'gray')
      put('plate',x,y+3,z,2,4,'white')
      put('tile',x,y+4,z,2,3,'lightBlue')
      put('plate',x,y+4,z+3,2,1,'white')
    },0.65],
    medicine:['Шкаф препаратов',4,1,(x,y,z,w)=>shelf(x,y,z,w,'jars'),0.83],
    exhibit:['Постамент с экспонатом',2,2,stand,0.45],
    showcase:['Выставочная витрина',4,2,display,0.64],
    planter:['Оранжерея · посадки и цветы',4,2,(x,y,z,w,d)=>{
      put('brick',x,y,z,w,d,'brown')
      put('plate',x,y+3,z,w,d,'darkTan')
      for(let a=0;a<w;a++) plant(x+a,y+4,z+(a%d))
    },0.55],
    cultivation:['Стол для пересадки растений',4,2,prepBench,0.76],
    ticket:['Билетная касса',4,2,counter('blue','white','6141'),0.19],
    timetable:['Табло отправлений',4,1,(x,y,z,w)=>{
      for(let h=0;h<9;h+=3) put('brick',x,y+h,z,w,1,h===6?'dark':'gray')
      put('tile',x,y+9,z,w,1,'yellow')
    },0.29],
    lift:['Ремонтная позиция · две направляющие',4,6,(x,y,z)=>{
      for(const a of [0,3]) {
        put('plate',x+a,y,z,1,6,'dark')
        put('tile',x+a,y+1,z,1,4,'gray')
        put('tile',x+a,y+1,z+4,1,2,'yellow')
      }
    },0.39],
    tyres:['Стеллаж с колёсами',4,2,(x,y,z,w)=>{
      for(let a=0;a<w;a+=2) {
        add('3941',x+a,y,z,'black')
        add('3941',x+a,y+3,z,'black')
        add('4740',x+a,y+6,z,'gray')
      }
    },0.82],
    dispatch:['Диспетчерская · терминал и кресло',4,5,desk,0.51,['Терминал диспетчера',2,2,counter('dark','gray','6141')]]
  }
  const narrowable=new Set(['reception','checkout','lobby','pantry','sofa','waiting','wardrobe','equipment',
    'workbench','materials','librarian','archive','board','libraryDesk','lockers','medicine','planter','ticket','timetable','tyres','stock'])
  let area=0
  function placeFixture(key,index,roomPlan) {
    const [name,w,d,assemble,position,compact]=recipes[key]
    if(heightLimit<15&&key==='bath'||heightLimit<13&&['machine','books','board','planter'].includes(key)) return
    const offset=(index+design.layout+floor)%2?0.76:0.24
    const [x,z,wRatio,dRatio]=roomPlan?.area??[0,0,1,1]
    const zone={x:left+(width-1)*(x+wRatio*offset),z:front+(depth-1)*(z+dRatio*position),wall:d<=2,
      bounds:roomPlan?{x0:left+width*x,x1:left+width*(x+wRatio),z0:front+depth*z,z1:front+depth*(z+dRatio)}:undefined}
    const small=compact??(narrowable.has(key)?[name,2,d,assemble]:undefined)
    for(const [label,a,b,build] of [[name,w,d,assemble],...(small?[small]:[])]) {
      if(place(label,a,b,build,'back',zone)) {area+=a*b;return}
    }
  }
  if(rooms) {
    let index=0
    const groups=rooms.flatMap(room=>room.fixtures.map(key=>({key,room})))
    for(const group of groups) placeFixture(group.key,index++,group.room)
  } else keys.forEach((key,index)=>placeFixture(key,index))
  const repeatable=keys.filter(key=>['dining','produce','desk','guestRoom','books','reading','pupils','waiting',
    'examination','exhibit','showcase','planter','workbench','materials','lockers','tyres'].includes(key))
  const target=width*depth*(design.interiorPlan===1?0.36:design.interiorPlan===2?0.25:0.18)
  for(let i=0;repeatable.length&&area<target&&i<Math.min(16,Math.floor(width*depth/42));i++) {
    const key=repeatable[i%repeatable.length]
    placeFixture(key,keys.length+i,rooms?.find(room=>room.fixtures.includes(key)))
  }
}
