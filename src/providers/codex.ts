import { AuthConfig, Provider, ProviderUsage, UsageWindow } from '../types/index.js';
import { parseISO8601 } from '../utils/formatters.js';

interface CodexRateLimitWindow {
  used_percent: number;
  limit_window_seconds?: number;
  reset_after_seconds: number;
  reset_at?: number;
}

interface CodexResponse {
  plan_type?: string;
  rate_limit: {
    primary_window: CodexRateLimitWindow;
    secondary_window?: CodexRateLimitWindow;
  };
  credits?: {
    balance?: string;
  };
}

export class CodexProvider implements Provider {
  name = 'codex';
  displayName = 'Codex (OpenAI)';

  async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
    const token = auth.openai?.access;
    const accountId = auth.openai?.accountId;
    
    if (!token) {
      return {
        provider: this.displayName,
        error: 'No OpenAI token found in auth.json'
      };
    }

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      if (accountId) {
        headers['ChatGPT-Account-Id'] = accountId;
      }

      const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as CodexResponse;

      const primaryWindow: UsageWindow | undefined = data.rate_limit?.primary_window ? {
        used: data.rate_limit.primary_window.used_percent,
        limit: 100,
        remaining: 100 - data.rate_limit.primary_window.used_percent,
        utilization: data.rate_limit.primary_window.used_percent,
        resetAt: data.rate_limit.primary_window.reset_at 
          ? new Date(data.rate_limit.primary_window.reset_at * 1000)
          : new Date(Date.now() + data.rate_limit.primary_window.reset_after_seconds * 1000)
      } : undefined;

      const secondaryWindow: UsageWindow | undefined = data.rate_limit?.secondary_window ? {
        used: data.rate_limit.secondary_window.used_percent,
        limit: 100,
        remaining: 100 - data.rate_limit.secondary_window.used_percent,
        utilization: data.rate_limit.secondary_window.used_percent,
        resetAt: data.rate_limit.secondary_window.reset_at 
          ? new Date(data.rate_limit.secondary_window.reset_at * 1000)
          : new Date(Date.now() + data.rate_limit.secondary_window.reset_after_seconds * 1000)
      } : undefined;

      const additionalInfo: string[] = [];
      if (data.plan_type) {
        additionalInfo.push(`Plan: ${data.plan_type}`);
      }
      if (data.credits?.balance) {
        additionalInfo.push(`Credits: $${data.credits.balance}`);
      }

      return {
        provider: this.displayName,
        primaryWindow,
        secondaryWindow,
        plan: data.plan_type,
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
