import { expect, test } from 'claude-code/testing'

import { detectBlast, levelOf, lineDiff, parseBudget, prRefFrom, rollup } from '../hooks/rules'

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
    await ui.press({ key: 'tab-log' })
    expect(await ui.find({ type: 'Text', text: /go test/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /^Bash/ }))?.text).toContain('Bash')
    expect((await ui.find({ type: 'Text', text: /^\d+ calls?$/ }))?.text).toBe('1 call')
    await ui.press({ key: 'tab-weather' })
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
    await ui.press({ key: 'tab-replay' })
    expect((await ui.find({ type: 'Text', text: /main\.go/ }))?.text).toBe('main.go')
    expect(await ui.find({ type: 'Code' })).toBeDefined()
    await ui.unmount()
  }
})

test('the band above the prompt shows session cost and time', async ($, on) => {
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

  const BAND = {
    plugin: 'session-cockpit',
    component: 'AbovePrompt',
    requestId: 'above-prompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 120, view: {} },
  } as const
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const band = await $.ui.mount({ ...BAND, surface } as never)
    const texts = (await band.findAll({ type: 'Text' })).map(x => x.text)
    expect(texts).toContain('⚡ 80% ████████   context')
    expect(texts).toContain('$1.42 spent')
    expect(texts).toContain('◷ 5:00 ▰▰▰▰▰ cache')
    expect(texts).toContain('11m 35s session · 1m 35s working')
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
  props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 160, view: {} },
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
  expect((await band.find({ type: 'Text', text: /\/ \$10/ }))?.text).toBe('$5.20 / $10 spent')
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
    expect((await band.find({ type: 'Text', text: /cache/ }))?.text).toBe('◷ 3:20 ▰▰▰▱▱ cache')
    expect((await band.find({ type: 'Text', text: /#101/ }))?.text).toBe('#101 Add an approval gate')
    expect((await band.find({ type: 'Text', text: /failing/ }))?.text).toBe('✓ 1  ✗ 1 · lint failing')
    expect(await band.find({ type: 'Text', text: /approved/ })).toBeDefined()
    expect((await band.find({ type: 'Text', text: /agent/ }))?.text).toBe('◌ 1 agent · code-reviewer')
    await band.unmount()

    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'tab-agents' })
    expect((await ui.find({ type: 'Text', text: /code-reviewer/ }))?.text).toContain('1 tool')
    expect((await ui.find({ type: 'Text', text: /↳/ }))?.text).toContain('src/loader.go')
    expect((await ui.find({ type: 'Text', text: /cached/ }))?.text).toContain('80.0k in · 3.0k out · 88% cached')
    await ui.unmount()
  }

  state.now += 300_000
  const cold = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  expect((await cold.find({ type: 'Text', text: /cache/ }))?.text).toBe('◷ cold cache')
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
  expect((await before.find({ type: 'Text', text: /opus/ }))?.text).toBe('◆ opus-5-5 model')
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
        breakdown: { isAutoCompactEnabled: true, autoCompactThreshold: 270_000 } as never,
      },
      rateLimits: [],
      cost: { usd: 1 },
    },
  }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ turnId: 't1', answer: '', durationMs: 1000, isAborted: false, reason: 'answer' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const band = await $.ui.mount({ ...BAND, surface } as never)
    expect((await band.find({ type: 'Text', text: /compact limit/ }))?.text).toContain('⚠ 93%')
    await band.unmount()

    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /^93%$/ })).toBeDefined()
    expect((await ui.find({ type: 'Text', text: /before auto-compact/ }))?.text).toContain(
      '250.0k of 270.0k before auto-compact · window 1M',
    )
    await ui.unmount()
  }
})
