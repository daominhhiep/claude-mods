// The ocean under the pane's content: sharks hunting schools of fish, after
// ascii-sharks (MIT). It runs here on its own clock, so the pane around it
// never redraws for it. A click splashes; the fish shy from the pointer.
import type { ClientModule } from 'claude-code'
import { OceanScene } from './ocean/scene'

type Props = { fps: number }
type State = { scene: OceanScene; frame: number }

const OceanView: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  // Capped, so the drawn tree stays well inside a Client's bounds.
  const cols = Math.min(100, surface.columns)
  const rows = Math.min(40, surface.rows)
  // Too little room for a shark to turn: draw nothing.
  if (cols < 24 || rows < 5) return <Box flexGrow={1} />
  let state = surface.state
  if (state === undefined) {
    state = { scene: new OceanScene(cols, rows), frame: 0 }
    surface.setState(state)
    const ms = Math.round(1000 / Math.max(5, Math.min(30, props.fps)))
    surface.every(ms, () => {
      const s = surface.state
      if (s === undefined) return
      s.scene.advance(ms / 1000)
      surface.setState({ scene: s.scene, frame: s.frame + 1 })
    })
  }
  const scene = state.scene
  scene.resize(cols, rows)
  surface.onPointer(e => {
    if (e.type === 'down') scene.splash(e.x, e.y)
    if (e.type === 'leave') scene.point(null)
    else scene.point({ col: e.x, row: e.y })
  })
  return (
    <Box flexDirection="column">
      {scene.lines().map(line => (
        <Text wrap="truncate">
          {line.map(run =>
            run.color === '' && run.back === '' ? (
              run.text
            ) : (
              <Text color={run.color === '' ? undefined : run.color} backgroundColor={run.back === '' ? undefined : run.back}>
                {run.text}
              </Text>
            ),
          )}
        </Text>
      ))}
    </Box>
  )
}

export default OceanView
