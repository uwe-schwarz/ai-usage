#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import Table from "cli-table3";
import { AntigravityProvider, ClaudeProvider, CodexProvider, GeminiProvider, KimiProvider, MiniMaxProvider, OpenCodeProvider, OpenCodeZenProvider, OpenRouterProvider, ZaiProvider, } from "./providers/index.js";
import { calculateMonthlyPace, calculatePace, formatWindow, getPaceColor, } from "./utils/formatters.js";
async function loadAuthConfig() {
    const possiblePaths = [
        process.env.XDG_DATA_HOME &&
            path.join(process.env.XDG_DATA_HOME, "opencode/auth.json"),
        path.join(os.homedir(), ".local/share/opencode/auth.json"),
        path.join(os.homedir(), "Library/Application Support/opencode/auth.json"),
    ].filter(Boolean);
    for (const configPath of possiblePaths) {
        try {
            const data = await fs.readFile(configPath, "utf-8");
            return JSON.parse(data);
        }
        catch { }
    }
    throw new Error("Could not find auth.json in any standard location");
}
function calculateProviderColumnWidth(results) {
    const baseWidth = 18;
    let maxLabelLength = 0;
    for (const usage of results) {
        // Check main provider name
        maxLabelLength = Math.max(maxLabelLength, usage.provider.length);
        // Check sub-row labels (for Antigravity models)
        if (usage.subRows) {
            for (const subRow of usage.subRows) {
                // Add 4 for "  └ " prefix
                maxLabelLength = Math.max(maxLabelLength, subRow.label.length + 4);
            }
        }
    }
    // Use the larger of base width or max label length, with some padding
    return Math.max(baseWidth, maxLabelLength + 2);
}
function createTable(providerColWidth) {
    return new Table({
        head: [
            chalk.bold.white("Provider"),
            chalk.bold.white("5-hour window"),
            chalk.bold.white("Weekly"),
            chalk.bold.white("MCP (monthly)"),
            chalk.bold.white("Pace"),
        ],
        colWidths: [providerColWidth, 22, 22, 22, 22],
        wordWrap: false,
        style: {
            head: [],
            border: ["gray"],
        },
    });
}
function getProviderColor(provider) {
    const colors = {
        Claude: "#D97757",
        "Codex (OpenAI)": "#10A37F",
        Kimi: "#1E88E5",
        "Z.AI": "#7C3AED",
        OpenCode: "#6366F1",
        "OpenCode Zen": "#6366F1",
        "Gemini CLI": "#4285F4",
        OpenRouter: "#FF6B6B",
        MiniMax: "#FF9500",
        Antigravity: "#00D9FF",
    };
    return colors[provider] || "#FFFFFF";
}
function truncate(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return `${str.substring(0, maxLength - 3)}...`;
}
function formatProviderRow(usage) {
    const color = getProviderColor(usage.provider);
    if (usage.error) {
        return [
            chalk.hex(color)(usage.provider),
            chalk.red(truncate(usage.error, 20)),
            "",
            "",
            "",
        ];
    }
    const fiveHourText = formatWindow(usage.primaryWindow);
    const weeklyText = formatWindow(usage.secondaryWindow);
    const mcpText = formatWindow(usage.tertiaryWindow);
    const pace = usage.provider === "Z.AI"
        ? calculateMonthlyPace(usage.tertiaryWindow)
        : calculatePace(usage.secondaryWindow, usage.primaryWindow);
    const paceColor = getPaceColor(pace);
    const coloredPace = paceColor === "green"
        ? chalk.green(pace)
        : paceColor === "red"
            ? chalk.red(pace)
            : paceColor === "yellow"
                ? chalk.yellow(pace)
                : chalk.white(pace);
    return [
        chalk.hex(color)(usage.provider),
        fiveHourText,
        weeklyText,
        mcpText,
        coloredPace,
    ];
}
function formatSubRow(providerName, subRow) {
    const color = getProviderColor(providerName);
    const windowText = formatWindow(subRow.window);
    // For Antigravity sub-rows, stretch the name across first two columns
    const fullLabel = `  └ ${subRow.label}`;
    return [chalk.hex(color)(fullLabel), windowText, "", "", ""];
}
function getUnsupportedProviders(auth) {
    const supportedProviders = [
        "anthropic", // Claude
        "openai", // Codex
        "kimi-for-coding", // Kimi
        "zai-coding-plan", // Z.AI
        "opencode", // OpenCode
        "google", // Gemini CLI
        "openrouter", // OpenRouter
        "minimax-coding-plan", // MiniMax
        // Antigravity is local server, not in auth config
    ];
    const configuredProviders = Object.keys(auth).filter((key) => auth[key] !== undefined);
    return configuredProviders.filter((provider) => !supportedProviders.includes(provider));
}
async function main() {
    console.log(chalk.bold.blue("\n🔍 AI Usage Monitor\n"));
    let auth;
    try {
        auth = await loadAuthConfig();
        console.log(chalk.gray(`Loaded auth config from ~/.local/share/opencode/auth.json\n`));
    }
    catch (error) {
        console.error(chalk.red("Error loading auth config:"), error instanceof Error ? error.message : error);
        process.exit(1);
    }
    const providers = [
        new ClaudeProvider(),
        new CodexProvider(),
        new KimiProvider(),
        new ZaiProvider(),
        new OpenCodeProvider(),
        new OpenCodeZenProvider(),
        new GeminiProvider(),
        new OpenRouterProvider(),
        new MiniMaxProvider(),
        new AntigravityProvider(),
    ];
    console.log(chalk.gray("Fetching usage data from providers...\n"));
    const results = await Promise.all(providers.map((provider) => provider.fetchUsage(auth)));
    // Filter out providers without auth tokens or with API errors
    const validResults = results.filter((usage) => {
        if (!usage.error)
            return true;
        // Don't show providers that don't have tokens configured
        if (usage.error.includes("No Anthropic token"))
            return false;
        if (usage.error.includes("No OpenRouter API key"))
            return false;
        if (usage.error.includes("No Gemini accounts found"))
            return false;
        // Don't show providers with API endpoint issues (not available, in development)
        if (usage.error.includes("API endpoint not available"))
            return false;
        if (usage.error.includes("may be in development"))
            return false;
        // Don't show providers with token refresh failures
        if (usage.error.includes("Token refresh failed"))
            return false;
        // Don't show providers with connection errors (MiniMax, Antigravity)
        if (usage.error.includes("HTTP 404"))
            return false;
        if (usage.error.includes("fetch failed"))
            return false;
        if (usage.error.includes("ECONNREFUSED"))
            return false;
        return true;
    });
    // Calculate dynamic column width based on content
    const providerColWidth = calculateProviderColumnWidth(validResults);
    const table = createTable(providerColWidth);
    for (const usage of validResults) {
        // Add main row
        table.push(formatProviderRow(usage));
        // Add sub-rows for multi-model providers (like Antigravity)
        if (usage.subRows && usage.subRows.length > 0) {
            for (const subRow of usage.subRows) {
                table.push(formatSubRow(usage.provider, subRow));
            }
        }
    }
    console.log(table.toString());
    console.log();
    console.log(chalk.gray("Legend:"));
    console.log(chalk.gray("  • 5-hour window: Short-term rate limit usage"));
    console.log(chalk.gray("  • Weekly: Long-term usage limit"));
    console.log(chalk.gray("  • MCP (monthly): Model Context Protocol time limits"));
    console.log(chalk.gray("  • Pace:"));
    console.log(chalk.green("    ✓ on track") +
        chalk.gray(" = usage matches expected pace"));
    console.log(chalk.red("    ↑ X% ahead") +
        chalk.gray(" = using more than expected, may run out"));
    console.log(chalk.green("    ↓ X% behind") +
        chalk.gray(" = using less than expected (good!)"));
    console.log();
    // Show unsupported providers
    const unsupported = getUnsupportedProviders(auth);
    if (unsupported.length > 0) {
        console.log(chalk.yellow("⚠️  Not yet supported:"));
        for (const provider of unsupported) {
            console.log(chalk.yellow(`   • ${provider}`));
        }
        console.log();
    }
}
main().catch((error) => {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
});
