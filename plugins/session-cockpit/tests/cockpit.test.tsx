import { expect, mock, test } from 'claude-code/testing'

import { THEMES, ambient, themeStyle, hasAccessory, petHeatmap, petRangeStats, favoriteHour, layNewEgg, newEggBlock, choosePath, hatchSpecies, PET_SPECIES, dayKey, feedAndAward, patPet, petFeeling, petStamina, workIn, hasSkin, newPetLife, pet, petLifeFrom, petMood, petStats, PET_WIDTH, ringGlow, smoothBar, daysLeft, detectBlast, humanPrompt, shimmer, sweep, tween, typed, levelOf, lineDiff, parseBudget, prRefFrom, rollup, tidySummary } from '../hooks/rules'

const PANE = {
  plugin: 'session-cockpit',
  component: 'Pane',
  requestId: 'session-cockpit',
  props: {
    title: 'Cockpit',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

/** Turns the timed effects off through the Config tab, so a band shows its rows. */
async function quiet($: Parameters<Parameters<typeof test>[1]>[0]) {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-settings' })
  await ui.press({ key: 'tab-config' })
  await ui.press({ key: 'fx-fireworks' })
  await ui.press({ key: 'fx-flash' })
  await ui.press({ key: 'group-weather' })
  await ui.unmount()
}

test('detects destructive commands and leaves safe ones alone', async () => {
  expect(detectBlast('rm -rf build')?.kind).toBe('Delete files')
  expect(detectBlast('rm -rf build')?.preview?.length).toBe(2)
  expect(detectBlast('rm -rf dist/*')?.preview).toBe(undefined)
  expect(detectBlast('git push --force origin main')?.kind).toContain('Force push')
  expect(detectBlast('kubectl -n prod delete deploy api')?.preview?.[0]?.argv).toContain(
    '--dry-run=server',
  )
  expect(detectBlast('argocd app sync web --prune')).not.toBe(null)
  expect(detectBlast('psql -c "DROP TABLE orders"')?.kind).toContain('Drop')
  expect(detectBlast('psql -c "DELETE FROM orders"')?.kind).toBe('DELETE without WHERE')
  expect(detectBlast('psql -c "DELETE FROM orders WHERE id = 1"')).toBe(null)
  expect(detectBlast('ls -la')).toBe(null)
  expect(detectBlast('git push origin main')).toBe(null)
  expect(detectBlast('kubectl get pods')).toBe(null)
})

test('weather levels follow the thresholds', async () => {
  expect(levelOf(10).name).toBe('Clear')
  expect(levelOf(54).name).toBe('Showers')
  expect(levelOf(77).name).toBe('Storm')
  expect(levelOf(95).name).toBe('Compact soon')
})

test('line diff keeps context and counts changes', async () => {
  const d = lineDiff('a\nb\nc\nd\ne\nf\ng\nh', 'a\nb\nc\nd\nX\nf\ng\nh')
  expect(d?.added).toBe(1)
  expect(d?.removed).toBe(1)
  expect(d?.diff.split('\n')[0]).toBe('@@ -2,7 +2,7 @@')
  expect(lineDiff('same', 'same')).toBe(null)
  expect(lineDiff('', 'new\nfile')?.diff.split('\n')[0]).toBe('@@ -0,0 +1,2 @@')
})

test('the guard asks the person before a destructive command', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'cockpit' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.check', () => ({ decision: 'allow' }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: 'build/a.js\nbuild/b.js\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  const risky = await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf build' } })
  expect(risky.decision).toBe('ask')
  expect(risky.reason).toContain('Delete files')
  expect(risky.reason).toContain('build/a.js')

  const safe = await $.tool.check({ tool: 'Bash', input: { command: 'ls' } })
  expect(safe.decision).toBe('allow')
})

test('the guard leaves a command the person\'s rules refuse refused', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('tool.check', () => ({ decision: 'deny', reason: 'Bash(rm:*) is denied' }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  const refused = await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf build' } })
  expect(refused.decision).toBe('deny')
})

test('the activity tab lists tool calls, on every surface', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'cockpit' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('tool.call', () => ({ result: {} }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'go test ./...' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'group-work' })
    await ui.press({ key: 'tab-log' })
    expect(await ui.find({ type: 'Text', text: /go test/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /^Bash/ }))?.text).toContain('Bash')
    expect((await ui.find({ type: 'Text', text: /^\d+ calls?$/ }))?.text).toBe('1 call')
    await ui.press({ key: 'group-weather' })
    expect(await ui.find({ type: 'Text', text: /No reading yet/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the changes tab replays an edit as a diff, and weather draws a reading', async ($, on) => {
  let content = 'package main\n\nfunc a() {}\n'
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'cockpit' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('fs.stat', () => ({ value: { kind: 'file', size: content.length, mtimeMs: 0 } }))
  on('fs.read', () => ({ value: content }))
  on('tool.call', () => {
    content = 'package main\n\nfunc b() {}\n'
    return { result: {} }
  })
  on('turn.complete', () => ({}))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 160_000, window: 200_000, percent: 80 },
      rateLimits: [],
      cost: { usd: 1.25 },
    },
  }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.tool.call({
    tool: 'Edit',
    file_path: '/repo/main.go',
    old_string: 'func a',
    new_string: 'func b',
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'group-work' })
    await ui.press({ key: 'tab-replay' })
    expect((await ui.find({ type: 'Text', text: /main\.go/ }))?.text).toBe('main.go')
    expect(await ui.find({ type: 'Code' })).toBeDefined()
    await ui.unmount()
  }
})

test('the band above the prompt shows session cost and time', async ($, on) => {
  mock.store(on)
  let usd = 1.0
  let now = 1_700_000_000_000
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'cockpit' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: now }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('agent.list', () => ({
    value: [{ id: 'ag1', description: 'review', type: 'code-reviewer', status: 'completed' }],
  }))
  on('session.usage', () => ({
    value: {
      startedAt: 1_700_000_000_000 - 600_000,
      context: { tokens: 160_000, window: 200_000, percent: 80 },
      rateLimits: [],
      cost: { usd },
    },
  }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'refactor the data loader', turnId: 't1' })
  now += 95_000
  usd = 1.42
  await $.turn.complete({
    agentId: 'ag1',
    turnId: 'a1',
    answer: 'ok',
    durationMs: 40_000,
    isAborted: false,
    reason: 'answer',
    usage: {
      input_tokens: 1000,
      output_tokens: 2000,
      cache_read_input_tokens: 9000,
      cache_creation_input_tokens: 0,
      model: 'opus',
    },
  })
  await $.turn.complete({
    turnId: 't1',
    answer: 'done',
    durationMs: 95_000,
    isAborted: false,
    reason: 'answer',
    usage: {
      input_tokens: 2000,
      output_tokens: 5000,
      cache_read_input_tokens: 100_000,
      cache_creation_input_tokens: 0,
      model: 'opus',
    },
  })

  await quiet($)
  const BAND = {
    plugin: 'session-cockpit',
    component: 'AbovePrompt',
    requestId: 'above-prompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 8, bodyColumns: 120, view: {} },
  } as const
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const band = await $.ui.mount({ ...BAND, surface } as never)
    const texts = (await band.findAll({ type: 'Text' })).map(x => x.text)
    expect(texts).toContain(' ⚡ 80% ')
    expect(texts.some(t => t.includes('█') && t.includes('░'))).toBe(true)
    expect(texts.some(t => t.startsWith('╭─ ') && t.includes('COCKPIT'))).toBe(true)
    expect(texts.some(t => t.endsWith('╮'))).toBe(true)
    expect(texts.some(t => t.includes('● ready'))).toBe(true)
    const row = texts.find(t => t.includes('spent')) ?? ''
    expect(row).toContain(' $1.42  spent')
    expect(row).toContain('◷ 5:00  ▰▰▰▰▰ cache')
    expect(row).toContain('11m 35s session · 1m 35s working')
    expect(texts.some(x => x.includes('last prompt'))).toBe(false)
    await band.unmount()

    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Storm/ }))?.text).toBe('⚡ Storm')
    expect(await ui.find({ type: 'Text', text: /^80%$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^\$0\.42$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^1m 35s$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /refactor the data loader/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /code-reviewer/ }))?.text).toContain('40s')
    await ui.unmount()
  }
})

