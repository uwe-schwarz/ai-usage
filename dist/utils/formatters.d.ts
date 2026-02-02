import type { UsageWindow } from "../types/index.js";
export declare function formatDuration(ms: number): string;
export declare function formatWindow(window: UsageWindow | undefined): string;
export declare function calculatePace(weeklyWindow: UsageWindow | undefined, _fiveHourWindow: UsageWindow | undefined): string;
export declare function getPaceColor(pace: string): string;
export declare function parseISO8601(dateStr: string): Date | undefined;
export declare function parseEpochMs(timestamp: number): Date | undefined;
//# sourceMappingURL=formatters.d.ts.map