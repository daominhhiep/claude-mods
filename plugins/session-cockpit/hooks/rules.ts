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

export type Theme = { id: string; name: string; note: string; colors: Record<string, string> }

// Each theme maps the Claude Code theme keys the mod paints with to colors of
// its own; "claude" keeps the keys, so the mod follows the person's theme.
export const THEMES: Theme[] = [
  { id: 'claude', name: 'Claude', note: 'Follows your Claude Code theme', colors: {} },
  {
    id: 'ocean',
    name: 'Ocean',
    note: 'Cool blues and teals',
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
    colors: {
      claude: '#e0e0e0', success: '#bdbdbd', warning: '#f5f5f5', error: '#ffffff',
      suggestion: '#9e9e9e', permission: '#9e9e9e', merged: '#cfcfcf',
      subtle: '#7a7a7a', inactive: '#5c5c5c',
    },
  },
]

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
