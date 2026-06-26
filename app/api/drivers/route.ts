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

export async function GET() {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('office_id', officeId)
      .eq('status', 'waiting')
      .order('scanned_at', { ascending: true });

    if (error) {
      console.error('GET drivers error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('GET drivers exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, office_id, device_id } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!office_id || !isValidOffice(office_id)) {
      return NextResponse.json({ error: 'Invalid office' }, { status: 400 });
    }

    if (!device_id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Cleanup old checked_out records (older than 24h)
    await supabase
      .from('drivers')
      .delete()
      .eq('status', 'checked_out')
      .lt('scanned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Check if this device is already registered for this office
    const { data: existingDevice } = await supabase
      .from('drivers')
      .select('id, name, status')
      .eq('device_id', device_id)
      .eq('office_id', office_id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDevice) {
      // Device already registered — check if name matches
      if (existingDevice.name.toLowerCase() !== name.trim().toLowerCase()) {
        return NextResponse.json(
          { error: 'device_mismatch', registered_name: existingDevice.name },
          { status: 409 }
        );
      }

      // Same name — if still waiting, reject (already in queue)
      if (existingDevice.status === 'waiting') {
        return NextResponse.json(
          { error: 'already_in_queue', driver: existingDevice },
          { status: 409 }
        );
      }

      // Was checked out — re-join: update status back to waiting
      const { data, error } = await supabase
        .from('drivers')
        .update({ status: 'waiting' })
        .eq('id', existingDevice.id)
        .select('id, name, status, office_id')
        .single();

      if (error) {
        console.error('POST driver re-join error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data, { status: 200 });
    }

    // New device — check if name is already in queue (different device, same name)
    const { data: existingName } = await supabase
      .from('drivers')
      .select('id')
      .eq('name', name.trim())
      .eq('office_id', office_id)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existingName) {
      return NextResponse.json(
        { error: 'You are already in the queue. Wait for the manager to check you out.' },
        { status: 409 }
      );
    }
    
    const { data, error } = await supabase
      .from('drivers')
      .insert({ name: name.trim(), office_id, device_id })
      .select('id, name, status, office_id')
      .single();

    if (error) {
      console.error('POST driver error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST driver exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const officeId = await getOfficeId();
    if (!officeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('drivers')
      .update({ status: 'checked_out' })
      .eq('id', parseInt(id))
      .eq('office_id', officeId);

    if (error) {
      console.error('DELETE driver error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE driver exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
