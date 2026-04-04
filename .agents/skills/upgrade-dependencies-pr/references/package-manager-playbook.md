# Package Manager Playbook

Use only the section that matches the detected package manager.

## Detect the ecosystem and package manager

- For JS/TS, prefer the root `packageManager` field when present.
- For JS/TS, fall back to lockfiles:
  - `pnpm-lock.yaml` -> pnpm
  - `bun.lock` or `bun.lockb` -> Bun
  - `yarn.lock` -> Yarn
  - `package-lock.json` or `npm-shrinkwrap.json` -> npm
- For Python, inspect `uv.lock`, `pyproject.toml`, `requirements*.in`, `requirements*.txt`, `constraints*.txt`, `setup.cfg`, and `setup.py`.
- If `uv.lock` is present or the repo already uses `uv`, prefer the `uv` workflow.
- If the repo checks in compiled requirement files and already uses `pip-compile` or `uv pip compile`, reuse that compile/sync workflow rather than inventing a new one.
- If detection is ambiguous, inspect existing scripts, CI config, and developer docs before changing anything.

## npm

- Use npm when the repo is clearly npm-managed.
- `npm update` alone is not enough for "latest across majors" because it respects existing ranges.
- Preferred workflow:

```bash
npx npm-check-updates -u --target latest
npm install
```

- For npm workspaces, run from the workspace root first. If nested manifests are not governed by npm workspaces, iterate the remaining package directories explicitly.

## pnpm

- For single-package repos:

```bash
pnpm up --latest
pnpm install
```

- For workspace repos:

```bash
pnpm up -r --latest
pnpm install
```

## Yarn Berry or Yarn 4+

- Upgrade manifest ranges across the project:

```bash
yarn up '*'
```

- If the lockfile needs a full resolution refresh for the changed packages, also run:

```bash
yarn up -R '*'
```

- Then install if needed:

```bash
yarn install
```

- `yarn up` does not update `peerDependencies`; handle exact or stale peer ranges manually.

## Yarn Classic

```bash
yarn upgrade --latest
yarn install
```

## Bun

- For a single-package repo:

```bash
bun update --latest
```

- For workspace repos, start at the root. If Bun does not update nested workspace manifests non-interactively, enumerate the workspace directories and run the same command inside each affected package directory.

```bash
bun update --latest
```

- Re-run install if lockfile regeneration or lifecycle execution is needed:

```bash
bun install
```

## uv project workflow

- Use this for projects with `uv.lock`, `tool.uv`, or a clearly established `uv` workflow around `pyproject.toml`.
- Upgrade the lockfile within the existing dependency constraints:

```bash
uv lock --upgrade
uv sync
```

- If you deliberately changed dependency constraints in `pyproject.toml`, rerun the same commands afterward to refresh the lockfile and environment.

## uv pip compile workflow

- Use this when the repo's source of truth is `requirements.in`, `pyproject.toml`, or another file that the repo already compiles into tracked `requirements.txt` files with `uv pip compile`.
- Upgrade all packages in an existing compiled requirements file:

```bash
uv pip compile requirements.in -o requirements.txt --upgrade
uv pip sync requirements.txt
```

- If the repo compiles from `pyproject.toml`, use that input instead:

```bash
uv pip compile pyproject.toml -o requirements.txt --upgrade
uv pip sync requirements.txt
```

- For layered or multiple requirement files, repeat the compile step for each tracked output file using the repo's existing inputs and flags.

## pip-tools workflow

- Use this when the repo already uses `pip-compile` / `pip-sync` and tracks compiled requirements files.

```bash
pip-compile --upgrade requirements.in
pip-sync requirements.txt
```

- For layered or multiple files, rerun the repo's existing compile commands in dependency order instead of flattening them into one file.

## pip requirements workflow

- Use this only when the repo directly edits `requirements.txt` or `constraints.txt` without a separate compile tool.
- Update the tracked requirement specifiers in the repo-owned files first, then refresh the environment with pip:

```bash
python -m pip install --upgrade -r requirements.txt
```

- If the repo uses multiple tracked requirement files, install or validate them using the same documented bootstrap command the project already uses.

## Sources

- pnpm: https://pnpm.io/cli/update
- Yarn: https://yarnpkg.com/cli/up
- npm: https://docs.npmjs.com/cli/v8/commands/npm-update/
- Bun: https://bun.sh/docs/pm/cli/update
- uv lock/sync: https://docs.astral.sh/uv/concepts/projects/sync/
- uv pip compile: https://docs.astral.sh/uv/pip/compile/
- pip requirements files: https://pip.pypa.io/en/stable/reference/requirements-file-format.html
- pip install upgrade behavior: https://pip.pypa.io/en/stable/user_guide.html
- pip-tools: https://github.com/jazzband/pip-tools
