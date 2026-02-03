import { parseISO8601 } from "../utils/formatters.js";
export class GeminiProvider {
    name = "gemini";
    displayName = "Gemini CLI";
    async fetchUsage(auth) {
        const accounts = await this.getAccounts(auth);
        if (accounts.length === 0) {
            return {
                provider: this.displayName,
                error: "No Gemini accounts found. Check ~/.config/opencode/antigravity-accounts.json",
            };
        }
        const results = [];
        const errors = [];
        for (const account of accounts) {
            try {
                const accessToken = await this.refreshToken(account.refreshToken);
                const response = await fetch("https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        project: account.projectId || "default",
                    }),
                });
                if (!response.ok) {
                    errors.push(`Account ${account.projectId || "default"}: HTTP ${response.status}`);
                    continue;
                }
                const data = (await response.json());
                if (data.buckets && data.buckets.length > 0) {
                    const minRemaining = Math.min(...data.buckets.map((b) => b.remainingFraction));
                    const resetTimes = data.buckets
                        .map((b) => parseISO8601(b.resetTime))
                        .filter((d) => d !== undefined);
                    const earliestReset = resetTimes.length > 0
                        ? new Date(Math.min(...resetTimes.map((d) => d.getTime())))
                        : undefined;
                    results.push({
                        used: (1 - minRemaining) * 100,
                        limit: 100,
                        remaining: minRemaining * 100,
                        utilization: (1 - minRemaining) * 100,
                        resetAt: earliestReset,
                    });
                }
            }
            catch (error) {
                errors.push(`Account ${account.projectId || "default"}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        }
        if (results.length === 0) {
            return {
                provider: this.displayName,
                error: errors.join("; ") || "Failed to fetch usage for all accounts",
            };
        }
        const minUsage = results.reduce((min, r) => (r.remaining < min.remaining ? r : min), results[0]);
        return {
            provider: this.displayName,
            primaryWindow: minUsage,
            additionalInfo: `${accounts.length} account(s) checked`,
        };
    }
    async getAccounts(_auth) {
        try {
            const fs = await import("node:fs/promises");
            const path = await import("node:path");
            const os = await import("node:os");
            const configPath = path.join(os.homedir(), ".config/opencode/antigravity-accounts.json");
            const data = await fs.readFile(configPath, "utf-8");
            const parsed = JSON.parse(data);
            // Handle both array and object formats
            if (Array.isArray(parsed)) {
                return parsed;
            }
            else if (parsed && typeof parsed === "object") {
                // If it's an object with accounts property
                if (Array.isArray(parsed.accounts)) {
                    return parsed.accounts;
                }
                // If it's a single account object
                if (parsed.refreshToken) {
                    return [parsed];
                }
            }
            return [];
        }
        catch (error) {
            console.debug("Failed to load Gemini config:", error);
            return [];
        }
    }
    async refreshToken(refreshToken) {
        // These are public OAuth client credentials for the Gemini CLI application
        // They are safe to include in source code as they identify the app, not the user
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: "58685908535-f6r0k2v9k1v9v9v9v9v9v9v9v9v9v9v9.apps.googleusercontent.com",
                client_secret: "GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });
        if (!response.ok) {
            throw new Error(`Token refresh failed: HTTP ${response.status}`);
        }
        const data = (await response.json());
        return data.access_token;
    }
}
