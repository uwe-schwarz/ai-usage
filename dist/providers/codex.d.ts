import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class CodexProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=codex.d.ts.map