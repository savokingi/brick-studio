export const types = { bakery: 'Пекарня', cafe: 'Кафе', flowers: 'Цветочный магазин', book: 'Книжный магазин', home: 'Жилой дом' }
export const styles = { old: 'Старый город', modern: 'Современный', coastal: 'Прибрежный' }
export const colors = {
  tan: ['Песочный', 0xe1c496, 19], darkTan: ['Тёмно-песочный', 0x9e865f, 28],
  white: ['Белый', 0xf8f5ed, 15], gray: ['Светло-серый', 0x9ca5a6, 71],
  dark: ['Тёмно-серый', 0x4e5558, 72], black: ['Чёрный', 0x24262a, 0],
  red: ['Красный', 0xb83230, 4], darkRed: ['Тёмно-красный', 0x7e2928, 320],
  brown: ['Коричневый', 0x6f4533, 70], blue: ['Синий', 0x2977a9, 1],
  green: ['Зелёный', 0x347d50, 2], yellow: ['Жёлтый', 0xfaca43, 14]
}

const palettes = {
  old: [['tan','darkRed','brown'],['darkRed','tan','dark'],['white','green','brown'],['tan','green','dark'],['darkTan','red','brown'],['gray','darkRed','dark']],
  modern: [['white','black','dark'],['gray','yellow','dark'],['dark','white','black'],['white','blue','gray'],['tan','black','dark'],['gray','red','black']],
  coastal: [['white','blue','dark'],['tan','blue','dark'],['white','green','dark'],['gray','blue','dark'],['white','red','brown'],['tan','green','dark']]
}

const bricks = { '1x1': '3005', '1x2': '3004', '1x3': '3622', '1x4': '3010', '1x6': '3009', '2x2': '3003', '2x3': '3002', '2x4': '3001' }
const plates = { '1x1': '3024', '1x2': '3023', '1x3': '3623', '1x4': '3710', '1x6': '3666', '2x2': '3022', '2x3': '3021', '2x4': '3020', '2x6': '3795', '2x8': '3034', '4x4': '3031', '4x6': '3032', '4x8': '3035', '6x6': '3958', '6x8': '3036', '8x8': '41539', '8x16': '92438', '16x16': '91405' }
const tiles = { '1x1': '3070b', '1x2': '3069b', '1x3': '63864', '1x4': '2431', '2x2': '3068b', '2x3': '26603', '2x4': '87079' }
const labels = { brick: 'Кирпич', plate: 'Пластина', tile: 'Плитка' }

function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function normalize(options) {
  const dimension = value => Math.min(32, Math.max(12, Math.round(Number(value) || 16)))
  return {
    width: dimension(options.width), depth: dimension(options.depth),
    type: Object.hasOwn(types, options.type) ? options.type : 'bakery',
    style: Object.hasOwn(styles, options.style) ? options.style : 'old',
    mode: options.mode === 'solo' ? 'solo' : 'city'
  }
}

export function parameters(options, seed) {
  const rng = random(seed)
  const roll = n => Math.floor(rng() * n)
  return {
    palette: roll(6), entry: roll(2), window: 2 + 2 * roll(2),
    windowLevel: roll(2), courses: 5 + roll(3), trim: roll(4),
    side: roll(3), roof: roll(4), layout: roll(3), tables: 1 + roll(3),
    decor: roll(4), bond: roll(4), setback: options.depth >= 16 ? roll(3) : 0,
    footprint: options.width >= 16 ? roll(4) : 0
  }
}

export function newVariant(options, history = [], nextSeed = () => crypto.getRandomValues(new Uint32Array(1))[0]) {
  const seen = new Set(history.map(item => item.signature))
  const prominent = ['palette', 'entry', 'window', 'windowLevel', 'courses', 'trim', 'side', 'roof', 'layout', 'setback', 'footprint']
  let candidate, best = -1
  for (let i = 0; i < 1024; i++) {
    const seed = nextSeed()
    const design = parameters(options, seed)
    const signature = Object.values(design).join(',')
    if (seen.has(signature)) continue
    const distance = Math.min(prominent.length, ...history.slice(-6).map(item => prominent.filter(key => item.design[key] !== design[key]).length))
    if (distance > best) {
      candidate = { seed, design, signature }
      best = distance
    }
    if (distance >= 5) return candidate
  }
  if (candidate) return candidate
  throw new Error('Не удалось подобрать новый вариант. Попробуйте ещё раз.')
}