const BAND = {
  plugin: 'session-cockpit',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 8, bodyColumns: 160, view: {} },
} as const

function engine(on: Parameters<Parameters<typeof test>[1]>[1], state: { now: number; usd: number }) {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: state.now }))
  on('clock.every', () => ({ value: {} as never }))
  on('tool.check', () => ({ decision: 'allow' }))
  on('session.usage', () => ({
    value: {
      startedAt: state.now - 60_000,
      context: { tokens: 20_000, window: 200_000, percent: 10 },
      rateLimits: [],
      cost: { usd: state.usd },
    },
  }))
}

test('pure helpers for checks and budgets', async () => {
  const r = rollup([
    { name: 'build', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'lint', status: 'COMPLETED', conclusion: 'FAILURE' },
    { name: 'e2e', status: 'IN_PROGRESS', conclusion: null },
    { context: 'codex-review', state: 'PENDING' },
  ])
  expect(r).toEqual({ passed: 1, failed: 1, pending: 2, failing: ['lint'] })
  expect(parseBudget('20')).toBe(20)
  expect(parseBudget('$7.5')).toBe(7.5)
  expect(parseBudget('off')).toBe(0)
  expect(parseBudget('')).toBe(null)
  expect(parseBudget('abc')).toBe('invalid')
  expect(prRefFrom('gh pr create --fill', '')).toBe('branch')
  expect(prRefFrom('ls', 'https://github.com/example/app/pull/101')).toBe('101')
  expect(prRefFrom('go test ./...', 'ok')).toBe(null)
})

test('the budget guard refuses tool calls once the limit is spent', { options: { budgetUsd: 5 } }, async ($, on) => {
  const state = { now: 1_700_000_000_000, usd: 3 }
  engine(on, state)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: 'fatal: not a git repository', isStdoutTruncated: false, isStderrTruncated: false } }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  expect((await $.tool.check({ tool: 'Read', input: { file_path: '/repo/a' } })).decision).toBe('allow')
  state.usd = 5.2
  const refused = await $.tool.check({ tool: 'Read', input: { file_path: '/repo/a' } })
  expect(refused.decision).toBe('deny')
  expect(refused.reason).toContain('/budget')

  const raised = await $.command.run({ command: 'budget', args: '10' } as never)
  expect((raised as { text: string }).text).toContain('$10.00')
  expect((await $.tool.check({ tool: 'Read', input: { file_path: '/repo/a' } })).decision).toBe('allow')

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect((await band.find({ type: 'Text', text: /\/ \$10/ }))?.text).toContain('$5.20  / $10 spent')
  await band.unmount()
})

test('the band shows the cache clock going cold, the PR and running agents', async ($, on) => {
  const state = { now: 1_700_000_000_000, usd: 1 }
  engine(on, state)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('agent.spawn', () => ({ agentId: 'ag1', model: 'opus' }) as never)
  let agentStatus = 'running'
  on('agent.list', () => ({
    value: [{ id: 'ag1', description: 'Review the loader change', type: 'code-reviewer', status: agentStatus }],
  }))
  on('tool.call', () => ({ result: {} }))
  on('process.run', (_, e) => {
    const argv = (e as unknown as { argv: string[] }).argv
    const stdout =
      argv[0] === 'git'
        ? 'feat/approval-gate\n'
        : JSON.stringify({
            number: 101,
            title: 'Add an approval gate',
            url: 'https://github.com/example/app/pull/101',
            state: 'OPEN',
            reviewDecision: 'APPROVED',
            statusCheckRollup: [
              { name: 'build', status: 'COMPLETED', conclusion: 'SUCCESS' },
              { name: 'lint', status: 'COMPLETED', conclusion: 'FAILURE' },
            ],
          })
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  // No PR row until the session touches a pull request.
  const before = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect(await before.find({ type: 'Text', text: /#101/ })).toBeUndefined()
  await before.unmount()
  await $.tool.call({ tool: 'Bash', command: 'git push -u origin feat/approval-gate' } as never)

  await $.turn.start({ text: 'ship it', turnId: 't1' })
  await $.agent.spawn({ prompt: 'review', description: 'Review the loader change', subagentType: 'code-reviewer' } as never)
  await $.tool.call({ tool: 'Read', file_path: '/repo/src/loader.go', agentId: 'ag1' } as never)
  await $.turn.complete({
    agentId: 'ag1', turnId: 'a1', answer: '', durationMs: 20_000, isAborted: false, reason: 'answer',
    usage: { input_tokens: 2_000, output_tokens: 3_000, cache_read_input_tokens: 70_000, cache_creation_input_tokens: 8_000, model: 'opus' },
  })
  await $.turn.complete({
    turnId: 't1', answer: '', durationMs: 30_000, isAborted: false, reason: 'answer',
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'opus' },
  })

  state.now += 100_000
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const band = await $.ui.mount({ ...BAND, surface } as never)
    expect((await band.find({ type: 'Text', text: /cache/ }))?.text).toContain('◷ 3:20  ▰▰▰▱▱ cache')
    const second = (await band.find({ type: 'Text', text: /#101/ }))?.text ?? ''
    expect(second).toContain('⑂ #101 Add an approval gate')
    expect(second).toContain('✓ 1  ✗ 1 · lint failing')
    expect(second).toContain('● approved')
    expect(second).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] 1 agent · code-reviewer$/)
    await band.unmount()

    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'group-work' })
    await ui.press({ key: 'tab-agents' })
    expect((await ui.find({ type: 'Text', text: /code-reviewer/ }))?.text).toContain('1 tool')
    expect((await ui.find({ type: 'Text', text: /↳/ }))?.text).toContain('src/loader.go')
    expect((await ui.find({ type: 'Text', text: /cached/ }))?.text).toContain('80k in · 3k out · 88% cached')
    await ui.unmount()
  }

  state.now += 300_000
  const cold = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect((await cold.find({ type: 'Text', text: /cache/ }))?.text).toContain('◷ cold  cache')
  await cold.unmount()
})

test('the band shows the model and effort of the latest request', async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 1_700_000_000_000, context: { window: 200_000 }, rateLimits: [], cost: { usd: 0 } },
  }))
  on('turn.step', async function* (_, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null } as never
  })
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  const before = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect((await before.find({ type: 'Text', text: /opus/ }))?.text).toContain('◆ opus-5-5 model')
  await before.unmount()

  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'xhigh', messageCount: 1 } as never)
  for await (const _ of stream as AsyncIterable<unknown>) {
    // drain
  }

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const band = await $.ui.mount({ ...BAND, surface } as never)
    expect((await band.find({ type: 'Text', text: /opus/ }))?.text).toBe('◆ opus-5-5 · xhigh effort')
    await band.unmount()
  }
})

test('context is measured against the auto-compact threshold', async ($, on) => {
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.usage', () => ({
    value: {
      startedAt: 1_700_000_000_000,
      context: {
        tokens: 250_000,
        window: 1_000_000,
        percent: 25,
        breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 270_000, rawMaxTokens: 300_000, autocompactSource: 'settings' } as never,
      },
      rateLimits: [],
      cost: { usd: 1 },
    },
  }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', durationMs: 1000, isAborted: false, reason: 'answer' })
  await quiet($)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const band = await $.ui.mount({ ...BAND, surface } as never)
    expect((await band.find({ type: 'Text', text: /compact limit/ }))?.text).toContain('⚠ 93%')
    await band.unmount()

    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /^93%$/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /Compact window/ }))?.text).toBe('Compact window 300k (your setting) · model 1M · 30k kept free')
    expect((await ui.find({ type: 'Text', text: /before auto-compact/ }))?.text).toContain(
      '250k of 270k before auto-compact',
    )
    await ui.unmount()
  }
})

