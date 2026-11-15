// Animated ASCII wallpapers as SVG: every scene is text glyphs on a sky, moved by
// CSS animation (and SMIL motion paths for the lagoon). No script runs in a
// backdrop, so all motion is declared up front and loops forever.
// Pure functions only, so tests can build every scene directly.

export const SCENE_IDS = ['honu', 'clouds', 'koi', 'jelly', 'boats', 'fireflies', 'moon'] as const
export type SceneId = (typeof SCENE_IDS)[number]

export type SceneInfo = { id: SceneId; name: string; alt: string }

export const SCENES: SceneInfo[] = [
  { id: 'honu', name: 'Turtle lagoon', alt: 'Sea turtles, a manta, dolphins and a school of fish crossing a turquoise lagoon, drawn in characters' },
  { id: 'clouds', name: 'Drifting clouds', alt: 'White clouds drifting across a blue sky, drawn in characters' },
  { id: 'koi', name: 'Koi pond', alt: 'Koi swimming between lily pads in a green pond, drawn in characters' },
  { id: 'jelly', name: 'Jellyfish', alt: 'Glowing jellyfish rising through deep blue water, drawn in characters' },
  { id: 'boats', name: 'Paper boats', alt: 'Paper boats bobbing on a rippling sea under passing clouds, drawn in characters' },
  { id: 'fireflies', name: 'Fireflies', alt: 'Fireflies blinking over swaying grass at night, drawn in characters' },
  { id: 'moon', name: 'Moonlit night', alt: 'A crescent moon, twinkling stars and passing clouds, drawn in characters' },
]

export function isSceneId(value: unknown): value is SceneId {
  return typeof value === 'string' && (SCENE_IDS as readonly string[]).includes(value)
}

export type SceneOptions = {
  /** Animation speed multiplier, 0.25 to 3. */
  speed: number
  /** How much the scene is dimmed toward the page tone, 0 to 0.8. */
  veil: number
}

// ---------- grid, randomness ----------

const W = 1600
const H = 1000
const CW = 9
const CH = 14
const COLS = Math.ceil(W / CW)
const ROWS = Math.ceil(H / CH)
const TAU = Math.PI * 2

const hash = (x: number, y: number): number => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

const rng = (seed: number) => {
  let s = seed >>> 0
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296
}

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

/** Pins a row to whole cells, whatever the font's own advance. */
const fit = (text: string, cw: number) => (text.length > 1 ? ` textLength="${text.length * cw}" lengthAdjust="spacing"` : '')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ---------- sprites: cells with a colour key ----------

type Sprite = { w: number; h: number; cells: [number, number, string][] }

function mask(rows: string[]): Sprite {
  const cells: [number, number, string][] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== ' ') cells.push([x, y, row[x]!])
  })
  return { cells, w: Math.max(...rows.map(r => r.length)), h: rows.length }
}

function shape(w: number, h: number, fn: (x: number, y: number) => string | null): Sprite {
  const cells: [number, number, string][] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = fn(x, y)
      if (c) cells.push([x, y, c])
    }
  }
  return { cells, w, h }
}

// Cells are taller than wide, so round things are stretched across.
const KX = CH / CW

function cloud(w: number, h: number, rnd: () => number): Sprite {
  const puffs = [{ x: w / 2, y: h * 0.72, rx: w * 0.46, ry: h * 0.26 }]
  const n = 3 + Math.floor(rnd() * 3)
  for (let i = 0; i < n; i++) {
    puffs.push({
      x: w * (0.18 + (0.64 * (i + rnd() * 0.6)) / n),
      y: h * (0.45 + rnd() * 0.2),
      rx: w * (0.13 + rnd() * 0.12),
      ry: h * (0.32 + rnd() * 0.2),
    })
  }
  return shape(w, h, (x, y) => {
    if (y > h * 0.95) return null
    for (const p of puffs) {
      const dx = (x - p.x) / p.rx
      const dy = (y - p.y) / p.ry
      if (dx * dx + dy * dy <= 1) return y > h * 0.68 ? 's' : 'c'
    }
    return null
  })
}

function crescent(r: number): Sprite {
  return shape(Math.ceil(2 * r * KX) + 1, 2 * r + 1, (x, y) => {
    const dx = x / KX - r
    const dy = y - r
    const ix = dx - r * 0.55
    const iy = dy + r * 0.2
    return dx * dx + dy * dy <= r * r && ix * ix + iy * iy > r * r * 0.8 ? 'm' : null
  })
}

function bell(r: number): Sprite {
  return shape(Math.ceil(2 * r * KX) + 1, r + 1, (x, y) => {
    const dx = x / KX - r
    const dy = r - y
    return dx * dx + dy * dy <= r * r ? (dy > r * 0.6 ? 'h' : 'b') : null
  })
}

function pad(rx: number, ry: number): Sprite {
  return shape(Math.ceil(2 * rx) + 1, Math.ceil(2 * ry) + 1, (x, y) => {
    const dx = (x - rx) / rx
    const dy = (y - ry) / ry
    if (dx * dx + dy * dy > 1) return null
    return dx > 0.15 && Math.abs(dy) < 0.18 ? null : dx * dx + dy * dy > 0.55 ? 'e' : 'p'
  })
}

const KOI = mask([
  '       oo        ',
  'ww   ooowwoo     ',
  ' www owwwoooowoo ',
  '  wwwoooowwoooooo',
  ' www owwoooowoo  ',
  'ww   ooowwoo     ',
  '       oo        ',
])

const BOAT = mask([
  '      w      ',
  '     www     ',
  '    wwwww    ',
  '   wwwwwww   ',
  'ooooooooooooo',
  ' ooooooooooo ',
  '  ooooooooo  ',
])

type SpriteOptions = {
  glyphs: string
  seed?: number
  flip?: boolean
  /** Picks a glyph per cell instead of `glyphs`. */
  glyphAt?: (x: number, y: number, key: string) => string
  cw?: number
  ch?: number
  /** Offset of the sprite's top-left corner, in px. */
  x?: number
  y?: number
}

