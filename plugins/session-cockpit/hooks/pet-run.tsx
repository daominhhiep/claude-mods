// Pet Run, drawn and played here at twenty steps a second: the pane around it
// redraws far less often. Space, ↑ or a click jumps once a click has given it
// the keys; a finished run is posted to the hooks module, which keeps the best.
import type { ClientModule } from 'claude-code'
import { RUN_ROWS, RUN_TICK_MS, newRun, runDraw, runHitbox, runJump, runRuns, runScore, runStep } from './run-game'
import type { RunCell, RunColors, RunState } from './run-game'

type Props = { frames: RunCell[][][]; colors: RunColors; best: number; name: string }

const JUMP_KEYS = new Set([' ', 'space', 'up', 'w', 'k', 'return'])

const PetRun: ClientModule<Props, RunState> = (props, surface) => {
  const { Box, Text } = surface.elements
  const width = Math.max(30, surface.columns)
  const state = surface.state ?? newRun((props.best * 7919 + props.name.length) | 0)
  if (surface.state === undefined) {
    surface.setState(state)
    surface.every(RUN_TICK_MS, () => {
      const s = surface.state
      if (s === undefined || s.phase === 'ready' || (s.phase === 'over' && s.sinceOver >= 8)) return
      const next = runStep(s, Math.max(30, surface.columns), runHitbox(props.frames[0]!))
      if (next.phase === 'over' && s.phase === 'run') surface.post({ run: runScore(next) })
      surface.setState(next)
    })
  }
  const jump = () => {
    const s = surface.state
    if (s !== undefined) surface.setState(runJump(s, props.best))
  }
  surface.onPointer(e => {
    if (e.type === 'down') jump()
  })
  surface.onKey(e => {
    if (JUMP_KEYS.has(e.key)) jump()
  })
  const rows = runDraw(state, props.frames, width, props.colors, props.best, props.name)
  return (
    <Box flexDirection="column" height={RUN_ROWS}>
      {rows.map(row => (
        <Text>{runRuns(row).map(r => (r.color === '' ? r.ch : <Text color={r.color}>{r.ch}</Text>))}</Text>
      ))}
    </Box>
  )
}

export default PetRun
