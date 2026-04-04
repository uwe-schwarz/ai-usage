---
name: upgrade-dependencies-pr
description: Update a JavaScript, TypeScript, or Python project's dependencies to the latest published versions, remove exact pinned JS semver specs when appropriate, convert stray JS `latest` tags back to explicit semver ranges, evaluate release impact against the codebase and official release notes, identify newly introduced features and enforcement changes, apply required small upgrade fixes, open GitHub issues for larger or optional follow-up work, and finish by creating a branch, commit, push, and PR. Use when asked to upgrade dependencies, refresh packages, unpin dependency versions, or ship an end-to-end dependency maintenance PR.
license: MIT
metadata:
  author: uwe
  version: "1.4.0"
---

# Upgrade Dependencies PR

Use this skill to take a JavaScript, TypeScript, or Python repository from outdated dependencies to a reviewable dependency-upgrade PR in one pass.

## Preconditions

- Confirm the repository uses Git and GitHub, and that `gh` is authenticated before attempting issue or PR creation.
- Stop if the working tree contains unrelated user changes that would be risky to mix into the dependency branch.
- Detect the ecosystem and package manager from tracked manifests, lockfiles, and workspace config before changing anything.
- Read [references/package-manager-playbook.md](references/package-manager-playbook.md) after detection and use only the relevant section.

## Workflow

### 1. Inventory the project

- Find the tracked dependency manifests that actually govern this repo. For JS/TS, inspect `package.json` files plus lockfiles and workspace config. For Python, inspect `pyproject.toml`, `uv.lock`, `requirements*.in`, `requirements*.txt`, `constraints*.txt`, `setup.cfg`, and `setup.py`.
- Identify whether the repo is JS/TS, Python, or mixed. Do not reject a repo just because there is no root `package.json`; use the manifests that are actually present.
- Record the current branch, package manager, lockfiles, workspace layout, and available validation commands such as `typecheck`, `lint`, `test`, `test:unit`, `build`, `pytest`, `ruff`, `mypy`, and project-specific CI entrypoints.
- Flag framework- or runtime-critical packages first: frameworks, bundlers, test runners, linters, TypeScript, Node tooling, auth, database clients, SDKs, deployment libraries, Python web frameworks, ORMs, packaging/build backends, and lint/type-check tooling.

### 2. Create the branch first

- Create a fresh branch before editing anything. Prefer `codex/deps-<project>-<yyyymmdd>` unless the repo already uses a different branch convention.
- Keep the branch scoped to dependency maintenance and directly related upgrade fallout.

### 3. Upgrade manifests and lockfiles

- Use the package-manager-specific commands from the reference file to move direct dependencies to their latest published versions.
- For JS/TS manifests, update entries in `dependencies`, `devDependencies`, `optionalDependencies`, and `peerDependencies` when the manifest owns those versions. Preserve `workspace:`, `file:`, `link:`, `portal:`, `catalog:`, git, URL, and alias specs unless there is a clear reason to change them.
- For Python manifests, update dependency declarations in `project.dependencies`, optional-dependency groups, tool-managed dependency groups, `requirements*.in`, `requirements*.txt`, and `constraints*.txt` only when those files are repo-owned sources of truth.
- Prefer `uv` for clearly uv-managed repos (`uv.lock`, `tool.uv`, or an established `uv` workflow). For `requirements.in` / compiled `requirements.txt` repos, reuse the repo's existing compiler workflow with `uv pip compile` or `pip-compile` if present. For hand-maintained `requirements.txt` repos, update the tracked requirement specifiers directly, then re-install or sync with the repo's existing tool.
- Preserve editable installs, local paths, VCS requirements, direct URLs, workspace links, and generated file headers unless there is a concrete reason to change them.
- After the main JS/TS upgrade step, run `node <skill-dir>/scripts/unpin-semver-ranges.mjs <repo-root>` to convert exact `x.y.z` specs and any stray `latest` tags into ranged versions like `^1.2.3`. If it updates any manifest, re-run the package manager install or update step so the lockfiles match.
- After the final JS/TS install or update pass, run `node <skill-dir>/scripts/check-no-latest-specifiers.mjs <repo-root>`. Do not proceed until it reports that no tracked `package.json` or lockfile still contains `latest`.
- If a JS/TS upgrade introduces peer-dependency warnings or peer-range mismatches, especially around framework, compiler, or toolchain major versions, do not immediately roll the package back. Keep the latest candidate installed long enough to run validation unless the package manager refuses to install or the repo has an explicit no-peer-warning policy.
- Do not leave exact pinned JS semver strings in `package.json` files unless the repo explicitly requires exact versions and the user asked to keep them. For Python, preserve the repo's existing pinning strategy unless the user asked to loosen it.

### 4. Assess relevance before writing the summary

- Compare manifests and lockfiles before and after the upgrade to get the set of changed packages.
- For each changed package that has a major bump, is runtime-critical, or is used directly in code or config, inspect official changelogs, migration guides, or release notes. Use primary sources only.
- Search the codebase for actual package usage before deciding whether a release is relevant to this project.
- For each package you inspect, explicitly look for newly introduced features, changed defaults, deprecations that became warnings or errors, and new enforced lint, type, compiler, formatting, security, or policy rules. Do not stop at obvious breakages.
- Every relevant new item you identify must end in one of two states before the PR is opened: adopted in the PR, or tracked in a follow-up GitHub issue with a concrete reason it was deferred.
- Classify relevance as one of:
  - required compatibility work to keep the repo green,
  - small project-specific cleanup worth doing in the same PR,
  - optional follow-up or new feature worth tracking separately.

### 5. Fix required fallout now

