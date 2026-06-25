import { NextResponse } from 'next/server';
import getSupabase from '@/lib/db';

export async function GET() {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('status', 'waiting')
      .order('scanned_at', { ascending: false });

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
    const { name } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('drivers')
      .insert({ name: name.trim() })
      .select('id, name, status')
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', parseInt(id));

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