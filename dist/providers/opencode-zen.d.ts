import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class OpenCodeZenProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(_auth: AuthConfig): Promise<ProviderUsage>;
    private findOpenCodeBinary;
    private runOpenCodeStats;
    private parseStats;
}
//# sourceMappingURL=opencode-zen.d.ts.map