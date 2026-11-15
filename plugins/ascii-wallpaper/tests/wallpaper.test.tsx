import { expect, test } from 'claude-code/testing'
import type { ThemeSetArgs } from 'claude-code'

import { SCENE_IDS, buildScene } from '../hooks/scenes'

const BACKDROP = (scene: string, plugin = 'ascii-wallpaper') =>
  ({
    plugin: 'ascii-wallpaper',
    component: 'Backdrop',
    props: { scene, plugin, glass: { blur: 12, opacity: 0.6 } },
  }) as const

test('every scene builds a self-contained SVG under the size limit', async () => {
  for (const id of SCENE_IDS) {
    for (const speed of [0.25, 1, 3]) {
      const svg = buildScene(id, { speed, veil: 0.8 })
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg.length).toBeLessThan(131072)
      expect(/<script|\son\w+=|https?:\/\/(?!www\.w3\.org)/.test(svg)).toBe(false)
    }
  }
  // Speed scales every duration, the veil only shows when asked for.
  expect(buildScene('clouds', { speed: 1, veil: 0 })).not.toBe(buildScene('clouds', { speed: 2, veil: 0 }))
  expect(buildScene('clouds', { speed: 1, veil: 0 }).includes('class="veil"')).toBe(false)
  expect(buildScene('clouds', { speed: 1, veil: 0.3 }).includes('class="veil"')).toBe(true)
})

test('the session starts with the chosen scene and frosted panels', { options: { scene: 'koi' } }, async ($, on) => {
  const sets: ThemeSetArgs[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 't1' } }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(sets).toEqual([{ backdrop: { scene: 'koi', glass: { blur: 12 } } }])
})

test('off sets no look at all', { options: { scene: 'off', glass: false } }, async ($, on) => {
  const sets: ThemeSetArgs[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 't1' } }
  })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  expect(sets).toEqual([])
})

test('/wallpaper switches the scene for the session and explains a wrong name', async ($, on) => {
  const sets: ThemeSetArgs[] = []
  let cleared = 0
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: false, reason: 'No app is attached' } }
  })
  on('theme.clear', () => {
    cleared++
    return { value: { isDrawn: false, reason: 'cleared' } }
  })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(sets.at(-1)?.backdrop).toEqual({ scene: 'honu', glass: { blur: 12 } })

  const listed = await $.command.run({ command: 'wallpaper', args: '' } as never)
  expect(listed.text).toContain('Turtle lagoon')

  const moon = await $.command.run({ command: 'wallpaper', args: 'Moon' } as never)
  expect(sets.at(-1)?.backdrop).toEqual({ scene: 'moon', glass: { blur: 12 } })
  expect(moon.text).toContain('desktop and mobile apps')

  const wrong = await $.command.run({ command: 'wallpaper', args: 'sunset' } as never)
  expect(wrong.text).toContain('There is no "sunset" wallpaper')

  await $.command.run({ command: 'wallpaper', args: 'off' } as never)
  expect(cleared).toBe(1)

  // A reload keeps the session's pick: off stays off.
  const before = sets.length
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(sets.length).toBe(before)
})

test('the backdrop draws the scene on desktop and mobile, and leaves other mods alone', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>beneath</Text>
  })

  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BACKDROP('jelly'), surface })
    const svg = await ui.find({ type: 'Svg' })
    expect(svg).toBeDefined()
    await ui.unmount()

    const other = await $.ui.mount({ ...BACKDROP('jelly', 'someone-else'), surface })
    expect(await other.find({ type: 'Svg' })).toBeUndefined()
    await other.unmount()
  }
})
