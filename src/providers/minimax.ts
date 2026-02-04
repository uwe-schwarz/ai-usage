import type {
	AuthConfig,
	Provider,
	ProviderUsage,
	UsageWindow,
} from "../types/index.js";

interface MiniMaxRemainsResponse {
	model_remains?: Array<{
		model_name?: string;
		current_interval_usage_count?: number;
		current_interval_total_count?: number;
		start_time?: number;
		end_time?: number;
		remains_time?: number;
	}>;
	base_resp?: {
		status_code: number;
		status_msg: string;
	};
}

/**
 * Provider for fetching usage data from MiniMax's coding plan API.
 *
 * Uses an API key to retrieve remaining quota for coding plan models.
 */
export class MiniMaxProvider implements Provider {
	name = "minimax";
	displayName = "MiniMax";

	async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
		const token = auth["minimax-coding-plan"]?.key;

		if (!token) {
			return {
				provider: this.displayName,
				error: "No MiniMax API key found in auth.json",
			};
		}

		try {
			// Use the correct endpoint from CodexBar docs
			const response = await fetch(
				"https://platform.minimax.io/v1/api/openplatform/coding_plan/remains",
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json",
					},
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as MiniMaxRemainsResponse;

			// Check for API error
			if (data.base_resp && data.base_resp.status_code !== 0) {
				throw new Error(`API error: ${data.base_resp.status_msg}`);
			}

			// Calculate usage from model_remains
			// Note: current_interval_usage_count appears to be remaining, not used
			let totalRemaining = 0;
			let totalLimit = 0;
			let earliestReset: Date | undefined;

			if (data.model_remains && data.model_remains.length > 0) {
				for (const model of data.model_remains) {
					const remaining = model.current_interval_usage_count || 0;
					const total = model.current_interval_total_count || 0;
					totalRemaining += remaining;
					totalLimit += total;

					// Track earliest reset time
					// Normalize timestamps: if value < 1e12 it's likely seconds, multiply by 1000
					if (model.remains_time) {
						const timestamp =
							model.remains_time < 1e12
								? model.remains_time * 1000
								: model.remains_time;
						const resetDate = new Date(timestamp);
						if (!earliestReset || resetDate < earliestReset) {
							earliestReset = resetDate;
						}
					} else if (model.end_time) {
						const timestamp =
							model.end_time < 1e12 ? model.end_time * 1000 : model.end_time;
						const resetDate = new Date(timestamp);
						if (!earliestReset || resetDate < earliestReset) {
							earliestReset = resetDate;
						}
					}
				}
			}

			const totalUsed = totalLimit - totalRemaining;
			const utilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

			const primaryWindow: UsageWindow | undefined =
				totalLimit > 0
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
		} catch (error) {
			return {
				provider: this.displayName,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}
