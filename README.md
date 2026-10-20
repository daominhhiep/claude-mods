# claude-mods

Mods for [Claude Code](https://code.claude.com/docs/en/plugins/mods/overview).

## session-cockpit

Keeps the numbers that matter in sight while you chat, and stops the commands you would regret.

**Above the prompt (always on)**

```
⚡ 81% ████████▏ context    $2.54 / $10 spent    ◷ 3:12 ▰▰▰▱▱ cache    47m session · 5m working
#101 Add an approval gate    ✓ 2  ✗ 1  ◌ 1 · lint failing    ○ waiting for review    ◌ 2 agents · Explore +1
```

- **Context**: how full the context window is, coloured by level (Clear, Cloudy, Showers, Storm, Compact soon).
- **Cost**: what the session has spent, against your budget when you set one.
- **Cache clock**: time left before the prompt cache goes cold after Claude's last reply.
- **Session time**: how long the session has been open and how long Claude actually worked.
- **Pull request**: shown once the session pushes or touches a PR: checks passed, failed and pending, failing check names, review state.
- **Agents**: how many subagents are running.

**Pane (`/cockpit`)**

| Tab | What it shows |
| --- | --- |
| Context | Context gauge and trend; time, cost and tokens for each prompt and its subagents |
| Agents | Live tree of subagents: status, duration, tool count, tokens in and out, share read from cache, the tool running now |
| Guard | Destructive commands that were stopped for approval, with a preview of what they would affect |
| Changes | Each file edit as a diff, step by step (Prev / Next / Latest) |
| Activity | Every tool call: time, tool, duration, target, result |

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

`/budget 20` sets a limit for the current session only, `/budget off` turns it off, `/budget` shows it.

### Commands

- `/cockpit` opens the pane.
- `/budget [amount|off]` shows or sets this session's spending limit.

### Develop

```
claude plugin validate plugins/session-cockpit
claude plugin test plugins/session-cockpit
```

## License

MIT. See [LICENSE](LICENSE).
