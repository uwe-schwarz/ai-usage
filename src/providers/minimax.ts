import { AuthConfig, Provider, ProviderUsage, UsageWindow } from '../types/index.js';

interface MiniMaxUsageResponse {
  data?: {
    usage?: {
      limit?: number;
      used?: number;
      remaining?: number;
    };
    reset_time?: string;
  };
}

export class MiniMaxProvider implements Provider {
  name = 'minimax';
  displayName = 'MiniMax';

  async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
    const token = auth['minimax-coding-plan']?.key;
    
    if (!token) {
      return {
        provider: this.displayName,
        error: 'No MiniMax API key found in auth.json'
      };
    }

    try {
      const response = await fetch('https://api.minimax.chat/v1/usage', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as MiniMaxUsageResponse;

      const limit = data.data?.usage?.limit || 0;
      const used = data.data?.usage?.used || 0;
      const remaining = data.data?.usage?.remaining || 0;

      const primaryWindow: UsageWindow | undefined = limit > 0 ? {
        used,
        limit,
        remaining,
        utilization: (used / limit) * 100,
        resetAt: data.data?.reset_time ? new Date(data.data.reset_time) : undefined
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
