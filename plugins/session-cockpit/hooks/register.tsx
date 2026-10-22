import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren, SessionUsage } from 'claude-code'

import type { PetFeeling } from './rules'

import type {
  AgentCost,
  AgentNode,
  PrStatus,
  BlastRecord,
  CallRecord,
  CockpitTab,
  DiffStep,
  PetLife,
  PinnedSession,
  PromptCost,
  WeatherReading,
} from '../types'
import {
  AGENT_DONE,
  ago,
  bar,
  baseName,
  daysLeft,
  headsUp,
  humanPrompt,
  textOf,
  painter,
  THEMES,
  shimmer,
  spin,
  sweep,
  tween,
  TWEEN_MS,
  TYPE_MS,
  typed,
  tidySummary,
  toolIcon,
  toolLabel,
  cachedShare,
  clockLeft,
  contextPercent,
  detectBlast,
  parseBudget,
  prRefFrom,
  rollup,
  ttlMs,
  duration,
  findLastOpen,
  levelOf,
  lineDiff,
  money,
  relativeTo,
  BURST_MS,
  DEFAULT_EFFECTS,
  EFFECTS,
  FLASH_MS,
  burst,
  effectsFrom,
  pet,
  petMood,
  PET_WIDTH,
  PET_ACHIEVEMENTS,
  PET_HATCH_TURNS,
  PET_FEELINGS,
  PET_SKINS,
  dayKey,
  feedAndAward,
  petFeeling,
  workIn,
  hasSkin,
  petDays,
  petLifeFrom,
  petStats,
  newPetLife,
  waveColor,
  ringGlow,
  smoothBar,
  scale,
  sparkline,
  strip,
  summarize,
} from './rules'

const PANE = 'session-cockpit'
const TITLE = 'Cockpit'

const tab = atom({ plugin: 'session-cockpit', key: 'tab' } as const, 'weather')
const weather = atom({ plugin: 'session-cockpit', key: 'weather' } as const, [])
const blasts = atom({ plugin: 'session-cockpit', key: 'blasts' } as const, [])
const steps = atom({ plugin: 'session-cockpit', key: 'steps' } as const, [])
const step = atom({ plugin: 'session-cockpit', key: 'step' } as const, -1)
const calls = atom({ plugin: 'session-cockpit', key: 'calls' } as const, [])
const costs = atom({ plugin: 'session-cockpit', key: 'costs' } as const, [])
const tick = atom({ plugin: 'session-cockpit', key: 'tick' } as const, 0)
const cacheAt = atom({ plugin: 'session-cockpit', key: 'cacheAt' } as const, null)
const budget = atom({ plugin: 'session-cockpit', key: 'budget' } as const, null)
const budgetWarned = atom({ plugin: 'session-cockpit', key: 'budgetWarned' } as const, false)
const pr = atom({ plugin: 'session-cockpit', key: 'pr' } as const, null)
const prRef = atom({ plugin: 'session-cockpit', key: 'prRef' } as const, null)
const agents = atom({ plugin: 'session-cockpit', key: 'agents' } as const, [])
const modelInfo = atom({ plugin: 'session-cockpit', key: 'modelInfo' } as const, null)
const compactAt = atom({ plugin: 'session-cockpit', key: 'compactAt' } as const, null)
const compactWindow = atom({ plugin: 'session-cockpit', key: 'compactWindow' } as const, null)
const pins = atom({ plugin: 'session-cockpit', key: 'pins' } as const, [])
const pinScope = atom({ plugin: 'session-cockpit', key: 'pinScope' } as const, 'project')
const sessionId = atom({ plugin: 'session-cockpit', key: 'sessionId' } as const, null)
const keepDays = atom({ plugin: 'session-cockpit', key: 'keepDays' } as const, 30)
const frame = atom({ plugin: 'session-cockpit', key: 'frame' } as const, 0)
const paneFrame = atom({ plugin: 'session-cockpit', key: 'paneFrame' } as const, 0)
const theme = atom({ plugin: 'session-cockpit', key: 'theme' } as const, 'claude')
const effects = atom({ plugin: 'session-cockpit', key: 'effects' } as const, DEFAULT_EFFECTS)
const burstAt = atom({ plugin: 'session-cockpit', key: 'burst' } as const, null)
const flashAt = atom({ plugin: 'session-cockpit', key: 'flash' } as const, null)
const petLife = atom({ plugin: 'session-cockpit', key: 'petLife' } as const, newPetLife(0))

// How wide the band last drew, so the pet knows how far it can run in the chat.
let chatColumns = 80
// When the last reply that is typing out finishes; frames run fast until then.
let typingUntil = 0
// When each reply block was first drawn, so it types out once.
const firstSeen = new Map<string, number>()

const MAX_WEATHER = 60
const MAX_BLASTS = 30
const MAX_STEPS = 60
const MAX_CALLS = 300
const MAX_COSTS = 100
const TICK_MS = 5_000
const PR_POLL_MS = 60_000
const BUDGET_WARN = 0.8
const MAX_FILE_BYTES = 1_000_000
const PREVIEW_LINES = 12
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit'])
const FRAME_MS = 100
const WAVE_EDGE = ['claude', 'warning', 'success', 'suggestion', 'permission', 'error']
const EFFECTS_KEY = 'effects'
const TYPE_CHAR_MS = 8
const TYPE_MAX_MS = 1_200
const PINS_KEY = 'pins'
const THEME_KEY = 'theme'
const PET_KEY = 'petLife'
const WARN_DAYS = 7

// Five groups across the top; a group of several shows its own tabs below.
const GROUPS: { id: string; label: string; icon: string; tabs: { id: CockpitTab; label: string }[] }[] = [
  { id: 'weather', label: 'Context', icon: '◔', tabs: [{ id: 'weather', label: 'Context' }] },
  {
    id: 'work',
    label: 'Work',
    icon: '≡',
    tabs: [
      { id: 'log', label: 'Log' },
      { id: 'agents', label: 'Agents' },
      { id: 'blast', label: 'Guard' },
      { id: 'replay', label: 'Diff' },
    ],
  },
  { id: 'sessions', label: 'Pins', icon: '★', tabs: [{ id: 'sessions', label: 'Pins' }] },
  { id: 'pet', label: 'Pet', icon: '♥', tabs: [{ id: 'pet', label: 'Pet' }] },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙',
    tabs: [
      { id: 'theme', label: 'Theme' },
      { id: 'config', label: 'Effects' },
    ],
  },
]
// The tab last open in each group, so a group opens where it was left.
const lastInGroup = new Map<string, CockpitTab>()

async function savePins($: EngineInterface, list: PinnedSession[]): Promise<void> {
  await update($, pins, () => list)
  try {
    await $.store.set(PINS_KEY, list)
  } catch {
    // The pane still shows the list; it is saved again on the next change.
  }
}

/** Saves the pet after `change`, applied to the freshest copy: another session may have fed it. */
async function savePet($: EngineInterface, change: (life: PetLife) => PetLife): Promise<PetLife> {
  const now = await $.clock.now()
  let base = await read($, petLife)
  try {
    const stored = await $.store.get(PET_KEY)
    if (stored !== undefined) base = petLifeFrom(stored, now)
  } catch {
    // The copy in this session stands in.
  }
  const next = change(base)
  await update($, petLife, () => next)
  try {
    await $.store.set(PET_KEY, next)
  } catch {
    // Kept for this session; saved again on the next change.
  }
  return next
}

// When this session started, so a pet left alone from the start gets bored too.
let sessionStartedAt = 0
// The feelings already announced, by day, so each is toasted once a day.
const feltToday = new Set<string>()

/** How the pet feels at `now`, from today's turns, this session's work and its failures. */
async function feelingOf($: EngineInterface, life: PetLife, now: number): Promise<PetFeeling> {
  const turns = await read($, costs)
  const last = turns.at(-1)
  const lastEnd =
    last === undefined ? sessionStartedAt : last.durationMs === null ? now : last.startedAt + last.durationMs
  return petFeeling({
    now,
    todayTurns: life.days[dayKey(now)] ?? 0,
    work2h: workIn(turns, now, 2 * 3_600_000),
    work3h: workIn(turns, now, 3 * 3_600_000),
    failures: (await read($, calls)).filter(c => c.status === 'error' && c.startedAt >= now - 600_000).length,
    idleMs: Math.max(0, now - lastEnd),
  })
}

/** True while something moves: a prompt or agent runs, a guard waits, the cache is about to go cold. */
/** True while an effect plays: frames then run at full speed. */
async function isPlaying($: EngineInterface): Promise<boolean> {
  const now = await $.clock.now()
  if (now < typingUntil) return true
  const b = await read($, burstAt)
  if (b !== null && now - b.at < BURST_MS) return true
  const fl = await read($, flashAt)
  return fl !== null && now - fl.at < FLASH_MS
}

async function isBusy($: EngineInterface, cacheMs: number): Promise<boolean> {
  const list = await read($, costs)
  const last = list[list.length - 1]
  if (last !== undefined && last.durationMs === null) return true
  if ((await read($, agents)).some(a => a.endedAt === null)) return true
  if ((await read($, blasts)).some(b => b.outcome === 'waiting')) return true
  const now = await $.clock.now()
  const lastReading = (await read($, weather)).at(-1)
  if (lastReading !== undefined && now - lastReading.at < TWEEN_MS) return true
  if (last !== undefined && now - last.startedAt < last.text.length * TYPE_MS + 500) return true
  const warmAt = await read($, cacheAt)
  if (warmAt === null) return false
  const left = warmAt + cacheMs - (await $.clock.now())
  return left > 0 && left <= 60_000
}

function clockTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n)
}

async function readText($: EngineInterface, path: string): Promise<string | null> {
  try {
    const stat = await $.fs.stat(path)
    if (stat.size > MAX_FILE_BYTES) return null
    return await $.fs.read(path)
  } catch {
    return ''
  }
}

async function runPreview(
  $: EngineInterface,
  previews: { argv: string[]; label: string }[],
): Promise<string[]> {
  const out: string[] = []
  for (const p of previews) {
    try {
      const ran = await $.process.run(p.argv, { timeoutMs: 8000 })
      const lines = (ran.exitCode === 0 ? ran.stdout : ran.stderr)
        .split('\n')
        .filter(l => l.trim() !== '')
      const shown = lines.slice(0, PREVIEW_LINES)
      out.push(`${p.label}: ${lines.length === 0 ? '(nothing)' : ''}`.trimEnd())
      out.push(...shown.map(l => `  ${l}`))
      if (lines.length > shown.length) {
        out.push(`  … and ${lines.length - shown.length} more`)
      }
    } catch {
      out.push(`${p.label}: preview unavailable`)
    }
  }
  return out
}

async function recordWeather($: EngineInterface, usage: SessionUsage): Promise<void> {
  const { tokens, window, breakdown } = usage.context
  // Claude Code compacts at its own threshold, often well below the model's
  // window: measure against that when auto-compact is on.
  const threshold =
    breakdown !== undefined && breakdown.isAutoCompactEnabled
      ? (breakdown.autoCompactThreshold ?? null)
      : null
  await update($, compactAt, () => threshold)
  // The window auto-compact works in (the model's, or a smaller one set in
  // settings or the environment) and where that was set.
  await update($, compactWindow, () =>
    breakdown !== undefined && breakdown.isAutoCompactEnabled && breakdown.rawMaxTokens > 0
      ? { tokens: breakdown.rawMaxTokens, source: breakdown.autocompactSource }
      : null,
  )
  if (tokens !== undefined) {
    const percent = contextPercent(tokens, window, threshold)
    const reading: WeatherReading = {
      at: await $.clock.now(),
      percent,
      tokens,
      window,
      compactAt: threshold,
      usd: usage.cost?.usd ?? null,
    }
    const history = await read($, weather)
    const prev = history[history.length - 1]
    await update($, weather, list => [...list, reading].slice(-MAX_WEATHER))

    const now = levelOf(percent)
    if (prev !== undefined && now.from >= 75 && levelOf(prev.percent).from < now.from) {
      $.ui.toast(`Context ${now.name}: ${percent}% used. Consider /compact.`)
    }
  }
}

