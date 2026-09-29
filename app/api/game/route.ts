import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTelegram } from '@/lib/telegram';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const initData = typeof body.initData === 'string' ? body.initData : '';
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const identity = token && verifyTelegram(initData,token);
    if (!identity) return NextResponse.json({error:'Unauthorized. Open the game in Telegram.'},{status:401});
    const action = body.action;
    if (!['open','charge','mission','upgrade','district'].includes(action)) return NextResponse.json({error:'Invalid action'},{status:400});
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({error:'Server is not configured'},{status:503});
    const db = createClient(url,key,{auth:{persistSession:false}});
    const {data,error} = await db.rpc('blu_game_action',{p_user_id:identity.id,p_name:identity.name,p_referrer:identity.referral ?? null,p_action:action});
    if (error) { console.error('game action failed',error.code); return NextResponse.json({error:'Game action failed'},{status:500}); }
    return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Invalid request'},{status:400}); }
}
