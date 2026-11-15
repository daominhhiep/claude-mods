# ASCII Wallpaper

A Claude Code mod that puts an animated wallpaper, drawn in characters, behind the conversation in the Claude desktop and mobile apps, and frosts the panels over it so text stays readable.

Adapted from the [claude-wallpaper](https://github.com/daominhhiep/c-theme/tree/main/claude-wallpaper) Chrome extension for claude.ai. The extension draws each frame on a canvas with script; a mod's backdrop runs no script, so each scene here is one SVG whose glyphs move with CSS animation and SMIL motion paths.

## Scenes

| `scene` | Name | What moves |
| --- | --- | --- |
| `honu` | Turtle lagoon | Three sea turtles, a manta, two dolphins, a school of yellow tangs and a deep whale loop over a turquoise reef; flowers drift down; sunlight bands and ripples cross the water |
| `clouds` | Drifting clouds | Clouds of `S X #` drift across a blue sky, the near ones faster |
| `koi` | Koi pond | Koi swim both ways in slow waves between bobbing lily pads; glints twinkle |
| `jelly` | Jellyfish | Jellyfish pulse and rise with swaying tentacles; plankton drifts up |
| `boats` | Paper boats | Paper boats bob along a rippling sea under far clouds |
| `fireflies` | Fireflies | Fireflies wander and blink with a glow over a meadow whose tips lean in a travelling wave |
| `moon` | Moonlit night | A crescent moon with a halo, twinkling stars, shooting stars and passing clouds |

The turtle lagoon is simplified from the extension's: creatures are drawn as shapes with glyphs over them and follow their paths whole, without the per-frame resampling into cells or the bubble trails.

Every scene fills any window, from a tall phone to a wide desktop. With reduced motion on in the system, the CSS animation stops (the lagoon's creatures still follow their paths).

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `scene` | `honu` | The scene, or `off` for the app's own background |
| `glass` | `true` | Frost the panels over the wallpaper; off leaves them as they are |
| `veil` | `0.25` | Fade the wallpaper toward the page color, 0 to 0.8, in light and dark mode |
| `speed` | `1` | How fast the scene moves, 0.25 to 3 |

## Commands

- `/wallpaper` shows the current scene and the list.
- `/wallpaper <scene>` switches to that scene for this session; `/wallpaper off` turns it off.

## Where it shows

The desktop and mobile apps draw it. A terminal or an editor draws no wallpaper; the mod then does nothing.

## What it does

| Event | What the hook does | Changes anything? |
| --- | --- | --- |
| `session.start` | Registers `/wallpaper` and sets the session's look to the chosen scene (with `off`, sets nothing) | Sets the session's theme |
| `command.run` (`wallpaper`) | Shows or switches the scene for this session | Answers its own command only; `off` clears the session's theme |
| `ui.render` (`Backdrop`) | Draws this mod's scene as an SVG | Draws only a backdrop this mod set |

It reads nothing from the conversation, starts no programs and sends nothing anywhere.

## Develop

```
claude plugin validate plugins/ascii-wallpaper
claude plugin test plugins/ascii-wallpaper
```
