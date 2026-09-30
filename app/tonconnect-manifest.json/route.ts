import { NextRequest, NextResponse } from 'next/server';
export function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || request.nextUrl.origin;
  return NextResponse.json({ url: origin, name: 'BLU City · Testnet', iconUrl: `${origin}/ton-icon.png` }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' } });
}
