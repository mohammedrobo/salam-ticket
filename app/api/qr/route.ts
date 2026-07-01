import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  
  const office = searchParams.get('office') || 'QCA2';
  
  let scanUrl: string;
  
  if (searchParams.get('url')) {
    scanUrl = searchParams.get('url')!;
  } else if (host) {
    scanUrl = `${protocol}://${host}/scan?office=${encodeURIComponent(office)}`;
  } else {
    scanUrl = `http://localhost:3000/scan?office=${encodeURIComponent(office)}`;
  }

  const svg = await QRCode.toString(scanUrl, {
    type: 'svg',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
