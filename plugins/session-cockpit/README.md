# Session Cockpit

A Claude Code mod that keeps context, cost, cache time, pull request status and running subagents in sight above the prompt, adds a `/cockpit` pane, asks before destructive commands and enforces an optional session budget.

See the [repository README](../../README.md) for what the band and the pane show, install steps and options, and the [privacy policy](PRIVACY.md) for how it handles data.

## Programs it starts, and why

The mod starts programs only through `$.process.run`, on your machine, as you, with a 5 to 15 second timeout. It never starts a shell, so nothing in a command is expanded or chained. These are all of them, word for word; `<path>` is a path taken from the `rm` command Claude is about to run, and only plain paths are used (a path with `*`, `?`, `[`, `]` or `~` gets no preview).

| Command | When | Why |
| --- | --- | --- |
| `git rev-parse --abbrev-ref HEAD` | Once the session touches a pull request (below), then every 60 seconds | To know the current branch for the PR row |
| `gh pr view --json number,title,url,state,reviewDecision,statusCheckRollup` | Same, for the current branch's PR | To show checks and review state in the PR row |
| `gh pr view <number> --json number,title,url,state,reviewDecision,statusCheckRollup` | Same, when a tool result showed a link to PR `<number>` | Same, for that PR |
| `du -sh -- <path>` | Claude is about to run `rm -r`/`rm -f` on `<path>` | To show how much would be deleted |
| `find <path> -maxdepth 4 -type f` | Same | To list the files that would be deleted |
| `git status --short` | Claude is about to run `git reset --hard` | To list the changes that would be lost |
| `git clean -nd` | Claude is about to run `git clean -f` | To list the files that would be removed (`-n`: nothing is removed) |
| Claude's own `kubectl … delete …` command, with `--dry-run=server -o name` added | Claude is about to run that `kubectl delete`, and the command has no pipes, quotes or shell syntax | To list what the delete would remove. `--dry-run=server` makes it a dry run: nothing is deleted |

"Touches a pull request" means: a Bash call in the session ran `git push` or `gh pr create|view|checks|status|merge|edit|ready|review`, or a tool result held a `github.com/<owner>/<repo>/pull/<number>` link. Until then the mod starts none of the first three.

## What it sends, and where

The mod has no server of its own and sends nothing to its author or to any analytics service. Data leaves your machine only through the programs above:

- **`gh pr view`** sends a read request to the GitHub API, signed in as your `gh` user: the repository (from the current folder's git remote) and the PR number or branch. Nothing is written to GitHub.
- **`kubectl … --dry-run=server`** sends Claude's own delete command, as a dry run, to the Kubernetes cluster your current kube context points at, with your credentials. Nothing is deleted.

Everything else the mod reads stays in the session's own state and is gone when the session ends.

## What it reads from the conversation

To draw the band and the pane, the mod reads:

- the first 200 characters of each prompt you send (the Context tab lists prompts with their time and cost);
- each tool call's tool name and a short summary of its input (a command, a file path, a search pattern, a URL), and whether it succeeded;
- the text of a tool result, up to its first 20,000 characters, only to find a pull request link in it;
- the contents of a file Claude edits, before and after the edit, to draw the diff in the Changes tab (files over 1 MB are skipped);
- the session's token counts, cost, context usage and subagent list, as Claude Code reports them.

None of this is sent anywhere. The only conversation-derived data that leaves your machine is what the table above names: a PR number or branch to GitHub, and Claude's own `kubectl delete` command, as a dry run, to your cluster.

## Permission checks

The mod hooks `tool.check` twice. Neither hook ever allows a call: each one only asks or refuses, and passes everything else on unchanged.

- **Destructive-command guard** (Bash calls only). Decides: for `rm -r`/`rm -f`, `git push --force` (or `-f`, `--force-with-lease`, `+ref`), `git reset --hard`, `git clean -f`, `git branch -D`, `kubectl delete`, `kubectl scale --replicas=0`, `kubectl drain`, `helm uninstall`/`delete`, `argocd app delete`, `argocd app sync --prune`, `terraform destroy`, SQL `DROP` / `TRUNCATE` / `DELETE` without `WHERE`, and `migrate`/`goose … down`, it answers `ask`, so you approve or refuse the command yourself, with a preview of what it affects. When: on every Bash call Claude makes; any other command is passed on. A command your own permission rules already refuse stays refused: the hook asks those rules with its own query and passes a refused call on. If the guard fails, it still asks. It reads the command text only, so an alias or a script that runs one of these is not caught.
- **Budget guard** (every tool). Decides: when a budget is set (the `budgetUsd` option, or `/budget <amount>` for one session) and the session's cost has reached it, it answers `deny`, with a reason that says to raise the budget with `/budget <amount>`. When: on every tool call; with no budget set, or below it, the call is passed on. At 80% of the budget it shows a toast once.

## Every hook, and what it does

| Event | What the hook does | Changes anything? |
| --- | --- | --- |
| `session.start` | Registers `/cockpit` and `/budget`, opens the pane, starts a 5-second clock for the band and the 60-second pull request refresh | No |
| `command.run` (`cockpit`) | Opens the pane | Answers its own command only |
| `command.run` (`budget`) | Shows or sets this session's budget | Answers its own command only; no other command is seen |
| `tool.check` | Budget guard, above | Can refuse a tool call |
| `tool.check` (Bash) | Destructive-command guard, above | Can make a call ask first |
| `agent.spawn` | After a subagent has started, reads the agent list to draw the tree | No: the spawn goes on exactly as asked, and its result is returned unchanged |
| `turn.step` | Reads the model and effort of each main-loop request as it goes out, for the band | No: the request is sent exactly as the engine made it |
| `turn.start` | Notes when a prompt starts and the session cost at that moment | No |
| `turn.complete` | Records the turn's time, cost and tokens, the context reading and the cache clock | No |
| `tool.call` | Logs each call for the Activity tab, reads an edited file before and after for the Changes tab, looks for pull request links | No: every call runs as asked and its result is returned unchanged |
| `ui.render` (`AbovePrompt`) | Draws the band above the prompt | Draws its own band only |
| `ui.render` (`Pane`, `session-cockpit`) | Draws the mod's own pane | Draws its own pane only |
