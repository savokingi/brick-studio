// Palettes list the ground, upper and top walls, trim, frames, roof, accent and glass.
const styles=[
  ['Исторические фасады','old',[
    ['tudor','Тюдоровский фахверк','timber','30137',2,'posts','green mediumNougat white tan black darkRed gold glass'],
    ['hanseatic','Ганзейская готика','arches','98283',2,'brick','darkRed darkRed tan tan brown dark green glass'],
    ['georgian','Георгианский таунхаус','bays','15533',3,'bands','darkRed orange darkRed white black dark green glass'],
    ['paris','Парижский доходный дом','arches','2877',3,'stone','tan tan white white dark dark gold glass'],
    ['vienna','Венский сецессион','arcade','2653',2,'sills','white tan white white green dark gold glass'],
    ['venice','Венецианская готика','arcade','15533',1,'posts','mediumNougat nougat tan tan brown darkRed teal glass'],
    ['tuscany','Тосканская вилла','bays','98283',4,'plinth','tan mediumNougat tan darkTan brown darkRed green glass'],
    ['flanders','Фламандский кирпич','bays','15533',1,'brick','brown darkRed orange tan black dark gold glass'],
    ['dutch','Голландский рядный дом','bays','2877',1,'sills','brown mediumNougat tan white black dark teal glass'],
    ['english-shop','Английская торговая улица','shop','98283',2,'bands','green darkRed tan tan brown darkRed gold glass']
  ]],
  ['Дерево и камень','old',[
    ['autumn-cabin','Лесное шале в осенней палитре','logs','30137',2,'posts','mediumNougat tan mediumNougat darkTan green brown orange glass'],
    ['alpine','Альпийское шале','logs','30136',3,'bands','gray brown white white brown darkRed green glass'],
    ['nordic','Скандинавский деревянный дом','logs','2877',2,'sills','darkRed darkRed white white brown black gold glass'],
    ['tatra','Горная усадьба','timber','30136',3,'plinth','darkTan brown tan darkTan black dark olive glass'],
    ['stone-cottage','Каменный коттедж','arches','98283',4,'plinth','darkTan gray tan tan brown darkRed olive glass'],
    ['craftsman','Американский Craftsman','logs','30137',1,'bands','olive sandGreen tan tan brown dark orange glass'],
    ['japanese','Японский деревянный дом','timber','2653',1,'posts','brown tan white tan black dark darkRed glass'],
    ['rural-stone','Сельский дом с тесаным камнем','bays','98283',3,'stone','gray darkTan tan gray brown blue green glass'],
    ['prairie','Дом прерий','ribbons','30137',3,'bands','mediumNougat tan white tan brown dark gold glass'],
    ['blacksmith','Кузница с синей кровлей','timber','98283',3,'brick','gray tan white tan brown blue orange glass']
  ]],
  ['Город XX века','modern',[
    ['art-deco','Ар-деко','bays','2877',2,'posts','dark tan white white black dark gold glassBlue'],
    ['streamline','Стримлайн','ribbons','2653',1,'bands','white gray white white teal dark darkRed glass'],
    ['bauhaus','Баухаус','glass','2877',2,'bands','white white gray gray black dark yellow glass'],
    ['brick-loft','Кирпичный лофт','glass','98283',3,'brick','darkRed orange darkRed gray black dark teal glass'],
    ['industrial','Индустриальный цех','service','4216',3,'plinth','gray mediumNougat gray dark black dark amber glass'],
    ['brutalist','Брутализм','bays','2653',4,'plinth','dark gray gray white dark dark lime glassBlue'],
    ['mid-century','Модернизм середины века','ribbons','2877',2,'sills','brown darkTan tan white black dark orange glass'],
    ['diner','Американское придорожное кафе','shop','4216',1,'bands','teal white white white black dark red glass'],
    ['civic','Городской общественный модернизм','arcade','15533',3,'stone','tan gray white white dark dark orange glass'],
    ['warehouse','Портовый склад из кирпича','service','15533',4,'brick','brown darkRed darkTan tan dark dark orange glass']
  ]],
  ['Приморские фасады','coastal',[
    ['riviera','Итальянская Ривьера','shop','98283',3,'sills','mediumNougat orange tan tan brown darkRed leafGreen glass'],
    ['greek','Белые дома Киклад','arches','2877',4,'stone','white white white white blue blue azure glass'],
    ['atlantic','Атлантический дощатый дом','logs','30137',2,'sills','darkTan sandGreen white white dark darkRed blue glass'],
    ['victorian-coast','Приморская викторианская улица','bays','15533',2,'posts','white lightYellow tan white teal darkRed green glass'],
    ['spanish','Испанская аркада','arcade','98283',2,'plinth','tan white tan tan brown darkRed orange glass'],
    ['miami','Тропическое ар-деко','ribbons','4216',2,'bands','white azure white white teal dark pink glassCyan'],
    ['medina','Терракотовая медина','arches','15533',1,'stone','darkTan mediumNougat tan tan brown darkRed blue glass'],
    ['chalk-coast','Меловое побережье','bays','2877',4,'sills','gray brightBlue white white blue dark yellow glassBlue'],
    ['marina','Современная марина','glass','2653',3,'sills','teal white azure gray black dark teal glassCyan'],
    ['boardwalk','Деревянный дом на набережной','logs','30136',1,'brick','brown darkTan tan white green brown red glass']
  ]],
  ['Современные и тематические','modern',[
    ['conservatory','Ботанический павильон','glass','2877',1,'posts','white white white white white gray leafGreen glass'],
    ['eco','Эко-модерн','glass','30137',3,'bands','darkTan sandGreen white dark black dark olive glass'],
    ['neon','Неоновый городской квартал','ribbons','2653',1,'posts','darkAzure white gray gray black dark magenta glassCyan'],
    ['observatory','Павильон обсерватории','studio','4216',3,'plinth','blue gray white gray black dark azure glassBlue'],
    ['cullen','Дом модернистов в лесу','glass','30137',2,'bands','darkTan mediumNougat darkTan dark black dark olive glass'],
    ['market','Городской рынок под аркадами','arcade','98283',1,'bands','brown mediumNougat white tan brown darkRed teal glass'],
    ['media','Кинотеатр с витражными полосами','shop','2877',3,'posts','darkRed tan white tan black dark gold glassBlue'],
    ['office','Офис с ленточным остеклением','ribbons','2653',2,'sills','dark gray white gray black dark teal glassBlue'],
    ['workshop','Дизайнерская мастерская','studio','4216',2,'brick','mediumNougat white tan gray black dark orange glass'],
    ['winter-hall','Зимний городской павильон','bays','15533',2,'stone','darkRed tan white white green dark blue glass']
  ]]
]

