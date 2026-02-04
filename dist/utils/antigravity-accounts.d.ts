/**
 * Represents a single Antigravity account stored in antigravity-accounts.json.
 */
interface AntigravityAccount {
    email: string;
    refreshToken: string;
    projectId: string;
    addedAt: number;
    lastUsed: number;
    managedProjectId: string;
}
/**
 * Result of a successful token refresh operation.
 */
interface RefreshResult {
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    email: string;
}
/**
 * Load the active Antigravity account from the configuration file.
 *
 * Reads antigravity-accounts.json from the user's config directory and returns
 * the account at the activeIndex. Returns undefined if the file is missing,
 * invalid, or contains no accounts.
 *
 * @returns The active AntigravityAccount, or undefined if not available.
 */
export declare function getActiveAntigravityAccount(): Promise<AntigravityAccount | undefined>;
/**
 * Refresh an Antigravity OAuth access token using a refresh token.
 *
 * Sends the refresh token to Google's OAuth endpoint to obtain a new access token.
 * Also fetches the user's email from the userinfo endpoint.
 *
 * @param refreshToken - The OAuth refresh token from the Antigravity account.
 * @returns A RefreshResult containing the new access token, optional new refresh token, expiry time, and email.
 * @throws Error if the token refresh fails, including "invalid_grant" for expired refresh tokens.
 */
export declare function refreshAntigravityToken(refreshToken: string): Promise<RefreshResult>;
export {};
//# sourceMappingURL=antigravity-accounts.d.ts.map