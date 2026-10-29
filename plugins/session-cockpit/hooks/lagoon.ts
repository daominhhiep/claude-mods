// A Hawaiian lagoon seen from above, drawn as terminal cells: water, caustic
// light, turtles, a manta, dolphins, a school of yellow tangs and drifting
// flowers. Every cell takes the color of what lies under its centre and a
// glyph by its brightness. Everything is a pure function of time, and every
// motion loops in T seconds, so the scene never jumps.

export const LAGOON_T = 24.5
const TAU = Math.PI * 2
const w = TAU / LAGOON_T
// A cell stands for 16 by 22 pixels of the scene, as the scene was drawn.
const CW = 16
const CH = 22
// The scene's own size; paths and creatures are laid out in it, then fitted.
const SW = 1944
const SH = 1760

type RGB = [number, number, number]
// One filled ellipse of a creature, in its own pixels, facing +x.
type Shape = { x: number; y: number; rx: number; ry: number; rot: number; c: RGB }

const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
const mixC = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const lum = (c: RGB) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255
const pack = (c: RGB) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255)
const hash = (a: number, b: number, c: number) => {
  const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return h - Math.floor(h)
}

const STOPS: [number, RGB][] = [
  [0, [178, 244, 232]],
  [0.42, [74, 214, 214]],
  [0.78, [26, 168, 202]],
  [1, [14, 128, 182]],
]
function water(x: number, y: number, W: number, H: number): RGB {
  const k = Math.min(1, Math.max(0, (x * 0.45 + y * 0.9) / (W * 0.45 + H * 0.9)))
  for (let i = 1; i < STOPS.length; i++) {
    const [k1, c1] = STOPS[i]!
    const [k0, c0] = STOPS[i - 1]!
    if (k <= k1) return mixC(c0, c1, (k - k0) / (k1 - k0))
  }
  return STOPS[STOPS.length - 1]![1]
}

const E = (x: number, y: number, rx: number, ry: number, rot: number, c: string): Shape => ({ x, y, rx, ry, rot, c: hex(c) })

// Each creature: its ellipses back to front at time t.
function turtle(t: number, ph: number): Shape[] {
  const f = Math.sin((TAU * 14 * t) / LAGOON_T + ph)
  const out: Shape[] = []
  for (const m of [-1, 1]) {
    const a = m * (1.15 + 0.55 * f)
    // Front flipper: a long ellipse swung from the shoulder.
    out.push(E(62 - Math.sin(a) * 78 * m, 58 * m + Math.cos(a) * 78 * m, 26, 92, a, '#9c8a5c'))
    const b = m * (2.2 - 0.3 * f)
    out.push(E(-92 - Math.sin(b) * 26 * m, 40 * m + Math.cos(b) * 26 * m, 15, 34, b, '#9c8a5c'))
  }
  out.push(E(118, 0, 30, 24, 0, '#a39060'), E(150, 0, 34, 27, 0, '#b8a573'))
  out.push(E(146, -10, 7, 5, 0, '#4b3f22'), E(146, 10, 7, 5, 0, '#4b3f22'))
  out.push(E(0, 0, 132, 100, 0, '#c9b067'), E(0, 0, 120, 90, 0, '#5e5022'))
  for (const [x, y, r] of [[60, 0, 26], [12, 0, 30], [-38, 0, 28], [-80, 0, 20], [40, -50, 22], [-8, -56, 24], [-56, -46, 20], [40, 50, 22], [-8, 56, 24], [-56, 46, 20]] as const) {
    out.push(E(x, y, r, r * 0.8, 0, '#b39a4a'))
  }
  return out
}

function manta(t: number): Shape[] {
  const f = Math.sin((TAU * 10 * t) / LAGOON_T)
  const span = 300 + 22 * f
  const out: Shape[] = [E(-220, 0, 120, 4, 0, '#1c2733')]
  // The wings: a wide ellipse each side, flapping in span.
  for (const m of [-1, 1]) out.push(E(-20, (span / 2) * m, 90, span / 2, -0.25 * m, '#1e2b3a'))
  out.push(E(0, 0, 118, 60, 0, '#1e2b3a'))
  for (const m of [-1, 1]) {
    out.push(E(120, 40 * m, 34, 12, 0.35 * m, '#26364a'))
    out.push(E(18, 82 * m, 70, 30, -0.5 * m, '#e9eef0'))
    out.push(E(-10, 150 * m, 40, 18, -0.6 * m, '#8fa3b0'))
  }
  return out
}

