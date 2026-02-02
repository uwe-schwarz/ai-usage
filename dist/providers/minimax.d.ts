import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
export declare class MiniMaxProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=minimax.d.ts.map