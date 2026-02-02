import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class AntigravityProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(_auth: AuthConfig): Promise<ProviderUsage>;
    private makeRequest;
    private parseResponse;
}
//# sourceMappingURL=antigravity.d.ts.map