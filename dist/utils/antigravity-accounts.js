import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
const ANTIGRAVITY_ACCOUNTS_PATH = join(homedir(), ".config", "opencode", "antigravity-accounts.json");
const ANTIGRAVITY_OAUTH_CONFIG = {
    clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
    // These are public OAuth client credentials for the Antigravity application
    // They are safe to include in source code as they identify the app, not the user
    clientSecret: "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",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
};
export async function getActiveAntigravityAccount() {
    try {
        const content = await readFile(ANTIGRAVITY_ACCOUNTS_PATH, "utf-8");
        const data = JSON.parse(content);
        // Validate accounts array
        if (!data.accounts ||
            !Array.isArray(data.accounts) ||
            data.accounts.length === 0) {
            throw new Error("Invalid AntigravityAccountsFile: missing or empty accounts array");
        }
        const activeIndex = data.activeIndex ?? 0;
        // Validate activeIndex is within bounds
        if (activeIndex < 0 || activeIndex >= data.accounts.length) {
            throw new Error(`Invalid AntigravityAccountsFile: activeIndex ${activeIndex} out of bounds (accounts length: ${data.accounts.length})`);
        }
        return data.accounts[activeIndex];
    }
    catch {
        return undefined;
    }
}
export async function refreshAntigravityToken(refreshToken) {
    const params = new URLSearchParams({
        client_id: ANTIGRAVITY_OAUTH_CONFIG.clientId,
        client_secret: ANTIGRAVITY_OAUTH_CONFIG.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    });
    const response = await fetch(ANTIGRAVITY_OAUTH_CONFIG.tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        if (errorBody.toLowerCase().includes("invalid_grant")) {
            throw new Error("invalid_grant");
        }
        throw new Error(`Token refresh failed: ${response.status} ${errorBody}`);
    }
    const data = (await response.json());
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    let email;
    try {
        email = await fetchUserEmail(data.access_token);
    }
    catch {
        email = "unknown";
    }
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? undefined,
        expiresAt,
        email,
    };
}
async function fetchUserEmail(accessToken) {
    const response = await fetch(ANTIGRAVITY_OAUTH_CONFIG.userInfoUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
    }
    const data = (await response.json());
    if (!data.email) {
        throw new Error("Missing email in userinfo response");
    }
    return data.email;
}
