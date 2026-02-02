import { UsageWindow } from '../types/index.js';

export function formatDuration(ms: number): string {
  if (ms <= 0) return 'now';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
}

export function formatWindow(window: UsageWindow | undefined): string {
  if (!window) return 'N/A';
  
  const percentage = window.utilization.toFixed(1);
  const resetText = window.resetAt 
    ? formatDuration(window.resetAt.getTime() - Date.now())
    : 'N/A';
  
  return `${percentage}% (${resetText})`;
}

export function calculatePace(
  weeklyWindow: UsageWindow | undefined,
  fiveHourWindow: UsageWindow | undefined
): string {
  if (!weeklyWindow || weeklyWindow.limit === 0) return 'N/A';
  
  const now = new Date();
  const resetAt = weeklyWindow.resetAt;
  
  if (!resetAt) {
    const used = weeklyWindow.used;
    const limit = weeklyWindow.limit;
    const percentage = (used / limit) * 100;
    return `${percentage.toFixed(1)}% used`;
  }
  
  const timeUntilReset = resetAt.getTime() - now.getTime();
  const totalWeekMs = 7 * 24 * 60 * 60 * 1000;
  const timeElapsed = totalWeekMs - timeUntilReset;
  
  if (timeElapsed <= 0) return '0% (just reset)';
  
  const expectedUsage = (timeElapsed / totalWeekMs) * weeklyWindow.limit;
  const actualUsage = weeklyWindow.used;
  const diff = actualUsage - expectedUsage;
  const diffPercentage = (diff / weeklyWindow.limit) * 100;
  
  if (Math.abs(diffPercentage) < 5) {
    return '✓ on track';
  } else if (diff > 0) {
    return `↑ ${diffPercentage.toFixed(1)}% ahead`;
  } else {
    return `↓ ${Math.abs(diffPercentage).toFixed(1)}% behind`;
  }
}

export function getPaceColor(pace: string): string {
  // "behind" is good (green), "ahead" is bad (red)
  if (pace.includes('✓')) return 'green';
  if (pace.includes('↑')) return 'red';  // ahead = using more than expected
  if (pace.includes('↓')) return 'green'; // behind = using less than expected (good!)
  return 'white';
}

export function parseISO8601(dateStr: string): Date | undefined {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    return date;
  } catch {
    return undefined;
  }
}

export function parseEpochMs(timestamp: number): Date | undefined {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return undefined;
    return date;
  } catch {
    return undefined;
  }
}
