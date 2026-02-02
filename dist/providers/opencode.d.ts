import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class OpenCodeProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=opencode.d.ts.map