/** One <text> per colour, one <tspan> per row: compact and crisp. */
function spriteSvg(spr: Sprite, colors: Record<string, string>, o: SpriteOptions): string {
  const cw = o.cw ?? CW
  const ch = o.ch ?? CH
  const seed = o.seed ?? 0
  const ox = o.x ?? 0
  const oy = o.y ?? 0
  const byColor = new Map<string, string[][]>()
  for (const [cx, cy, key] of spr.cells) {
    const color = colors[key]
    if (!color) continue
    const x = o.flip ? spr.w - 1 - cx : cx
    let rows = byColor.get(color)
    if (!rows) {
      rows = Array.from({ length: spr.h }, () => [] as string[])
      byColor.set(color, rows)
    }
    const glyph = o.glyphAt ? o.glyphAt(x, cy, key) : o.glyphs[hash(x + seed, cy) % o.glyphs.length]!
    rows[cy]![x] = glyph
  }
  let out = ''
  for (const [color, rows] of byColor) {
    let spans = ''
    rows.forEach((row, y) => {
      if (row.length === 0) return
      let lead = 0
      while (row[lead] === undefined) lead++
      let text = ''
      for (let i = lead; i < row.length; i++) text += row[i] ?? ' '
      spans += `<tspan x="${r1(ox + lead * cw)}" y="${r1(oy + (y + 1) * ch)}"${fit(text, cw)}>${esc(text)}</tspan>`
    })
    out += `<text fill="${color}">${spans}</text>`
  }
  return out
}

/** Many single glyphs in one <text>, placed by x/y lists. */
function scatter(points: { x: number; y: number; ch: string }[], attrs: string): string {
  if (points.length === 0) return ''
  const xs = points.map(p => r1(p.x)).join(' ')
  const ys = points.map(p => r1(p.y)).join(' ')
  return `<text x="${xs}" y="${ys}" ${attrs}>${esc(points.map(p => p.ch).join(''))}</text>`
}

// ---------- the SVG document ----------

type Doc = {
  w: number
  h: number
  sky: string[]
  /** Gradient direction: top to bottom, or a diagonal. */
  skyAngle?: 'down' | 'diagonal'
  css: string
  defs?: string
  body: string
  veil: number
}

const BASE_CSS = `
text{font-family:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;font-size:15px;white-space:pre}
.a{animation-iteration-count:infinite;animation-timing-function:linear}
.f{transform-box:fill-box;transform-origin:center}
.veil{fill:#fafafc}
@media (prefers-color-scheme:dark){.veil{fill:#0c0c10}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`

function doc(d: Doc): string {
  const [x2, y2] = d.skyAngle === 'diagonal' ? ['0.45', '0.9'] : ['0', '1']
  const stops = d.sky
    .map((c, i) => `<stop offset="${r2(i / Math.max(1, d.sky.length - 1))}" stop-color="${c}"/>`)
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" ` +
    `viewBox="0 0 ${d.w} ${d.h}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">` +
    `<style>${BASE_CSS}${d.css}</style>` +
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops}</linearGradient>${d.defs ?? ''}</defs>` +
    `<rect width="${d.w}" height="${d.h}" fill="url(#sky)"/>` +
    d.body +
    (d.veil > 0 ? `<rect class="veil" width="${d.w}" height="${d.h}" fill-opacity="${r2(d.veil)}"/>` : '') +
    `</svg>`
  )
}

/** `animation` with a duration scaled by speed and a negative delay for its phase. */
const anim = (name: string, seconds: number, speed: number, phase: number, extra = '') =>
  `animation:${name} ${r2(seconds / speed)}s ${extra}${r2((-phase * seconds) / speed)}s infinite`

const area = (per: number) => Math.max(2, Math.round((COLS * ROWS) / per))

// Moving right across the stage: from just off the left edge to just off the right.
const DRIFT_FROM = -400
const DRIFT_TO = W + 40
const DRIFT_CSS = `@keyframes dr{from{transform:translateX(${DRIFT_FROM}px)}to{transform:translateX(${DRIFT_TO}px)}}
@keyframes dl{from{transform:translateX(${DRIFT_TO}px)}to{transform:translateX(${DRIFT_FROM}px)}}`

const BOB_CSS = `@keyframes bob{from{transform:translateY(-1px)}to{transform:translateY(1px)}}`

const TWINKLE_CSS = `@keyframes tw{0%,100%{opacity:.15}50%{opacity:1}}`

function twinkles(
  points: { x: number; y: number; ch: string }[],
  fill: string,
  groups: number,
  baseSeconds: number,
  speed: number,
  rnd: () => number,
): string {
  let out = ''
  for (let g = 0; g < groups; g++) {
    const mine = points.filter((_, i) => i % groups === g)
    const secs = baseSeconds * (0.6 + rnd() * 0.9)
    out += `<g style="${anim('tw', secs, speed, rnd(), 'ease-in-out ')}">${scatter(mine, `fill="${fill}"`)}</g>`
  }
  return out
}

// ---------- clouds, shared by three scenes ----------

type Cloud = { spr: Sprite; d: number; y: number; v: number; a: number; seed: number; phase: number }

function makeClouds(n: number, rnd: () => number, band: number): Cloud[] {
  return Array.from({ length: n }, () => {
    const d = rnd()
    const w = Math.round(14 + d * 24)
    const h = Math.round(4 + d * 5)
    return {
      spr: cloud(w, h, rnd),
      d,
      y: (rnd() * ROWS * band - h * 0.3) * CH,
      v: 0.5 + d * 1.5,
      a: 0.5 + d * 0.5,
      seed: (rnd() * 997) | 0,
      phase: rnd(),
    }
  }).sort((a, b) => a.d - b.d)
}

function cloudsSvg(clouds: Cloud[], colors: Record<string, string>, glyphs: string, speed: number): string {
  return clouds
    .map(c => {
      const secs = (DRIFT_TO - DRIFT_FROM) / (c.v * CW)
      return (
        `<g class="a" style="${anim('dr', secs, speed, c.phase)}" opacity="${r2(c.a)}">` +
        spriteSvg(c.spr, colors, { glyphs, seed: c.seed, y: c.y }) +
        `</g>`
      )
    })
    .join('')
}

// ---------- the scenes ----------

function clouds(o: SceneOptions): string {
  const rnd = rng(11)
  const list = makeClouds(area(700), rnd, 0.95)
  return doc({
    w: W,
    h: H,
    sky: ['#4aa8ec', '#bfe4fd'],
    css: DRIFT_CSS,
    body: cloudsSvg(list, { c: '#ffffff', s: '#d6ecfa' }, 'SXSX#', o.speed),
    veil: o.veil,
  })
}

function koi(o: SceneOptions): string {
  const rnd = rng(23)
  const glints = Array.from({ length: area(60) }, () => ({ x: rnd() * W, y: rnd() * H, ch: '·' }))
  let body = twinkles(glints, '#bff7e4', 6, 7, o.speed, rnd)

  const fish = Array.from({ length: area(1500) }, () => ({
    y: rnd() * H,
    v: (0.8 + rnd() * 1.4) * (rnd() < 0.5 ? -1 : 1),
    amp: 1 + rnd() * 3,
    phase: rnd(),
    seed: (rnd() * 997) | 0,
  }))
  for (const f of fish) {
    const secs = (DRIFT_TO - DRIFT_FROM) / (Math.abs(f.v) * CW)
    // The original swims a sine across the screen, 0.07 rad per cell.
    const wave = TAU / 0.07 / Math.abs(f.v) / 2
    body +=
      `<g class="a" style="${anim(f.v > 0 ? 'dr' : 'dl', secs, o.speed, f.phase)}">` +
      `<g style="${anim('sw', wave, o.speed, f.phase, 'ease-in-out ')};animation-direction:alternate;--a:${r1(f.amp * CH)}px">` +
      spriteSvg(KOI, { o: '#ff7a2b', w: '#fff1e2' }, { glyphs: '#%S', seed: f.seed, flip: f.v < 0, y: f.y }) +
      `</g></g>`
  }

  const pads = Array.from({ length: area(1100) }, () => ({
    spr: pad(3 + rnd() * 4, 2 + rnd() * 2),
    x: rnd() * W,
    y: rnd() * H,
    phase: rnd(),
    seed: (rnd() * 997) | 0,
  }))
  for (const p of pads) {
    body +=
      `<g style="${anim('bob', 10.5, o.speed, p.phase, 'ease-in-out ')};animation-direction:alternate">` +
      spriteSvg(p.spr, { p: '#3fa34d', e: '#2c7a3a' }, { glyphs: '@%#', seed: p.seed, x: p.x, y: p.y }) +
      `</g>`
  }

  return doc({
    w: W,
    h: H,
    sky: ['#1f7a63', '#0d4a44', '#082f2d'],
    css: `${DRIFT_CSS}${BOB_CSS.replace(/1px/g, '6px')}${TWINKLE_CSS}
