import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class OpenRouterProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=openrouter.d.ts.map