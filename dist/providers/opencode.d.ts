import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from OpenCode's API.
 *
 * Uses an API key to retrieve credit usage and remaining balance.
 */
export declare class OpenCodeProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=opencode.d.ts.map