@keyframes sw{from{transform:translateY(calc(var(--a) * -1))}to{transform:translateY(var(--a))}}`,
    body,
    veil: o.veil,
  })
}

const JELLY_COLORS = [
  { b: '#c38cff', h: '#f0d4ff', t: '#e59cff' },
  { b: '#ff8cc8', h: '#ffd6ec', t: '#ffa8d8' },
  { b: '#7fd8ff', h: '#d6f4ff', t: '#9be4ff' },
]

// A jelly is at most this tall with its tentacles, so it leaves the top whole.
const RISE_TOP = 260

function jelly(o: SceneOptions): string {
  const rnd = rng(37)
  let body = ''

  // Dust rises in layers; each layer is drawn twice, a screen apart, so it loops seamlessly.
  for (let layer = 0; layer < 4; layer++) {
    const pts = Array.from({ length: Math.round(area(45) / 4) }, () => ({ x: rnd() * W, y: rnd() * H, ch: '.' }))
    const id = `d${layer}`
    const secs = H / ((0.1 + layer * 0.08) * CH)
    body +=
      `<g class="a" style="${anim('up', secs, o.speed, rnd())}">` +
      `<g id="${id}" style="${anim('tw', 3 + layer, o.speed, rnd(), 'ease-in-out ')}">${scatter(pts, 'fill="#7fe7ff"')}</g>` +
      `<use href="#${id}" xlink:href="#${id}" y="${H}"/></g>`
  }

  const jellies = Array.from({ length: area(800) }, () => {
    const spr = bell(3 + Math.floor(rnd() * 3))
    return {
      spr,
      x: rnd() * (W - spr.w * CW),
      v: 0.5 + rnd() * 1.1,
      tent: 4 + Math.floor(rnd() * 3),
      len: 5 + Math.floor(rnd() * 6),
      c: JELLY_COLORS[Math.floor(rnd() * JELLY_COLORS.length)]!,
      seed: (rnd() * 997) | 0,
      phase: rnd(),
    }
  })
  for (const j of jellies) {
    const travel = H + 20 + RISE_TOP
    const secs = travel / (j.v * 0.8 * CH)
    let tentacles = ''
    for (let k = 0; k < j.tent; k++) {
      const tx = 1 + ((j.spr.w - 2) * k) / (j.tent - 1)
      const pts = []
      for (let d = 0; d < j.len; d++) pts.push({ x: (j.x / CW + tx) * CW, y: (j.spr.h + d + 1) * CH, ch: d % 3 ? ':' : '|' })
      tentacles += scatter(pts, '')
    }
    body +=
      `<g class="a" style="${anim('rise', secs, o.speed, j.phase)}">` +
      `<g style="${anim('sway', 15.7, o.speed, j.phase, 'ease-in-out ')};animation-direction:alternate">` +
      `<g class="f" fill="${j.c.t}" style="${anim('wig', 4, o.speed, j.phase, 'ease-in-out ')};animation-direction:alternate;transform-origin:top" opacity=".7">${tentacles}</g>` +
      `<g class="f" style="${anim('pulse', 3.9, o.speed, j.phase, 'ease-in-out ')}">` +
      spriteSvg(j.spr, { b: j.c.b, h: j.c.h }, { glyphs: '*+x#', seed: j.seed, x: j.x }) +
      `</g></g></g>`
  }

  return doc({
    w: W,
    h: H,
    sky: ['#24308a', '#0b1240', '#05081f'],
    css: `${TWINKLE_CSS}