export const facadeStyles=Object.fromEntries(styles.flatMap(([group,theme,rows])=>
  rows.map(([id,label,facade,texture,cadence,relief,palette])=>
    [id,{label,group,theme,facade,texture,cadence,relief,palette:palette.split(' ')}])))

const forms=[
  ['Один корпус','house',[
    ['manor','Усадьба с четырёхскатной крышей',0.83,0.61,'hip'],
    ['longhouse','Продольный дом под коньком',0.48,0.76,'gable'],
    ['hangar','Широкий зал с односкатной крышей',0.86,0.49,'shed'],
    ['atrium','Зал со световым фонарём',0.67,0.64,'lantern'],
    ['mill','Цех с приподнятым коньком',0.74,0.73,'monitor'],
    ['double-gable','Двухфронтонный городской зал',0.81,0.56,'split'],
    ['garden-room','Низкий садовый павильон',0.55,0.46,'terrace'],
    ['winter-gable','Вытянутый дом с заснеженным скатом',0.61,0.79,'snow'],
    ['corner-lot','Корпус у боковой границы участка',0.55,0.67,'hip',{anchor:'side'}],
    ['station-hall','Павильон с высоким поперечным коньком',0.89,0.40,'monitor']
  ]],
  ['Крылья и двор','wing',[
    ['l-front','Г-образный дом с вынесенным крылом',0.87,0.68,'gable',{wing:[0.31,0.59,5,6,'hip']}],
    ['l-rear','Г-образный дом с задним крылом',0.85,0.73,'hip',{wing:[0.34,0.55,-5,6,'gable']}],
    ['t-hall','Т-образный дом с поперечным залом',0.89,0.78,'gable',{wing:[0.58,0.42,0,7,'split'],branches:'cross'}],
    ['u-front','П-образная усадьба с парадным двором',0.92,0.73,'hip',{wing:[0.48,0.67,5,6,'gable'],branches:'both'}],
    ['u-rear','П-образный дом с задним двором',0.91,0.71,'lantern',{wing:[0.48,0.57,-5,6,'hip'],branches:'both'}],
    ['gallery-link','Два корпуса с низкой галереей',0.90,0.63,'terrace',{wing:[0.33,0.79,3,7,'lantern']}],
    ['terraced-wing','Дом с крылом-террасой',0.88,0.83,'setback',{wing:[0.36,0.60,1,6,'terrace'],setback:3}],
    ['workshop-wing','Мастерская с длинным боковым залом',0.92,0.59,'monitor',{wing:[0.42,0.92,2,7,'shed']}],
    ['greenhouse-wing','Оранжерея с низкой пристройкой',0.83,0.55,'lantern',{wing:[0.30,0.80,1,6,'monitor']}],
    ['split-wings','Два крыла с разными скатами',0.93,0.81,'split',{wing:[0.47,0.62,4,6,'shed'],branches:'stagger'}]
  ]],
  ['Многоуровневые формы','house',[
    ['tower-cap','Узкая башня со сдвинутым верхом',0.41,0.70,'setback',{setback:4}],
    ['rising-terrace','Дом со ступенчатым верхом',0.74,0.66,'terrace',{setback:6}],
    ['lantern-tower','Башня со стеклянным фонарём',0.47,0.55,'lantern',{setback:3}],
    ['upper-gable','Высокий дом с отдельным фронтоном наверху',0.55,0.69,'gable',{setback:4}],
    ['upper-hip','Вальмовая надстройка над террасой',0.79,0.70,'hip',{setback:5}],
    ['upper-shed','Верхний этаж с односкатным силуэтом',0.63,0.75,'shed',{setback:3}],
    ['upper-split','Два фронтона на отступающем этаже',0.85,0.68,'split',{setback:5}],
    ['upper-monitor','Многоуровневый дом с верхним остеклением',0.70,0.82,'monitor',{setback:6}]
  ]],
  ['Шале и скошенные объёмы','cabin',[
    ['steep-cabin','Крутое А-образное шале с крыльцом',0.52,0.52,'aframe',{cabin:'forest'}],
    ['deep-lodge','Продольное лесное шале',0.46,0.74,'aframe',{cabin:'long'}],
    ['wide-chalet','Широкое шале с высоким фронтоном',0.62,0.52,'aframe',{cabin:'wide'}],
    ['small-refuge','Компактное горное укрытие',0.39,0.40,'aframe',{cabin:'compact'}],
    ['clipped-hut','Скошенная хижина с пиковой крышей',0.46,0.54,'octagonal',{scheme:'house',clipped:2}],
    ['clipped-hall','Скошенный поперечный зал',0.69,0.48,'hip',{scheme:'house',clipped:3}],
    ['clipped-shed','Скошенный павильон с асимметричным верхом',0.58,0.61,'shed',{scheme:'house',clipped:2}],
    ['clipped-pavilion','Компактный восьмиугольный павильон',0.43,0.43,'octagonal',{scheme:'house',clipped:3}]
  ]],
  ['Улицы и кварталы','street',[
    ['high-street','Широкая торговая улица',1,1,null,{street:'row',gap:3,bias:2,road:7}],
    ['close-row','Плотный ряд таунхаусов',1,1,null,{street:'row',gap:2,bias:-2,road:4}],
    ['market-square','Улица с открытой площадью',1,1,null,{street:'square',gap:10,bias:2,road:5}],
    ['museum-square','Два крупных корпуса у площади',1,1,null,{street:'square',gap:7,bias:-3,road:7}],
    ['stepped-mews','Узкий переулок со ступенчатым фронтом',1,1,null,{street:'mews',gap:5,bias:2,road:4}],
    ['garden-mews','Переулок с широким проходом в сад',1,1,null,{street:'mews',gap:8,bias:-2,road:5}],
    ['two-sides','Квартал с домами по обе стороны',1,1,null,{street:'double',gap:3,bias:2,road:6}],
    ['boulevard','Двухсторонний бульвар',1,1,null,{street:'double',gap:5,bias:-2,road:8}]
  ]],
  ['Набережные и причалы','wharf',[
    ['fishing-pier','Рыбацкая мастерская на настиле',0.68,0.55,'gable',{dock:[5,7,12]}],
    ['light-station','Маячная станция с высокой башней',0.48,0.48,'hip',{dock:[6,8,16]}],
    ['port-shed','Портовый склад с длинным скатом',0.85,0.53,'shed',{dock:[4,5,9]}],
    ['boat-workshop','Верфь с открытым широким причалом',0.81,0.46,'split',{dock:[5,10,10]}],
    ['waterfront-hall','Длинный павильон над водой',0.88,0.40,'monitor',{dock:[4,8,8]}],
    ['harbor-office','Узкая контора у высокого причала',0.53,0.63,'terrace',{dock:[6,6,14]}]
  ]]
]

export const buildingForms=Object.fromEntries(forms.flatMap(([group,scheme,rows])=>
  rows.map(([id,label,width,depth,roof,extras])=>[id,{label,group,scheme,width,depth,roof,...extras}])))

export const facadeStyle=id=>Object.hasOwn(facadeStyles,id)?facadeStyles[id]:undefined
export const buildingForm=id=>Object.hasOwn(buildingForms,id)?buildingForms[id]:undefined
