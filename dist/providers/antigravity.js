import { getActiveAntigravityAccount, refreshAntigravityToken, } from "../utils/antigravity-accounts.js";
const CLOUDCODE_BASE_URLS = [
    "https://daily-cloudcode-pa.googleapis.com",
    "https://cloudcode-pa.googleapis.com",
    "https://daily-cloudcode-pa.sandbox.googleapis.com",
];
const FETCH_AVAILABLE_MODELS_PATH = "/v1internal:fetchAvailableModels";
export class AntigravityProvider {
    name = "antigravity";
    displayName = "Antigravity";
    async fetchUsage(_auth) {
        const account = await getActiveAntigravityAccount();
        if (!account) {
            return {
                provider: this.displayName,
                error: "No Antigravity account found in antigravity-accounts.json",
            };
        }
        let accessToken;
        const expiresAt = _auth.antigravity?.expires;
        if (expiresAt && expiresAt > Date.now()) {
            if (!_auth.antigravity?.access) {
                return {
                    provider: this.displayName,
                    error: "Antigravity access token expired and no refresh token available",
                };
            }
            accessToken = _auth.antigravity.access;
        }
        else {
            if (!_auth.antigravity?.refresh) {
                try {
                    const refreshResult = await refreshAntigravityToken(account.refreshToken);
                    accessToken = refreshResult.accessToken;
                }
                catch (error) {
                    return {
                        provider: this.displayName,
                        error: error instanceof Error && error.message === "invalid_grant"
                            ? "Antigravity refresh token invalid. Please re-authorize."
                            : `Failed to refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
                    };
                }
            }
            else {
                try {
                    const refreshResult = await refreshAntigravityToken(_auth.antigravity.refresh);
                    accessToken = refreshResult.accessToken;
                }
                catch (error) {
                    return {
                        provider: this.displayName,
                        error: error instanceof Error && error.message === "invalid_grant"
                            ? "Antigravity refresh token invalid. Please re-authorize."
                            : `Failed to refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
                    };
                }
            }
        }
        try {
            const quota = await this.fetchQuota(accessToken, account.projectId);
            return this.parseResponse(quota, account.email);
        }
        catch (error) {
            return {
                provider: this.displayName,
                error: error instanceof Error ? error.message : "Failed to fetch quota",
            };
        }
    }
    async fetchQuota(accessToken, projectId) {
        let lastError;
        for (const baseUrl of CLOUDCODE_BASE_URLS) {
            try {
                return await this.fetchQuotaFromEndpoint(baseUrl, accessToken, projectId);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }
        throw lastError ?? new Error("All Cloud Code endpoints failed");
    }
    async fetchQuotaFromEndpoint(baseUrl, accessToken, projectId) {
        const urlString = baseUrl + FETCH_AVAILABLE_MODELS_PATH;
        const url = new URL(urlString);
        const body = {};
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
        if (response.status === 401 || response.status === 403) {
            throw new Error("invalid_grant");
        }
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }
        const data = (await response.json());
        return this.parseQuotaResponse(data);
    }
    parseQuotaResponse(data) {
        const models = [];
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
    parseResponse(models, email) {
        if (models.length === 0) {
            return {
                provider: this.displayName,
                error: "No model configs found",
            };
        }
        const subRows = models.map((model) => {
            const remainingFraction = model.remainingFraction ?? 1.0;
            const remainingPercent = remainingFraction * 100;
            const utilization = 100 - remainingPercent;
            let resetAt;
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
        });
        let minRemainingPercent = 100;
        let earliestReset;
        for (const model of models) {
            const remainingFraction = model.remainingFraction ?? 1.0;
            const remainingPercent = remainingFraction * 100;
            minRemainingPercent = Math.min(minRemainingPercent, remainingPercent);
            if (model.resetTime) {
                const resetDate = this.parseResetTime(model.resetTime);
                if (!earliestReset || (resetDate && resetDate < earliestReset)) {
                    earliestReset = resetDate;
                }
            }
        }
        const utilization = 100 - minRemainingPercent;
        const primaryWindow = {
            used: utilization,
            limit: 100,
            remaining: minRemainingPercent,
            utilization,
            resetAt: earliestReset,
        };
        return {
            provider: this.displayName,
            primaryWindow,
            additionalInfo: email ?? undefined,
            subRows,
        };
    }
    parseResetTime(resetTime) {
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