@keyframes up{from{transform:translateY(0)}to{transform:translateY(-${H}px)}}
@keyframes rise{from{transform:translateY(${H + 20}px)}to{transform:translateY(-${RISE_TOP}px)}}
@keyframes sway{from{transform:translateX(-18px)}to{transform:translateX(18px)}}
@keyframes wig{from{transform:skewX(-6deg)}to{transform:skewX(6deg)}}
@keyframes pulse{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.88)}}`,
    body,
    veil: o.veil,
  })
}

/** A strip of wave glyphs that repeats every `period` columns. */
function waveRows(top: number, bottom: number, period: number, k1: number, k2: number, shift: number): string {
  let spans = ''
  for (let r = top; r < bottom; r++) {
    const depth = (r - top) / (bottom - top)
    let row = ''
    for (let c = 0; c < period; c++) {
      const v = Math.sin((TAU * k1 * c) / period + r * 0.9 + shift) + 0.6 * Math.sin((TAU * k2 * c) / period + r * 1.7)
      row += v > 1.2 ? '~' : v > 0.75 ? '-' : ' '
    }
    spans += `<tspan x="0" y="${(r + 1) * CH}" fill-opacity="${r2(0.25 + 0.45 * depth)}"${fit(row, CW)}>${row}</tspan>`
  }
  return `<text fill="#f2fffd">${spans}</text>`
}

function boats(o: SceneOptions): string {
  const rnd = rng(41)
  const horizon = Math.round(ROWS * 0.5)
  let body = cloudsSvg(makeClouds(area(1800), rnd, 0.45), { c: '#ffffff', s: '#e3f6f4' }, 'SX#', o.speed)

  // Two wave layers slide opposite ways, so the crests shimmer rather than march.
  const period = 200
  const pw = period * CW
  for (const [i, dir, k1, k2, secs] of [
    [0, 'wl', 14, 6, 40],
    [1, 'wr', 9, 17, 55],
  ] as const) {
    body +=
      `<g class="a" style="${anim(dir, secs, o.speed, 0)}" opacity="${i ? 0.6 : 1}">` +
      `<g id="w${i}">${waveRows(horizon, ROWS, period, k1, k2, i * 2)}</g>` +
      `<use href="#w${i}" xlink:href="#w${i}" x="${pw}"/></g>`
  }

  const list = Array.from({ length: area(1600) }, () => ({
    row: horizon + 2 + rnd() * (ROWS - horizon - 10),
    v: 0.4 + rnd() * 0.9,
    red: rnd() < 0.3,
    seed: (rnd() * 997) | 0,
    phase: rnd(),
  })).sort((a, b) => a.row - b.row)
  for (const b of list) {
    const secs = (DRIFT_TO - DRIFT_FROM) / (b.v * CW)
    body +=
      `<g class="a" style="${anim('dr', secs, o.speed, b.phase)}">` +
      `<g style="${anim('bob', 4.8, o.speed, b.phase, 'ease-in-out ')};animation-direction:alternate">` +
      spriteSvg(BOAT, { w: b.red ? '#ff8b7b' : '#ffffff', o: '#f6ead0' }, { glyphs: 'SX#', seed: b.seed, y: (b.row - BOAT.h) * CH }) +
      `</g></g>`
  }

  return doc({
    w: W,
    h: H,
    sky: ['#c4f4ef', '#72d4d6', '#1e8fa6'],
    css: `${DRIFT_CSS}${BOB_CSS.replace(/1px/g, '8px')}
