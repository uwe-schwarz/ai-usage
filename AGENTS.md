# AI Usage Monitor - Agent Guidelines

## Pre-Commit Checklist

Before committing and pushing any changes, you MUST run the following:

### 1. Code Quality Checks
```bash
bun run lint      # Check for linting issues
bun run typecheck # TypeScript type checking
```

Both must pass with no errors or warnings.

### 2. Build Distribution Files
```bash
bun run build     # Compile TypeScript to dist/
```

The `dist/` folder is committed to the repo (not gitignored) so that `bunx github:` works. You must rebuild and commit dist/ after any source changes.

### 3. Test the Package
```bash
bun run start     # Run locally to verify it works
```

### 4. Commit and Push
```bash
git add .
git commit -m "<message>"
git push
```

Or test with bunx:
```bash
bun pm cache rm && bunx github:uwe-schwarz/ai-usage
```

## Project Structure

- `src/` - TypeScript source files
- `dist/` - Compiled JavaScript (committed to repo for bunx support)
- `scripts/start.sh` - Conditional build script for local development
- `biome.json` - Biome linter/formatter configuration

## Available Scripts

- `bun run build` - Compile TypeScript
- `bun run start` - Run with conditional build check
- `bun run dev` - Run with tsx (development)
- `bun run lint` - Run Biome linter
- `bun run format` - Auto-format code with Biome
- `bun run check` - Run all Biome checks
- `bun run typecheck` - TypeScript type checking

## Important Notes

1. **dist/ is NOT gitignored** - Unlike typical TypeScript projects, we commit the `dist/` folder so that `bunx github:uwe-schwarz/ai-usage` can find the executable.

2. **bin field** - The `package.json` has `"bin": "dist/index.js"` for bunx compatibility.

3. **Shebang** - `src/index.ts` must start with `#!/usr/bin/env node` for the bin to work.

4. **Node.js imports** - Always use `node:` prefix for Node.js built-in modules (e.g., `node:fs/promises`).

5. **Type imports** - Use `import type` for type-only imports to avoid runtime overhead.

## Adding New Providers

1. Create provider in `src/providers/<name>.ts`
2. Implement the `Provider` interface
3. Export from `src/providers/index.ts`
4. Add to provider list in `src/index.ts`
5. Run full pre-commit checklist
6. Update README.md if needed

## Testing bunx Installation

To verify bunx works after changes:

```bash
bun pm cache rm
bunx github:uwe-schwarz/ai-usage
```

This clears the cache and reinstalls from GitHub to test the exact user experience.
