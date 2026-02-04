import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from Z.AI's coding plan API.
 *
 * Uses an API key to retrieve token and time (MCP) limits for the billing period.
 */
export declare class ZaiProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=zai.d.ts.map