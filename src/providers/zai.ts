import { AuthConfig, Provider, ProviderUsage, UsageWindow } from '../types/index.js';
import { parseEpochMs } from '../utils/formatters.js';

interface ZaiQuotaLimitItem {
  type: 'TOKENS_LIMIT' | 'TIME_LIMIT';
  percentage?: number | string;
  currentValue?: number;
  total?: number;
  nextResetTime?: number;
}

interface ZaiQuotaLimitResponse {
  limits: ZaiQuotaLimitItem[];
  planName?: string;
}

interface ZaiEnvelopedResponse {
  data?: ZaiQuotaLimitResponse;
  code?: number;
}

export class ZaiProvider implements Provider {
  name = 'zai';
  displayName = 'Z.AI';

  async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
    const token = auth['zai-coding-plan']?.key;
    
    if (!token) {
      return {
        provider: this.displayName,
        error: 'No Z.AI API key found in auth.json'
      };
    }

    try {
      const response = await fetch('https://api.z.ai/api/monitor/usage/quota/limit', {
        headers: {
          'Authorization': token,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json() as ZaiQuotaLimitResponse | ZaiEnvelopedResponse;
      
      const data = 'data' in rawData && rawData.data ? rawData.data : rawData as ZaiQuotaLimitResponse;

      let tokensLimit: ZaiQuotaLimitItem | undefined;
      let timeLimit: ZaiQuotaLimitItem | undefined;

      for (const limit of data.limits || []) {
        if (limit.type === 'TOKENS_LIMIT') {
          tokensLimit = limit;
        } else if (limit.type === 'TIME_LIMIT') {
          timeLimit = limit;
        }
      }

      const primaryLimit = tokensLimit || timeLimit;
      
      let primaryWindow: UsageWindow | undefined;
      if (primaryLimit) {
        const percentage = typeof primaryLimit.percentage === 'string' 
          ? parseFloat(primaryLimit.percentage) 
          : (primaryLimit.percentage || 0);
        const total = primaryLimit.total || 100;
        const used = primaryLimit.currentValue || 0;
        
        primaryWindow = {
          used,
          limit: total,
          remaining: total - used,
          utilization: percentage,
          resetAt: primaryLimit.nextResetTime ? parseEpochMs(primaryLimit.nextResetTime) : undefined
        };
      }

      let secondaryWindow: UsageWindow | undefined;
      if (tokensLimit && timeLimit) {
        const percentage = typeof timeLimit.percentage === 'string' 
          ? parseFloat(timeLimit.percentage) 
          : (timeLimit.percentage || 0);
        const total = timeLimit.total || 100;
        const used = timeLimit.currentValue || 0;
        
        secondaryWindow = {
          used,
          limit: total,
          remaining: total - used,
          utilization: percentage,
          resetAt: timeLimit.nextResetTime ? parseEpochMs(timeLimit.nextResetTime) : undefined
        };
      }

      return {
        provider: this.displayName,
        primaryWindow,
        secondaryWindow,
        plan: data.planName,
        additionalInfo: tokensLimit && timeLimit ? 'Tokens + Time limits' : undefined
      };
    } catch (error) {
      return {
        provider: this.displayName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