@keyframes wl{from{transform:translateX(0)}to{transform:translateX(-${pw}px)}}
@keyframes wr{from{transform:translateX(-${pw}px)}to{transform:translateX(0)}}`,
    body,
    veil: o.veil,
  })
}

function fireflies(o: SceneOptions): string {
  const rnd = rng(53)
  const stars = Array.from({ length: area(160) }, () => ({ x: rnd() * W, y: rnd() * H * 0.35, ch: '·' }))
  let body = twinkles(stars, '#cfe9dc', 5, 9, o.speed, rnd)

  // Grass: still stems, and tips that lean with a wave travelling along the meadow.
  const stems: { x: number; y: number; ch: string }[] = []
  const stemsLight: { x: number; y: number; ch: string }[] = []
  const tips: { c: number; y: number }[] = []
  for (let c = 0; c < COLS; c++) {
    const h = 2 + (hash(c, 1) % 4) + (hash(c, 2) % 9 === 0 ? 3 : 0)
    for (let k = 0; k < h - 1; k++) (k > 2 ? stemsLight : stems).push({ x: c * CW, y: H - k * CH, ch: '|' })
    tips.push({ c, y: H - (h - 1) * CH })
  }
  body += scatter(stems, 'fill="#145c3a"') + scatter(stemsLight, 'fill="#1d7a4c"')
  const groups = 16
  const sway = TAU / 0.8
  for (let g = 0; g < groups; g++) {
    const mine = tips.filter(t => Math.floor((((t.c * 0.15) % TAU) / TAU) * groups) === g)
    if (mine.length === 0) continue
    const phase = (g + 0.5) / groups
    for (const [ch, name] of [
      ['/', 'gr'],
      ['|', 'gm'],
      ['\\', 'gl'],
    ] as const) {
      body += `<g style="${anim(name, sway, o.speed, phase, 'step-end ')}">${scatter(
        mine.map(t => ({ x: t.c * CW, y: t.y, ch })),
        'fill="#1d7a4c"',
      )}</g>`
    }
  }

  // Fireflies wander on one of six loops and blink with a soft glow.
  const flies = Array.from({ length: area(220) }, () => ({
    x: rnd() * W,
    y: H * (0.2 + rnd() * 0.7),
    sp: 0.6 + rnd() * 1.4,
    path: Math.floor(rnd() * 6),
    phase: rnd(),
    blink: rnd(),
  }))
  for (const f of flies) {
    body +=
      `<g style="${anim(`m${f.path}`, 26 / f.sp, o.speed, f.phase, 'ease-in-out ')}">` +
      `<g style="${anim('blink', TAU / f.sp, o.speed, f.blink, 'ease-in-out ')}">` +
      `<circle cx="${r1(f.x)}" cy="${r1(f.y - 5)}" r="22" fill="url(#glow)"/>` +
      `<text x="${r1(f.x - 4)}" y="${r1(f.y)}" fill="#f3ffb0">•</text></g></g>`
  }
  let wander = ''
  const wr = rng(7)
  for (let p = 0; p < 6; p++) {
    const pts = Array.from({ length: 4 }, () => `translate(${Math.round((wr() - 0.5) * 140)}px,${Math.round((wr() - 0.5) * 90)}px)`)
    wander += `@keyframes m${p}{0%,100%{transform:translate(0,0)}25%{transform:${pts[0]}}50%{transform:${pts[1]}}75%{transform:${pts[2]}}}`
  }

  return doc({
    w: W,
    h: H,
    sky: ['#06120f', '#0b2a22', '#0f3a2c'],
    defs: `<radialGradient id="glow"><stop offset="0" stop-color="#d6ff78" stop-opacity=".45"/><stop offset="1" stop-color="#d6ff78" stop-opacity="0"/></radialGradient>`,
    css: `${TWINKLE_CSS}${wander}
@keyframes blink{0%,100%{opacity:0}50%{opacity:1}}
@keyframes gr{0%{opacity:0}4.86%{opacity:1}45.15%{opacity:0}}
@keyframes gl{0%{opacity:0}54.86%{opacity:1}95.16%{opacity:0}}
@keyframes gm{0%{opacity:1}4.86%{opacity:0}45.15%{opacity:1}54.86%{opacity:0}95.16%{opacity:1}}`,
    body,
    veil: o.veil,
  })
}

function moon(o: SceneOptions): string {
  const rnd = rng(67)
  const stars = Array.from({ length: area(55) }, () => {
    const pick = rnd()
    return { x: rnd() * W, y: rnd() * H, ch: pick < 0.15 ? '+' : pick < 0.22 ? '*' : '·' }
  })
  let body = twinkles(stars, '#dfe6ff', 8, 4, o.speed, rnd)

  const r = 8
  const spr = crescent(r)
  const mx = W * 0.66
  const my = H * 0.1
  const cx = mx + (spr.w * CW) / 2
  const cy = my + (spr.h * CH) / 2
  body +=
    `<g class="moon"><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(spr.h * CH * 1.4)}" fill="url(#mglow)"/>` +
    spriteSvg(spr, { m: '#fff3c9' }, { glyphs: '#@', x: mx, y: my }) +
    `</g>`

  // Two shooting stars on long, offset cycles; each shows for about a second.
  const angle = (Math.atan2(0.55, 1.6) * 180) / Math.PI
  for (const [x, y, secs, phase] of [
    [W * 0.12, H * 0.08, 11, 0.1],
    [W * 0.38, H * 0.2, 17, 0.6],
  ] as const) {
    body +=
      `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(angle)})">` +
      `<g style="${anim('shoot', secs, o.speed, phase)}">` +
      `<text fill="#ffffff">---------*</text></g></g>`
  }

  body += cloudsSvg(makeClouds(area(1400), rnd, 0.9), { c: '#7d8ce6', s: '#5664c8' }, 'SX#', o.speed)

  return doc({
    w: W,
    h: H,
    sky: ['#070c33', '#111d63', '#22348f'],
    defs: `<radialGradient id="mglow"><stop offset="0" stop-color="#fff0c8" stop-opacity=".18"/><stop offset="1" stop-color="#fff0c8" stop-opacity="0"/></radialGradient>`,
    css: `${DRIFT_CSS}${TWINKLE_CSS}
@keyframes shoot{0%{transform:translateX(0);opacity:0}1%{opacity:1}9%{transform:translateX(420px);opacity:0}100%{transform:translateX(420px);opacity:0}}
@media (max-aspect-ratio:1/1){.moon{transform:translateX(-260px)}}`,
    body,
    veil: o.veil,
  })
}

// ---------- the turtle lagoon ----------
// A top-down reef. Creatures are drawn from ellipses, sampled onto a coarse cell
// grid and written as glyphs, then sent along looping paths with SMIL.

const HW = 1944
const HH = 1760
const HCW = 16
const HCH = 22
const HT = 24.5
const HWW = TAU / HT

type Ell = { x: number; y: number; rx: number; ry: number; rot?: number; c: string }

