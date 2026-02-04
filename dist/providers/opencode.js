/**
 * Provider for fetching usage data from OpenCode's API.
 *
 * Uses an API key to retrieve credit usage and remaining balance.
 */
export class OpenCodeProvider {
    name = "opencode";
    displayName = "OpenCode";
    async fetchUsage(auth) {
        const token = auth.opencode?.key;
        if (!token) {
            return {
                provider: this.displayName,
                error: "No OpenCode API key found in auth.json",
            };
        }
        try {
            const response = await fetch("https://api.opencode.ai/v1/credits", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (response.status === 404 || response.status === 503) {
                return {
                    provider: this.displayName,
                    error: "API endpoint not available (may be in development)",
                };
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const text = await response.text();
            if (text.includes("Not Found")) {
                return {
                    provider: this.displayName,
                    error: "API endpoint not available (may be in development)",
                };
            }
            const data = JSON.parse(text);
            const total = data.data?.total_credits || 0;
            const used = data.data?.used_credits || 0;
            const remaining = data.data?.remaining_credits || 0;
            const primaryWindow = {
                used,
                limit: total,
                remaining,
                utilization: total > 0 ? (used / total) * 100 : 0,
            };
            return {
                provider: this.displayName,
                primaryWindow,
                additionalInfo: `$${used.toFixed(2)} used of $${total.toFixed(2)}`,
            };
        }
        catch (error) {
            return {
                provider: this.displayName,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }
}
