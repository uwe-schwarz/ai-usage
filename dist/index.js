#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import Table from "cli-table3";
import { AntigravityProvider, ClaudeProvider, CodexProvider, GeminiProvider, KimiProvider, MiniMaxProvider, OpenCodeProvider, OpenCodeZenProvider, OpenRouterProvider, ZaiProvider, } from "./providers/index.js";
import { calculateMonthlyPace, calculatePace, formatWindow, getPaceColor, } from "./utils/formatters.js";
/**
 * Load authentication configuration from standard locations.
 *
 * Searches for auth.json in XDG_DATA_HOME, ~/.local/share, and ~/Library/Application Support.
 *
 * @returns An AuthConfigResult containing the parsed config and the path it was loaded from.
 * @throws Error if no valid auth.json is found in any location.
 */
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
            const config = JSON.parse(data);
            return { config, path: configPath };
        }
        catch { }
    }
    throw new Error("Could not find auth.json in any standard location");
}
/**
 * Calculate the optimal column width for the provider column in the usage table.
 *
 * Bases width on the longest provider name or sub-row label plus padding.
 *
 * @param results - Array of provider usage results that may include sub-rows.
 * @returns The column width in characters.
 */
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
/**
 * Create a CLI table instance for displaying usage data.
 *
 * @param providerColWidth - The width for the provider name column.
 * @returns A configured Table instance.
 */
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
/**
 * Get the brand color for a provider name.
 *
 * @param provider - The display name of the provider.
 * @returns A hex color string for the provider's brand color, or white if unknown.
 */
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
/**
 * Truncate a string to a maximum length with ellipsis.
 *
 * @param str - The string to truncate.
 * @param maxLength - Maximum length before truncation.
 * @returns The original string if shorter than maxLength, or truncated version with "..." suffix.
 */
function truncate(str, maxLength) {
    if (str.length <= maxLength)
        return str;
    return `${str.substring(0, maxLength - 3)}...`;
}
/**
 * Format a provider usage result as a table row.
 *
 * @param usage - The ProviderUsage to format.
 * @returns An array of formatted cell values for the table row.
 */
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
/**
 * Format a sub-row (e.g., Antigravity model) as a table row.
 *
 * @param providerName - The parent provider name for color attribution.
 * @param subRow - The sub-row data containing label and window.
 * @returns An array of formatted cell values for the sub-row.
 */
function formatSubRow(providerName, subRow) {
    const color = getProviderColor(providerName);
    const windowText = formatWindow(subRow.window);
    // For Antigravity sub-rows, stretch the name across first two columns
    const fullLabel = `  └ ${subRow.label}`;
    return [chalk.hex(color)(fullLabel), windowText, "", "", ""];
}
/**
 * Identify provider keys present in an AuthConfig that are not part of the officially supported provider list.
 *
 * @param auth - The parsed auth configuration object; keys with `undefined` values are treated as absent.
 * @returns The configured provider keys from `auth` that are not recognized as supported providers.
 */
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
/**
 * Print the CLI help banner, usage instructions, available options, and examples to stdout.
 *
 * Includes a short note explaining the Antigravity display behavior and the --show-antigravity flag.
 */
function printHelp() {
    console.log(chalk.bold.blue("\n🔍 AI Usage Monitor\n"));
    console.log("Monitor AI provider usage limits from opencode config.\n");
    console.log(chalk.bold("Usage:"));
    console.log("  ai-usage-monitor [options]\n");
    console.log(chalk.bold("Options:"));
    console.log("  --help, -h              Show this help message");
    console.log("  --show-antigravity      Show individual Antigravity model details\n");
    console.log(chalk.bold("Examples:"));
    console.log("  ai-usage-monitor                    # Show summary view");
    console.log("  ai-usage-monitor --show-antigravity # Show all Antigravity models\n");
    console.log(chalk.gray("Antigravity display:"));
    console.log("  By default, Antigravity shows a range (e.g., 5%-88%) when models");
    console.log("  have different utilization levels. Use --show-antigravity to see");
    console.log("  individual model details.\n");
}
/**
 * Parse command-line arguments to determine whether to display Antigravity sub-rows and whether help was requested.
 *
 * @returns An object where `showAntigravityDetails` is `true` if `--show-antigravity` is present (otherwise `false`), and `showHelp` is `true` if `--help` or `-h` is present (otherwise `false`).
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const showAntigravityDetails = args.includes("--show-antigravity");
    const showHelpFlag = args.includes("--help") || args.includes("-h");
    return { showAntigravityDetails, showHelp: showHelpFlag };
}
/**
 * Run the CLI: load auth configuration, fetch usage from providers, and render a usage table to stdout.
 *
 * Loads the auth.json from standard locations, instantiates provider clients, retrieves usage data,
 * filters and sorts results, and prints a formatted table with pace indicators and a legend.
 * Honors CLI flags (help and --show-antigravity) — printing help and exiting when requested,
 * and showing Antigravity sub-rows only when the flag is provided. Exits the process with code 1
 * if auth loading fails. Outputs status and error messages to stdout/stderr.
 */
async function main() {
    const { showAntigravityDetails, showHelp } = parseArgs();
    if (showHelp) {
        printHelp();
        process.exit(0);
    }
    console.log(chalk.bold.blue("\n🔍 AI Usage Monitor\n"));
    let auth;
    let authPath;
    try {
        const result = await loadAuthConfig();
        auth = result.config;
        authPath = result.path;
        console.log(chalk.gray(`Loaded auth config from ${authPath}\n`));
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
    // Error codes for filtering providers
    const HIDDEN_ERROR_CODES = [
        "NO_ANTHROPIC_TOKEN",
        "NO_OPENROUTER_KEY",
        "NO_GEMINI_ACCOUNTS",
        "API_ENDPOINT_UNAVAILABLE",
        "TOKEN_REFRESH_FAILED",
        "HTTP_NOT_FOUND",
        "CONNECTION_REFUSED",
        "FETCH_FAILED",
    ];
    // Filter out providers without auth tokens or with API errors
    const validResults = results
        .filter((usage) => {
        if (!usage.error)
            return true;
        // Check for standardized error codes first
        if (usage.errorCode && HIDDEN_ERROR_CODES.includes(usage.errorCode)) {
            return false;
        }
        // Fallback to message substring checks for backward compatibility
        if (usage.error.includes("No Anthropic token"))
            return false;
        if (usage.error.includes("No OpenRouter API key"))
            return false;
        if (usage.error.includes("No Gemini accounts found"))
            return false;
        if (usage.error.includes("API endpoint not available"))
            return false;
        if (usage.error.includes("may be in development"))
            return false;
        if (usage.error.includes("Token refresh failed"))
            return false;
        if (usage.error.includes("HTTP 404"))
            return false;
        if (usage.error.includes("fetch failed"))
            return false;
        if (usage.error.includes("ECONNREFUSED"))
            return false;
        return true;
    })
        .sort((a, b) => a.provider.localeCompare(b.provider));
    // Calculate dynamic column width based on content
    const providerColWidth = calculateProviderColumnWidth(validResults);
    const table = createTable(providerColWidth);
    for (const usage of validResults) {
        // Add main row
        table.push(formatProviderRow(usage));
        // Add sub-rows for multi-model providers (like Antigravity)
        // Only show details if --show-antigravity flag is passed
        if (showAntigravityDetails && usage.subRows && usage.subRows.length > 0) {
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
