import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const drivers = db.prepare('SELECT * FROM drivers WHERE status = ?').all('waiting');
  return NextResponse.json(drivers);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  
  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const result = db.prepare('INSERT INTO drivers (name) VALUES (?)').run(name.trim());
  
  return NextResponse.json({ 
    id: result.lastInsertRowid, 
    name: name.trim(),
    status: 'waiting'
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  db.prepare('DELETE FROM drivers WHERE id = ?').run(id);
  
  return NextResponse.json({ success: true });
}