function dolphin(t: number, ph: number): Shape[] {
  const b = 0.22 * Math.sin((TAU * 60 * t) / LAGOON_T + ph)
  return [
    E(-190, Math.sin(b) * 60, 70, 22, b, '#5c6d7c'),
    E(-250, Math.sin(b) * 110, 22, 60, b * 1.4, '#4b5a68'),
    E(40, -48, 44, 13, 0.75, '#6f8190'),
    E(40, 48, 44, 13, -0.75, '#6f8190'),
    E(60, 0, 140, 44, 0, '#8a9cab'),
    E(185, 0, 22, 6, 0, '#8a9cab'),
    E(20, 0, 120, 22, 0, '#43515e'),
  ]
}

function tang(t: number, ph: number): Shape[] {
  const b = 0.35 * Math.sin((TAU * 110 * t) / LAGOON_T + ph)
  return [E(-52, Math.sin(b) * 20, 16, 20, b, '#f2c200'), E(8, 0, 46, 15, 0, '#ffd61f'), E(40, 0, 12, 9, 0, '#ffe46a')]
}

function whale(t: number): Shape[] {
  const b = 0.16 * Math.sin((TAU * 8 * t) / LAGOON_T)
  const fl = 0.15 * Math.sin((TAU * 8 * t) / LAGOON_T + 1)
  return [
    E(-400, Math.sin(b) * 140, 150, 50, b, '#2b3d52'),
    E(-560, Math.sin(b) * 240, 40, 120, b * 1.5, '#dfe7ea'),
    E(150 - Math.sin(0.6 + fl) * 120, 95 + Math.cos(0.6 + fl) * 120, 30, 125, 0.6 + fl, '#e6eef0'),
    E(150 - Math.sin(-0.6 - fl) * 120, -95 - Math.cos(-0.6 - fl) * 120, 30, 125, -0.6 - fl, '#e6eef0'),
    E(40, 0, 300, 125, 0, '#33475e'),
    E(210, 0, 100, 10, 0, '#596f86'),
  ]
}

function hibiscus(s: number): Shape[] {
  const out: Shape[] = []
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5
    out.push(E(52 * s * Math.cos(a), 52 * s * Math.sin(a), 52 * s, 40 * s, a, '#ef3b5a'))
    out.push(E(40 * s * Math.cos(a), 40 * s * Math.sin(a), 30 * s, 22 * s, a, '#d42448'))
  }
  out.push(E(0, 0, 22 * s, 22 * s, 0, '#8a0f2e'), E(44 * s * Math.cos(0.6), 44 * s * Math.sin(0.6), 40 * s, 5 * s, 0.6, '#ffd84a'))
  return out
}

function plumeria(s: number): Shape[] {
  const out: Shape[] = []
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5
    const x = 36 * s
    const y = 12 * s
    out.push(E(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), 40 * s, 24 * s, a + 0.35, '#fffaf0'))
  }
  out.push(E(0, 0, 18 * s, 18 * s, 0, '#ffb800'))
  return out
}

