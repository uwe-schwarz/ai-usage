import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from Anthropic's Claude API.
 *
 * Uses OAuth credentials to fetch five-hour and seven-day rate limit utilization.
 */
export declare class ClaudeProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=claude.d.ts.map