import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from MiniMax's coding plan API.
 *
 * Uses an API key to retrieve remaining quota for coding plan models.
 */
export declare class MiniMaxProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=minimax.d.ts.map