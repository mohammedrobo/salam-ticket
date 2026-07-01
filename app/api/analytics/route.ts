import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getSupabase from '@/lib/db';
import { isValidOffice } from '@/lib/offices';

async function getOfficeId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('office_session');
  if (!session || !isValidOffice(session.value)) return null;
  return session.value;
}

export async function GET(request: Request) {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
        periodStart = new Date(2020, 0, 1);
        break;
      case 'week':
      default:
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - mondayOffset);
        periodStart.setHours(0, 0, 0, 0);
        break;
    }

    // --- All deliveries for this office (period-scoped) ---
    const { data: periodData } = await supabase
      .from('delivery_history')
      .select('driver_account_id, completed_at, duration_seconds, scanned_at')
      .eq('office_id', officeId)
      .gte('completed_at', periodStart.toISOString());

    // --- All independent queries (no dependency on periodData) ---
    const trendDays = 14;
    const trendStart = new Date(now);
    trendStart.setDate(trendStart.getDate() - (trendDays - 1));
    trendStart.setHours(0, 0, 0, 0);

    let prevStart: Date | undefined;
    let prevEnd: Date | undefined;
    if (period !== 'all') {
      switch (period) {
        case 'month': {
          prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        }
        case 'week':
        default: {
          prevStart = new Date(periodStart);
          prevStart.setDate(prevStart.getDate() - 7);
          prevEnd = new Date(periodStart);
          prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
          break;
        }
      }
    }

    const driverIds = [...new Set((periodData || []).map((d) => d.driver_account_id))];

    // --- Dependent + independent queries in parallel ---
    const [
      { data: allTimeData },
      { data: driverAccounts },
      { data: trendData },
      { data: recentInactiveData },
      { data: prevData },
    ] = await Promise.all([
      driverIds.length > 0
        ? supabase
            .from('delivery_history')
            .select('driver_account_id, completed_at, duration_seconds')
            .eq('office_id', officeId)
            .in('driver_account_id', driverIds)
        : Promise.resolve({ data: [] as { driver_account_id: string; completed_at: string; duration_seconds: number }[] }),
      driverIds.length > 0
        ? supabase
            .from('driver_accounts')
            .select('id, full_name, phone, created_at')
            .in('id', driverIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string; created_at: string }[] }),
      supabase
        .from('delivery_history')
        .select('completed_at')
        .eq('office_id', officeId)
        .gte('completed_at', trendStart.toISOString()),
      supabase
        .from('delivery_history')
        .select('driver_account_id, completed_at')
        .eq('office_id', officeId)
        .lt('completed_at', periodStart.toISOString())
        .order('completed_at', { ascending: false }),
      prevStart && prevEnd
        ? supabase
            .from('delivery_history')
            .select('duration_seconds')
            .eq('office_id', officeId)
            .gte('completed_at', prevStart.toISOString())
            .lte('completed_at', prevEnd.toISOString())
        : Promise.resolve({ data: null }),
    ]);

    // --- Compute per-driver stats ---
    const driverMap: Record<string, {
      count: number;
      totalDuration: number;
      lastDelivery: string;
      firstDelivery: string;
    }> = {};

    for (const row of periodData || []) {
      const did = row.driver_account_id;
      if (!driverMap[did]) {
        driverMap[did] = { count: 0, totalDuration: 0, lastDelivery: row.completed_at, firstDelivery: row.completed_at };
      }
      driverMap[did].count++;
      driverMap[did].totalDuration += row.duration_seconds || 0;
      if (row.completed_at > driverMap[did].lastDelivery) driverMap[did].lastDelivery = row.completed_at;
      if (row.completed_at < driverMap[did].firstDelivery) driverMap[did].firstDelivery = row.completed_at;
    }

    // All-time counts
    const allTimeCounts: Record<string, number> = {};
    const allTimeDurations: Record<string, number> = {};
    for (const row of allTimeData || []) {
      allTimeCounts[row.driver_account_id] = (allTimeCounts[row.driver_account_id] || 0) + 1;
      allTimeDurations[row.driver_account_id] = (allTimeDurations[row.driver_account_id] || 0) + (row.duration_seconds || 0);
    }

    // Build driver rows
    const drivers = (driverAccounts || []).map((account) => {
      const stats = driverMap[account.id];
      return {
        account,
        period_deliveries: stats?.count || 0,
        total_deliveries: allTimeCounts[account.id] || 0,
        avg_duration_seconds: stats ? Math.round(stats.totalDuration / stats.count) : 0,
        avg_duration_all_time: allTimeCounts[account.id]
          ? Math.round((allTimeDurations[account.id] || 0) / allTimeCounts[account.id])
          : 0,
        last_delivery: stats?.lastDelivery || null,
        first_delivery: stats?.firstDelivery || null,
      };
    });

    drivers.sort((a, b) => b.period_deliveries - a.period_deliveries);

    // --- Daily trend (last 14 days) ---
    const dailyTrend: { date: string; count: number }[] = [];
    const dailyMap: Record<string, number> = {};
    for (const row of trendData || []) {
      const date = row.completed_at.split('T')[0];
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    }
    const cursor = new Date(trendStart);
    for (let i = 0; i < trendDays; i++) {
      const dateStr = cursor.toISOString().split('T')[0];
      dailyTrend.push({ date: dateStr, count: dailyMap[dateStr] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // --- Top 5 drivers (period) ---
    const topDrivers = drivers.slice(0, 5).map((d) => ({
      name: d.account.full_name,
      id: d.account.id,
      deliveries: d.period_deliveries,
    }));

    // --- Inactive drivers (had deliveries before but none this period) ---
    const activeDriverIds = new Set(driverIds);

    const inactiveMap: Record<string, string> = {};
    if (recentInactiveData) {
      for (const row of recentInactiveData) {
        if (!activeDriverIds.has(row.driver_account_id) && !inactiveMap[row.driver_account_id]) {
          inactiveMap[row.driver_account_id] = row.completed_at;
        }
      }
    }

    const inactiveIds = Object.keys(inactiveMap).slice(0, 10);
    let inactiveDrivers: { name: string; id: string; last_seen: string }[] = [];
    if (inactiveIds.length > 0) {
      const { data: inactiveAccounts } = await supabase
        .from('driver_accounts')
        .select('id, full_name')
        .in('id', inactiveIds);
      if (inactiveAccounts) {
        inactiveDrivers = inactiveAccounts.map((a) => ({
          name: a.full_name,
          id: a.id,
          last_seen: inactiveMap[a.id],
        }));
      }
    }

    // --- First-time drivers (created in this period) ---
    const firstTimers = drivers.filter((d) => {
      const created = new Date(d.account.created_at);
      return created >= periodStart && d.period_deliveries > 0;
    }).length;

    // --- Summary ---
    const totalDeliveries = periodDeliveries(periodData);
    const uniqueDrivers = driverIds.length;
    const avgPerDriver = uniqueDrivers > 0 ? Math.round(totalDeliveries / uniqueDrivers) : 0;
    const avgDuration = (periodData || []).length > 0
      ? Math.round((periodData || []).reduce((sum, d) => sum + (d.duration_seconds || 0), 0) / (periodData || []).length)
      : 0;

    // Busiest day in trend
    const busiestDay = dailyTrend.reduce((max, d) => d.count > max.count ? d : max, dailyTrend[0] || { date: '', count: 0 });

    // --- Speed distribution (fast < 8min, medium 8-15min, slow > 15min) ---
    let fast = 0, medium = 0, slow = 0;
    for (const row of periodData || []) {
      const mins = (row.duration_seconds || 0) / 60;
      if (mins < 8) fast++;
      else if (mins < 15) medium++;
      else slow++;
    }

    // --- Previous period comparison (from parallelized query) ---
    let prev_period_deliveries = 0;
    let prev_avg_duration = 0;
    if (prevData) {
      prev_period_deliveries = prevData.length;
      if (prevData.length > 0) {
        prev_avg_duration = Math.round(prevData.reduce((s, d) => s + (d.duration_seconds || 0), 0) / prevData.length);
      }
    }

    return NextResponse.json({
      summary: {
        total_drivers: uniqueDrivers,
        period_deliveries: totalDeliveries,
        avg_per_driver: avgPerDriver,
        avg_duration: avgDuration,
        first_timers: firstTimers,
        busiest_day: busiestDay,
        prev_period_deliveries: prev_period_deliveries,
        prev_avg_duration: prev_avg_duration,
        speed_fast: fast,
        speed_medium: medium,
        speed_slow: slow,
      },
      daily_trend: dailyTrend,
      top_drivers: topDrivers,
      inactive_drivers: inactiveDrivers,
      drivers,
    });
  } catch (err) {
    console.error('GET analytics exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function periodDeliveries(data: { driver_account_id: string }[] | null): number {
  return data?.length || 0;
}
