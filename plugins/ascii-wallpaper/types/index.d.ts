/** A scene id, or 'off'; null follows the `scene` option. */
export type PickedScene = string | null

declare module 'claude-code' {
  interface PluginState {
    'ascii-wallpaper': {
      /** The scene /wallpaper picked for this session. */
      scene: PickedScene
    }
  }
}