export function build(options, variant) {
  const { width, depth, style, type, mode } = options
  const { design, seed } = variant
  const rng = random(seed ^ 0xf07a3e91)
  const [wall, accent, roof] = palettes[style][design.palette]
  const footprint = width >= 16 ? design.footprint ?? 0 : 0
  const x0 = 1 + [0, 2, 0, 2][footprint]
  const x1 = width - 1 - [0, 0, 2, 2][footprint]
  const z0 = mode === 'city' ? 2 : 1
  const z1 = depth - 1 - (depth >= 16 ? design.setback ?? 0 : 0)
  const numRows = design.courses
  const roofY = 2 + 3 * numRows
  const parts = [], steps = [], occupancy = new Map()
  let layer = 'ground'
  const point = (x, y, z) => (y * depth + z) * width + x
  function step(title) {
    if (steps.at(-1)?.start === parts.length) steps.pop()
    steps.push({ title, start: parts.length })
  }
  function put(kind, x, y, z, w, d, color) {
    const size = [Math.min(w,d), Math.max(w,d)].join('x')
    const part = { id: ({ brick: bricks, plate: plates, tile: tiles })[kind][size], kind, size, x, y, z, w, d, h: kind === 'brick' ? 3 : 1, color, layer }
    if (!part.id || x < 0 || z < 0 || x + w > width || z + d > depth) throw new Error('Деталь вне каталога или участка')
    let support = y === 0 || (layer === 'roof' && y === roofY)
    for (let a = x; a < x + w; a++) {
      for (let b = z; b < z + d; b++) {
        const below = occupancy.get(point(a, y - 1, b))
        support ||= Boolean(below && below.kind !== 'tile')
        for (let dy = 0; dy < part.h; dy++) {
        const key = point(a, y + dy, b)
          if (occupancy.has(key)) throw new Error('Детали пересекаются')
          occupancy.set(key, part)
        }
      }
    }
    if (!support) throw new Error('У детали нет опоры')
    parts.push(part)
  }
  function strip(kind, x, y, z, length, color, vertical = false, order = [4, 3, 2, 1]) {
    while (length) {
      const size = order.find(n => n <= length)
      put(kind, x, y, z, vertical ? 1 : size, vertical ? size : 1, color)
      if (vertical) z += size
      else x += size
      length -= size
    }
  }
  function deck(x, y, z, w, d, color) {
    const sizes = [16, 8, 6, 4, 3, 2, 1]
    for (let offset = 0; offset < d;) {
      const rows = sizes.filter(n => n !== 16 && n !== 3).find(n => n <= d - offset)
      let col = 0
      while (col < w) {
        const cols = sizes.find(n => n <= w - col && plates[[Math.min(n, rows), Math.max(n, rows)].join('x')])
        if (cols) {
          put('plate', x + col, y, z + offset, cols, rows, color)
          col += cols
        } else {
          // Narrow remainder is covered with a one-stud strip.
          strip('plate', x + col, y, z + offset, rows, color, true)
          col++
        }
      }
      offset += rows
    }
  }

  step('Выложите основание')
  deck(0, 0, 0, width, depth, 'dark')
  step('Соедините основание полом')
  for (let z = 0; z < depth;) {
    const rows = depth - z >= 2 && z !== 0 ? 2 : 1
    for (let x = 0; x < width;) {
      const n = Math.min(width - x, x === 0 ? 3 : 4)
      put('plate', x, 1, z, n, rows, mode === 'city' && z < 2 && (x + z) % 3 === 0 ? 'gray' : 'darkTan')
      x += n
    }
    z += rows
  }

  const front = x1 - x0
  const doorX = design.entry ? x1 - 3 : x0 + 1
  const viewW = Math.min(design.window, front - 6)
  const windowX = design.entry ? x0 + 1 : x1 - 1 - viewW
  const lift = design.windowLevel + 1
  const sideStart = Math.floor((z0 + z1) / 2) - 1
  const sideWidth = design.side + 1
  function wallLine(fixed, start, end, open, row, vertical = false) {
    const y = 2 + row * 3
    const shade = row === numRows - 1 || (design.trim === 1 && row === 0) ||
      (design.trim === 2 && row === 1) || (design.trim === 3 && row % 3 === 0) ? accent : wall
    const positioned = (at, length, color, order) => vertical
      ? strip('brick', fixed, y, at, length, color, true, order)
      : strip('brick', at, y, fixed, length, color, false, order)
    let at = start
    for (const [left, right] of open) {
      if (left > at) positioned(at, left - at, shade, row % 2 ? [3, 4, 2, 1] : [4, 3, 2, 1])
      at = right
    }
    if (!open.length && row > 0) {
      // Bridge the known openings with a single brick that rests on both jambs.
      const spans = fixed === z0 && !vertical
        ? [[doorX, doorX + 2, 3], [windowX, windowX + viewW, lift + 2]]
        : vertical && fixed === (design.side === 2 ? x0 : x1) ? [[sideStart, sideStart + sideWidth, 4]] : []
      const bridges = spans.filter(span => span[2] === row).sort((a,b) => a[0] - b[0])
      for (const [left, right] of bridges) {
        const gap = right - left
        const length = gap >= 3 ? 6 : 4
        const offset = Math.max(at, Math.min(left - 1, end - length))
        if (gap <= 4 && offset + length > right && offset < left) {
          if (offset > at) positioned(at, offset - at, shade, [4,3,2,1])
          positioned(offset, length, accent, [length])
          at = offset + length
        }
      }
    }
    if (end > at) {
      const order = [[4,3,2,1],[3,4,2,1],[6,2,3,1],[4,2,3,1]][(row + design.bond) % 4]
      positioned(at, end - at, shade, order)
    }
  }

  for (let row = 0; row < numRows; row++) {
    step('Возведите стены · ряд ' + (row + 1))
    const frontOpen = []
    if (row <= 2) frontOpen.push([doorX, doorX + 2])
    if (row >= lift && row < lift + 2) frontOpen.push([windowX, windowX + viewW])
    frontOpen.sort((a,b) => a[0] - b[0])
    // Lintels are installed between continuing openings in the same course.
    const lintels = []
    if (row === 3) lintels.push([doorX - 1, doorX + 3])
    if (row === lift + 2) lintels.push([windowX - 1, windowX + viewW + 1])
    const trimmed = [...frontOpen, ...lintels].sort((a,b) => a[0] - b[0])
    wallLine(z0, x0, x1, trimmed, row)
    for (const [left, right] of lintels) {
      strip('brick', left, 2 + row * 3, z0, right - left, accent, false, [right - left])
    }
    const corner = row % 2
    // Alternate which wall owns the corners to lock the walls together.
    wallLine(z1 - 1, x0 + corner, x1 - corner, [], row)
    const sideGap = row >= 2 && row <= 3 ? [[sideStart, sideStart + sideWidth]] : []
    wallLine(x0, z0 + 1, z1 - 1 + corner, design.side === 2 ? sideGap : [], row, true)
    wallLine(x1 - 1, z0 + 1, z1 - 1 + corner, design.side !== 2 ? sideGap : [], row, true)
  }


  layer = 'interior'
  step(type === 'home' ? 'Соберите кухню' : 'Соберите прилавок')
  const counterW = design.layout === 1 ? 2 : Math.min(6, x1 - x0 - 4)
  const counterD = design.layout === 1 ? Math.min(6, z1 - z0 - 4) : 2
  const counterX = design.layout === 1 ? x1 - 3 : x0 + 2
  const counterZ = design.layout === 2 ? z0 + 3 : z1 - 1 - counterD
  for (let dz = 0; dz < counterD;) {
    const rows = Math.min(2, counterD - dz)
    for (let dx = 0; dx < counterW;) {
      const n = Math.min(4, counterW - dx)
      put('brick', counterX + dx, 2, counterZ + dz, n, rows, 'brown')
      put('tile', counterX + dx, 5, counterZ + dz, n, rows, accent)
      dx += n
    }
    dz += rows
  }
  const tableSlots = []
  for (let z = z0 + 2; z + 2 < z1; z += 3) {
    for (let x = x0 + 1; x + 2 < x1; x += 3) {
      if (z < counterZ + counterD + 1 && z + 2 >= counterZ && x < counterX + counterW + 1 && x + 2 >= counterX) continue
      if (z < z0 + 5 && x < doorX + 2 && x + 2 > doorX) continue
      tableSlots.push([x, z])
    }
  }
  step(type === 'book' ? 'Поставьте книжные стойки' : 'Расставьте мебель')
  for (let i = 0; i < design.tables && tableSlots.length; i++) {
    const index = Math.min(tableSlots.length - 1, Math.floor(rng() * tableSlots.length))
    const [[x, z]] = tableSlots.splice(index, 1)
    put('brick', x, 2, z, 1, 1, type === 'flowers' ? 'green' : 'brown')
    put('tile', x, 5, z, 2, 2, type === 'book' ? 'darkTan' : accent)
    if ((type === 'cafe' || type === 'bakery') && x + 2 < x1 - 1) put('plate', x + 2, 2, z, 1, 1, 'brown')
  }

  layer = 'exterior'
  step('Оформите вход')
  if (design.decor !== 3) {
    const planterX = design.entry ? x0 : x1 - 1
    put('brick', planterX, 2, z0 - 1, 1, 1, 'brown')
    put('plate', planterX, 5, z0 - 1, 1, 1, 'green')
    if (design.decor === 2) put('plate', planterX, 6, z0 - 1, 1, 1, 'yellow')
  }
  if (design.decor !== 0) {
    strip('tile', doorX, 2, z0 - 1, 2, accent)
  }

  layer = 'roof'
  step('Отдельно выложите основание съёмной крыши')
  deck(x0, roofY, z0, x1 - x0, z1 - z0, roof)
  step('Соедините пластины крыши')
  for (let z = z0; z < z1;) {
    const d = z === z0 ? 1 : Math.min(2, z1 - z)
    for (let x = x0; x < x1;) {
      const w = Math.min(x1 - x, x === x0 ? 3 : 4)
      put('plate', x, roofY + 1, z, w, d, roof)
      x += w
    }
    z += d
  }
  if (design.roof > 0) {
    step('Добавьте отделку крыши')
    if (design.roof === 1) {
      strip('brick', x0, roofY + 2, z0, x1 - x0, accent)
      strip('brick', x0, roofY + 2, z1 - 1, x1 - x0, accent)
      strip('brick', x0, roofY + 2, z0 + 1, z1 - z0 - 2, accent, true)
      strip('brick', x1 - 1, roofY + 2, z0 + 1, z1 - z0 - 2, accent, true)
    } else if (design.roof === 2) {
      const ridge = Math.floor((z0 + z1) / 2) - 1
      deck(x0 + 2, roofY + 2, ridge, x1 - x0 - 4, 3, roof)
      strip('tile', x0 + 2, roofY + 3, ridge + 1, x1 - x0 - 4, accent)
    } else {
      for (let i = 1; i <= 3; i++) {
        step('Уложите ступень крыши · ' + i)
        deck(x0, roofY + 1 + i, z0 + i, x1 - x0, z1 - z0 - 2 * i, i === 3 ? accent : roof)
      }
    }
  }
  step('Установите крышу на стены')
  return { options, variant, parts, steps }
}

