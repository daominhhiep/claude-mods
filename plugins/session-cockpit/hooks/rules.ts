import type { PetLife, PetLifeStage } from '../types'

// Pure helpers: destructive-command detection, weather levels, line diffs.
// No `$` here, so tests can call them directly.

export type Blast = {
  kind: string
  // argv for a safe preview run, when the command is simple enough to preview
  preview?: { argv: string[]; label: string }[]
}

const SHELL_META = /[|;&<>`$(){}\\]/

/** Splits a command into words when it holds no shell syntax or quotes. */
export function simpleArgv(command: string): string[] | null {
  const trimmed = command.trim()
  if (trimmed === '' || SHELL_META.test(trimmed) || /["']/.test(trimmed)) {
    return null
  }
  return trimmed.split(/\s+/)
}

function rmTargets(argv: string[]): string[] {
  const rest = argv.slice(argv.indexOf('rm') + 1)
  let isEndOfFlags = false
  const targets: string[] = []
  for (const word of rest) {
    if (!isEndOfFlags && word === '--') {
      isEndOfFlags = true
      continue
    }
    if (!isEndOfFlags && word.startsWith('-')) continue
    targets.push(word)
  }
  return targets
}

const SQL_DESTRUCTIVE = /\b(drop\s+(table|database|schema|index|view)|truncate\s+(table\s+)?\w)/i
const SQL_DELETE_ALL = /\bdelete\s+from\s+[\w."]+\s*(;|"|'|$)/i

/** Returns what makes a shell command destructive, or null. */
export function detectBlast(command: string): Blast | null {
  const c = command
  const argv = simpleArgv(c)

  if (/(^|[\s;&|(])rm\s+(-[a-zA-Z]*[rRf][a-zA-Z]*\s+|--recursive\s+|--force\s+)/.test(c)) {
    const targets = argv?.[0] === 'rm' ? rmTargets(argv) : []
    const canPreview = targets.length > 0 && targets.every(t => !/[*?[\]~]/.test(t))
    return {
      kind: 'Delete files',
      preview: canPreview
        ? targets.flatMap(t => [
            { argv: ['du', '-sh', '--', t], label: 'size' },
            { argv: ['find', t, '-maxdepth', '4', '-type', 'f'], label: 'files' },
          ])
        : undefined,
    }
  }

  if (/\bgit\s+push\b.*(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/.test(c)) {
    return { kind: 'Force push (rewrites remote history)' }
  }
  if (/\bgit\s+reset\s+.*--hard\b/.test(c)) {
    return {
      kind: 'Discard local changes (git reset --hard)',
      preview: [{ argv: ['git', 'status', '--short'], label: 'changes lost' }],
    }
  }
  if (/\bgit\s+clean\s+-[a-zA-Z]*f/.test(c)) {
    return {
      kind: 'Delete untracked files (git clean)',
      preview: [{ argv: ['git', 'clean', '-nd'], label: 'would remove' }],
    }
  }
  if (/\bgit\s+branch\s+.*-D\b/.test(c)) {
    return { kind: 'Force-delete a branch' }
  }

  if (/\bkubectl\s+(.*\s)?delete\b/.test(c)) {
    const canPreview = argv?.[0] === 'kubectl' && !argv.some(w => w.startsWith('--dry-run'))
    return {
      kind: 'Delete Kubernetes resources',
      preview: canPreview
        ? [{ argv: [...argv, '--dry-run=server', '-o', 'name'], label: 'would delete' }]
        : undefined,
    }
  }
  if (/\bkubectl\s+(.*\s)?scale\b.*--replicas[=\s]+0\b/.test(c)) {
    return { kind: 'Scale to zero replicas' }
  }
  if (/\bkubectl\s+(.*\s)?drain\b/.test(c)) {
    return { kind: 'Drain a node' }
  }
  if (/\bhelm\s+(uninstall|delete)\b/.test(c)) {
    return { kind: 'Uninstall a Helm release' }
  }
  if (/\bargocd\s+app\s+delete\b/.test(c)) {
    return { kind: 'Delete an Argo CD app' }
  }
  if (/\bargocd\s+app\s+sync\b.*--prune\b/.test(c)) {
    return { kind: 'Argo CD sync with prune (removes resources)' }
  }
  if (/\bterraform\s+(destroy|apply\b.*-destroy)\b/.test(c)) {
    return { kind: 'Terraform destroy' }
  }

  if (/\b(psql|pgcli|sql|mysql)\b/i.test(c) || /\b(migrate|goose|atlas)\b/.test(c)) {
    if (SQL_DESTRUCTIVE.test(c)) return { kind: 'Drop or truncate database objects' }
    if (SQL_DELETE_ALL.test(c)) return { kind: 'DELETE without WHERE' }
    if (/\b(migrate|goose)\b.*\bdown\b/.test(c)) return { kind: 'Roll back migrations' }
  }

  return null
}

export type Level = { name: string; icon: string; color: string; from: number }

// Theme keys, so the colors follow the person's light or dark theme.
export const LEVELS: Level[] = [
  { name: 'Clear', icon: '☀', color: 'success', from: 0 },
  { name: 'Cloudy', icon: '☁', color: 'suggestion', from: 25 },
  { name: 'Showers', icon: '☂', color: 'permission', from: 50 },
  { name: 'Storm', icon: '⚡', color: 'warning', from: 75 },
  { name: 'Compact soon', icon: '⚠', color: 'error', from: 90 },
]

export function levelOf(percent: number): Level {
  let found = LEVELS[0]!
  for (const level of LEVELS) if (percent >= level.from) found = level
  return found
}

const SPARK = '▁▂▃▄▅▆▇█'

export function sparkline(values: number[]): string {
  return values
    .map(v => SPARK[Math.min(SPARK.length - 1, Math.max(0, Math.floor((v / 100) * SPARK.length)))])
    .join('')
}

const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

/** A bar filled to `percent`, in eighths of a cell; the rest is returned apart. */
export function bar(percent: number, width: number): { fill: string; rest: string } {
  const w = Math.max(4, width)
  const units = Math.round((Math.min(100, Math.max(0, percent)) / 100) * w * 8)
  const full = Math.floor(units / 8)
  const part = EIGHTHS[units % 8] ?? ''
  const fill = '█'.repeat(full) + part
  return { fill, rest: ' '.repeat(Math.max(0, w - full - (part === '' ? 0 : 1))) }
}

/** A scale under a bar of `width` cells: 0, 25, 50, 75, 100 at their places. */
export function scale(width: number): string {
  const w = Math.max(20, width)
  const cells = Array.from({ length: w + 3 }, () => ' ')
  for (const mark of [0, 25, 50, 75, 100]) {
    const label = String(mark)
    const at = Math.round((mark / 100) * w)
    const start = Math.min(cells.length - label.length, Math.max(0, at - Math.floor(label.length / 2)))
    for (let i = 0; i < label.length; i++) cells[start + i] = label[i]!
  }
  return cells.join('').trimEnd()
}

/** A strip marking position `at` among `count` steps, `width` cells wide at most. */
export function strip(at: number, count: number, width: number): string {
  const n = Math.max(1, Math.min(count, width))
  const pos = count <= 1 ? 0 : Math.round((at / (count - 1)) * (n - 1))
  return Array.from({ length: n }, (_, i) => (i === pos ? '●' : '─')).join('')
}

export function money(usd: number): string {
  return usd < 0.01 && usd > 0 ? '<$0.01' : `$${usd.toFixed(2)}`
}

const CONTEXT = 3
const MAX_DIFF_LINES = 400

/**
 * One unified-diff hunk between two texts: common head and tail lines trimmed,
 * three lines of context kept. Null when the texts are equal.
 */
export function lineDiff(
  before: string,
  after: string,
): { diff: string; isCut: boolean; added: number; removed: number } | null {
  if (before === after) return null
  const a = before === '' ? [] : before.split('\n')
  const b = after === '' ? [] : after.split('\n')

  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++
  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++
  }

  const start = Math.max(0, head - CONTEXT)
  const aEnd = Math.min(a.length, a.length - tail + CONTEXT)
  const bEnd = Math.min(b.length, b.length - tail + CONTEXT)

  const removedLines = a.slice(head, a.length - tail)
  const addedLines = b.slice(head, b.length - tail)

  const lines = [
    ...a.slice(start, head).map(l => ` ${l}`),
    ...removedLines.map(l => `-${l}`),
    ...addedLines.map(l => `+${l}`),
    ...a.slice(a.length - tail, aEnd).map(l => ` ${l}`),
  ]

  const oldCount = aEnd - start
  const newCount = bEnd - start
  const oldStart = oldCount === 0 ? start : start + 1
  const newStart = newCount === 0 ? start : start + 1

  let body = lines
  let note = ''
  if (lines.length > MAX_DIFF_LINES) {
    body = lines.slice(0, MAX_DIFF_LINES)
    note = `\n… ${lines.length - MAX_DIFF_LINES} more lines not shown`
  }
  const header = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`

  return {
    // A cut hunk no longer parses as a diff; the pane then draws it as plain text.
    diff: [header, ...body].join('\n') + note,
    isCut: note !== '',
    added: addedLines.length,
    removed: removedLines.length,
  }
}

/** A one-line description of what a tool call works on. */
export function summarize(tool: string, input: Record<string, unknown>): string {
  const pick = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '')
  const text =
    pick('command') ||
    pick('file_path') ||
    pick('notebook_path') ||
    pick('pattern') ||
    pick('url') ||
    pick('query') ||
    pick('description') ||
    pick('prompt') ||
    ''
  return text.replace(/\s+/g, ' ').slice(0, 160)
}

export function relativeTo(cwd: string, path: string): string {
  if (cwd !== '' && path.startsWith(cwd.endsWith('/') ? cwd : cwd + '/')) {
    return path.slice(cwd.length + (cwd.endsWith('/') ? 0 : 1))
  }
  return path
}

export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

/** Index of the newest prompt still running, else the newest one; -1 when none. */
export function findLastOpen(list: readonly { durationMs: number | null }[]): number {
  for (let i = list.length - 1; i >= 0; i--) if (list[i]!.durationMs === null) return i
  return list.length - 1
}

export type CheckRun = {
  name?: string
  context?: string
  status?: string
  conclusion?: string | null
  state?: string
}

