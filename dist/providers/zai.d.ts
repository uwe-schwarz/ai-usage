import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class ZaiProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=zai.d.ts.map