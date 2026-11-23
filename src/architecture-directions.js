const groups=[
  ['Исторические кварталы','old',[
    ['medieval','Средневековый квартал','tudor hanseatic stone-cottage blacksmith',
      'l-rear t-hall upper-gable stepped-mews close-row'],
    ['renaissance','Ренессансные дворцы и усадьбы','tuscany venice paris',
      'manor u-front upper-hip museum-square'],
    ['classic-axis','Классицизм и парадные площади','paris georgian vienna',
      'manor atrium u-front museum-square market-square'],
    ['georgian-quarter','Георгианские таунхаусы','georgian english-shop flanders',
      'longhouse corner-lot upper-gable close-row high-street'],
    ['victorian-quarter','Викторианские торговые улицы','english-shop victorian-coast georgian',
      'double-gable l-front split-wings high-street market-square'],
    ['hanseatic-port','Ганзейский кирпичный город','hanseatic flanders dutch warehouse',
      'tower-cap upper-split close-row port-shed harbor-office'],
    ['art-nouveau','Модерн и сецессион','vienna paris venice',
      'double-gable gallery-link upper-hip garden-mews museum-square']
  ]],
  ['Дерево, камень и загородные дома','old',[
    ['forest-lodges','Лесные шале','autumn-cabin alpine nordic',
      'steep-cabin deep-lodge wide-chalet small-refuge clipped-hut garden-mews'],
    ['alpine-village','Альпийская деревня','alpine tatra stone-cottage',
      'wide-chalet small-refuge l-rear winter-gable stepped-mews'],
    ['nordic-wood','Северные деревянные посёлки','nordic autumn-cabin atlantic',
      'longhouse deep-lodge l-front close-row fishing-pier'],
    ['country-estate','Сельские усадьбы и фермы','stone-cottage rural-stone tuscany',
      'u-rear u-front manor l-rear garden-mews'],
    ['japanese-courts','Японские деревянные дворы','japanese nordic autumn-cabin',
      'u-rear t-hall garden-room clipped-pavilion garden-mews'],
    ['craftsman-homes','Ремесленные дома и дома прерий','craftsman prairie rural-stone',
      'longhouse l-front terraced-wing rising-terrace close-row']
  ]],
  ['Побережья и портовые города','coastal',[
    ['mediterranean','Средиземноморские виллы','tuscany spanish riviera',
      'manor upper-hip l-front market-square stepped-mews'],
    ['cyclades','Белые кварталы Киклад','greek chalk-coast spanish',
      'rising-terrace garden-room u-front stepped-mews garden-mews'],
    ['adriatic','Адриатические площади','venice riviera spanish',
      'atrium double-gable gallery-link museum-square high-street'],
    ['atlantic-harbor','Североатлантические гавани','atlantic boardwalk chalk-coast',
      'fishing-pier light-station harbor-office longhouse close-row'],
    ['riverside-resort','Курортные набережные','victorian-coast marina miami',
      'waterfront-hall boat-workshop terraced-wing boulevard garden-mews'],
    ['medina-courts','Терракотовые дворы медины','medina spanish stone-cottage',
      'u-front u-rear clipped-hall clipped-pavilion stepped-mews'],
    ['working-quays','Рыбацкие причалы и верфи','boardwalk warehouse atlantic',
      'fishing-pier boat-workshop port-shed workshop-wing high-street']
  ]],
  ['Город XX века','modern',[
    ['deco-metropolis','Город ар-деко','art-deco media streamline',
      'upper-gable tower-cap double-gable high-street boulevard'],
    ['industrial-belt','Заводские кварталы','industrial brick-loft warehouse',
      'mill hangar workshop-wing port-shed close-row'],
    ['bauhaus-block','Баухаус и функционализм','bauhaus office streamline',
      'rising-terrace corner-lot terraced-wing close-row two-sides boulevard'],
    ['modern-villas','Виллы середины века','mid-century cullen prairie',
      'terraced-wing gallery-link upper-shed l-rear garden-mews'],
    ['concrete-city','Бруталистские комплексы','brutalist civic office',
      'upper-monitor tower-cap upper-shed t-hall museum-square'],
    ['roadside','Придорожный модернизм','diner streamline workshop',
      'hangar station-hall corner-lot high-street two-sides']
  ]],
  ['Современные и тематические города','modern',[
    ['botanical','Ботанические павильоны','conservatory eco marina',
      'greenhouse-wing atrium lantern-tower garden-room garden-mews'],
    ['green-city','Зелёный модерн','eco cullen conservatory',
      'rising-terrace terraced-wing u-rear upper-monitor garden-mews two-sides'],
    ['neon-district','Неоновый мегаполис','neon media marina',
      'lantern-tower upper-split gallery-link boulevard market-square'],
    ['science-campus','Научный кампус','observatory workshop office',
      'clipped-hall station-hall atrium t-hall museum-square'],
    ['winter-town','Зимний ярмарочный город','winter-hall alpine georgian',
      'winter-gable upper-gable wide-chalet market-square stepped-mews'],
    ['creative-quarter','Культурные и ремесленные кварталы','workshop market brick-loft',
      'workshop-wing split-wings upper-monitor garden-mews high-street']
  ]]
]

export const architectureDirections=Object.fromEntries(groups.flatMap(([group,theme,rows])=>
  rows.map(([id,label,facades,forms])=>[id,{group,theme,label,facades:facades.split(' '),forms:forms.split(' ')}])))

export const architectureDirection=id=>Object.hasOwn(architectureDirections,id)?architectureDirections[id]:undefined