test('prompts and commands read the way a person would', async () => {
  expect(humanPrompt('<task-notification> <task-id>bs624</task-id>')).toBe('⚙ Background task update')
  expect(humanPrompt('<agent-message from="aaf6">[Subagent] done')).toBe('✉ Message from an agent')
  expect(humanPrompt('❯ Job xong chưa?')).toBe('Job xong chưa?')
  expect(tidySummary('cd /Users/me/Desktop/app && go test ./...', '/Users/me/Desktop/app')).toBe('go test ./...')
  expect(tidySummary('/Users/me/Desktop/app/services/x.go', '/Users/me/Desktop/app')).toBe('services/x.go')
  expect(tidySummary('cat /Users/me/.claude/notes.md', '/Users/me/Desktop/app')).toBe('cat ~/.claude/notes.md')
  expect(daysLeft(0, 25 * 86_400_000, 30)).toBe(5)
})

test('pinning keeps a named session one press away', async ($, on) => {
  mock.store(on)
  const filled: string[] = []
  const renamed: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('session.usage', () => ({
    value: { startedAt: 1_700_000_000_000, context: { window: 200_000 }, rateLimits: [], cost: { usd: 3.2 } },
  }))
  on('command.run', (_, e) => {
    if (e.command === 'rename') renamed.push(e.args)
    return { text: '' }
  })
  on('prompt.fill', (_, e) => {
    filled.push(e.text)
    return { isFilled: true } as never
  })
  // Two sessions open on this computer: this one, and one working elsewhere.
  const record = (pid: number, sessionId: string, cwd: string, name: string, status: string) =>
    JSON.stringify({ pid, sessionId, cwd, name, status, startedAt: 1_700_000_000_000 - 3_600_000 })
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: `${record(1, 'sess-1', '/repo/app', 'app-1', 'idle')}\n${record(2, 'sess-2', '/repo/api', 'api-7', 'busy')}\n`,
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  await $.session.start({ cwd: '/repo/app', surface: 'desktop', isInteractive: true })

  const pinned = (await $.command.run({ command: 'pin', args: 'finance export' } as never)) as { text: string }
  expect(pinned.text).toContain('Pinned "finance export"')
  // Either the built-in /rename ran, or the reply says to run it.
  expect(renamed.length === 1 || pinned.text.includes('/rename finance export')).toBe(true)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'group-sessions' })
    expect((await ui.find({ type: 'Text', text: /^★ finance export/ }))?.text).toBe('★ finance export')
    expect(await ui.find({ type: 'Text', text: /this session/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /^app · just now/ }))?.text).toBe('app · just now · $3.20')
    // Every session open on this computer, whatever the project, working first.
    expect(await ui.find({ type: 'Text', text: /OPEN ON THIS COMPUTER/ })).toBeDefined()
    const open = (await ui.findAll({ type: 'Text', text: /· started / })).map(t => t.text)
    expect(open[0]).toMatch(/^● api-7 · api · started/)
    expect(open.some(t => /finance export · app/.test(t))).toBe(true)
    expect(await ui.find({ type: 'Text', text: 'Working' })).toBeDefined()
    await ui.unmount()
  }

  const unpinned = (await $.command.run({ command: 'unpin' } as never)) as { text: string }
  expect(unpinned.text).toContain('Unpinned')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-sessions' })
  expect(await ui.find({ type: 'Text', text: /No pinned sessions/ })).toBeDefined()
  await ui.press({ key: 'pin-here' })
  expect(filled).toEqual(['/pin '])
  await ui.unmount()
})

test('a theme repaints the band and the pane, and is kept for next time', async ($, on) => {
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('session.usage', () => ({
    value: { startedAt: 1_700_000_000_000, context: { window: 200_000 }, rateLimits: [], cost: { usd: 1 } },
  }))
  await $.session.start({ cwd: '/repo/app', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'group-settings' })
    await ui.press({ key: 'tab-theme' })
    expect(await ui.find({ type: 'Text', text: /Neon/ })).toBeDefined()
    await ui.press({ key: 'theme-neon' })
    const band = await $.ui.mount({ ...BAND, surface } as never)
    const drawn = JSON.stringify(await band.drawn())
    expect(drawn).toContain('#ff2bd6')
    // Neon draws its own frame and title mark, with rain above, not just its colors.
    expect(drawn).toContain('┏━')
    expect(drawn).toContain('⚡ COCKPIT')
    expect(drawn).toMatch(/[╎¦]/)
    await band.unmount()
    // The tab previews the chosen theme, sorts themes by terminal background,
    // and can pick one at random or go back to Claude's own.
    expect(JSON.stringify(await ui.drawn())).toContain('#ff2bd6')
    expect(await ui.find({ type: 'Text', text: 'For light terminals' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Paper/ })).toBeDefined()
    await ui.press({ key: 'theme-shuffle' })
    expect(await ui.find({ type: 'Text', text: /^THEME$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Neon · saved/ })).toBeUndefined()
    await ui.press({ key: 'theme-reset' })
    expect(await ui.find({ type: 'Text', text: /^Claude · saved/ })).toBeDefined()
    await ui.press({ key: 'theme-neon' })
    await ui.unmount()
  }
  expect(THEMES.length).toBe(15)
  // Rain falls through the two rows above the band, a step at a time.
  const rain = (t: number) => ambient('rain', 80, t).map(r => r.map(c => c.ch).join(''))
  expect(rain(0).join('')).toMatch(/[╎¦│]/)
  expect(rain(0)).not.toEqual(rain(200))
  const pips = smoothBar(50, 10, 'pips')
  expect(pips.runs.map(r => r.text).join('') + pips.rest).toBe('▰▰▰▰▰▱▱▱▱▱')
  expect(themeStyle('claude')).toEqual({ frame: 'round', mark: '◆', gauge: 'smooth', ambient: null })
})

test('motion helpers ease, type and sweep', async () => {
  expect(tween(40, 80, 0)).toBe(40)
  expect(tween(40, 80, 750)).toBe(75)
  expect(tween(40, 80, 5000)).toBe(80)
  expect(typed('abc', 0)).toBe('▌')
  expect(typed('abc', 35)).toBe('a▌')
  expect(typed('abc', 500)).toBe('abc')
  // The gauge fills in eighths of a cell; the ring's light is three cells wide
  // with a tail behind it, and wraps round the frame.
  const g = smoothBar(50, 10)
  expect(g.runs.map(r => r.text).join('') + g.rest).toBe('█████░░░░░')
  expect(smoothBar(55, 10).runs.map(r => r.text).join('')).toBe('█████▌')
  expect(ringGlow(0, 0, 40)).toBe(2)
  expect(ringGlow(1, 3, 40)).toBe(2)
  expect(ringGlow(0, 3, 40)).toBe(1)
  expect(ringGlow(4, 3, 40)).toBe(0)
  expect(ringGlow(39, 41, 40)).toBe(2)
  expect(ringGlow(20, 3, 40)).toBe(0)
  expect(THEMES.some(t => t.id === 'cyberpunk' && t.colors.claude === '#fcee0a')).toBe(true)
  expect(sweep(0, 4)).toBe('▰▱▱▱')
  expect(sweep(4, 4)).toBe('▱▱▰▱')
  expect(shimmer('abcde', 5).map(r => r.glow)).toEqual([0, 1, 2, 1, 0])
  expect(shimmer('abc', null)).toEqual([{ text: 'abc', glow: 0 }])
})

