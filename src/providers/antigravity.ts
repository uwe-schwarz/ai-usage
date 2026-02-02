import { AuthConfig, Provider, ProviderUsage, UsageWindow } from '../types/index.js';

interface AntigravityUsageResponse {
  usage?: {
    limit?: number;
    used?: number;
    remaining?: number;
  };
  reset_at?: string;
}

export class AntigravityProvider implements Provider {
  name = 'antigravity';
  displayName = 'Antigravity';

  async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
    // Antigravity uses local server on port 8080
    try {
      const response = await fetch('http://127.0.0.1:8080/api/usage', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as AntigravityUsageResponse;

      const limit = data.usage?.limit || 0;
      const used = data.usage?.used || 0;
      const remaining = data.usage?.remaining || 0;

      const primaryWindow: UsageWindow | undefined = limit > 0 ? {
        used,
        limit,
        remaining,
        utilization: (used / limit) * 100,
        resetAt: data.reset_at ? new Date(data.reset_at) : undefined
      } : undefined;

      return {
        provider: this.displayName,
        primaryWindow,
        additionalInfo: remaining > 0 ? `${remaining} remaining` : undefined
      };
    } catch (error) {
      return {
        provider: this.displayName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
