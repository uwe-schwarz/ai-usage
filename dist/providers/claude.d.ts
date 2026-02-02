import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class ClaudeProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=claude.d.ts.map