/** Counts a `gh pr view --json statusCheckRollup` list into passed, failed, pending. */
export function rollup(checks: readonly CheckRun[]): {
  passed: number
  failed: number
  pending: number
  failing: string[]
} {
  let passed = 0
  let failed = 0
  let pending = 0
  const failing: string[] = []
  for (const c of checks) {
    const verdict = (c.conclusion ?? c.state ?? '').toUpperCase()
    const status = (c.status ?? '').toUpperCase()
    const name = c.name ?? c.context ?? 'check'
    if (status !== '' && status !== 'COMPLETED') pending++
    else if (verdict === 'PENDING' || verdict === 'EXPECTED') pending++
    else if (['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(verdict)) passed++
    else {
      failed++
      failing.push(name)
    }
  }
  return { passed, failed, pending, failing }
}

export function ttlMs(ttl: unknown): number {
  return ttl === '1h' ? 3_600_000 : 300_000
}

export function clockLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function parseBudget(args: string): number | null | 'invalid' {
  const t = args.trim().replace(/^\$/, '')
  if (t === '') return null
  if (t === 'off' || t === '0') return 0
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : 'invalid'
}

export const AGENT_DONE = new Set(['completed', 'failed', 'killed'])

const PR_URL = /github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)/

/**
 * The PR a tool call shows this session works on: a PR URL in its command or
 * output, or a `gh pr` / `git push` command (the branch's PR). Null otherwise.
 */
export function prRefFrom(command: string, output: string): string | null {
  const url = PR_URL.exec(command) ?? PR_URL.exec(output)
  if (url !== null) return url[1]!
  if (/\bgh\s+pr\s+(create|view|checks|status|merge|edit|ready|review)\b/.test(command)) return 'branch'
  if (/\bgit\s+push\b/.test(command)) return 'branch'
  return null
}

/** Share of an agent's input read from the prompt cache, 0 to 100; null with no input. */
export function cachedShare(a: { uncached: number; cacheRead: number; cacheWrite: number }): number | null {
  const total = a.uncached + a.cacheRead + a.cacheWrite
  return total === 0 ? null : Math.round((a.cacheRead / total) * 100)
}

/**
 * How full the context is, as a whole percentage of the point where Claude
 * Code compacts it when auto-compact is on, else of the model's window.
 */
export function contextPercent(tokens: number, window: number, compactAt: number | null): number {
  const limit = compactAt !== null && compactAt > 0 ? compactAt : window
  return limit > 0 ? Math.round((tokens / limit) * 100) : 0
}

/** A prompt as a person would read it: engine envelopes named, tags dropped. */
export function humanPrompt(text: string): string {
  const t = text.trim()
  if (t === '') return ''
  if (t.startsWith('<task-notification')) return '⚙ Background task update'
  if (t.startsWith('<agent-message')) return '✉ Message from an agent'
  if (t.startsWith('<teammate-message')) return '✉ Message from a teammate'
  return t
    .replace(/^❯\s*/, '')
    .replace(/<[^>]{1,80}>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A command or path shortened: the project folder dropped, the home folder as ~. */
export function tidySummary(summary: string, cwd: string): string {
  let s = summary
  if (cwd !== '') {
    const root = cwd.replace(/\/$/, '')
    s = s.replace(new RegExp(`^cd\\s+["']?${escapeRe(root)}["']?\\s*(&&|;)\\s*`), '')
    s = s.split(`${root}/`).join('').split(root).join('.')
  }
  return s.replace(/\/(?:Users|home)\/[^/\s"']+/g, '~')
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Whole days left before a transcript last written at `lastActive` is cleaned up. */
export function daysLeft(lastActive: number, now: number, keepDays: number): number {
  return keepDays - Math.floor((now - lastActive) / 86_400_000)
}

export function ago(ms: number): string {
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function baseName(path: string): string {
  const parts = path.replace(/\/$/, '').split('/')
  return parts[parts.length - 1] ?? path
}

export const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function spin(frame: number): string {
  return SPINNER[((frame % SPINNER.length) + SPINNER.length) % SPINNER.length]!
}

/**
 * A bar `width` cells wide filled to `percent`, split into runs of one color
 * each: every cell takes the color of the level its position stands for, so
 * the fill reads as a gradient from calm to hot.
 */
export function gradientBar(
  percent: number,
  width: number,
): { runs: { text: string; color: string }[]; rest: string } {
  const w = Math.max(4, width)
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * w)
  const runs: { text: string; color: string }[] = []
  for (let i = 0; i < filled; i++) {
    const color = levelOf(((i + 0.5) / w) * 100).color
    const last = runs[runs.length - 1]
    if (last !== undefined && last.color === color) last.text += '█'
    else runs.push({ text: '█', color })
  }
  return { runs, rest: '░'.repeat(w - filled) }
}

export type Theme = {
  id: string
  name: string
  note: string
  colors: Record<string, string>
  /** Made for a light terminal background; the rest are made for dark ones. */
  isLight?: boolean
  /** How it draws beyond color: frame, title mark, gauge and what drifts above the band. */
  style?: Partial<ThemeStyle>
}

export type FrameKind = 'round' | 'double' | 'heavy' | 'light' | 'ascii' | 'dashed'
export type GaugeKind = 'smooth' | 'pips' | 'dots' | 'squares' | 'hash' | 'shade'
export type AmbientKind = 'snow' | 'petals' | 'rain' | 'stars' | 'embers' | 'bubbles' | 'leaves' | 'glitch' | 'fireflies'

export type ThemeStyle = { frame: FrameKind; mark: string; gauge: GaugeKind; ambient: AmbientKind | null }

/** The glyphs of each frame, and the matching borderStyle for boxes drawn by the engine. */
export const FRAMES: Record<FrameKind, { tl: string; tr: string; bl: string; br: string; h: string; v: string; box: string }> = {
  round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', box: 'round' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', box: 'double' },
  heavy: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃', box: 'bold' },
  light: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', box: 'single' },
  ascii: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|', box: 'classic' },
  dashed: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '┄', v: '┆', box: 'round' },
}

const PLAIN_STYLE: ThemeStyle = { frame: 'round', mark: '◆', gauge: 'smooth', ambient: null }

/** The style a theme draws with, the plain one filling in what it leaves out. */
export function themeStyle(themeId: string | null | undefined): ThemeStyle {
  return { ...PLAIN_STYLE, ...THEMES.find(t => t.id === themeId)?.style }
}

/** The glyphs a gauge fills and leaves empty with; smooth fills in eighths. */
const GAUGES: Record<Exclude<GaugeKind, 'smooth'>, { full: string; empty: string }> = {
  pips: { full: '▰', empty: '▱' },
  dots: { full: '●', empty: '·' },
  squares: { full: '■', empty: '□' },
  hash: { full: '#', empty: '.' },
  shade: { full: '▓', empty: '░' },
}

// What drifts above the band, and how. A falling or rising particle steps
// through its glyphs, top to bottom, within each row before it moves to the
// next (˙ · . reads as one dot sinking), so it moves a third or half a row a
// step. Petals and leaves keep their shape and slide sideways instead.
// Twinkles fade through their glyphs. `ms` is one step.
const AMBIENTS: Record<
  AmbientKind,
  { glyphs: string[]; colors: string[]; ms: number; move: 'fall' | 'rise' | 'twinkle' | 'flicker'; drift?: true }
> = {
  snow: { glyphs: ['˙', '·', '.'], colors: ['text', 'suggestion'], ms: 240, move: 'fall' },
  petals: { glyphs: ['✿', '❀'], colors: ['claude', 'merged'], ms: 300, move: 'fall', drift: true },
  rain: { glyphs: ['╵', '│', '╷'], colors: ['suggestion', 'permission'], ms: 100, move: 'fall' },
  leaves: { glyphs: [',', '‘'], colors: ['success', 'warning'], ms: 320, move: 'fall', drift: true },
  embers: { glyphs: ['˙', '·', '.'], colors: ['claude', 'error', 'warning'], ms: 160, move: 'rise' },
  bubbles: { glyphs: ['°', 'o'], colors: ['suggestion', 'permission'], ms: 300, move: 'rise' },
  stars: { glyphs: ['·', '✧', '✦', '✧', '·'], colors: ['warning', 'text', 'permission'], ms: 200, move: 'twinkle' },
  fireflies: { glyphs: ['·', '•', '•', '·'], colors: ['warning', 'success'], ms: 200, move: 'twinkle' },
  glitch: { glyphs: ['▚', '▞', '░', '▒'], colors: ['suggestion', 'error', 'permission'], ms: 150, move: 'flicker' },
}

/** How often, in ms, a theme's weather moves: when the band should redraw for it. */
export const ambientStepMs = (kind: AmbientKind) => AMBIENTS[kind].ms

const mix = (a: number, b: number) => {
  let h = Math.imul(a + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/**
 * The two rows above the band: what drifts there at `now`, cell by cell, a
 * space where nothing is. About one column in four carries something.
 */
export function ambient(kind: AmbientKind, width: number, now: number): { ch: string; color: string }[][] {
  const a = AMBIENTS[kind]
  const n = a.glyphs.length
  const step = Math.floor(now / a.ms)
  const rows = [0, 1].map(() => Array.from({ length: Math.max(0, width) }, () => ({ ch: ' ', color: '' })))
  const tint = (h: number) => a.colors[(h >>> 8) % a.colors.length]!
  for (let c = 0; c < width; c++) {
    const h = mix(c, 7)
    if (a.move === 'flicker') {
      const k = mix(c, step)
      if (k % 23 === 0) rows[k % 2]![c] = { ch: a.glyphs[(k >>> 4) % n]!, color: tint(k) }
      continue
    }
    if (h % 4 !== 0) continue
    if (a.move === 'twinkle') {
      // Fixed in place, fading in and out for part of its own cycle.
      const p = (step + (h >>> 4)) % (n * 3)
      if (p < n) rows[(h >>> 2) % 2]![c] = { ch: a.glyphs[p]!, color: tint(h) }
      continue
    }
    // Through the two rows in 2n steps, then off screen a while.
    const p = (step + (h >>> 4)) % (n * 5)
    if (p >= n * 2) continue
    if (a.drift === true) {
      const col = Math.min(width - 1, c + p)
      rows[Math.floor(p / n)]![col] = { ch: a.glyphs[(h >>> 5) % n]!, color: tint(h) }
      continue
    }
    const at = a.move === 'rise' ? n * 2 - 1 - p : p
    rows[Math.floor(at / n)]![c] = { ch: a.glyphs[at % n]!, color: tint(h) }
  }
  return rows
}

// Each theme maps the Claude Code theme keys the mod paints with to colors of
// its own; "claude" keeps the keys, so the mod follows the person's theme.
export const THEMES: Theme[] = [
  { id: 'claude', name: 'Claude', note: 'Follows your Claude Code theme', colors: {} },
  {
    id: 'ocean',
    name: 'Ocean',
    note: 'Cool blues and teals',
    style: { mark: '◈', gauge: 'pips', ambient: 'bubbles' },
    colors: {
      claude: '#4fc3f7', success: '#4dd0e1', warning: '#ffd54f', error: '#ff8a80',
      suggestion: '#80deea', permission: '#64b5f6', merged: '#b39ddb',
      subtle: '#78909c', inactive: '#546e7a',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    note: 'Warm oranges and pinks',
    style: { mark: '☀', frame: 'round', gauge: 'shade', ambient: 'embers' },
    colors: {
      claude: '#ff7e5f', success: '#ffb36b', warning: '#ffd166', error: '#ff4e6a',
      suggestion: '#f6a5c0', permission: '#c3aed6', merged: '#e0a3ff',
      subtle: '#a8908c', inactive: '#6d5d5d',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    note: 'High-contrast synthwave',
    style: { frame: 'heavy', mark: '⚡', gauge: 'pips', ambient: 'rain' },
    colors: {
      claude: '#ff2bd6', success: '#39ff14', warning: '#fff01f', error: '#ff073a',
      suggestion: '#00f0ff', permission: '#7df9ff', merged: '#bc13fe',
      subtle: '#8a8aa3', inactive: '#5a5a73',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    note: 'Calm greens and earth tones',
    style: { mark: '♣', gauge: 'dots', ambient: 'leaves' },
    colors: {
      claude: '#8bc34a', success: '#66bb6a', warning: '#e6c229', error: '#e57373',
      suggestion: '#a5d6a7', permission: '#80cbc4', merged: '#ce93d8',
      subtle: '#8d9a87', inactive: '#5f6b5a',
    },
  },
  {
    id: 'mono',
    name: 'Mono',
    note: 'Greys only, for recording or focus',
    style: { frame: 'ascii', mark: '#', gauge: 'hash' },
    colors: {
      claude: '#e0e0e0', success: '#bdbdbd', warning: '#f5f5f5', error: '#ffffff',
      suggestion: '#9e9e9e', permission: '#9e9e9e', merged: '#cfcfcf',
      subtle: '#7a7a7a', inactive: '#5c5c5c',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    note: 'Acid yellow, cyan and hot red on black',
    style: { frame: 'double', mark: '▲', gauge: 'squares', ambient: 'glitch' },
    colors: {
      claude: '#fcee0a', success: '#00ff9f', warning: '#02d7f2', error: '#ff003c',
      suggestion: '#02d7f2', permission: '#b026ff', merged: '#b026ff',
      subtle: '#7a7f9a', inactive: '#4a4e66', text: '#e8f6ff', inverseText: '#0a0a12',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    note: 'Purple night with neon pastels',
    style: { mark: '☾', gauge: 'pips', ambient: 'stars' },
    colors: { claude: '#bd93f9', success: '#50fa7b', warning: '#f1fa8c', error: '#ff5555', suggestion: '#8be9fd', permission: '#ff79c6', merged: '#bd93f9', subtle: '#6272a4', inactive: '#44475a', text: '#f8f8f2' },
  },
  {
    id: 'nord',
    name: 'Nord',
    note: 'Frosty arctic blues',
    style: { frame: 'light', mark: '❄', gauge: 'shade', ambient: 'snow' },
    colors: { claude: '#88c0d0', success: '#a3be8c', warning: '#ebcb8b', error: '#bf616a', suggestion: '#81a1c1', permission: '#b48ead', merged: '#b48ead', subtle: '#7b88a1', inactive: '#4c566a', text: '#eceff4' },
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    note: 'Warm retro, like old paper',
    style: { frame: 'heavy', mark: '▣', gauge: 'squares', ambient: 'embers' },
    colors: { claude: '#fe8019', success: '#b8bb26', warning: '#fabd2f', error: '#fb4934', suggestion: '#83a598', permission: '#d3869b', merged: '#d3869b', subtle: '#a89984', inactive: '#665c54', text: '#ebdbb2' },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    note: 'Soft pastels on mocha',
    style: { mark: '♡', gauge: 'dots', ambient: 'stars' },
    colors: { claude: '#cba6f7', success: '#a6e3a1', warning: '#f9e2af', error: '#f38ba8', suggestion: '#89dceb', permission: '#f5c2e7', merged: '#b4befe', subtle: '#9399b2', inactive: '#585b70', text: '#cdd6f4' },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    note: 'City lights after dark',
    style: { frame: 'double', mark: '◉', gauge: 'pips', ambient: 'rain' },
    colors: { claude: '#7aa2f7', success: '#9ece6a', warning: '#e0af68', error: '#f7768e', suggestion: '#7dcfff', permission: '#bb9af7', merged: '#bb9af7', subtle: '#737aa2', inactive: '#414868', text: '#c0caf5' },
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    note: 'Muted rose and pine',
    style: { frame: 'dashed', mark: '❦', gauge: 'dots', ambient: 'fireflies' },
    colors: { claude: '#ebbcba', success: '#9ccfd8', warning: '#f6c177', error: '#eb6f92', suggestion: '#c4a7e7', permission: '#c4a7e7', merged: '#ebbcba', subtle: '#908caa', inactive: '#524f67', text: '#e0def4' },
  },
  {
    id: 'sakura',
    name: 'Sakura',
    note: 'Cherry blossom pinks',
    style: { frame: 'dashed', mark: '✿', gauge: 'dots', ambient: 'petals' },
    colors: { claude: '#ff8fab', success: '#b5e48c', warning: '#ffd6a5', error: '#ff4d6d', suggestion: '#a2d2ff', permission: '#cdb4db', merged: '#ffc8dd', subtle: '#a5948f', inactive: '#6b5b5e' },
  },
  {
    id: 'paper',
    name: 'Paper',
    note: 'Ink on a light background',
    style: { frame: 'light', mark: '✎', gauge: 'shade' },
    colors: { claude: '#c15f3c', success: '#2e7d32', warning: '#b26a00', error: '#c62828', suggestion: '#1565c0', permission: '#6a1b9a', merged: '#6a1b9a', subtle: '#6d6d6d', inactive: '#9e9e9e', text: '#1a1a1a', inverseText: '#ffffff' },
    isLight: true,
  },
]

/**
 * A level-colored bar filled to `percent` in eighths of a cell, as color runs,
 * and the empty rest.
 */
export function smoothBar(
  percent: number,
  width: number,
  kind: GaugeKind = 'smooth',
): { runs: { text: string; color: string }[]; rest: string } {
  const w = Math.max(4, width)
  const glyphs = kind === 'smooth' ? null : GAUGES[kind]
  // Other gauges fill whole cells only.
  const units = glyphs === null ? Math.round((Math.min(100, Math.max(0, percent)) / 100) * w * 8) : Math.round((Math.min(100, Math.max(0, percent)) / 100) * w) * 8
  const full = Math.floor(units / 8)
  const part = EIGHTHS[units % 8] ?? ''
  const runs: { text: string; color: string }[] = []
  const push = (ch: string, i: number) => {
    const color = levelOf(((i + 0.5) / w) * 100).color
    const last = runs[runs.length - 1]
    if (last !== undefined && last.color === color) last.text += ch
    else runs.push({ text: ch, color })
  }
  for (let i = 0; i < full; i++) push(glyphs?.full ?? '█', i)
  if (part !== '') push(part, full)
  return { runs, rest: (glyphs?.empty ?? '░').repeat(Math.max(0, w - full - (part === '' ? 0 : 1))) }
}

/**
 * How bright cell `index` of a frame `perimeter` cells around is, with a light
 * whose head is at cell `head`: 2 under the light, 1 in its tail, 0 elsewhere.
 * The light is three cells wide, so a step of two always overlaps the last.
 */
export function ringGlow(index: number, head: number, perimeter: number): 0 | 1 | 2 {
  if (perimeter <= 0) return 0
  const at = ((head % perimeter) + perimeter) % perimeter
  const behind = (((at - index) % perimeter) + perimeter) % perimeter
  return behind <= 2 ? 2 : behind <= 10 ? 1 : 0
}

/** The color a theme paints a theme key with; unknown keys and raw colors pass through. */
export function painter(themeId: string | null | undefined): (color: string) => string {
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]!
  return color => theme.colors[color] ?? color
}

/** A bouncing block inside `width` cells, for work of unknown length. */
export function sweep(frame: number, width: number): string {
  const w = Math.max(3, width)
  const span = (w - 1) * 2
  const step = ((frame % span) + span) % span
  const at = step < w ? step : span - step
  return Array.from({ length: w }, (_, i) => (i === at ? '▰' : '▱')).join('')
}

/**
 * Splits `text` into runs for a shimmer: the letter under the moving light,
 * its neighbours, and the rest. `null` frame draws it plain.
 */
export function shimmer(text: string, frame: number | null): { text: string; glow: 0 | 1 | 2 }[] {
  if (frame === null) return [{ text, glow: 0 }]
  const n = text.length
  const at = ((frame % (n + 6)) + n + 6) % (n + 6) - 3
  const runs: { text: string; glow: 0 | 1 | 2 }[] = []
  for (let i = 0; i < n; i++) {
    const d = Math.abs(i - at)
    const glow: 0 | 1 | 2 = d === 0 ? 2 : d === 1 ? 1 : 0
    const last = runs[runs.length - 1]
    if (last !== undefined && last.glow === glow) last.text += text[i]
    else runs.push({ text: text[i]!, glow })
  }
  return runs
}

export const TWEEN_MS = 1500
export const TYPE_MS = 35

/** The percent to draw `since` ms after a reading moved from `from` to `to`, eased out. */
export function tween(from: number, to: number, since: number): number {
  const t = Math.max(0, Math.min(1, since / TWEEN_MS))
  const eased = 1 - (1 - t) ** 3
  return Math.round(from + (to - from) * eased)
}

/** The part of `text` typed out `since` ms after it appeared, with a cursor while typing. */
export function typed(text: string, since: number): string {
  const n = Math.floor(Math.max(0, since) / TYPE_MS)
  return n >= text.length ? text : `${text.slice(0, n)}▌`
}

const TOOL_ICONS: Record<string, string> = {
  Bash: '❯',
  Read: '◧',
  Edit: '✎',
  MultiEdit: '✎',
  Write: '✚',
  NotebookEdit: '✎',
  Grep: '⌕',
  Glob: '⌕',
  WebFetch: '⇣',
  WebSearch: '⌕',
  Agent: '◆',
  Task: '◆',
  TodoWrite: '☰',
  AskUserQuestion: '?',
}

export function toolIcon(tool: string): string {
  if (tool.startsWith('mcp__')) return '⧉'
  return TOOL_ICONS[tool] ?? '•'
}

/** A tool's name as a person reads it: an MCP tool by its server and tool. */
export function toolLabel(tool: string): string {
  if (!tool.startsWith('mcp__')) return tool
  const [, server, name] = tool.split('__')
  return `${server ?? ''} · ${name ?? ''}`
}

/** Every text a drawn tree holds, in order, joined by spaces. */
export function textOf(node: unknown): string {
  if (typeof node === 'string') return node
  if (node === null || typeof node !== 'object') return ''
  const n = node as { children?: unknown; props?: { label?: unknown } }
  const own = typeof n.props?.label === 'string' ? n.props.label : ''
  const kids = Array.isArray(n.children) ? n.children.map(textOf).join(' ') : ''
  return `${own} ${kids}`.replace(/\s+/g, ' ').trim()
}

/** The headline of a You should know note in a drawn band, or null when there is none. */
export function headsUp(text: string): string | null {
  const mark = text.search(/[✦✧]|Heads up/)
  if (mark < 0) return null
  const line = text
    .slice(mark)
    .replace(/^[✦✧]\s*/, '')
    .replace(/\s+\d:\s.*$/, '')
    .trim()
  return line === '' ? null : line
}

// ── Effects ──────────────────────────────────────────────────────────

export type EffectId = 'fireworks' | 'flash' | 'wave' | 'breathe' | 'typing' | 'ring' | 'pet' | 'weather' | 'light'
export type Effects = Record<EffectId, boolean>

/** Each effect Settings · Effects turns on and off, in the order it lists them. */
export const EFFECTS: { id: EffectId; label: string; hint: string }[] = [
  { id: 'fireworks', label: 'Fireworks when a turn ends', hint: 'The band bursts for two seconds with the time and cost.' },
  { id: 'flash', label: 'Flash at each context level', hint: 'At 25, 50, 75 and 90% the frame flashes and names the level.' },
  { id: 'wave', label: 'Color wave on the gauge', hint: 'While Claude works, colors roll along the context bar.' },
  { id: 'breathe', label: 'Breathing frame', hint: 'The frame glows slowly in the last minute before the cache goes cold.' },
  { id: 'typing', label: "Type out Claude's replies", hint: 'Each new reply appears letter by letter, in about a second.' },
  { id: 'ring', label: 'Light around the frame', hint: 'A light circles the band: quick while Claude works, slow at rest.' },
  { id: 'pet', label: 'Claude pet', hint: 'A little Claude lives in the band: it runs while Claude works, cheers when a turn ends and naps when the cache goes cold.' },
  { id: 'weather', label: 'Theme weather', hint: 'Snow, petals, rain or stars drift above the band in themes that have them. Turn off if the terminal feels slow.' },
  { id: 'light', label: 'Light mode', hint: 'Half the frames while Claude works: less work for the terminal, a little less smooth.' },
]

export const DEFAULT_EFFECTS: Effects = {
  fireworks: true,
  flash: true,
  wave: true,
  breathe: true,
  typing: true,
  ring: true,
  pet: true,
  weather: true,
  light: false,
}

/** Saved effects read back, any missing or broken entry at its default. */
export function effectsFrom(saved: unknown): Effects {
  const out = { ...DEFAULT_EFFECTS }
  if (saved === null || typeof saved !== 'object') return out
  for (const { id } of EFFECTS) {
    const v = (saved as Record<string, unknown>)[id]
    if (typeof v === 'boolean') out[id] = v
  }
  return out
}

export const BURST_MS = 2_200
export const FLASH_MS = 2_500

const WAVE = ['claude', 'warning', 'success', 'suggestion', 'permission', 'error']

/** The color cell `index` of the gauge takes in the wave at `frame`. */
export function waveColor(index: number, frame: number): string {
  const band = Math.floor((index - frame) / 4)
  return WAVE[((band % WAVE.length) + WAVE.length) % WAVE.length]!
}

function noise(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * One frame of a firework `since` ms after it went off, in a field `width`
 * cells by `rows`: each cell a glyph and a color, or a blank.
 */
export function burst(
  since: number,
  width: number,
  rows: number,
  seed: number,
): { ch: string; color: string }[][] {
  const w = Math.max(10, width)
  const h = Math.max(1, rows)
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ ch: ' ', color: '' })))
  const p = Math.max(0, Math.min(1, since / BURST_MS))
  const put = (x: number, y: number, ch: string, color: string) => {
    const cx = Math.round(x)
    const cy = Math.round(y)
    if (cy < 0 || cy >= h || cx < 0 || cx >= w) return
    grid[cy]![cx] = { ch, color }
  }
  const shells = 3
  for (let s = 0; s < shells; s++) {
    // Shells go off one after another across the band.
    const start = s * 0.18
    const q = (p - start) / (1 - start)
    if (q <= 0) continue
    const cx = w * (0.2 + 0.3 * s) + (noise(seed + s) - 0.5) * w * 0.1
    const cy = (h - 1) / 2
    if (q < 0.12) put(cx, cy, '✺', 'text')
    const sparks = 22
    for (let k = 0; k < sparks; k++) {
      const angle = (2 * Math.PI * k) / sparks + noise(seed * 7 + s * 31 + k) * 0.4
      const speed = 0.55 + noise(seed * 13 + s * 17 + k) * 0.6
      const reach = q * speed
      const x = cx + Math.cos(angle) * reach * w * 0.22
      const y = cy + Math.sin(angle) * reach * (h / 2 + 0.6) + q * q * 0.8
      const ch = q < 0.35 ? '✦' : q < 0.6 ? '✧' : q < 0.85 ? '·' : '.'
      const color = q > 0.85 ? 'inactive' : WAVE[(k + s * 2) % WAVE.length]!
      put(x, y, ch, color)
      if (q > 0.25 && q < 0.8) {
        // A short trail behind each spark.
        put(cx + Math.cos(angle) * reach * w * 0.15, cy + Math.sin(angle) * reach * (h / 2), '·', 'subtle')
      }
    }
  }
  return grid
}

// ── The pet ──────────────────────────────────────────────────────────

export type PetMood = 'idle' | 'work' | 'happy' | 'oops' | 'sleep' | 'sad' | 'loved'

/** How many cells the pet's yard takes at the band's right edge. */
export const PET_WIDTH = 16
/** How long the pet cheers after a turn, and frets after a failed tool. */
export const PET_HAPPY_MS = 5_000
export const PET_OOPS_MS = 3_000
/** How long hearts float after a pat. */
export const PET_LOVED_MS = 3_000

const PET_BODY = 9

type PetPose = { shut: boolean; up: boolean; apart: boolean }

// The egg is drawn from pixels, a quarter of a cell each, so it can roll
// half a cell at a time and lean as it goes. X is shell, o a pale spot.
const EGG_ART = ['....XX....', '..XXXXXX..', '.XoXXXXXX.', 'XXXXXXXXXX', 'XXXXXXoXXX', '.XXXXXXXX.']
// Cheering, a crack opens at the top.
const EGG_CRACKED = ['....X.....', '..XX.XXX..']
const QUADRANTS = ' ▗▖▄▝▐▞▟▘▚▌▙▀▜▛█'

/**
 * The egg's three rows, PET_BODY cells wide: moved right by `half` half cells
 * and its top `lean` pixels over; the cells holding a spot, as columns per row.
 */
function eggSprite(half: number, lean: number, isCracked: boolean): { rows: string[]; spots: number[][] } {
  const art = isCracked ? [...EGG_CRACKED, ...EGG_ART.slice(2)] : EGG_ART
  const W = PET_BODY * 2
  const px = art.map((line, r) => {
    const out = Array.from({ length: W }, () => ' ')
    const at = 4 + half + (r < 2 ? lean : 0)
    Array.from(line).forEach((c, i) => {
      if (c !== '.' && at + i >= 0 && at + i < W) out[at + i] = c
    })
    return out
  })
  const on = (r: number, c: number) => px[r]![c] !== ' '
  const rows: string[] = []
  const spots: number[][] = []
  for (let row = 0; row < 3; row++) {
    let line = ''
    const here: number[] = []
    for (let col = 0; col < PET_BODY; col++) {
      const [t, b, l, r] = [2 * row, 2 * row + 1, 2 * col, 2 * col + 1]
      line += QUADRANTS[(on(t, l) ? 8 : 0) + (on(t, r) ? 4 : 0) + (on(b, l) ? 2 : 0) + (on(b, r) ? 1 : 0)]
      if ([px[t]![l], px[t]![r], px[b]![l], px[b]![r]].includes('o')) here.push(col)
    }
    rows.push(line)
    spots.push(here)
  }
  return { rows, spots }
}

/** Each stage's three rows in a pose, every row PET_BODY cells wide. */
const PET_SPRITES: Record<PetStage, (p: PetPose) => [string, string, string]> = {
  // An oval taller than wide, its spots painted on afterwards; a crack
  // opens at the top when it cheers.
  egg: p => eggSprite(0, 0, p.up).rows as [string, string, string],
  // A baby is two rows tall and hops a row up for joy.
  baby: p => {
    const eyes = p.shut ? '  ▐███▌  ' : '  ▐▛█▜▌  '
    const feet = p.apart ? ' ▝▘   ▝▘ ' : '  ▝▘ ▝▘  '
    return p.up ? [eyes, feet, '         '] : ['         ', eyes, feet]
  },
  kid: p => [
    p.shut ? ' ▐█████▌ ' : ' ▐▛███▜▌ ',
    p.up ? ' ▗█████▖ ' : '  █████  ',
    p.apart ? ' ▘▘   ▝▝ ' : '  ▘▘ ▝▝  ',
  ],
  adult: p => [
    p.shut ? ' ▐█████▌ ' : ' ▐▛███▜▌ ',
    p.up ? '▗▟█████▙▖' : '▝▜█████▛▘',
    p.apart ? ' ▘▘   ▝▝ ' : '  ▘▘ ▝▝  ',
  ],
  elder: p => PET_SPRITES.adult(p),
}

// ── Species ──────────────────────────────────────────────────────────

export type PetRarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'

export const PET_RARITIES: Record<PetRarity, { name: string; color: string; percent: number }> = {
  common: { name: 'Common', color: 'subtle', percent: 59.9 },
  uncommon: { name: 'Uncommon', color: 'success', percent: 25 },
  rare: { name: 'Rare', color: 'suggestion', percent: 12 },
  legendary: { name: 'Legendary', color: 'warning', percent: 3 },
  mythic: { name: 'Mythic', color: 'claude', percent: 0.1 },
}

type SpeciesSprites = {
  baby: (p: PetPose) => [string, string, string]
  grown: (p: PetPose) => [string, string, string]
  /** A row drawn in its own color whatever the skin: a crown. */
  accent?: { row: number; color: string }
}

/** A baby hops a row up; its face and feet are the rest. */
const hop = (p: PetPose, face: string, feet: string): [string, string, string] =>
  p.up ? [face, feet, '         '] : ['         ', face, feet]

/** What can hatch from the egg, each with its chance in ten thousand. */
export const PET_SPECIES: { id: string; name: string; rarity: PetRarity; weight: number; sprites: SpeciesSprites | null }[] = [
  // Clawd keeps the original sprites, by stage.
  { id: 'clawd', name: 'Clawd', rarity: 'common', weight: 2000, sprites: null },
  {
    id: 'chick',
    name: 'Chick',
    rarity: 'common',
    weight: 2000,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▗█▶█▖  ' : '  ▗▛▶▜▖  ', p.apart ? '  ▘   ▝  ' : '   ▘ ▝   '),
      grown: p => [
        p.shut ? ' ▗██▶██▖ ' : ' ▗▛█▶█▜▖ ',
        p.up ? ' ▚▜███▛▞ ' : '  ▜███▛  ',
        p.apart ? '  ▘   ▝  ' : '   ▘ ▝   ',
      ],
    },
  },
  {
    id: 'cat',
    name: 'Cat',
    rarity: 'uncommon',
    weight: 850,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▙███▟  ' : '  ▙▛█▜▟  ', p.apart ? ' ▝▘   ▝▘ ' : '  ▝▘ ▝▘  '),
      grown: p => [
        p.shut ? ' ▙█████▟ ' : ' ▙▛███▜▟ ',
        p.up ? ' ▗█████▖▞' : '  █████ ▞',
        p.apart ? ' ▘▘   ▝▝ ' : '  ▘▘ ▝▝  ',
      ],
    },
  },
  {
    id: 'bunny',
    name: 'Bunny',
    rarity: 'uncommon',
    weight: 850,
    sprites: {
      baby: p => [
        p.up ? '  ▚   ▞  ' : '   ▌ ▐   ',
        p.shut ? '  ▐███▌  ' : '  ▐▛█▜▌  ',
        p.apart ? ' ▀▀   ▀▀ ' : '  ▀▀ ▀▀  ',
      ],
      grown: p => [
        p.up ? '  ▚▌ ▐▞  ' : '  ▐▌ ▐▌  ',
        p.shut ? ' ▐█████▌ ' : ' ▐▛███▜▌ ',
        p.apart ? '▀▀▀   ▀▀▀' : ' ▀▀▀ ▀▀▀ ',
      ],
    },
  },
  {
    id: 'fox',
    name: 'Fox',
    rarity: 'rare',
    weight: 600,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▙█▄█▟  ' : '  ▙▛▄▜▟  ', p.apart ? ' ▝▘   ▝▘▞' : '  ▝▘ ▝▘▞ '),
      grown: p => [
        p.shut ? ' ▙█▄▄▄█▟ ' : ' ▙▛▄▄▄▜▟ ',
        p.up ? ' ▗█████▟█' : '  █████▟█',
        p.apart ? ' ▘▘   ▝▝ ' : '  ▘▘ ▝▝  ',
      ],
    },
  },
  {
    id: 'dragon',
    name: 'Dragon',
    rarity: 'legendary',
    weight: 150,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▚███▞  ' : '  ▚▛█▜▞  ', p.apart ? ' ▝▘   ▝▘ ' : '  ▝▘ ▝▘  '),
      grown: p => [
        p.shut ? ' ▚▐███▌▞ ' : ' ▚▐▛█▜▌▞ ',
        p.up ? '▙▜█████▛▟' : '▟▜█████▛▙',
        p.apart ? ' ▘▘   ▝▝▞' : '  ▘▘ ▝▝ ▞',
      ],
    },
  },  {
    id: 'frog',
    name: 'Frog',
    rarity: 'common',
    weight: 1990,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▗▄ ▄▖  ' : '  ▗▛ ▜▖  ', p.apart ? ' ▀▀   ▀▀ ' : '  ▀▀ ▀▀  '),
      grown: p => [
        p.shut ? ' ▗▄▖ ▗▄▖ ' : ' ▗▛▖ ▗▜▖ ',
        p.up ? '▗▟█████▙▖' : ' ▐█████▌ ',
        p.apart ? '▀▀     ▀▀' : ' ▀▀   ▀▀ ',
      ],
    },
  },
  {
    id: 'penguin',
    name: 'Penguin',
    rarity: 'uncommon',
    weight: 800,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▗███▖  ' : '  ▗▛█▜▖  ', p.apart ? ' ▀▘   ▝▀ ' : '  ▀▘ ▝▀  '),
      grown: p => [
        p.shut ? ' ▗█████▖ ' : ' ▗▛███▜▖ ',
        p.up ? '▝▐█▒▒▒█▌▘' : ' ▐█▒▒▒█▌ ',
        p.apart ? ' ▀▘   ▝▀ ' : '  ▀▘ ▝▀  ',
      ],
    },
  },
  {
    id: 'panda',
    name: 'Panda',
    rarity: 'rare',
    weight: 600,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▗█▄█▖  ' : '  ▗▛▄▜▖  ', p.apart ? ' ▀▀   ▀▀ ' : '  ▀▀ ▀▀  '),
      grown: p => [
        p.shut ? '▗▐█▄█▄█▌▖' : '▗▐▛▄█▄▜▌▖',
        p.up ? '▗▐▓███▓▌▖' : ' ▐▓███▓▌ ',
        p.apart ? ' ▀▀   ▀▀ ' : '  ▀▀ ▀▀  ',
      ],
    },
  },
  {
    id: 'unicorn',
    name: 'Unicorn',
    rarity: 'legendary',
    weight: 150,
    sprites: {
      baby: p => hop(p, p.shut ? '  ▞███▌  ' : '  ▞▛█▜▌  ', p.apart ? ' ▝▘   ▝▘ ' : '  ▝▘ ▝▘  '),
      grown: p => [
        p.shut ? ' ▞▐█████▌' : ' ▞▐▛███▜▌',
        p.up ? '▚▜█████▛ ' : '▞▜█████▛ ',
        p.apart ? '▌▌     ▐▐' : ' ▌▌   ▐▐ ',
      ],
    },
  },
  {
    id: 'king',
    name: 'Clawd King',
    rarity: 'mythic',
    weight: 10,
    sprites: {
      // A golden crown over Clawd's face, arms raised for joy.
      baby: p => ['   ▙▟▙   ', p.shut ? '  ▐███▌  ' : '  ▐▛█▜▌  ', p.apart ? ' ▝▘   ▝▘ ' : '  ▝▘ ▝▘  '],
      grown: p => [
        ' ▗▙▟▙▟▙▖ ',
        `${p.up ? '▗' : '▝'}${p.shut ? '▐█████▌' : '▐▛███▜▌'}${p.up ? '▖' : '▘'}`,
        p.apart ? ' ▀▘   ▝▀ ' : '  ▀▘ ▝▀  ',
      ],
      accent: { row: 0, color: 'warning' },
    },
  },
]

