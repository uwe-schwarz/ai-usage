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
export function calculateMonthlyPace(monthlyWindow) {
    if (!monthlyWindow || monthlyWindow.limit === 0)
        return "N/A";
    const now = new Date();
    const resetAt = monthlyWindow.resetAt;
    if (!resetAt) {
        const percentage = (monthlyWindow.used / monthlyWindow.limit) * 100;
        return `mcp: ${percentage.toFixed(1)}% used`;
    }
    const timeUntilReset = resetAt.getTime() - now.getTime();
    if (timeUntilReset <= 0)
        return "mcp: 0% (just reset)";
    const totalMonthMs = 30 * 24 * 60 * 60 * 1000;
    const timeElapsed = totalMonthMs - timeUntilReset;
    // Guard against negative or out-of-range timeElapsed
    const clampedTimeElapsed = Math.max(0, Math.min(timeElapsed, totalMonthMs));
    if (clampedTimeElapsed <= 0)
        return "mcp: 0% (just reset)";
    const expectedUsage = (clampedTimeElapsed / totalMonthMs) * monthlyWindow.limit;
    const actualUsage = monthlyWindow.used;
    const diff = actualUsage - expectedUsage;
    const diffPercentage = (diff / monthlyWindow.limit) * 100;
    if (Math.abs(diffPercentage) < 5) {
        return "mcp: ✓ on track";
    }
    else if (diff > 0) {
        return `mcp: ↑ ${diffPercentage.toFixed(1)}% ahead`;
    }
    else {
        return `mcp: ↓ ${Math.abs(diffPercentage).toFixed(1)}% behind`;
    }
}
export function getPaceColor(pace) {
    // "behind" is good (green), "ahead" is bad (red)
    if (pace.includes("✓"))
        return "green";
    if (pace.includes("↑"))
        return "red"; // ahead = using more than expected
    if (pace.includes("↓"))
        return "green"; // behind = using less than expected (good!)
    return "white";
}
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