test('the transcript draws themed prompts, tool rows and a living spinner', async ($, on) => {
  let now = 1_700_000_000_000
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: {} as never }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: {} }))
  let usd = 1
  on('session.usage', () => ({
    value: { startedAt: now, context: { window: 200_000 }, rateLimits: [], cost: { usd } },
  }))
  await $.session.start({ cwd: '/repo/app', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'Add retry to the order puller', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'cd /repo/app && go test ./...' } as never)
  now += 42_000
  usd = 1.37

  const spinner = await $.ui.mount({
    plugin: 'session-cockpit', surface: 'terminal', component: 'Spinner', requestId: 'spin',
    props: { word: 'Cooking', message: null, suffix: '…', mode: 'responding' },
  } as never)
  expect((await spinner.find({ type: 'Text', text: /Cooking/ }))?.text).toMatch(/Cooking…  42s · \$0\.37/)
  await spinner.unmount()

  const prompt = await $.ui.mount({
    plugin: 'session-cockpit', surface: 'terminal', component: 'UserMessage', requestId: 'm1',
    props: { text: 'Add retry to the order puller', origin: { kind: 'composer' }, isExpanded: true },
  } as never)
  expect((await prompt.find({ type: 'Text', text: /You/ }))?.text).toContain('▍ You')
  expect(await prompt.find({ type: 'Text', text: /^Add retry to the order puller$/ })).toBeDefined()
  await prompt.unmount()

  for (const surface of ['terminal', 'desktop'] as const) {
    const row = await $.ui.mount({
      plugin: 'session-cockpit', surface, component: 'ToolUse', requestId: 'x',
      props: {
        toolUseId: 'x', tool: 'Bash', input: { command: 'cd /repo/app && go test ./...' },
        isRunning: false, isErrored: false, isInterrupted: false, isExpanded: true,
      },
    } as never)
    expect(await row.find({ type: 'Text', text: /^go test \.\/\.\.\.$/ })).toBeDefined()
    expect(await row.find({ type: 'Text', text: /^✓$/ })).toBeDefined()
    await row.unmount()
  }
})

test('transcriptStyle claude leaves the transcript to Claude Code', { options: { transcriptStyle: 'claude' } }, async ($, on) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  await $.session.start({ cwd: '/repo/app', surface: 'terminal', isInteractive: true })
  const prompt = await $.ui.mount({
    plugin: 'session-cockpit', surface: 'terminal', component: 'UserMessage', requestId: 'm1',
    props: { text: 'hello', origin: { kind: 'composer' }, isExpanded: true },
  } as never)
  expect((await prompt.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine row')
  await prompt.unmount()
})

test('a You should know note stays above the band and raises a notification', async ($, on) => {
  const notes: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.usage', () => ({
    value: { startedAt: 1_700_000_000_000, context: { window: 200_000 }, rateLimits: [], cost: { usd: 1 } },
  }))
  on('ui.notify', (_, e) => {
    notes.push((e as unknown as { text: string }).text)
    return { value: { isSent: true, channel: 'terminal_bell' } } as never
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>✦ Heads up · The retry count was changed from 3 to 5. 1: Learn more 2: Knew this already 0: Dismiss</Text>
  })
  await $.session.start({ cwd: '/repo/app', surface: 'terminal', isInteractive: true })

  for (let i = 0; i < 2; i++) {
    const band = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
    expect(await band.find({ type: 'Text', text: /Heads up/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /spent/ })).toBeDefined()
    await band.unmount()
  }
  expect(notes).toEqual(['Heads up · The retry count was changed from 3 to 5.'])
})

test('the pane and the band read the same live context mid-turn', async ($, on) => {
  let now = 1_700_000_000_000
  let tokens = 153_100
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: {} as never }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.usage', () => ({
    value: {
      startedAt: 1_700_000_000_000,
      context: {
        tokens,
        window: 1_000_000,
        breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 267_000 } as never,
      },
      rateLimits: [],
      cost: { usd: 1 },
    },
  }))
  await $.session.start({ cwd: '/repo/app', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'one', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', durationMs: 1000, isAborted: false, reason: 'answer' })

  now += 600_000
  tokens = 222_000
  await $.turn.start({ text: 'two', turnId: 't2' })
  now += 60_000

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /^83%$/ })).toBeDefined()
  expect((await ui.find({ type: 'Text', text: /before auto-compact/ }))?.text).toContain('222k of 267k')
  await ui.unmount()
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect((await band.find({ type: 'Text', text: /compact limit/ }))?.text).toContain('83%')
  await band.unmount()
})

test('where no system notification can be raised, the note shows as a toast', async ($, on) => {
  const toasts: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.usage', () => ({
    value: { startedAt: 1_700_000_000_000, context: { window: 200_000 }, rateLimits: [], cost: { usd: 1 } },
  }))
  on('ui.notify', () => ({ value: { isSent: false, reason: 'no-surface' } }) as never)
  on('ui.toast', (_, e) => {
    toasts.push((e as unknown as { text: string }).text)
    return { value: undefined } as never
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>✧ Heads up · VND totals are estimates from the system rate. 1: Learn more 0: Dismiss</Text>
  })
  await $.session.start({ cwd: '/repo/app', surface: 'desktop', isInteractive: true })
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
  await band.unmount()
  await new Promise(r => setTimeout(r, 20))
  expect(toasts).toEqual(['✦ Heads up · VND totals are estimates from the system rate.'])
})

test('effects burst, flash, type out and fold away, and the Config tab turns them off', async ($, on) => {
  mock.store(on)
  const state = { now: 1_700_000_000_000, tokens: 50_000 }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: state.now }))
  on('clock.every', () => ({ value: {} as never }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    const text = (e.props as { text?: unknown }).text
    return <Text>{typeof text === 'string' ? text : ''}</Text>
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.usage', () => ({
    value: {
      startedAt: 1_700_000_000_000,
      context: {
        tokens: state.tokens,
        window: 1_000_000,
        percent: 5,
        breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 200_000 } as never,
      },
      rateLimits: [],
      cost: { usd: 1 },
    },
  }))
  const BAND = {
    plugin: 'session-cockpit',
    component: 'AbovePrompt',
    requestId: 'above-prompt',
    surface: 'terminal',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, view: {} },
  } as const
  const bandTexts = async () => {
    const band = await $.ui.mount(BAND as never)
    const texts = (await band.findAll({ type: 'Text' })).map(x => x.text)
    await band.unmount()
    return texts
  }

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  await $.turn.start({ text: 'one', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', durationMs: 4000, isAborted: false, reason: 'answer' })
  // 25% → 30% of the limit: no level crossed yet, only the firework.
  let texts = await bandTexts()
  expect(texts.some(t => t.includes('✦ DONE 4s'))).toBe(true)
  state.now += 3_000
  texts = await bandTexts()
  expect(texts.some(t => t.includes('DONE'))).toBe(false)

  // Crossing into the next level flashes its name on the frame.
  state.tokens = 110_000
  await $.turn.start({ text: 'two', turnId: 't2' })
  await $.turn.complete({ turnId: 't2', answer: '', durationMs: 2000, isAborted: false, reason: 'answer' })
  texts = await bandTexts()
  expect(texts.some(t => t.includes('SHOWERS 55%'))).toBe(true)
  state.now += 3_000

  // A reply that arrives while Claude works types out, then draws whole.
  await $.turn.start({ text: 'three', turnId: 't3' })
  const reply = {
    plugin: 'session-cockpit',
    component: 'AssistantMessage',
    requestId: 'r1',
    surface: 'terminal',
    props: { text: 'Hello there, this is a reply.', isFirstOfReply: true },
  } as const
  let msg = await $.ui.mount(reply as never)
  expect(JSON.stringify(await msg.drawn())).toContain('▌')
  await msg.unmount()
  state.now += 2_000
  msg = await $.ui.mount(reply as never)
  expect(JSON.stringify(await msg.drawn())).not.toContain('▌')
  await msg.unmount()

  // The Config tab turns an effect off, and the choice is saved.
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-settings' })
  await ui.press({ key: 'tab-config' })
  expect(await ui.find({ type: 'Text', text: /Fireworks when a turn ends/ })).toBeDefined()
  await ui.press({ key: 'fx-fireworks' })
  expect(await ui.find({ type: 'Text', text: /^ OFF $/ })).toBeDefined()
  await ui.unmount()
  await $.turn.complete({ turnId: 't3', answer: '', durationMs: 1000, isAborted: false, reason: 'answer' })
  texts = await bandTexts()
  expect(texts.some(t => t.includes('DONE'))).toBe(false)
})

