# AI Usage Monitor

Monitor AI provider usage limits from opencode config.

## Usage

```bash
bun install
bun run start
```

## Supported Providers

- Claude (Anthropic)
- Codex (OpenAI)
- Kimi
- Z.AI
- OpenCode
- Gemini CLI
- OpenRouter

## Features

- Shows 5-hour and weekly usage windows with reset timers
- Calculates usage pace (on track / ahead / behind)
- Color-coded output for easy reading
- Automatically reads tokens from `~/.local/share/opencode/auth.json`

## Architecture

Each provider is implemented as a separate class in `src/providers/`.
To add a new provider:

1. Create a new file in `src/providers/`
2. Implement the `Provider` interface
3. Export it from `src/providers/index.ts`
4. Add it to the provider list in `src/index.ts`
