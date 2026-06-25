import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Get the actual domain from request headers
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  
  let scanUrl: string;
  
  if (searchParams.get('url')) {
    // Allow manual override
    scanUrl = searchParams.get('url')!;
  } else if (host) {
    // Auto-detect from request
    scanUrl = `${protocol}://${host}/scan`;
  } else {
    // Fallback for local development
    scanUrl = 'http://localhost:3000/scan';
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
      'Cache-Control': 'no-cache',
    },
  });
}