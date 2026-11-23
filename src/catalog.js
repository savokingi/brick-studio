export const catalog = {}
function register(id, label, w, d, h, extra = {}) {
  catalog[id] = { id, label, w, d, h, ...extra }
}
const families = {
  brick: { label: 'Кирпич', h: 3, ids: { '1x1':'3005','1x2':'3004','1x3':'3622','1x4':'3010','1x6':'3009','1x8':'3008','2x2':'3003','2x3':'3002','2x4':'3001','2x6':'2456' } },
  plate: { label: 'Пластина', h: 1, ids: { '1x1':'3024','1x2':'3023','1x3':'3623','1x4':'3710','1x6':'3666','1x8':'3460','2x2':'3022','2x3':'3021','2x4':'3020','2x6':'3795','2x8':'3034','4x4':'3031','4x6':'3032','4x8':'3035','6x6':'3958','6x8':'3036','8x8':'41539','8x16':'92438','16x16':'91405' } },
  tile: { label: 'Плитка', h: 1, ids: { '1x1':'3070b','1x2':'3069b','1x3':'63864','1x4':'2431','1x6':'6636','1x8':'4162','2x2':'3068b','2x3':'26603','2x4':'87079' } }
}
export function sizeId(kind, w, d) {
  return families[kind]?.ids[[Math.min(w,d),Math.max(w,d)].join('x')]
}
for (const [kind, family] of Object.entries(families)) {
  for (const [size,id] of Object.entries(family.ids)) {
    const [d,w] = size.split('x').map(Number)
    register(id, family.label + ' ' + w + ' × ' + d, w, d, family.h, {kind, studs:kind!=='tile'})
  }
}
register('60594','Рама окна 1 × 4 × 3',4,1,9,{kind:'window',studs:true})
register('60603','Стекло окна 1 × 4 × 3',4,1,9,{kind:'insert',studs:false,originY:-0.6})
register('60596','Рама двери 1 × 4 × 6',4,1,18,{kind:'door',studs:true})
register('60623','Дверь со стеклом 1 × 4 × 6',4,1,18,{kind:'insert',studs:false,originX:-1.6})
register('3659','Арка 1 × 4',4,1,3,{kind:'arch',studs:true})
register('3039','Скос 45° 2 × 2',2,2,3,{kind:'slope',studs:true,originZ:0.5})
register('3040b','Скос 45° 2 × 1',1,2,3,{kind:'slope',studs:true,originZ:0.5})
register('3678b','Скос 65° 2 × 2 × 2',2,2,6,{kind:'slope',studs:true,originZ:0.5})
register('60481','Скос 65° 2 × 1 × 2',1,2,6,{kind:'slope',studs:true,originZ:0.5})
register('4070','Кирпич с боковым шипом',1,1,3,{kind:'headlight',studs:true})
register('98283','Фактурный кирпич 1 × 2',2,1,3,{kind:'masonry',studs:true})
register('3062b','Круглый кирпич 1 × 1',1,1,3,{kind:'round',studs:true})
register('98138','Круглая плитка 1 × 1',1,1,1,{kind:'tile',studs:false})
register('24866','Цветок с 5 лепестками',1,1,1,{kind:'flower',studs:true})
register('3941','Круглый кирпич 2 × 2',2,2,3,{kind:'round',studs:true})
register('6141','Круглая пластина 1 × 1',1,1,1,{kind:'round',studs:true})
register('2423','Листва 4 × 3',4,3,1,{kind:'leaves',studs:true,insertRotation:90,originX:1.5})
register('37762','Плитка с выступом 1 × 1',1,1,1,{kind:'tile',studs:false})
register('30136','Рифлёный кирпич 1 × 2',2,1,3,{kind:'fluted',studs:true})
register('4865b','Панель 1 × 2 × 1',2,1,3,{kind:'panel',studs:true})
register('22885','Кирпич с боковыми шипами 1 × 2',2,1,3,{kind:'bracket',studs:true})
register('87580','Пластина с центральным шипом 2 × 2',2,2,1,{kind:'jumper',studs:true})
register('4079','Кресло минифигурки 2 × 2',2,3,6,{kind:'chair',studs:false,originY:-2,originZ:-0.5})
register('3899','Кружка минифигурки',1,2,3,{kind:'cup',studs:false,originZ:-0.5})
register('4599a','Кран с носиком',1,2,3,{kind:'tap',studs:false,originZ:-0.5})
register('4740','Тарелка 2 × 2',2,2,1,{kind:'dish',studs:true})

