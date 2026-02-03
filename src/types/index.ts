export interface AuthConfig {
	openai?: OAuthConfig;
	google?: OAuthConfig;
	opencode?: ApiConfig;
	mistral?: ApiConfig;
	"zai-coding-plan"?: ApiConfig;
	"minimax-coding-plan"?: ApiConfig;
	"kimi-for-coding"?: ApiConfig;
	anthropic?: OAuthConfig;
	github?: OAuthConfig;
	openrouter?: ApiConfig;
	antigravity?: OAuthConfig;
}

export interface OAuthConfig {
	type: "oauth";
	refresh: string;
	access: string;
	expires: number;
	accountId?: string;
}

export interface ApiConfig {
	type: "api";
	key: string;
}

export interface UsageWindow {
	used: number;
	limit: number;
	remaining: number;
	utilization: number;
	resetAt?: Date;
	resetInSeconds?: number;
}

export interface ProviderUsage {
	provider: string;
	primaryWindow?: UsageWindow;
	secondaryWindow?: UsageWindow;
	tertiaryWindow?: UsageWindow; // For MCP limits (monthly)
	plan?: string;
	additionalInfo?: string;
	error?: string;
	// For multi-row providers (like Antigravity with multiple models)
	subRows?: ProviderSubRow[];
}

export interface ProviderSubRow {
	label: string;
	window: UsageWindow;
}

export interface Provider {
	name: string;
	displayName: string;
	fetchUsage(auth: AuthConfig): Promise<ProviderUsage>;
}