test('the pet moves with the session: works, cheers, frets and naps', async () => {
  const base = { now: 10_000, isWorking: false, isCold: false, turnEndedAt: null, failedAt: null }
  expect(petMood(base)).toBe('idle')
  expect(petMood({ ...base, isWorking: true })).toBe('work')
  expect(petMood({ ...base, turnEndedAt: 8_000 })).toBe('happy')
  expect(petMood({ ...base, turnEndedAt: 1_000 })).toBe('idle')
  expect(petMood({ ...base, isWorking: true, failedAt: 9_000 })).toBe('oops')
  expect(petMood({ ...base, isCold: true })).toBe('sleep')

  const rows = (mood: Parameters<typeof pet>[0], now: number, sweat = false) =>
    pet(mood, now, sweat).map(r => r.map(x => x.text).join(''))
  // Every row fills the yard exactly, whatever the mood.
  for (const mood of ['idle', 'work', 'happy', 'oops', 'sleep'] as const) {
    for (const now of [600, 1_850, 3_100]) {
      expect(rows(mood, now).every(r => Array.from(r).length === PET_WIDTH)).toBe(true)
    }
  }
  expect(rows('idle', 600)[0]).toContain('▐▛███▜▌')
  // At work it paces: a later step stands somewhere else.
  expect(rows('work', 600)[1]).not.toBe(rows('work', 1_100)[1])
  expect(rows('happy', 600).join('')).toMatch(/[✦✧]/)
  expect(rows('oops', 600)[0]).toContain('!')
  expect(pet('oops', 600, false)[1]!.some(x => x.color === 'error')).toBe(true)
  expect(rows('sleep', 600).join('')).toMatch(/[zZ]/)
  expect(rows('sleep', 600)[0]).toContain('▐█████▌')
  expect(rows('idle', 600, true)[0]).toMatch(/[',]/)
})

test('the pet lives in the band and the Config tab sends it away', async ($, on) => {
  const state = { now: 1_700_000_000_600 }
  // A pet looked after on eight days is grown up.
  mock.store(on, {
    petLife: {
      name: 'Mochi',
      bornAt: state.now - 9 * 86_400_000,
      days: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [dayKey(state.now - (i + 1) * 86_400_000), 3])),
      lastFedAt: state.now - 3_600_000,
      turns: 24,
      skin: 'classic',
      achievements: {},
    },
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: state.now }))
  on('clock.every', () => ({ value: {} as never }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    const text = (e.props as { text?: unknown }).text
    return <Text>{typeof text === 'string' ? text : ''}</Text>
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: {}, isError: true }) as never)
  on('session.usage', () => ({
    value: {
      startedAt: 1_700_000_000_000,
      context: { tokens: 20_000, window: 200_000, percent: 10 },
      rateLimits: [],
      cost: { usd: 1 },
    },
  }))
  const BAND = {
    plugin: 'session-cockpit',
    component: 'AbovePrompt',
    requestId: 'above-prompt',
    surface: 'terminal',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, view: {} },
  } as const
  const bandText = async () => {
    const band = await $.ui.mount(BAND as never)
    // The pet is drawn by its own Client, handed its rows as props.
    const pets = (await band.findAll({ type: 'Client' })).map(c =>
      (c.props.props as { rows: { text: string }[][] }).rows.map(r => r.map(x => x.text).join('')).join('\n'),
    )
    const text = [...(await band.findAll({ type: 'Text' })).map(x => x.text), ...pets].join('\n')
    await band.unmount()
    return text
  }

  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  // The pet sits on the top border, its feet on the line; with the gauge as
  // the last row its name and feeling sit on the bottom border.
  const first = await bandText()
  expect(first).not.toContain('opus')
  expect(first).toContain('▐▛███▜▌')
  expect(first).toMatch(/◆ COCKPIT ─+▘▘─▝▝─/)
  // Its body stands right over its feet, the title's width counted in columns.
  const lines = first.split('\n')
  const border = lines.find(l => l.startsWith('╭─ ◆ COCKPIT'))!
  const gap = lines.find(l => /^ {10,}$/.test(l))!
  const body = lines.find(l => l.includes('▝▜█████▛▘'))!
  expect(gap.length + body.indexOf('▝▜') + 2).toBe(border.indexOf('▘▘'))
  expect(first).toMatch(/· Lv \d+ · Fine ─╯/)

  // A failed tool makes it fret.
  const startedAt = state.now
  await $.turn.start({ text: 'one', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'false' } as never)
  // While Claude works the pet is out in the chat, under the spinner, fretting
  // over the failed tool; its yard in the band waits empty.
  const SPIN = {
    plugin: 'session-cockpit', surface: 'terminal', component: 'Spinner', requestId: 'spin',
    props: { word: 'Cooking', message: null, suffix: '…', mode: 'responding' },
  } as const
  const spinText = async () => {
    const sp = await $.ui.mount(SPIN as never)
    const rows = (await sp.findAll({ type: 'Text' })).map(x => x.text)
    await sp.unmount()
    return rows.join('\n')
  }
  expect(await bandText()).not.toContain('▐▛')
  expect(await spinText()).toMatch(/▐▛███▜▌ !/)
  // Then it runs the width of the chat: well past the band's small yard.
  state.now += 3_000
  const at = (text: string) => Math.max(...text.split('\n').map(l => l.indexOf('▝▜')))
  const seen = new Set<number>()
  for (let i = 0; i < 12; i++) {
    seen.add(at(await spinText()))
    state.now += 700
  }
  expect(Math.max(...seen)).toBeGreaterThan(PET_WIDTH)

  state.now += 4_000
  await $.turn.complete({ turnId: 't1', answer: '', durationMs: state.now - startedAt, isAborted: false, reason: 'answer' })
  // Home again, it cheers in its yard.
  expect(await bandText()).toMatch(/[✦✧] ▐/)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-settings' })
  await ui.press({ key: 'tab-config' })
  expect(await ui.find({ type: 'Text', text: /Claude pet/ })).toBeDefined()
  await ui.press({ key: 'fx-pet' })
  await ui.unmount()
  const text = await bandText()
  expect(text).not.toContain('▐▛')
  expect(text).not.toContain('▐█')
})

