// Animated ASCII wallpapers for the app's backdrop, as SVG: every scene is text glyphs on a sky, moved by
// CSS animation (and SMIL motion paths for the lagoon). No script runs in a
// backdrop, so all motion is declared up front and loops forever.
// Pure functions only, so tests can build every scene directly.

export const SCENE_IDS = ['waves', 'hills', 'forest', 'lake', 'galaxy', 'planets', 'islands', 'castle', 'summer', 'starry', 'pyramids', 'lanterns', 'bokeh', 'glow', 'honu', 'clouds', 'koi', 'jelly', 'boats', 'fireflies', 'moon', 'rain', 'snow', 'aurora', 'sakura'] as const
export type SceneId = (typeof SCENE_IDS)[number]

/**
 * `scheme` is the mode the scene is painted for, so text over it reads light on dark or dark on light.
 * `kind`: drawn in shapes and gradients, or in text glyphs.
 */
export type SceneKind = 'nature' | 'space' | 'fantasy' | 'anime' | 'ancient' | 'dreamy' | 'ascii'
export type SceneInfo = { id: SceneId; name: string; alt: string; scheme: 'light' | 'dark'; kind?: SceneKind }

/** The picker's groups, in order; a scene with no kind is drawn in characters. */
export const SCENE_GROUPS: { kind: SceneKind; title: string }[] = [
  { kind: 'nature', title: 'Nature' },
  { kind: 'space', title: 'Space' },
  { kind: 'fantasy', title: 'Fantasy' },
  { kind: 'anime', title: 'Anime skies' },
  { kind: 'ancient', title: 'Ancient lands' },
  { kind: 'dreamy', title: 'Dreamy' },
  { kind: 'ascii', title: 'Drawn in characters' },
]

export const SCENES: SceneInfo[] = [
  { id: 'waves', name: 'Ocean waves', alt: 'Layered waves rolling under a soft sunset sky with a low sun', scheme: 'light', kind: 'nature' },
  { id: 'hills', name: 'Sunset hills', alt: 'Rolling violet hills under a glowing sunset, with birds gliding and stars coming out', scheme: 'dark', kind: 'nature' },
  { id: 'forest', name: 'Misty forest', alt: 'Rows of pine trees fading into morning mist, with sunbeams slanting through', scheme: 'light', kind: 'nature' },
  { id: 'lake', name: 'Mountain lake', alt: 'Snowy peaks mirrored in a still lake at dusk, with stars and soft ripples', scheme: 'dark', kind: 'nature' },
  { id: 'galaxy', name: 'Spiral galaxy', alt: 'A glowing spiral galaxy turning slowly among twinkling stars', scheme: 'dark', kind: 'space' },
  { id: 'planets', name: 'Ringed planet', alt: 'A large ringed planet with a small moon circling it, a far blue planet and stars', scheme: 'dark', kind: 'space' },
  { id: 'islands', name: 'Floating islands', alt: 'Grassy islands floating in a bright sky, with waterfalls pouring from their edges and drifting clouds', scheme: 'light', kind: 'fantasy' },
  { id: 'castle', name: 'Dragon moon', alt: 'A castle on a cliff under a huge moon as a dragon glides across the night sky', scheme: 'dark', kind: 'fantasy' },
  { id: 'summer', name: 'Summer sky', alt: 'Towering summer clouds in a deep blue sky over the sea, with power lines and a jet trail', scheme: 'light', kind: 'anime' },
  { id: 'starry', name: 'Comet night', alt: 'A bright comet and shooting stars over a sleeping hillside town at twilight', scheme: 'dark', kind: 'anime' },
  { id: 'pyramids', name: 'Desert pyramids', alt: 'Pyramids and dunes at sunset with a camel caravan crossing slowly', scheme: 'light', kind: 'ancient' },
  { id: 'lanterns', name: 'Lantern festival', alt: 'Warm paper lanterns rising past a pagoda into the night sky over still water', scheme: 'dark', kind: 'ancient' },
  { id: 'bokeh', name: 'City bokeh', alt: 'Soft out-of-focus lights in warm and cool colors drifting on a dark night', scheme: 'dark', kind: 'dreamy' },
  { id: 'glow', name: 'Pastel glow', alt: 'Large soft pastel color clouds slowly drifting and blending', scheme: 'light', kind: 'dreamy' },
  { id: 'honu', name: 'Turtle lagoon', alt: 'Sea turtles, a manta, dolphins and a school of fish crossing a turquoise lagoon, drawn in characters', scheme: 'light' },
  { id: 'clouds', name: 'Drifting clouds', alt: 'White clouds drifting across a blue sky, drawn in characters', scheme: 'light' },
  { id: 'koi', name: 'Koi pond', alt: 'Koi swimming between lily pads in a green pond, drawn in characters', scheme: 'dark' },
  { id: 'jelly', name: 'Jellyfish', alt: 'Glowing jellyfish rising through deep blue water, drawn in characters', scheme: 'dark' },
  { id: 'boats', name: 'Paper boats', alt: 'Paper boats bobbing on a rippling sea under passing clouds, drawn in characters', scheme: 'light' },
  { id: 'fireflies', name: 'Fireflies', alt: 'Fireflies blinking over swaying grass at night, drawn in characters', scheme: 'dark' },
  { id: 'moon', name: 'Moonlit night', alt: 'A crescent moon, twinkling stars and passing clouds, drawn in characters', scheme: 'dark' },
  { id: 'rain', name: 'Rainy city', alt: 'Slanting rain falling over a dark city skyline with lit windows, drawn in characters', scheme: 'dark' },
  { id: 'snow', name: 'Snowfall', alt: 'Snow drifting down over pine trees and snowy hills at night, drawn in characters', scheme: 'dark' },
  { id: 'aurora', name: 'Northern lights', alt: 'Green and violet northern lights waving above dark mountains under stars, drawn in characters', scheme: 'dark' },
  { id: 'sakura', name: 'Cherry blossoms', alt: 'Pink petals drifting from a blossoming cherry branch on a pale pink sky, drawn in characters', scheme: 'light' },
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
// One row of grid text, each glyph placed on its own cell by an x list: no
// textLength, which makes the browser stretch every glyph and costs a whole
// frame's time on a full-width row (Turtle lagoon ran at 29 fps with it, and
// the desktop app gave up drawing it). Spaces are left out, so only runs of
// glyphs are written.
const cellRow = (text: string, x0: number, y: number, cw: number, attrs = '') => {
  let out = ''
  for (const m of text.matchAll(/\S+/g)) {
    const xs = Array.from(m[0], (_, k) => r1(x0 + (m.index! + k) * cw)).join(' ')
    out += `<tspan x="${xs}" y="${y}"${attrs}>${esc(m[0])}</tspan>`
  }
  return out
}

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
      spans += cellRow(text, ox + lead * cw, r1(oy + (y + 1) * ch), cw)
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
  /** The page tone the veil fades toward. */
  veilColor: string
}

