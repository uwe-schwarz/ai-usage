import { parseEpochMs } from "../utils/formatters.js";
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
            const primaryLimit = tokensLimit || timeLimit;
            let primaryWindow;
            if (primaryLimit) {
                const percentage = typeof primaryLimit.percentage === "string"
                    ? parseFloat(primaryLimit.percentage)
                    : primaryLimit.percentage || 0;
                const total = primaryLimit.total || 100;
                const used = primaryLimit.currentValue || 0;
                primaryWindow = {
                    used,
                    limit: total,
                    remaining: total - used,
                    utilization: percentage,
                    resetAt: primaryLimit.nextResetTime
                        ? parseEpochMs(primaryLimit.nextResetTime)
                        : undefined,
                };
            }
            let secondaryWindow;
            if (tokensLimit && timeLimit) {
                const percentage = typeof timeLimit.percentage === "string"
                    ? parseFloat(timeLimit.percentage)
                    : timeLimit.percentage || 0;
                const total = timeLimit.total || 100;
                const used = timeLimit.currentValue || 0;
                secondaryWindow = {
                    used,
                    limit: total,
                    remaining: total - used,
                    utilization: percentage,
                    resetAt: timeLimit.nextResetTime
                        ? parseEpochMs(timeLimit.nextResetTime)
                        : undefined,
                };
            }
            // Create MCP (TIME_LIMIT) window with hardcoded monthly reset
            let tertiaryWindow;
            if (timeLimit) {
                const percentage = typeof timeLimit.percentage === "string"
                    ? parseFloat(timeLimit.percentage)
                    : timeLimit.percentage || 0;
                const total = timeLimit.total || 100;
                const used = timeLimit.currentValue || 0;
                // Hardcoded monthly reset (end of current month)
                const now = new Date();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                tertiaryWindow = {
                    used,
                    limit: total,
                    remaining: total - used,
                    utilization: percentage,
                    resetAt: endOfMonth,
                };
            }
            return {
                provider: this.displayName,
                primaryWindow,
                secondaryWindow,
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
