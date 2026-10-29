// The ocean below the pane: ascii-sharks' world and renderer, stepped on a
// fixed clock and read back as rows of colored runs a Client can draw.
import { clamp } from './math'
import { AsciiRenderer, CELL_H, CELL_W, CellCtx } from './renderer'
import { World, type SharkSpec } from './world'

const STEP = 1 / 60
const MAX_STEPS = 6

/** A run of cells drawn alike: its text, ink and background as #rrggbb, '' for the terminal's own. */
export type OceanRun = { text: string; color: string; back: string }

// One big shark: in a pane only fifty or so columns wide, a smaller one
// is a smudge of glyphs rather than a shark.
const SHARKS: SharkSpec[] = [{ kind: 'classic', size: 1 }]
// Three quarters of the pane's width, and never longer than its height allows.
const sharkLength = (w: number, h: number) => Math.max(120, Math.min(w * 0.75, h * 1.6))

// Ink snapped to steps of 8, so neighbouring glyphs share runs and the tree
// stays small; the water keeps its exact color, one per row, with no bands.
const hex = (v: number) => (v < 0 ? '' : `#${((v & 0xf8f8f8) | 0x1000000).toString(16).slice(1)}`)
const exact = (v: number) => (v < 0 ? '' : `#${(v | 0x1000000).toString(16).slice(1)}`)

export class OceanScene {
  private world: World
  private ctx = new CellCtx()
  private renderer: AsciiRenderer
  private acc = 0
  cols = 0
  rows = 0

  constructor(cols: number, rows: number) {
    this.world = new World(SHARKS, clamp(Math.round((cols * rows) / 14), 18, 120), {
      sharkLength,
      keepCentreClear: false,
      staysInFrame: true,
    })
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
        const bg = exact(back[i] ?? -1)
        const last = line[line.length - 1]
        if (last !== undefined && last.color === color && last.back === bg) last.text += ch
        else line.push({ text: ch, color, back: bg })
      }
      out.push(line)
    }
    return out
  }
}
