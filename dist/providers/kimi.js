import { parseISO8601 } from "../utils/formatters.js";
export class KimiProvider {
    name = "kimi";
    displayName = "Kimi";
    async fetchUsage(auth) {
        const token = auth["kimi-for-coding"]?.key;
        if (!token) {
            return {
                provider: this.displayName,
                error: "No Kimi API key found in auth.json",
            };
        }
        try {
            const response = await fetch("https://api.kimi.com/coding/v1/usages", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = (await response.json());
            let weeklyWindow;
            if (data.usage) {
                const limit = parseInt(data.usage.limit, 10) || 0;
                const used = parseInt(data.usage.used, 10) || 0;
                const remaining = parseInt(data.usage.remaining, 10) || 0;
                weeklyWindow = {
                    used,
                    limit,
                    remaining,
                    utilization: limit > 0 ? (used / limit) * 100 : 0,
                    resetAt: parseISO8601(data.usage.resetTime),
                };
            }
            let fiveHourWindow;
            if (data.limits && data.limits.length > 0) {
                const limit = data.limits[0];
                const detail = limit.detail;
                const limitVal = parseInt(detail.limit, 10) || 0;
                const usedVal = parseInt(detail.used, 10) || 0;
                const remainingVal = parseInt(detail.remaining, 10) || 0;
                fiveHourWindow = {
                    used: usedVal,
                    limit: limitVal,
                    remaining: remainingVal,
                    utilization: limitVal > 0 ? (usedVal / limitVal) * 100 : 0,
                    resetAt: parseISO8601(detail.resetTime),
                };
            }
            const additionalInfo = [];
            if (data.user?.membershipLevel) {
                additionalInfo.push(`Level: ${data.user.membershipLevel}`);
            }
            return {
                provider: this.displayName,
                primaryWindow: fiveHourWindow,
                secondaryWindow: weeklyWindow,
                additionalInfo: additionalInfo.join(", ") || undefined,
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
