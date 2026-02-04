import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from OpenRouter's API.
 *
 * Uses an API key to retrieve credit balance and key-level usage statistics.
 */
export declare class OpenRouterProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=openrouter.d.ts.map