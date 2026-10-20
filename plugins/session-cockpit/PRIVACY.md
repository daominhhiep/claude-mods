# Session Cockpit privacy policy

Effective 21 October 2026. Applies to the Session Cockpit mod for Claude Code, version 0.1.3 and later, published at https://github.com/daominhhiep/claude-mods.

## Summary

Session Cockpit runs entirely inside your own Claude Code session, on your own machine. It has no server, no account and no analytics. Its author receives nothing from it. What it reads stays in the session's memory and is gone when the session ends. The only data that leaves your machine goes, with your own credentials, to GitHub (a read of a pull request) and to your Kubernetes cluster (a dry run of a delete Claude is about to make), as described below.

## What the mod reads

To draw the band above the prompt and the `/cockpit` pane, the mod reads, from the running session:

- the first 200 characters of each prompt you send;
- each tool call's tool name, a short summary of its input (a command, a file path, a search pattern, a URL) and whether it succeeded;
- up to the first 20,000 characters of each tool result, only to look for a GitHub pull request link;
- the contents of a file Claude edits, before and after the edit, to draw a diff (files over 1 MB are skipped);
- the session's token counts, cost, context usage and list of subagents, as Claude Code reports them;
- the output of the local programs listed under "Programs it starts" in the [README](README.md): the current git branch, the files and size a delete would remove, the changes a `git reset --hard` would lose, the files a `git clean` would remove.

Any of these can contain personal data that happens to be in your prompts, files or command output, such as names, email addresses or customer records. The mod does not look for personal data, does not extract it and does not treat it differently from any other text.

## What the mod stores

Nothing outside the session. Everything above is kept in the session's own in-memory state only, and is discarded when the session ends or is cleared. The mod writes no files, keeps nothing across sessions and uses no cookies or identifiers.

Your settings for the mod (`budgetUsd`, `cacheTtl`) are kept by Claude Code in your own settings, like any plugin option.

## What leaves your machine, and where

The mod sends data only through programs it starts on your machine, as you:

| Destination | What is sent | When |
| --- | --- | --- |
| GitHub API, through the GitHub CLI (`gh`) signed in as you | A read request for one pull request: the repository from the current folder's git remote, and the PR number or the current branch. Nothing is written to GitHub. | Once the session has run `git push` or a `gh pr` command, or a tool result showed a pull request link; then every 60 seconds and after each push |
| Your Kubernetes cluster, through `kubectl` with your current kube context and credentials | Claude's own `kubectl delete` command, run with `--dry-run=server`, so nothing is deleted | Only when Claude is about to run a `kubectl delete` |

GitHub and your cluster handle that data under their own terms. The mod sends nothing to its author, to Anthropic or to any other party, and contains no telemetry.

## Credentials

The mod never reads, copies or sends your credentials, API keys or tokens. `gh` and `kubectl` use the sign-in and kube context you already have, in their own processes; the mod sees only their output.

## Retention

The mod has no service and retains nothing. Data in the session's memory is discarded when the session ends.

## Children

The mod is a developer tool and is not directed at children.

## Changes

Changes to this policy are published in this file in the repository, with a new effective date. The repository's commit history shows every earlier version.

## Contact

Questions about this policy: open an issue at https://github.com/daominhhiep/claude-mods/issues.
