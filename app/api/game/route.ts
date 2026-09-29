import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTelegram } from '@/lib/telegram';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
// Public setup check: returns only diagnostic codes, never credentials or user data.
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const url = process.env.SUPABASE_URL?.trim(), key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!token) return NextResponse.json({ code: 'BOT_TOKEN_MISSING' }, { status: 503, headers });
  if (!url || !key) return NextResponse.json({ code: 'SUPABASE_CONFIG_MISSING' }, { status: 503, headers });
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const bot = await response.json();
    if (!response.ok || !bot.ok) return NextResponse.json({ code: 'BOT_TOKEN_INVALID' }, { status: 503, headers });
    const expected = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'BluCityGame_bot').replace(/^@/, '').toLowerCase();
    if (String(bot.result?.username || '').toLowerCase() !== expected) return NextResponse.json({ code: 'BOT_TOKEN_WRONG_BOT' }, { status: 503, headers });
  } catch { return NextResponse.json({ code: 'TELEGRAM_UNREACHABLE' }, { status: 503, headers }); }
  try {
    const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) }) } });
    const { error } = await db.from('blu_players').select('telegram_id').limit(0);
    if (error) return NextResponse.json({ code: error.code === 'PGRST205' || error.code === '42P01' ? 'PLAYER_TABLE_MISSING' : 'SUPABASE_CONNECTION_FAILED' }, { status: 503, headers });
    return NextResponse.json({ code: 'SETUP_OK' }, { headers });
  } catch { return NextResponse.json({ code: 'SUPABASE_CONNECTION_FAILED' }, { status: 503, headers }); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) return NextResponse.json({error:'Bot token is missing',code:'BOT_TOKEN_MISSING'},{status:503});
    const identity = token && verifyTelegram(initData,token);
    if (!identity) return NextResponse.json({error:'Unauthorized. Open the game in Telegram.',code:'TELEGRAM_AUTH_FAILED'},{status:401});
    const action = body.action;
    if (!['open','charge','mission','upgrade','district'].includes(action)) return NextResponse.json({error:'Invalid action'},{status:400});
    const url = process.env.SUPABASE_URL?.trim(), key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) return NextResponse.json({error:'Server is not configured',code:'SUPABASE_CONFIG_MISSING'},{status:503});
    const db = createClient(url,key,{auth:{persistSession:false}});
    const {data,error} = await db.rpc('blu_game_action',{p_user_id:identity.id,p_name:identity.name,p_referrer:identity.referral ?? null,p_action:action});
    if (error) { console.error('game action failed',error.code); return NextResponse.json({error:'Game action failed',code:error.code === 'PGRST202' ? 'GAME_FUNCTION_MISSING' : 'SUPABASE_ACTION_FAILED'},{status:500}); }
    return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Invalid request'},{status:400}); }
}
