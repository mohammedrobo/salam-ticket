import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import getSupabase from '@/lib/db';
import { isValidOffice } from '@/lib/offices';

const BREAK_DURATION_MS = 60 * 60 * 1000; // 1 hour

async function getOfficeId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('office_session');
  if (!session || !isValidOffice(session.value)) return null;
  return session.value;
}

export async function POST(request: Request) {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driver_id } = await request.json();

    if (!driver_id) {
      return NextResponse.json({ error: 'driver_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify the driver exists and is in waiting status for this office
    const { data: driver, error: fetchError } = await supabase
      .from('drivers')
      .select('id, name, status, scanned_at')
      .eq('id', parseInt(driver_id))
      .eq('office_id', officeId)
      .single();

    if (fetchError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (driver.status !== 'waiting') {
      return NextResponse.json({ error: 'Driver is not in waiting status' }, { status: 400 });
    }

    // Set driver on break — keep scanned_at so they return to same position
    const breakStartedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('drivers')
      .update({
        status: 'on_break',
        break_started_at: breakStartedAt,
      })
      .eq('id', parseInt(driver_id))
      .eq('office_id', officeId);

    if (updateError) {
      console.error('Break update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      break_started_at: breakStartedAt,
      break_ends_at: new Date(Date.now() + BREAK_DURATION_MS).toISOString(),
      driver: {
        id: driver.id,
        name: driver.name,
        scanned_at: driver.scanned_at,
      },
    });
  } catch (err) {
    console.error('Break endpoint exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