/** The species that hatches at `now`: a roll seeded by the moment, weighted by rarity. */
export function hatchSpecies(now: number): string {
  let h = Math.floor(now) % 2_147_483_647 | 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h ^= h >>> 16
  let roll = (h >>> 0) % 10_000
  for (const s of PET_SPECIES) {
    if (roll < s.weight) return s.id
    roll -= s.weight
  }
  return PET_SPECIES[0]!.id
}

function spriteOf(stage: PetStage, species: string | null): (p: PetPose) => [string, string, string] {
  const sprites = PET_SPECIES.find(s => s.id === species)?.sprites ?? null
  if (stage === 'egg' || sprites === null) return PET_SPRITES[stage]
  return stage === 'baby' ? sprites.baby : sprites.grown
}

/** What a pet should feel, the strongest reason first. */
export function petMood(s: {
  now: number
  isWorking: boolean
  isCold: boolean
  turnEndedAt: number | null
  failedAt: number | null
  isHungry?: boolean
  pattedAt?: number | null
}): PetMood {
  if (s.pattedAt != null && s.now - s.pattedAt < PET_LOVED_MS) return 'loved'
  if (s.failedAt !== null && s.now - s.failedAt < PET_OOPS_MS) return 'oops'
  if (s.turnEndedAt !== null && s.now - s.turnEndedAt < PET_HAPPY_MS && !s.isWorking) return 'happy'
  if (s.isWorking) return 'work'
  if (s.isHungry === true) return 'sad'
  return s.isCold ? 'sleep' : 'idle'
}

