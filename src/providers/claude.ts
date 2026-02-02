import { AuthConfig, Provider, ProviderUsage, UsageWindow } from '../types/index.js';
import { parseISO8601 } from '../utils/formatters.js';

interface ClaudeUsageWindow {
  utilization: number;
  resets_at?: string;
}

interface ClaudeUsageResponse {
  five_hour?: ClaudeUsageWindow;
  seven_day?: ClaudeUsageWindow;
  seven_day_sonnet?: ClaudeUsageWindow;
  seven_day_opus?: ClaudeUsageWindow;
  extra_usage?: { is_enabled: boolean };
}

export class ClaudeProvider implements Provider {
  name = 'claude';
  displayName = 'Claude';

  async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
    const token = auth.anthropic?.access;
    if (!token) {
      return {
        provider: this.displayName,
        error: 'No Anthropic token found in auth.json'
      };
    }

    try {
      const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'anthropic-beta': 'oauth-2025-04-20',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ClaudeUsageResponse;

      const fiveHourWindow: UsageWindow | undefined = data.five_hour ? {
        used: data.five_hour.utilization,
        limit: 100,
        remaining: 100 - data.five_hour.utilization,
        utilization: data.five_hour.utilization,
        resetAt: data.five_hour.resets_at ? parseISO8601(data.five_hour.resets_at) : undefined
      } : undefined;

      const weeklyWindow: UsageWindow | undefined = data.seven_day ? {
        used: data.seven_day.utilization,
        limit: 100,
        remaining: 100 - data.seven_day.utilization,
        utilization: data.seven_day.utilization,
        resetAt: data.seven_day.resets_at ? parseISO8601(data.seven_day.resets_at) : undefined
      } : undefined;

      const additionalInfo: string[] = [];
      if (data.seven_day_sonnet) {
        additionalInfo.push(`Sonnet: ${data.seven_day_sonnet.utilization.toFixed(1)}%`);
      }
      if (data.seven_day_opus) {
        additionalInfo.push(`Opus: ${data.seven_day_opus.utilization.toFixed(1)}%`);
      }
      if (data.extra_usage?.is_enabled) {
        additionalInfo.push('Extra usage enabled');
      }

      return {
        provider: this.displayName,
        primaryWindow: fiveHourWindow,
        secondaryWindow: weeklyWindow,
        additionalInfo: additionalInfo.join(', ') || undefined
      };
    } catch (error) {
      return {
        provider: this.displayName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