register('54200','Скос 31° 1 × 1',1,1,2,{kind:'cap',originY:-0.8})
register('2412b','Решётчатая плитка 1 × 2',2,1,1,{kind:'tile'})
register('85984','Скос 31° 1 × 2',2,1,2,{kind:'cap',originY:-0.8})
register('15068','Криволинейный скос 2 × 2',2,2,2,{kind:'cap',originY:-0.8})
register('11477','Криволинейный скос 1 × 2',1,2,2,{kind:'cap',originY:-0.8})
register('60592','Малая оконная рама 1 × 2 × 2',2,1,6,{kind:'window',studs:true})
register('60601','Стекло для малого окна 1 × 2 × 2',2,1,6,{kind:'insert'})
register('59349','Панель 1 × 6 × 5',6,1,15,{kind:'panel',studs:true})
register('60581','Панель 1 × 4 × 3',4,1,9,{kind:'panel',studs:true})
register('87544','Панель 1 × 2 × 3',2,1,9,{kind:'panel',studs:true})
register('2877','Кирпич 1 × 2 с рёбрами',2,1,3,{kind:'fluted',studs:true})
register('15207','Тонкая панель 1 × 4 × 1',4,1,3,{kind:'panel'})
register('60593','Высокая оконная рама 1 × 2 × 3',2,1,9,{kind:'window',studs:true})
register('60602','Стекло для высокого окна 1 × 2 × 3',2,1,9,{kind:'insert'})
register('60607','Решётчатая створка 1 × 2 × 3',2,1,9,{kind:'insert',originX:0.695,originZ:-0.25,insertRotation:90})
register('3037','Скос 45° 2 × 4',4,2,3,{kind:'slope',studs:true,originZ:0.5})
register('92950','Поднятая арка 1 × 6',6,1,3,{kind:'arch',studs:true})
register('3633','Решётчатая ограда 1 × 4 × 1',4,1,3,{kind:'fence'})
register('6182','Арка 1 × 4 × 2',4,1,6,{kind:'arch',studs:true})
register('15533','Фактурный кирпич 1 × 4',4,1,3,{kind:'masonry',studs:true})
register('30137','Бревенчатый кирпич 1 × 4',4,1,3,{kind:'log',studs:true})
register('15332','Балюстрада 1 × 4 × 2',4,1,6,{kind:'fence',studs:true})
register('3043','Коньковый скос 2 × 2',2,2,3,{kind:'cap'})
register('80543','Высокая арка 1 × 4 × 3',4,1,9,{kind:'arch',studs:true,originX:-1.5,insertRotation:90})
register('92589','Дверь с решёткой 1 × 4 × 6',4,1,18,{kind:'insert',originX:-1.6})
register('57894','Высокая оконная рама 1 × 4 × 6',4,1,18,{kind:'window',studs:true})
register('57895','Стекло для высокой рамы 1 × 4 × 6',4,1,18,{kind:'insert'})
register('14718','Панель 1 × 4 × 2',4,1,6,{kind:'panel',studs:true})
register('6005','Арка с выпуклым верхом 1 × 3 × 2',3,1,6,{kind:'arch',originX:1,insertRotation:90})
register('3298','Скос 33° 3 × 2',2,3,3,{kind:'slope',studs:true,originZ:1})

