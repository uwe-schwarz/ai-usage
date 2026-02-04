import type {
	AuthConfig,
	Provider,
	ProviderUsage,
	UsageWindow,
} from "../types/index.js";
import {
	getActiveAntigravityAccount,
	refreshAntigravityToken,
} from "../utils/antigravity-accounts.js";

const CLOUDCODE_BASE_URLS = [
	"https://daily-cloudcode-pa.googleapis.com",
	"https://cloudcode-pa.googleapis.com",
	"https://daily-cloudcode-pa.sandbox.googleapis.com",
];

const FETCH_AVAILABLE_MODELS_PATH = "/v1internal:fetchAvailableModels";

interface CloudCodeModelData {
	displayName?: string;
	model?: string;
	quotaInfo?: {
		remainingFraction?: number;
		resetTime?: string;
	};
}

interface CloudCodeQuotaResponse {
	models?: Record<string, CloudCodeModelData>;
}

interface CloudCodeModelQuota {
	label: string;
	remainingFraction?: number;
	resetTime?: string;
}

/**
 * Provider for fetching usage data from Antigravity's Cloud Code API.
 *
 * Uses OAuth credentials to retrieve model-specific quota information
 * for all available Antigravity models.
 */
export class AntigravityProvider implements Provider {
	name = "antigravity";
	displayName = "Antigravity";

	async fetchUsage(_auth: AuthConfig): Promise<ProviderUsage> {
		const account = await getActiveAntigravityAccount();
		if (!account) {
			return {
				provider: this.displayName,
				error: "No Antigravity account found in antigravity-accounts.json",
			};
		}

		let accessToken: string;
		const expiresAt = _auth.antigravity?.expires;

		if (expiresAt && expiresAt > Date.now()) {
			// Token is still valid - use cached access token if available
			if (_auth.antigravity?.access) {
				accessToken = _auth.antigravity.access;
			} else {
				return {
					provider: this.displayName,
					error: "Antigravity access token missing",
				};
			}
		} else {
			// Token is expired - try to refresh
			if (!_auth.antigravity?.refresh) {
				try {
					const refreshResult = await refreshAntigravityToken(
						account.refreshToken,
					);
					accessToken = refreshResult.accessToken;
				} catch (error) {
					return {
						provider: this.displayName,
						error:
							error instanceof Error && error.message === "invalid_grant"
								? "Antigravity refresh token invalid. Please re-authorize."
								: `Failed to refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
					};
				}
			} else {
				try {
					const refreshResult = await refreshAntigravityToken(
						_auth.antigravity.refresh,
					);
					accessToken = refreshResult.accessToken;
				} catch (error) {
					return {
						provider: this.displayName,
						error:
							error instanceof Error && error.message === "invalid_grant"
								? "Antigravity refresh token invalid. Please re-authorize."
								: `Failed to refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
					};
				}
			}
		}

		try {
			const quota = await this.fetchQuota(accessToken, account.projectId);
			return this.parseResponse(quota, account.email);
		} catch (error) {
			return {
				provider: this.displayName,
				error: error instanceof Error ? error.message : "Failed to fetch quota",
			};
		}
	}

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
	private async fetchQuota(
		accessToken: string,
		projectId?: string,
	): Promise<CloudCodeModelQuota[]> {
		let lastError: Error | undefined;

		for (const baseUrl of CLOUDCODE_BASE_URLS) {
			try {
				return await this.fetchQuotaFromEndpoint(
					baseUrl,
					accessToken,
					projectId,
				);
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
			}
		}

		throw lastError ?? new Error("All Cloud Code endpoints failed");
	}

