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
    const { name, office_id } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!office_id || !isValidOffice(office_id)) {
      return NextResponse.json({ error: 'Invalid office' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if driver is already in the queue for this office
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('name', name.trim())
      .eq('office_id', office_id)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'You are already in the queue. Wait for the manager to check you out.' },
        { status: 409 }
      );
    }
    
    const { data, error } = await supabase
      .from('drivers')
      .insert({ name: name.trim(), office_id })
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
      .delete()
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
