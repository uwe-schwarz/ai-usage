import { AuthConfig, Provider, ProviderUsage, UsageWindow } from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';

const execAsync = promisify(exec);

interface AntigravityModelConfig {
  label: string;
  quotaInfo?: {
    remainingFraction?: number;
    resetTime?: string;
  };
}

interface AntigravityUserStatus {
  email?: string;
  userTier?: { name?: string };
  planStatus?: { planInfo?: { planDisplayName?: string } };
  cascadeModelConfigData?: {
    clientModelConfigs?: AntigravityModelConfig[];
  };
}

interface AntigravityResponse {
  userStatus?: AntigravityUserStatus;
}

export class AntigravityProvider implements Provider {
  name = 'antigravity';
  displayName = 'Antigravity';

  async fetchUsage(auth: AuthConfig): Promise<ProviderUsage> {
    try {
      // Step 1: Find language_server_macos process
      const { stdout: psOutput } = await execAsync('ps -ax -o pid=,command=');
      const processLine = psOutput.split('\n').find(line => 
        line.includes('language_server_macos') && 
        line.includes('antigravity') && 
        !line.includes('grep')
      );

      if (!processLine) {
        return {
          provider: this.displayName,
          error: 'Antigravity not running'
        };
      }

      // Extract PID and CSRF token
      const components = processLine.trim().split(/\s+/);
      const pid = parseInt(components[0], 10);
      
      const csrfMatch = processLine.match(/--csrf_token[= ]+([a-zA-Z0-9-]+)/);
      if (!csrfMatch) {
        return {
          provider: this.displayName,
          error: 'Cannot extract CSRF token'
        };
      }
      const csrfToken = csrfMatch[1];

      // Step 2: Find listening port
      const { stdout: lsofOutput } = await execAsync(`lsof -nP -iTCP -sTCP:LISTEN -a -p ${pid}`);
      const portMatch = lsofOutput.match(/(?:\*|127\.0\.0\.1):(\d+) \(LISTEN\)/);
      if (!portMatch) {
        return {
          provider: this.displayName,
          error: 'Cannot find listening port'
        };
      }
      const port = parseInt(portMatch[1], 10);

      // Step 3: Make HTTPS request to local server
      const response = await this.makeRequest(port, csrfToken);

      // Step 4: Parse response
      return this.parseResponse(response);
    } catch (error) {
      return {
        provider: this.displayName,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async makeRequest(port: number, csrfToken: string): Promise<AntigravityResponse> {
    return new Promise((resolve, reject) => {
      const requestBody = JSON.stringify({
        metadata: {
          ideName: 'antigravity',
          extensionName: 'antigravity',
          ideVersion: 'unknown',
          locale: 'en'
        }
      });

      const options = {
        hostname: '127.0.0.1',
        port,
        path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
        method: 'POST',
        headers: {
          'X-Codeium-Csrf-Token': csrfToken,
          'Connect-Protocol-Version': '1',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        },
        rejectUnauthorized: false // Allow self-signed certificates
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data) as AntigravityResponse;
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid response format'));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(requestBody);
      req.end();
    });
  }

  private parseResponse(response: AntigravityResponse): ProviderUsage {
    const userStatus = response.userStatus;
    
    if (!userStatus) {
      return {
        provider: this.displayName,
        error: 'Missing userStatus in response'
      };
    }

    const modelConfigs = userStatus.cascadeModelConfigData?.clientModelConfigs || [];
    
    if (modelConfigs.length === 0) {
      return {
        provider: this.displayName,
        error: 'No model configs found'
      };
    }

    // Calculate minimum remaining percentage across all models
    let minRemainingPercent = 100;
    const modelBreakdown: Record<string, number> = {};
    let earliestReset: Date | undefined;

    for (const config of modelConfigs) {
      const remainingFraction = config.quotaInfo?.remainingFraction ?? 1.0;
      const remainingPercent = remainingFraction * 100;
      
      modelBreakdown[config.label] = remainingPercent;
      minRemainingPercent = Math.min(minRemainingPercent, remainingPercent);

      // Track earliest reset time
      if (config.quotaInfo?.resetTime) {
        const resetDate = new Date(config.quotaInfo.resetTime);
        if (!earliestReset || resetDate < earliestReset) {
          earliestReset = resetDate;
        }
      }
    }

    const utilization = 100 - minRemainingPercent;

    const primaryWindow: UsageWindow = {
      used: utilization,
      limit: 100,
      remaining: minRemainingPercent,
      utilization,
      resetAt: earliestReset
    };

    const plan = userStatus.userTier?.name || userStatus.planStatus?.planInfo?.planDisplayName || 'unknown';
    const email = userStatus.email;

    return {
      provider: this.displayName,
      primaryWindow,
      plan,
      additionalInfo: email ? `${email} (${plan})` : plan
    };
  }
}