/** Samples ellipses (last one wins) onto cells of cw×ch, centred on the origin. */
function rasterize(shapes: Ell[], scale: number, cw = HCW, ch = HCH): Sprite & { ox: number; oy: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of shapes) {
    const r = Math.max(s.rx, s.ry) * scale
    minX = Math.min(minX, s.x * scale - r)
    maxX = Math.max(maxX, s.x * scale + r)
    minY = Math.min(minY, s.y * scale - r)
    maxY = Math.max(maxY, s.y * scale + r)
  }
  const c0 = Math.floor(minX / cw)
  const r0 = Math.floor(minY / ch)
  const w = Math.ceil(maxX / cw) - c0
  const h = Math.ceil(maxY / ch) - r0
  const spr = shape(w, h, (i, j) => {
    const px = ((c0 + i + 0.5) * cw) / scale
    const py = ((r0 + j + 0.5) * ch) / scale
    let hit: string | null = null
    for (const s of shapes) {
      const a = -(s.rot ?? 0)
      const dx = px - s.x
      const dy = py - s.y
      const u = dx * Math.cos(a) - dy * Math.sin(a)
      const v = dx * Math.sin(a) + dy * Math.cos(a)
      if ((u / s.rx) ** 2 + (v / s.ry) ** 2 <= 1) hit = s.c
    }
    return hit
  })
  return { ...spr, ox: c0 * cw, oy: r0 * ch }
}

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

const RAMP = '8%XSSt%t;:'

