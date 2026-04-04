---
name: deps-upgrade-autopilot
description: Run a full dependency-upgrade PR for this Bun + TypeScript Stripe backup repository, then babysit the GitHub PR, address review feedback, and merge it when possible. Use when asked for a one-shot dependency upgrade, dependency refresh, upgrade PR autopilot, or fully automated daily dependency maintenance in this repository.
---

# Dependency Upgrade Autopilot

Use this repo-local skill when the user wants the full dependency-upgrade flow executed end to end in this repository.

## Base Skill

- Start by reading `.agents/skills/upgrade-dependencies-pr/SKILL.md`.
- Reuse its workflow and decision rules unless this repo-local skill adds a stricter repo-specific step.
- This repo uses Bun. Prefer Bun commands and Bun lockfile handling throughout the run.

## Repo Context

- This repository is a GitHub workflow driven Stripe backup/export project, not a browser UI project.
- Do not use screenshot capture, visual regression tooling, Playwright page checks, or before/after image artifacts.
- The goal is to keep dependency maintenance boring and fully automatable for a daily run.

## Repo-Specific Validation

- Main validation set:
  - `bun run lint`
  - `bun run typecheck`
- Treat these commands as the standard local gate before pushing and before merging when code or config changed.

## Execution Order

1. Inventory the repo exactly as the base skill requires.
2. Create a fresh branch before editing. Prefer `codex/deps-backup-stripe-<yyyymmdd>`.
3. Upgrade dependencies with Bun and regenerate the lockfile as needed.
4. Run the base skill’s release-note triage and apply required fallout fixes.
5. Run the repo validation set.
6. Stage only the dependency upgrade work and directly related fixes.
7. Commit, push, and open a ready PR unless there is a clear reason to keep it draft.

## PR Body

- Include:
  - notable package upgrades
  - any required code or config fixes
  - the commands run for validation
  - any follow-up issues created from release-note review
  - a brief note when a validation command failed for an expected repo-specific reason and why the PR is still acceptable

## GitHub Babysitting

- After the PR is created, use the [@github](plugin://github@openai-curated) plugin for PR metadata and comment inspection.
- Wait about 5 to 8 minutes before the first triage pass so bot reviews can land.
- Inspect both:
  - formal reviews and review threads
  - top-level PR conversation, including bot comments and status summaries
- If there is actionable feedback:
  1. Cluster it by behavior or file.
  2. Address the requested changes locally.
  3. Rerun the smallest complete validation set that still covers the touched files. When in doubt, rerun the full repo validation set.
  4. Push the follow-up commit(s).
  5. Reply on GitHub when appropriate so the thread shows the feedback was handled.
  6. Resolve the review comments when they got resolved.
- If review-thread state matters, follow the thread-aware approach from the GitHub plugin skill at `$HOME/.codex/plugins/cache/openai-curated/github/*/skills/gh-address-comments/SKILL.md` (use globbing).
- Repeat the babysitting loop until:
  - there is no unresolved actionable feedback,
  - required reviews are satisfied,
  - and the PR is mergeable.

## Merge And Cleanup

- Merge the PR once it is unblocked. Prefer `gh pr merge --squash --delete-branch` unless the repo convention clearly prefers another merge strategy.
- If GitHub checks never start because the backing workflow is no longer running or no longer exists, treat that as acceptable for this repo unless the user explicitly asked for green CI before merge.
- After merge:
  - `git checkout main`
  - `git pull --ff-only`
  - delete the local branch if it still exists
  - delete the remote branch if the merge command did not already remove it
- Report the merged PR URL and the final commit on `main`.

## Daily Automation Bias

- Optimize for unattended daily execution.
- Prefer small, regular upgrade PRs over bundled large jumps.
- Keep the branch, commit message, and PR title deterministic enough that recurring automation can reuse the flow without extra prompting.

## Stop Conditions

- Stop and report if:
  - GitHub auth or push access is missing
  - the worktree contains unrelated risky user changes
  - a dependency upgrade requires a larger refactor that should be split into a separate task
  - the PR cannot be merged because of a policy or permission blocker
