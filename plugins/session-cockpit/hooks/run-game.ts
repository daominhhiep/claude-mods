// Pet Run: the pet runs along the ground and jumps the rocks and cacti that
// come at it, as the dinosaur does in Chrome when the network is down. Plain
// steps and drawing, no engine: the Client module in pet-run.tsx drives it.

export type RunCell = { ch: string; color: string }
export type RunColors = { ground: string; cactus: string; rock: string; text: string; dim: string; accent: string }
export type RunObstacle = { x: number; kind: number }
export type RunState = {
  phase: 'ready' | 'run' | 'over'
  /** Height of the pet's feet above the ground, in rows, and its speed upward. */
  y: number
  vy: number
  /** Columns run so far, and how fast the ground moves, columns a second. */
  dist: number
  speed: number
  obstacles: RunObstacle[]
  /** Columns until the next obstacle comes in. */
  toNext: number
  seed: number
  /** Steps since the run ended, so a key held through the crash does not start the next. */
  sinceOver: number
  /** The best score when this run started: what a new best must beat. */
  bestBefore: number
}

export const RUN_TICK_MS = 50
/** The score line, nine rows of sky, the ground. */
export const RUN_ROWS = 11
const SKY = 9
const PET_X = 3
const START_SPEED = 14
const TOP_SPEED = 32
// A floaty jump: it clears two rows for about a second and peaks under five and a half.
const JUMP = 17.5
const GRAVITY = 28

/** What comes along the ground: its rows top to bottom, and the score it first shows at. */
export const RUN_SHAPES: { rows: string[]; color: 'rock' | 'cactus'; from: number }[] = [
  { rows: ['▟▙'], color: 'rock', from: 0 },
  { rows: ['▙█▟', ' █ '], color: 'cactus', from: 0 },
  { rows: ['▟▙▟▙'], color: 'rock', from: 150 },
  { rows: ['▙█▟▙█▟', ' █  █ '], color: 'cactus', from: 400 },
]

export const runScore = (s: RunState) => Math.floor(s.dist * 0.7)

