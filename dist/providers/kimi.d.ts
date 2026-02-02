import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class KimiProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=kimi.d.ts.map