import {timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {processTestnetPayout} from '@/lib/testnet-payout';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET,header=request.headers.get('authorization')||'',expected=`Bearer ${secret}`;
 const received=Buffer.from(header),wanted=Buffer.from(expected);
 if(!secret||received.length!==wanted.length||!timingSafeEqual(received,wanted))return NextResponse.json({code:'UNAUTHORIZED'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{return NextResponse.json(await processTestnetPayout(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({code:'PAYOUT_UNAVAILABLE'},{status:503});}
}