const BASE_CSS = `
text{font-family:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;font-size:15px;white-space:pre}
.a{animation-iteration-count:infinite;animation-timing-function:linear}
.f{transform-box:fill-box;transform-origin:center}
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
    (d.veil > 0 ? `<rect class="veil" width="${d.w}" height="${d.h}" fill="${d.veilColor}" fill-opacity="${r2(d.veil)}"/>` : '') +
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

function clouds(o: BuildOptions): string {
  const rnd = rng(11)
  const list = makeClouds(area(700), rnd, 0.95)
  return doc({
    w: W,
    h: H,
    sky: ['#4aa8ec', '#bfe4fd'],
    css: DRIFT_CSS,
    body: cloudsSvg(list, { c: '#ffffff', s: '#d6ecfa' }, 'SXSX#', o.speed),
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function koi(o: BuildOptions): string {
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
    veilColor: o.veilColor,
  })
}

const JELLY_COLORS = [
  { b: '#c38cff', h: '#f0d4ff', t: '#e59cff' },
  { b: '#ff8cc8', h: '#ffd6ec', t: '#ffa8d8' },
  { b: '#7fd8ff', h: '#d6f4ff', t: '#9be4ff' },
]

// A jelly is at most this tall with its tentacles, so it leaves the top whole.
const RISE_TOP = 260

function jelly(o: BuildOptions): string {
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
    veilColor: o.veilColor,
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
    spans += cellRow(row, 0, (r + 1) * CH, CW, ` fill-opacity="${r2(0.25 + 0.45 * depth)}"`)
  }
  return `<text fill="#f2fffd">${spans}</text>`
}

function boats(o: BuildOptions): string {
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
    veilColor: o.veilColor,
  })
}

function fireflies(o: BuildOptions): string {
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
    veilColor: o.veilColor,
  })
}

function moon(o: BuildOptions): string {
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
    veilColor: o.veilColor,
  })
}

// ---------- illustrated scenes ----------
// Drawn in paths and soft gradients rather than glyphs. Soft light comes from
// radial gradients, never a blur filter, so the motion stays cheap to paint.

/** Six slow wandering loops, as keyframes w0..w5, reaching `reach` px from home. */
function wanderCss(reach: number, seed: number): string {
  const r = rng(seed)
  let css = ''
  for (let p = 0; p < 6; p++) {
    const at = () => `translate(${Math.round((r() - 0.5) * 2 * reach)}px,${Math.round((r() - 0.5) * 1.4 * reach)}px)`
    css += `@keyframes w${p}{0%,100%{transform:translate(0,0)}25%{transform:${at()}}50%{transform:${at()}}75%{transform:${at()}}}`
  }
  return css
}

/** A soft round light: a radial gradient from `color` at `alpha` to nothing. */
const softGradient = (id: string, color: string, alpha: number) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${alpha}"/><stop offset=".55" stop-color="${color}" stop-opacity="${r2(alpha * 0.45)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

/** A filled band whose top edge is a sum of sines, `length` px long. */
function ridgePath(length: number, top: number, bottom: number, parts: [amp: number, period: number, phase: number][]): string {
  let d = `M0 ${bottom}`
  for (let x = 0; x <= length; x += 16) {
    let y = top
    for (const [amp, period, phase] of parts) y += amp * Math.sin((TAU * x) / period + phase)
    d += ` L${x} ${r1(y)}`
  }
  return `${d} L${length} ${bottom} Z`
}

function waves(o: BuildOptions): string {
  // Each layer is two periods wide and slides one period, so it loops without a seam.
  const layers = [
    { y: 0.56, amp: 10, period: 520, fill: '#9fd3e6', secs: 46, dir: 1 },
    { y: 0.63, amp: 14, period: 640, fill: '#6bb7d6', secs: 38, dir: -1 },
    { y: 0.71, amp: 18, period: 760, fill: '#3f93bf', secs: 32, dir: 1 },
    { y: 0.8, amp: 22, period: 880, fill: '#2a6f9e', secs: 27, dir: -1 },
    { y: 0.9, amp: 26, period: 1000, fill: '#1b4f7a', secs: 23, dir: 1 },
  ]
  let css = ''
  let body =
    `<circle cx="${W * 0.68}" cy="${H * 0.5}" r="260" fill="url(#sunGlow)"/>` +
    `<circle cx="${W * 0.68}" cy="${H * 0.5}" r="70" fill="#fff1d6"/>`
  layers.forEach((l, i) => {
    const length = W + l.period * 2
    const parts: [number, number, number][] = [
      [l.amp, l.period, i],
      [l.amp * 0.35, l.period / 2, i * 2],
    ]
    css += `@keyframes wv${i}{from{transform:translateX(${l.dir > 0 ? -l.period : 0}px)}to{transform:translateX(${l.dir > 0 ? 0 : -l.period}px)}}`
    body +=
      `<g class="a" style="${anim(`wv${i}`, l.secs, o.speed, 0)}">` +
      `<path d="${ridgePath(length, l.y * H, H, parts)}" fill="${l.fill}"/>` +
      `<path d="${ridgePath(length, l.y * H - 2, l.y * H + 6, parts)}" fill="#ffffff" fill-opacity=".18"/></g>`
  })
  return doc({
    w: W,
    h: H,
    sky: ['#fde3c8', '#f6b9a8', '#a9cbe8'],
    defs: softGradient('sunGlow', '#ffd9a0', 0.8),
    css,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function hills(o: BuildOptions): string {
  const rnd = rng(131)
  const stars = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H * 0.32, r: 0.8 + rnd() * 1.4 }))
  let body = ''
  for (let g = 0; g < 4; g++) {
    const mine = stars.filter((_, i) => i % 4 === g)
    body += `<g style="${anim('tw', 5 + g * 1.7, o.speed, rnd(), 'ease-in-out ')}">${mine.map(s => `<circle cx="${r1(s.x)}" cy="${r1(s.y)}" r="${r1(s.r)}" fill="#fff4e0"/>`).join('')}</g>`
  }
  body +=
    `<circle cx="${W * 0.5}" cy="${H * 0.66}" r="420" fill="url(#sunGlow)"/>` +
    `<circle cx="${W * 0.5}" cy="${H * 0.66}" r="96" fill="#ffd28a"/>`
  // Birds: a few gliding Vs that cross the sky, each flapping gently.
  for (let b = 0; b < 5; b++) {
    const y = H * (0.2 + rnd() * 0.25)
    const s = 0.7 + rnd() * 0.6
    body +=
      `<g class="a" style="${anim('dr', 70 + rnd() * 50, o.speed, rnd())}">` +
      `<g transform="translate(0 ${r1(y)}) scale(${r2(s)})"><path class="f" style="${anim('flap', 1.6, o.speed, rnd(), 'ease-in-out ')};animation-direction:alternate" d="M0 0 Q8 -7 16 0 Q24 -7 32 0" fill="none" stroke="#3a1f3d" stroke-width="2.4" stroke-linecap="round"/></g></g>`
  }
  const ridges: [number, string, [number, number, number][]][] = [
    [0.62, '#b0577a', [[34, 900, 0.4], [14, 380, 1.3]]],
    [0.7, '#7d3d6b', [[40, 1100, 2.1], [12, 300, 0.2]]],
    [0.79, '#4f2a57', [[30, 800, 3.3], [10, 260, 1.9]]],
    [0.88, '#2a1838', [[26, 1300, 0.9], [8, 220, 2.6]]],
  ]
  for (const [y, fill, parts] of ridges) body += `<path d="${ridgePath(W, y * H, H, parts)}" fill="${fill}"/>`
  return doc({
    w: W,
    h: H,
    sky: ['#24163f', '#6b2f5e', '#d4636c', '#f7a76a'],
    defs: softGradient('sunGlow', '#ffb27a', 0.75),
    css: `${DRIFT_CSS}${TWINKLE_CSS}@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(.4)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function bokeh(o: BuildOptions): string {
  const rnd = rng(149)
  const colors = ['#ffb35c', '#ff6f91', '#7cc8ff', '#b28dff', '#ffe08a', '#5fe0c4']
  const defs = colors.map((c, i) => softGradient(`b${i}`, c, 0.55)).join('')
  let body = ''
  for (let i = 0; i < 34; i++) {
    const r = 30 + rnd() ** 2 * 130
    body +=
      `<g style="${anim(`w${i % 6}`, 50 + rnd() * 60, o.speed, rnd(), 'ease-in-out ')}">` +
      `<circle cx="${r1(rnd() * W)}" cy="${r1(rnd() * H)}" r="${r1(r)}" fill="url(#b${i % colors.length})" style="${anim('pulse', 7 + rnd() * 8, o.speed, rnd(), 'ease-in-out ')}"/></g>`
  }
  return doc({
    w: W,
    h: H,
    sky: ['#0d0a1f', '#1a1033', '#0a1626'],
    skyAngle: 'diagonal',
    defs,
    css: `${wanderCss(140, 151)}@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function glow(o: BuildOptions): string {
  const rnd = rng(163)
  const colors = ['#ffb8cc', '#b6d8ff', '#c6f2d4', '#ffe2a6', '#d8c4ff']
  const defs = colors.map((c, i) => softGradient(`g${i}`, c, 0.95)).join('')
  let body = ''
  for (let i = 0; i < 9; i++) {
    body +=
      `<g style="${anim(`w${i % 6}`, 70 + rnd() * 60, o.speed, rnd(), 'ease-in-out ')}">` +
      `<circle cx="${r1(rnd() * W)}" cy="${r1(rnd() * H)}" r="${r1(320 + rnd() * 220)}" fill="url(#g${i % colors.length})"/></g>`
  }
  return doc({
    w: W,
    h: H,
    sky: ['#fbf7ff', '#f3f1fb'],
    defs,
    css: wanderCss(260, 167),
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

// ---------- more illustrated scenes: nature, space, fantasy, anime skies, ancient lands ----------

const STARS_CSS = TWINKLE_CSS
const FLOAT_CSS = `@keyframes bobY{from{transform:translateY(-10px)}to{transform:translateY(10px)}}`

/** Little round stars in `groups` that twinkle out of step. */
function starDots(n: number, top: number, bottom: number, fill: string, speed: number, rnd: () => number, groups = 4): string {
  const stars = Array.from({ length: n }, () => ({ x: rnd() * W, y: top + rnd() * (bottom - top), r: 0.6 + rnd() * 1.5 }))
  let out = ''
  for (let g = 0; g < groups; g++) {
    const mine = stars.filter((_, i) => i % groups === g)
    out += `<g style="${anim('tw', 4 + g * 1.6, speed, rnd(), 'ease-in-out ')}">${mine.map(s => `<circle cx="${r1(s.x)}" cy="${r1(s.y)}" r="${r1(s.r)}" fill="${fill}"/>`).join('')}</g>`
  }
  return out
}

/**
 * A natural ridge line: the given control points, each gap split again and
 * again with the middle nudged up or down by less each time.
 */
function fractalLine(points: [number, number][], amp: number, levels: number, rnd: () => number, rough = 0.55): [number, number][] {
  let pts = points
  for (let l = 0; l < levels; l++) {
    const next: [number, number][] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]!
      const [x1, y1] = pts[i + 1]!
      next.push([x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + (rnd() - 0.5) * amp])
    }
    next.push(pts[pts.length - 1]!)
    pts = next
    amp *= rough
  }
  return pts
}

const linePath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('')

/** One fir: a narrow spire with ragged, drooping branch tiers, as a path. */
function firPath(x: number, base: number, h: number, rnd: () => number): string {
  const tiers = 7 + Math.floor(rnd() * 4)
  const width = h * (0.26 + rnd() * 0.08)
  const left: string[] = []
  const right: string[] = []
  for (let k = 1; k <= tiers; k++) {
    const t = k / tiers
    const y = base - h + h * t * 0.94
    const w = width * Math.pow(t, 0.85) * (0.8 + rnd() * 0.4)
    const tuck = w * (0.45 + rnd() * 0.2)
    // A branch tip dips a little below where the next tier starts.
    right.push(`${Math.round(x + w)} ${Math.round(y + h * 0.02)}`, `${Math.round(x + tuck)} ${Math.round(y - h * 0.035)}`)
    left.unshift(`${Math.round(x - tuck)} ${Math.round(y - h * 0.035)}`, `${Math.round(x - w * (0.8 + rnd() * 0.4))} ${Math.round(y + h * 0.02)}`)
  }
  return `M${Math.round(x)} ${Math.round(base - h - h * 0.04)}L${right.join('L')}L${Math.round(x + width * 0.12)} ${Math.round(base)}L${Math.round(x - width * 0.12)} ${Math.round(base)}L${left.join('L')}Z`
}

/** A row of firs of mixed heights standing on a gently rolling line at `base`. */
function pineRow(base: number, height: number, fill: string, rnd: () => number): string {
  let d = ''
  for (let x = -40; x < W + 60; x += 20 + rnd() * 34) {
    const ground = base + Math.sin(x / 260 + height) * 14
    d += firPath(x, ground + 6, height * (0.45 + rnd() * 0.65), rnd)
  }
  const floor = fractalLine([[0, base], [W, base]], 30, 6, rnd)
  return `<path d="${d}" fill="${fill}"/><path d="${linePath(floor)}L${W} ${H}L0 ${H}Z" fill="${fill}"/>`
}

/** Mountains along `base`: a few peaks joined by a weathered, fractal ridge. */
function peaksPath(base: number, height: number, rnd: () => number): string {
  const ctrl: [number, number][] = [[0, base - height * (0.2 + rnd() * 0.3)]]
  let x = 0
  while (x < W) {
    x += 160 + rnd() * 260
    ctrl.push([Math.min(W, x), base - height * (rnd() < 0.5 ? 0.6 + rnd() * 0.4 : 0.15 + rnd() * 0.3)])
  }
  // Lower at the frame's edges, so no peak is cut in half there.
  ctrl[ctrl.length - 1]![1] = base - height * 0.25
  ctrl[0]![1] = base - height * 0.3
  const ridge = fractalLine(ctrl, height * 0.35, 6, rnd)
  return `${linePath(ridge)}L${W} ${base}L0 ${base}Z`
}

/** Light from the upper left on a mountain range: the same path, shaded by a gradient. */
const RANGE_DEFS = (id: string, top: string, bottom: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`

function forest(o: BuildOptions): string {
  const rnd = rng(173)
  let body = `<circle cx="${W * 0.78}" cy="${H * 0.08}" r="460" fill="url(#sunhaze)"/>`
  // Sunbeams slanting from the top right, breathing slowly.
  for (let i = 0; i < 6; i++) {
    const x = W * (0.5 + i * 0.09)
    body += `<polygon points="${r1(x)},0 ${r1(x + 40 + rnd() * 50)},0 ${r1(x - 360)},${H} ${r1(x - 480 - rnd() * 80)},${H}" fill="#fffbe6" style="${anim('beam', 9 + i * 2, o.speed, rnd(), 'ease-in-out ')}"/>`
  }
  body += `<path d="${peaksPath(H * 0.56, 200, rnd)}" fill="#c9d8cf"/>`
  const rows: [number, number, string][] = [
    [0.6, 200, '#a7bfb1'],
    [0.7, 250, '#7d9e8a'],
    [0.82, 300, '#4d755e'],
    [0.96, 360, '#21402f'],
  ]
  rows.forEach(([y, h, fill], i) => {
    body += pineRow(y * H, h, fill, rnd)
    // Fog pooled at the foot of each row, thinning upward, drifting slowly.
    if (i < rows.length - 2) {
      body +=
        `<rect x="0" y="${r1(y * H - 150)}" width="${W}" height="190" fill="url(#fog)"/>` +
        `<g class="a" style="${anim('dr', 140 + i * 40, o.speed, rnd())}" opacity=".7"><ellipse cx="300" cy="${r1(y * H - 10)}" rx="600" ry="50" fill="url(#mist)"/></g>`
    }
  })
  return doc({
    w: W,
    h: H,
    sky: ['#fbf6e6', '#e6eedf', '#cfdfd2'],
    defs:
      softGradient('mist', '#ffffff', 0.85) +
      softGradient('sunhaze', '#fff6d6', 0.9) +
      `<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef3ea" stop-opacity="0"/><stop offset="1" stop-color="#eef3ea" stop-opacity=".75"/></linearGradient>`,
    css: `${DRIFT_CSS}@keyframes beam{0%,100%{opacity:.05}50%{opacity:.18}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function lake(o: BuildOptions): string {
  const rnd = rng(181)
  const horizon = H * 0.62
  const far = peaksPath(horizon, 330, rnd)
  const mid = peaksPath(horizon, 210, rnd)
  const near = `${linePath(fractalLine([[0, horizon - 60], [W * 0.3, horizon - 10], [W * 0.7, horizon - 30], [W, horizon - 70]], 40, 6, rnd))}L${W} ${horizon}L0 ${horizon}Z`
  const range = `<path d="${far}" fill="url(#far)"/><path d="${far}" fill="url(#snow)"/><path d="${mid}" fill="url(#mid)"/><path d="${near}" fill="#141a33"/>`
  let body = starDots(110, 0, H * 0.42, '#fff8ec', o.speed, rnd)
  body +=
    `<circle cx="${W * 0.7}" cy="${horizon - 40}" r="380" fill="url(#dusk)"/>` +
    range +
    // The reflection: the same ranges flipped about the shore, darker, under the water.
    `<g transform="translate(0 ${r1(horizon * 2)}) scale(1 -1)" opacity=".5">${range}</g>` +
    `<rect x="0" y="${r1(horizon)}" width="${W}" height="${r1(H - horizon)}" fill="url(#water)"/>` +
    `<rect x="0" y="${r1(horizon - 1)}" width="${W}" height="2" fill="#f3c9b4" opacity=".5"/>`
  // Ripples: long thin glints, wider and brighter toward the viewer.
  for (let g = 0; g < 4; g++) {
    let d = ''
    for (let i = 0; i < 16; i++) {
      const t = rnd()
      const y = horizon + 8 + t * t * (H - horizon - 16)
      const len = 20 + t * 160 * rnd()
      d += `M${r1(rnd() * W)} ${r1(y)} h${r1(len)}`
    }
    body += `<path d="${d}" stroke="#f6d3c0" stroke-width="1.6" stroke-linecap="round" opacity=".7" style="${anim('tw', 5 + g * 2, o.speed, rnd(), 'ease-in-out ')}"/>`
  }
  return doc({
    w: W,
    h: H,
    sky: ['#121b3a', '#3d4274', '#a66f86', '#eaa585'],
    defs:
      RANGE_DEFS('far', '#6a6c9c', '#3f4373') +
      RANGE_DEFS('mid', '#3c406e', '#242850') +
      softGradient('dusk', '#ffc9a0', 0.4) +
      `<linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".5"/><stop offset=".16" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3561" stop-opacity=".45"/><stop offset="1" stop-color="#0b1028" stop-opacity=".95"/></linearGradient>`,
    css: STARS_CSS,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function galaxy(o: BuildOptions): string {
  const rnd = rng(191)
  const cx = W * 0.62
  const cy = H * 0.42
  let body = starDots(160, 0, H, '#dfe6ff', o.speed, rnd, 5)
  body += `<circle cx="${cx}" cy="${cy}" r="420" fill="url(#halo)"/>`
  // Two arms of dots on a log spiral, tilted into an ellipse, turning slowly.
  const colors = ['#ffffff', '#cfd8ff', '#ffd6f0', '#a9c4ff', '#ffe9c4']
  let dots = ''
  for (let arm = 0; arm < 2; arm++) {
    // A soft band of light under each arm, so the spiral reads at a glance.
    let band = ''
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * 3.2 * Math.PI
      const r = 18 * Math.exp(0.3 * t)
      const a = t + arm * Math.PI
      band += `${i ? 'L' : 'M'}${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`
    }
    dots += `<path d="${band}" fill="none" stroke="#9d8cff" stroke-opacity=".16" stroke-width="70" stroke-linecap="round"/><path d="${band}" fill="none" stroke="#e4dcff" stroke-opacity=".18" stroke-width="22" stroke-linecap="round"/>`
    for (let i = 0; i < 300; i++) {
      const t = (i / 300) * 3.2 * Math.PI
      const r = 18 * Math.exp(0.3 * t) + (rnd() - 0.5) * (10 + t * 9)
      const a = t + arm * Math.PI + (rnd() - 0.5) * 0.35
      dots += `<circle cx="${r1(cx + r * Math.cos(a))}" cy="${r1(cy + r * Math.sin(a))}" r="${r1(1 + rnd() * 2.4)}" fill="${colors[Math.floor(rnd() * colors.length)]}" opacity="${r2(0.5 + rnd() * 0.5)}"/>`
    }
  }
  body +=
    `<g transform="translate(${cx} ${cy}) scale(1 .55) rotate(-20) translate(${-cx} ${-cy})">` +
    `<g style="transform-origin:${cx}px ${cy}px;${anim('spin', 360, o.speed, 0)}">${dots}</g></g>` +
    `<circle cx="${cx}" cy="${cy}" r="70" fill="url(#core)"/>`
  return doc({
    w: W,
    h: H,
    sky: ['#03020c', '#0b0626', '#160b33'],
    skyAngle: 'diagonal',
    defs: softGradient('halo', '#6c5cff', 0.3) + softGradient('core', '#fff3d6', 0.9),
    css: `${STARS_CSS}@keyframes spin{to{transform:rotate(360deg)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function planets(o: BuildOptions): string {
  const rnd = rng(197)
  const px = W * 0.72
  const py = H * 0.34
  const pr = 150
  const ring = (half: 'back' | 'front') =>
    `<path d="M${px - 300} ${py} A300 62 0 0 ${half === 'back' ? 1 : 0} ${px + 300} ${py}" fill="none" stroke="url(#ring)" stroke-width="16" transform="rotate(-14 ${px} ${py})"/>`
  let body = starDots(150, 0, H, '#e8ecff', o.speed, rnd, 5)
  body +=
    `<circle cx="${W * 0.16}" cy="${H * 0.72}" r="46" fill="url(#blue)"/>` +
    `<circle cx="${px}" cy="${py}" r="320" fill="url(#pglow)"/>` +
    ring('back') +
    `<circle cx="${px}" cy="${py}" r="${pr}" fill="url(#planet)"/>` +
    `<circle cx="${px}" cy="${py}" r="${pr}" fill="url(#shade)"/>` +
    ring('front') +
    // A small moon on a circle about the planet.
    `<g style="transform-origin:${px}px ${py}px;${anim('orbit', 60, o.speed, 0.2)}"><circle cx="${px + 380}" cy="${py}" r="16" fill="#d9dbe6"/></g>` +
    `<g transform="translate(${W * 0.1} ${H * 0.12}) rotate(18)"><g style="${anim('shoot', 14, o.speed, 0.3)}"><line x1="0" y1="0" x2="160" y2="0" stroke="url(#trail)" stroke-width="2"/></g></g>`
  return doc({
    w: W,
    h: H,
    sky: ['#040714', '#0a1330', '#151c43'],
    defs:
      `<linearGradient id="planet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe0ab"/><stop offset=".5" stop-color="#e09a62"/><stop offset="1" stop-color="#8a4632"/></linearGradient>` +
      `<radialGradient id="shade" cx=".35" cy=".3" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>` +
      `<linearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6e2bf" stop-opacity=".2"/><stop offset=".5" stop-color="#f6e2bf" stop-opacity=".85"/><stop offset="1" stop-color="#f6e2bf" stop-opacity=".2"/></linearGradient>` +
      `<radialGradient id="blue" cx=".35" cy=".35"><stop offset="0" stop-color="#a6d8ff"/><stop offset="1" stop-color="#2b5fa8"/></radialGradient>` +
      `<linearGradient id="trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
      softGradient('pglow', '#ffb37a', 0.25),
    css: `${STARS_CSS}@keyframes orbit{to{transform:rotate(360deg)}}
@keyframes shoot{0%{transform:translateX(0);opacity:0}2%{opacity:1}10%{transform:translateX(520px);opacity:0}100%{transform:translateX(520px);opacity:0}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

/** A soft cloud from overlapping circles, with a shaded underside. */
function puffCloud(x: number, y: number, s: number, rnd: () => number, light = '#ffffff', shade = '#dbe7f5'): string {
  const parts = Array.from({ length: 6 }, (_, i) => ({ dx: (i - 2.5) * 46 * s + (rnd() - 0.5) * 20 * s, dy: -Math.sin((i / 5) * Math.PI) * 50 * s, r: (45 + rnd() * 35) * s }))
  const circles = (fill: string, off: number) => parts.map(p => `<circle cx="${r1(x + p.dx)}" cy="${r1(y + p.dy + off)}" r="${r1(p.r)}" fill="${fill}"/>`).join('')
  return circles(shade, 14 * s) + circles(light, 0)
}

/**
 * One floating island centred on its grass line at (0,0): a jagged rock that
 * narrows to a tip, layered and shaded, a grass cap that overhangs it, roots
 * hanging below, and trees on top. `n` keeps its gradient ids apart.
 */
function floatingIsle(w: number, n: number, rnd: () => number, extra = ''): string {
  const depth = w * (1.1 + rnd() * 0.3)
  const tip = (rnd() - 0.5) * w * 0.3
  // The underside: a jagged line from the right edge down to the tip and back up.
  const under: [number, number][] = []
  const steps = 18
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = w - 2 * w * t + (i > 0 && i < steps ? (rnd() - 0.5) * w * 0.07 : 0)
    const k = 1 - Math.pow(Math.abs(2 * t - 1), 1.6)
    const y = 10 + (depth - 10) * k * (1 - Math.abs(x - tip) / (w * 2.2)) + (i % 2 ? rnd() * w * 0.08 : -rnd() * w * 0.04)
    under.push([x, Math.max(10, y)])
  }
  const rock = `M${-w} 4 L${w} 4 ` + under.map(([x, y]) => `L${r1(x)} ${r1(y)}`).join(' ') + ' Z'
  // Strata: wavy darker bands across the rock, kept inside it.
  let strata = ''
  for (let k = 1; k <= 5; k++) {
    const y = (depth * k) / 6
    strata += `<path d="M${-w} ${r1(y)} Q${r1(-w / 2)} ${r1(y + (rnd() - 0.5) * 18)} 0 ${r1(y)} T${w} ${r1(y + (rnd() - 0.5) * 14)}" fill="none" stroke="#3a2418" stroke-opacity=".28" stroke-width="${r1(2 + rnd() * 3)}"/>`
  }
  // Roots and vines hanging from the underside, swaying a little.
  let roots = ''
  for (let i = 0; i < 9; i++) {
    const [x, y] = under[1 + Math.floor(rnd() * (steps - 1))]!
    const len = 20 + rnd() * 70
    roots += `M${r1(x)} ${r1(y - 4)} q${r1((rnd() - 0.5) * 30)} ${r1(len / 2)} ${r1((rnd() - 0.5) * 16)} ${r1(len)}`
  }
  // The grass cap: a soft top edge and tufts that drip over the rim.
  let grass = `M${r1(-w * 1.06)} 10`
  for (let x = -w * 1.06; x <= w * 1.06; x += w / 8) grass += ` Q${r1(x + w / 16)} ${r1(-10 - rnd() * 8)} ${r1(x + w / 8)} ${r1(-4 - rnd() * 4)}`
  grass += ` L${r1(w * 1.06)} 10`
  for (let x = w * 1.06; x >= -w * 1.06; x -= w / 10) grass += ` Q${r1(x - w / 20)} ${r1(10 + (rnd() < 0.4 ? 10 + rnd() * 18 : 2))} ${r1(x - w / 10)} 10`
  grass += ' Z'
  // Trees: round canopies lit from the upper left, and a few dark firs.
  let trees = ''
  const count = Math.round(w / 40)
  for (let i = 0; i < count; i++) {
    const x = -w * 0.85 + (1.7 * w * (i + rnd() * 0.6)) / count
    const s = 0.6 + rnd() * 0.7
    if (rnd() < 0.35) {
      trees += `<path d="M${r1(x)} ${r1(-70 * s)} L${r1(x + 16 * s)} ${r1(-20 * s)} L${r1(x + 7 * s)} ${r1(-22 * s)} L${r1(x + 20 * s)} -2 L${r1(x - 20 * s)} -2 L${r1(x - 7 * s)} ${r1(-22 * s)} L${r1(x - 16 * s)} ${r1(-20 * s)} Z" fill="#2c5f45"/>`
    } else {
      trees +=
        `<rect x="${r1(x - 3 * s)}" y="${r1(-26 * s)}" width="${r1(6 * s)}" height="${r1(26 * s)}" fill="#5a3b28"/>` +
        `<circle cx="${r1(x - 12 * s)}" cy="${r1(-34 * s)}" r="${r1(16 * s)}" fill="#3d7d47"/><circle cx="${r1(x + 12 * s)}" cy="${r1(-36 * s)}" r="${r1(17 * s)}" fill="#3d7d47"/>` +
        `<circle cx="${r1(x)}" cy="${r1(-50 * s)}" r="${r1(20 * s)}" fill="#4f9a55"/><circle cx="${r1(x - 6 * s)}" cy="${r1(-56 * s)}" r="${r1(10 * s)}" fill="#7cc46a" opacity=".8"/>`
    }
  }
  return (
    `<path d="${rock}" fill="url(#rock)"/>` +
    `<g clip-path="url(#clip${n})">${strata}<rect x="${-w}" y="0" width="${2 * w}" height="${r1(depth + 40)}" fill="url(#side)"/></g>` +
    `<clipPath id="clip${n}"><path d="${rock}"/></clipPath>` +
    `<path d="${roots}" fill="none" stroke="#4a3426" stroke-width="2" stroke-linecap="round" opacity=".75"/>` +
    `<path d="${grass}" fill="url(#grass)"/>` +
    extra +
    trees
  )
}

/** A little house with a red roof and a lit window, for the big island. */
const COTTAGE =
  `<rect x="-22" y="-34" width="44" height="34" fill="#efe2c8"/><rect x="-22" y="-34" width="44" height="34" fill="url(#side)"/>` +
  `<path d="M-30 -32 L0 -58 L30 -32 Z" fill="#b8503e"/><path d="M0 -58 L30 -32 L18 -32 Z" fill="#8e3a2e"/>` +
  `<rect x="-6" y="-24" width="12" height="12" rx="2" fill="#ffd27a"/><rect x="12" y="-56" width="7" height="14" fill="#6b4a3a"/>`

function islands(o: BuildOptions): string {
  const rnd = rng(211)
  let body = `<circle cx="${W * 0.82}" cy="${H * 0.12}" r="420" fill="url(#sunglow)"/>`
  // Sunbeams fanning down from the upper right, breathing slowly.
  for (let i = 0; i < 4; i++) {
    const x = W * (0.62 + i * 0.1)
    body += `<polygon points="${r1(x)},0 ${r1(x + 50)},0 ${r1(x - 420)},${H} ${r1(x - 560)},${H}" fill="#fffbe8" style="${anim('beam', 10 + i * 3, o.speed, rnd(), 'ease-in-out ')}"/>`
  }
  // Far islands, faded into the haze.
  for (const [x, y, w] of [
    [W * 0.08, H * 0.2, 60],
    [W * 0.42, H * 0.12, 44],
    [W * 0.96, H * 0.42, 52],
  ] as const) {
    body += `<g transform="translate(${r1(x)} ${r1(y)})" opacity=".42"><g style="${anim('bobY', 9, o.speed, rnd(), 'ease-in-out ')};animation-direction:alternate">${floatingIsle(w, Math.round(x), rnd)}</g></g>`
  }
  // High clouds drifting.
  for (let i = 0; i < 4; i++) {
    body += `<g class="a" style="${anim('dr', 180 + rnd() * 90, o.speed, rnd())}" opacity=".9">${puffCloud(200, H * (0.18 + rnd() * 0.35), 0.45 + rnd() * 0.4, rnd, '#ffffff', '#dde8f6')}</g>`
  }
  const isles = [
    { x: W * 0.24, y: H * 0.44, w: 150, fall: 0.5 },
    { x: W * 0.6, y: H * 0.3, w: 230, fall: -0.62, house: true },
    { x: W * 0.87, y: H * 0.58, w: 110, fall: 0 },
  ]
  for (const [i, it] of isles.entries()) {
    const fx = it.fall * it.w
    // A waterfall from the rim: a pale sheet with streaks running down, and mist below.
    const fall = it.fall
      ? `<rect x="${r1(fx - 9)}" y="6" width="18" height="${r1(H * 0.6)}" fill="url(#fall)"/>` +
        `<path d="M${r1(fx - 5)} 8 v${r1(H * 0.55)} M${r1(fx + 4)} 8 v${r1(H * 0.55)}" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="20 34" stroke-linecap="round" opacity=".8" style="${anim('pour', 1.6, o.speed, 0)}"/>` +
        `<ellipse cx="${r1(fx)}" cy="${r1(H * 0.58)}" rx="60" ry="22" fill="url(#mist)"/>`
      : ''
    const house = it.house ? `<g transform="translate(${r1(it.w * 0.25)} -4)">${COTTAGE}</g>` : ''
    body +=
      `<g transform="translate(${r1(it.x)} ${r1(it.y)})"><g style="${anim('bobY', 7 + i * 1.9, o.speed, rnd(), 'ease-in-out ')};animation-direction:alternate">` +
      fall + floatingIsle(it.w, i, rnd, house) + `</g></g>`
  }
  // Birds crossing.
  for (let b = 0; b < 4; b++) {
    body += `<g class="a" style="${anim('dr', 50 + rnd() * 30, o.speed, rnd())}"><path d="M0 ${r1(H * (0.12 + rnd() * 0.3))} q7 -6 14 0 q7 -6 14 0" fill="none" stroke="#4a5a78" stroke-width="2" stroke-linecap="round"/></g>`
  }
  // A sea of cloud below everything, in two slow layers.
  for (const [y, s, speed, shade] of [
    [H * 0.92, 1.3, 260, '#d3e1f3'],
    [H * 1.0, 1.6, 200, '#c6d7ee'],
  ] as const) {
    let band = ''
    for (let x = -300; x < W + 300; x += 210) band += puffCloud(x, y + (rnd() - 0.5) * 30, s * (0.8 + rnd() * 0.4), rnd, '#ffffff', shade)
    body += `<g class="a" style="${anim('sea', speed, o.speed, rnd(), 'ease-in-out ')};animation-direction:alternate">${band}</g>`
  }
  return doc({
    w: W,
    h: H,
    sky: ['#6fb3f2', '#a9d4fa', '#dcecf9', '#fdf0dc'],
    defs:
      softGradient('sunglow', '#fff6d8', 0.9) +
      softGradient('mist', '#ffffff', 0.9) +
      `<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7457"/><stop offset=".45" stop-color="#6e4c3a"/><stop offset="1" stop-color="#3b2a33"/></linearGradient>` +
      `<linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3d6" stop-opacity=".22"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1b1030" stop-opacity=".45"/></linearGradient>` +
      `<linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9edb6e"/><stop offset="1" stop-color="#4c9444"/></linearGradient>` +
      `<linearGradient id="fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f7ff" stop-opacity=".95"/><stop offset=".7" stop-color="#e9f7ff" stop-opacity=".35"/><stop offset="1" stop-color="#e9f7ff" stop-opacity="0"/></linearGradient>`,
    css: `${DRIFT_CSS}${FLOAT_CSS}@keyframes pour{to{stroke-dashoffset:-54}}@keyframes beam{0%,100%{opacity:.06}50%{opacity:.2}}@keyframes sea{from{transform:translateX(-60px)}to{transform:translateX(60px)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

const DRAGON =
  'M0 0 Q30 -10 60 -2 Q78 2 92 -6 L104 -12 L98 0 Q80 14 58 10 Q30 14 0 6 Q-20 10 -40 22 Q-18 2 0 0 Z'
const DRAGON_WING = 'M40 -2 Q46 -70 10 -88 Q56 -64 70 -4 Z'

function castle(o: BuildOptions): string {
  const rnd = rng(223)
  const mx = W * 0.32
  const my = H * 0.3
  let body = starDots(90, 0, H * 0.6, '#f3eaff', o.speed, rnd)
  body += `<circle cx="${mx}" cy="${my}" r="330" fill="url(#mglow)"/><circle cx="${mx}" cy="${my}" r="140" fill="#f7ebc8"/><circle cx="${mx - 40}" cy="${my - 30}" r="26" fill="#e9dcb4"/><circle cx="${mx + 50}" cy="${my + 40}" r="18" fill="#e9dcb4"/>`
  // The dragon crosses in front of the moon now and then, wings beating.
  body +=
    `<g class="a" style="${anim('dr', 48, o.speed, 0.15)}"><g transform="translate(0 ${r1(my + 30)}) scale(1.6)">` +
    `<path d="${DRAGON}" fill="#120a1f"/><path d="${DRAGON_WING}" fill="#120a1f" class="f" style="${anim('flap', 1.4, o.speed, 0, 'ease-in-out ')};animation-direction:alternate;transform-origin:bottom"/></g></g>`
  // A cliff on the right with a castle on top.
  // A craggy cliff: a fractal face rising to a ledge, the far hills behind it.
  const face = fractalLine([[W * 0.5, H], [W * 0.58, H * 0.86], [W * 0.63, H * 0.74], [W * 0.69, H * 0.67], [W * 0.72, H * 0.66]], 50, 5, rnd)
  const ledge = fractalLine([[W * 0.72, H * 0.66], [W, H * 0.64]], 8, 4, rnd)
  const cliff = `${linePath([...face, ...ledge.slice(1)])}L${W} ${H}Z`
  const hills = `${linePath(fractalLine([[0, H * 0.82], [W * 0.3, H * 0.76], [W * 0.6, H * 0.84], [W, H * 0.8]], 60, 6, rnd))}L${W} ${H}L0 ${H}Z`
  const base = H * 0.66
  const towers: [number, number, number][] = [
    [0.72, 120, 34],
    [0.77, 190, 44],
    [0.83, 150, 38],
    [0.9, 230, 50],
    [0.96, 140, 36],
  ]
  // The curtain wall, with battlements along its top.
  let keep = `<rect x="${W * 0.71}" y="${base - 90}" width="${W * 0.26}" height="100" fill="#0a0816"/>`
  for (let x = W * 0.71; x < W * 0.97; x += 18) keep += `<rect x="${r1(x)}" y="${base - 102}" width="10" height="14" fill="#0a0816"/>`
  for (const [fx, h, w] of towers) {
    const x = W * fx
    keep +=
      `<rect x="${r1(x - w / 2)}" y="${r1(base - h)}" width="${w}" height="${h + 10}" fill="#0a0816"/>` +
      `<polygon points="${r1(x - w / 2 - 8)},${r1(base - h)} ${r1(x)},${r1(base - h - w * 1.5)} ${r1(x + w / 2 + 8)},${r1(base - h)}" fill="#0a0816"/>` +
      // A pennant flying from each spire.
      `<path d="M${r1(x)} ${r1(base - h - w * 1.5)}v-26l22 7l-22 7" fill="#0a0816" stroke="#0a0816" stroke-width="2"/>`
  }
  const windows = towers.map(([fx, h]) => `<rect x="${r1(W * fx - 4)}" y="${r1(base - h * 0.6)}" width="8" height="14" rx="3" fill="#ffcf6b"/>`).join('')
  body += `<path d="${hills}" fill="#1a1230"/><path d="${cliff}" fill="#0d0a1c"/><path d="${cliff}" fill="url(#rim)"/>${keep}<g style="${anim('tw', 7, o.speed, 0.4, 'ease-in-out ')}">${windows}</g>`
  return doc({
    w: W,
    h: H,
    sky: ['#0a0f25', '#251a46', '#55305c'],
    defs: softGradient('mglow', '#f7e3b0', 0.4) + `<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e7bb8" stop-opacity=".35"/><stop offset=".25" stop-color="#8e7bb8" stop-opacity="0"/></linearGradient>`,
    css: `${STARS_CSS}${DRIFT_CSS.replace(/-400px/g, '-260px')}@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(-.3)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

/**
 * A towering cumulus: many puffs, taller in the middle and flat underneath,
 * lit white on top and shading to blue-grey at the base.
 */
function cumulus(x: number, base: number, w: number, h: number, id: string, rnd: () => number): { defs: string; body: string } {
  let puffs = ''
  let lights = ''
  for (let i = 0; i < 46; i++) {
    const t = rnd() * 2 - 1
    const lift = (1 - t * t) * h * Math.sqrt(rnd())
    const r = (0.08 + rnd() * 0.1) * w * (1 - Math.abs(t) * 0.4)
    const cx = x + t * w * 0.5
    const cy = base - lift - r * 0.3
    puffs += `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}"/>`
    // A soft highlight on the sunward (upper right) side of the upper puffs.
    if (lift > h * 0.35) lights += `<circle cx="${r1(cx + r * 0.25)}" cy="${r1(cy - r * 0.3)}" r="${r1(r * 0.6)}"/>`
  }
  return {
    defs:
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${r1(base - h * 1.1)}" x2="0" y2="${r1(base)}"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f1f5fb"/><stop offset=".85" stop-color="#c9d6ea"/><stop offset="1" stop-color="#a9bcd8"/></linearGradient>` +
      `<clipPath id="${id}c"><rect x="0" y="0" width="${W}" height="${r1(base)}"/></clipPath>`,
    body: `<g clip-path="url(#${id}c)"><g fill="url(#${id})">${puffs}</g><g fill="#ffffff" opacity=".55">${lights}</g></g>`,
  }
}

function summer(o: BuildOptions): string {
  const rnd = rng(227)
  const sea = H * 0.78
  let defs = softGradient('sun', '#fffbe6', 0.85) + `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a9be4"/><stop offset=".3" stop-color="#2f7fcf"/><stop offset="1" stop-color="#1a5aa6"/></linearGradient>`
  let body = `<circle cx="${W * 0.86}" cy="${H * 0.1}" r="300" fill="url(#sun)"/><circle cx="${W * 0.86}" cy="${H * 0.1}" r="44" fill="#ffffff"/>`
  // Thin high wisps far up.
  for (let i = 0; i < 5; i++) {
    const y = H * (0.08 + rnd() * 0.2)
    body += `<g class="a" style="${anim('slow', 200, o.speed, rnd(), 'ease-in-out ')};animation-direction:alternate"><ellipse cx="${r1(rnd() * W)}" cy="${r1(y)}" rx="${r1(120 + rnd() * 160)}" ry="8" fill="#ffffff" opacity=".45"/></g>`
  }
  // A jet trail drawing itself across the sky, again and again.
  body += `<path d="M${W * 0.05} ${H * 0.3} Q${W * 0.4} ${H * 0.12} ${W * 0.78} ${H * 0.18}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-dasharray="1400" style="${anim('trail', 30, o.speed, 0)}" opacity=".85"/>`
  // Towering clouds standing on the horizon, swaying very slowly.
  body += `<g class="a" style="${anim('slow', 240, o.speed, 0.4, 'ease-in-out ')};animation-direction:alternate">`
  for (const [i, [x, w, h]] of ([
    [W * 0.16, 520, 330],
    [W * 0.52, 760, 520],
    [W * 0.86, 440, 260],
  ] as const).entries()) {
    const c = cumulus(x, sea + 4, w, h, `cu${i}`, rnd)
    defs += c.defs
    body += c.body
  }
  body += `</g>`
  body += `<rect x="0" y="${sea}" width="${W}" height="${H - sea}" fill="url(#sea)"/><rect x="0" y="${sea}" width="${W}" height="2" fill="#ffffff" opacity=".7"/>`
  // Sun glitter on the water.
  let glints = ''
  for (let i = 0; i < 40; i++) glints += `M${r1(W * 0.6 + rnd() * W * 0.4)} ${r1(sea + 8 + rnd() * (H - sea - 16))} h${r1(10 + rnd() * 40)}`
  body += `<path d="${glints}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".6" style="${anim('tw', 3, o.speed, 0, 'ease-in-out ')}"/>`
  // Two utility poles and their sagging wires in the foreground.
  const pole = (x: number) =>
    `<rect x="${x - 7}" y="${H * 0.16}" width="14" height="${H}" fill="#1e2a3a"/><rect x="${x - 72}" y="${H * 0.22}" width="144" height="9" fill="#1e2a3a"/><rect x="${x - 50}" y="${H * 0.29}" width="100" height="7" fill="#1e2a3a"/>` +
    [-60, -20, 20, 60].map(d => `<rect x="${x + d - 3}" y="${H * 0.205}" width="6" height="12" rx="2" fill="#dfe6ee"/>`).join('')
  body += pole(W * 0.07) + pole(W * 0.95)
  for (const [x0, y, sag] of [
    [-60, H * 0.21, 80],
    [-20, H * 0.21, 110],
    [20, H * 0.21, 130],
    [60, H * 0.21, 95],
    [0, H * 0.29, 150],
  ] as const) {
    body += `<path d="M${W * 0.07 + x0} ${y} Q${W * 0.51} ${y + sag * 2} ${W * 0.95 + x0} ${y}" fill="none" stroke="#1e2a3a" stroke-width="2"/>`
  }
  return doc({
    w: W,
    h: H,
    sky: ['#1559c4', '#3d8de6', '#8cc4f5', '#d6ecff'],
    defs,
    css: `${STARS_CSS}@keyframes trail{0%{stroke-dashoffset:1400;opacity:.85}60%{stroke-dashoffset:0;opacity:.85}100%{stroke-dashoffset:0;opacity:0}}
@keyframes slow{from{transform:translateX(-40px)}to{transform:translateX(40px)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

/** A small house: pitched roof with overhang, maybe a chimney, as one path. */
function housePath(x: number, ground: number, w: number, h: number, rnd: () => number): string {
  const roof = h * (0.4 + rnd() * 0.4)
  let d = `M${r1(x)} ${r1(ground)}V${r1(ground - h)}H${r1(x - 6)}L${r1(x + w / 2)} ${r1(ground - h - roof)}L${r1(x + w + 6)} ${r1(ground - h)}H${r1(x + w)}V${r1(ground)}Z`
  if (rnd() < 0.5) {
    const cx = x + w * (0.65 + rnd() * 0.15)
    d += `M${r1(cx)} ${r1(ground - h - roof * 0.3)}v${r1(-roof * 0.6)}h9v${r1(roof * 0.4)}Z`
  }
  return d
}

function starry(o: BuildOptions): string {
  const rnd = rng(229)
  let body = starDots(260, 0, H * 0.72, '#ffffff', o.speed, rnd, 6)
  body += `<ellipse cx="${W * 0.5}" cy="${H * 0.3}" rx="${W * 0.6}" ry="120" fill="url(#milky)" transform="rotate(-18 ${W * 0.5} ${H * 0.3})"/>`
  // The comet: a bright head with a long fading tail, gently glowing.
  body +=
    `<g transform="translate(${W * 0.66} ${H * 0.2}) rotate(152)" style="${anim('tw', 6, o.speed, 0, 'ease-in-out ')}">` +
    `<path d="M0 -10 Q260 -4 520 -40 Q260 10 0 10 Z" fill="url(#tail)"/><path d="M0 -6 Q300 -30 560 -110 Q300 -10 0 6 Z" fill="url(#tail)" opacity=".5"/><circle cx="0" cy="0" r="10" fill="#ffffff"/><circle cx="0" cy="0" r="40" fill="url(#head)"/></g>`
  for (const [x, y, secs, phase] of [
    [W * 0.1, H * 0.1, 9, 0.2],
    [W * 0.35, H * 0.05, 13, 0.7],
    [W * 0.75, H * 0.35, 17, 0.45],
  ] as const) {
    body += `<g transform="translate(${r1(x)} ${r1(y)}) rotate(28)"><g style="${anim('shoot', secs, o.speed, phase)}"><line x1="0" y1="0" x2="140" y2="0" stroke="url(#streak)" stroke-width="2.5" stroke-linecap="round"/></g></g>`
  }
  // Far hills, then a hillside town of houses, trees and a church, a few windows lit.
  body += `<path d="${linePath(fractalLine([[0, H * 0.74], [W * 0.4, H * 0.7], [W, H * 0.76]], 50, 6, rnd))}L${W} ${H}L0 ${H}Z" fill="#2a2458"/>`
  const groundAt = (x: number) => H * 0.82 + Math.sin(x / 300) * 22 + Math.sin(x / 90) * 4
  let town = ''
  let lit = ''
  for (let x = 20; x < W; ) {
    const ground = groundAt(x)
    if (rnd() < 0.22) {
      // A round tree.
      const r = 16 + rnd() * 14
      town += `M${r1(x - 3)} ${r1(ground)}v${r1(-r)}h6v${r1(r)}Z` + `M${r1(x - r)} ${r1(ground - r)}a${r1(r)} ${r1(r)} 0 1 1 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 1 ${r1(-2 * r)} 0Z`
      x += r * 2 + 6
      continue
    }
    const w = 34 + rnd() * 50
    const h = 26 + rnd() * 40
    town += housePath(x, ground + 4, w, h, rnd)
    for (let k = 0; k < 2; k++) if (rnd() < 0.45) lit += `<rect x="${r1(x + w * (0.2 + k * 0.42))}" y="${r1(ground + 4 - h * 0.65)}" width="8" height="10" rx="1.5" fill="#ffd27a"/>`
    x += w + 4 + rnd() * 16
  }
  // The church, with its spire.
  const cx = W * 0.62
  const cg = groundAt(cx)
  town += `M${cx - 22} ${r1(cg)}V${r1(cg - 90)}L${cx} ${r1(cg - 190)}L${cx + 22} ${r1(cg - 90)}V${r1(cg)}Z`
  lit += `<rect x="${cx - 5}" y="${r1(cg - 70)}" width="10" height="18" rx="5" fill="#ffd27a"/>`
  body += `<path d="${town}" fill="#120f2c"/><path d="M0 ${r1(H * 0.84)}${Array.from({ length: 41 }, (_, i) => `L${r1((i * W) / 40)} ${r1(groundAt((i * W) / 40) + 4)}`).join('')}L${W} ${H}L0 ${H}Z" fill="#120f2c"/>`
  body += `<g style="${anim('tw', 11, o.speed, 0.2, 'ease-in-out ')}">${lit}</g>`
  return doc({
    w: W,
    h: H,
    sky: ['#081236', '#1f2f78', '#62509c', '#e8a1b6'],
    defs:
      softGradient('milky', '#c9b8ff', 0.22) +
      softGradient('head', '#bfe9ff', 0.8) +
      `<linearGradient id="tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d8f3ff" stop-opacity=".9"/><stop offset="1" stop-color="#d8f3ff" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="streak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`,
    css: `${STARS_CSS}@keyframes shoot{0%{transform:translateX(0);opacity:0}2%{opacity:1}9%{transform:translateX(420px);opacity:0}100%{transform:translateX(420px);opacity:0}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

const CAMEL =
  'M0 0 Q6 -16 16 -14 Q22 -26 30 -14 Q38 -14 40 -4 L48 -20 L54 -20 L52 -4 L46 0 L46 18 L42 18 L41 6 L12 6 L11 18 L7 18 L7 4 Z'

function pyramids(o: BuildOptions): string {
  const rnd = rng(233)
  const horizon = H * 0.7
  let body = `<circle cx="${W * 0.3}" cy="${horizon - 40}" r="360" fill="url(#sun)"/><circle cx="${W * 0.3}" cy="${horizon - 40}" r="110" fill="#ffe2a8"/>`
  const pyramid = (x: number, w: number, h: number) =>
    `<polygon points="${r1(x - w / 2)},${r1(horizon)} ${r1(x)},${r1(horizon - h)} ${r1(x + w / 2)},${r1(horizon)}" fill="#d99a5b"/>` +
    `<polygon points="${r1(x)},${r1(horizon - h)} ${r1(x + w / 2)},${r1(horizon)} ${r1(x + w * 0.1)},${r1(horizon)}" fill="#a8683a"/>`
  body += pyramid(W * 0.55, 520, 330) + pyramid(W * 0.78, 380, 240) + pyramid(W * 0.4, 260, 160)
  body += `<path d="${ridgePath(W, horizon + 10, H, [[14, 900, 0.3], [6, 300, 1]])}" fill="#e3ad6d"/>`
  // The caravan walks along the near dune, swaying as it goes.
  let caravan = ''
  for (let i = 0; i < 4; i++) caravan += `<g transform="translate(${i * 70} 0)"><path d="${CAMEL}" fill="#4a2a1a" class="f" style="${anim('sway', 1.2, o.speed, i * 0.25, 'ease-in-out ')};animation-direction:alternate"/></g>`
  body += `<g class="a" style="${anim('walk', 140, o.speed, 0.3)}"><g transform="translate(0 ${r1(H * 0.8)}) scale(1.3)">${caravan}</g></g>`
  body += `<path d="${ridgePath(W, H * 0.86, H, [[22, 1100, 2], [8, 400, 0.4]])}" fill="#c98a4e"/>`
  body += `<path d="${ridgePath(W, H * 0.94, H, [[16, 800, 1.2]])}" fill="#a86b3a"/>`
  for (let b = 0; b < 3; b++) {
    body += `<g class="a" style="${anim('dr', 60 + rnd() * 40, o.speed, rnd())}"><path d="M0 ${r1(H * (0.15 + rnd() * 0.15))} q8 -7 16 0 q8 -7 16 0" fill="none" stroke="#5a2e2a" stroke-width="2.2" stroke-linecap="round"/></g>`
  }
  return doc({
    w: W,
    h: H,
    sky: ['#f6b97f', '#f39c6b', '#e07b67', '#f6c58e'],
    defs: softGradient('sun', '#fff0c2', 0.75),
    css: `${DRIFT_CSS}@keyframes walk{from{transform:translateX(-360px)}to{transform:translateX(${W + 40}px)}}@keyframes sway{from{transform:rotate(-2deg)}to{transform:rotate(2deg)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function lanterns(o: BuildOptions): string {
  const rnd = rng(239)
  const shore = H * 0.78
  let body = starDots(70, 0, H * 0.5, '#ffe9d0', o.speed, rnd)
  body += `<path d="${peaksPath(shore, 180, rnd)}" fill="#24183a"/>`
  // A pagoda on the left shore: stacked tiers with upturned eaves.
  let pagoda = ''
  const px = W * 0.16
  for (let t = 0; t < 5; t++) {
    const w = 200 - t * 30
    const y = shore - 40 - t * 70
    pagoda +=
      `<rect x="${r1(px - w * 0.32)}" y="${r1(y - 40)}" width="${r1(w * 0.64)}" height="44" fill="#120b20"/>` +
      `<path d="M${r1(px - w / 2 - 20)} ${r1(y - 52)} Q${r1(px)} ${r1(y - 34)} ${r1(px + w / 2 + 20)} ${r1(y - 52)} L${r1(px + w / 2)} ${r1(y - 38)} L${r1(px - w / 2)} ${r1(y - 38)} Z" fill="#120b20"/>`
  }
  pagoda += `<rect x="${px - 3}" y="${shore - 40 - 5 * 70 - 50}" width="6" height="60" fill="#120b20"/>`
  body += pagoda + `<rect x="0" y="${shore}" width="${W}" height="${H - shore}" fill="url(#water)"/>`
  // Lanterns rise from the water, sway, and glow; each loops on its own.
  for (let i = 0; i < 38; i++) {
    const x = rnd() * W
    const s = 0.5 + rnd() * 0.9
    body +=
      `<g class="a" style="${anim('rise', 40 + rnd() * 50, o.speed, rnd())}"><g transform="translate(${r1(x)} 0) scale(${r2(s)})">` +
      `<g style="${anim('sway', 5 + rnd() * 4, o.speed, rnd(), 'ease-in-out ')};animation-direction:alternate">` +
      `<circle cx="0" cy="0" r="38" fill="url(#lglow)"/><rect x="-11" y="-15" width="22" height="30" rx="8" fill="url(#paper)"/><rect x="-6" y="13" width="12" height="3" fill="#7a2c1c"/></g></g></g>`
  }
  return doc({
    w: W,
    h: H,
    sky: ['#0c0a22', '#2a1840', '#6e2c45', '#c45c4a'],
    defs:
      softGradient('lglow', '#ffb35c', 0.55) +
      `<linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#ff9a4a"/></linearGradient>` +
      `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1d3a" stop-opacity=".85"/><stop offset="1" stop-color="#0d0a1c"/></linearGradient>`,
    css: `${STARS_CSS}@keyframes rise{from{transform:translateY(${H + 60}px)}to{transform:translateY(-80px)}}@keyframes sway{from{transform:translateX(-14px)}to{transform:translateX(14px)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

// ---------- falling glyphs, shared by rain, snow and blossoms ----------

type Fall = { name: string; layers: number; count: number; glyphs: string; fills: string[]; secs: [number, number]; dx: number }

/**
 * Layers of glyphs that fall and drift sideways. Each layer is drawn twice, a
 * screen apart, so the fall loops without a seam; far layers are slower and fainter.
 */
function fall(f: Fall, speed: number, rnd: () => number): { css: string; body: string } {
  let css = ''
  let body = ''
  for (let l = 0; l < f.layers; l++) {
    const near = f.layers === 1 ? 1 : l / (f.layers - 1)
    const dx = Math.round(f.dx * (0.5 + near * 0.5))
    const span = Math.abs(dx)
    const pts = Array.from({ length: Math.round(f.count / f.layers) }, () => ({
      x: rnd() * (W + 2 * span) - span,
      y: rnd() * H,
      ch: f.glyphs[Math.floor(rnd() * f.glyphs.length)]!,
    }))
    const id = `${f.name}${l}`
    const secs = f.secs[1] - (f.secs[1] - f.secs[0]) * near
    css += `@keyframes ${id}f{from{transform:translate(0,0)}to{transform:translate(${dx}px,${H}px)}}`
    body +=
      `<g class="a" opacity="${r2(0.4 + 0.6 * near)}" style="${anim(`${id}f`, secs, speed, rnd())}">` +
      `<g id="${id}">${scatter(pts, `fill="${f.fills[l % f.fills.length]}"`)}</g>` +
      `<use href="#${id}" xlink:href="#${id}" x="${-dx}" y="${-H}"/></g>`
  }
  return { css, body }
}

function rain(o: BuildOptions): string {
  const rnd = rng(71)
  const drops = fall(
    { name: 'r', layers: 4, count: area(60), glyphs: '//|', fills: ['#4f6d96', '#6f8fbb', '#9ab8dd', '#cfe2f7'], secs: [1.2, 2.8], dx: -160 },
    o.speed,
    rnd,
  )

  // A skyline along the foot, its windows lit at random and switching slowly.
  const rows = 16
  const top = ROWS - rows
  const heights: number[] = []
  while (heights.length < COLS) {
    const w = 6 + Math.floor(rnd() * 10)
    const h = 4 + Math.floor(rnd() * 12)
    for (let k = 0; k < w; k++) heights.push(h)
  }
  const city = shape(COLS, rows, (x, y) => (rows - y <= heights[x]! ? 'b' : null))
  const windows: { x: number; y: number; ch: string }[] = []
  for (let x = 1; x < COLS; x += 2) {
    for (let y = rows - heights[x]! + 1; y < rows - 1; y += 2) {
      if (rnd() < 0.24) windows.push({ x: x * CW, y: (top + y + 1) * CH, ch: '▪' })
    }
  }
  const body = spriteSvg(city, { b: '#0a1220' }, { glyphs: '#', y: top * CH }) + twinkles(windows, '#f5c46a', 6, 11, o.speed, rnd) + drops.body

  return doc({
    w: W,
    h: H,
    sky: ['#0b1220', '#17263f', '#24395a'],
    css: `${TWINKLE_CSS}${drops.css}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function snow(o: BuildOptions): string {
  const rnd = rng(83)
  const flakes = fall(
    { name: 's', layers: 4, count: area(80), glyphs: '*.+·', fills: ['#8fa6cc', '#b7c9e8', '#dbe6f8', '#ffffff'], secs: [16, 34], dx: 90 },
    o.speed,
    rnd,
  )

  // Snowy hills along the foot, and pines standing in them.
  const rows = 14
  const top = ROWS - rows
  const hill = (x: number) => 6 + 2.5 * Math.sin(x * 0.045 + 1) + 1.5 * Math.sin(x * 0.13)
  const ground = shape(COLS, rows, (x, y) => {
    const r = rows - y
    const h = hill(x)
    return r <= h ? (r > h - 1 ? 't' : 'g') : null
  })
  let trees = ''
  for (let i = 0; i < 9; i++) {
    const h = 5 + Math.floor(rnd() * 5)
    const spr = shape(2 * h + 1, h + 2, (x, y) => (y < h ? (Math.abs(x - h) <= y ? 'n' : null) : x === h ? 'k' : null))
    const col = Math.floor(rnd() * (COLS - spr.w))
    const base = top + rows - Math.round(hill(col + h))
    trees += spriteSvg(spr, { n: '#173246', k: '#3b2a22' }, { glyphs: '^A', x: col * CW, y: (base - spr.h + 1) * CH })
  }
  const body = trees + spriteSvg(ground, { g: '#c9d6ec', t: '#ffffff' }, { glyphs: '#', glyphAt: (_x, _y, k) => (k === 't' ? '=' : '#'), y: top * CH }) + flakes.body

  return doc({
    w: W,
    h: H,
    sky: ['#0b1530', '#1b2e57', '#36507f'],
    css: flakes.css,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function aurora(o: BuildOptions): string {
  const rnd = rng(97)
  const stars = Array.from({ length: area(120) }, () => ({ x: rnd() * W, y: rnd() * H * 0.75, ch: rnd() < 0.2 ? '+' : '·' }))
  let body = twinkles(stars, '#dbe7ff', 6, 6, o.speed, rnd)

  // Curtains of light: columns of glyphs hanging from a wavy line, fading downward,
  // each band swaying and breathing on its own cycle.
  const bands = [
    { c: '#b48cff', y: 0.14, amp: 3, k: 0.04, len: 6, sway: 37 },
    { c: '#58f0a8', y: 0.22, amp: 5, k: 0.05, len: 9, sway: 23 },
    { c: '#3fd6c9', y: 0.32, amp: 4, k: 0.07, len: 7, sway: 31 },
  ]
  const fade = [0.95, 0.6, 0.35, 0.15]
  for (const b of bands) {
    const ph = rnd() * TAU
    const levels: { x: number; y: number; ch: string }[][] = [[], [], [], []]
    for (let c = -8; c < COLS + 8; c += 2) {
      const y0 = b.y * ROWS + b.amp * Math.sin(c * b.k + ph) + 1.5 * Math.sin(c * b.k * 2.7)
      const len = Math.max(2, Math.round(b.len * (0.6 + 0.4 * Math.sin(c * 0.11 + ph))))
      for (let d = 0; d < len; d++) {
        levels[Math.min(3, Math.floor((d / len) * 4))]!.push({ x: c * CW, y: (y0 + d) * CH, ch: d === 0 ? '!' : d % 2 ? '|' : ':' })
      }
    }
    const inner = levels.map((pts, l) => scatter(pts, `fill="${b.c}" fill-opacity="${fade[l]}"`)).join('')
    body +=
      `<g class="f" style="${anim('au', b.sway, o.speed, rnd(), 'ease-in-out ')};animation-direction:alternate">` +
      `<g style="${anim('gl', b.sway * 0.4, o.speed, rnd(), 'ease-in-out ')}">${inner}</g></g>`
  }

  // Dark mountains with pale ridges along the foot.
  const rows = 18
  const ridge = (x: number) => 8 + 5 * Math.sin(x * 0.035 + 0.6) + 3 * Math.sin(x * 0.11 + 2) + 1.5 * Math.sin(x * 0.29)
  const hills = shape(COLS, rows, (x, y) => {
    const r = rows - y
    const h = ridge(x)
    return r <= h ? (r > h - 1.2 ? 'c' : 'm') : null
  })
  body += spriteSvg(hills, { m: '#04101c', c: '#3a5a78' }, { glyphs: '#', glyphAt: (_x, _y, k) => (k === 'c' ? '^' : '#'), y: (ROWS - rows) * CH })

  return doc({
    w: W,
    h: H,
    sky: ['#01050e', '#061b2c', '#0a2b3a'],
    css: `${TWINKLE_CSS}
@keyframes au{from{transform:translateX(-50px) skewX(-5deg)}to{transform:translateX(50px) skewX(5deg)}}
@keyframes gl{0%,100%{opacity:.55}50%{opacity:1}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

function sakura(o: BuildOptions): string {
  const rnd = rng(109)
  const petals = fall(
    { name: 'p', layers: 3, count: area(220), glyphs: '*@o.', fills: ['#f7b6c9', '#f08aab', '#e0577f'], secs: [16, 30], dx: 300 },
    o.speed,
    rnd,
  )

  // A blossoming branch reaching in from the top-left, and a smaller one from the top-right.
  const bw = 70
  const bh = 20
  const main = (x: number) => 2 + x * 0.12 + 0.0015 * x * x
  const twigs = [
    { from: 22, to: 44, y: (x: number) => main(22) + (x - 22) * 0.45 },
    { from: 36, to: 56, y: (x: number) => main(36) - (x - 36) * 0.25 },
  ]
  const blooms = [
    ...[8, 18, 28, 40, 52, 60].map(x => [x, main(x)] as const),
    ...[30, 43].map(x => [x, twigs[0]!.y(x)] as const),
    ...[46, 55].map(x => [x, twigs[1]!.y(x)] as const),
  ]
  const branch = shape(bw, bh, (x, y) => {
    for (const [bx, by] of blooms) {
      const dx = (x - bx) / KX
      const dy = y - by
      const d = dx * dx + dy * dy
      if (d <= 0.5) return 'c'
      if (d <= 3.2) return 'f'
    }
    if (x < 62 && Math.abs(y - main(x)) < 0.7) return 'b'
    for (const t of twigs) if (x >= t.from && x <= t.to && Math.abs(y - t.y(x)) < 0.6) return 'b'
    return null
  })
  const colors = { b: '#6e4038', f: '#f392b2', c: '#fff2f6' }
  const glyphAt = (x: number, y: number, k: string) => (k === 'b' ? '=' : k === 'c' ? 'o' : '@*'[hash(x, y) % 2]!)
  const body =
    spriteSvg(branch, colors, { glyphs: '@', glyphAt }) +
    `<g opacity=".8">${spriteSvg(branch, colors, { glyphs: '@', glyphAt, flip: true, x: W - bw * CW * 0.8, y: -6 * CH })}</g>` +
    petals.body

  return doc({
    w: W,
    h: H,
    sky: ['#fff6f8', '#fde3ec', '#f9cddb'],
    css: petals.css,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
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

// The desktop app stops SMIL (animateMotion) a few seconds in, while CSS
// animation keeps running, so motion along a curve is CSS keyframes: the curve
// sampled into translate + rotate steps, heading along the way it moves.
type Route = { name: string; frames: string }
let routeCount = 0

/** Keyframes that carry a sprite once round a closed parametric curve. */
function loop(fn: (t: number) => [number, number], steps = 72): Route {
  const pts = Array.from({ length: steps + 1 }, (_, i) => fn((i / steps) * HT))
  let prev = 0
  let frames = ''
  for (let i = 0; i <= steps; i++) {
    const [x, y] = pts[i]!
    const [nx, ny] = pts[(i + 1) % steps]!
    let a = (Math.atan2(ny - y, nx - x) * 180) / Math.PI
    // Keep the heading continuous so the sprite never spins the long way round.
    if (i > 0) a = prev + ((((a - prev) % 360) + 540) % 360) - 180
    prev = a
    frames += `${r1((i / steps) * 100)}%{transform:translate(${Math.round(x)}px,${Math.round(y)}px) rotate(${Math.round(a)}deg)}`
  }
  const name = `mv${routeCount++}`
  return { name, frames: `@keyframes ${name}{${frames}}` }
}

function along(route: Route, secs: number, speed: number, inner: string, begin = 0): string {
  return `<g style="animation:${route.name} ${r2(secs / speed)}s linear ${r2(-begin / speed)}s infinite">${inner}</g>`
}

function honu(o: BuildOptions): string {
  const rnd = rng(79)
  routeCount = 0
  const routes: Route[] = []
  const route = (fn: (t: number) => [number, number]) => {
    const r = loop(fn)
    routes.push(r)
    return r
  }
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
      if (text) spans += cellRow(text, 0, (j + 1) * HCH, HCW)
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
  body += `<g class="h" opacity=".35">${along(route(P.whale), HT, o.speed, honuSprite(whaleShapes(), 1, 5))}</g>`

  const ss = (shapes: Ell[], scale: number, seed: number) => honuSprite(shapes, scale, seed)
  body += `<g class="h">`
  body += along(route(P.manta), HT, o.speed, ss(mantaShapes(), 1.2, 7))
  body += along(route(P.dolphin), HT, o.speed, ss(dolphinShapes(), 1.25, 9))
  body += along(route(P.dolphin), HT, o.speed, ss(dolphinShapes(), 1.1, 11), 0.5)
  body += along(route(P.turtleA), HT, o.speed, ss(turtleShapes(), 1.55, 13))
  body += along(route(P.turtleB), HT, o.speed, ss(turtleShapes(), 1.3, 15))
  body += along(route(P.turtleC), HT, o.speed, ss(turtleShapes(), 1.1, 17))
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
    const name = `fl${routes.length}`
    routes.push({ name, frames: `@keyframes ${name}{from{transform:translate(-220px,${y0}px) rotate(0deg)}to{transform:translate(${HW + 220}px,${y0 + 420}px) rotate(${dir * 360}deg)}}` })
    body += `<g style="animation:${name} ${r2(HT / o.speed)}s linear ${r2((-p0 * HT) / o.speed)}s infinite">${art}</g>`
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
    css: `${TWINKLE_CSS}${routes.map(r => r.frames).join("")}
.h text{font-size:17px;font-weight:600}
@keyframes band{from{transform:translateX(-${Math.round((HW + HH) * 0.6)}px)}to{transform:translateX(${Math.round((HW + HH) * 0.6)}px)}}
@keyframes hl{from{transform:translateX(0)}to{transform:translateX(-${HW}px)}}
@keyframes hr{from{transform:translateX(0)}to{transform:translateX(${HW}px)}}
@keyframes fin{from{transform:translateY(-8px)}to{transform:translateY(8px)}}`,
    body,
    veil: o.veil,
    veilColor: o.veilColor,
  })
}

type BuildOptions = SceneOptions & { veilColor: string }

const BUILDERS: Record<SceneId, (o: BuildOptions) => string> = { waves, hills, forest, lake, galaxy, planets, islands, castle, summer, starry, pyramids, lanterns, bokeh, glow, honu, clouds, koi, jelly, boats, fireflies, moon, rain, snow, aurora, sakura }

/** The scene's SVG document, at most 131072 characters. */
export function buildScene(id: SceneId, o: SceneOptions): string {
  const dark = SCENES.find(s => s.id === id)!.scheme === 'dark'
  return BUILDERS[id]({
    speed: Math.min(3, Math.max(0.25, o.speed)),
    veil: Math.min(0.8, Math.max(0, o.veil)),
    // The veil fades toward the page of the scene's own mode, which the scene sets.
    veilColor: dark ? '#0c0c10' : '#fafafc',
  })
}

// ---------- still grounds ----------
// A gradient the app paints itself: no scene, no hook, nothing moving.

export const GROUND_IDS = ['dawn', 'dusk', 'mist', 'ink'] as const
export type GroundId = (typeof GROUND_IDS)[number]
type Hex = `#${string}`
export type GroundInfo = {
  id: GroundId
  name: string
  scheme: 'light' | 'dark'
  stops: Hex[]
  /** Degrees as in CSS, 180 runs down; ignored for a radial ground. */
  angle?: number
  shape?: 'radial'
}

export const GROUNDS: GroundInfo[] = [
  { id: 'dawn', name: 'Dawn glow', scheme: 'light', stops: ['#fde8d7', '#f7cfd0', '#dccdf0'], angle: 180 },
  { id: 'mist', name: 'Morning mist', scheme: 'light', stops: ['#ffffff', '#e3eaf2'], shape: 'radial' },
  { id: 'dusk', name: 'Dusk', scheme: 'dark', stops: ['#141233', '#33204d', '#6a3557'], angle: 180 },
  { id: 'ink', name: 'Deep ink', scheme: 'dark', stops: ['#1b2133', '#0b0d14'], shape: 'radial' },
]

export function isGroundId(value: unknown): value is GroundId {
  return typeof value === 'string' && (GROUND_IDS as readonly string[]).includes(value)
}

// ---------- previews for the picker ----------
// A small still card per wallpaper: its sky and a few of its glyphs. A few
// hundred characters each, so the picker can show them all at every redraw.

type ThumbLine = [x: number, y: number, fill: string, text: string, size?: number]
type Thumb = { sky: string[]; lines: ThumbLine[] }

const THUMBS: Record<SceneId, Thumb> = {
  // Illustrated scenes preview as themselves (see wallpaperThumb); these are unused.
  forest: { sky: [], lines: [] },
  lake: { sky: [], lines: [] },
  galaxy: { sky: [], lines: [] },
  planets: { sky: [], lines: [] },
  islands: { sky: [], lines: [] },
  castle: { sky: [], lines: [] },
  summer: { sky: [], lines: [] },
  starry: { sky: [], lines: [] },
  pyramids: { sky: [], lines: [] },
  lanterns: { sky: [], lines: [] },
  waves: { sky: ['#fde3c8', '#a9cbe8'], lines: [] },
  hills: { sky: ['#24163f', '#f7a76a'], lines: [] },
  bokeh: { sky: ['#0d0a1f', '#0a1626'], lines: [] },
  glow: { sky: ['#fbf7ff', '#f3f1fb'], lines: [] },
  honu: { sky: ['#b2f4e8', '#4ad6d6', '#1aa8ca', '#0e80b6'], lines: [[12, 24, '#f2fffd', '~  ~~   ~   ~~'], [58, 56, '#2f6b4a', '<(##)>', 14], [16, 84, '#ffd166', '><>    ><>']] },
  clouds: { sky: ['#4aa8ec', '#bfe4fd'], lines: [[10, 30, '#ffffff', '.-~~-.', 13], [82, 52, '#ffffff', '.-~~~-.', 13], [28, 82, '#eaf6ff', '.-~-.']] },
  koi: { sky: ['#1f7a63', '#0d4a44', '#082f2d'], lines: [[14, 32, '#ff7a2b', '><(((°>', 13], [80, 60, '#fff1e2', '<°)))><', 13], [40, 86, '#3f9b5a', '( O )']] },
  jelly: { sky: ['#24308a', '#0b1240', '#05081f'], lines: [[24, 34, '#ff9de2', '.-^-.', 13], [26, 48, '#ff9de2', '):(:'], [96, 58, '#7fe7ff', '.-^-.', 13], [98, 72, '#7fe7ff', ':):(']] },
  boats: { sky: ['#c4f4ef', '#72d4d6', '#1e8fa6'], lines: [[88, 24, '#ffffff', '.-~-.'], [36, 58, '#ffffff', ' |\\', 13], [36, 72, '#ffffff', '\\__/', 13], [100, 76, '#ff8b7b', '\\_/'], [0, 90, '#f2fffd', '~-~~-~~-~~-~~-~~-~~-~~-~~-~']] },
  fireflies: { sky: ['#06120f', '#0b2a22', '#0f3a2c'], lines: [[24, 32, '#f3ffb0', '•     •'], [70, 56, '#f3ffb0', '•   •'], [0, 92, '#1d7a4c', '|/|\\||/|\\|/|||\\|/|\\|/||/|\\|/|']] },
  moon: { sky: ['#070c33', '#111d63', '#22348f'], lines: [[106, 44, '#fff3c9', '(', 34], [14, 28, '#dfe6ff', '·  +   ·'], [8, 78, '#7d8ce6', '.-~~-.', 13]] },
  rain: { sky: ['#0b1220', '#17263f', '#24395a'], lines: [[8, 26, '#9ab8dd', '/   /   /  /'], [26, 50, '#cfe2f7', ' /   /   /'], [0, 92, '#f5c46a', ' ▪ ▪   ▪  ▪ ▪   ▪ ▪  ▪']] },
  snow: { sky: ['#0b1530', '#1b2e57', '#36507f'], lines: [[10, 26, '#ffffff', '*  .  *   .  *'], [20, 50, '#dbe6f8', ' .   *   .  *'], [30, 80, '#5d7f98', '^       ^', 15], [0, 94, '#ffffff', '========================']] },
  aurora: { sky: ['#01050e', '#061b2c', '#0a2b3a'], lines: [[0, 30, '#b48cff', ':|:|:|:|:|:|:|:|:|:|:|:|'], [0, 46, '#58f0a8', '!|:!|:!|:!|:!|:!|:!|:!|:!|'], [0, 92, '#3a5a78', '/\\/\\  /\\/\\/\\  /\\/\\  /\\']] },
  sakura: { sky: ['#fff6f8', '#fde3ec', '#f9cddb'], lines: [[2, 26, '#6e4038', '=========='], [8, 18, '#f392b2', '@*@  *@'], [56, 50, '#f08aab', '*   @   *'], [24, 80, '#e0577f', '.   *   o']] },
}

const TW = 160
const TH = 96

const artThumbs = new Map<SceneId, string>()

/** A small preview of a wallpaper, for the picker. */
export function wallpaperThumb(id: SceneId | GroundId): string {
  // An illustrated scene is only a few kilobytes, so it previews as itself.
  if (!isGroundId(id) && (SCENES.find(s => s.id === id)?.kind ?? 'ascii') !== 'ascii') {
    let art = artThumbs.get(id)
    if (art === undefined) {
      art = buildScene(id, { speed: 1, veil: 0 })
      artThumbs.set(id, art)
    }
    return art
  }
  let defs: string
  let body = ''
  if (isGroundId(id)) {
    const g = GROUNDS.find(x => x.id === id)!
    const stops = g.stops.map((c, i) => `<stop offset="${r2(i / Math.max(1, g.stops.length - 1))}" stop-color="${c}"/>`).join('')
    defs = g.shape === 'radial' ? `<radialGradient id="g">${stops}</radialGradient>` : `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`
  } else {
    const t = THUMBS[id]
    const stops = t.sky.map((c, i) => `<stop offset="${r2(i / Math.max(1, t.sky.length - 1))}" stop-color="${c}"/>`).join('')
    defs = `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`
    body = t.lines.map(([x, y, fill, text, size]) => `<text x="${x}" y="${y}" fill="${fill}"${size ? ` font-size="${size}"` : ''}>${esc(text)}</text>`).join('')
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TH}" width="${TW}" height="${TH}" xml:space="preserve">` +
    `<style>text{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:11px;white-space:pre}</style>` +
    `<defs>${defs}</defs><rect width="${TW}" height="${TH}" rx="8" fill="url(#g)"/>${body}</svg>`
  )
}
