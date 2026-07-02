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

    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, status, scanned_at, driver_account_id')
      .eq('device_id', deviceId)
      .eq('office_id', officeId)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (driverError) {
      console.error('position query error:', driverError);
      return NextResponse.json({ error: driverError.message }, { status: 500 });
    }

    if (!driver) {
      return NextResponse.json({ found: false });
    }

    if (driver.status === 'checked_out') {
      return NextResponse.json({
        found: true,
        status: 'checked_out',
        driver_account_id: driver.driver_account_id,
      });
    }

    if (driver.status === 'on_break') {
      const { count: total } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'waiting');

      return NextResponse.json({
        found: true,
        status: 'on_break',
        position: (total ?? 0) + 1,
        total: (total ?? 0) + 1,
        driver_account_id: driver.driver_account_id,
      });
    }

    const [{ count: total }, { count: ahead }] = await Promise.all([
      supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'waiting'),
      supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('office_id', officeId)
        .eq('status', 'waiting')
        .lt('scanned_at', driver.scanned_at),
    ]);

    return NextResponse.json({
      found: true,
      status: 'waiting',
      position: (ahead ?? 0) + 1,
      total: total ?? 0,
      driver_account_id: driver.driver_account_id,
    });
  } catch (err) {
    console.error('position exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
