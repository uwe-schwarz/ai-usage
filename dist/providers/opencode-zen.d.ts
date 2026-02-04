import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from the OpenCode Zen CLI.
 *
 * Executes the OpenCode binary to retrieve local usage statistics
 * including total cost, sessions, and messages.
 */
export declare class OpenCodeZenProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(_auth: AuthConfig): Promise<ProviderUsage>;
    /**
     * Locate the OpenCode binary on the system.
     *
     * First tries 'which opencode', then falls back to common installation paths.
     *
     * @returns The path to the OpenCode binary, or null if not found.
     */
    private findOpenCodeBinary;
    /**
     * Execute the OpenCode stats command to retrieve usage data.
     *
     * @param binaryPath - Path to the OpenCode binary.
     * @returns Parsed OpenCodeStats, or null if the command fails.
     */
    private runOpenCodeStats;
    /**
     * Parse the stdout from 'opencode stats' into structured data.
     *
     * @param output - The raw stdout from the OpenCode stats command.
     * @returns Parsed OpenCodeStats, or null if parsing fails.
     */
    private parseStats;
}
//# sourceMappingURL=opencode-zen.d.ts.map