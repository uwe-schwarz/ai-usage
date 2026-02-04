import { parseEpochMs } from "../utils/formatters.js";
/**
 * Provider for fetching usage data from Z.AI's coding plan API.
 *
 * Uses an API key to retrieve token and time (MCP) limits for the billing period.
 */
export class ZaiProvider {
    name = "zai";
    displayName = "Z.AI";
    async fetchUsage(auth) {
        const token = auth["zai-coding-plan"]?.key;
        if (!token) {
            return {
                provider: this.displayName,
                error: "No Z.AI API key found in auth.json",
            };
        }
        try {
            const response = await fetch("https://api.z.ai/api/monitor/usage/quota/limit", {
                headers: {
                    Authorization: token,
                    Accept: "application/json",
                    "Accept-Language": "en-US,en",
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const rawData = (await response.json());
            const data = "data" in rawData && rawData.data
                ? rawData.data
                : rawData;
            let tokensLimit;
            let timeLimit;
            for (const limit of data.limits || []) {
                if (limit.type === "TOKENS_LIMIT") {
                    tokensLimit = limit;
                }
                else if (limit.type === "TIME_LIMIT") {
                    timeLimit = limit;
                }
            }
            let primaryWindow;
            if (tokensLimit) {
                const percentage = typeof tokensLimit.percentage === "string"
                    ? parseFloat(tokensLimit.percentage)
                    : tokensLimit.percentage || 0;
                const total = tokensLimit.total || 100;
                const remaining = tokensLimit.currentValue || 0;
                const used = total - remaining;
                primaryWindow = {
                    used,
                    limit: total,
                    remaining,
                    utilization: percentage,
                    resetAt: tokensLimit.nextResetTime
                        ? parseEpochMs(tokensLimit.nextResetTime)
                        : undefined,
                };
            }
            let tertiaryWindow;
            if (timeLimit) {
                const percentage = typeof timeLimit.percentage === "string"
                    ? parseFloat(timeLimit.percentage)
                    : timeLimit.percentage || 0;
                const total = timeLimit.total || 100;
                const used = Math.round((percentage / 100) * total);
                const remaining = total - used;
                const now = new Date();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                tertiaryWindow = {
                    used,
                    limit: total,
                    remaining,
                    utilization: percentage,
                    resetAt: endOfMonth,
                };
            }
            return {
                provider: this.displayName,
                primaryWindow,
                tertiaryWindow,
                plan: data.planName,
                additionalInfo: tokensLimit && timeLimit ? "Tokens + MCP (monthly)" : undefined,
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
