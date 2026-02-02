import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class GeminiProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
    private getAccounts;
    private refreshToken;
}
//# sourceMappingURL=gemini.d.ts.map