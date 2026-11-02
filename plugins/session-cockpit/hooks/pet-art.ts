// The pets other than Clawd as pixel art: a pixel is a quarter of a cell, so
// a sprite eighteen pixels wide by six tall fits the nine by three cells the
// pet takes. Each letter is a color; a cell shows up to two of them, one as
// its glyph's ink and one behind it, so a pet keeps a shaded side, a belly
// and dark eyes. Drawn in flat blocks without outlines, the shade on the far
// side, after the habits in xiexie-calendar's GUIDE.md (method only; none of
// its artwork is used).

export type ArtSprite = { grown: string[]; baby: string[]; palette: Record<string, string>; tint: string }

// K eyes; B body, S its shade; the rest each species names. An eye needs a
// filled pixel above it (or below), or its cell, which touches the empty
// air, can show one color only and the eye is lost.
const EYE = '#2a2a30'

export const PET_ART: Record<string, ArtSprite> = {
  chick: {
    tint: 'B',
    palette: { B: '#f2c94c', S: '#d4a531', W: '#fbe7a1', A: '#e8894a', K: EYE },
    grown: [
      '......BBBBBBS.....',
      '.....BKBBBBKBS....',
      '....BBBBAABBBBS...',
      '...BBBWWWWWWBBSS..',
      '......A.....A.....',
    ],
    baby: [
      '......BBBBBS......',
      '.....BKBBBKBS.....',
      '.....BBBAABBS.....',
      '......A....A......',
    ],
  },
  cat: {
    tint: 'B',
    palette: { B: '#b8afa6', S: '#8c847c', W: '#f1ece4', A: '#e7a3a0', K: EYE },
    grown: [
      '...BA........AS...',
      '...BBBBBBBBBBBS...',
      '...BKBBBABBBKBS...',
      '....BBWWWWWBBSS.BS',
      '....B.B....B.B..S.',
    ],
    baby: [
      '.....BBA..ABBS....',
      '.....BKBBABKBS....',
      '......BBWWBBS..S..',
      '......B.B.B.B.....',
    ],
  },
  bunny: {
    tint: 'B',
    palette: { B: '#f5f2ec', S: '#cfc8bc', A: '#f0a6b8', K: EYE },
    grown: [
      '......BA...AS.....',
      '......BA...AS.....',
      '....BBKBBBBBKBS...',
      '....BBBBBABBBBSS..',
      '...BBB......BBS...',
    ],
    baby: [
      '......BA..AS......',
      '.....BKBBBBKBS....',
      '.....BBBBABBBS....',
      '......BB...BS.....',
    ],
  },
  fox: {
    tint: 'B',
    palette: { B: '#e07b39', S: '#b85e26', W: '#fbf4ea', K: EYE },
    grown: [
      '...BS........BS...',
      '...BBBBBBBBBBBS...',
      '...BKBWWWWWBKBS...',
      '....BBBWWWBBBSSBBW',
      '.....B.B..B.B.....',
    ],
    baby: [
      '.....BBS..BBS.....',
      '.....BKBWWBKBS....',
      '......BBWWBBSBW...',
      '......B.B.B.B.....',
    ],
  },
  dragon: {
    tint: 'B',
    palette: { B: '#5aa84c', S: '#3e7a35', C: '#3e7a35', Y: '#e9be5a', K: EYE },
    grown: [
      '....Y........Y....',
      '...BBBBBBBBBBBS...',
      '.C.BKBBBBBBBKBS.C.',
      'CC..BBYYYYYYBSS.CC',
      '....BB......BSSB..',
    ],
    baby: [
      '......YB..BY......',
      '....CBKBBBBKBSC...',
      '.....BBYYYYBSS....',
      '......B....BSB....',
    ],
  },
  frog: {
    tint: 'B',
    palette: { B: '#6fb04e', S: '#4f8a36', W: '#eaf2d8', K: EYE },
    grown: [
      '....BBB....BBS....',
      '....BKB....BKS....',
      '...BBBBBBBBBBBBS..',
      '..BBBWWWWWWWWBBSS.',
      '.BB............BS.',
    ],
    baby: [
      '.....BBB..BBS.....',
      '.....BKB..BKS.....',
      '....BBWWWWWWBS....',
      '....BB......BS....',
    ],
  },
  penguin: {
    tint: 'B',
    palette: { B: '#2e3340', S: '#1e222b', W: '#f4f4f0', A: '#e8894a', K: EYE },
    grown: [
      '.....BBBBBBBBS....',
      '....BBWKWWKWBBS...',
      '...BBWWWAAWWWBS...',
      '...BBWWWWWWWWBS...',
      '.....AA....AA.....',
    ],
    baby: [
      '......BBBBBS......',
      '.....BWKWWKBS.....',
      '.....BWWAAWBS.....',
      '......AA..AA......',
    ],
  },
  panda: {
    tint: 'W',
    palette: { W: '#f4f2ee', S: '#cfcac2', B: '#2a2a30', K: '#f4f2ee' },
    grown: [
      '....BB......BB....',
      '....WWWWWWWWWWS...',
      '...WBBWWWWWWBBWS..',
      '..BBWWWWWWWWWWBBS.',
      '....BB......BB....',
    ],
    baby: [
      '.....BB....BB.....',
      '.....WBBWWBBWS....',
      '.....BWWWWWWBS....',
      '......BB..BB......',
    ],
  },
  unicorn: {
    tint: 'W',
    palette: { W: '#f7f3fa', S: '#d6cce0', Y: '#e9be5a', M: '#c38be0', K: EYE },
    grown: [
      '......Y...........',
      '.....WWWWWWWMM....',
      '....WKWWWWKWWMM...',
      '....WWWWWWWWWSM...',
      '.....W.W...W.W....',
    ],
    baby: [
      '......YWWW........',
      '.....WKWWKWWM.....',
      '.....WWWWWWSMM....',
      '......W.W.W.W.....',
    ],
  },
}