test('the pet grows with the days you use Claude, earns achievements and skins', async () => {
  const day = 86_400_000
  // Noon on a Wednesday, local time, so no hour or weekday achievement fires by accident.
  const start = new Date(2026, 9, 21, 12).getTime()
  let life = newPetLife(start)
  expect(petStats(life, start).stage).toBe('egg')
  expect(petStats(life, start).hunger).toBe('full')

  // Three turns hatch the egg on day one.
  const earned: string[] = []
  for (let i = 0; i < 3; i++) {
    const r = feedAndAward(life, start + i * 60_000)
    life = r.life
    earned.push(...r.earned.map(a => a.id))
  }
  expect(petStats(life, start).stage).toBe('baby')
  expect(earned).toEqual(['hatched'])

  // A turn a day for six more days: a kid at three, grown up at seven, with streaks.
  for (let d = 1; d < 7; d++) {
    const r = feedAndAward(life, start + d * day)
    life = r.life
    earned.push(...r.earned.map(a => a.id))
  }
  const now = start + 6 * day
  const st = petStats(life, now)
  expect(st.stage).toBe('adult')
  expect(st.activeDays).toBe(7)
  expect(st.streak).toBe(7)
  expect(st.weekDays).toBe(7)
  // Seven days of use make three and a half hearts; pats on three of them fill the rest.
  expect(st.bond).toBe(4)
  let petted = life
  for (const d of [4, 5, 6]) petted = patPet(petted, start + d * day).life
  expect(petStats(petted, now).patWeekDays).toBe(3)
  expect(petStats(petted, now).bond).toBe(5)
  expect(st.level).toBeGreaterThan(1)
  expect(earned).toContain('streak-3')
  expect(earned).toContain('streak-7')
  expect(earned).toContain('grown')
  expect(hasSkin(life, 'mint')).toBe(true)
  expect(hasSkin(life, 'gold')).toBe(false)
  // Sky, Rose and Leaf are free from the start; patterned skins and
  // accessories come with achievements.
  expect(['sky', 'rose', 'leaf'].every(id => hasSkin(newPetLife(start), id))).toBe(true)
  expect(hasSkin(life, 'tiger')).toBe(false)
  expect(hasAccessory(life, 'bow')).toBe(true)
  expect(hasAccessory(newPetLife(start), 'bow')).toBe(false)
  // A weekend turn falls inside any seven days in a row.
  expect(earned).toContain('weekend')

  // Left alone it gets hungry, and the streak runs out.
  expect(petStats(life, now + 30 * 3_600_000).hunger).toBe('hungry')
  expect(petStats(life, now + 4 * day).hunger).toBe('starving')
  expect(petStats(life, now + 4 * day).streak).toBe(0)
  // Coming back after three days is an achievement of its own.
  expect(feedAndAward(life, now + 4 * day).earned.map(a => a.id)).toContain('comeback')

  // A broken save starts a new egg; unknown skins and achievements are dropped.
  expect(petLifeFrom('nonsense', start).turns).toBe(0)
  const read = petLifeFrom({ ...life, skin: 'rainbow', achievements: { hatched: 1, nope: 2 } }, start)
  expect(read.skin).toBe('classic')
  expect(Object.keys(read.achievements)).toEqual(['hatched'])
  // Each stage draws its own body; an egg has no eyes.
  const rows = (stage: Parameters<typeof pet>[4]) => pet('idle', 600, false, PET_WIDTH, stage).map(r => r.map(x => x.text).join(''))
  expect(rows('egg').join('')).toContain('▟███▙')
  // Its shell is speckled with pale spots.
  expect(pet('idle', 600, false, PET_WIDTH, 'egg').flat().filter(x => x.color === 'text').length).toBe(2)
  // Rolling, it moves half a cell a step, so no step jumps a whole cell.
  const rolled = (t: number) => pet('work', t, false, 40, 'egg').map(r => r.map(x => x.text).join(''))
  expect(rolled(0)[1]).toBe(`  ▟███▙${' '.repeat(33)}`)
  expect(rolled(100)[1]).toBe(`  ▗████▖${' '.repeat(32)}`)
  expect(rolled(200)[1]).toBe(`   ▟███▙${' '.repeat(32)}`)
  expect(rows('baby')[0]!.trim()).toBe('')
  expect(rows('kid')[1]).toContain(' █████ ')
  expect(pet('idle', 600, false, PET_WIDTH, 'adult', 'mint')[1]!.some(x => x.color === 'success')).toBe(true)
  // A patterned skin paints part of the body in its second color.
  const tiger = pet('idle', 600, false, PET_WIDTH, 'adult', 'tiger').flat()
  expect(tiger.some(x => x.color === 'warning') && tiger.some(x => x.color === 'inactive')).toBe(true)
  // Accessories go where the body leaves room: a bow beside its head, shades
  // over its eyes, a sweater on its body.
  const wearing = (accessory: string) => pet('idle', 600, false, PET_WIDTH, 'adult', 'classic', 'fine', { accessory })
  expect(wearing('bow')[0]!.map(x => x.text).join('')).toContain('▜▌⋈')
  expect(wearing('shades')[0]!.some(x => x.color === 'inactive' && x.text === '█')).toBe(true)
  expect(wearing('sweater')[1]!.find(x => x.text.trim() !== '')?.color).toBe('error')
})

test('the Pet tab shows the pet, its skins and achievements; /pet names it', async ($, on) => {
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_700_000_000_000 }))
  on('clock.every', () => ({ value: {} as never }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push((e as unknown as { text: string }).text)
    return { value: undefined } as never
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.usage', () => ({
    value: { startedAt: 1_700_000_000_000, context: { window: 200_000 }, rateLimits: [], cost: { usd: 0 } },
  }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  for (const id of ['t1', 't2', 't3']) {
    await $.turn.start({ text: id, turnId: id })
    await $.turn.complete({ turnId: id, answer: '', durationMs: 1000, isAborted: false, reason: 'answer' })
  }
  expect(toasts.some(t => /^Clawd hatched: an? (common|uncommon|rare|legendary) \w+!/.test(t) && t.includes('Achievement: Hatched'))).toBe(true)

  const named = (await $.command.run({ command: 'pet', args: 'Mochi' } as never)) as { text: string }
  expect(named.text).toBe('Your pet is now called Mochi.')
  const shown = (await $.command.run({ command: 'pet', args: '' } as never)) as { text: string }
  expect(shown.text).toMatch(/^Mochi is a baby \w+ at level/)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-pet' })
  expect(await ui.find({ type: 'Text', text: /^MOCHI$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Baby · level/ })).toBeDefined()
  // Achievements and skins have tabs of their own.
  await ui.press({ key: 'tab-trophies' })
  // Hatched, and perhaps an hour-of-day one, as the clock falls in this time zone.
  expect(await ui.find({ type: 'Text', text: /^[12] of 15$/ }), 'achievements').toBeDefined()
  await ui.press({ key: 'tab-skins' })
  // A locked skin says how to earn it and is not worn.
  await ui.press({ key: 'skin-gold' })
  expect(toasts.at(-1)).toContain('Wise old friend')
  // An owned one is worn at a press.
  await ui.press({ key: 'skin-classic' })
  expect(await ui.find({ type: 'Text', text: /^◉ $/ })).toBeDefined()
  // Accessories sit under the skins: a locked one says how to earn it, an
  // owned one is worn on the pet at a press.
  await ui.press({ key: 'wear-sweater' })
  expect(toasts.at(-1)).toContain('Hundred meals')
  const bows = async () => (JSON.stringify(await ui.drawn()).match(/⋈/g) ?? []).length
  const listed = await bows()
  await ui.press({ key: 'wear-bow' })
  expect(await bows()).toBe(listed + 1)
  await ui.press({ key: 'wear-none' })
  expect(await bows()).toBe(listed)
  // Settings holds Theme and Effects; Work holds four tabs.
  await ui.press({ key: 'group-settings' })
  expect(await ui.find({ type: 'Text', text: /^Effects$/ })).toBeDefined()
  await ui.press({ key: 'group-work' })
  expect(await ui.find({ type: 'Text', text: /^Guard$/ })).toBeDefined()
  await ui.unmount()
})