const mixHex = (hex: string, to: number, k: number) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v + (to - v) * k).toString(16).padStart(2, '0')
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`
}

/** A creature: its body as ellipses, with contrasting glyphs on the cells it covers. */
function honuSprite(shapes: Ell[], scale: number, seed: number): string {
  const body = shapes
    .map(e => {
      const rot = e.rot ? ` transform="rotate(${r1((e.rot * 180) / Math.PI)} ${r1(e.x * scale)} ${r1(e.y * scale)})"` : ''
      return `<ellipse cx="${r1(e.x * scale)}" cy="${r1(e.y * scale)}" rx="${r1(e.rx * scale)}" ry="${r1(e.ry * scale)}" fill="${e.c}"${rot}/>`
    })
    .join('')
  const spr = rasterize(shapes, scale)
  const colors: Record<string, string> = {}
  for (const [, , c] of spr.cells) colors[c] = lum(c) < 0.42 ? mixHex(c, 255, 0.62) : mixHex(c, 0, 0.58)
  return (
    `<g opacity=".9">${body}</g>` +
    spriteSvg(spr, colors, {
      glyphs: RAMP,
      cw: HCW,
      ch: HCH,
      x: spr.ox,
      y: spr.oy - HCH * 0.25,
      glyphAt: (x, y, key) =>
        RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(1 + lum(key) * 5 + (hash(x + seed, y) % 100) / 25)))]!,
    })
  )
}

function turtleShapes(): Ell[] {
  const out: Ell[] = []
  for (const m of [-1, 1]) {
    const a = m * 1.15
    // Front flippers, swept back; rear flippers small.
    out.push({ x: 62 + Math.sin(a) * -78 * m, y: 58 * m + Math.cos(a) * 78 * m, rx: 26, ry: 92, rot: a, c: '#9c8a5c' })
    out.push({ x: -92 + Math.sin(m * 2.2) * -26 * m, y: 40 * m + Math.cos(m * 2.2) * 26 * m, rx: 15, ry: 34, rot: m * 2.2, c: '#9c8a5c' })
  }
  out.push({ x: 118, y: 0, rx: 30, ry: 24, c: '#a39060' })
  out.push({ x: 150, y: 0, rx: 34, ry: 27, c: '#b8a573' })
  out.push({ x: 146, y: -10, rx: 7, ry: 5, c: '#4b3f22' })
  out.push({ x: 146, y: 10, rx: 7, ry: 5, c: '#4b3f22' })
  out.push({ x: 0, y: 0, rx: 132, ry: 100, c: '#c9b067' })
  out.push({ x: 0, y: 0, rx: 120, ry: 90, c: '#5e5022' })
  for (const [x, y, r] of [
    [60, 0, 24],
    [12, 0, 28],
    [-38, 0, 26],
    [-80, 0, 18],
    [40, -50, 20],
    [-8, -56, 22],
    [-56, -46, 18],
    [40, 50, 20],
    [-8, 56, 22],
    [-56, 46, 18],
  ] as const) {
    out.push({ x, y, rx: r, ry: r * 0.8, c: '#b39a4a' })
  }
  for (const [x, y] of [
    [60, 0],
    [12, 0],
    [-38, 0],
  ] as const) {
    out.push({ x, y, rx: 9, ry: 9, c: '#e0c56a' })
  }
  return out
}

function mantaShapes(): Ell[] {
  const out: Ell[] = [{ x: -220, y: 0, rx: 110, ry: 4, c: '#1c2733' }]
  for (const m of [-1, 1]) {
    out.push({ x: -10, y: 150 * m, rx: 70, ry: 150, rot: m * -0.35, c: '#1e2b3a' })
    out.push({ x: 120, y: 40 * m, rx: 34, ry: 12, rot: 0.35 * m, c: '#26364a' })
  }
  out.push({ x: 0, y: 0, rx: 118, ry: 70, c: '#1e2b3a' })
  for (const m of [-1, 1]) {
    out.push({ x: 18, y: 82 * m, rx: 70, ry: 30, rot: -0.5 * m, c: '#e9eef0' })
    out.push({ x: -10, y: 150 * m, rx: 40, ry: 18, rot: -0.6 * m, c: '#8fa3b0' })
  }
  return out
}

function dolphinShapes(): Ell[] {
  return [
    { x: -150, y: 0, rx: 40, ry: 60, c: '#4b5a68' },
    { x: -90, y: 0, rx: 90, ry: 26, c: '#5c6d7c' },
    { x: 40, y: -48, rx: 44, ry: 13, rot: 0.75, c: '#6f8190' },
    { x: 40, y: 48, rx: 44, ry: 13, rot: -0.75, c: '#6f8190' },
    { x: 60, y: 0, rx: 140, ry: 40, c: '#8a9cab' },
    { x: 20, y: 0, rx: 120, ry: 22, c: '#43515e' },
  ]
}

function tangShapes(): Ell[] {
  return [
    { x: -50, y: 0, rx: 20, ry: 18, c: '#f2c200' },
    { x: 8, y: 0, rx: 46, ry: 15, c: '#ffd61f' },
    { x: 40, y: 0, rx: 12, ry: 9, c: '#ffe46a' },
  ]
}

function whaleShapes(): Ell[] {
  return [
    { x: -560, y: 0, rx: 50, ry: 130, c: '#dfe7ea' },
    { x: -260, y: 0, rx: 280, ry: 50, c: '#2b3d52' },
    { x: 150, y: 210, rx: 30, ry: 125, rot: 0.6, c: '#e6eef0' },
    { x: 150, y: -210, rx: 30, ry: 125, rot: -0.6, c: '#e6eef0' },
    { x: 40, y: 0, rx: 290, ry: 128, c: '#33475e' },
  ]
}

function hibiscusShapes(s: number): Ell[] {
  const out: Ell[] = []
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5
    out.push({ x: Math.cos(a) * 52 * s, y: Math.sin(a) * 52 * s, rx: 52 * s, ry: 40 * s, rot: a, c: '#ef3b5a' })
  }
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5
    out.push({ x: Math.cos(a) * 40 * s, y: Math.sin(a) * 40 * s, rx: 30 * s, ry: 22 * s, rot: a, c: '#d42448' })
  }
  out.push({ x: 0, y: 0, rx: 22 * s, ry: 22 * s, c: '#8a0f2e' })
  out.push({ x: 84 * s * Math.cos(0.6), y: 84 * s * Math.sin(0.6), rx: 10 * s, ry: 10 * s, c: '#ffe27a' })
  return out
}

function plumeriaShapes(s: number): Ell[] {
  const out: Ell[] = []
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5
    out.push({ x: Math.cos(a) * 36 * s - Math.sin(a) * 12 * s, y: Math.sin(a) * 36 * s + Math.cos(a) * 12 * s, rx: 40 * s, ry: 24 * s, rot: a + 0.35, c: '#fffaf0' })
  }
  out.push({ x: 0, y: 0, rx: 20 * s, ry: 20 * s, c: '#ffb800' })
  return out
}

/** A closed path through one loop of a parametric curve. */
function loop(fn: (t: number) => [number, number], steps = 72): string {
  let d = ''
  for (let i = 0; i < steps; i++) {
    const [x, y] = fn((i / steps) * HT)
    d += `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)}`
  }
  return `${d}Z`
}

function along(path: string, secs: number, speed: number, inner: string, begin = 0): string {
  return (
    `<g><animateMotion path="${path}" dur="${r2(secs / speed)}s" begin="${r2(-begin / speed)}s" repeatCount="indefinite" rotate="auto"/>` +
    inner +
    `</g>`
  )
}

function honu(o: SceneOptions): string {
  const rnd = rng(79)
  const P = {
    turtleA: (t: number): [number, number] => [972 + 1080 * Math.cos(HWW * t + 0.3), 860 + 640 * Math.sin(HWW * t + 0.3) + 140 * Math.sin(2 * HWW * t)],
    turtleB: (t: number): [number, number] => [900 + 700 * Math.sin(-HWW * t + 1), 880 - 1080 * Math.cos(-HWW * t + 1)],
    turtleC: (t: number): [number, number] => [972 + 1150 * Math.sin(HWW * t + 4), 900 + 560 * Math.sin(2 * HWW * t + 4.6)],
    manta: (t: number): [number, number] => [972 + 1380 * Math.cos(-HWW * t + 3.6), 820 + 900 * Math.sin(-HWW * t + 3.6)],
    dolphin: (t: number): [number, number] => [972 + 1350 * Math.cos(2 * HWW * t + 0.8), 900 + 950 * Math.sin(2 * HWW * t + 0.8) + 160 * Math.sin(4 * HWW * t)],
    school: (t: number): [number, number] => [972 + 1150 * Math.sin(2 * HWW * t + 5), 880 + 800 * Math.sin(3 * HWW * t + 1)],
    whale: (t: number): [number, number] => [972 + 1900 * Math.cos(HWW * t + 2.4), 1350 + 380 * Math.sin(HWW * t + 2.4)],
  }

  // Faint cell grid, as the original's.
  let body = `<rect width="${HW}" height="${HH}" fill="url(#grid)"/>`

  // Sunlight bands sweeping across.
  body += `<g class="a" style="${anim('band', HT, o.speed, 0)}">`
  for (let k = 0; k < 4; k++) {
    const x = k * ((HW + HH) * 0.3)
    body += `<polygon points="${x},-200 ${x + 260},-200 ${x + 260 - HH * 1.4},${HH + 200} ${x - HH * 1.4},${HH + 200}" fill="url(#ray)"/>`
  }
  body += `</g>`

  // Ripples: two periodic fields of ~ - · drifting opposite ways.
  for (const [i, dir, secs, kx, ky] of [
    [0, 'hl', HT * 2, 9, 5],
    [1, 'hr', HT * 3, 6, 8],
  ] as const) {
    let spans = ''
    const cols = Math.ceil(HW / HCW)
    const rows = Math.ceil(HH / HCH)
    for (let j = 0; j < rows; j++) {
      let row = ''
      for (let c = 0; c < cols; c++) {
        const u = (TAU * c) / cols
        const v = (TAU * j) / rows
        const val = Math.sin(kx * u + ky * v * 0.4 + 1.6 * Math.sin(ky * v - 2 * u)) + Math.sin(-kx * 0.6 * u + ky * v + i)
        row += val > 1.5 ? (val > 1.85 ? '~' : val > 1.7 ? '-' : '·') : ' '
      }
      const text = row.replace(/\s+$/, '')
      if (text) spans += `<tspan x="0" y="${(j + 1) * HCH}"${fit(text, HCW)}>${text}</tspan>`
    }
    body +=
      `<g class="a" style="${anim(dir, secs, o.speed, 0)}" opacity="${i ? 0.35 : 0.5}">` +
      `<text id="r${i}" class="h" fill="#ffffff">${spans}</text>` +
      `<use href="#r${i}" xlink:href="#r${i}" x="${HW}"/><use href="#r${i}" xlink:href="#r${i}" x="${-HW}"/></g>`
  }

  // Glints.
  const glints = Array.from({ length: 70 }, () => ({ x: rnd() * HW, y: rnd() * HH, ch: rnd() < 0.4 ? '*' : '+' }))
  body += `<g class="h">${twinkles(glints, '#ffffff', 7, 3, o.speed, rnd)}</g>`

  // Reef in the corners, muted by the water above it.
  const reef: Ell[] = []
  const blob = (x: number, y: number, r: number, c1: string, c2: string, n: number) => {
    const br = rng(x * 7 + y)
    for (let k = 0; k < n; k++) {
      const a = br() * TAU
      const d = br() * r * 0.7
      reef.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.9, rx: r * (0.35 + 0.3 * br()), ry: r * (0.3 + 0.3 * br()), rot: a, c: k % 2 ? c1 : c2 })
    }
  }
  blob(140, 1600, 110, '#d98a6a', '#c46a5a', 10)
  blob(1800, 220, 100, '#d8b86a', '#c49c4c', 9)
  blob(80, 380, 80, '#c9a0d8', '#e2a0b8', 7)
  blob(1700, 1650, 110, '#d6b870', '#e8907a', 10)
  body += `<g class="h" opacity=".45">${honuSprite(reef, 1, 3)}</g>`

  // The whale swims deep, faded into the water.
  body += `<g class="h" opacity=".35">${along(loop(P.whale), HT, o.speed, honuSprite(whaleShapes(), 1, 5))}</g>`

  const ss = (shapes: Ell[], scale: number, seed: number) => honuSprite(shapes, scale, seed)
  body += `<g class="h">`
  body += along(loop(P.manta), HT, o.speed, ss(mantaShapes(), 1.2, 7))
  body += along(loop(P.dolphin), HT, o.speed, ss(dolphinShapes(), 1.25, 9))
  body += along(loop(P.dolphin), HT, o.speed, ss(dolphinShapes(), 1.1, 11), 0.5)
  body += along(loop(P.turtleA), HT, o.speed, ss(turtleShapes(), 1.55, 13))
  body += along(loop(P.turtleB), HT, o.speed, ss(turtleShapes(), 1.3, 15))
  body += along(loop(P.turtleC), HT, o.speed, ss(turtleShapes(), 1.1, 17))
  const FISH = [
    [0, 0],
    [-120, -70],
    [-120, 75],
    [-240, -10],
    [-230, -140],
    [-235, 130],
    [-360, -75],
    [-355, 70],
    [-470, 5],
  ]
  const tang = ss(tangShapes(), 1.35, 19)
  body += along(
    loop(P.school),
    HT,
    o.speed,
    FISH.map(([x, y], k) => `<g transform="translate(${x} ${y})"><g style="${anim('fin', 1.4, o.speed, k / 9, 'ease-in-out ')};animation-direction:alternate">${tang}</g></g>`).join(''),
  )
  body += `</g>`

  // Flowers drift down the lagoon, turning slowly.
  const FLOWERS = [
    ['h', 0.0, 260, 1.0, 1],
    ['p', 0.22, 1240, 0.9, -1],
    ['h', 0.47, 640, 0.8, -1],
    ['p', 0.63, 1560, 1.1, 1],
    ['p', 0.86, 120, 0.8, 1],
  ] as const
  body += `<g class="h">`
  for (const [kind, p0, y0, s, dir] of FLOWERS) {
    const art = ss(kind === 'h' ? hibiscusShapes(s) : plumeriaShapes(s), 1, Math.round(p0 * 100))
    body +=
      `<g><animateMotion path="M-220 ${y0}L${HW + 220} ${y0 + 420}" dur="${r2(HT / o.speed)}s" begin="${r2((-p0 * HT) / o.speed)}s" repeatCount="indefinite"/>` +
      `<g><animateTransform attributeName="transform" type="rotate" from="0" to="${dir * 360}" dur="${r2(HT / o.speed)}s" repeatCount="indefinite"/>${art}</g></g>`
  }
  body += `</g>`

  return doc({
    w: HW,
    h: HH,
    sky: ['#b2f4e8', '#4ad6d6', '#1aa8ca', '#0e80b6'],
    skyAngle: 'diagonal',
    defs:
      `<pattern id="grid" width="${HCW}" height="${HCH}" patternUnits="userSpaceOnUse"><path d="M0 0H${HCW}M0 0V${HCH}" stroke="#fff" stroke-opacity=".07"/></pattern>` +
      `<linearGradient id="ray" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffff0" stop-opacity="0"/><stop offset=".5" stop-color="#fffff0" stop-opacity=".1"/><stop offset="1" stop-color="#fffff0" stop-opacity="0"/></linearGradient>`,
    css: `${TWINKLE_CSS}
.h text{font-size:17px;font-weight:600}
@keyframes band{from{transform:translateX(-${Math.round((HW + HH) * 0.6)}px)}to{transform:translateX(${Math.round((HW + HH) * 0.6)}px)}}
@keyframes hl{from{transform:translateX(0)}to{transform:translateX(-${HW}px)}}
@keyframes hr{from{transform:translateX(0)}to{transform:translateX(${HW}px)}}
@keyframes fin{from{transform:translateY(-8px)}to{transform:translateY(8px)}}`,
    body,
    veil: o.veil,
  })
}

const BUILDERS: Record<SceneId, (o: SceneOptions) => string> = { honu, clouds, koi, jelly, boats, fireflies, moon }

/** The scene's SVG document, at most 131072 characters. */
export function buildScene(id: SceneId, o: SceneOptions): string {
  return BUILDERS[id]({
    speed: Math.min(3, Math.max(0.25, o.speed)),
    veil: Math.min(0.8, Math.max(0, o.veil)),
  })
}
