import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from OpenAI's Codex/ChatGPT API.
 *
 * Uses OAuth credentials to fetch rate limit utilization for the user's account.
 */
export declare class CodexProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=codex.d.ts.map