test('the pet tires from a long day, frets over failures and dozes off late', async () => {
  const noon = new Date(2026, 9, 22, 12).getTime()
  const MIN = 60_000
  const calm = { now: noon, todayTurns: 5, work2h: 10 * MIN, work3h: 10 * MIN, failures: 0, idleMs: MIN }
  expect(petFeeling(calm)).toBe('fine')
  expect(petFeeling({ ...calm, todayTurns: 30 })).toBe('tired')
  expect(petFeeling({ ...calm, work2h: 80 * MIN })).toBe('tired')
  expect(petFeeling({ ...calm, todayTurns: 60, failures: 5 })).toBe('exhausted')
  expect(petFeeling({ ...calm, todayTurns: 30, failures: 3 })).toBe('stressed')
  expect(petFeeling({ ...calm, now: new Date(2026, 9, 22, 23, 30).getTime() })).toBe('sleepy')
  expect(petFeeling({ ...calm, idleMs: 31 * MIN })).toBe('bored')
  // Only the part of each turn inside the window counts; a running turn counts up to now.
  const turns = [
    { startedAt: noon - 3 * 60 * MIN, durationMs: 90 * MIN },
    { startedAt: noon - 10 * MIN, durationMs: null },
  ]
  expect(workIn(turns, noon, 2 * 60 * MIN)).toBe(40 * MIN)
  expect(workIn(turns, noon, 3 * 60 * MIN)).toBe(100 * MIN)
  // Feelings show on the face: heavy lids, crossed eyes, and a worn-out pet asleep at rest.
  const text = (mood: Parameters<typeof pet>[0], feeling: Parameters<typeof pet>[7]) =>
    pet(mood, 600, false, PET_WIDTH, 'adult', 'classic', feeling).flat().map(x => x.text).join('')
  expect(text('work', 'tired')).toContain('▀')
  expect(text('work', 'stressed')).toContain('▚')
  expect(text('work', 'fine')).not.toContain('▀')
  expect(text('idle', 'exhausted')).toBe(text('sleep', 'fine'))
})

test('a long day tells you once that the pet is tired', async ($, on) => {
  const now = new Date(2026, 9, 22, 12).getTime()
  const life = { ...newPetLife(now - 86_400_000), days: { [dayKey(now)]: 29 }, turns: 29, lastFedAt: now - 60_000 }
  mock.store(on, { petLife: life })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: {} as never }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push((e as unknown as { text: string }).text)
    return { value: undefined } as never
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.usage', () => ({
    value: { startedAt: now, context: { window: 200_000 }, rateLimits: [], cost: { usd: 0 } },
  }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  for (const id of ['t1', 't2']) {
    await $.turn.start({ text: id, turnId: id })
    await $.turn.complete({ turnId: id, answer: '', durationMs: 1000, isAborted: false, reason: 'answer' })
  }
  expect(toasts.filter(t => t.includes('Clawd is tired')).length).toBe(1)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-pet' })
  expect(await ui.find({ type: 'Text', text: /^Tired$/ })).toBeDefined()
  await ui.unmount()
})

test('petting draws hearts, soothes a stressed pet and earns friendship', async () => {
  const now = new Date(2026, 9, 22, 12).getTime()
  let life = newPetLife(now)
  for (let i = 0; i < 9; i++) life = patPet(life, now + i).life
  const tenth = patPet(life, now + 10)
  expect(tenth.life.pats).toBe(10)
  expect(tenth.earned.map(a => a.id)).toEqual(['pats-10'])
  // A pat earns no turn achievements, and feeds nothing.
  expect(tenth.life.lastFedAt).toBeNull()
  expect(petMood({ now: now + 1000, isWorking: true, isCold: false, turnEndedAt: null, failedAt: now, pattedAt: now })).toBe('loved')
  expect(petMood({ now: now + 4000, isWorking: false, isCold: false, turnEndedAt: null, failedAt: null, pattedAt: now })).toBe('idle')
  const rows = pet('loved', 600, false).flat().map(x => x.text).join('')
  expect(rows).toContain('♥')
  const calm = { now, todayTurns: 5, work2h: 0, work3h: 0, failures: 4, idleMs: 0 }
  expect(petFeeling(calm)).toBe('stressed')
  expect(petFeeling({ ...calm, pattedAgo: 60_000 })).toBe('fine')
  expect(petFeeling({ ...calm, failures: 0, idleMs: 3_600_000, pattedAgo: 60_000 })).toBe('fine')
  // Rest, not pats, cures tiredness.
  expect(petFeeling({ ...calm, todayTurns: 40, pattedAgo: 60_000 })).toBe('tired')
})

test('a click on the pet, its button or /pat pets it', async ($, on) => {
  const state = { now: new Date(2026, 9, 22, 12).getTime() }
  mock.store(on, { petLife: { ...newPetLife(state.now), pats: 8 } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: state.now }))
  on('clock.every', () => ({ value: {} as never }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push((e as unknown as { text: string }).text)
    return { value: undefined } as never
  })
  on('session.usage', () => ({
    value: { startedAt: state.now, context: { window: 200_000 }, rateLimits: [], cost: { usd: 0 } },
  }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-pet' })
  expect(await ui.find({ type: 'Text', text: /^Petted 8 times$/ })).toBeDefined()
  // A click on the pet itself, then its button.
  await ui.pointer({ type: 'down', x: 4, y: 1, button: 'left' } as never)
  await ui.press({ key: 'pet-pat' })
  expect(toasts).toContain('Achievement: Good friend')
  expect(await ui.find({ type: 'Text', text: /^Petted 10 times$/ })).toBeDefined()
  // Hearts float over the pet for a moment.
  const drawn = await ui.find({ type: 'Client', key: 'pet-touch-big' })
  expect(JSON.stringify(drawn?.props.props)).toContain('♥')
  await ui.unmount()

  const said = (await $.command.run({ command: 'pat', args: '' } as never)) as { text: string }
  expect(said.text).toBe('You pet Clawd. ♥ (11 times so far)')
})

test('stamina follows the five-hour usage limit and wears the pet down', async ($, on) => {
  expect(petStamina([])).toBeNull()
  expect(petStamina([{ kind: 'seven_day', percentUsed: 20 }])).toBeNull()
  expect(petStamina([{ kind: 'five_hour', percentUsed: 36, resetsAt: '2026-10-22T07:19:00Z' }])).toEqual({
    percent: 64,
    refillsAt: Date.parse('2026-10-22T07:19:00Z'),
  })
  expect(petStamina([{ kind: 'five_hour', percentUsed: 104 }])).toEqual({ percent: 0, refillsAt: null })
  const now = new Date(2026, 9, 22, 12).getTime()
  const calm = { now, todayTurns: 5, work2h: 0, work3h: 0, failures: 0, idleMs: 0 }
  expect(petFeeling({ ...calm, stamina: 64 })).toBe('fine')
  expect(petFeeling({ ...calm, stamina: 15 })).toBe('drained')
  expect(petFeeling({ ...calm, stamina: 0 })).toBe('exhausted')
  expect(petFeeling({ ...calm, stamina: null })).toBe('fine')

  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.usage', () => ({
    value: {
      startedAt: now,
      context: { window: 200_000 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 85, resetsAt: new Date(now + 3_600_000).toISOString() }],
      cost: { usd: 0 },
    },
  }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-pet' })
  expect(await ui.find({ type: 'Text', text: /^ 15%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^ · full again at 13:00$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Low on energy$/ })).toBeDefined()
  await ui.unmount()
  const said = (await $.command.run({ command: 'pet', args: '' } as never)) as { text: string }
  expect(said.text).toContain('15% stamina')
})