async function limitOf($: EngineInterface, configured: number): Promise<number> {
  const override = await read($, budget)
  return override ?? configured
}

async function refreshPr($: EngineInterface): Promise<void> {
  // Only once this session has touched a pull request.
  const ref = await read($, prRef)
  if (ref === null) return
  const at = await $.clock.now()
  let branch = ''
  try {
    const b = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { timeoutMs: 5000 })
    if (b.exitCode !== 0) {
      await update($, pr, () => null)
      return
    }
    branch = b.stdout.trim()
  } catch {
    await update($, pr, () => null)
    return
  }

  const base: PrStatus = {
    at,
    branch,
    number: null,
    title: '',
    url: '',
    state: '',
    review: '',
    passed: 0,
    failed: 0,
    pending: 0,
    failing: [],
    problem: null,
  }
  try {
    const ran = await $.process.run(
      [
        'gh',
        'pr',
        'view',
        ...(ref === 'branch' ? [] : [ref]),
        '--json',
        'number,title,url,state,reviewDecision,statusCheckRollup',
      ],
      { timeoutMs: 15000 },
    )
    if (ran.exitCode !== 0) {
      const err = ran.stderr.toLowerCase()
      const problem = err.includes('no pull requests found')
        ? null
        : err.includes('auth') || err.includes('login')
          ? 'GitHub CLI is not signed in. Run gh auth login.'
          : 'Could not read the pull request.'
      await update($, pr, () => ({ ...base, problem }))
      return
    }
    const j = JSON.parse(ran.stdout) as {
      number: number
      title: string
      url: string
      state: string
      reviewDecision: string | null
      statusCheckRollup: Parameters<typeof rollup>[0] | null
    }
    await update($, pr, () => ({
      ...base,
      number: j.number,
      title: j.title,
      url: j.url,
      state: j.state,
      review: j.reviewDecision ?? '',
      ...rollup(j.statusCheckRollup ?? []),
    }))
  } catch {
    await update($, pr, () => ({ ...base, problem: 'GitHub CLI is not installed.' }))
  }
}

async function refreshAgents($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const list = await $.agent.list()
  await update($, agents, prev => {
    const known = new Map(prev.map(a => [a.id, a]))
    const merged: AgentNode[] = list.map(a => {
      const old = known.get(a.id)
      const isDone = AGENT_DONE.has(a.status)
      return {
        id: a.id,
        parentId: a.parentId ?? null,
        label: a.name ?? a.type,
        description: a.description,
        status: a.status,
        startedAt: old?.startedAt ?? now,
        endedAt: isDone ? (old?.endedAt ?? now) : null,
        tool: isDone ? null : (old?.tool ?? null),
        tools: old?.tools ?? 0,
        uncached: old?.uncached ?? 0,
        cacheRead: old?.cacheRead ?? 0,
        cacheWrite: old?.cacheWrite ?? 0,
        output: old?.output ?? 0,
      }
    })
    // Keep agents the engine no longer lists, as finished.
    for (const old of prev) {
      if (!merged.some(m => m.id === old.id)) {
        merged.push({ ...old, endedAt: old.endedAt ?? now, tool: null })
      }
    }
    return merged.slice(-100)
  })
}

