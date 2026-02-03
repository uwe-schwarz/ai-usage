import { exec } from "node:child_process";
import { promisify } from "node:util";
import type {
	AuthConfig,
	Provider,
	ProviderUsage,
	UsageWindow,
} from "../types/index.js";

const execAsync = promisify(exec);

interface OpenCodeStats {
	totalCost: number;
	avgCostPerDay: number;
	sessions: number;
	messages: number;
}

export class OpenCodeZenProvider implements Provider {
	name = "opencode-zen";
	displayName = "OpenCode Zen";

	async fetchUsage(_auth: AuthConfig): Promise<ProviderUsage> {
		try {
			// Try to find opencode binary
			const binaryPath = await this.findOpenCodeBinary();

			if (!binaryPath) {
				return {
					provider: this.displayName,
					error: "OpenCode CLI not found",
				};
			}

			// Run opencode stats command
			const stats = await this.runOpenCodeStats(binaryPath);

			const monthlyLimit = 1000.0;

			if (!stats) {
				// If no stats available, return 0 usage (as requested)
				return {
					provider: this.displayName,
					primaryWindow: {
						used: 0,
						limit: monthlyLimit,
						remaining: monthlyLimit,
						utilization: 0,
					},
					additionalInfo: "No usage data available",
				};
			}
			const utilization = Math.min((stats.totalCost / monthlyLimit) * 100, 100);

			const primaryWindow: UsageWindow = {
				used: stats.totalCost,
				limit: monthlyLimit,
				remaining: Math.max(0, monthlyLimit - stats.totalCost),
				utilization,
			};

			return {
				provider: this.displayName,
				primaryWindow,
				additionalInfo: `$${stats.totalCost.toFixed(2)} used, ${stats.sessions} sessions`,
			};
		} catch (_error) {
			// Return 0 usage on error (as requested)
			const monthlyLimit = 1000.0;
			return {
				provider: this.displayName,
				primaryWindow: {
					used: 0,
					limit: monthlyLimit,
					remaining: monthlyLimit,
					utilization: 0,
				},
				additionalInfo: "No usage data available",
			};
		}
	}

	private async findOpenCodeBinary(): Promise<string | null> {
		try {
			// Try 'which opencode'
			const { stdout } = await execAsync("which opencode");
			const path = stdout.trim();
			if (path) return path;
		} catch {
			// Fallback to common paths
			const fallbackPaths = [
				"/opt/homebrew/bin/opencode",
				"/usr/local/bin/opencode",
				`${process.env.HOME}/.opencode/bin/opencode`,
				`${process.env.HOME}/.local/bin/opencode`,
				"/usr/bin/opencode",
			];

			for (const path of fallbackPaths) {
				try {
					await execAsync(`test -f "${path}"`);
					return path;
				} catch {}
			}
		}
		return null;
	}

	private async runOpenCodeStats(
		binaryPath: string,
	): Promise<OpenCodeStats | null> {
		try {
			const { stdout } = await execAsync(`"${binaryPath}" stats --days 7`, {
				timeout: 30000,
			});
			return this.parseStats(stdout);
		} catch {
			return null;
		}
	}

	private parseStats(output: string): OpenCodeStats | null {
		try {
			// Parse Total Cost
			const totalCostMatch = output.match(/│Total Cost\s+\$([0-9.]+)/);
			const totalCost = totalCostMatch ? parseFloat(totalCostMatch[1]) : 0;

			// Parse Avg Cost/Day
			const avgCostMatch = output.match(/│Avg Cost\/Day\s+\$([0-9.]+)/);
			const avgCostPerDay = avgCostMatch ? parseFloat(avgCostMatch[1]) : 0;

			// Parse Sessions
			const sessionsMatch = output.match(/│Sessions\s+([0-9,]+)/);
			const sessions = sessionsMatch
				? parseInt(sessionsMatch[1].replace(/,/g, ""), 10)
				: 0;

			// Parse Messages
			const messagesMatch = output.match(/│Messages\s+([0-9,]+)/);
			const messages = messagesMatch
				? parseInt(messagesMatch[1].replace(/,/g, ""), 10)
				: 0;

			return {
				totalCost,
				avgCostPerDay,
				sessions,
				messages,
			};
		} catch {
			return null;
		}
	}
}
