/**
 * Authentication configuration mapping provider keys to their credentials.
 *
 * Each provider key maps to either OAuth credentials (with refresh/access tokens)
 * or API key credentials. The configuration is typically loaded from auth.json.
 */
export interface AuthConfig {
    openai?: OAuthConfig;
    google?: OAuthConfig;
    opencode?: ApiConfig;
    mistral?: ApiConfig;
    "zai-coding-plan"?: ApiConfig;
    "minimax-coding-plan"?: ApiConfig;
    "kimi-for-coding"?: ApiConfig;
    anthropic?: OAuthConfig;
    github?: OAuthConfig;
    openrouter?: ApiConfig;
    antigravity?: OAuthConfig;
}
/**
 * OAuth-based authentication credentials.
 *
 * Used by providers that require OAuth token exchange for API access.
 */
export interface OAuthConfig {
    type: "oauth";
    refresh: string;
    access: string;
    expires: number;
    accountId?: string;
}
/**
 * API key-based authentication credentials.
 *
 * Used by providers that accept a simple API key for authentication.
 */
export interface ApiConfig {
    type: "api";
    key: string;
}
/**
 * Represents a time-bounded usage window with remaining quota information.
 *
 * Used to track rate limits or quotas over a specific time period.
 */
export interface UsageWindow {
    used: number;
    limit: number;
    remaining: number;
    utilization: number;
    resetAt?: Date;
    resetInSeconds?: number;
    /** For displaying ranges (e.g., Antigravity model utilization range) */
    minUtilization?: number;
    maxUtilization?: number;
}
/**
 * Standardized error codes for provider failures.
 *
 * These codes enable consistent error handling and filtering across providers.
 */
export type ErrorCode = "NO_ANTHROPIC_TOKEN" | "NO_OPENROUTER_KEY" | "NO_GEMINI_ACCOUNTS" | "API_ENDPOINT_UNAVAILABLE" | "TOKEN_REFRESH_FAILED" | "HTTP_NOT_FOUND" | "CONNECTION_REFUSED" | "FETCH_FAILED";
/**
 * Usage data returned by a provider after fetching from its API.
 *
 * Contains the provider name, up to three usage windows (primary, secondary, tertiary),
 * optional plan information, and error details if the fetch failed.
 */
export interface ProviderUsage {
    provider: string;
    primaryWindow?: UsageWindow;
    secondaryWindow?: UsageWindow;
    /** For MCP limits (monthly) */
    tertiaryWindow?: UsageWindow;
    plan?: string;
    additionalInfo?: string;
    error?: string;
    errorCode?: ErrorCode;
    /** For multi-row providers (like Antigravity with multiple models) */
    subRows?: ProviderSubRow[];
}
/**
 * A sub-row representing detailed usage for a specific model or component.
 *
 * Used by providers that aggregate multiple models under a single provider entry.
 */
export interface ProviderSubRow {
    label: string;
    window: UsageWindow;
}
/**
 * Interface that all AI provider implementations must satisfy.
 *
 * Providers fetch usage data from their respective APIs and return
 * standardized ProviderUsage objects for display in the CLI.
 */
export interface Provider {
    name: string;
    displayName: string;
    fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
//# sourceMappingURL=index.d.ts.map