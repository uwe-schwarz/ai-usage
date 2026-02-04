import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from Google's Gemini CLI.
 *
 * Uses OAuth refresh tokens from antigravity-accounts.json to access
 * the Cloud Code quota API for Gemini usage information.
 */
export declare class GeminiProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
    /**
     * Load Gemini accounts from the Antigravity accounts configuration file.
     *
     * @param _auth - Unused; accounts are loaded directly from file.
     * @returns Array of Gemini accounts with project IDs and refresh tokens.
     */
    private getAccounts;
    /**
     * Refresh an OAuth access token for a Gemini account.
     *
     * @param refreshToken - The OAuth refresh token for the account.
     * @returns A valid OAuth access token.
     * @throws Error if token refresh fails.
     */
    private refreshToken;
}
//# sourceMappingURL=gemini.d.ts.map