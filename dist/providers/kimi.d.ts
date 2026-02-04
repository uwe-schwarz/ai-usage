import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from Kimi's coding API.
 *
 * Uses an API key to retrieve usage limits and remaining quota.
 */
export declare class KimiProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=kimi.d.ts.map