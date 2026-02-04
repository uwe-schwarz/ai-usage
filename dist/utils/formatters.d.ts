import type { UsageWindow } from "../types/index.js";
/**
 * Format a duration in milliseconds as a human-readable string.
 *
 * @param ms - Duration in milliseconds; non-positive values return "now".
 * @returns A string in the form "Xd Yh Zm", "Yh Zm", or "Zm" depending on magnitude.
 */
export declare function formatDuration(ms: number): string;
/**
 * Format a usage window as a percentage (or percentage range) followed by the time until reset.
 *
 * @param window - The usage window to format; if `undefined`, the function returns `"N/A"`.
 * @returns A string in the form `"<percentageText> (<resetText>)"`. `percentageText` is either a single percentage with one decimal place (e.g., `"12.3%"`) or a range with one decimal place for min and max (e.g., `"10.0%-15.5%"`) when both `minUtilization` and `maxUtilization` are provided; `resetText` is the human-readable duration until `resetAt` or `"N/A"` if `resetAt` is absent.
 */
export declare function formatWindow(window: UsageWindow | undefined): string;
/**
 * Compute a concise pace status describing how current weekly usage compares to expected usage.
 *
 * @param weeklyWindow - Weekly usage window with `used`, `limit`, and optional `resetAt`; if `undefined` or `limit` is 0 the function returns `"N/A"`.
 * @param _fiveHourWindow - Unused (reserved for compatibility); ignored by this function.
 * @returns One of:
 * - `"N/A"` when no valid weekly window or zero limit.
 * - `"<x.x>% used"` when `resetAt` is not defined (one decimal place).
 * - `"0% (just reset)"` when the window just reset.
 * - `"✓ on track"` when usage is within 5% of expected.
 * - `"↑ X.X% ahead"` when usage is ahead of expected (one decimal place).
 * - `"↓ X.X% behind"` when usage is behind expected (one decimal place).
 */
export declare function calculatePace(weeklyWindow: UsageWindow | undefined, _fiveHourWindow: UsageWindow | undefined): string;
export declare function calculateFiveHourPace(fiveHourWindow: UsageWindow | undefined): string;
/**
 * Compute a pace status for monthly MCP limits.
 *
 * Similar to calculatePace but tailored for monthly billing cycles.
 *
 * @param monthlyWindow - Monthly usage window with `used`, `limit`, and optional `resetAt`; if `undefined` or `limit` is 0 the function returns `"N/A"`.
 * @returns A string prefixed with "mcp: " describing usage pace.
 */
export declare function calculateMonthlyPace(monthlyWindow: UsageWindow | undefined): string;
/**
 * Determine the color category for a pace status string.
 *
 * @param pace - A pace string from calculatePace or calculateMonthlyPace.
 * @returns "green" for on-track or behind pace, "red" for ahead of pace, or "white" for unknown.
 */
export declare function getPaceColor(pace: string): string;
/**
 * Parse an ISO 8601 date string into a Date object.
 *
 * @param dateStr - An ISO 8601 formatted date string.
 * @returns A Date object if parsing succeeds, or undefined if invalid.
 */
export declare function parseISO8601(dateStr: string): Date | undefined;
/**
 * Parse a Unix epoch timestamp (in milliseconds) into a Date object.
 *
 * @param timestamp - A Unix epoch timestamp in milliseconds.
 * @returns A Date object if parsing succeeds, or undefined if invalid.
 */
export declare function parseEpochMs(timestamp: number): Date | undefined;
//# sourceMappingURL=formatters.d.ts.map