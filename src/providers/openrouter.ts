import type {
	AuthConfig,
	Provider,
	ProviderUsage,
	UsageWindow,
} from "../types/index.js";

interface OpenRouterCreditsData {
	total_credits: number;
	total_usage: number;
}

interface OpenRouterCreditsResponse {
	data: OpenRouterCreditsData;
}

interface OpenRouterKeyData {
	limit?: number;
	limit_remaining?: number;
	limit_reset?: string;
	usage_daily?: number;
	usage_weekly?: number;
	usage_monthly?: number;
}

interface OpenRouterKeyResponse {
	data: OpenRouterKeyData;
}

export class OpenRouterProvider implements Provider {
	name = "openrouter";
	displayName = "OpenRouter";

	async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
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

			const creditsData =
				(await creditsResponse.json()) as OpenRouterCreditsResponse;
			const keyData = keyResponse.ok
				? ((await keyResponse.json()) as OpenRouterKeyResponse)
				: undefined;

			const total = creditsData.data?.total_credits || 0;
			const used = creditsData.data?.total_usage || 0;
			const remaining = total - used;

			const primaryWindow: UsageWindow = {
				used,
				limit: total,
				remaining,
				utilization: total > 0 ? (used / total) * 100 : 0,
			};

			const additionalInfo: string[] = [];
			if (keyData?.data?.usage_monthly) {
				additionalInfo.push(
					`Monthly: $${keyData.data.usage_monthly.toFixed(2)}`,
				);
			}
			if (keyData?.data?.usage_weekly) {
				additionalInfo.push(`Weekly: $${keyData.data.usage_weekly.toFixed(2)}`);
			}
			if (keyData?.data?.limit_remaining !== undefined) {
				additionalInfo.push(
					`Limit remaining: $${keyData.data.limit_remaining.toFixed(2)}`,
				);
			}

			return {
				provider: this.displayName,
				primaryWindow,
				additionalInfo:
					additionalInfo.join(", ") || `$${remaining.toFixed(2)} remaining`,
			};
		} catch (error) {
			return {
				provider: this.displayName,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}