register('4216','Кирпич 1 × 2 с желобком',2,1,3,{kind:'fluted',studs:true})
register('2653','Кирпич 1 × 4 с желобком',4,1,3,{kind:'fluted',studs:true})
register('92947','Круглый кирпич 2 × 2 с рёбрами',2,2,3,{kind:'round',studs:true})
register('14716','Колонна 1 × 1 × 3',1,1,9,{kind:'brick',studs:true})
register('43888','Круглая колонна 1 × 1 × 6',1,1,18,{kind:'round',studs:true})
register('2465','Кирпич 1 × 16',16,1,3,{kind:'brick',studs:true})
register('4490','Арка 1 × 3',3,1,3,{kind:'arch',studs:true})
register('88292','Двойная фигурная арка 1 × 3 × 2',3,1,6,{kind:'arch',studs:true,insertRotation:90,originX:-1})
register('13965','Стрельчатая арка 1 × 3 × 3',3,1,9,{kind:'arch',studs:true})
register('15254','Тонкая арка 1 × 6 × 2',6,1,6,{kind:'arch',studs:true})
register('16577','Поднятая арка 1 × 8 × 2',8,1,6,{kind:'arch',studs:true})
register('3307','Усиленная арка 1 × 6 × 2',6,1,6,{kind:'arch',studs:true})
register('51239','Оконная рама 1 × 3 × 3',3,1,9,{kind:'window',studs:true})
register('51266','Стекло для рамы 1 × 3 × 3',3,1,9,{kind:'insert'})
register('30044','Округлая оконная рама 1 × 2',2,1,8,{kind:'window',studs:true})
register('30046','Решётка для округлого окна',2,1,8,{kind:'insert',originY:-1})
register('87552','Усиленная панель 1 × 2 × 2',2,1,6,{kind:'panel',studs:true})
register('4864b','Панель 1 × 2 × 2 с полыми шипами',2,1,6,{kind:'panel',studs:true})
register('23950','Округлая панель 1 × 3 × 1',3,1,3,{kind:'panel',studs:true})
register('23969','Округлая панель 1 × 2 × 1',2,1,3,{kind:'panel',studs:true})
register('6231','Угловая панель 1 × 1 × 1',1,1,3,{kind:'panel',studs:true})
register('23405','Гофрированная панель 1 × 6 × 5',6,1,15,{kind:'panel',studs:true})
register('19121','Декоративная ограда 1 × 4 × 2',4,1,6,{kind:'fence',studs:true})
register('3185','Решётчатая ограда 1 × 4 × 2',4,1,6,{kind:'fence',studs:true})
register('30055','Ограда с балясинами 1 × 4 × 2',4,1,6,{kind:'fence',studs:true})
register('4083','Поручень 1 × 4 × 2',4,1,6,{kind:'fence',studs:true})
register('50950','Криволинейный скос 1 × 3',1,3,3,{kind:'cap'})
register('93273','Двойной криволинейный скос 1 × 4',1,4,2,{kind:'cap',originY:-1.6})
register('24201','Перевёрнутый криволинейный скос 1 × 2',1,2,2,{kind:'cap',originZ:-0.5})
register('24309','Криволинейный скос 2 × 3',2,3,3,{kind:'cap'})
register('88930','Криволинейный скос 2 × 4',4,2,2,{kind:'cap',originY:-1.6})
register('29119','Криволинейный скос 1 × 2 с вырезом справа',1,2,2,{kind:'cap',originY:-0.8})
register('29120','Криволинейный скос 1 × 2 с вырезом слева',1,2,2,{kind:'cap',originY:-0.8})
register('3045','Угловой скос 45° 2 × 2',2,2,3,{kind:'hipCorner',studs:true,insertRotation:180,originX:0.5,originZ:-0.5})
register('3044b','Двойной скос 45° 1 × 2',1,2,3,{kind:'cap'})
register('25269','Четверть круглой плитки 1 × 1',1,1,1,{kind:'tile'})
register('27925','Плитка 2 × 2 со скруглённым углом',2,2,1,{kind:'tile',originX:-0.5,originZ:0.5})
register('1126','Овальная плитка 1 × 2',2,1,1,{kind:'tile'})
register('26601','Пластина 2 × 2 со срезом угла',2,2,1,{kind:'plate',studs:true})
register('35480','Овальная пластина 1 × 2 с отверстиями',2,1,1,{kind:'plate',studs:true})
register('4032a','Круглая пластина 2 × 2 с отверстием',2,2,1,{kind:'round',studs:true})
register('4150','Круглая плитка 2 × 2',2,2,1,{kind:'tile'})
register('32607','Пластина с тремя листьями',1,1,1,{kind:'leaves',studs:true})
register('24855','Цветочная веточка',1,1,3,{kind:'leaves'})
register('33291','Пластина-цветок 1 × 1',1,1,1,{kind:'flower',studs:true})
register('37695','Стебель с тремя листьями',1,1,3,{kind:'leaves'})
register('30134','Открытая лестница 4 × 7 × 6',4,7,18,{kind:'stair',originZ:-0.5})
register('28466','Лестница с поворотом на 90°',6,6,12,{kind:'stair',originX:-2.5,originZ:-2.5})
register('40243','Ступень винтовой лестницы',6,4,2,{kind:'stair',originX:-2,originZ:-0.75})
register('40244','Ось винтовой лестницы',1,1,16,{kind:'stair',originY:-3.2})
register('22385','Пятиугольная плитка 2 × 3',2,3,1,{kind:'tile'})

