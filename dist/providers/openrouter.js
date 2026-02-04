/**
 * Provider for fetching usage data from OpenRouter's API.
 *
 * Uses an API key to retrieve credit balance and key-level usage statistics.
 */
export class OpenRouterProvider {
    name = "openrouter";
    displayName = "OpenRouter";
    async fetchUsage(auth) {
        const token = auth.openrouter?.key;
        if (!token) {
            return {
                provider: this.displayName,
                error: "No OpenRouter API key found in auth.json",
            };
        }
        try {
            const [creditsResponse, keyResponse] = await Promise.all([
                fetch("https://openrouter.ai/api/v1/credits", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }),
                fetch("https://openrouter.ai/api/v1/key", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }),
            ]);
            if (!creditsResponse.ok) {
                throw new Error(`Credits API HTTP ${creditsResponse.status}`);
            }
            const creditsData = (await creditsResponse.json());
            const keyData = keyResponse.ok
                ? (await keyResponse.json())
                : undefined;
            const total = creditsData.data?.total_credits || 0;
            const used = creditsData.data?.total_usage || 0;
            const remaining = total - used;
            const primaryWindow = {
                used,
                limit: total,
                remaining,
                utilization: total > 0 ? (used / total) * 100 : 0,
            };
            const additionalInfo = [];
            if (keyData?.data?.usage_monthly) {
                additionalInfo.push(`Monthly: $${keyData.data.usage_monthly.toFixed(2)}`);
            }
            if (keyData?.data?.usage_weekly) {
                additionalInfo.push(`Weekly: $${keyData.data.usage_weekly.toFixed(2)}`);
            }
            if (keyData?.data?.limit_remaining !== undefined) {
                additionalInfo.push(`Limit remaining: $${keyData.data.limit_remaining.toFixed(2)}`);
            }
            return {
                provider: this.displayName,
                primaryWindow,
                additionalInfo: additionalInfo.join(", ") || `$${remaining.toFixed(2)} remaining`,
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
