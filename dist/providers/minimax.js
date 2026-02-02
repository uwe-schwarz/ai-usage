export class MiniMaxProvider {
    name = "minimax";
    displayName = "MiniMax";
    async fetchUsage(auth) {
        const token = auth["minimax-coding-plan"]?.key;
        if (!token) {
            return {
                provider: this.displayName,
                error: "No MiniMax API key found in auth.json",
            };
        }
        try {
            // Use the correct endpoint from CodexBar docs
            const response = await fetch("https://platform.minimax.io/v1/api/openplatform/coding_plan/remains", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = (await response.json());
            // Check for API error
            if (data.base_resp && data.base_resp.status_code !== 0) {
                throw new Error(`API error: ${data.base_resp.status_msg}`);
            }
            // Calculate usage from model_remains
            // Note: current_interval_usage_count appears to be remaining, not used
            let totalRemaining = 0;
            let totalLimit = 0;
            let earliestReset;
            if (data.model_remains && data.model_remains.length > 0) {
                for (const model of data.model_remains) {
                    const remaining = model.current_interval_usage_count || 0;
                    const total = model.current_interval_total_count || 0;
                    totalRemaining += remaining;
                    totalLimit += total;
                    // Track earliest reset time
                    if (model.remains_time) {
                        const resetDate = new Date(model.remains_time);
                        if (!earliestReset || resetDate < earliestReset) {
                            earliestReset = resetDate;
                        }
                    }
                    else if (model.end_time) {
                        const resetDate = new Date(model.end_time);
                        if (!earliestReset || resetDate < earliestReset) {
                            earliestReset = resetDate;
                        }
                    }
                }
            }
            const totalUsed = totalLimit - totalRemaining;
            const utilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
            const primaryWindow = totalLimit > 0
                ? {
                    used: totalUsed,
                    limit: totalLimit,
                    remaining: totalRemaining,
                    utilization,
                    resetAt: earliestReset,
                }
                : undefined;
            return {
                provider: this.displayName,
                primaryWindow,
                additionalInfo: data.model_remains
                    ? `${data.model_remains.length} model(s)`
                    : undefined,
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
