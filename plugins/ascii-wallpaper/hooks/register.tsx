import { atom, read, update } from 'claude-code'
import type { Register, ThemeResult, ThemeSetArgs } from 'claude-code'

import { SCENES, buildScene, isSceneId } from './scenes'
import type { SceneId } from './scenes'

const COMMAND = 'wallpaper'

// The scene /wallpaper picked for this session; null follows the `scene` option.
const picked = atom({ plugin: 'ascii-wallpaper', key: 'scene' } as const, null)

type Choice = SceneId | 'off'

const isChoice = (value: unknown): value is Choice => value === 'off' || isSceneId(value)

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

const nameOf = (id: Choice) => (id === 'off' ? 'Off' : SCENES.find(s => s.id === id)!.name)

const LIST = [...SCENES.map(s => `${s.id} (${s.name})`), 'off'].join(', ')

export const register: Register = (on, options) => {
  const fallback: Choice = isChoice(options.scene) ? options.scene : 'honu'
  const glass = options.glass !== false
  const veil = clamp(options.veil, 0, 0.8, 0.25)
  const speed = clamp(options.speed, 0.25, 3, 1)
  // Built once per scene for this module: the SVG only changes with the options.
  const built = new Map<SceneId, string>()

  const look = (id: SceneId): ThemeSetArgs => ({
    backdrop: { scene: id, glass: glass ? { blur: 12 } : false },
    // Text follows the scene, not the person's mode: light on a night sky, dark on a bright one.
    overrideColorScheme: SCENES.find(s => s.id === id)!.scheme,
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Change the wallpaper for this session: /wallpaper <scene>, or off',
    })
    const stored = await read($, picked)
    const choice = isChoice(stored) ? stored : fallback
    // "off" leaves whatever look stands: clearing here would wipe another mod's theme.
    if (choice !== 'off') await $.theme.set(look(choice))

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    const stored = await read($, picked)
    const current: Choice = isChoice(stored) ? stored : fallback

    if (arg === '') {
      return { text: `Wallpaper: ${nameOf(current)}. Choose one with /wallpaper <scene>: ${LIST}.` }
    }
    if (!isChoice(arg)) {
      return { text: `There is no "${arg}" wallpaper. Choose one of: ${LIST}.` }
    }

    await update($, picked, () => arg)
    if (arg === 'off') {
      await $.theme.clear()
      return { text: 'Wallpaper off for this session. /wallpaper <scene> brings one back.' }
    }

    const result: ThemeResult = await $.theme.set(look(arg))
    return {
      text: result.isDrawn
        ? `Wallpaper: ${nameOf(arg)}.`
        : `Wallpaper set to ${nameOf(arg)}. It shows in the Claude desktop and mobile apps, not in a terminal.`,
    }
  }).catch(() => ({ text: 'The wallpaper could not be changed. Try /wallpaper again, or restart the session.' }))

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    // Every mod's backdrop comes here; draw only the one this mod set.
    if (e.props.plugin !== $.plugin.name || !isSceneId(e.props.scene)) return next(e)
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)

    const id = e.props.scene
    let source = built.get(id)
    if (source === undefined) {
      source = buildScene(id, { speed, veil })
      built.set(id, source)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={source} alt={SCENES.find(s => s.id === id)!.alt} isInteractive />
  })
}
