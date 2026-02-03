interface AntigravityAccount {
    email: string;
    refreshToken: string;
    projectId: string;
    addedAt: number;
    lastUsed: number;
    managedProjectId: string;
}
interface RefreshResult {
    accessToken: string;
    expiresAt: Date;
    email: string;
}
export declare function getActiveAntigravityAccount(): Promise<AntigravityAccount | undefined>;
export declare function refreshAntigravityToken(refreshToken: string): Promise<RefreshResult>;
export {};
//# sourceMappingURL=antigravity-accounts.d.ts.map