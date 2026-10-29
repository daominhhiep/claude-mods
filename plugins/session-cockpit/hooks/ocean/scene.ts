// The ocean below the pane: ascii-sharks' world and renderer, stepped on a
// fixed clock and read back as rows of colored runs a Client can draw.
import { clamp } from './math'
import { AsciiRenderer, CELL_H, CELL_W, CellCtx } from './renderer'
import { World, type SharkSpec } from './world'

const STEP = 1 / 60
const MAX_STEPS = 6

/** A run of cells drawn alike: its text, ink and background as #rrggbb, '' for the terminal's own. */
export type OceanRun = { text: string; color: string; back: string }

const SHARKS: SharkSpec[] = [
  { kind: 'classic', size: 1 },
  { kind: 'hammerhead', size: 0.82 },
]

// Colors snapped to steps of 8, so neighbouring cells share runs and the tree stays small.
const hex = (v: number) => (v < 0 ? '' : `#${((v & 0xf8f8f8) | 0x1000000).toString(16).slice(1)}`)

export class OceanScene {
  private world: World
  private ctx = new CellCtx()
  private renderer: AsciiRenderer
  private acc = 0
  cols = 0
  rows = 0

  constructor(cols: number, rows: number) {
    this.world = new World(SHARKS, clamp(Math.round((cols * rows) / 14), 18, 120))
    this.renderer = new AsciiRenderer(this.ctx)
    this.resize(cols, rows)
  }

  resize(cols: number, rows: number) {
    if (cols === this.cols && rows === this.rows) return
    this.cols = cols
    this.rows = rows
    const w = cols * CELL_W
    const h = rows * CELL_H
    this.renderer.resize(w, h, 1)
    this.world.resize(w, h, CELL_W, CELL_H)
    // Let the schools find their shape before the first frame.
    if (this.world.time < 2) for (let k = 0; k < 120; k++) this.world.step(STEP)
  }

  /** Moves the world on by `dt` seconds, then draws it into the cells. */
  advance(dt: number) {
    this.acc += Math.min(0.2, dt)
    let steps = 0
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.world.step(STEP)
      this.acc -= STEP
      steps++
    }
    if (steps === MAX_STEPS) this.acc = 0
    this.ctx.time = this.world.time
    this.renderer.render(this.world, dt)
  }

  /** A splash where the pointer went down, in cells: the fish scatter. */
  splash(col: number, row: number) {
    this.world.splash((col + 0.5) * CELL_W, (row + 0.5) * CELL_H)
  }

  /** The pointer over the water, in cells, or null when it left: fish shy away from it. */
  point(at: { col: number; row: number } | null) {
    const p = this.world.pointer
    p.active = at !== null
    if (at !== null) {
      p.x = (at.col + 0.5) * CELL_W
      p.y = (at.row + 0.5) * CELL_H
    }
  }

  /** The cells as rows of runs. */
  lines(): OceanRun[][] {
    const { cols, rows } = this
    const { chars, ink, back } = this.ctx
    const out: OceanRun[][] = []
    for (let r = 0; r < rows; r++) {
      const line: OceanRun[] = []
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        const ch = String.fromCodePoint(chars[i] ?? 32)
        const color = ch === ' ' ? '' : hex(ink[i] ?? -1)
        const bg = hex(back[i] ?? -1)
        const last = line[line.length - 1]
        if (last !== undefined && last.color === color && last.back === bg) last.text += ch
        else line.push({ text: ch, color, back: bg })
      }
      out.push(line)
    }
    return out
  }
}