export function inventory(parts) {
  const grouped = new Map()
  for (const part of parts) {
    const key = part.id + '/' + part.color
    if (!grouped.has(key)) grouped.set(key, { ...part, label: labels[part.kind] + ' ' + part.size.replace('x',' × '), count: 0 })
    grouped.get(key).count++
  }
  return [...grouped.values()].sort((a,b) => b.count - a.count)
}

export function editVariant(options, original, region, message) {
  const design = { ...original.design }
  const words = message.toLowerCase()
  if (region === 'facade') {
    if (/шир|увелич/.test(words)) design.window = 4
    else if (/уже|суж|уменьш/.test(words)) design.window = 2
    else if (/цвет|палитр/.test(words)) design.palette = (design.palette + 1) % 6
    else if (/вход|двер/.test(words)) design.entry = 1 - design.entry
    else return { error: 'Попробуйте «сделай витрину шире», «перенеси вход» или «смени цвет».' }
  } else if (region === 'interior') {
    const count = words.match(/[1-3]/)
    if (count) design.tables = Number(count[0])
    else if (/больше|добав/.test(words)) design.tables = Math.min(3, design.tables + 1)
    else if (/меньше|убер/.test(words)) design.tables = Math.max(1, design.tables - 1)
    else if (/план|перестав|прилав/.test(words)) design.layout = (design.layout + 1) % 3
    else return { error: 'Попробуйте «добавь столик», «оставь 2 столика» или «переставь прилавок».' }
  } else {
    if (/плоск/.test(words)) design.roof = 0
    else if (/высок|ступен/.test(words)) design.roof = 3
    else if (/смен|замен|друг/.test(words)) design.roof = (design.roof + 1) % 4
    else return { error: 'Попробуйте «сделай крышу плоской», «сделай ступенчатую крышу» или «смени крышу».' }
  }
  const signature = Object.values(design).join(',')
  if (signature === original.signature) return { error: 'У модели уже такой вариант. Попробуйте другую правку.' }
  return { model: build(options, { ...original, design, signature }) }
}