/** A random number in [0, 1) and the next seed (mulberry32). */
function rand(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

export function newRun(seed: number, best = 0): RunState {
  return { phase: 'ready', y: 0, vy: 0, dist: 0, speed: START_SPEED, obstacles: [], toNext: 24, seed, sinceOver: 0, bestBefore: best }
}

/** Space, ↑ or a click: starts a run, or jumps while on the ground. */
export function runJump(s: RunState, best = 0): RunState {
  if (s.phase === 'over' && s.sinceOver < 8) return s
  if (s.phase !== 'run') return { ...newRun(s.seed, best), phase: 'run', vy: JUMP }
  return s.y === 0 ? { ...s, vy: JUMP } : s
}

/** The pet's footprint: the columns and rows of its body that touch. */
export type RunHitbox = { left: number; width: number; height: number }

/** The run one step (RUN_TICK_MS) later, `width` columns wide. */
export function runStep(s: RunState, width: number, hit: RunHitbox): RunState {
  if (s.phase === 'over') return { ...s, sinceOver: s.sinceOver + 1 }
  if (s.phase !== 'run') return s
  const dt = RUN_TICK_MS / 1000
  const move = s.speed * dt
  let y = s.y + s.vy * dt - (GRAVITY * dt * dt) / 2
  let vy = s.vy - GRAVITY * dt
  if (y <= 0) {
    y = 0
    vy = 0
  }
  const dist = s.dist + move
  const score = Math.floor(dist * 0.7)
  const obstacles = s.obstacles.map(o => ({ ...o, x: o.x - move })).filter(o => o.x > -8)
  let toNext = s.toNext - move
  let seed = s.seed
  if (toNext <= 0) {
    const kinds = RUN_SHAPES.map((k, i) => ({ k, i })).filter(({ k }) => score >= k.from)
    let r: number
    ;[r, seed] = rand(seed)
    obstacles.push({ x: width, kind: kinds[Math.floor(r * kinds.length)]!.i })
    ;[r, seed] = rand(seed)
    toNext = s.speed * 0.9 + 14 + r * 26
  }
  const speed = Math.min(TOP_SPEED, START_SPEED + score / 100)
  const feet = Math.round(y)
  const isHit = obstacles.some(o => {
    const shape = RUN_SHAPES[o.kind]!
    const x = Math.round(o.x)
    const w = Math.max(...shape.rows.map(r => r.length))
    const overlaps = x <= PET_X + hit.left + hit.width - 1 && x + w - 1 >= PET_X + hit.left
    return overlaps && feet < shape.rows.length && feet + hit.height > 0
  })
  return { ...s, y, vy, dist, speed, obstacles, toNext, seed, phase: isHit ? 'over' : 'run', sinceOver: 0 }
}

/** The pet's touching body in a frame of its sprite: columns with ink, less a ragged edge either side. */
export function runHitbox(frame: RunCell[][]): RunHitbox {
  const cols = frame.flatMap(row => row.map((c, i) => (c.ch.trim() === '' ? -1 : i))).filter(i => i >= 0)
  const lo = Math.min(...cols)
  const hi = Math.max(...cols)
  const height = frame.length - frame.findIndex(row => row.some(c => c.ch.trim() !== ''))
  return { left: lo + 1, width: Math.max(1, hi - lo - 1), height }
}

/** The whole picture, RUN_ROWS rows of `width` cells. */
export function runDraw(
  s: RunState,
  frames: RunCell[][][],
  width: number,
  colors: RunColors,
  best: number,
  name: string,
): RunCell[][] {
  const blank = (): RunCell => ({ ch: ' ', color: '' })
  const grid = Array.from({ length: RUN_ROWS }, () => Array.from({ length: width }, blank))
  const write = (row: number, col: number, text: string, color: string) => {
    ;[...text].forEach((ch, i) => {
      const c = col + i
      if (row >= 0 && row < RUN_ROWS && c >= 0 && c < width && ch !== ' ') grid[row]![c] = { ch, color }
    })
  }
  const score = runScore(s)
  const pad = (n: number) => String(n).padStart(5, '0')
  write(0, 1, `${name} · Pet Run`, colors.dim)
  const right = `best ${pad(Math.max(best, s.phase === 'over' ? score : 0))}  ${pad(score)}`
  write(0, width - right.length - 1, right, colors.text)
  // The ground slides past: a mark every few columns shows the speed.
  for (let c = 0; c < width; c++) {
    grid[SKY + 1]![c] = { ch: (c + Math.floor(s.dist)) % 9 === 0 ? '┴' : '─', color: colors.ground }
  }
  for (const o of s.obstacles) {
    const shape = RUN_SHAPES[o.kind]!
    shape.rows.forEach((r, i) => write(SKY - shape.rows.length + 1 + i, Math.round(o.x), r, colors[shape.color]))
  }
  const frame = s.y > 0 || s.phase !== 'run' ? frames[0]! : frames[Math.floor(s.dist / 2) % frames.length]!
  const top = SKY - Math.round(s.y) - frame.length + 1
  frame.forEach((row, r) =>
    row.forEach((c, i) => {
      if (c.ch.trim() !== '') write(top + r, PET_X + i, c.ch, c.color)
    }),
  )
  const say = (text: string, row: number, color: string) => write(row, Math.max(0, Math.floor((width - text.length) / 2)), text, color)
  if (s.phase === 'ready') {
    say('Click here, then press Space or ↑ to jump', 3, colors.text)
    say('Jump the rocks and cacti. Esc to stop playing.', 4, colors.dim)
  } else if (s.phase === 'over') {
    const isBest = score > s.bestBefore
    say(isBest ? `New best! ${score} points` : `Ouch! ${score} points`, 3, isBest ? colors.accent : colors.text)
    say('Space or click to run again', 4, colors.dim)
  }
  return grid
}

/** A row of cells as runs of one color each; a blank joins the run before it, its color unseen. */
export function runRuns(row: RunCell[]): RunCell[] {
  const out: RunCell[] = []
  for (const c of row) {
    const last = out[out.length - 1]
    if (last !== undefined && (last.color === c.color || c.ch === ' ')) last.ch += c.ch
    else if (last !== undefined && last.ch.trim() === '') {
      last.ch += c.ch
      last.color = c.color
    } else out.push({ ...c })
  }
  return out
}
