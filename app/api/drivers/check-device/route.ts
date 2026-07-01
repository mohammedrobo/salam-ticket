import { NextResponse } from 'next/server';
import getSupabase from '@/lib/db';
import { isValidOffice } from '@/lib/offices';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id');
    const officeId = searchParams.get('office');

    if (!deviceId) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 });
    }

    if (!officeId || !isValidOffice(officeId)) {
      return NextResponse.json({ error: 'Invalid office' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('drivers')
      .select('id, name, status, scanned_at, break_started_at, driver_account_id')
      .eq('device_id', deviceId)
      .eq('office_id', officeId)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('check-device error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ registered: false });
    }

    // If driver is waiting, calculate their position
    if (data.status === 'waiting') {
      const { count: total } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'waiting');

      const { count: ahead } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'waiting')
        .lt('scanned_at', data.scanned_at);

      return NextResponse.json({
        registered: true,
        status: data.status,
        driver: data,
        position: (ahead ?? 0) + 1,
        total: total ?? 0,
      });
    }

    // If driver is on_break, calculate their position among waiting drivers
    if (data.status === 'on_break') {
      const { count: total } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'waiting');

      const { count: ahead } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'waiting')
        .lt('scanned_at', data.scanned_at);

      // Calculate break time remaining
      const breakStartedAt = data.break_started_at ? new Date(data.break_started_at).getTime() : 0;
      const breakDurationMs = 60 * 60 * 1000; // 1 hour
      const breakEndsAt = breakStartedAt + breakDurationMs;
      const now = Date.now();
      const breakRemainingMs = Math.max(0, breakEndsAt - now);

      return NextResponse.json({
        registered: true,
        status: data.status,
        driver: data,
        position: (ahead ?? 0) + 1,
        total: total ?? 0,
        break_started_at: data.break_started_at,
        break_remaining_ms: breakRemainingMs,
      });
    }

    return NextResponse.json({
      registered: true,
      status: data.status,
      driver: data,
    });
  } catch (err) {
    console.error('check-device exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