register('20310','Кронштейн с завитком',1,2,3,{kind:'corbel',studs:true,originZ:0.5})
register('3665','Обратный скос 45° 1 × 2',1,2,3,{kind:'corbel',studs:true,originZ:0.5})
register('3455','Низкая арка 1 × 6',6,1,3,{kind:'arch',studs:true})
register('2417','Ветвь дерева 6 × 5',5,6,1,{kind:'leaves',studs:true,originZ:0.5})
register('3471','Пирамидальная ель',4,4,20,{kind:'tree',originY:-7.6})
register('970c03','Бёдра и ноги минифигурки',2,1,5,{kind:'figure',studs:true,ldraw:'3815c01',assemblyColor:'black'})
register('973c27h01','Торс с белыми рукавами и жёлтыми кистями',2,1,4,{kind:'figure',studs:true,ldraw:'76382p00',painted:true,assemblyColor:'white'})
register('973c22h01','Торс с красными рукавами и жёлтыми кистями',2,1,4,{kind:'figure',studs:true,ldraw:'76382p00',painted:true,assemblyColor:'red'})
register('3626bpr0001','Голова минифигурки с улыбкой',2,1,3,{kind:'figure',studs:true,ldraw:'3626bp01',painted:true})
register('3898','Колпак повара',2,1,2,{kind:'figure',originY:-0.8})
register('3901','Короткая причёска минифигурки',2,1,1,{kind:'figure',originY:-0.4})

export const legacyColors = {
  tan:['Песочный',0xe4cd9e,19], darkTan:['Тёмно-песочный',0x958a73,28],
  white:['Белый',0xf4f4f4,15], gray:['Светло-серый',0xa0a5a9,71],
  dark:['Тёмно-серый',0x6c6e68,72], black:['Чёрный',0x222327,0],
  red:['Красный',0xc91a09,4], darkRed:['Тёмно-красный',0x720e0f,320],
  brown:['Красновато-коричневый',0x582a12,70], blue:['Тёмно-синий',0x0a3463,272],
  green:['Тёмно-зелёный',0x184632,288], yellow:['Жёлтый',0xf2cd37,14],
  olive:['Оливковый',0x9b9a5a,330], sandGreen:['Песочно-зелёный',0xa0bcac,378],
  orange:['Тёмно-оранжевый',0xa95500,484], lightBlue:['Песочно-синий',0x6074a1,379],
  glass:['Прозрачный',0xd3e5e7,47], pink:['Розовый',0xe4adc8,29],
  leafGreen:['Зелёный',0x237841,2]
}
export const colors = {
  ...legacyColors,
  royalBlue:['Ярко-синий',0x1e5aa8,1],
  teal:['Бирюзовый',0x069d9f,3], darkAzure:['Лазурный',0x469bc3,321],
  azure:['Светло-лазурный',0x68c3e2,322], lime:['Лаймовый',0xa5ca18,27],
  magenta:['Малиновый',0x901f76,26], nougat:['Тёплый кирпичный',0xbb805a,92],
  mediumNougat:['Средний нуга',0xaa7d55,84], brightBlue:['Ярко-голубой',0x9dc3f7,212],
  amber:['Янтарный',0xfcac00,191], lightYellow:['Светло-жёлтый',0xffec6c,226],
  gold:['Перламутровое золото',0xaa7f2e,297], brightGreen:['Ярко-зелёный',0x58ab41,10],
  glassBlue:['Прозрачно-голубой',0xaee9ef,43], glassCyan:['Прозрачный синий',0x559ab7,41]
}
const rebrickableColors = {olive:326,gold:115}
export const inventoryColor = color => rebrickableColors[color]??colors[color][2]
export const isTransparent = color => ['glass','glassBlue','glassCyan'].includes(color)