/**
 * The pet in a yard `width` cells wide at `now`: three rows, each a list of
 * colored runs exactly that wide. Motion is placed by the clock, so the pet
 * moves at the same speed however often it is drawn.
 */
export function pet(
  shownMood: PetMood,
  now: number,
  isSweating: boolean,
  width: number = PET_WIDTH,
  stage: PetStage = 'adult',
  skin: string = 'classic',
  feeling: PetFeeling = 'fine',
  look: { species?: string | null; path?: string | null; accessory?: string | null } = {},
): { text: string; color: string }[][] {
  let mood = shownMood
  const w = Math.max(PET_WIDTH, Math.floor(width))
  const grid = Array.from({ length: 3 }, () => Array.from({ length: w }, () => ({ ch: ' ', color: '' })))
  const put = (row: number, col: number, ch: string, color: string) => {
    if (row < 0 || row > 2 || col < 0 || col >= w) return
    grid[row]![col] = { ch, color }
  }
  const beat = (ms: number) => Math.floor(now / ms)
  const room = w - PET_BODY - 1
  let x = Math.floor(room / 2)
  const pose: PetPose = { shut: beat(500) % 8 === 0, up: false, apart: false }
  const worn = PET_SKINS.find(k => k.id === skin) ?? PET_SKINS[0]!
  let body = worn.color

  // A worn-out pet at rest dozes off whatever the cache does.
  if (mood === 'idle' && feeling === 'exhausted') mood = 'sleep'
  // Eyes that show how it feels, as the left and right eye glyphs.
  let eyes: [string, string] | null = null
  // Where a rolling egg is between cells, and how far it leans.
  let egg = { half: 0, lean: 0 }

  if (mood === 'work') {
    // Paces its yard, legs swinging: a step every quarter second in the
    // band's yard, ten a second across a wide one so it gets somewhere.
    // An egg rolls the same way. Tired it drags its feet; worn out it crawls.
    const slow = feeling === 'exhausted' ? 4 : feeling === 'tired' || feeling === 'drained' ? 2 : 1
    const span = room * 2
    if (stage === 'egg') {
      // An egg rolls half a cell at a time, rocking forward and back.
      const halves = beat((w > PET_WIDTH ? 100 : 125) * slow) % (span * 2)
      const at = halves <= room * 2 ? halves : span * 2 - halves
      x = Math.floor(at / 2)
      const ahead = halves <= room * 2 ? 1 : -1
      const rock = Math.floor(halves / 2) % 4
      egg = { half: at % 2, lean: rock === 1 ? ahead : rock === 3 ? -ahead : 0 }
    } else {
      const step = beat((w > PET_WIDTH ? 100 : 250) * slow) % span
      x = step <= room ? step : span - step
    }
    pose.apart = beat(250 * slow) % 2 === 1
    if (feeling === 'tired' || feeling === 'drained' || feeling === 'exhausted') eyes = ['▀', '▀']
    if (feeling === 'stressed') eyes = ['▚', '▞']
  } else if (mood === 'idle') {
    if (feeling === 'tired' || feeling === 'drained' || feeling === 'sleepy') {
      // Heavy lids, and a yawn every few seconds.
      eyes = ['▀', '▀']
      const yawn = beat(1000) % (feeling === 'sleepy' ? 3 : 5) === 0
      if (yawn) {
        pose.shut = true
        put(0, x + PET_BODY, 'o', 'inactive')
      }
    } else if (feeling === 'stressed') {
      // Frowns and stamps, steam rising.
      eyes = ['▚', '▞']
      pose.apart = beat(300) % 2 === 0
      put(0, x - 1, beat(400) % 2 === 0 ? '#' : '×', 'error')
      put(0, x + PET_BODY, beat(400) % 2 === 0 ? '×' : '#', 'error')
    } else if (feeling === 'bored') {
      // Looks one way, then the other.
      eyes = beat(1500) % 2 === 0 ? ['▛', '▛'] : ['▜', '▜']
    }
  } else if (mood === 'happy') {
    // Jumps for joy on every other beat, with sparkles.
    pose.up = beat(300) % 2 === 0
    pose.apart = pose.up
    put(0, x + PET_BODY, pose.up ? '✦' : '✧', 'warning')
    put(0, x - 1, pose.up ? '✧' : '✦', 'warning')
  } else if (mood === 'loved') {
    // Eyes shut in bliss, a little wiggle, hearts rising one row at a time.
    pose.shut = true
    x += beat(250) % 2
    const rise = beat(400) % 3
    put(2 - rise, x + PET_BODY, '♥', 'error')
    put(rise === 0 ? 2 : rise - 1, x - 1, '♥', 'error')
  } else if (mood === 'oops') {
    // Shakes on the spot, red, with an exclamation.
    x += beat(100) % 2 === 0 ? 0 : 1
    pose.shut = false
    body = 'error'
    put(0, x + PET_BODY, '!', 'error')
  } else if (mood === 'sleep') {
    pose.shut = true
    body = 'subtle'
    // The z's rise, one row a second.
    const z = beat(1000) % 2
    put(1 - z, x + PET_BODY, z === 0 ? 'z' : 'Z', 'inactive')
  } else if (mood === 'sad') {
    // Hungry: grey, eyes down, and it asks for food now and then.
    pose.shut = beat(700) % 3 !== 0
    body = 'subtle'
    if (beat(2000) % 2 === 0) put(0, x + PET_BODY, '?', 'warning')
  }

  const accent = stage === 'egg' ? undefined : PET_SPECIES.find(k => k.id === look.species)?.sprites?.accent
  const shell = stage === 'egg' ? eggSprite(egg.half, egg.lean, pose.up) : null
  const lines = shell === null ? spriteOf(stage, look.species ?? null)(pose) : shell.rows
  // The face row has its eyes as ▛ then ▜; the body row has them the other way.
  const isFace = (line: string) => line.indexOf('▛') !== -1 && line.indexOf('▜') > line.indexOf('▛')
  // Where its head is: the row with its eyes, or its top row for a face drawn otherwise.
  const eyeRow = shell === null ? lines.findIndex(isFace) : -1
  const faceRow = shell !== null ? -1 : eyeRow !== -1 ? eyeRow : lines.findIndex(l => l.trim() !== '')
  const eyeCols = eyeRow === -1 ? [] : [lines[eyeRow]!.indexOf('▛'), lines[eyeRow]!.indexOf('▜')]
  // A patterned skin paints some cells of the body in its second color.
  const isPatterned = worn.pattern !== undefined && body === worn.color
  lines
    .map(line => (eyes === null || pose.shut || !isFace(line) ? line : line.replace('▛', eyes[0]).replace('▜', eyes[1])))
    .forEach((line, row) => {
      const color = accent !== undefined && accent.row === row ? accent.color : body
      Array.from(line).forEach((ch, i) => {
        if (ch === ' ') return
        const isMarked = isPatterned && color === body && skinMark(worn.pattern!.kind, row, i)
        put(row, x + i, ch, isMarked ? worn.pattern!.color : color)
      })
    })
  // The egg's shell is speckled: two pale spots on the skin's color.
  if (shell !== null && body !== 'subtle') {
    shell.spots.forEach((cols, row) => cols.forEach(col => put(row, x + col, grid[row]![x + col]!.ch, 'text')))
  }
  // A grown pet wears the mark of the way it grew up, where nothing else is.
  const way = PET_PATHS.find(p => p.id === look.path)
  if (way !== undefined && way.mark !== '' && (stage === 'adult' || stage === 'elder')) {
    const at = grid[way.row]?.[x - 1]
    if (at !== undefined && at.ch === ' ') put(way.row, x - 1, way.mark, way.color)
  }
  // What it wears, where the cells are free: the body's own edges set where.
  const gear = PET_ACCESSORIES.find(a => a.id === look.accessory)
  if (gear !== undefined && faceRow !== -1) {
    const ends = (row: number) => {
      const cells = Array.from(lines[row] ?? '')
      return { first: cells.findIndex(c => c !== ' '), last: cells.length - 1 - [...cells].reverse().findIndex(c => c !== ' ') }
    }
    const free = (row: number, col: number) => grid[row]?.[col]?.ch === ' '
    const face = ends(faceRow)
    const below = Math.min(2, faceRow + 1)
    if (gear.id === 'bow' && free(faceRow, x + face.last + 1)) put(faceRow, x + face.last + 1, '⋈', 'error')
    if (gear.id === 'flower' && free(faceRow, x + face.first - 1)) put(faceRow, x + face.first - 1, '✿', 'warning')
    if (gear.id === 'shades' && !pose.shut) for (const c of eyeCols) put(faceRow, x + c, '█', 'inactive')
    if (gear.id === 'sweater' && below !== faceRow) {
      Array.from(lines[below] ?? '').forEach((ch, i) => ch !== ' ' && put(below, x + i, ch, 'error'))
    }
    if (gear.id === 'wand') {
      const at = x + ends(below).last + 1
      if (free(below, at)) put(below, at, '╱', 'warning')
      // Its star sits above the stick, or beside it where an arm is in the way.
      if (free(below - 1, at + 1)) put(below - 1, at + 1, '✦', 'warning')
      else if (free(below, at + 1)) put(below, at + 1, '✦', 'warning')
    }
  }
  if (isSweating && mood !== 'sleep' && stage !== 'egg') {
    // A drop drips beside its head when the context fills up.
    put(0, x, beat(500) % 2 === 0 ? "'" : ',', 'suggestion')
  }

  return grid.map(line => {
    const runs: { text: string; color: string }[] = []
    for (const c of line) {
      const last = runs[runs.length - 1]
      if (last !== undefined && last.color === c.color) last.text += c.ch
      else runs.push({ text: c.ch, color: c.color })
    }
    return runs
  })
}

