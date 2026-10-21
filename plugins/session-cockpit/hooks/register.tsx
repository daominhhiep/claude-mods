import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren, SessionUsage } from 'claude-code'

import type {
  AgentCost,
  AgentNode,
  PrStatus,
  BlastRecord,
  CallRecord,
  CockpitTab,
  DiffStep,
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
  gradientBar,
  humanPrompt,
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
const pins = atom({ plugin: 'session-cockpit', key: 'pins' } as const, [])
const pinScope = atom({ plugin: 'session-cockpit', key: 'pinScope' } as const, 'project')
const sessionId = atom({ plugin: 'session-cockpit', key: 'sessionId' } as const, null)
const keepDays = atom({ plugin: 'session-cockpit', key: 'keepDays' } as const, 30)
const frame = atom({ plugin: 'session-cockpit', key: 'frame' } as const, 0)
const theme = atom({ plugin: 'session-cockpit', key: 'theme' } as const, 'claude')

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
const FRAME_MS = 250
const PINS_KEY = 'pins'
const THEME_KEY = 'theme'
const WARN_DAYS = 7

const TABS: { id: CockpitTab; label: string; short: string; hotkey: string }[] = [
  { id: 'weather', label: 'Context', short: 'Context', hotkey: '1' },
  { id: 'agents', label: 'Agents', short: 'Agents', hotkey: '2' },
  { id: 'sessions', label: 'Sessions', short: 'Pins', hotkey: '3' },
  { id: 'blast', label: 'Guard', short: 'Guard', hotkey: '4' },
  { id: 'replay', label: 'Changes', short: 'Diff', hotkey: '5' },
  { id: 'log', label: 'Activity', short: 'Log', hotkey: '6' },
  { id: 'theme', label: 'Theme', short: 'Theme', hotkey: '7' },
]

async function savePins($: EngineInterface, list: PinnedSession[]): Promise<void> {
  await update($, pins, () => list)
  try {
    await $.store.set(PINS_KEY, list)
  } catch {
    // The pane still shows the list; it is saved again on the next change.
  }
}

/** True while something moves: a prompt or agent runs, a guard waits, the cache is about to go cold. */
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
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
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
    try {
      const id = await $.session.id()
      await update($, sessionId, () => id)
      const saved = await $.store.get(PINS_KEY)
      if (Array.isArray(saved)) await update($, pins, () => saved as PinnedSession[])
      const savedTheme = await $.store.get(THEME_KEY)
      if (typeof savedTheme === 'string') await update($, theme, () => savedTheme)
      const days = await $.settings.read({ key: 'cleanupPeriodDays' })
      if (typeof days === 'number' && days > 0) await update($, keepDays, () => days)
    } catch {
      // Pins load on the next session start.
    }
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
        // Four frames a second while something moves; one a second at rest.
        if ((await isBusy($, cacheMs)) || beats % 4 === 0) await update($, frame, n => n + 1)
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
    const mini = pctShown === undefined ? null : gradientBar(pctShown, 12)
    const level = pctShown === undefined ? null : levelOf(pctShown)
    const f = await read($, frame)
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

    // One chip: a value in color, then a dim label.
    const chip = (key: string, value: RenderChildren, label?: string) => (
      <Box key={key} flexDirection="row" flexShrink={0}>
        <Text wrap="truncate-end">
          {value}
          {label === undefined ? null : <Text color={paint('inactive')}> {label}</Text>}
        </Text>
      </Box>
    )

    const cacheShare = left === null ? 0 : Math.max(0, Math.min(1, left / cacheMs))
    const cacheCells = Math.round(cacheShare * 5)
    const cacheColor =
      left === null || left <= 0
        ? 'inactive'
        : left <= 60_000
          ? f % 2 === 0
            ? 'warning'
            : 'error'
          : 'success'

    const firstChips = [
      level === null || mini === null || pct === undefined
        ? null
        : chip(
            'ctx',
            <Text>
              <Text color={paint(level.color)} bold>
                {level.icon} {pctShown ?? pct}%
              </Text>{' '}
              {mini.runs.map(r => (
                <Text color={paint(r.color)}>{r.text}</Text>
              ))}
              <Text color={paint('inactive')}>{mini.rest}</Text>
            </Text>,
            limitAt === null ? 'context' : 'of compact limit',
          ),
      usd === undefined
        ? null
        : chip(
            'cost',
            <Text color={paint(budgetColor)} bold>
              {money(usd)}
              {limit > 0 ? <Text color={paint('subtle')} bold={false}>{` / $${limit.toFixed(0)}`}</Text> : null}
            </Text>,
            'spent',
          ),
      left === null
        ? null
        : chip(
            'cache',
            isRunning ? (
              <Text color={paint('success')}>◷ warm</Text>
            ) : left <= 0 ? (
              <Text color={paint('inactive')}>◷ cold</Text>
            ) : (
              <Text>
                <Text color={paint(cacheColor)} bold>
                  ◷ {clockLeft(left)}
                </Text>{' '}
                <Text color={paint(cacheColor)}>{'▰'.repeat(cacheCells)}</Text>
                <Text color={paint('inactive')}>{'▱'.repeat(5 - cacheCells)}</Text>
              </Text>
            ),
            'cache',
          ),
      chip(
        'time',
        <Text>
          <Text tabular>{duration(now - usage.startedAt)}</Text>
          <Text color={paint('inactive')}> session · </Text>
          <Text tabular>{duration(working)}</Text>
        </Text>,
        'working',
      ),
      // The last prompt's own time and cost live in the Context tab; only a
      // running prompt shows here, so the band stays two rows.
      last === undefined || !isRunning
        ? null
        : chip(
            'run',
            <Text>
              <Text color={paint('warning')} bold>
                {spin(f)} {duration(now - last.startedAt)}
              </Text>{' '}
              <Text color={paint('warning')}>{sweep(f, 6)}</Text>
            </Text>,
            'running',
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

    const showSecond = secondChips.length > 0 && e.props.maxRows >= 2

    // A rounded frame sets the band apart from the transcript above it.
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={paint('subtle')} paddingX={2} paddingY={1} rowGap={1} marginTop={1}>
        <Box flexDirection="row" columnGap={4} flexWrap="wrap">
          {firstChips}
        </Box>
        {showSecond ? (
          <Box flexDirection="row" columnGap={4} flexWrap="wrap">
            {secondChips}
          </Box>
        ) : null}
      </Box>
    )
  })

  // ── The transcript: the spinner, your prompts, tool rows ───────────
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.message !== null) return next(e)
    const paint = painter(await read($, theme))
    const f = await read($, frame)
    const now = await $.clock.now()
    const last = (await read($, costs)).at(-1)
    const running = last !== undefined && last.durationMs === null ? last : null
    const usd = (await $.session.usage()).cost?.usd
    const spent =
      running !== null && running.usdAtStart !== null && usd !== undefined ? usd - running.usdAtStart : null
    const { Text } = $.ui.resolve(e)
    return (
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
            {`  ${sweep(f, 5)}`}
          </Text>
        )}
      </Text>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (e.props.origin.kind !== 'composer' || e.props.isExpanded) return next(e)
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
          <Box flexGrow={1} flexShrink={1}>
            <Text>{text}</Text>
          </Box>
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (e.props.isExpanded === true) return next(e)
    const paint = painter(await read($, theme))
    const f = await read($, frame)
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

    const isNarrow = width < 64
    const f = await read($, frame)
    const busy = (await read($, costs)).some(p => p.durationMs === null)
    const tabs = (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold>
            <Text color={paint('claude')}>◆ </Text>
            {shimmer('Session Cockpit', busy ? f : null).map(r => (
              <Text color={paint(r.glow === 2 ? 'warning' : r.glow === 1 ? 'suggestion' : 'claude')}>
                {r.text}
              </Text>
            ))}
          </Text>
          {busy ? (
            <Text color={paint('warning')}>{spin(f)} working</Text>
          ) : (
            <Text color={paint(f % 2 === 0 ? 'success' : 'inactive')}>● idle</Text>
          )}
        </Box>
        <Box flexDirection="row" columnGap={1} flexWrap="wrap" marginTop={1}>
          {TABS.map(t => (
            <Button key={`tab-${t.id}`} plain onPress={() => update($, tab, () => t.id)}>
              {t.id === current ? (
                <Text backgroundColor={paint('claude')} color={paint('inverseText')} bold>
                  {` ${isNarrow ? t.short : t.label} `}
                </Text>
              ) : (
                <Text color={paint('subtle')}>{` ${isNarrow ? t.short : t.label} `}</Text>
              )}
            </Button>
          ))}
        </Box>
        {rule}
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
      if (last === undefined) {
        gauge = empty('☁', 'No reading yet.', "It appears after Claude's first reply.")
      } else {
        const before = history[history.length - 2]
        const shown = before === undefined ? last.percent : tween(before.percent, last.percent, now - last.at)
        const level = levelOf(shown)
        const g = gradientBar(shown, barWidth)
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
              <Text tabular>{compact(last.tokens)}</Text>
              <Text color={paint('subtle')}>
                {last.compactAt === null
                  ? ` of ${compact(last.window)} tokens`
                  : ` of ${compact(last.compactAt)} before auto-compact · window ${compact(last.window)}`}
              </Text>
            </Text>
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
                    <Text color={paint('claude')} bold tabular>
                      {money(p.usd)}
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
