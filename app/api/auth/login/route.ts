import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticate } from '@/lib/offices';

export async function POST(request: Request) {
  try {
    const { office, password } = await request.json();

    if (!office || !password) {
      return NextResponse.json(
        { error: 'Office and password are required' },
        { status: 400 }
      );
    }

    const isValid = authenticate(office, password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid office or password' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('office_session', office.toUpperCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, office: office.toUpperCase() });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
