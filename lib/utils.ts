export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getPerformanceBadge(avgSeconds: number): { label: string; cls: string } | null {
  if (avgSeconds <= 0) return null;
  const mins = avgSeconds / 60;
  if (mins < 8) return { label: 'Fast', cls: 'driver-perf-fast' };
  if (mins < 15) return { label: 'Average', cls: 'driver-perf-medium' };
  return { label: 'Slow', cls: 'driver-perf-slow' };
}

export function buildHeatmapWeeks(
  dailyCounts: { date: string; count: number }[]
): { date: string; count: number; level: number }[][] {
  if (dailyCounts.length === 0) return [];

  const countMap = new Map(dailyCounts.map((d) => [d.date, d.count]));
  const maxCount = Math.max(1, ...dailyCounts.map((d) => d.count));

  const today = new Date();
  const totalDays = 84;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  const allDays: { date: string; count: number; level: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const count = countMap.get(dateStr) || 0;
    const level = count === 0 ? 0 : count <= maxCount * 0.25 ? 1 : count <= maxCount * 0.5 ? 2 : count <= maxCount * 0.75 ? 3 : 4;
    allDays.push({ date: dateStr, count, level });
  }

  const weeks: { date: string; count: number; level: number }[][] = [];
  let currentWeek: typeof allDays = [];

  const firstDayOfWeek = startDate.getDay();
  const padDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  for (let i = 0; i < padDays; i++) {
    currentWeek.push({ date: '', count: 0, level: -1 });
  }

  for (const day of allDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', count: 0, level: -1 });
    }
    weeks.push(currentWeek);
  }

  return weeks;
}
