/**
 * Format a duration in milliseconds as a human-readable string.
 *
 * @param ms - Duration in milliseconds; non-positive values return "now".
 * @returns A string in the form "Xd Yh Zm", "Yh Zm", or "Zm" depending on magnitude.
 */
export function formatDuration(ms) {
    if (ms <= 0)
        return "now";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    }
    else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    else {
        return `${minutes}m`;
    }
}
/**
 * Format a usage window as a percentage (or percentage range) followed by the time until reset.
 *
 * @param window - The usage window to format; if `undefined`, the function returns `"N/A"`.
 * @returns A string in the form `"<percentageText> (<resetText>)"`. `percentageText` is either a single percentage with one decimal place (e.g., `"12.3%"`) or a range with one decimal place for min and max (e.g., `"10.0%-15.5%"`) when both `minUtilization` and `maxUtilization` are provided; `resetText` is the human-readable duration until `resetAt` or `"N/A"` if `resetAt` is absent.
 */
export function formatWindow(window) {
    if (!window)
        return "N/A";
    // Check if we have a range (min/max utilization)
    const hasRange = window.minUtilization !== undefined && window.maxUtilization !== undefined;
    let percentageText;
    if (hasRange) {
        const min = window.minUtilization?.toFixed(1) ?? "0";
        const max = window.maxUtilization?.toFixed(1) ?? "0";
        // If all values are the same, show single value
        if (min === max) {
            percentageText = `${min}%`;
        }
        else {
            percentageText = `${min}%-${max}%`;
        }
    }
    else {
        percentageText = `${window.utilization.toFixed(1)}%`;
    }
    const resetText = window.resetAt
        ? formatDuration(window.resetAt.getTime() - Date.now())
        : "N/A";
    return `${percentageText} (${resetText})`;
}
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
export function calculatePace(weeklyWindow, _fiveHourWindow) {
    if (!weeklyWindow || weeklyWindow.limit === 0)
        return "N/A";
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
    if (timeElapsed <= 0)
        return "0% (just reset)";
    const expectedUsage = (timeElapsed / totalWeekMs) * weeklyWindow.limit;
    const actualUsage = weeklyWindow.used;
    const diff = actualUsage - expectedUsage;
    const diffPercentage = (diff / weeklyWindow.limit) * 100;
    if (Math.abs(diffPercentage) < 5) {
        return "✓ on track";
    }
    else if (diff > 0) {
        return `↑ ${diffPercentage.toFixed(1)}% ahead`;
    }
    else {
        return `↓ ${Math.abs(diffPercentage).toFixed(1)}% behind`;
    }
}
export function calculateFiveHourPace(fiveHourWindow) {
    if (!fiveHourWindow || fiveHourWindow.limit === 0)
        return "N/A";
    const now = new Date();
    const resetAt = fiveHourWindow.resetAt;
    if (!resetAt) {
        const used = fiveHourWindow.used;
        const limit = fiveHourWindow.limit;
        const percentage = (used / limit) * 100;
        return `${percentage.toFixed(1)}% used`;
    }
    const timeUntilReset = resetAt.getTime() - now.getTime();
    const totalFiveHourMs = 5 * 60 * 60 * 1000;
    const timeElapsed = totalFiveHourMs - timeUntilReset;
    if (timeElapsed <= 0)
        return "0% (just reset)";
    const expectedUsage = (timeElapsed / totalFiveHourMs) * fiveHourWindow.limit;
    const actualUsage = fiveHourWindow.used;
    const diff = actualUsage - expectedUsage;
    const diffPercentage = (diff / fiveHourWindow.limit) * 100;
    if (Math.abs(diffPercentage) < 5) {
        return "✓ on track";
    }
    else if (diff > 0) {
        return `↑ ${diffPercentage.toFixed(1)}% ahead`;
    }
    else {
        return `↓ ${Math.abs(diffPercentage).toFixed(1)}% behind`;
    }
}
/**
 * Compute a pace status for monthly MCP limits.
 *
 * Similar to calculatePace but tailored for monthly billing cycles.
 *
 * @param monthlyWindow - Monthly usage window with `used`, `limit`, and optional `resetAt`; if `undefined` or `limit` is 0 the function returns `"N/A"`.
 * @returns A string prefixed with "mcp: " describing usage pace.
 */
export function calculateMonthlyPace(monthlyWindow) {
    if (!monthlyWindow || monthlyWindow.limit === 0)
        return "mcp: N/A";
    const now = new Date();
    const resetAt = monthlyWindow.resetAt;
    const usagePercentage = monthlyWindow.utilization;
    if (!resetAt) {
        return `mcp: ${usagePercentage.toFixed(1)}%`;
    }
    const nowMs = now.getTime();
    const resetAtMs = resetAt.getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0).getTime();
    const totalMonthMs = resetAtMs - startOfMonth;
    const elapsedMs = nowMs - startOfMonth;
    const elapsedPercentage = (elapsedMs / totalMonthMs) * 100;
    const diff = usagePercentage - elapsedPercentage;
    if (Math.abs(diff) < 5) {
        return "mcp: ✓ on track";
    }
    else if (diff <= 0) {
        return "mcp: ↓ behind";
    }
    else {
        return "mcp: ↑ ahead";
    }
}
/**
 * Determine the color category for a pace status string.
 *
 * @param pace - A pace string from calculatePace or calculateMonthlyPace.
 * @returns "green" for on-track or behind pace, "red" for ahead of pace, or "white" for unknown.
 */
export function getPaceColor(pace) {
    if (pace === "N/A" || pace.includes("N/A"))
        return "gray";
    if (pace.includes("✓") || pace.includes("on track"))
        return "green";
    if (pace.includes("↑") || pace.includes("ahead"))
        return "red";
    if (pace.includes("↓") || pace.includes("behind"))
        return "green";
    return "white";
}
/**
 * Parse an ISO 8601 date string into a Date object.
 *
 * @param dateStr - An ISO 8601 formatted date string.
 * @returns A Date object if parsing succeeds, or undefined if invalid.
 */
export function parseISO8601(dateStr) {
    try {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime()))
            return undefined;
        return date;
    }
    catch {
        return undefined;
    }
}
/**
 * Parse a Unix epoch timestamp (in milliseconds) into a Date object.
 *
 * @param timestamp - A Unix epoch timestamp in milliseconds.
 * @returns A Date object if parsing succeeds, or undefined if invalid.
 */
export function parseEpochMs(timestamp) {
    try {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime()))
            return undefined;
        return date;
    }
    catch {
        return undefined;
    }
}
