import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
const ANTIGRAVITY_ACCOUNTS_PATH = join(homedir(), ".config", "opencode", "antigravity-accounts.json");
const ANTIGRAVITY_OAUTH_CONFIG = {
    clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
    clientSecret: "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",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
};
export async function getActiveAntigravityAccount() {
    try {
        const content = await readFile(ANTIGRAVITY_ACCOUNTS_PATH, "utf-8");
        const data = JSON.parse(content);
        const activeIndex = data.activeIndex ?? 0;
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
