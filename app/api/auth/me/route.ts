import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidOffice } from '@/lib/offices';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('office_session');

    if (!session || !isValidOffice(session.value)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, office: session.value });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