- Apply compatibility fixes that are necessary for installs, builds, tests, or runtime correctness.
- Also apply very small project-relevant cleanup directly when it is obvious and low risk.
- If an upgrade introduces a new enforced lint, type, compiler, formatting, security, or policy rule, do not silently disable it just to keep the PR small. Either adopt the rule in this PR, or keep any suppression narrowly scoped and clearly temporary while creating a follow-up issue that names the deferred repo-wide work.
- Keep fixes tightly coupled to the upgrade. Avoid unrelated refactors.

### 6. Create follow-up issues for larger or optional work

- Open a GitHub issue when an upgrade reveals a useful new feature worth adopting later, a migration that is too large for the dependency PR, or cleanup that would materially expand review scope.
- Open a GitHub issue when an upgrade introduces a new rule, policy, or default that is relevant to this repo but would cause broad churn to adopt fully in the dependency PR.
- Also open a GitHub issue when the latest version appears viable in code but is still blocked by upstream peer-range declarations or ecosystem support policy, and the dependency PR intentionally holds that package back.
- Use `gh issue create`.
- The issue body should name the package and version jump, explain why it matters to this repo, summarize the deferred work, call out any temporary suppression or scope limitation left in the PR, and link the official source material plus the upgrading PR when available.
- Do not create issues for noise. File issues only when the package change is genuinely relevant to the project.

### 7. Verify aggressively

- Run the smallest complete validation set the repo supports. Prefer the repo's documented CI entrypoint when present. Otherwise use the relevant subset of: `typecheck`, `lint`, `test`, `test:unit`, `build`, `pytest`, `ruff check`, `mypy`, `pyright`.
- If the repo has a documented CI entrypoint, use it.
- For JS/TS repos, treat any remaining `latest` specifier in a tracked manifest or lockfile as a failed verification and fix it before committing.
- If the only blocker is a peer warning or peer-range mismatch, run the full relevant validation suite against the upgraded version before deciding whether to keep or revert it.
- If that validation passes, make an explicit decision: either keep the upgraded version despite the warning and document the unsupported-peer state in the PR, or revert it, pin to the highest clearly supported version, and file a follow-up issue describing the upstream blocker and why the repo is intentionally one version behind.
- If validation fails and the failure is attributable to the unsupported upgrade, revert to the highest clearly supported version and document that decision.
- If an upgrade breaks validation, fix it if the remediation is required to keep the repository healthy. Do not ship a knowingly broken dependency PR.
- Before committing, confirm that newly introduced features, defaults, and enforced rules discovered during release-note review were either adopted in the PR or captured in follow-up issues. Do not leave them undocumented.

### 8. Commit, push, and open the PR

- Stage only the dependency upgrade work and directly related fixes.
- Use a commit title like `chore(deps): upgrade dependencies to latest`.
- Push the branch and create a PR with `gh pr create`.
- Make the PR body include notable package upgrades, required code or config fixes, issues created for deferred relevant work, the validation commands that were run, and any intentionally held-back packages with the reason.
- If the PR leaves a temporary suppression or narrow opt-out for a new lint, type, compiler, formatting, security, or policy rule, say so explicitly in the PR body and link the follow-up issue.
- Respect existing issue or PR templates when present.

## Decision Rules

- Prefer primary documentation over blog posts or secondary summaries for release impact.
- Required compatibility work belongs in the PR. Optional adoption work belongs in an issue.
- Newly introduced features, defaults, and policy/rule changes must be explicitly triaged. Do not silently ignore them just because validation passes.
- Peer-dependency warnings are not an automatic rollback. Treat them as a compatibility signal that requires validation and an explicit keep-or-revert decision.
- When a package only fails declared peer support but passes validation, either keep it with clear PR documentation or revert it and file an issue documenting the upstream blocker. Do not silently hold it back.
- If a new enforced lint, type, compiler, formatting, security, or policy rule would cause broad repo churn, either implement it in the PR or leave only a clearly temporary, narrowly scoped suppression and file an issue for the remaining work. Never add a silent permanent disable.
- Never leave JS/TS `latest` tags in tracked manifests or lockfiles. Convert them back to explicit semver ranges such as `^1.2.3`, regenerate the lockfiles, and verify they are gone before opening the PR.
- If the repo is Python, support `uv`, `pip`, and existing `pip-tools` style compile/sync workflows instead of rejecting it as non-JS.
- If the repo is mixed-language, use the manifests that are actually in scope for the requested upgrade instead of assuming the root ecosystem.
- Stop only if the repo is neither JS/TS nor Python, or if it uses dependency tooling that this skill does not yet support cleanly.
- If GitHub auth, push access, or PR creation is unavailable, finish the local upgrade work and report the blocker clearly.

## Scripts

### `scripts/unpin-semver-ranges.mjs`

Normalize exact semver strings and stray `latest` tags in `package.json` files to caret ranges while preserving workspace, file, git, URL, alias, and already-ranged specs. Use this only for JS/TS manifests.

Usage:
```bash
node /absolute/path/to/upgrade-dependencies-pr/scripts/unpin-semver-ranges.mjs /path/to/repo
```

### `scripts/check-no-latest-specifiers.mjs`

Fail fast when a tracked JS/TS manifest or lockfile still contains `latest` after the upgrade flow. Run this after the final install or update pass.

Usage:
```bash
node /absolute/path/to/upgrade-dependencies-pr/scripts/check-no-latest-specifiers.mjs /path/to/repo
```

## References

- Use [references/package-manager-playbook.md](references/package-manager-playbook.md) for package-manager-specific upgrade commands.
- Use official package changelogs or migration guides for impact assessment.
