# Session Cockpit

A Claude Code mod that keeps context, cost, cache time, pull request status and running subagents in sight above the prompt, adds a `/cockpit` pane, asks before destructive commands and enforces an optional session budget.

See the [repository README](../../README.md) for screenshots of the band and the pane, install steps and options.

## What it sends, and where

The mod has no server of its own and sends nothing to its author. It reads only what the session already has, and it starts these programs on your machine, as you:

| Program | When | What leaves your machine |
| --- | --- | --- |
| `gh pr view --json number,title,url,state,reviewDecision,statusCheckRollup` | Once the session runs `git push` or a `gh pr` command, or a tool result shows a GitHub pull request link; then every 60 seconds and after each push | A read request to the GitHub API for that pull request, with your `gh` sign-in. Nothing is written. |
| `git rev-parse --abbrev-ref HEAD` | With the `gh` call above | Nothing (local) |
| `kubectl … --dry-run=server -o name` | When Claude is about to run a `kubectl delete`, to show what it would delete | A server-side dry run to the cluster your current kube context points at, with your credentials. Nothing is deleted. |
| `du -sh`, `find -maxdepth 4 -type f`, `git status --short`, `git clean -nd` | When Claude is about to run `rm -rf`, `git reset --hard` or `git clean -f`, to show what would be lost | Nothing (local) |

The pane and the band show what these return. The mod keeps it in the session's own state, and nothing is stored after the session ends.

## Permission checks

The mod hooks `tool.check` twice. Neither hook ever allows a call: each one only asks or refuses, and anything else is passed on unchanged.

- **Destructive-command guard** (Bash only): for `rm -rf`, `git push --force`, `git reset --hard`, `git clean -f`, `git branch -D`, `kubectl delete`, `kubectl scale --replicas=0`, `kubectl drain`, `helm uninstall`, `argocd app delete`, `argocd app sync --prune`, `terraform destroy`, SQL `DROP` / `TRUNCATE` / `DELETE` without `WHERE` and `migrate`/`goose down`, it answers `ask`, so you approve or refuse the command yourself, with a preview of what it affects. A call your own rules already refuse stays refused. If the guard fails, it still asks. It reads the command text only, so an alias or a script that runs one of these is not caught.
- **Budget guard** (every tool): when you set a budget (`budgetUsd`, or `/budget` for one session) and the session's cost reaches it, it answers `deny`, with a reason that tells you to raise the budget with `/budget <amount>`. With no budget set, it passes every call on.

## Every hook, and what it does

| Event | What the hook does | Changes anything? |
| --- | --- | --- |
| `session.start` | Registers `/cockpit` and `/budget`, opens the pane, starts a 5-second clock for the band and the 60-second pull request refresh | No |
| `command.run` (`cockpit`) | Opens the pane | Answers its own command only |
| `command.run` (`budget`) | Shows or sets this session's budget | Answers its own command only |
| `tool.check` | Budget guard, above | Can refuse a tool call |
| `tool.check` (Bash) | Destructive-command guard, above | Can make a call ask first |
| `agent.spawn` | After a subagent starts, reads the agent list to draw the tree | No: the spawn goes on as asked |
| `turn.start` | Notes when a prompt starts and the session cost at that moment | No |
| `turn.complete` | Records the turn's time, cost and tokens, the context reading and the cache clock | No |
| `tool.call` | Logs each call for the Activity tab, reads an edited file before and after for the Changes tab, notices pull request links | No: every call runs as asked and its result is returned unchanged |
| `ui.render` (`AbovePrompt`) | Draws the band above the prompt | Draws its own band only |
| `ui.render` (`Pane`, `session-cockpit`) | Draws the mod's own pane | Draws its own pane only |
