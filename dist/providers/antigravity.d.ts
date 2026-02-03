import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class AntigravityProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(_auth: AuthConfig): Promise<ProviderUsage>;
    private fetchQuota;
    private fetchQuotaFromEndpoint;
    private parseQuotaResponse;
    private parseResponse;
    private parseResetTime;
}
//# sourceMappingURL=antigravity.d.ts.map