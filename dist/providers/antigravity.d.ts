import type { AuthConfig, Provider, ProviderUsage } from "../types/index.js";
/**
 * Provider for fetching usage data from Antigravity's Cloud Code API.
 *
 * Uses OAuth credentials to retrieve model-specific quota information
 * for all available Antigravity models.
 */
export declare class AntigravityProvider implements Provider {
    name: string;
    displayName: string;
    fetchUsage(_auth: AuthConfig): Promise<ProviderUsage>;
    /**
     * Fetch quota data from Cloud Code endpoints.
     *
     * Attempts each configured base URL in sequence until one succeeds.
     *
     * @param accessToken - OAuth access token for authentication.
     * @param projectId - Optional GCP project ID.
     * @returns Array of model quota data.
     * @throws Error if all endpoints fail.
     */
    private fetchQuota;
    /**
     * Fetch quota from a specific Cloud Code endpoint.
     *
     * @param baseUrl - The base URL for the Cloud Code API.
     * @param accessToken - OAuth access token for authentication.
     * @param projectId - Optional GCP project ID.
     * @returns Array of model quota data.
     * @throws Error if the request fails.
     */
    private fetchQuotaFromEndpoint;
    /**
     * Parse the Cloud Code quota response into a structured format.
     *
     * @param data - Raw JSON response from the API.
     * @returns Array of parsed model quota data.
     */
    private parseQuotaResponse;
    /**
     * Convert quota data into ProviderUsage for display.
     *
     * Calculates min/max utilization across models for range display
     * and generates sub-rows for individual model details.
     *
     * @param models - Array of model quota data.
     * @param email - Optional account email for additional info.
     * @returns Formatted ProviderUsage object.
     */
    private parseResponse;
    /**
     * Parse a reset time string into a Date object.
     *
     * Accepts ISO 8601 strings or Unix epoch seconds.
     *
     * @param resetTime - The reset time string to parse.
     * @returns A Date object, or undefined if parsing fails.
     */
    private parseResetTime;
}
//# sourceMappingURL=antigravity.d.ts.map