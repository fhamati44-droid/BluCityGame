import { Address } from '@ton/ton';
import { NextRequest, NextResponse } from 'next/server';
import { database, identity } from '@/lib/game-server';
import { BLU_JETTON_MASTER, TON_TESTNET } from '@/lib/ton-config';
import {PROOF_COOKIE,verifiedWallet} from '@/lib/wallet-proof';
export const runtime = 'nodejs';
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: NextRequest) {
  try {
    // Cookie-authenticated mutations must come from this application origin.
    const origin = request.headers.get('origin');
    if (!origin || origin !== request.nextUrl.origin) return reply({ code: 'INVALID_ORIGIN' }, 403);
    const body = await request.json();
    const who = identity(request, body.initData);
    if (!who) return reply({ code: 'OPEN_TELEGRAM' }, 401);
    const enabled = process.env.BLU_TESTNET_WITHDRAWALS_ENABLED === 'true';
    if (body.action === 'status') {
      if (!enabled) return reply({ enabled: false, requests: [] });
      const { data, error } = await database().from('blu_testnet_withdrawals').select('id,amount,status,tx_hash,created_at').eq('telegram_id', who.id).order('created_at', { ascending: false }).limit(10);
      return error ? reply({ code: 'MIGRATION_REQUIRED' }, 503) : reply({ enabled, requests: data });
    }
    if (!enabled) return reply({ code: 'WITHDRAWALS_NOT_CONFIGURED' }, 503);
    if (body.action !== 'request' || body.network !== TON_TESTNET || typeof body.address !== 'string' || body.address.length > 100 || !Number.isSafeInteger(body.amount) || body.amount < 1 || body.amount > 10 || typeof body.requestId !== 'string' || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(body.requestId)) return reply({ code: 'INVALID_REQUEST' }, 400);
    let address: Address;
    try {
      address = Address.parse(body.address);
      if (address.workChain !== 0 || address.equals(Address.parse(BLU_JETTON_MASTER))) throw Error();
      if (!body.address.includes(':') && !Address.parseFriendly(body.address).isTestOnly) throw Error();
    } catch { return reply({ code: 'INVALID_TESTNET_ADDRESS' }, 400); }
    if(!verifiedWallet(request.cookies.get(PROOF_COOKIE)?.value,who.id,request.nextUrl.host,address.toRawString()))return reply({code:'WALLET_PROOF_REQUIRED'},403);
    const { data, error } = await database().rpc('blu_request_testnet_withdrawal', { p_user: who.id, p_id: body.requestId, p_amount: body.amount, p_destination: address.toRawString() });
    if (error) {
      const code = ['INSUFFICIENT_BLU', 'DAILY_LIMIT', 'INVALID_REQUEST', 'PLAYER_NOT_READY'].includes(error.message) ? error.message : 'WITHDRAWAL_UNAVAILABLE';
      return reply({ code }, code === 'WITHDRAWAL_UNAVAILABLE' ? 503 : 409);
    }
    return reply(data);
  } catch { return reply({ code: 'INVALID_REQUEST' }, 400); }
}