// ── Raising the pet ──────────────────────────────────────────────────

export type PetStage = PetLifeStage

/** The stages a pet grows through, by the days it has been looked after. */
export const PET_STAGES: { id: PetStage; name: string; fromDays: number }[] = [
  { id: 'egg', name: 'Egg', fromDays: 0 },
  { id: 'baby', name: 'Baby', fromDays: 1 },
  { id: 'kid', name: 'Kid', fromDays: 3 },
  { id: 'adult', name: 'Grown-up', fromDays: 7 },
  { id: 'elder', name: 'Elder', fromDays: 30 },
]
/** Turns before the egg hatches. */
export const PET_HATCH_TURNS = 3
/** Turns a day that still feed it; more on one day add nothing. */
export const PET_DAY_TURNS = 20
const DAY_MS = 86_400_000
const MAX_DAYS_KEPT = 400

export type PetHunger = 'full' | 'peckish' | 'hungry' | 'starving'

export type PetStats = {
  stage: PetStage
  stageName: string
  /** Days since it hatched from the first turn, counting today. */
  ageDays: number
  activeDays: number
  /** Days in a row with a turn, up to today or yesterday. */
  streak: number
  /** Days with a turn among the last seven, today included. */
  weekDays: number
  xp: number
  level: number
  levelFrom: number
  levelTo: number
  hunger: PetHunger
  /** Days with a pat among the last seven, today included. */
  patWeekDays: number
  /**
   * 0 to 5: how close you two are. A point for each of the last seven days
   * with a turn and each with a pat; two points a heart.
   */
  bond: number
  /** The next stage and how many more active days it needs, or null at the last. */
  next: { name: string; days: number } | null
}

