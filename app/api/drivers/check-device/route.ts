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
      .select('id, name, status, scanned_at')
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
