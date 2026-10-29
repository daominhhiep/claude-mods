# claude-mods

Mods for [Claude Code](https://code.claude.com/docs/en/plugins/mods/overview).

## session-cockpit

Keeps the numbers that matter in sight while you chat, and stops the commands you would regret.

**Above the prompt (always on)**

```
╭─ ◆ COCKPIT ───────────────────────────────────────────────── ⠋ running 1m 03s ▱▰▱▱▱▱ ─╮
│  ⚡ 81%  context used    $2.54  / $10 spent    ◷ 3:12  ▰▰▰▱▱ stays warm   47m session · 5m working │
│ ████████████████████████████████████████████████████████████▌░░░░░░░░░░░░░░░░░░░░░ │
│ ◆ opus-5-5 · high effort   ⑂ #101 Add an approval gate   ✓ 2  ✗ 1 · lint failing   ⠋ 2 agents │
╰─────────────────────────────────────────────────────────────────────────────────────╯
```

Values sit on solid colored pills, the context gauge spans the band in eighths of a cell with a light running along it while Claude works, and a light circles the frame (fast while working, slow while idle).

Effects, each turned on or off in Settings · Effects:

- **Fireworks** burst across the band for two seconds when a turn ends, with its time and cost.
- **Flash** at 25, 50, 75 and 90% of the compact limit: the frame flashes and names the level.
- **Color wave** rolls along the gauge while Claude works.
- **Breathing frame** in the last minute before the cache goes cold.
- **Typing**: each new reply from Claude appears letter by letter, in about a second.
- **Light around the frame.**
- **Claude pet** sits on the band's top border, beside the title, its feet on the line, so the rows below keep their full width; the corner under the last row names it with its level and feeling. While Claude works it leaves for the chat and runs back and forth under the spinner (with the cockpit transcript style; otherwise it paces its yard; while the pane shows its Pet or Play tab it stays in the yard, so it is not drawn twice); it cheers when a turn ends, frets when a tool fails, sweats as the context fills and naps once the cache goes cold. It shows whenever the full frame has room to spare.
- **Light mode** (off by default, Settings · Effects): half the frames while Claude works. Measured in a 160×50 terminal, it took Claude Code's CPU from about 31% to 23% while working and nearly halved what is written to the terminal. Turn all leaves it as it is.

Under another mod's note (such as You should know), or when there is little room, the band folds to one row so nothing scrolls.

- **Context**: how close the session is to auto-compact (or to the model's window when auto-compact is off), coloured by level (Clear, Cloudy, Showers, Storm, Compact soon).
- **Cost**: what the session has spent, against your budget when you set one.
- **Cache clock** ("stays warm"): time left before the prompt cache goes cold after Claude's last reply; once cold it says the next reply is slower.
- **Session time**: how long the session has been open and how long Claude actually worked.
- **Model and effort**: the model and effort level of the latest request.
- **Pull request**: shown once the session pushes or touches a PR: checks passed, failed and pending, failing check names, review state.
- **Agents**: how many subagents are running.

What other mods draw above the prompt, such as a You should know note, stays above the frame.

**In the transcript**

- The spinner shimmers in the theme's colors and shows the turn's time and cost so far.
- Your prompts get a `▍ You` label with the time, how long the turn took and what it cost, on your theme's message background.
- Each tool call is one tidy row: status, tool icon, name, a short summary (project folder dropped, home as `~`), duration.

Tool output stays Claude Code's own. Set `transcriptStyle` to `claude` to leave the whole transcript as Claude Code draws it.

**Pane (`/cockpit`)**

Three cards head every tab: context with its trend, cost with each prompt's share, and working time. Five groups sit on one row (Context, Work, Pins, Pet, Settings), shown as icons with only the open one named when the pane is narrow; Work, Pet and Settings have their own tabs below.

| Group · tab | What it shows |
| --- | --- |
| Context | Context gauge and trend; time, cost (with a bar against the dearest prompt) and tokens for each prompt and its subagents |
| Work · Log | Every tool call: time, tool, duration, target, result |
| Work · Agents | Live tree of subagents: status, duration, tool count, tokens in and out, share read from cache, the tool running now |
| Work · Guard | Destructive commands that were stopped for approval, with a preview of what they would affect |
| Work · Diff | Each file edit as a diff, step by step (Prev / Next / Latest) |
| Pins | Every Claude Code session open on this computer, whatever the project (working ones first, with its project and when it started; terminal only, read from each session's record under `~/.claude/sessions`), then pinned sessions of this project (or all projects): name, title, last active, cost, a warning before Claude Code cleans the transcript up, and Open (fills `/resume <id>`; a pin already open elsewhere says so instead) |
| Pet | Seven tabs. **Pet**: species, stage, level and XP, food, bond, stamina, feeling, age and streak. **Ocean**: a big shark, three quarters of the pane wide, hunts schools of fish in blue water across the whole tab; a click splashes and the fish shy from the pointer. Ported from [ascii-sharks](https://github.com/stackedlol/ascii-sharks) (MIT); it runs on its own clock, twenty frames a second (ten in Light mode), so the pane around it does not redraw. **Play**: Pet Run, a game like Chrome's dinosaur: click it, then jump the rocks and cacti with Space or ↑ as your pet runs faster and faster; the best score and runs played are kept. **Stats**: a year of turns as a calendar (a column a week, Less → More) and, for all time or the last 7 or 30 days, turns, active days, most active day, longest and current streak, favorite hour and pats. **Evolution**: the hatch odds with its species marked, New egg, and where it is heading. **Skins** (skins and accessories) and **Achievements** |
| Settings · Theme | A preview of the band and your pet in the chosen theme, then fifteen themes, each with a style of its own beyond color: its frame (round, double, heavy, thin, dashed or plain ASCII, in the band and the pane's boxes), its title mark (⚡ Neon, ❄ Nord, ✿ Sakura, ☾ Dracula…), its gauge (eighths, ▰▱, ●·, ■□, ▓░, #.) and what drifts above the band beside the pet (snow, cherry petals, rain, falling leaves, rising embers or bubbles, twinkling stars, fireflies, a cyberpunk glitch), moving a third or half a row at a time and redrawn as it moves, even at rest; Settings · Effects · Theme weather turns it off. Grouped by terminal background: Claude (follows your Claude Code theme); for dark terminals Ocean, Sunset, Neon, Forest, Mono, Cyberpunk, Dracula, Nord, Gruvbox, Catppuccin, Tokyo Night, Rosé Pine, Sakura; for light terminals Paper. Surprise me picks one at random, Back to Claude returns to yours; kept for every session |
| Settings · Effects | Turn each effect on or off; kept for every session |

**Raising the pet**

The pet is kept across sessions and grows with how often you use Claude Code. Every finished turn feeds it.

- **Species**: the egg hatches into one of eleven, by chance: Common 59.9% (Clawd, Chick, Frog), Uncommon 25% (Cat, Bunny, Penguin), Rare 12% (Fox, Panda), Legendary 3% (Dragon, Unicorn), Mythic 0.1% (the Clawd King, in a golden crown). A pet that hatched before species keeps being a Clawd.
- **New egg**: once a day, ↻ New egg in the Evolution tab (it asks Yes or Keep first) swaps the pet for a new egg that hatches after 3 turns into a fresh roll. Its level, days, achievements and skins stay; its evolution is chosen again.
- **Evolution**: on the day it grows up (7 days of use) it settles on the way your habits shaped it, and wears its mark: Night Owl ☾ (a third of turns 10 pm–5 am), Sprinter » (15 turns a day on average), Sage ∴ (7 days in a row), Cuddly ♡ (30 pats), or All-rounder when no habit stands out. The Pet tab shows how close each one is.
- **Stages**: an egg hatches after 3 turns, then Baby, Kid (3 days of use), Grown-up (7) and Elder (30).
- **Level**: each day you use Claude earns 20 XP plus 5 a turn (up to 20 turns a day); a streak of days in a row adds 10 a day.
- **Food**: full for 4 hours after a turn, then peckish, hungry after a day and starving after three. A hungry pet turns grey and asks for food.
- **Bond**: up to five hearts for how close you two are. Each of the last seven days you used Claude scores a point, and so does each day you petted it; two points make a heart.
- **Achievements** (17): hatching, streaks of 3, 7 and 30 days, 7 and 30 days of use, 100 and 1,000 turns, 20 turns in a day, a turn after midnight, before 7 am or on a weekend, coming back after three days away, petting it 10 and 100 times, and scoring 200 and 1,000 in Pet Run.
- **Skins**: Classic, Sky, Rose and Leaf are free; seven more colors and three patterned skins (Tiger stripes for 30 days in a row, Galaxy stars for 1,000 turns, Candy stripes for 100 pats) each come with an achievement. Pick one in the Skins tab.
- **Accessories**: worn over any skin, one at a time, each won with an achievement: Bow (hatching), Flower (10 pats), Wand (7 days in a row), Shades (a turn between 5 and 7 am), Sweater (100 turns). They sit where the body leaves room, so every species can wear them; an egg puts its on once it hatches. Choose in the Skins tab.
- **Stamina**: what is left of your five-hour usage limit (the "Current session" bar in `/usage`), with the time it is full again. Below 20% the pet is low on energy (heavy eyes, slower steps); at 0% it is worn out. Shown only on a subscription.
- **In the desktop app** the pet is drawn as a small picture rather than text, so its rows meet instead of being spaced apart; a pat there is the ♥ Pet button.
- **Feelings**: the pet feels your day. Tired after 30 turns today or 75 minutes of work in the last two hours (heavy eyes, slower steps, yawns); worn out after 60 turns or 2½ hours of work in three (it crawls, and falls asleep when you stop); stressed when three tools fail within ten minutes; sleepy from 11 pm to 5 am; bored after half an hour with nothing to do. The Pet tab names the feeling with a tip, and a tired, worn-out or stressed pet tells you once a day. Work time counts this session; turns count every session today.
- **Petting**: click the pet in the band or the Pet tab (no highlight sticks to it), press its ♥ Pet button (`p`), or run `/pat`. Hearts float up for a moment, and a pat soothes a stressed or bored pet for ten minutes (only rest helps a tired one). Resting the pointer on the pet in the band shows a heart.
- `/pet` shows how it is doing; `/pet Mochi` names it.

**Guards**

- **Destructive commands** always ask before running, even in auto-accept modes: `rm -rf`, `git push --force`, `git reset --hard`, `git clean -f`, `git branch -D`, `kubectl delete`, `kubectl scale --replicas=0`, `kubectl drain`, `helm uninstall`, `argocd app delete`, `argocd app sync --prune`, `terraform destroy`, SQL `DROP` / `TRUNCATE` / `DELETE` without `WHERE`, `migrate down`. Where it can, the prompt shows what would be affected (files and size for `rm`, `kubectl delete --dry-run=server`, `git clean -n`).
  It reads the command text only: an alias or a script that runs `rm` inside is not caught. Keep real limits in your credentials and roles.
- **Budget**: once the session costs your limit, tool calls are refused. A toast warns at 80%.

### Install

At the prompt of a terminal session:

```
/plugin install session-cockpit --marketplace daominhhiep/claude-mods
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install session-cockpit --marketplace daominhhiep/claude-mods
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `daominhhiep/claude-mods`, then **Add plugin**.

Needs Claude Code 2.1.304 or later. The PR row needs the GitHub CLI (`gh`) signed in.

### Options

| Option | Default | What it does |
| --- | --- | --- |
| `budgetUsd` | `0` (off) | Refuse tool calls once the session costs this much |
| `cacheTtl` | `5m` | Prompt cache lifetime the clock counts down: `5m` or `1h`, as your plan or settings use |
| `notifyHeadsUp` | `true` | Raise a system notification when Claude Code's You should know mod shows a new note above the prompt; a toast where no system notification can be raised (the desktop app) |
| `transcriptStyle` | `cockpit` | `cockpit` redraws the spinner, your prompts and tool rows; `claude` leaves the transcript as Claude Code draws it |

`/budget 20` sets a limit for the current session only, `/budget off` turns it off, `/budget` shows it.

### Commands

- `/cockpit` opens the pane.
- `/budget [amount|off]` shows or sets this session's spending limit.
- `/pin [name]` pins this session; with a name it also renames it, so `/resume <name>` finds it.
- `/unpin` unpins this session.

### Develop

```
claude plugin validate plugins/session-cockpit
claude plugin test plugins/session-cockpit
```

## Privacy

Session Cockpit has no server and sends nothing to its author. See its [privacy policy](plugins/session-cockpit/PRIVACY.md).

## License

MIT. See [LICENSE](LICENSE).
