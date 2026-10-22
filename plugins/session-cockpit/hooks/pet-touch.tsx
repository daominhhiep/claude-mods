// The pet drawn where a click can reach it: the rows come from the hooks
// module, painted; a press anywhere on them posts a pat back. Unlike a
// Button, nothing turns inverse under the pointer or after the click.
import type { ClientModule } from 'claude-code'

type Props = { rows: { text: string; color: string }[][] }

const PetTouch: ClientModule<Props> = (props, surface) => {
  const { Box, Text } = surface.elements
  surface.onPointer(e => {
    if (e.type === 'down') surface.post({ pat: true })
  })
  return (
    <Box flexDirection="column">
      {props.rows.map(row => (
        <Text>{row.map(x => (x.color === '' ? x.text : <Text color={x.color}>{x.text}</Text>))}</Text>
      ))}
    </Box>
  )
}

export default PetTouch