/** The local calendar day of `ms`, as YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function newPetLife(now: number): PetLife {
  return {
    name: 'Clawd',
    bornAt: now,
    days: {},
    lastFedAt: null,
    turns: 0,
    skin: 'classic',
    accessory: null,
    achievements: {},
    pats: 0,
    lastPattedAt: null,
    patDays: {},
    species: null,
    path: null,
    hours: Array.from({ length: 24 }, () => 0),
    eggTurns: 0,
    eggAt: null,
    runs: 0,
    runBest: 0,
    lastRunAt: null,
  }
}

/** A saved pet read back; a missing or broken one starts over as a new egg. */
/** A saved day-to-count record, keeping only well-formed days. */
function dayCounts(saved: unknown): Record<string, number> {
  const days: Record<string, number> = {}
  if (saved !== null && typeof saved === 'object') {
    for (const [k, n] of Object.entries(saved as Record<string, unknown>)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof n === 'number' && n > 0) days[k] = Math.floor(n)
    }
  }
  return days
}

export function petLifeFrom(saved: unknown, now: number): PetLife {
  if (saved === null || typeof saved !== 'object') return newPetLife(now)
  const v = saved as Record<string, unknown>
  const days = dayCounts(v.days)
  return {
    name: typeof v.name === 'string' && v.name.trim() !== '' ? v.name.trim().slice(0, 24) : 'Clawd',
    bornAt: typeof v.bornAt === 'number' ? v.bornAt : now,
    days,
    lastFedAt: typeof v.lastFedAt === 'number' ? v.lastFedAt : null,
    turns: typeof v.turns === 'number' && v.turns >= 0 ? Math.floor(v.turns) : 0,
    skin: typeof v.skin === 'string' && PET_SKINS.some(k => k.id === v.skin) ? v.skin : 'classic',
    accessory: typeof v.accessory === 'string' && PET_ACCESSORIES.some(a => a.id === v.accessory) ? v.accessory : null,
    achievements: Object.fromEntries(
      Object.entries(v.achievements !== null && typeof v.achievements === 'object' ? v.achievements : {}).filter(
        ([id, at]) => PET_ACHIEVEMENTS.some(a => a.id === id) && typeof at === 'number',
      ),
    ) as Record<string, number>,
    pats: typeof v.pats === 'number' && v.pats >= 0 ? Math.floor(v.pats) : 0,
    lastPattedAt: typeof v.lastPattedAt === 'number' ? v.lastPattedAt : null,
    patDays: dayCounts(v.patDays),
    // A pet that hatched before there were species stays a Clawd.
    species:
      typeof v.species === 'string' && PET_SPECIES.some(s => s.id === v.species)
        ? v.species
        : typeof v.turns === 'number' && v.turns >= PET_HATCH_TURNS
          ? 'clawd'
          : null,
    path: typeof v.path === 'string' && PET_PATHS.some(p => p.id === v.path) ? v.path : null,
    hours: Array.from({ length: 24 }, (_, i) => {
      const n = Array.isArray(v.hours) ? v.hours[i] : 0
      return typeof n === 'number' && n > 0 ? Math.floor(n) : 0
    }),
    // Saves from before new eggs count every turn toward the first egg.
    eggTurns:
      typeof v.eggTurns === 'number' && v.eggTurns >= 0
        ? Math.floor(v.eggTurns)
        : typeof v.turns === 'number' && v.turns >= 0
          ? Math.floor(v.turns)
          : 0,
    eggAt: typeof v.eggAt === 'number' ? v.eggAt : null,
    runs: typeof v.runs === 'number' && v.runs >= 0 ? Math.floor(v.runs) : 0,
    runBest: typeof v.runBest === 'number' && v.runBest >= 0 ? Math.floor(v.runBest) : 0,
    lastRunAt: typeof v.lastRunAt === 'number' ? v.lastRunAt : null,
  }
}

