export const legacyTypes={bakery:'Пекарня',cafe:'Кафе',flowers:'Цветочный магазин',book:'Книжный магазин',home:'Жилой дом'}

const programs=[
  ['Торговля и питание',[
    ['restaurant','Ресторан','atrium terraced-wing double-gable high-street market-square','terrace',
      'reception hotKitchen dining pantry wash','dining service pantry wash','Стол для сервировки','Кухонный шкаф'],
    ['market','Продуктовый рынок','hangar station-hall atrium high-street market-square','terrace',
      'checkout produce cooler stock','produce cooler stock','Прилавок','Стеллаж для продуктов']
  ]],
  ['Жильё и работа',[
    ['apartment','Многоквартирный дом','rising-terrace upper-hip corner-lot close-row two-sides','garden',
      'lobby kitchenette bed sofa','kitchenette bed sofa bath desk','Кухонная тумба','Комод'],
    ['hotel','Гостиница','manor u-front upper-gable museum-square boulevard','terrace',
      'reception waiting service','guestRoom bath wardrobe','Стойка регистрации','Шкаф для багажа'],
    ['office','Офис','tower-cap upper-monitor rising-terrace high-street boulevard','plaza',
      'reception desk meeting equipment','desk meeting equipment waiting','Рабочий стол','Шкаф для документов'],
    ['workshop','Мастерская','workshop-wing mill upper-shed port-shed close-row','service',
      'workbench machine materials checkout','workbench materials desk','Верстак','Стеллаж для инструментов']
  ]],
  ['Общественные здания',[
    ['library','Библиотека','atrium gallery-link manor garden-mews museum-square','garden',
      'librarian books reading','books reading archive','Книжный стеллаж','Стол для чтения'],
    ['school','Школа','u-front t-hall station-hall two-sides garden-mews','courtyard',
      'board pupils libraryDesk lockers','board pupils reading','Учебная парта','Шкаф для учебников'],
    ['clinic','Поликлиника','gallery-link u-front upper-hip museum-square two-sides','plaza',
      'reception examination waiting medicine wash','examination medicine desk wash','Стойка регистратуры','Медицинский шкаф'],
    ['museum','Музей','atrium manor clipped-hall museum-square market-square','exhibit',
      'reception exhibit showcase waiting','exhibit showcase archive','Постамент для экспоната','Выставочная витрина'],
    ['greenhouse','Оранжерея','greenhouse-wing atrium garden-room clipped-pavilion garden-mews','garden',
      'planter cultivation wash','planter cultivation desk','Стол для рассады','Стеллаж с горшками']
  ]],
  ['Транспорт и службы',[
    ['station','Вокзал','station-hall gallery-link hangar boulevard two-sides','platform',
      'ticket waiting timetable service','desk waiting equipment','Билетная касса','Лавка ожидания'],
    ['garage','Автосервис','hangar workshop-wing upper-shed port-shed close-row','service',
      'lift tyres workbench checkout','desk materials equipment','Верстак','Стеллаж для шин'],
    ['fireStation','Пожарное депо','workshop-wing station-hall upper-monitor high-street two-sides','service',
      'lift lockers dispatch tyres','dispatch lockers waiting','Шкаф с экипировкой','Диспетчерский стол']
  ]]
]

const legacyGroups={bakery:'Торговля и питание',cafe:'Торговля и питание',flowers:'Торговля и питание',
  book:'Торговля и питание',home:'Жильё и работа'}
const finishes={
  restaurant:['english-shop','diner','riviera','vienna'], market:['market','spanish','hanseatic','english-shop'],
  apartment:['paris','dutch','art-deco','victorian-coast'], hotel:['vienna','tuscany','miami','art-deco'],
  office:['office','bauhaus','art-deco','marina'], workshop:['workshop','industrial','blacksmith','warehouse'],
  library:['paris','civic','hanseatic','victorian-coast'], school:['civic','flanders','bauhaus'],
  clinic:['bauhaus','streamline','chalk-coast','paris'], museum:['civic','paris','vienna','observatory'],
  greenhouse:['conservatory','eco'], station:['civic','industrial','streamline','vienna'],
  garage:['industrial','warehouse','workshop','flanders'], fireStation:['industrial','warehouse','brick-loft','hanseatic']
}
const annexes={
  restaurant:'hotKitchen pantry wash',market:'stock cooler produce',apartment:'sofa desk bath',hotel:'dining service pantry',
  office:'meeting equipment desk',workshop:'materials machine workbench',library:'reading archive books',
  school:'pupils libraryDesk lockers',clinic:'examination medicine wash',museum:'archive showcase exhibit',
  greenhouse:'cultivation wash planter',station:'waiting timetable service',garage:'tyres materials workbench',
  fireStation:'lockers dispatch equipment'
}
export const buildingTypes={
  ...Object.fromEntries(Object.entries(legacyTypes).map(([id,label])=>[id,{label,group:legacyGroups[id]}])),
  ...Object.fromEntries(programs.flatMap(([group,rows])=>rows.map(([id,label,forms,exterior,ground,upper,...stock])=>
    [id,{group,label,forms:forms.split(' '),finishes:finishes[id],exterior,ground:ground.split(' '),
      upper:upper.split(' '),annex:annexes[id].split(' '),stock}])))
}

export const types=Object.fromEntries(Object.entries(buildingTypes).map(([id,value])=>[id,value.label]))
export const buildingType=id=>Object.hasOwn(buildingTypes,id)?buildingTypes[id]:undefined