export const register: Register = (on, options) => {
  const configuredBudget = typeof options.budgetUsd === 'number' ? options.budgetUsd : 0
  const cacheMs = ttlMs(options.cacheTtl)
  const redrawTranscript = options.transcriptStyle !== 'claude'
  const notifyHeadsUp = options.notifyHeadsUp !== false
  let lastHeadsUp: string | null = null
  let cwd = ''

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    await $.command.register({
      name: 'cockpit',
      description: 'Open the cockpit pane: context, guard, changes, activity',
    })
    await $.command.register({
      name: 'budget',
      description: 'Show or set this session\'s spending limit, e.g. /budget 20 or /budget off',
      argumentHint: '[amount|off]',
    })
    await $.command.register({
      name: 'pin',
      description: 'Pin this session, and name it, e.g. /pin finance export',
      argumentHint: '[name]',
    })
    await $.command.register({
      name: 'unpin',
      description: 'Unpin this session',
    })
    await $.command.register({
      name: 'pet',
      description: 'See how your pet is doing, or name it, e.g. /pet Mochi',
      argumentHint: '[name]',
    })
    try {
      const id = await $.session.id()
      await update($, sessionId, () => id)
      const saved = await $.store.get(PINS_KEY)
      if (Array.isArray(saved)) await update($, pins, () => saved as PinnedSession[])
      const savedTheme = await $.store.get(THEME_KEY)
      if (typeof savedTheme === 'string') await update($, theme, () => savedTheme)
      const savedEffects = await $.store.get(EFFECTS_KEY)
      if (savedEffects !== undefined) await update($, effects, () => effectsFrom(savedEffects))
      const days = await $.settings.read({ key: 'cleanupPeriodDays' })
      if (typeof days === 'number' && days > 0) await update($, keepDays, () => days)
    } catch {
      // Pins load on the next session start.
    }
    // The pet loads on its own, so a failing read above never leaves it unborn.
    const bornAt = await $.clock.now()
    sessionStartedAt = bornAt
    await savePet($, l => (l.bornAt === 0 ? { ...l, bornAt } : l))
    void $.ui.open({ id: PANE, title: TITLE })
    try {
      const model = await $.session.model()
      await update($, modelInfo, old => old ?? { model, effort: null })
    } catch {
      // No model reading yet: the first request fills it in.
    }
    // Keeps the clocks above the prompt current.
    $.clock.every(TICK_MS, () => {
      void update($, tick, n => n + 1)
    })
    $.clock.every(PR_POLL_MS, () => {
      void refreshPr($)
    })
    // Drives the spinners and the cache pulse, only while something moves.
    let beats = 0
    $.clock.every(FRAME_MS, () => {
      beats += 1
      void (async () => {
        // Ten frames a second while something moves, two at rest. Motion is
        // placed by the clock, not by the frame count, so a change of pace
        // never changes its speed. The pane, heavier to draw, moves at two a
        // second at most, one at rest.
        const moving = (await isPlaying($)) || (await isBusy($, cacheMs))
        if (!moving && beats % 5 !== 0) return
        await update($, frame, n => n + 1)
        if (beats % (moving ? 5 : 10) === 0) await update($, paneFrame, n => n + 1)
      })()
    })

    return next(e)
  })

  on('command.run', { command: 'pin' }, async ($, e) => {
    const id = await read($, sessionId)
    if (id === null) {
      return { text: 'Could not read this session\'s id, so it was not pinned. Try again after the next reply.' }
    }
    const name = e.args.trim() === '' ? null : e.args.trim().slice(0, 80)
    const list = await read($, pins)
    const first = (await read($, costs)).find(p => humanPrompt(p.text) !== '')
    const now = await $.clock.now()
    const usd = (await $.session.usage()).cost?.usd ?? null
    const old = list.find(p => p.id === id)
    const entry: PinnedSession = {
      id,
      name: name ?? old?.name ?? null,
      title: old?.title ?? (first === undefined ? baseName(cwd) : humanPrompt(first.text).slice(0, 120)),
      cwd,
      pinnedAt: old?.pinnedAt ?? now,
      lastActive: now,
      usd,
    }
    await savePins($, [entry, ...list.filter(p => p.id !== id)])
    let renamed = true
    if (name !== null) {
      try {
        await $.command.run({ command: 'rename', args: name })
      } catch {
        renamed = false
      }
    }
    const label = entry.name ?? entry.title
    return {
      text:
        `Pinned "${label}". Open it later from /cockpit (Sessions), or with /resume ${name !== null && renamed ? name : id}.` +
        (name !== null && !renamed ? ` Run /rename ${name} so /resume shows the name too.` : ''),
    }
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const name = String(e.args ?? '').trim()
    const now = await $.clock.now()
    if (name === '') {
      const life = await savePet($, l => l)
      const st = petStats(life, now)
      return {
        text: `${life.name} is a ${st.stageName.toLowerCase()} at level ${st.level}: ${st.hunger}, ${st.streak}-day streak, ${
          Object.keys(life.achievements).length
        } of ${PET_ACHIEVEMENTS.length} achievements. The Pet tab in /cockpit shows the rest.`,
      }
    }
    const life = await savePet($, l => ({ ...l, name: name.slice(0, 24) }))
    return { text: `Your pet is now called ${life.name}.` }
  })

  on('command.run', { command: 'unpin' }, async $ => {
    const id = await read($, sessionId)
    const list = await read($, pins)
    if (id === null || !list.some(p => p.id === id)) return { text: 'This session is not pinned.' }
    await savePins($, list.filter(p => p.id !== id))
    return { text: 'Unpinned this session. Its transcript is kept as usual.' }
  })

  on('command.run', { command: 'budget' }, async ($, e) => {
    const parsed = parseBudget(e.args)
    const spent = (await $.session.usage()).cost?.usd ?? 0
    if (parsed === 'invalid') {
      return { text: 'That is not an amount. Use a number of dollars, e.g. /budget 20, or /budget off.' }
    }
    if (parsed === null) {
      const limit = await limitOf($, configuredBudget)
      return {
        text:
          limit > 0
            ? `Budget $${limit.toFixed(2)}, spent ${money(spent)}.`
            : `No budget set, spent ${money(spent)}. Set one with /budget 20.`,
      }
    }
    await update($, budget, () => parsed)
    await update($, budgetWarned, () => false)
    return {
      text:
        parsed === 0
          ? 'Budget off for this session.'
          : `Budget set to $${parsed.toFixed(2)} for this session (spent ${money(spent)}).`,
    }
  })

  // ── Model and effort of the main loop's requests ───────────────────
  // Reads the request's model and effort as it goes out; changes nothing.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const effort = e.effort === undefined ? null : String(e.effort)
      await update($, modelInfo, () => ({ model: e.model, effort }))
    }
    return yield* next(e)
  })

  // ── Budget guard ───────────────────────────────────────────────────
  on('tool.check', async ($, e, next) => {
    const limit = await limitOf($, configuredBudget)
    if (limit <= 0) return next(e)
    const spent = (await $.session.usage()).cost?.usd ?? 0
    if (spent >= limit) {
      return {
        decision: 'deny',
        reason: `Session budget of $${limit.toFixed(2)} reached (${money(spent)} spent). The person can raise it with /budget <amount>.`,
      }
    }
    if (spent >= limit * BUDGET_WARN && !(await read($, budgetWarned))) {
      await update($, budgetWarned, () => true)
      $.ui.toast(`${money(spent)} of your $${limit.toFixed(2)} budget used.`)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // ── Live subagent tree ─────────────────────────────────────────────
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    await refreshAgents($)
    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'cockpit' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: 'Cockpit opened.' }
  })

  // ── Cost, time and context weather per prompt ──────────────────────
  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) {
      const started = await next(e)
      await refreshAgents($)
      return started
    }
    const usage = await $.session.usage()
    const entry: PromptCost = {
      id: e.turnId,
      text: e.text.replace(/\s+/g, ' ').trim().slice(0, 200),
      startedAt: await $.clock.now(),
      durationMs: null,
      usdAtStart: usage.cost?.usd ?? null,
      usd: null,
      inputTokens: 0,
      outputTokens: 0,
      model: '',
      agents: [],
    }
    await update($, costs, list => [...list, entry].slice(-MAX_COSTS))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = e.usage
    const input = u ? u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens : 0
    const output = u ? u.output_tokens : 0

    if (e.agentId !== undefined) {
      const agentId = e.agentId
      const info = (await $.agent.list()).find(a => a.id === agentId)
      const agent: AgentCost = {
        id: agentId,
        label: info ? info.type || info.description : 'subagent',
        durationMs: e.durationMs,
        inputTokens: input,
        outputTokens: output,
      }
      await update($, costs, list => {
        const at = findLastOpen(list)
        if (at < 0) return list
        return list.map((p, i) => (i === at ? { ...p, agents: [...p.agents, agent] } : p))
      })
      await refreshAgents($)
      if (u !== undefined) {
        await update($, agents, list =>
          list.map(a =>
            a.id === agentId
              ? {
                  ...a,
                  uncached: a.uncached + u.input_tokens,
                  cacheRead: a.cacheRead + u.cache_read_input_tokens,
                  cacheWrite: a.cacheWrite + u.cache_creation_input_tokens,
                  output: a.output + u.output_tokens,
                }
              : a,
          ),
        )
      }
      return result
    }

    if (e.usage !== undefined) {
      const at = await $.clock.now()
      await update($, cacheAt, () => at)
    }

    const usage = await $.session.usage({ breakdown: 'summary' })
    await recordWeather($, usage)
    const fx = await read($, effects)
    const readings = await read($, weather)
    const newest = readings.at(-1)
    const before = readings.at(-2)
    if (fx.flash && newest !== undefined && before !== undefined && levelOf(newest.percent).from > levelOf(before.percent).from) {
      const at = await $.clock.now()
      await update($, flashAt, () => ({ at, percent: newest.percent }))
    }
    const here = await read($, sessionId)
    const pinned = await read($, pins)
    if (here !== null && pinned.some(p => p.id === here)) {
      const at = await $.clock.now()
      await savePins(
        $,
        pinned.map(p => (p.id === here ? { ...p, lastActive: at, usd: usage.cost?.usd ?? p.usd } : p)),
      )
    }
    const usdNow = usage.cost?.usd ?? null
    await update($, costs, list =>
      list.map(p =>
        p.id === e.turnId
          ? {
              ...p,
              durationMs: e.durationMs,
              usd: usdNow === null || p.usdAtStart === null ? null : usdNow - p.usdAtStart,
              inputTokens: input,
              outputTokens: output,
              model: u?.model ?? '',
            }
          : p,
      ),
    )
    // Each turn feeds the pet, which is kept across sessions.
    {
      const at = await $.clock.now()
      let earned: typeof PET_ACHIEVEMENTS = []
      let before: PetLife | null = null
      const life = await savePet($, l => {
        before = l
        const r = feedAndAward(l, at)
        earned = r.earned
        return r.life
      })
      if (fx.pet && before !== null) {
        const was = petStats(before, at)
        const is = petStats(life, at)
        const news: string[] = []
        if (is.stage !== was.stage) {
          news.push(was.stage === 'egg' ? `${life.name} hatched!` : `${life.name} grew into a ${is.stageName.toLowerCase()}!`)
        } else if (is.level > was.level) news.push(`${life.name} reached level ${is.level}.`)
        for (const a of earned) {
          const skin = PET_SKINS.find(k => k.unlock === a.id)
          news.push(`Achievement: ${a.name}${skin === undefined ? '' : ` (new skin: ${skin.name})`}`)
        }
        // A heavy feeling is said once a day, when it first sets in.
        const feeling = await feelingOf($, life, at)
        const key = `${dayKey(at)}:${feeling}`
        if ((feeling === 'tired' || feeling === 'exhausted' || feeling === 'stressed') && !feltToday.has(key)) {
          feltToday.add(key)
          news.push(`${life.name} is ${PET_FEELINGS[feeling].name.toLowerCase()}. ${PET_FEELINGS[feeling].tip}`)
        }
        if (news.length > 0) $.ui.toast(news.join(' · '))
      }
    }
    if (fx.fireworks) {
      const turn = (await read($, costs)).find(p => p.id === e.turnId)
      const at = await $.clock.now()
      const spent = turn?.usd ?? null
      await update($, burstAt, () => ({
        at,
        text: `DONE ${duration(e.durationMs)}${spent === null ? '' : ` · ${money(spent)}`}`,
      }))
    }

    return result
  })

  // ── Blast-radius guard ─────────────────────────────────────────────
  on('tool.check', { tool: 'Bash' }, async ($, e, next) => {
    const input = e.input as { command?: unknown }
    const command = typeof input.command === 'string' ? input.command : ''
    const blast = detectBlast(command)
    if (blast === null) return next(e)

    // A call the person's own rules refuse stays refused: ask those rules
    // with a query of its own, never by reading what next(e) answers.
    const rules = await $.tool.check({ tool: e.tool, input: e.input })
    if (rules.decision === 'deny') return next(e)

    const preview = blast.preview ? await runPreview($, blast.preview) : []
    if (e.tool_use_id !== undefined) {
      const record: BlastRecord = {
        id: e.tool_use_id,
        at: await $.clock.now(),
        command,
        kind: blast.kind,
        preview,
        outcome: 'waiting',
      }
      await update($, blasts, list => [...list, record].slice(-MAX_BLASTS))
      await update($, tab, () => 'blast')
      void $.ui.open({ id: PANE, title: TITLE })
    }

    const shown = preview.slice(0, PREVIEW_LINES + 2).join('\n')
    return {
      decision: 'ask',
      decider: 'person',
      reason:
        `Guard: ${blast.kind}. Check what it affects before allowing.` +
        (shown === '' ? '' : `\n${shown}`),
    }
  }).catch(($, e, next) => ({
    decision: 'ask',
    decider: 'person',
    reason: 'Guard could not check this command. Review it before allowing.',
  }))

  // ── Activity log, change replay, guard outcomes ────────────────────
  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    const fields = e as unknown as Record<string, unknown>
    const startedAt = await $.clock.now()
    const record: CallRecord = {
      id: e.tool_use_id,
      tool,
      summary:
        tidySummary(summarize(tool, fields), cwd),
      startedAt,
      ms: null,
      status: 'running',
    }
    await update($, calls, list => [...list, record].slice(-MAX_CALLS))
    const agentId = e.agentId
    if (agentId !== undefined) {
      await update($, agents, list =>
        list.map(a => (a.id === agentId ? { ...a, tool: record.summary === '' ? tool : `${tool} · ${record.summary}`, tools: a.tools + 1 } : a)),
      )
    }

    const path = typeof fields.file_path === 'string' ? fields.file_path : null
    const before = EDIT_TOOLS.has(tool) && path !== null ? await readText($, path) : null

    const ran = await next(e)

    const ms = (await $.clock.now()) - startedAt
    const status: CallRecord['status'] =
      ran.deny !== undefined ? 'refused' : ran.isError ? 'error' : 'ok'
    await update($, calls, list =>
      list.map(c => (c.id === record.id ? { ...c, ms, status } : c)),
    )

    await update($, blasts, list =>
      list.map(b =>
        b.id === record.id && b.outcome === 'waiting'
          ? { ...b, outcome: status === 'ok' ? 'ran' : status === 'error' ? 'failed' : 'refused' }
          : b,
      ),
    )

    if (status === 'ok') {
      const found = prRefFrom(
        tool === 'Bash' ? String(fields.command ?? '') : '',
        typeof ran.text === 'string' ? ran.text.slice(0, 20_000) : '',
      )
      if (found !== null) {
        // A PR number wins over "the branch's PR"; a new number replaces the old.
        const current = await read($, prRef)
        if (current === null || found !== 'branch') await update($, prRef, () => found)
        void refreshPr($)
      }
    }

    if (status === 'ok' && before !== null && path !== null) {
      const after = await readText($, path)
      const d = after === null ? null : lineDiff(before, after)
      if (d !== null) {
        const entry: DiffStep = {
          id: record.id,
          at: startedAt,
          tool,
          path: relativeTo(cwd, path),
          ...d,
        }
        const list = await read($, steps)
        const kept = [...list, entry].slice(-MAX_STEPS)
        await update($, steps, () => kept)
        await update($, step, () => kept.length - 1)
      }
    }

    return ran
  }).catch(($, e, next) => next(e))

  // ── Context, cost, cache, PR and agents, always above the prompt ───
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    // What the plugins beneath draw here (You should know's notes among them)
    // stays, above the cockpit's frame.
    let below: Awaited<ReturnType<typeof next>> | null = null
    try {
      below = await next(e)
    } catch {
      // Nothing beneath drew: the frame stands alone.
    }
    const belowText = below === null ? '' : textOf(below)
    const note = headsUp(belowText)
    if (note !== null && note !== lastHeadsUp && notifyHeadsUp) {
      lastHeadsUp = note
      // A system notification where Claude Code can raise one; a toast where it
      // cannot (the desktop app answers no-surface) or the send failed.
      void (async () => {
        try {
          const sent = await $.ui.notify(note, { title: 'You should know' })
          // A bell alone shows no words: show them in a toast as well.
          if (sent.isSent && sent.channel !== 'terminal_bell') return
          // Notifications the person turned off stay off.
          if (!sent.isSent && sent.reason === 'disabled') return
        } catch {
          // Falls through to the toast.
        }
        $.ui.toast(`✦ ${note}`)
      })()
    } else if (note === null) {
      lastHeadsUp = null
    }
    await read($, tick)
    const now = await $.clock.now()
    const usage = await $.session.usage()
    const list = await read($, costs)
    const working = list.reduce(
      (sum, p) => sum + (p.durationMs ?? Math.max(0, now - p.startedAt)),
      0,
    )
    const last = list[list.length - 1]
    const isRunning = last !== undefined && last.durationMs === null
    const usd = usage.cost?.usd
    const limit = await limitOf($, configuredBudget)
    const limitAt = await read($, compactAt)
    const pct =
      usage.context.tokens === undefined
        ? undefined
        : contextPercent(usage.context.tokens, usage.context.window, limitAt)
    const readings = await read($, weather)
    const lastR = readings[readings.length - 1]
    const prevR = readings[readings.length - 2]
    const pctShown =
      pct === undefined
        ? undefined
        : lastR !== undefined && prevR !== undefined && now - lastR.at < TWEEN_MS
          ? tween(prevR.percent, lastR.percent, now - lastR.at)
          : pct
    const level = pctShown === undefined ? null : levelOf(pctShown)
    // The frame atom only asks for the redraw; where things are comes from the clock.
    await read($, frame)
    const f = Math.floor(now / FRAME_MS)
    const blink = (ms: number) => Math.floor(now / ms) % 2 === 0
    const warmAt = await read($, cacheAt)
    const left = warmAt === null ? null : warmAt + cacheMs - now
    const status = await read($, pr)
    const live = (await read($, agents)).filter(a => a.endedAt === null)
    const { Box, Text } = $.ui.resolve(e)
    const paint = painter(await read($, theme))

    const budgetColor =
      limit > 0 && usd !== undefined
        ? usd >= limit
          ? 'error'
          : usd >= limit * BUDGET_WARN
            ? 'warning'
            : 'claude'
        : 'claude'

    // One chip: a value in color, then a dim label, inline in its row.
    const chip = (key: string, value: RenderChildren, label?: string) => (
      <Text key={key}>
        {value}
        {label === undefined ? null : <Text color={paint('inactive')}> {label}</Text>}
      </Text>
    )
    // A value on a solid block of its color.
    const pill = (color: string, text: string) => (
      <Text backgroundColor={paint(color)} color={paint('inverseText')} bold>
        {` ${text} `}
      </Text>
    )
    const spaced = (items: RenderChildren[]) => items.flatMap((x, i) => (i === 0 ? [x] : ['   ', x]))

    const cacheShare = left === null ? 0 : Math.max(0, Math.min(1, left / cacheMs))
    const cacheCells = Math.round(cacheShare * 5)
    const cacheColor =
      left === null || left <= 0
        ? 'inactive'
        : left <= 60_000
          ? blink(500)
            ? 'warning'
            : 'error'
          : 'success'

    const firstChips = [
      level === null || pct === undefined
        ? null
        : chip('ctx', pill(level.color, `${level.icon} ${pctShown ?? pct}%`), limitAt === null ? 'context' : 'of compact limit'),
      usd === undefined
        ? null
        : chip(
            'cost',
            <Text>
              {pill(budgetColor, money(usd))}
              {limit > 0 ? <Text color={paint('subtle')}>{` / $${limit.toFixed(0)}`}</Text> : null}
            </Text>,
            'spent',
          ),
      left === null
        ? null
        : chip(
            'cache',
            isRunning ? (
              pill('success', '◷ warm')
            ) : left <= 0 ? (
              pill('inactive', '◷ cold')
            ) : (
              <Text>
                {pill(cacheColor, `◷ ${clockLeft(left)}`)}{' '}
                <Text color={paint(cacheColor)}>{'▰'.repeat(cacheCells)}</Text>
                <Text color={paint('inactive')}>{'▱'.repeat(5 - cacheCells)}</Text>
              </Text>
            ),
            'cache',
          ),
      chip(
        'time',
        <Text>
          <Text bold tabular>{duration(now - usage.startedAt)}</Text>
          <Text color={paint('inactive')}> session · </Text>
          <Text bold tabular>{duration(working)}</Text>
        </Text>,
        'working',
      ),
    ].filter(x => x !== null)

    const hasPr = status !== null && status.number !== null
    const info = await read($, modelInfo)
    const secondChips = [
      info === null
        ? null
        : chip(
            'model',
            <Text>
              <Text color={paint('claude')}>◆</Text> <Text bold>{info.model.replace(/^claude-/, '')}</Text>
              {info.effort === null ? null : (
                <Text>
                  <Text color={paint('inactive')}> · </Text>
                  <Text color={paint('suggestion')}>{info.effort}</Text>
                </Text>
              )}
            </Text>,
            info.effort === null ? 'model' : 'effort',
          ),
      !hasPr || status === null
        ? null
        : chip(
            'pr',
            <Text>
              <Text color={paint('claude')}>⑂ </Text>
              <Text bold>#{status.number}</Text>{' '}
              <Text color={paint('subtle')}>
                {status.title.length > 28 ? `${status.title.slice(0, 27)}…` : status.title}
              </Text>
            </Text>,
          ),
      !hasPr || status === null || status.passed + status.failed + status.pending === 0
        ? null
        : chip(
            'checks',
            <Text>
              {[
                status.passed > 0 ? <Text color={paint('success')}>✓ {status.passed}</Text> : null,
                status.failed > 0 ? <Text color={paint('error')}>✗ {status.failed}</Text> : null,
                status.pending > 0 ? <Text color={paint('warning')}>◌ {status.pending}</Text> : null,
              ]
                .filter(x => x !== null)
                .flatMap((x, i) => (i === 0 ? [x] : ['  ', x]))}
            </Text>,
            status.failing.length === 0
              ? 'checks'
              : `· ${
                  (status.failing[0] ?? '').length > 24
                    ? `${(status.failing[0] ?? '').slice(0, 23)}…`
                    : status.failing[0]
                }${status.failing.length > 1 ? ` +${status.failing.length - 1}` : ''} failing`,
          ),
      !hasPr || status === null
        ? null
        : status.state === 'MERGED'
          ? chip('rev', <Text color={paint('merged')}>● merged</Text>)
          : status.review === 'APPROVED'
            ? chip('rev', <Text color={paint('success')}>● approved</Text>)
            : status.review === 'CHANGES_REQUESTED'
              ? chip('rev', <Text color={paint('error')}>● changes requested</Text>)
              : status.review === 'REVIEW_REQUIRED'
                ? chip('rev', <Text color={paint('subtle')}>○ waiting for review</Text>)
                : null,
      live.length === 0
        ? null
        : chip(
            'agents',
            <Text color={paint('claude')} bold>
              {spin(f)} {live.length}
            </Text>,
            `${live.length === 1 ? 'agent' : 'agents'} · ${live[0]?.label ?? ''}${
              live.length > 1 ? ` +${live.length - 1}` : ''
            }`,
          ),
    ].filter(x => x !== null)

    // ── The frame, drawn by hand so its title sits on the border, with the
    // effects Settings · Effects turns on.
    const fx = await read($, effects)
    const boom = await read($, burstAt)
    const boomSince = boom === null ? Infinity : now - boom.at
    const isBoom = fx.fireworks && boom !== null && boomSince < BURST_MS
    const fl = await read($, flashAt)
    const flSince = fl === null ? Infinity : now - fl.at
    const isFlash = fx.flash && fl !== null && flSince < FLASH_MS
    const flLevel = fl === null ? null : levelOf(fl.percent)

    chatColumns = e.props.bodyColumns
    const W = Math.max(40, e.props.bodyColumns)
    const inner = W - 4
    const working2 = isRunning || e.props.isWorking

    // The pet lives at the right edge of the full frame when there is room to
    // spare; the rows narrow to make way for its yard, and a blank row stands
    // in for one the band has nothing to show in, so the pet always fits.
    const hasGauge = pctShown !== undefined && e.props.maxRows >= 5
    const hasSecond = secondChips.length > 0 && e.props.maxRows >= 4
    const showPet = fx.pet && e.props.maxRows >= 7 && inner >= 60
    const body = showPet ? inner - PET_WIDTH - 1 : inner
    const lastCall = (await read($, calls)).at(-1)
    // While Claude works the pet is out running in the chat, under the
    // spinner; its yard waits empty.
    const isPetAway = showPet && redrawTranscript && working2
    const life = await read($, petLife)
    const lifeStats = petStats(life, now)
    const feeling = showPet ? await feelingOf($, life, now) : 'fine'
    const petRows = isPetAway
      ? [0, 1, 2].map(() => [{ text: ' '.repeat(PET_WIDTH), color: '' }])
      : showPet
      ? pet(
          petMood({
            now,
            isWorking: working2,
            isCold: left !== null && left <= 0,
            turnEndedAt: last !== undefined && last.durationMs !== null ? last.startedAt + last.durationMs : null,
            failedAt:
              lastCall !== undefined && lastCall.status === 'error' && lastCall.ms !== null
                ? lastCall.startedAt + lastCall.ms
                : null,
            isHungry: lifeStats.hunger === 'hungry' || lifeStats.hunger === 'starving',
          }),
          now,
          pctShown !== undefined && pctShown >= 75,
          PET_WIDTH,
          lifeStats.stage,
          life.skin,
          feeling,
        )
      : null

    const gaugeRow = () => {
      if (pctShown === undefined) return null
      const g = smoothBar(pctShown, body)
      const filled = g.runs.reduce((n, r) => n + Array.from(r.text).length, 0)
      const at = working2 && filled > 0 ? f % (filled + 6) : -1
      const lit = isFlash && blink(250)
      // Cells of one color are drawn as one run: a few nodes, not one per cell.
      const runs: { text: string; color: string }[] = []
      let i = 0
      for (const r of g.runs) {
        for (const ch of Array.from(r.text)) {
          const here = i++
          const near = Math.abs(here - at)
          const base = lit ? 'text' : fx.wave && working2 ? waveColor(here, f) : r.color
          const color = near === 0 ? 'text' : near === 1 ? 'warning' : base
          const lastRun = runs[runs.length - 1]
          if (lastRun !== undefined && lastRun.color === color) lastRun.text += ch
          else runs.push({ text: ch, color })
        }
      }
      return (
        <Text wrap="truncate">
          {runs.map(r => (
            <Text color={paint(r.color)}>{r.text}</Text>
          ))}
          <Text color={paint(lit && flLevel !== null ? flLevel.color : 'inactive')}>{g.rest}</Text>
        </Text>
      )
    }

    const rows: RenderChildren[] = [<Text wrap="truncate-end">{spaced(firstChips)}</Text>]
    if (hasGauge) {
      const g = gaugeRow()
      if (g !== null) rows.push(g)
    }
    if (hasSecond) {
      rows.push(<Text wrap="truncate-end">{spaced(secondChips)}</Text>)
    }
    while (showPet && rows.length < 3) rows.push(<Text> </Text>)
    const R = rows.length
    if (isBoom && boom !== null) {
      // The firework takes the rows for its two seconds.
      const grid = burst(boomSince, body, R, Math.floor(boom.at / 1000))
      rows.splice(
        0,
        R,
        ...grid.map(line => {
          const out: RenderChildren[] = []
          let run = { ch: '', color: '' }
          for (const c of line) {
            if (c.color === run.color) run.ch += c.ch
            else {
              if (run.ch !== '') out.push(run.color === '' ? run.ch : <Text color={paint(run.color)} bold>{run.ch}</Text>)
              run = { ...c }
            }
          }
          if (run.ch !== '') out.push(run.color === '' ? run.ch : <Text color={paint(run.color)} bold>{run.ch}</Text>)
          return <Text wrap="truncate">{out}</Text>
        }),
      )
    }

    const P = 2 * W + 2 * R
    const cacheBreath =
      fx.breathe && !working2 && left !== null && left > 0 && left <= 60_000 ? blink(800) : null
    // The ring's light: two cells a frame while Claude works, one every half second at rest.
    const ringHead = working2 ? f * 2 : Math.floor(now / 500)
    const edge = (index: number) => {
      if (isFlash && flLevel !== null) return blink(250) ? flLevel.color : 'text'
      if (isBoom) return WAVE_EDGE[(Math.floor(index / 3) + f) % WAVE_EDGE.length]!
      const base = cacheBreath === null ? (working2 ? 'subtle' : 'inactive') : cacheBreath ? 'warning' : 'subtle'
      if (!fx.ring) return base
      const g = ringGlow(index, ringHead, P)
      return working2 ? (g === 2 ? 'text' : g === 1 ? 'claude' : base) : g === 2 ? 'suggestion' : g === 1 ? 'subtle' : base
    }
    type Cell = { ch: string; color: string; bold?: boolean }
    const draw = (cells: Cell[]) => {
      const out: RenderChildren[] = []
      let run: Cell | null = null
      for (const c of cells) {
        if (run !== null && run.color === c.color && run.bold === c.bold) run.ch += c.ch
        else {
          if (run !== null) out.push(<Text color={paint(run.color)} bold={run.bold}>{run.ch}</Text>)
          run = { ...c }
        }
      }
      if (run !== null) out.push(<Text color={paint(run.color)} bold={run.bold}>{run.ch}</Text>)
      return out
    }

    const titleCells: Cell[] = [
      { ch: '◆ ', color: 'claude', bold: true },
      ...shimmer('COCKPIT', working2 || isBoom ? f : null).map(r => ({
        ch: r.text,
        color: r.glow === 2 ? 'text' : r.glow === 1 ? 'warning' : 'claude',
        bold: true,
      })),
    ]
    // The right end of the top border: a level banner, the firework's line,
    // the running clock, or ready.
    const topStatus: RenderChildren =
      isFlash && flLevel !== null && fl !== null ? (
        <Text backgroundColor={paint(blink(250) ? flLevel.color : 'text')} color={paint('inverseText')} bold>
          {` ${flLevel.icon} ${flLevel.name.toUpperCase()} ${fl.percent}% `}
        </Text>
      ) : isBoom && boom !== null ? (
        <Text color={paint(blink(250) ? 'claude' : 'warning')} bold>
          {`✦ ${boom.text} ✦`}
        </Text>
      ) : last !== undefined && isRunning ? (
        <Text color={paint('warning')} bold>
          {`${spin(f)} running ${duration(now - last.startedAt)} ${sweep(Math.floor(f / 2), 6)}`}
        </Text>
      ) : (
        <Text color={paint('success')}>● ready</Text>
      )
    const head: Cell[] = [...Array.from('╭─ ').map((ch, col) => ({ ch, color: edge(col) })), ...titleCells]
    const dashCells = (from: number, count: number, at: (col: number) => number) =>
      Array.from({ length: Math.max(0, count) }, (_, k) => ({ ch: '─', color: edge(at(from + k)) }))
    // The dashes stretch or shrink to the room the engine gives the line, so
    // a glyph a terminal draws wide never pushes the corner off the end. They
    // wrap into a box one row high and the rest is clipped: a truncating Text
    // would end them with an ellipsis that jumps about as the status changes.
    const top = (
      <Box flexDirection="row">
        <Box flexShrink={0}>
          <Text>{draw(head)} </Text>
        </Box>
        <Box flexGrow={1} flexShrink={1} height={1} overflow="hidden">
          <Text>{draw(dashCells(head.length + 1, W, col => col))}</Text>
        </Box>
        <Box flexShrink={0}>
          <Text>
            {' '}
            {topStatus}
            <Text color={paint(edge(W - 2))}>{' ─'}</Text>
            <Text color={paint(edge(W - 1))}>╮</Text>
          </Text>
        </Box>
      </Box>
    )
    const bottom = (
      <Box flexDirection="row">
        <Box flexShrink={0}>
          <Text color={paint(edge(2 * W + R - 1))}>╰</Text>
        </Box>
        <Box flexGrow={1} flexShrink={1} height={1} overflow="hidden">
          <Text>{draw(dashCells(1, W, col => W + R + (W - 1 - col)))}</Text>
        </Box>
        <Box flexShrink={0}>
          <Text color={paint(edge(W + R))}>╯</Text>
        </Box>
      </Box>
    )

    const frameBox = (
      <Box flexDirection="column" marginTop={1}>
        {top}
        {rows.map((row, r) => (
          <Box key={`row-${r}`} flexDirection="row">
            <Box flexShrink={0}>
              <Text color={paint(edge(2 * W + R + (R - 1 - r)))}>{'│ '}</Text>
            </Box>
            <Box flexGrow={1} flexShrink={1} overflow="hidden">
              {row}
            </Box>
            {petRows === null ? null : (
              <Box flexShrink={0}>
                <Text>
                  {' '}
                  {(petRows[r] ?? []).map(p => (p.color === '' ? p.text : <Text color={paint(p.color)}>{p.text}</Text>))}
                </Text>
              </Box>
            )}
            <Box flexShrink={0}>
              <Text color={paint(edge(W + r))}>{' │'}</Text>
            </Box>
          </Box>
        ))}
        {bottom}
      </Box>
    )
    // Under another mod's note, or with little room, the band folds to one
    // row so the note reads whole and nothing scrolls.
    const isCompact = belowText !== '' || e.props.maxRows < 7
    const compactBox = (
      <Box flexDirection="row" marginTop={1}>
        <Box flexGrow={1} flexShrink={1} overflow="hidden">
          <Text wrap="truncate-end">
            <Text color={paint('claude')} bold>
              {'◆ '}
            </Text>
            {spaced(firstChips.slice(0, 3))}
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text>
            {'  '}
            {topStatus}
          </Text>
        </Box>
      </Box>
    )
    const shown = isCompact ? compactBox : frameBox
    return belowText === '' ? (
      shown
    ) : (
      <Box flexDirection="column">
        {below}
        {shown}
      </Box>
    )
  })

  // ── The transcript: the spinner, your prompts, tool rows ───────────
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!redrawTranscript || e.surface !== 'terminal' || e.props.message !== null) return next(e)
    const paint = painter(await read($, theme))
    await read($, frame)
    const now = await $.clock.now()
    const f = Math.floor(now / FRAME_MS)
    const last = (await read($, costs)).at(-1)
    const running = last !== undefined && last.durationMs === null ? last : null
    const usd = (await $.session.usage()).cost?.usd
    const spent =
      running !== null && running.usdAtStart !== null && usd !== undefined ? usd - running.usdAtStart : null
    const { Box, Text } = $.ui.resolve(e)
    const line = (
      <Text>
        <Text color={paint('claude')}>{spin(f)} </Text>
        {shimmer(e.props.word, f).map(r => (
          <Text color={paint(r.glow === 2 ? 'warning' : r.glow === 1 ? 'suggestion' : 'claude')} bold={r.glow > 0}>
            {r.text}
          </Text>
        ))}
        <Text color={paint('claude')}>…</Text>
        {running === null ? null : (
          <Text color={paint('inactive')}>
            {`  ${duration(now - running.startedAt)}`}
            {spent === null ? '' : ` · ${money(spent)}`}
            {`  ${sweep(Math.floor(f / 2), 5)}`}
          </Text>
        )}
      </Text>
    )
    if (!(await read($, effects)).pet) return line
    // The pet runs the width of the chat under the spinner while Claude works.
    const lastCall = (await read($, calls)).at(-1)
    const mood = petMood({
      now,
      isWorking: true,
      isCold: false,
      turnEndedAt: null,
      failedAt:
        lastCall !== undefined && lastCall.status === 'error' && lastCall.ms !== null
          ? lastCall.startedAt + lastCall.ms
          : null,
    })
    const readings = await read($, weather)
    const isSweating = (readings.at(-1)?.percent ?? 0) >= 75
    const life = await read($, petLife)
    return (
      <Box flexDirection="column">
        {line}
        {pet(mood, now, isSweating, chatColumns - 2, petStats(life, now).stage, life.skin, await feelingOf($, life, now)).map((row, r) => (
          <Box key={`pet-${r}`} height={1} overflow="hidden">
            <Text>{row.map(p => (p.color === '' ? p.text : <Text color={paint(p.color)}>{p.text}</Text>))}</Text>
          </Box>
        ))}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    // A new reply types out letter by letter; the markdown is Claude Code's.
    if (e.props.isSummary === true || !(await read($, effects)).typing) return next(e)
    const text = e.props.text
    const now = await $.clock.now()
    let first = firstSeen.get(e.requestId)
    if (first === undefined) {
      // Replies already on screen when the mod loads draw at once.
      const working = (await read($, costs)).some(p => p.durationMs === null)
      first = working ? now : 0
      if (firstSeen.size > 500) firstSeen.clear()
      firstSeen.set(e.requestId, first)
    }
    const total = Math.min(TYPE_MAX_MS, text.length * TYPE_CHAR_MS)
    const since = now - first
    if (since >= total) return next(e)
    typingUntil = Math.max(typingUntil, first + total)
    await read($, frame)
    const n = Math.max(1, Math.floor((text.length * since) / total))
    return next({ ...e, props: { ...e.props, text: `${text.slice(0, n)}▌` } })
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    // A typed prompt is drawn whole either way, so the expanded view needs no pass.
    if (!redrawTranscript || e.props.origin.kind !== 'composer') return next(e)
    const text = e.props.text
    if (text.trim() === '' || text.trim().startsWith('/')) return next(e)
    const paint = painter(await read($, theme))
    const key = text.replace(/\s+/g, ' ').trim().slice(0, 200)
    const match = (await read($, costs)).find(p => p.text === key)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text color={paint('claude')} bold>
            ▍ You
          </Text>
          {match === undefined ? null : (
            <Text color={paint('inactive')}>
              {`  ${clockTime(match.startedAt).slice(0, 5)}`}
              {match.durationMs === null ? '' : ` · ${duration(match.durationMs)}`}
              {match.usd === null ? '' : ` · ${money(match.usd)}`}
            </Text>
          )}
        </Text>
        <Box flexDirection="row">
          <Box flexShrink={0}>
            <Text color={paint('claude')}>▍ </Text>
          </Box>
          <Box flexGrow={1} flexShrink={1} backgroundColor="userMessageBackground" paddingX={1}>
            <Text color={paint('text')}>{text}</Text>
          </Box>
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    // The header row only: a standalone call's output is its own ToolResult row,
    // which stays Claude Code's.
    if (!redrawTranscript) return next(e)
    const paint = painter(await read($, theme))
    // Only a running row follows the frame; finished rows stay still and are
    // not redrawn on every tick.
    let f = 0
    if (e.props.isRunning) {
      await read($, frame)
      f = Math.floor((await $.clock.now()) / FRAME_MS)
    }
    const call = (await read($, calls)).find(c => c.id === e.requestId)
    const input =
      typeof e.props.input === 'object' && e.props.input !== null ? (e.props.input as Record<string, unknown>) : {}
    const summary = tidySummary(summarize(e.props.tool, input), cwd)
    const status = e.props.isRunning
      ? { icon: spin(f), color: 'warning' }
      : e.props.isInterrupted
        ? { icon: '⊘', color: 'inactive' }
        : e.props.isErrored
          ? { icon: '✗', color: 'error' }
          : { icon: '✓', color: 'success' }
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" gap={1}>
        <Box flexShrink={0}>
          <Text color={paint(status.color)}>{status.icon}</Text>
        </Box>
        <Box flexShrink={0}>
          <Text color={paint('claude')}>{toolIcon(e.props.tool)}</Text>
        </Box>
        <Box flexShrink={0}>
          <Text bold color={paint(e.props.isErrored ? 'error' : 'text')}>
            {toolLabel(e.props.tool)}
          </Text>
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <Text color={paint('subtle')} wrap="truncate-end">
            {summary}
          </Text>
        </Box>
        {call === undefined || call.ms === null || call.ms < 1000 ? null : (
          <Box flexShrink={0}>
            <Text color={paint('inactive')}>{duration(call.ms)}</Text>
          </Box>
        )}
        {e.props.isInterrupted ? (
          <Box flexShrink={0}>
            <Text color={paint('inactive')}>Interrupted</Text>
          </Box>
        ) : null}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // ── Pane ───────────────────────────────────────────────────────────
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Code } = $.ui.resolve(e)
    const paint = painter(await read($, theme))
    const current = await read($, tab)
    const width = Math.max(24, e.props.bodyColumns)
    const room = Math.max(4, e.props.scroll.bodyRows - 4)

    const rule = <Text color={paint('subtle')}>{'─'.repeat(width)}</Text>

    const heading = (title: string, meta?: string) => (
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>{title.toUpperCase()}</Text>
        {meta === undefined ? null : <Text color={paint('subtle')}>{meta}</Text>}
      </Box>
    )

    const empty = (icon: string, line: string, hint?: string) => (
      <Box flexDirection="column" paddingY={1}>
        <Text color={paint('subtle')}>
          {icon} {line}
        </Text>
        {hint === undefined ? null : <Text color={paint('inactive')}>{hint}</Text>}
      </Box>
    )

    const f = await read($, paneFrame)
    const allCosts = await read($, costs)
    const busy = allCosts.some(p => p.durationMs === null)
    // The groups keep to one row: every label when they fit, else the open
    // group named and the rest as icons, else icons alone.
    const group = GROUPS.find(g => g.tabs.some(t => t.id === current)) ?? GROUPS[0]!
    lastInGroup.set(group.id, current)
    const rowFits = (cells: number[]) => cells.reduce((n, c) => n + c + 1, 0) - 1 <= width
    const isNarrow = !rowFits(GROUPS.map(g => g.label.length + 2))
    const tabMode = !isNarrow
      ? 'label'
      : rowFits(GROUPS.map(g => (g === group ? g.label.length + 4 : 3)))
        ? 'mixed'
        : 'icon'
    const groupText = (g: (typeof GROUPS)[number]) =>
      tabMode === 'label' ? g.label : tabMode === 'mixed' && g === group ? `${g.icon} ${g.label}` : g.icon

    // Three cards across the top: context, cost, working time.
    await read($, tick)
    const nowHead = await $.clock.now()
    let usageHead: SessionUsage | null = null
    try {
      usageHead = await $.session.usage()
    } catch {
      // No reading: the cards show dashes.
    }
    const historyHead = await read($, weather)
    const limitHead = await read($, compactAt)
    const pctHead =
      usageHead?.context.tokens === undefined
        ? historyHead.at(-1)?.percent
        : contextPercent(usageHead.context.tokens, usageHead.context.window, limitHead)
    const usdHead = usageHead?.cost?.usd
    const workingHead = allCosts.reduce((s, p) => s + (p.durationMs ?? Math.max(0, nowHead - p.startedAt)), 0)
    const done = allCosts.filter(p => p.usd !== null)
    const topUsd = Math.max(0.0001, ...done.map(p => p.usd ?? 0))
    const cardWidth = Math.max(12, Math.floor((width - 2) / 3))
    const sparkRoom = Math.max(4, cardWidth - 4)
    const card = (key: string, color: string, value: string, foot: RenderChildren) => (
      <Box
        key={key}
        flexDirection="column"
        borderStyle="round"
        borderColor={paint(color)}
        paddingX={1}
        width={cardWidth}
        flexShrink={1}
        minWidth={12}
      >
        <Text color={paint(color)} bold tabular wrap="truncate-end">
          {value}
        </Text>
        <Text wrap="truncate-end">{foot}</Text>
      </Box>
    )
    const levelHead = pctHead === undefined ? null : levelOf(pctHead)
    const cards = (
      <Box flexDirection="row" columnGap={1} flexWrap="wrap">
        {card(
          'card-ctx',
          levelHead?.color ?? 'subtle',
          pctHead === undefined ? '—' : `${levelHead?.icon ?? ''} ${pctHead}%`,
          historyHead.length < 2 ? (
            <Text color={paint('inactive')}>context</Text>
          ) : (
            <Text color={paint(levelHead?.color ?? 'subtle')}>
              {sparkline(historyHead.slice(-sparkRoom).map(r => r.percent))}
            </Text>
          ),
        )}
        {card(
          'card-cost',
          'claude',
          usdHead === undefined ? '—' : money(usdHead),
          done.length < 2 ? (
            <Text color={paint('inactive')}>spent</Text>
          ) : (
            <Text color={paint('claude')}>
              {sparkline(done.slice(-sparkRoom).map(p => ((p.usd ?? 0) / topUsd) * 99))}
            </Text>
          ),
        )}
        {card(
          'card-time',
          busy ? 'warning' : 'success',
          duration(workingHead),
          <Text color={paint('inactive')}>
            {busy ? <Text color={paint('warning')}>{spin(f)} </Text> : null}
            working · {allCosts.length} {allCosts.length === 1 ? 'prompt' : 'prompts'}
          </Text>,
        )}
      </Box>
    )

    const tabs = (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>
            <Text color={paint('claude')}>◆ </Text>
            {shimmer('SESSION COCKPIT', busy ? f : null).map(r => (
              <Text color={paint(r.glow === 2 ? 'text' : r.glow === 1 ? 'warning' : 'claude')}>{r.text}</Text>
            ))}
          </Text>
          {busy ? (
            <Text color={paint('warning')} bold>
              {spin(f)} working {sweep(f, 4)}
            </Text>
          ) : (
            <Text color={paint(f % 2 === 0 ? 'success' : 'inactive')}>● idle</Text>
          )}
        </Box>
        <Box flexDirection="row" columnGap={1} marginTop={1} overflow="hidden">
          {GROUPS.map(g => (
            <Button
              key={`group-${g.id}`}
              plain
              onPress={() => update($, tab, () => lastInGroup.get(g.id) ?? g.tabs[0]!.id)}
            >
              {g === group ? (
                <Text backgroundColor={paint('claude')} color={paint('inverseText')} bold>
                  {` ${groupText(g)} `}
                </Text>
              ) : (
                <Text color={paint('subtle')}>{` ${groupText(g)} `}</Text>
              )}
            </Button>
          ))}
        </Box>
        {group.tabs.length < 2 ? null : (
          <Box flexDirection="row" marginTop={1} overflow="hidden">
            {group.tabs.flatMap((t, i) => [
              i === 0 ? null : (
                <Text key={`tab-gap-${t.id}`} color={paint('inactive')}>
                  {' · '}
                </Text>
              ),
              <Button key={`tab-${t.id}`} plain onPress={() => update($, tab, () => t.id)}>
                {t.id === current ? (
                  <Text color={paint('claude')} bold underline>
                    {t.label}
                  </Text>
                ) : (
                  <Text color={paint('subtle')}>{t.label}</Text>
                )}
              </Button>,
            ])}
          </Box>
        )}
        {rule}
        {cards}
      </Box>
    )

    let body
    if (current === 'weather') {
      await read($, tick)
      const history = await read($, weather)
      const last = history[history.length - 1]
      const now = await $.clock.now()
      const all = await read($, costs)
      const prompts = [...all].reverse().slice(0, Math.max(3, Math.floor(room / 3)))
      const barWidth = Math.max(20, width - 2)
      const totalMs = all.reduce((s, p) => s + (p.durationMs ?? Math.max(0, now - p.startedAt)), 0)

      let gauge
      // The live reading, the same one the band shows; the history only feeds
      // the trend and the ease after a turn.
      let live: { tokens?: number; window: number } = { window: last?.window ?? 0 }
      try {
        live = (await $.session.usage()).context
      } catch {
        // No live reading: the last turn's stands.
      }
      const limitAt = await read($, compactAt)
      const cw = await read($, compactWindow)
      const liveTokens = live.tokens ?? last?.tokens
      if (last === undefined && live.tokens === undefined) {
        gauge = empty('☁', 'No reading yet.', "It appears after Claude's first reply.")
      } else {
        const tokensNow = liveTokens ?? 0
        const livePct = contextPercent(tokensNow, live.window, limitAt)
        const before = history[history.length - 2]
        const shown =
          last !== undefined && before !== undefined && now - last.at < TWEEN_MS
            ? tween(before.percent, last.percent, now - last.at)
            : livePct
        const level = levelOf(shown)
        const g = smoothBar(shown, barWidth)
        gauge = (
          <Box flexDirection="column">
            <Box flexDirection="row" justifyContent="space-between">
              <Text color={paint(level.color)} bold>
                {level.icon} {level.name}
              </Text>
              <Text color={paint(level.color)} bold tabular>
                {shown}%
              </Text>
            </Box>
            <Text>
              {(() => {
                // While Claude works a light runs along the filled part.
                const filled = g.runs.reduce((n, r) => n + r.text.length, 0)
                const at = busy && filled > 0 ? f % (filled + 4) : -1
                let i = 0
                return g.runs.flatMap(r =>
                  Array.from(r.text).map(ch => {
                    const here = i++
                    const lit = here === at
                    return lit ? <Text color={paint('text')}>{ch}</Text> : <Text color={paint(r.color)}>{ch}</Text>
                  }),
                )
              })()}
              <Text color={paint('inactive')}>{g.rest}</Text>
            </Text>
            <Text color={paint('inactive')}>{scale(barWidth)}</Text>
            <Text>
              <Text tabular>{compact(tokensNow)}</Text>
              <Text color={paint('subtle')}>
                {limitAt === null
                  ? ` of ${compact(live.window)} tokens`
                  : ` of ${compact(limitAt)} before auto-compact`}
              </Text>
            </Text>
            {limitAt === null || cw === null ? null : (
              <Text color={paint('subtle')} wrap="truncate-end">
                {cw.tokens < live.window
                  ? `Compact window ${compact(cw.tokens)}${
                      cw.source === 'settings' ? ' (your setting)' : cw.source === 'env' ? ' (environment)' : ''
                    } · model ${compact(live.window)}`
                  : `Window ${compact(live.window)}`}
                {cw.tokens > limitAt ? ` · ${compact(cw.tokens - limitAt)} kept free` : ''}
              </Text>
            )}
            {history.length < 2 ? null : (
              <Text wrap="truncate-end">
                <Text color={paint('subtle')}>trend </Text>
                <Text color={paint(level.color)}>
                  {sparkline(history.slice(-Math.max(4, width - 8)).map(r => r.percent))}
                </Text>
              </Text>
            )}
          </Box>
        )
      }

      const perPrompt =
        prompts.length === 0 ? null : (
          <Box flexDirection="column">
            {heading(
              'By prompt',
              `${all.length} ${all.length === 1 ? 'prompt' : 'prompts'} · ${duration(totalMs)}`,
            )}
            {prompts.map(p => (
              <Box key={p.id} flexDirection="column" marginTop={1}>
                <Box flexDirection="row" gap={2}>
                  <Text color={paint('subtle')} tabular>
                    {clockTime(p.startedAt).slice(0, 5)}
                  </Text>
                  {p.durationMs === null ? (
                    <Text color={paint('warning')}>
                      {spin(f)} {duration(now - p.startedAt)}
                    </Text>
                  ) : (
                    <Text tabular>{duration(p.durationMs)}</Text>
                  )}
                  {p.usd === null ? null : (
                    <Text>
                      <Text color={paint('claude')} bold tabular>
                        {money(p.usd)}
                      </Text>{' '}
                      {(() => {
                        // Each prompt's cost against the dearest one so far.
                        const b = bar((p.usd / topUsd) * 100, 8)
                        return (
                          <Text>
                            <Text color={paint('claude')}>{b.fill}</Text>
                            <Text color={paint('inactive')}>{b.rest.replace(/ /g, '·')}</Text>
                          </Text>
                        )
                      })()}
                    </Text>
                  )}
                  {p.durationMs === null ? null : (
                    <Text color={paint('subtle')} tabular>
                      {compact(p.inputTokens)} in · {compact(p.outputTokens)} out
                    </Text>
                  )}
                </Box>
                <Text wrap="truncate-end">
                  <Text color={paint('subtle')}>{'└ '}</Text>
                  {humanPrompt(p.text) === '' ? (
                    <Text color={paint('inactive')}>(continued)</Text>
                  ) : humanPrompt(p.text).startsWith('⚙') || humanPrompt(p.text).startsWith('✉') ? (
                    <Text color={paint('inactive')}>{humanPrompt(p.text)}</Text>
                  ) : (
                    typed(humanPrompt(p.text), now - p.startedAt)
                  )}
                </Text>
                {p.agents.map(ag => (
                  <Text color={paint('subtle')} wrap="truncate-end">
                    {'    ↳ '}
                    <Text color={paint('suggestion')}>{ag.label}</Text> · {duration(ag.durationMs)} ·{' '}
                    {compact(ag.inputTokens)} in · {compact(ag.outputTokens)} out
                  </Text>
                ))}
              </Box>
            ))}
          </Box>
        )

      body = (
        <Box flexDirection="column" gap={1}>
          {gauge}
          {perPrompt}
        </Box>
      )
    } else if (current === 'agents') {
      await read($, tick)
      const now = await $.clock.now()
      const list = await read($, agents)
      const byParent = new Map<string | null, AgentNode[]>()
      for (const a of list) {
        const key = a.parentId !== null && list.some(x => x.id === a.parentId) ? a.parentId : null
        byParent.set(key, [...(byParent.get(key) ?? []), a])
      }
      const look = (a: AgentNode) =>
        a.endedAt === null
          ? { icon: spin(f), color: 'claude' }
          : a.status === 'completed'
            ? { icon: '✓', color: 'success' }
            : a.status === 'idle'
              ? { icon: '○', color: 'subtle' }
              : { icon: '✗', color: 'error' }
      const rows: { a: AgentNode; prefix: string; childPrefix: string }[] = []
      const walk = (parent: string | null, prefix: string) => {
        const kids = byParent.get(parent) ?? []
        kids.forEach((a, i) => {
          const isLast = i === kids.length - 1
          const childPrefix = prefix + (isLast ? '   ' : '│  ')
          rows.push({ a, prefix: prefix + (isLast ? '└─ ' : '├─ '), childPrefix })
          walk(a.id, childPrefix)
        })
      }
      walk(null, '')
      const running = list.filter(a => a.endedAt === null).length
      body =
        rows.length === 0
          ? empty('◌', 'No subagents yet.', 'Agents Claude starts show up here as a tree while they run.')
          : (
              <Box flexDirection="column" gap={1}>
                {heading('Agents', `${running} running · ${list.length} in all`)}
                <Box flexDirection="column">
                  <Text bold>
                    <Text color={paint('claude')}>◆</Text> Main conversation
                  </Text>
                  {rows.map(({ a, prefix, childPrefix }) => (
                    <Box key={a.id} flexDirection="column">
                      <Text wrap="truncate-end">
                        <Text color={paint('subtle')}>{prefix}</Text>
                        <Text color={paint(look(a).color)}>{look(a).icon} </Text>
                        <Text bold={a.endedAt === null}>{a.label}</Text>
                        <Text color={paint('subtle')}>
                          {' '}
                          {duration((a.endedAt ?? now) - a.startedAt)} · {a.tools}{' '}
                          {a.tools === 1 ? 'tool' : 'tools'}
                        </Text>
                      </Text>
                      <Text color={paint('subtle')} wrap="truncate-end">
                        {childPrefix + '  '}
                        {a.description}
                      </Text>
                      {a.uncached + a.cacheRead + a.cacheWrite + a.output === 0 ? null : (
                        <Text wrap="truncate-end">
                          <Text color={paint('subtle')}>{childPrefix + '  '}</Text>
                          <Text tabular>{compact(a.uncached + a.cacheRead + a.cacheWrite)}</Text>
                          <Text color={paint('subtle')}> in · </Text>
                          <Text tabular>{compact(a.output)}</Text>
                          <Text color={paint('subtle')}> out</Text>
                          {cachedShare(a) === null ? null : (
                            <Text>
                              <Text color={paint('subtle')}> · </Text>
                              <Text
                                color={paint(
                                  (cachedShare(a) ?? 0) >= 70
                                    ? 'success'
                                    : (cachedShare(a) ?? 0) >= 40
                                      ? 'warning'
                                      : 'error'
                                )}
                              >
                                {cachedShare(a)}% cached
                              </Text>
                            </Text>
                          )}
                        </Text>
                      )}
                      {a.endedAt !== null || a.tool === null ? null : (
                        <Text color={paint('claude')} wrap="truncate-end">
                          <Text color={paint('subtle')}>{childPrefix + '  '}</Text>↳ {a.tool}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )
    } else if (current === 'sessions') {
      await read($, tick)
      const now = await $.clock.now()
      const here = await read($, sessionId)
      const scope = await read($, pinScope)
      const keep = await read($, keepDays)
      const all = await read($, pins)
      const list = (scope === 'project' ? all.filter(p => p.cwd === cwd) : all).sort(
        (a, b) => b.lastActive - a.lastActive,
      )
      const isPinned = here !== null && all.some(p => p.id === here)
      const otherCount = all.filter(p => p.cwd !== cwd).length
      body = (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" columnGap={1} flexWrap="wrap">
            <Button
              key="pin-here"
              label={isPinned ? '★ Unpin this session' : '☆ Pin this session'}
              variant={isPinned ? 'secondary' : 'primary'}
              onPress={async () => {
                if (here === null) return
                if (isPinned) {
                  await savePins($, (await read($, pins)).filter(p => p.id !== here))
                  $.ui.toast('Unpinned this session.')
                  return
                }
                await $.prompt.fill({ text: '/pin ', mode: 'replace' })
                $.ui.toast('Type a name after /pin (optional), then press Enter.')
              }}
            />
            <Button
              key="pin-scope"
              label={scope === 'project' ? `All projects${otherCount > 0 ? ` (+${otherCount})` : ''}` : 'This project'}
              onPress={() => update($, pinScope, s => (s === 'project' ? 'all' : 'project'))}
            />
          </Box>
          {heading(
            scope === 'project' ? `Pinned · ${baseName(cwd)}` : 'Pinned · all projects',
            `${list.length} ${list.length === 1 ? 'session' : 'sessions'}`,
          )}
          {list.length === 0 ? (
            empty(
              '☆',
              'No pinned sessions here.',
              'Pin this one with /pin <name>. Pinned sessions stay one press away.',
            )
          ) : (
            <Box flexDirection="column" gap={1}>
              {list.map(p => {
                const left = daysLeft(p.lastActive, now, keep)
                const isHere = p.id === here
                return (
                  <Box
                    key={`pin-${p.id}`}
                    flexDirection="column"
                    borderStyle="round"
                    borderColor={paint(isHere ? 'claude' : left <= 2 ? 'error' : left <= WARN_DAYS ? 'warning' : 'subtle')}
                    paddingX={1}
                  >
                    <Box flexDirection="row" justifyContent="space-between">
                      <Text bold wrap="truncate-end">
                        <Text color={paint('claude')}>★ </Text>
                        {p.name ?? p.title}
                      </Text>
                      {isHere ? <Text color={paint('claude')}>● this session</Text> : null}
                    </Box>
                    {p.name === null ? null : (
                      <Text color={paint('subtle')} wrap="truncate-end">
                        {p.title}
                      </Text>
                    )}
                    <Text color={paint('inactive')} wrap="truncate-end">
                      {baseName(p.cwd)} · {ago(now - p.lastActive)}
                      {p.usd === null ? '' : ` · ${money(p.usd)}`}
                    </Text>
                    {left > WARN_DAYS ? null : (
                      <Text color={paint(left <= 2 ? 'error' : 'warning')} wrap="truncate-end">
                        {left <= 0
                          ? '⚠ May already be cleaned up. Raise cleanupPeriodDays or /export next time.'
                          : `⚠ Cleaned up in ${left} ${left === 1 ? 'day' : 'days'}. Open it to keep it, or /export it.`}
                      </Text>
                    )}
                    <Box flexDirection="row" columnGap={1} marginTop={1}>
                      {isHere ? null : (
                        <Button
                          key={`open-${p.id}`}
                          label="Open"
                          variant="primary"
                          onPress={async () => {
                            await $.prompt.fill({ text: `/resume ${p.id}`, mode: 'replace' })
                            $.ui.toast('Press Enter to open that session.')
                          }}
                        />
                      )}
                      <Button
                        key={`unpin-${p.id}`}
                        label="Unpin"
                        onPress={async () => {
                          await savePins($, (await read($, pins)).filter(x => x.id !== p.id))
                        }}
                      />
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      )
    } else if (current === 'blast') {
      const list = [...(await read($, blasts))].reverse()
      const look = {
        waiting: { icon: '◷', label: 'Waiting for you', color: 'warning' },
        ran: { icon: '✓', label: 'Ran', color: 'subtle' },
        failed: { icon: '✗', label: 'Ran with an error', color: 'error' },
        refused: { icon: '⊘', label: 'Not run', color: 'success' },
      } as const
      body =
        list.length === 0
          ? empty(
              '◇',
              'No risky commands so far.',
              'Deletes, force pushes, kubectl and Argo CD deletes, DROP and TRUNCATE stop here for your approval.',
            )
          : (
              <Box flexDirection="column" gap={1}>
                {heading('Guard', `${list.length} stopped`)}
                {list.slice(0, 8).map(b => (
                  <Box
                    key={b.id}
                    flexDirection="column"
                    borderStyle="round"
                    borderColor={paint(look[b.outcome].color)}
                    paddingX={1}
                  >
                    <Box flexDirection="row" justifyContent="space-between">
                      <Text color={paint(look[b.outcome].color)} bold>
                        {look[b.outcome].icon} {look[b.outcome].label}
                      </Text>
                      <Text color={paint('subtle')} tabular>
                        {clockTime(b.at)}
                      </Text>
                    </Box>
                    <Text bold>{b.kind}</Text>
                    <Text mono wrap="truncate-end">
                      <Text color={paint('claude')}>$ </Text>
                      {b.command}
                    </Text>
                    {b.preview.length === 0 ? null : (
                      <Box flexDirection="column" marginTop={1}>
                        {b.preview.map(line => (
                          <Text color={paint('subtle')} mono wrap="truncate-end">
                            {line}
                          </Text>
                        ))}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )
    } else if (current === 'replay') {
      const list = await read($, steps)
      const at = Math.min(Math.max(0, await read($, step)), list.length - 1)
      const s = list[at]
      if (s === undefined) {
        body = empty('✎', 'No file changes yet.', 'Each edit Claude makes shows up here as a diff.')
      } else {
        const slash = s.path.lastIndexOf('/')
        const dir = slash < 0 ? '' : s.path.slice(0, slash + 1)
        const file = slash < 0 ? s.path : s.path.slice(slash + 1)
        body = (
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap">
              <Box flexDirection="row" gap={1}>
                <Button
                  key="prev"
                  label="‹ Prev"
                  hotkey="p"
                  onPress={() => update($, step, n => Math.max(0, n - 1))}
                />
                <Button
                  key="next"
                  label="Next ›"
                  hotkey="n"
                  onPress={() => update($, step, n => Math.min(list.length - 1, n + 1))}
                />
                <Button
                  key="latest"
                  label="Latest"
                  hotkey="l"
                  onPress={() => update($, step, () => list.length - 1)}
                />
              </Box>
              <Text color={paint('subtle')} tabular>
                {at + 1} / {list.length}
              </Text>
            </Box>
            {list.length < 2 ? null : (
              <Text color={paint('claude')}>{strip(at, list.length, width)}</Text>
            )}
            <Box flexDirection="column">
              <Text wrap="truncate-start">
                <Text color={paint('subtle')}>{dir}</Text>
                <Text bold>{file}</Text>
              </Text>
              <Text>
                <Text color={paint('success')} bold>
                  +{s.added}
                </Text>{' '}
                <Text color={paint('error')} bold>
                  −{s.removed}
                </Text>
                <Text color={paint('subtle')}>
                  {'   '}
                  {s.tool} · {clockTime(s.at)}
                </Text>
              </Text>
            </Box>
            <Code
              source={s.diff}
              path={s.path}
              format={s.isCut ? 'source' : 'diff'}
              wrap="truncate-end"
            />
          </Box>
        )
      }
    } else if (current === 'pet') {
      const life = await read($, petLife)
      const nowPet = await $.clock.now()
      const st = petStats(life, nowPet)
      const isOn = (await read($, effects)).pet
      const feeling = await feelingOf($, life, nowPet)
      const hungerLook = {
        full: { label: 'Full', color: 'success' },
        peckish: { label: 'Peckish', color: 'claude' },
        hungry: { label: 'Hungry', color: 'warning' },
        starving: { label: 'Starving', color: 'error' },
      } as const
      const sprite = pet(
        petMood({
          now: nowPet,
          isWorking: busy,
          isCold: false,
          turnEndedAt: null,
          failedAt: null,
          isHungry: st.hunger === 'hungry' || st.hunger === 'starving',
        }),
        nowPet,
        false,
        Math.min(Math.max(PET_WIDTH, width), 28),
        st.stage,
        life.skin,
        feeling,
      )
      const barWidth = Math.max(8, Math.min(20, width - 24))
      const share = Math.max(0, Math.min(1, (st.xp - st.levelFrom) / Math.max(1, st.levelTo - st.levelFrom)))
      const filled = Math.round(share * barWidth)
      const days = petDays(life, nowPet, 14)
      const dayLook = (n: number) =>
        n === 0
          ? { ch: '·', color: 'inactive' }
          : n < 5
            ? { ch: '▃', color: 'subtle' }
            : n < 15
              ? { ch: '▅', color: 'claude' }
              : { ch: '█', color: 'success' }
      const growth =
        st.stage === 'egg'
          ? `Hatches after ${Math.max(1, PET_HATCH_TURNS - life.turns)} more ${PET_HATCH_TURNS - life.turns === 1 ? 'turn' : 'turns'}`
          : st.next === null
            ? 'Fully grown'
            : `${st.next.name} in ${st.next.days} more ${st.next.days === 1 ? 'day' : 'days'} of use`
      const earned = PET_ACHIEVEMENTS.filter(a => life.achievements[a.id] !== undefined).length
      const skinsOwned = PET_SKINS.filter(k => hasSkin(life, k.id)).length
      body = (
        <Box flexDirection="column" gap={1}>
          {heading(life.name, `${st.stageName} · level ${st.level}`)}
          <Box flexDirection="column">
            {sprite.map((row, r) => (
              <Text key={`pet-big-${r}`}>
                {row.map(x => (x.color === '' ? x.text : <Text color={paint(x.color)}>{x.text}</Text>))}
              </Text>
            ))}
          </Box>
          <Box flexDirection="column">
            <Text>
              <Text bold>{`Lv ${st.level} `}</Text>
              <Text color={paint('claude')}>{'▰'.repeat(filled)}</Text>
              <Text color={paint('inactive')}>{'▱'.repeat(barWidth - filled)}</Text>
              <Text color={paint('inactive')}>{` ${st.xp - st.levelFrom}/${st.levelTo - st.levelFrom} XP`}</Text>
            </Text>
            <Text>
              <Text color={paint('inactive')}>Food </Text>
              <Text color={paint(hungerLook[st.hunger].color)} bold>
                {hungerLook[st.hunger].label}
              </Text>
              <Text color={paint('inactive')}>{'   Mood '}</Text>
              <Text color={paint('error')}>{'●'.repeat(st.hearts)}</Text>
              <Text color={paint('inactive')}>{'○'.repeat(5 - st.hearts)}</Text>
            </Text>
            <Text wrap="wrap">
              <Text color={paint('inactive')}>Feeling </Text>
              <Text color={paint(PET_FEELINGS[feeling].color)} bold>
                {PET_FEELINGS[feeling].name}
              </Text>
              {feeling === 'fine' ? null : (
                <Text color={paint('inactive')}>{` · ${PET_FEELINGS[feeling].tip}`}</Text>
              )}
            </Text>
            <Text color={paint('inactive')} wrap="wrap">
              {`${st.ageDays} ${st.ageDays === 1 ? 'day' : 'days'} old · used on ${st.activeDays} ${
                st.activeDays === 1 ? 'day' : 'days'
              } · ${st.streak}-day streak`}
            </Text>
            <Text color={paint('subtle')}>{growth}</Text>
          </Box>
          <Box flexDirection="column">
            {heading('Last 14 days', 'today on the right')}
            <Text>
              {days.map(n => {
                const d = dayLook(n)
                return <Text color={paint(d.color)}>{`${d.ch} `}</Text>
              })}
            </Text>
          </Box>
          <Box flexDirection="column">
            {heading('Skins', `${skinsOwned} of ${PET_SKINS.length}`)}
            {PET_SKINS.map(k => {
              const owned = hasSkin(life, k.id)
              const worn = life.skin === k.id
              const need = PET_ACHIEVEMENTS.find(a => a.id === k.unlock)
              return (
                <Button
                  key={`skin-${k.id}`}
                  plain
                  onPress={async () => {
                    if (!owned) {
                      $.ui.toast(`${k.name} unlocks with the achievement ${need?.name ?? ''}: ${need?.hint ?? ''}.`)
                      return
                    }
                    await savePet($, l => ({ ...l, skin: k.id }))
                  }}
                >
                  <Text color={paint(worn ? 'claude' : 'subtle')} bold={worn}>
                    {worn ? '◉ ' : '○ '}
                  </Text>
                  <Text color={paint(owned ? k.color : 'inactive')}>{owned ? '███' : '░░░'}</Text>
                  <Text bold={worn} color={owned ? undefined : paint('inactive')}>{`  ${k.name}`}</Text>
                  {owned || need === undefined ? null : (
                    <Text color={paint('inactive')}>{`  · ${need.name}`}</Text>
                  )}
                </Button>
              )
            })}
          </Box>
          <Box flexDirection="column">
            {heading('Achievements', `${earned} of ${PET_ACHIEVEMENTS.length}`)}
            {PET_ACHIEVEMENTS.map(a => {
              const got = life.achievements[a.id] !== undefined
              return (
                <Text key={`ach-${a.id}`} wrap="truncate-end">
                  <Text color={paint(got ? 'success' : 'inactive')}>{got ? '✓ ' : '○ '}</Text>
                  <Text bold={got} color={got ? undefined : paint('subtle')}>{a.name}</Text>
                  <Text color={paint('inactive')}>{`  ${a.hint}`}</Text>
                </Text>
              )
            })}
          </Box>
          <Text color={paint('inactive')} wrap="wrap">
            {isOn
              ? 'Every turn feeds it. Each day you use Claude helps it grow, and days in a row earn extra XP. Name it with /pet and a name.'
              : 'The pet is hidden from the band; turn Claude pet on in Settings, under Effects, to see it there.'}
          </Text>
        </Box>
      )
    } else if (current === 'config') {
      const fx = await read($, effects)
      const save = async (next: typeof fx) => {
        await update($, effects, () => next)
        try {
          await $.store.set(EFFECTS_KEY, next)
        } catch {
          $.ui.toast('Changed for this session only; it could not be saved for the next one.')
        }
      }
      const allOn = EFFECTS.every(x => fx[x.id])
      body = (
        <Box flexDirection="column" gap={1}>
          {heading('Effects', 'saved for every session')}
          {EFFECTS.map(x => (
            <Box key={`fx-row-${x.id}`} flexDirection="column">
              <Button key={`fx-${x.id}`} plain onPress={() => save({ ...fx, [x.id]: !fx[x.id] })}>
                {fx[x.id] ? (
                  <Text backgroundColor={paint('success')} color={paint('inverseText')} bold>
                    {' ON  '}
                  </Text>
                ) : (
                  <Text backgroundColor={paint('inactive')} color={paint('inverseText')}>
                    {' OFF '}
                  </Text>
                )}
                <Text bold={fx[x.id]} color={fx[x.id] ? undefined : paint('subtle')}>{`  ${x.label}`}</Text>
              </Button>
              <Text color={paint('inactive')} wrap="wrap">{`       ${x.hint}`}</Text>
            </Box>
          ))}
          <Button
            key="fx-all"
            plain
            onPress={() => save(Object.fromEntries(EFFECTS.map(x => [x.id, !allOn])) as typeof fx)}
          >
            <Text color={paint('claude')} bold>
              {allOn ? '○ Turn all off' : '● Turn all on'}
            </Text>
          </Button>
        </Box>
      )
    } else if (current === 'theme') {
      const chosen = await read($, theme)
      const swatch = ['claude', 'success', 'warning', 'error', 'suggestion', 'permission']
      body = (
        <Box flexDirection="column" gap={1}>
          {heading('Theme', 'saved for every session')}
          {THEMES.map(t => {
            const tint = painter(t.id)
            const isOn = t.id === chosen
            return (
              <Button
                key={`theme-${t.id}`}
                plain
                onPress={async () => {
                  await update($, theme, () => t.id)
                  try {
                    await $.store.set(THEME_KEY, t.id)
                  } catch {
                    $.ui.toast('Theme applied for this session; it could not be saved for the next one.')
                  }
                }}
              >
                <Text color={tint(isOn ? 'claude' : 'subtle')} bold={isOn}>
                  {isOn ? '◉ ' : '○ '}
                </Text>
                {swatch.map(k => (
                  <Text color={tint(k)}>██</Text>
                ))}
                <Text bold={isOn} color={isOn ? tint('claude') : undefined}>
                  {`  ${t.name}`}
                </Text>
                {isNarrow ? null : <Text color={tint('inactive')}>{`  ${t.note}`}</Text>}
              </Button>
            )
          })}
          <Text color={paint('inactive')} wrap="wrap">
            Fixed-color themes are tuned for dark terminals. Claude follows your own light or dark theme.
          </Text>
        </Box>
      )
    } else {
      const list = await read($, calls)
      const shown = list.slice(-Math.max(3, room - 2))
      const errors = list.filter(c => c.status === 'error').length
      const refused = list.filter(c => c.status === 'refused').length
      const look = {
        running: { icon: '◌', color: 'claude' },
        ok: { icon: '✓', color: 'success' },
        error: { icon: '✗', color: 'error' },
        refused: { icon: '⊘', color: 'warning' },
      } as const
      const toolWidth = Math.min(isNarrow ? 8 : 12, Math.max(4, ...shown.map(c => c.tool.length)))
      body =
        shown.length === 0
          ? empty('◌', 'No activity yet.', 'Every tool Claude runs is listed here.')
          : (
              <Box flexDirection="column" gap={1}>
                {heading(
                  'Activity',
                  [
                    `${list.length} ${list.length === 1 ? 'call' : 'calls'}`,
                    errors > 0 ? `${errors} failed` : '',
                    refused > 0 ? `${refused} not run` : '',
                  ]
                    .filter(x => x !== '')
                    .join(' · '),
                )}
                <Box flexDirection="column">
                  {shown.map(c => (
                    <Box key={c.id} flexDirection="row" gap={1}>
                      <Box flexShrink={0}>
                        <Text color={paint(look[c.status].color)}>
                          {c.status === 'running' ? spin(f) : look[c.status].icon}
                        </Text>
                      </Box>
                      <Box flexShrink={0}>
                        <Text color={paint('inactive')} tabular>
                          {isNarrow ? clockTime(c.startedAt).slice(0, 5) : clockTime(c.startedAt)}
                        </Text>
                      </Box>
                      <Box flexShrink={0}>
                        <Text bold={c.status !== 'ok'} color={paint(c.status === 'ok' ? 'text' : look[c.status].color)}>
                          {c.tool.slice(0, toolWidth).padEnd(toolWidth)}
                        </Text>
                      </Box>
                      <Box flexShrink={0}>
                        <Text color={paint('inactive')} tabular>
                          {(c.ms === null || c.ms < 1000
                            ? ''
                            : c.ms < 60_000
                              ? `${Math.round(c.ms / 1000)}s`
                              : duration(c.ms)
                          ).padStart(isNarrow ? 4 : 6)}
                        </Text>
                      </Box>
                      <Box flexGrow={1} flexShrink={1}>
                        <Text color={paint('subtle')} wrap="truncate-end">
                          {c.summary}
                        </Text>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )
    }

    return (
      <Box flexDirection="column" gap={1}>
        {tabs}
        {body}
      </Box>
    )
  })
}