test('eggs hatch into species by rarity, and grown pets take the way of their habits', async () => {
  // Rolls follow the rarity table: 59.9% common, 25% uncommon, 12% rare, 3% legendary, 0.1% mythic.
  const n: Record<string, number> = {}
  const rolls = 200_000
  for (let i = 0; i < rolls; i++) {
    const k = hatchSpecies(1_700_000_000_000 + i * 7919)
    n[k] = (n[k] ?? 0) + 1
  }
  const share = (...ids: string[]) => ids.reduce((a, k) => a + (n[k] ?? 0), 0) / rolls
  expect(Math.abs(share('clawd', 'chick', 'frog') - 0.599)).toBeLessThan(0.01)
  expect(Math.abs(share('dragon', 'unicorn') - 0.03)).toBeLessThan(0.005)
  expect(share('king')).toBeGreaterThan(0.0005)
  expect(share('king')).toBeLessThan(0.0015)
  // The Clawd King wears a golden crown whatever its skin.
  const king = pet('idle', 600, false, PET_WIDTH, 'adult', 'mint', 'fine', { species: 'king' })
  expect(king[0]!.some(x => x.text.includes('▙▟▙') && x.color === 'warning')).toBe(true)
  expect(king[1]!.some(x => x.text.includes('▐▛███▜▌') && x.color === 'success')).toBe(true)
  // Every species draws nine cells wide and gets its eyes swapped by feelings.
  for (const s of PET_SPECIES) {
    for (const stage of ['baby', 'kid', 'adult'] as const) {
      const rows = pet('work', 600, false, PET_WIDTH, stage, 'classic', 'tired', { species: s.id })
      expect(rows.every(r => r.reduce((w, x) => w + Array.from(x.text).length, 0) === PET_WIDTH)).toBe(true)
      expect(rows.flat().map(x => x.text).join(''), `${s.id} ${stage}`).toContain('▀')
    }
  }
  // The egg hatches into a species on its third turn.
  const start = new Date(2026, 9, 1, 12).getTime()
  let life = newPetLife(start)
  for (let i = 0; i < 3; i++) life = feedAndAward(life, start + i * 60_000).life
  expect(life.species).toBe(hatchSpecies(start + 2 * 60_000))
  expect(life.hours[12]).toBe(3)
  // An old save that had hatched stays a Clawd; an old egg waits for its roll.
  expect(petLifeFrom({ turns: 50 }, start).species).toBe('clawd')
  expect(petLifeFrom({ turns: 1 }, start).species).toBeNull()
  // Seven days, mostly at night: a Night Owl, settled on the day it grows up.
  for (let d = 1; d < 7; d++) {
    for (let i = 0; i < 3; i++) life = feedAndAward(life, new Date(2026, 9, 1 + d, 23, i).getTime()).life
    expect(life.path).toBe(d < 6 ? null : 'owl')
  }
  expect(choosePath(newPetLife(start), start)).toBe('balanced')
  expect(choosePath({ ...newPetLife(start), pats: 40 }, start)).toBe('cuddly')
  // The way it grew shows as a mark beside it.
  const owl = pet('idle', 600, false, PET_WIDTH, 'adult', 'classic', 'fine', { path: 'owl' })
  expect(owl.flat().some(x => x.text.includes('☾'))).toBe(true)
})

test('the Pet tab shows the odds in the egg and where the pet is heading', async ($, on) => {
  const now = new Date(2026, 9, 22, 12).getTime()
  mock.store(on, { petLife: newPetLife(now) })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.usage', () => ({ value: { startedAt: now, context: { window: 200_000 }, rateLimits: [], cost: { usd: 0 } } }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-pet' })
  await ui.press({ key: 'tab-evolution' })
  expect(await ui.find({ type: 'Text', text: /^3%\s+$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Dragon$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^, Unicorn$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^0\.1%\s+$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Clawd King$/ })).toBeDefined()
  await ui.unmount()
})

test('a new egg rolls the species again, once a day, once confirmed', async ($, on) => {
  const now = new Date(2026, 9, 22, 12).getTime()
  const grown = {
    ...newPetLife(now - 10 * 86_400_000),
    species: 'cat',
    path: 'sage',
    turns: 40,
    eggTurns: 40,
    days: { [dayKey(now)]: 5 },
    achievements: { hatched: now - 9 * 86_400_000 },
  }
  // Pure rules: kept progress, a fresh egg, one a day, none while an egg waits.
  const egg = layNewEgg(grown, now)
  expect([egg.species, egg.path, egg.eggTurns, egg.turns]).toEqual([null, null, 0, 40])
  expect(petStats(egg, now).stage).toBe('egg')
  expect(newEggBlock(grown, now)).toBeNull()
  expect(newEggBlock(egg, now)).toContain('already')
  let hatched = egg
  for (let i = 1; i <= 3; i++) hatched = feedAndAward(hatched, now + i * 60_000).life
  expect(hatched.species).toBe(hatchSpecies(now + 3 * 60_000))
  expect(newEggBlock(hatched, now + 4 * 60_000)).toContain('tomorrow')
  expect(newEggBlock(hatched, now + 86_400_000)).toBeNull()

  mock.store(on, { petLife: grown })
  const state = { now }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: state.now }))
  on('clock.every', () => ({ value: {} as never }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push((e as unknown as { text: string }).text)
    return { value: undefined } as never
  })
  on('session.usage', () => ({ value: { startedAt: now, context: { window: 200_000 }, rateLimits: [], cost: { usd: 0 } } }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-pet' })
  await ui.press({ key: 'tab-evolution' })
  // The first press asks right there, with no hurry; Keep leaves it be.
  await ui.press({ key: 'pet-new-egg' })
  expect(await ui.find({ type: 'Text', text: /^Swap Clawd the Cat for a new egg\?/ })).toBeDefined()
  await ui.press({ key: 'pet-new-egg-no' })
  expect(await ui.find({ type: 'Text', text: /^Swap Clawd/ })).toBeUndefined()
  await ui.press({ key: 'pet-new-egg' })
  state.now += 60_000
  await ui.press({ key: 'pet-new-egg-yes' })
  expect(toasts.at(-1)).toContain('A new egg!')
  await ui.press({ key: 'tab-pet' })
  expect(await ui.find({ type: 'Text', text: /^Hatches after 3 more turns$/ })).toBeDefined()
  await ui.unmount()
})

test('the Stats tab draws a year of turns and sums a chosen span', async ($, on) => {
  const now = new Date(2026, 9, 22, 12).getTime() // a Thursday
  const day = 86_400_000
  const days: Record<string, number> = {}
  for (const [ago, n] of [[0, 4], [1, 2], [2, 9], [10, 1], [40, 20], [41, 3]] as const) days[dayKey(now - ago * day)] = n
  const life = { ...newPetLife(now - 50 * day), days, turns: 39, eggTurns: 39, species: 'clawd', pats: 5, patDays: { [dayKey(now)]: 2 } }
  life.hours[23] = 7
  // Pure: columns of weeks, Sunday on top, days to come left blank.
  const heat = petHeatmap(days, now, 10)
  expect(heat.cells.length).toBe(10)
  // Levels are quarters of the busiest day in view (20 turns).
  expect(heat.cells.at(-1)).toEqual([0, 0, 2, 1, 1, -1, -1])
  expect(heat.months.map(m => m.name)).toContain('Oct')
  expect(petRangeStats(life, now, 'week')).toMatchObject({ turns: 15, activeDays: 3, spanDays: 7, longestStreak: 3, pats: 2 })
  expect(petRangeStats(life, now, 'all')).toMatchObject({ turns: 39, activeDays: 6, spanDays: 42, pats: 5 })
  expect(petRangeStats(life, now, 'all').mostActive).toEqual({ day: dayKey(now - 40 * day), turns: 20 })
  expect(favoriteHour(life)).toBe(23)

  mock.store(on, { petLife: life })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: {} as never }))
  on('session.usage', () => ({ value: { startedAt: now, context: { window: 200_000 }, rateLimits: [], cost: { usd: 0 } } }))
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'group-pet' })
  await ui.press({ key: 'tab-stats' })
  expect(await ui.find({ type: 'Text', text: /^Wed $/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^ Less $|^    Less $/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^39$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^23:00$/ })).toBeDefined()
  await ui.press({ key: 'stats-week' })
  expect(await ui.find({ type: 'Text', text: /^15$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^\/7$/ })).toBeDefined()
  await ui.press({ key: 'stats-all' })
  await ui.unmount()
})