/** The pet after one turn: fed now, and today counted as a day looked after. */
export function feedPet(life: PetLife, now: number): PetLife {
  const today = dayKey(now)
  const days = { ...life.days, [today]: (life.days[today] ?? 0) + 1 }
  const keys = Object.keys(days).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_DAYS_KEPT))) delete days[k]
  const hours = life.hours.slice()
  hours[hourOf(now)] = (hours[hourOf(now)] ?? 0) + 1
  return { ...life, days, hours, lastFedAt: now, turns: life.turns + 1, eggTurns: life.eggTurns + 1 }
}

/** XP needed to reach `level`. */
export function levelXp(level: number): number {
  return 50 * (level - 1) ** 2
}

/** Everything the pet is at `now`, from its record. */
export function petStats(life: PetLife, now: number): PetStats {
  const active = Object.keys(life.days).filter(k => (life.days[k] ?? 0) > 0)
  const activeDays = active.length
  const has = (offset: number) => (life.days[dayKey(now - offset * DAY_MS)] ?? 0) > 0

  let streak = 0
  for (let i = has(0) ? 0 : 1; has(i); i++) streak++
  let weekDays = 0
  let patWeekDays = 0
  for (let i = 0; i < 7; i++) {
    if (has(i)) weekDays++
    if ((life.patDays[dayKey(now - i * DAY_MS)] ?? 0) > 0) patWeekDays++
  }

  // Each day looked after: 20, and 5 a turn up to the day's cap; a streak adds 10 a day.
  const xp =
    active.reduce((sum, k) => sum + 20 + Math.min(PET_DAY_TURNS, life.days[k] ?? 0) * 5, 0) + streak * 10
  const level = Math.floor(Math.sqrt(xp / 50)) + 1

  const grown = [...PET_STAGES].reverse().find(s => s.id !== 'egg' && activeDays >= s.fromDays)
  const stage = life.eggTurns < PET_HATCH_TURNS || grown === undefined ? PET_STAGES[0]! : grown
  const after = PET_STAGES[PET_STAGES.indexOf(stage) + 1]
  const next =
    stage.id === 'egg'
      ? { name: 'Baby', days: 0 }
      : after === undefined
        ? null
        : { name: after.name, days: Math.max(0, after.fromDays - activeDays) }

  // An egg that has never been fed is not hungry yet.
  const fedAgo = life.lastFedAt === null ? 0 : now - life.lastFedAt
  const hunger: PetHunger =
    fedAgo < 4 * 3_600_000 ? 'full' : fedAgo < 24 * 3_600_000 ? 'peckish' : fedAgo < 72 * 3_600_000 ? 'hungry' : 'starving'

  const first = active.sort()[0]
  const ageDays = first === undefined ? 0 : Math.max(1, Math.round((Date.parse(dayKey(now)) - Date.parse(first)) / DAY_MS) + 1)

  return {
    stage: stage.id,
    stageName: stage.name,
    ageDays,
    activeDays,
    streak,
    weekDays,
    patWeekDays,
    xp,
    level,
    levelFrom: levelXp(level),
    levelTo: levelXp(level + 1),
    hunger,
    bond: Math.min(5, Math.ceil((weekDays + patWeekDays) / 2)),
    next,
  }
}

/** Turns on each of the last `count` days, oldest first, today last. */
export function petDays(life: PetLife, now: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => life.days[dayKey(now - (count - 1 - i) * DAY_MS)] ?? 0)
}

// ── Achievements and skins ───────────────────────────────────────────

export type PetAchievement = {
  id: string
  name: string
  hint: string
  /** Earned by petting rather than by a turn. */
  byPat?: true
  /** Earned by a run of Pet Run rather than by a turn. */
  byRun?: true
  /** Whether a turn (or a pat) at `now` that took the pet from `before` to `after` earns it. */
  earned: (s: { before: PetLife; after: PetLife; stats: PetStats; now: number }) => boolean
}

const hourOf = (ms: number) => new Date(ms).getHours()

export const PET_ACHIEVEMENTS: PetAchievement[] = [
  { id: 'hatched', name: 'Hatched', hint: 'Hatch the egg', earned: s => s.stats.stage !== 'egg' },
  { id: 'streak-3', name: 'Three in a row', hint: 'Use Claude 3 days in a row', earned: s => s.stats.streak >= 3 },
  { id: 'streak-7', name: 'Full week', hint: 'Use Claude 7 days in a row', earned: s => s.stats.streak >= 7 },
  { id: 'streak-30', name: 'Devoted', hint: 'Use Claude 30 days in a row', earned: s => s.stats.streak >= 30 },
  { id: 'grown', name: 'All grown up', hint: 'Look after it on 7 days', earned: s => s.stats.activeDays >= 7 },
  { id: 'elder', name: 'Wise old friend', hint: 'Look after it on 30 days', earned: s => s.stats.activeDays >= 30 },
  { id: 'meals-100', name: 'Hundred meals', hint: 'Finish 100 turns', earned: s => s.after.turns >= 100 },
  { id: 'meals-1000', name: 'Feast', hint: 'Finish 1,000 turns', earned: s => s.after.turns >= 1000 },
  {
    id: 'busy-day',
    name: 'Busy day',
    hint: 'Finish 20 turns in one day',
    earned: s => (s.after.days[dayKey(s.now)] ?? 0) >= PET_DAY_TURNS,
  },
  { id: 'night-owl', name: 'Night owl', hint: 'Finish a turn between midnight and 5 am', earned: s => hourOf(s.now) < 5 },
  {
    id: 'early-bird',
    name: 'Early bird',
    hint: 'Finish a turn between 5 and 7 am',
    earned: s => hourOf(s.now) >= 5 && hourOf(s.now) < 7,
  },
  {
    id: 'weekend',
    name: 'Weekend coder',
    hint: 'Finish a turn on a Saturday or Sunday',
    earned: s => [0, 6].includes(new Date(s.now).getDay()),
  },
  {
    id: 'comeback',
    name: 'Welcome back',
    hint: 'Come back after leaving it hungry for 3 days',
    earned: s => s.before.lastFedAt !== null && s.now - s.before.lastFedAt >= 72 * 3_600_000,
  },
  { id: 'pats-10', name: 'Good friend', hint: 'Pet it 10 times', byPat: true, earned: s => s.after.pats >= 10 },
  { id: 'pats-100', name: 'Best friends', hint: 'Pet it 100 times', byPat: true, earned: s => s.after.pats >= 100 },
  { id: 'run-200', name: 'Hurdler', hint: 'Score 200 in Pet Run', byRun: true, earned: s => s.after.runBest >= 200 },
  { id: 'run-1000', name: 'Marathon', hint: 'Score 1,000 in Pet Run', byRun: true, earned: s => s.after.runBest >= 1000 },
]

/** Each skin: the theme color the pet is painted in, and the achievement that unlocks it. */
export type SkinPattern = 'stripes' | 'stars' | 'candy'

/** Whether a patterned skin paints the sprite cell at `row`, `col` in its second color. */
function skinMark(kind: SkinPattern, row: number, col: number): boolean {
  if (kind === 'stripes') return col % 2 === 1
  if (kind === 'stars') return (row * 3 + col * 2) % 5 === 0
  return row % 2 === 1
}

/**
 * Colors the pet can wear: theme names, or fixed colors for the free ones a
 * theme leaves alone. A patterned skin paints part of the body in a second color.
 */
export const PET_SKINS: {
  id: string
  name: string
  color: string
  unlock: string | null
  pattern?: { kind: SkinPattern; color: string }
}[] = [
  { id: 'classic', name: 'Classic', color: 'claude', unlock: null },
  { id: 'sky', name: 'Sky', color: '#7ab8ff', unlock: null },
  { id: 'rose', name: 'Rose', color: '#f48fb1', unlock: null },
  { id: 'leaf', name: 'Leaf', color: '#9ccc65', unlock: null },
  { id: 'mint', name: 'Mint', color: 'success', unlock: 'streak-3' },
  { id: 'ocean', name: 'Ocean', color: 'suggestion', unlock: 'grown' },
  { id: 'grape', name: 'Grape', color: 'permission', unlock: 'weekend' },
  { id: 'midnight', name: 'Midnight', color: 'inactive', unlock: 'night-owl' },
  { id: 'ember', name: 'Ember', color: 'error', unlock: 'busy-day' },
  { id: 'ghost', name: 'Ghost', color: 'text', unlock: 'comeback' },
  { id: 'gold', name: 'Gold', color: 'warning', unlock: 'elder' },
  { id: 'tiger', name: 'Tiger', color: 'warning', unlock: 'streak-30', pattern: { kind: 'stripes', color: 'inactive' } },
  { id: 'galaxy', name: 'Galaxy', color: 'permission', unlock: 'meals-1000', pattern: { kind: 'stars', color: 'text' } },
  { id: 'candy', name: 'Candy', color: 'error', unlock: 'pats-100', pattern: { kind: 'candy', color: 'text' } },
]

/** What the pet can wear over its skin, one at a time, each won with an achievement. */
export const PET_ACCESSORIES: { id: string; name: string; unlock: string }[] = [
  { id: 'bow', name: 'Bow', unlock: 'hatched' },
  { id: 'flower', name: 'Flower', unlock: 'pats-10' },
  { id: 'wand', name: 'Wand', unlock: 'streak-7' },
  { id: 'shades', name: 'Shades', unlock: 'early-bird' },
  { id: 'sweater', name: 'Sweater', unlock: 'meals-100' },
]

/** Whether `life` may wear the accessory `id`. */
export function hasAccessory(life: PetLife, id: string): boolean {
  const gear = PET_ACCESSORIES.find(a => a.id === id)
  return gear !== undefined && life.achievements[gear.unlock] !== undefined
}

/** Whether `life` may wear the skin `id`. */
export function hasSkin(life: PetLife, id: string): boolean {
  const skin = PET_SKINS.find(k => k.id === id)
  return skin !== undefined && (skin.unlock === null || life.achievements[skin.unlock] !== undefined)
}

/**
 * The pet after a turn at `now`, fed, with the achievements it newly earned
 * recorded, and those achievements, in list order.
 */
export function feedAndAward(life: PetLife, now: number): { life: PetLife; earned: PetAchievement[] } {
  let fed = feedPet(life, now)
  const stage = petStats(fed, now).stage
  // The egg hatches into its species; grown up, it settles on the way it grew.
  if (stage !== 'egg' && fed.species === null) fed = { ...fed, species: hatchSpecies(now) }
  if ((stage === 'adult' || stage === 'elder') && fed.path === null) fed = { ...fed, path: choosePath(fed, now) }
  return award(life, fed, now, 'turn')
}

/**
 * Why a new egg cannot replace the pet at `now`, or null when it can: one a
 * day, and not while an egg is already waiting to hatch.
 */
export function newEggBlock(life: PetLife, now: number): string | null {
  if (life.species === null) return 'An egg is already waiting to hatch.'
  if (life.eggAt !== null && dayKey(life.eggAt) === dayKey(now)) return 'One new egg a day. Try again tomorrow.'
  return null
}

/**
 * The pet swapped for a new egg: what hatches and how it grows up are rolled
 * again; its days, level, achievements and skins stay.
 */