// Closed paths in the scene's pixels, each a whole number of loops in T.
const PATHS = {
  turtleA: (t: number) => [972 + 1080 * Math.cos(w * t + 0.3), 860 + 640 * Math.sin(w * t + 0.3) + 140 * Math.sin(2 * w * t)],
  turtleB: (t: number) => [900 + 700 * Math.sin(-w * t + 1), 880 - 1080 * Math.cos(-w * t + 1)],
  turtleC: (t: number) => [972 + 1150 * Math.sin(w * t + 4), 900 + 560 * Math.sin(2 * w * t + 4.6)],
  manta: (t: number) => [972 + 1380 * Math.cos(-w * t + 3.6), 820 + 900 * Math.sin(-w * t + 3.6)],
  dolphin: (t: number) => [972 + 1350 * Math.cos(2 * w * t + 0.8), 900 + 950 * Math.sin(2 * w * t + 0.8) + 160 * Math.sin(4 * w * t)],
  school: (t: number) => [972 + 1150 * Math.sin(2 * w * t + 5), 880 + 800 * Math.sin(3 * w * t + 1)],
  whale: (t: number) => [972 + 1900 * Math.cos(w * t + 2.4), 1350 + 380 * Math.sin(w * t + 2.4)],
}
const FISH = [[0, 0], [-120, -70], [-120, 75], [-240, -10], [-230, -140], [-235, 130], [-360, -75], [-355, 70], [-470, 5], [-480, -150], [-470, 150]] as const
const FLOWERS = [['h', 0.0, 260, 1.0, 1], ['p', 0.22, 1240, 0.9, -1], ['h', 0.47, 640, 0.8, -1], ['p', 0.63, 1560, 1.1, 1], ['p', 0.86, 120, 0.8, 1]] as const

type Body = { x: number; y: number; a: number; s: number; shapes: Shape[]; reach: number; depth: number }

function pose(fn: (t: number) => number[], t: number): [number, number, number] {
  const [x, y] = fn(t) as [number, number]
  const [x2, y2] = fn(t + 0.02) as [number, number]
  return [x, y, Math.atan2(y2 - y, x2 - x)]
}

function bodies(t: number): Body[] {
  const out: Body[] = []
  const add = (x: number, y: number, a: number, s: number, shapes: Shape[], depth = 0) => {
    let reach = 0
    for (const p of shapes) reach = Math.max(reach, Math.hypot(p.x, p.y) + Math.max(p.rx, p.ry))
    out.push({ x, y, a, s, shapes, reach: reach * s, depth })
  }
  {
    const [x, y, a] = pose(PATHS.whale, t)
    add(x, y, a, 1, whale(t), 0.4)
  }
  {
    const [x, y, a] = pose(PATHS.manta, t)
    add(x, y, a, 1.2, manta(t))
  }
  for (const [dx, ph] of [[0, 0], [1, 1.3]] as const) {
    const [x, y, a] = pose(PATHS.dolphin, t - dx * 0.18)
    add(x + dx * 120 * Math.sin(a), y - dx * 120 * Math.cos(a), a, 1.25, dolphin(t, ph))
  }
  for (const [fn, s, ph] of [[PATHS.turtleA, 1.55, 0], [PATHS.turtleB, 1.3, 2], [PATHS.turtleC, 1.1, 4]] as const) {
    const [x, y, a] = pose(fn, t)
    add(x, y, a, s, turtle(t, ph))
  }
  {
    const [x, y, a] = pose(PATHS.school, t)
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    FISH.forEach(([fx, fy], k) => {
      const wob = 14 * Math.sin(w * 7 * t + k)
      add(x + fx * ca - (fy + wob) * sa, y + fx * sa + (fy + wob) * ca, a + 0.15 * Math.sin(w * 9 * t + k), 1.35, tang(t, k))
    })
  }
  for (const [kind, p0, y0, s, dir] of FLOWERS) {
    const u = (p0 + t / LAGOON_T) % 1
    const fx = -220 + u * (SW + 440)
    const fy = y0 + u * 420 + 30 * Math.sin(w * 3 * t + p0 * 9)
    add(fx, fy, dir * w * t + p0 * 6, 1, kind === 'h' ? hibiscus(s) : plumeria(s))
  }
  return out
}

/** The color of the topmost shape under a scene point, or null over water. */
function under(list: Body[], px: number, py: number): { c: RGB; depth: number } | null {
  let hit: { c: RGB; depth: number } | null = null
  for (const b of list) {
    const dx = px - b.x
    const dy = py - b.y
    if (dx * dx + dy * dy > b.reach * b.reach) continue
    const ca = Math.cos(-b.a)
    const sa = Math.sin(-b.a)
    const lx = (dx * ca - dy * sa) / b.s
    const ly = (dx * sa + dy * ca) / b.s
    for (const p of b.shapes) {
      const qx = lx - p.x
      const qy = ly - p.y
      const cr = Math.cos(-p.rot)
      const sr = Math.sin(-p.rot)
      const ex = (qx * cr - qy * sr) / p.rx
      const ey = (qx * sr + qy * cr) / p.ry
      if (ex * ex + ey * ey <= 1) hit = { c: p.c, depth: b.depth }
    }
  }
  return hit
}

