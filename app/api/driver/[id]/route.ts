import { NextResponse } from 'next/server';
import getSupabase from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // Fetch the driver account
    const { data: account, error: accountError } = await supabase
      .from('driver_accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Total deliveries
    const { count: totalDeliveries } = await supabase
      .from('delivery_history')
      .select('*', { count: 'exact', head: true })
      .eq('driver_account_id', id);

    // Deliveries this week (Monday-based)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const { count: weekDeliveries } = await supabase
      .from('delivery_history')
      .select('*', { count: 'exact', head: true })
      .eq('driver_account_id', id)
      .gte('completed_at', weekStart.toISOString());

    // Deliveries this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { count: monthDeliveries } = await supabase
      .from('delivery_history')
      .select('*', { count: 'exact', head: true })
      .eq('driver_account_id', id)
      .gte('completed_at', monthStart.toISOString());

    // Last delivery
    const { data: lastDelivery } = await supabase
      .from('delivery_history')
      .select('completed_at')
      .eq('driver_account_id', id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Recent deliveries (last 10)
    const { data: recentDeliveries } = await supabase
      .from('delivery_history')
      .select('*')
      .eq('driver_account_id', id)
      .order('completed_at', { ascending: false })
      .limit(10);

    // Daily counts for last 12 weeks (activity heatmap)
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const { data: allDeliveries } = await supabase
      .from('delivery_history')
      .select('completed_at')
      .eq('driver_account_id', id)
      .gte('completed_at', twelveWeeksAgo.toISOString());

    // Build daily counts map
    const dailyCounts: Record<string, number> = {};
    if (allDeliveries) {
      for (const d of allDeliveries) {
        const date = d.completed_at.split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      }
    }

    const dailyCountsArray = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      account,
      total_deliveries: totalDeliveries ?? 0,
      deliveries_this_week: weekDeliveries ?? 0,
      deliveries_this_month: monthDeliveries ?? 0,
      last_delivery: lastDelivery?.completed_at ?? null,
      recent_deliveries: recentDeliveries || [],
      daily_counts: dailyCountsArray,
    });
  } catch (err) {
    console.error('GET driver profile exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