export function layNewEgg(life: PetLife, now: number): PetLife {
  return { ...life, species: null, path: null, eggTurns: 0, eggAt: now }
}

/** The pet after a pat at `now`, with the petting achievements it newly earned. */
export function patPet(life: PetLife, now: number): { life: PetLife; earned: PetAchievement[] } {
  const today = dayKey(now)
  const patDays = { ...life.patDays, [today]: (life.patDays[today] ?? 0) + 1 }
  const keys = Object.keys(patDays).sort()
  for (const k of keys.slice(0, Math.max(0, keys.length - 30))) delete patDays[k]
  return award(life, { ...life, pats: life.pats + 1, lastPattedAt: now, patDays }, now, 'pat')
}

/** The pet after a run of Pet Run that scored `score`: counted, kept if best, with what it earned. */
export function recordRun(life: PetLife, score: number, now: number): { life: PetLife; earned: PetAchievement[]; isBest: boolean } {
  const points = Math.max(0, Math.floor(score))
  const isBest = points > life.runBest
  const after = { ...life, runs: life.runs + 1, runBest: Math.max(life.runBest, points), lastRunAt: now }
  return { ...award(life, after, now, 'run'), isBest }
}

function award(
  life: PetLife,
  after: PetLife,
  now: number,
  by: 'turn' | 'pat' | 'run',
): { life: PetLife; earned: PetAchievement[] } {
  const stats = petStats(after, now)
  const earned = PET_ACHIEVEMENTS.filter(
    a =>
      (a.byPat === true ? 'pat' : a.byRun === true ? 'run' : 'turn') === by &&
      after.achievements[a.id] === undefined &&
      a.earned({ before: life, after, stats, now }),
  )
  if (earned.length === 0) return { life: after, earned }
  return {
    life: { ...after, achievements: { ...after.achievements, ...Object.fromEntries(earned.map(a => [a.id, now])) } },
    earned,
  }
}

// ── Feelings ─────────────────────────────────────────────────────────

/** How the pet feels over the day, as against its mood of the moment. */
export type PetFeeling = 'fine' | 'tired' | 'exhausted' | 'drained' | 'stressed' | 'sleepy' | 'bored'

export const PET_FEELINGS: Record<PetFeeling, { name: string; color: string; tip: string }> = {
  fine: { name: 'Fine', color: 'success', tip: 'All good.' },
  tired: { name: 'Tired', color: 'warning', tip: 'A short break would help.' },
  exhausted: { name: 'Worn out', color: 'error', tip: 'Time to stop for the day, or at least take a long break.' },
  drained: {
    name: 'Low on energy',
    color: 'warning',
    tip: 'Most of this session’s usage is spent. Its stamina comes back when the limit resets.',
  },
  stressed: { name: 'Stressed', color: 'error', tip: 'Several tools failed in a row. Step back for a moment, or give it a pat.' },
  sleepy: { name: 'Sleepy', color: 'suggestion', tip: "It's late. Bed soon?" },
  bored: { name: 'Bored', color: 'subtle', tip: 'Nothing to do for a while. Got a task, or a pat?' },
}

const MINUTE = 60_000
/** How long a pat soothes a stressed or bored pet. */
export const PET_SOOTHE_MS = 10 * MINUTE

/** How much of the last `windowMs` was spent in turns, in ms; a turn still running counts up to now. */
export function workIn(turns: readonly { startedAt: number; durationMs: number | null }[], now: number, windowMs: number): number {
  const from = now - windowMs
  return turns.reduce((sum, t) => {
    const end = t.durationMs === null ? now : t.startedAt + t.durationMs
    return sum + Math.max(0, Math.min(end, now) - Math.max(t.startedAt, from))
  }, 0)
}

/**
 * How the pet feels, the heaviest reason first: worn out by a very long day
 * or hours without a break, stressed by tools failing in a row, tired,
 * sleepy late at night, or bored when nothing has happened for a while.
 */
export function petFeeling(s: {
  now: number
  /** Turns finished today, across sessions. */
  todayTurns: number
  /** Time in turns over the last two and three hours. */
  work2h: number
  work3h: number
  /** Tool calls that failed in the last ten minutes. */
  failures: number
  /** Time since the last turn ended, or since the session started. */
  idleMs: number
  /** Time since it was last petted. */
  pattedAgo?: number
  /** Percent of the five-hour usage limit left, when the account has one. */
  stamina?: number | null
}): PetFeeling {
  // A pat soothes stress and boredom for a while; only rest cures tiredness.
  const isSoothed = s.pattedAgo !== undefined && s.pattedAgo < PET_SOOTHE_MS
  const stamina = s.stamina ?? 100
  if (s.todayTurns >= 60 || s.work3h >= 150 * MINUTE || stamina <= 0) return 'exhausted'
  if (stamina <= 20) return 'drained'
  if (s.failures >= 3 && !isSoothed) return 'stressed'
  if (s.todayTurns >= 30 || s.work2h >= 75 * MINUTE) return 'tired'
  const hour = new Date(s.now).getHours()
  if (hour >= 23 || hour < 5) return 'sleepy'
  if (s.idleMs >= 30 * MINUTE && !isSoothed) return 'bored'
  return 'fine'
}

// ── Stamina ──────────────────────────────────────────────────────────

/**
 * The pet's stamina: the share of the five-hour usage limit left, and when it
 * fills again; null off a subscription or before the first reading.
 */
export function petStamina(
  limits: readonly { kind: string; percentUsed: number; resetsAt?: string }[],
): { percent: number; refillsAt: number | null } | null {
  const window = limits.find(l => l.kind === 'five_hour')
  if (window === undefined) return null
  const at = window.resetsAt === undefined ? NaN : Date.parse(window.resetsAt)
  return {
    percent: Math.max(0, Math.min(100, Math.round(100 - window.percentUsed))),
    refillsAt: Number.isNaN(at) ? null : at,
  }
}

// ── Evolution ────────────────────────────────────────────────────────

/** How each way of growing up is earned: a habit, scored against its bar (1 meets it). */
export const PET_PATHS: {
  id: string
  name: string
  /** The mark it wears beside it, on `row`. */
  mark: string
  row: number
  color: string
  hint: string
  score: (life: PetLife, now: number) => number
}[] = [
  {
    id: 'owl',
    name: 'Night Owl',
    mark: '☾',
    row: 0,
    color: 'suggestion',
    hint: 'A third of your turns between 10 pm and 5 am',
    score: life => {
      const all = life.hours.reduce((a, b) => a + b, 0)
      const night = [22, 23, 0, 1, 2, 3, 4].reduce((a, h) => a + (life.hours[h] ?? 0), 0)
      return all === 0 ? 0 : night / all / 0.3
    },
  },
  {
    id: 'sprinter',
    name: 'Sprinter',
    mark: '»',
    row: 1,
    color: 'warning',
    hint: '15 turns a day on average',
    score: life => {
      const active = Object.values(life.days).filter(n => n > 0)
      return active.length === 0 ? 0 : active.reduce((a, b) => a + b, 0) / active.length / 15
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    mark: '∴',
    row: 0,
    color: 'permission',
    hint: '7 days in a row',
    score: (life, now) => petStats(life, now).streak / 7,
  },
  {
    id: 'cuddly',
    name: 'Cuddly',
    mark: '♡',
    row: 0,
    color: 'error',
    hint: '30 pats',
    score: life => life.pats / 30,
  },
  { id: 'balanced', name: 'All-rounder', mark: '', row: 0, color: 'text', hint: 'No habit stands out', score: () => 0 },
]

/** The way a pet grows up: the habit that most clears its bar, or All-rounder. */
export function choosePath(life: PetLife, now: number): string {
  let best = 'balanced'
  let top = 1
  for (const p of PET_PATHS) {
    const s = p.score(life, now)
    if (s >= top) {
      best = p.id
      top = s
    }
  }
  return best
}

// ── Stats ────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * A calendar of turns, `weeks` columns ending with this week, Sunday on top:
 * each cell 0 (none) to 4 (busiest), -1 for days still to come; and where
 * each month starts, by column.
 */
export function petHeatmap(
  days: Record<string, number>,
  now: number,
  weeks: number,
): { cells: number[][]; months: { col: number; name: string }[] } {
  const today = new Date(now)
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  const first = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() - (weeks - 1) * 7)
  const at = (col: number, row: number) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + col * 7 + row)
  const counts = Array.from({ length: weeks }, (_, col) =>
    Array.from({ length: 7 }, (_, row) => {
      const d = at(col, row)
      return d.getTime() > now ? -1 : (days[dayKey(d.getTime())] ?? 0)
    }),
  )
  const max = Math.max(1, ...counts.flat())
  const cells = counts.map(col => col.map(n => (n <= 0 ? n : Math.min(4, Math.max(1, Math.ceil((n / max) * 4))))))
  const months: { col: number; name: string }[] = []
  for (let col = 0; col < weeks; col++) {
    const month = at(col, 0).getMonth()
    if (col === 0 || month !== at(col - 1, 0).getMonth()) months.push({ col, name: MONTHS[month]! })
  }
  return { cells, months }
}

export type PetRange = 'all' | 'month' | 'week'

/** The pet's record over the last 7 or 30 days, or all time. */
export function petRangeStats(
  life: PetLife,
  now: number,
  range: PetRange,
): {
  turns: number
  activeDays: number
  spanDays: number
  mostActive: { day: string; turns: number } | null
  longestStreak: number
  pats: number
} {
  const allKeys = Object.keys(life.days).filter(k => (life.days[k] ?? 0) > 0).sort()
  const firstKey = allKeys[0]
  const span =
    range === 'week'
      ? 7
      : range === 'month'
        ? 30
        : firstKey === undefined
          ? 1
          : Math.max(1, Math.round((Date.parse(dayKey(now)) - Date.parse(firstKey)) / DAY_MS) + 1)
  const inRange = Array.from({ length: span }, (_, i) => dayKey(now - (span - 1 - i) * DAY_MS))
  let longest = 0
  let run = 0
  let mostActive: { day: string; turns: number } | null = null
  let turns = 0
  let activeDays = 0
  let pats = 0
  for (const k of inRange) {
    const n = life.days[k] ?? 0
    turns += n
    pats += life.patDays[k] ?? 0
    if (n > 0) {
      activeDays++
      run++
      longest = Math.max(longest, run)
      if (mostActive === null || n > mostActive.turns) mostActive = { day: k, turns: n }
    } else run = 0
  }
  return {
    turns,
    activeDays,
    spanDays: span,
    mostActive,
    longestStreak: longest,
    pats: range === 'all' ? Math.max(pats, life.pats) : pats,
  }
}

/** The hour of the day with the most turns, or null before any. */
export function favoriteHour(life: PetLife): number | null {
  let best: number | null = null
  life.hours.forEach((n, h) => {
    if (n > 0 && (best === null || n > (life.hours[best] ?? 0))) best = h
  })
  return best
}

/** A local calendar day as "Sep 23". */
export function shortDay(key: string): string {
  const [, m, d] = key.split('-')
  return `${MONTHS[Number(m) - 1] ?? ''} ${Number(d)}`
}
