#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import Table from 'cli-table3';
import { AuthConfig, Provider, ProviderUsage } from './types/index.js';
import {
  ClaudeProvider,
  CodexProvider,
  KimiProvider,
  ZaiProvider,
  OpenCodeProvider,
  GeminiProvider,
  OpenRouterProvider
} from './providers/index.js';
import { formatWindow, calculatePace, getPaceColor } from './utils/formatters.js';

async function loadAuthConfig(): Promise<AuthConfig> {
  const possiblePaths = [
    process.env.XDG_DATA_HOME && path.join(process.env.XDG_DATA_HOME, 'opencode/auth.json'),
    path.join(os.homedir(), '.local/share/opencode/auth.json'),
    path.join(os.homedir(), 'Library/Application Support/opencode/auth.json'),
  ].filter(Boolean) as string[];

  for (const configPath of possiblePaths) {
    try {
      const data = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(data) as AuthConfig;
    } catch {
      continue;
    }
  }

  throw new Error('Could not find auth.json in any standard location');
}

function createTable(): Table.Table {
  return new Table({
    head: [
      chalk.bold.white('Provider'),
      chalk.bold.white('5-hour window'),
      chalk.bold.white('Weekly'),
      chalk.bold.white('Pace'),
      chalk.bold.white('Additional Info')
    ],
    colWidths: [18, 22, 22, 18, 35],
    wordWrap: true,
    style: {
      head: [],
      border: ['gray']
    }
  });
}

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    'Claude': '#D97757',
    'Codex (OpenAI)': '#10A37F',
    'Kimi': '#1E88E5',
    'Z.AI': '#7C3AED',
    'OpenCode': '#6366F1',
    'Gemini CLI': '#4285F4',
    'OpenRouter': '#FF6B6B'
  };
  return colors[provider] || '#FFFFFF';
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

function formatProviderRow(usage: ProviderUsage): string[] {
  const color = getProviderColor(usage.provider);
  
  if (usage.error) {
    return [
      chalk.hex(color)(usage.provider),
      chalk.red(truncate(usage.error, 20)),
      '',
      '',
      ''
    ];
  }

  const fiveHourText = formatWindow(usage.primaryWindow);
  const weeklyText = formatWindow(usage.secondaryWindow);
  const pace = calculatePace(usage.secondaryWindow, usage.primaryWindow);
  const paceColor = getPaceColor(pace);

  const coloredPace = paceColor === 'green' 
    ? chalk.green(pace)
    : paceColor === 'red'
    ? chalk.red(pace)
    : paceColor === 'yellow'
    ? chalk.yellow(pace)
    : chalk.white(pace);

  return [
    chalk.hex(color)(usage.provider),
    fiveHourText,
    weeklyText,
    coloredPace,
    usage.additionalInfo || ''
  ];
}

async function main() {
  console.log(chalk.bold.blue('\n🔍 AI Usage Monitor\n'));

  let auth: AuthConfig;
  try {
    auth = await loadAuthConfig();
    console.log(chalk.gray(`Loaded auth config from ~/.local/share/opencode/auth.json\n`));
  } catch (error) {
    console.error(chalk.red('Error loading auth config:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const providers: Provider[] = [
    new ClaudeProvider(),
    new CodexProvider(),
    new KimiProvider(),
    new ZaiProvider(),
    new OpenCodeProvider(),
    new GeminiProvider(),
    new OpenRouterProvider()
  ];

  console.log(chalk.gray('Fetching usage data from providers...\n'));

  const results = await Promise.all(
    providers.map(provider => provider.fetchUsage(auth))
  );

  const table = createTable();
  
  for (const usage of results) {
    table.push(formatProviderRow(usage));
  }

  console.log(table.toString());
  console.log();
  
  console.log(chalk.gray('Legend:'));
  console.log(chalk.gray('  • 5-hour window: Short-term rate limit usage'));
  console.log(chalk.gray('  • Weekly: Long-term usage limit'));
  console.log(chalk.gray('  • Pace:'));
  console.log(chalk.green('    ✓ on track') + chalk.gray(' = usage matches expected pace'));
  console.log(chalk.red('    ↑ X% ahead') + chalk.gray(' = using more than expected, may run out'));
  console.log(chalk.yellow('    ↓ X% behind') + chalk.gray(' = using less than expected'));
  console.log();
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