/** `breathe` raises the body a pixel while the feet stay on the ground. */
export type ArtPose = { shut: boolean; lift: number; apart: boolean; breathe?: boolean }

const QUAD = ' ▗▖▄▝▐▞▟▘▚▌▙▀▜▛█'
const W = 18
const H = 6

/**
 * A sprite's pixels in a pose: grown on rows 1–5, a baby on rows 2–5, raised
 * by `lift` pixels; shut eyes are the shade, and apart feet step outward.
 */
export function artPixels(art: ArtSprite, isBaby: boolean, pose: ArtPose): string[] {
  const rows = (isBaby ? art.baby : art.grown).map(r => r.padEnd(W, '.').slice(0, W))
  const out = Array.from({ length: H }, () => '.'.repeat(W).split(''))
  const top = H - rows.length - pose.lift
  rows.forEach((line, r) => {
    const y = top + r
    if (y < 0 || y >= H) return
    const isFeet = r === rows.length - 1
    if (pose.breathe && !isFeet) {
      // The body sits a pixel higher; the row it leaves is filled from below,
      // so the legs stretch instead of the pet floating.
      Array.from(line).forEach((c, x) => {
        if (c === '.') return
        if (y - 1 >= 0) out[y - 1]![x] = pose.shut && c === 'K' ? 'S' : c
      })
      if (r === rows.length - 2)
        Array.from(rows[rows.length - 1]!).forEach((c, x) => {
          if (c !== '.' && out[y]![x] === '.') out[y]![x] = c
        })
      return
    }
    Array.from(line).forEach((c, x) => {
      if (c === '.') return
      let at = x
      if (isFeet && pose.apart) at = x < W / 2 ? x - 1 : x + 1
      if (at < 0 || at >= W) return
      out[y]![at] = pose.shut && c === 'K' ? 'S' : c
    })
  })
  return out.map(r => r.join(''))
}

/**
 * Pixels to three rows of nine cells: each cell its quadrant glyph in the
 * color most of its pixels have, the second color behind it. A cell with an
 * empty pixel keeps one color only, so nothing paints outside the pet.
 */
export function artCells(px: string[], colorOf: (letter: string) => string): { ch: string; color: string; back: string }[][] {
  const cells: { ch: string; color: string; back: string }[][] = []
  for (let row = 0; row < 3; row++) {
    const line: { ch: string; color: string; back: string }[] = []
    for (let col = 0; col < W / 2; col++) {
      const four = [px[2 * row]![2 * col]!, px[2 * row]![2 * col + 1]!, px[2 * row + 1]![2 * col]!, px[2 * row + 1]![2 * col + 1]!]
      const count = new Map<string, number>()
      for (const c of four) if (c !== '.') count.set(c, (count.get(c) ?? 0) + 1)
      if (count.size === 0) {
        line.push({ ch: ' ', color: '', back: '' })
        continue
      }
      const ranked = [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] === 'K' ? 1 : b[0] === 'K' ? -1 : 0))
      const hasGap = four.includes('.')
      // Eyes win a cell they share with the body, so they never vanish.
      const eye = count.has('K') && !hasGap ? 'K' : null
      const ink = eye !== null ? ranked.find(([c]) => c !== 'K')![0] : ranked[0]![0]
      const back = hasGap ? '' : eye !== null ? 'K' : (ranked.find(([c]) => c !== ink)?.[0] ?? '')
      // With an eye, every other pixel takes the ink: only the eye is dark.
      const mask = four.map(c => (c === '.' ? false : hasGap ? true : eye !== null ? c !== 'K' : c === ink))
      const glyph = QUAD[(mask[0] ? 8 : 0) + (mask[1] ? 4 : 0) + (mask[2] ? 2 : 0) + (mask[3] ? 1 : 0)]!
      line.push({ ch: glyph, color: colorOf(ink), back: back === '' ? '' : colorOf(back) })
    }
    cells.push(line)
  }
  return cells
}