	/**
	 * Fetch quota from a specific Cloud Code endpoint.
	 *
	 * @param baseUrl - The base URL for the Cloud Code API.
	 * @param accessToken - OAuth access token for authentication.
	 * @param projectId - Optional GCP project ID.
	 * @returns Array of model quota data.
	 * @throws Error if the request fails.
	 */
	private async fetchQuotaFromEndpoint(
		baseUrl: string,
		accessToken: string,
		projectId?: string,
	): Promise<CloudCodeModelQuota[]> {
		const urlString = baseUrl + FETCH_AVAILABLE_MODELS_PATH;
		const url = new URL(urlString);

		const body: Record<string, unknown> = {};
		if (projectId) {
			body.project = projectId;
		}

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
				"User-Agent": "antigravity",
			},
			body: JSON.stringify(body),
		});

		if (response.status === 401) {
			throw new Error("invalid_grant");
		}
		if (response.status === 403) {
			const errorBody = await response.text();
			throw new Error(`forbidden: ${response.statusText} - ${errorBody}`);
		}

		if (!response.ok) {
			const errorBody = await response.text();
			throw new Error(`HTTP ${response.status}: ${errorBody}`);
		}

		const data = (await response.json()) as CloudCodeQuotaResponse;
		return this.parseQuotaResponse(data);
	}

	/**
	 * Parse the Cloud Code quota response into a structured format.
	 *
	 * @param data - Raw JSON response from the API.
	 * @returns Array of parsed model quota data.
	 */
	private parseQuotaResponse(
		data: CloudCodeQuotaResponse,
	): CloudCodeModelQuota[] {
		const models: CloudCodeModelQuota[] = [];

		if (data.models) {
			for (const [key, modelData] of Object.entries(data.models)) {
				const displayName = modelData.displayName ?? key;
				models.push({
					label: displayName,
					remainingFraction: modelData.quotaInfo?.remainingFraction,
					resetTime: modelData.quotaInfo?.resetTime,
				});
			}
		}

		return models;
	}

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
	private parseResponse(
		models: CloudCodeModelQuota[],
		email?: string,
	): ProviderUsage {
		if (models.length === 0) {
			return {
				provider: this.displayName,
				error: "No model configs found",
			};
		}

		const subRows = models
			.map((model) => {
				const remainingFraction = model.remainingFraction ?? 1.0;
				const remainingPercent = remainingFraction * 100;
				const utilization = 100 - remainingPercent;

				let resetAt: Date | undefined;
				if (model.resetTime) {
					resetAt = this.parseResetTime(model.resetTime);
				}

				return {
					label: model.label,
					window: {
						used: utilization,
						limit: 100,
						remaining: remainingPercent,
						utilization,
						resetAt,
					},
				};
			})
			.sort((a, b) => a.label.localeCompare(b.label));

		// Calculate min and max utilization across all models
		let minRemainingPercent = 100;
		let maxRemainingPercent = 100;
		let earliestReset: Date | undefined;

		for (const model of models) {
			const remainingFraction = model.remainingFraction ?? 1.0;
			const remainingPercent = remainingFraction * 100;
			minRemainingPercent = Math.min(minRemainingPercent, remainingPercent);
			maxRemainingPercent = Math.max(maxRemainingPercent, remainingPercent);

			if (model.resetTime) {
				const resetDate = this.parseResetTime(model.resetTime);
				if (!earliestReset || (resetDate && resetDate < earliestReset)) {
					earliestReset = resetDate;
				}
			}
		}

		const minUtilization = 100 - maxRemainingPercent;
		const maxUtilization = 100 - minRemainingPercent;

		const primaryWindow: UsageWindow = {
			used: maxUtilization, // Use max as the "used" value
			limit: 100,
			remaining: minRemainingPercent,
			utilization: maxUtilization,
			resetAt: earliestReset,
			// Store range info for display
			minUtilization,
			maxUtilization,
		};

		return {
			provider: this.displayName,
			primaryWindow,
			additionalInfo: email ?? undefined,
			subRows,
		};
	}

	/**
	 * Parse a reset time string into a Date object.
	 *
	 * Accepts ISO 8601 strings or Unix epoch seconds.
	 *
	 * @param resetTime - The reset time string to parse.
	 * @returns A Date object, or undefined if parsing fails.
	 */
	private parseResetTime(resetTime: string): Date | undefined {
		const date = new Date(resetTime);
		if (!Number.isNaN(date.getTime())) {
			return date;
		}

		const epochSeconds = parseFloat(resetTime);
		if (!Number.isNaN(epochSeconds)) {
			return new Date(epochSeconds * 1000);
		}

		return undefined;
	}
}
