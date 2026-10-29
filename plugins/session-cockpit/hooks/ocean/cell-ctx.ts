// The canvas the ascii-sharks renderer draws on, made of terminal cells.
import { clamp } from './math'

/** A cell's size in the scene's pixels, a terminal cell's shape. */
export const CELL_W = 8;
export const CELL_H = 17;

/**
 * Stands in for the canvas: the renderer's fills land in cells. A glyph sets
 * the cell's character and ink, blended over what is there; a cell-sized fill
 * sets its background; a small fill (a twinkling dot) becomes a dot.
 */
export class CellCtx {
  cols = 0;
  rows = 0;
  private cw = CELL_W;
  private ch = CELL_H;
  /** Code point per cell, 32 for nothing. */
  chars = new Uint32Array(0);
  /** 0xRRGGBB ink and background per cell; -1 for none. */
  ink = new Int32Array(0);
  back = new Int32Array(0);
  private rgb = 0;
  private alpha = 1;

  size(cols: number, rows: number, cw: number, ch: number) {
    this.cols = cols;
    this.rows = rows;
    this.cw = cw;
    this.ch = ch;
    const n = cols * rows;
    this.chars = new Uint32Array(n);
    this.ink = new Int32Array(n);
    this.back = new Int32Array(n);
    this.clear();
  }

  clear() {
    this.chars.fill(32);
    this.ink.fill(-1);
    this.back.fill(-1);
  }

  set fillStyle(style: string) {
    const s = style.trim();
    if (s.startsWith("#")) {
      const h = s.length === 4 ? s.slice(1).split("").map((c) => c + c).join("") : s.slice(1, 7);
      this.rgb = parseInt(h, 16) | 0;
      this.alpha = 1;
      return;
    }
    const m = /rgba?\(([^)]*)\)/.exec(s);
    if (m === null) return;
    const [r = 0, g = 0, b = 0, a = 1] = m[1]!.split(",").map((v) => parseFloat(v));
    this.rgb = ((clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)) | 0;
    this.alpha = clamp(a, 0, 1);
  }

  private cell(x: number, y: number) {
    const c = Math.floor(x / this.cw);
    const r = Math.floor(y / this.ch);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
    return r * this.cols + c;
  }

  /** The current fill over `under` (or the dark of the water) at its alpha. */
  private blend(under: number) {
    const a = this.alpha;
    if (a >= 0.999) return this.rgb;
    const u = under < 0 ? 0x0b0d12 : under;
    const mix = (shift: number) =>
      Math.round(((this.rgb >> shift) & 255) * a + ((u >> shift) & 255) * (1 - a));
    return (mix(16) << 16) | (mix(8) << 8) | mix(0);
  }

  fillText(text: string, x: number, y: number) {
    const i = this.cell(x, y);
    if (i < 0) return;
    this.chars[i] = text.codePointAt(0) ?? 32;
    this.ink[i] = this.blend(this.back[i]!);
  }

  fillRect(x: number, y: number, w: number, h: number) {
    if (w >= this.cw * 0.5 && h >= this.ch * 0.5) {
      const i = this.cell(x + w / 2, y + h / 2);
      if (i >= 0) this.back[i] = this.blend(this.back[i]!);
      return;
    }
    // A dot of light in the water.
    const i = this.cell(x, y);
    if (i < 0 || this.chars[i] !== 32) return;
    this.chars[i] = 0xb7;
    this.ink[i] = this.blend(-1);
  }
}
