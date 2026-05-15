# AI Usage Monitor

> [!WARNING]
> This project is archived and will not be developed further. It should still work for its current use cases, but the AI tooling landscape has moved quickly enough that this monitor is now effectively outdated.

Monitor AI provider usage limits from opencode config.

## Usage

```bash
bun install
bun run start
```

### CLI Options

```
ai-usage-monitor [options]

Options:
  --help, -h              Show help message
  --show-antigravity      Show individual Antigravity model details

Examples:
  ai-usage-monitor                    # Show summary view
  ai-usage-monitor --show-antigravity # Show all Antigravity models
```

**Antigravity display:** By default, Antigravity shows a range (e.g., `5%-88%`) when models have different utilization levels. Use `--show-antigravity` to see individual model details.

## Supported Providers

- **Claude** (Anthropic) - OAuth API
- **Codex** (OpenAI) - ChatGPT/Codex usage
- **Kimi** - Moonshot AI usage
- **Z.AI** - Z.AI coding plan with MCP limits
- **OpenCode** - OpenCode credits (API-based)
- **OpenCode Zen** - OpenCode CLI stats
- **Gemini CLI** - Google Gemini usage
- **OpenRouter** - OpenRouter credits
- **MiniMax** - MiniMax coding plan
- **Antigravity** - Google Cloud Code API with per-model quotas (OAuth)

## Example Output

```
🔍 AI Usage Monitor

Loaded auth config from ~/.local/share/opencode/auth.json

Fetching usage data from providers...

┌──────────────────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────┐
│ Provider                         │ 5-hour window        │ Weekly               │ MCP (monthly)        │ Pace             │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│ Codex (OpenAI)                   │ 0.0% (4h 59m)        │ 7.0% (6d 2h 39m)     │ N/A                  │ ↓ 5.7% behind    │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│ Kimi                             │ 12.0% (4h 47m)       │ 13.0% (1d 3h 47m)    │ N/A                  │ ↓ 70.5% behind   │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│ Z.AI                             │ 1.0% (3m)            │ 0.0% (N/A)           │ 0.0% (26d 6h 11m)    │ 0.0% used        │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│ OpenCode Zen                     │ 0.0% (N/A)           │ N/A                  │ N/A                  │ N/A              │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│ MiniMax                          │ 100.0% (now)         │ N/A                  │ N/A                  │ N/A              │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│ Antigravity                      │ 0.0% (4h 57m)        │ N/A                  │ N/A                  │ N/A              │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│   └ Claude Opus 4.5 (Thinking)   │ 0.0% (4h 57m)        │                      │                      │                  │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│   └ GPT-OSS 120B (Medium)        │ 0.0% (4h 57m)        │                      │                      │                  │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│   └ Gemini 3 Pro (High)          │ 0.0% (4h 57m)        │                      │                      │                  │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│   └ Gemini 3 Flash               │ 0.0% (4h 57m)        │                      │                      │                  │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│   └ Claude Sonnet 4.5            │ 0.0% (4h 57m)        │                      │                      │                  │
├──────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────┤
│   └ Claude Sonnet 4.5 (Thinking) │ 0.0% (4h 57m)        │                      │                      │                  │
└──────────────────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┴──────────────────┘

Legend:
  • 5-hour window: Short-term rate limit usage
  • Weekly: Long-term usage limit
  • MCP (monthly): Model Context Protocol time limits
  • Pace:
    ✓ on track = usage matches expected pace
    ↑ X% ahead = using more than expected, may run out
    ↓ X% behind = using less than expected (good!)
```

## Features

- **Dynamic column width** - Provider column automatically adjusts to fit the longest name
- **Multi-model support** - Antigravity shows individual model quotas (use `--show-antigravity`)
- **Smart Antigravity display** - Shows utilization range by default, detailed view with flag
- **5-hour and weekly windows** - Short and long-term usage tracking with reset timers
- **Model Context Protocol (MCP) - monthly limits** - Shows MCP time limits for Z.AI
- **Usage pace calculation** - Shows if you're on track, ahead, or behind expected usage
- **Color-coded output** - Green for "behind" (good), red for "ahead" (warning)
- **Auto-discovers tokens** - Reads from `~/.local/share/opencode/auth.json`
- **Filters unavailable providers** - Only shows providers with valid tokens

## Architecture

Each provider is implemented as a separate class in `src/providers/`.
To add a new provider:

1. Create a new file in `src/providers/`
2. Implement the `Provider` interface
3. Export it from `src/providers/index.ts`
4. Add it to the provider list in `src/index.ts`

### Provider Types

- **OAuth-based**: Claude, Codex, Antigravity (uses access tokens)
- **API Key-based**: Kimi, Z.AI, MiniMax, OpenRouter, OpenCode
- **CLI-based**: OpenCode Zen (uses local `opencode` binary)
- **Cookie-based**: Gemini CLI (reads browser cookies)
