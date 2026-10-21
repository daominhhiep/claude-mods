# claude-mods

Mods for [Claude Code](https://code.claude.com/docs/en/plugins/mods/overview).

## session-cockpit

Keeps the numbers that matter in sight while you chat, and stops the commands you would regret.

**Above the prompt (always on)**

```
╭─ ◆ COCKPIT ───────────────────────────────────────────────── ⠋ running 1m 03s ▱▰▱▱▱▱ ─╮
│  ⚡ 81%  of compact limit    $2.54  / $10 spent    ◷ 3:12  ▰▰▰▱▱ cache   47m session · 5m working │
│ ████████████████████████████████████████████████████████████▌░░░░░░░░░░░░░░░░░░░░░ │
│ ◆ opus-5-5 · high effort   ⑂ #101 Add an approval gate   ✓ 2  ✗ 1 · lint failing   ⠋ 2 agents │
╰─────────────────────────────────────────────────────────────────────────────────────╯
```

Values sit on solid colored pills, the context gauge spans the band in eighths of a cell with a light running along it while Claude works, and a light circles the frame (fast while working, slow while idle).

Effects, each turned on or off in the Config tab:

- **Fireworks** burst across the band for two seconds when a turn ends, with its time and cost.
- **Flash** at 25, 50, 75 and 90% of the compact limit: the frame flashes and names the level.
- **Color wave** rolls along the gauge while Claude works.
- **Breathing frame** in the last minute before the cache goes cold.
- **Typing**: each new reply from Claude appears letter by letter, in about a second.
- **Light around the frame.**
- **Claude pet** lives at the band's right edge: it paces while Claude works, cheers when a turn ends, frets when a tool fails, sweats as the context fills and naps once the cache goes cold. It shows when the band has its three rows and room to spare.

Under another mod's note (such as You should know), or when there is little room, the band folds to one row so nothing scrolls.

- **Context**: how close the session is to auto-compact (or to the model's window when auto-compact is off), coloured by level (Clear, Cloudy, Showers, Storm, Compact soon).
- **Cost**: what the session has spent, against your budget when you set one.
- **Cache clock**: time left before the prompt cache goes cold after Claude's last reply.
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

Three cards head every tab: context with its trend, cost with each prompt's share, and working time. The tabs stay on one row, with short names in a narrow pane.

| Tab | What it shows |
| --- | --- |
| Context | Context gauge and trend; time, cost (with a bar against the dearest prompt) and tokens for each prompt and its subagents |
| Agents | Live tree of subagents: status, duration, tool count, tokens in and out, share read from cache, the tool running now |
| Sessions | Pinned sessions of this project (or all projects): name, title, last active, cost, a warning before Claude Code cleans the transcript up, and Open (fills `/resume <id>`) |
| Guard | Destructive commands that were stopped for approval, with a preview of what they would affect |
| Changes | Each file edit as a diff, step by step (Prev / Next / Latest) |
| Activity | Every tool call: time, tool, duration, target, result |
| Theme | Pick a color theme: Claude (follows your Claude Code theme), Ocean, Sunset, Neon, Forest, Mono, Cyberpunk; kept for every session |
| Config | Turn each effect on or off; kept for every session |

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