const RAMP = '8%XSSt%t;:'

export type LagoonLook = {
  /** The pane's own background, which the scene is mixed toward so text on it reads. */
  base: RGB
  /** How far toward the base: 0 the scene as painted, 1 the base alone. */
  dim: number
}

export const LAGOON_DARK: LagoonLook = { base: [24, 26, 30], dim: 0.62 }
export const LAGOON_LIGHT: LagoonLook = { base: [246, 246, 244], dim: 0.6 }

/**
 * One frame of the lagoon for a grid `columns` by `rows` at `ms`: the words a
 * Raster takes, `[codePoint, foreground, background]` per cell, row-major.
 */
export function lagoonFrame(columns: number, rows: number, ms: number, look: LagoonLook): Uint32Array {
  const t = (((ms / 1000) % LAGOON_T) + LAGOON_T) % LAGOON_T
  const W = columns * CW
  const H = rows * CH
  // Fit the scene's paths and creatures to the grid, keeping their shape.
  const sx = W / SW
  const sy = H / SH
  const fit = Math.min(sx, sy)
  const list = bodies(t).map(b => ({ ...b, x: b.x * sx, y: b.y * sy, s: b.s * fit, reach: b.reach * fit }))
  const out = new Uint32Array(columns * rows * 3)
  const toBase = (c: RGB) => mixC(c, look.base, look.dim)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const x = i * CW + CW / 2
      const y = j * CH + CH / 2
      const sea = water(x, y, W, H)
      const o = (j * columns + i) * 3
      const hit = under(list, x, y)
      if (hit !== null) {
        const c = hit.depth > 0 ? mixC(hit.c, sea, hit.depth) : hit.c
        const flick = hash(i, j, Math.floor(t * 7))
        const l = lum(c)
        const ch = RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(1 + l * 5 + flick * 4)))]!
        const ink = l < 0.42 ? mixC(c, [255, 255, 255], 0.5) : mixC(c, [0, 0, 0], 0.5)
        out[o] = ch.codePointAt(0)!
        out[o + 1] = pack(toBase(ink))
        out[o + 2] = pack(toBase(c))
        continue
      }
      // Caustic light over open water.
      const v =
        Math.sin(x * 0.011 + y * 0.004 + w * 2 * t + 1.6 * Math.sin(y * 0.007 - w * 3 * t)) +
        Math.sin(-x * 0.006 + y * 0.012 - w * 3 * t + 1.6 * Math.sin(x * 0.008 + w * 2 * t)) +
        Math.sin(x * 0.009 - y * 0.009 + w * 4 * t + 1.2 * Math.sin((x + y) * 0.005 + w * t))
      let ch = 32
      let ink = sea
      if (v > 1.55) {
        const k = Math.min(1, (v - 1.55) / 1.2)
        ch = (k > 0.6 ? '~' : k > 0.3 ? '-' : '·').codePointAt(0)!
        ink = mixC(sea, [255, 255, 255], 0.35 + 0.5 * k)
      }
      out[o] = ch
      out[o + 1] = pack(toBase(ink))
      out[o + 2] = pack(toBase(sea))
    }
  }
  return out
}

/** Raster cells as the element and `$.ui.blit` take them: padded base64. */
export function encodeCells(words: Uint32Array): string {
  const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength)
  const withB64 = bytes as Uint8Array & { toBase64?: () => string }
  if (typeof withB64.toBase64 === 'function') return withB64.toBase64()
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    s += A[(n >> 18) & 63]! + A[(n >> 12) & 63]!
    s += i + 1 < bytes.length ? A[(n >> 6) & 63]! : '='
    s += i + 2 < bytes.length ? A[n & 63]! : '='
  }
  return s
}
