import { Address, beginCell, TonClient } from '@ton/ton';
import { NextRequest, NextResponse } from 'next/server';
import { BLU_JETTON_MASTER, formatBluUnits } from '@/lib/ton-config';
export const runtime = 'nodejs';
export const maxDuration = 60;
type RpcError = {response?: {status?: number}; code?: string; message?: string};
export function balanceFailure(error: unknown): string {
  const e=error as RpcError;
  if(e?.response?.status===429)return 'BALANCE_RPC_RATE_LIMIT';
  if(e?.response?.status===401||e?.response?.status===403)return 'BALANCE_RPC_AUTH_FAILED';
  if(e?.code==='ECONNABORTED'||e?.code==='ETIMEDOUT')return 'BALANCE_RPC_TIMEOUT';
  if(e?.message==='INVALID_JETTON')return 'BALANCE_TOKEN_MISMATCH';
  return 'BALANCE_UNAVAILABLE';
}
async function readRpc<T>(read:()=>Promise<T>):Promise<T>{
  try{return await read();}catch(error){
    const code=balanceFailure(error);
    if(code!=='BALANCE_RPC_RATE_LIMIT')throw error;
    await new Promise(resolve=>setTimeout(resolve,1200));
    return read();
  }
}
export async function GET(request: NextRequest) {
  let owner: Address;
  try {
    const input = request.nextUrl.searchParams.get('address') || '';
    if (input.length > 100) throw Error();
    owner = Address.parse(input);
    if (owner.workChain !== 0) throw Error();
  } catch { return NextResponse.json({ code: 'INVALID_ADDRESS' }, { status: 400 }); }
  try {
    const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC', apiKey: process.env.TONCENTER_TESTNET_API_KEY, timeout: 15000 });
    const master = Address.parse(BLU_JETTON_MASTER);
    const result = await readRpc(()=>client.runMethod(master, 'get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }]));
    const jettonWallet = result.stack.readAddress();
    const contract = await readRpc(()=>client.getContractState(jettonWallet));
    let units = '0';
    if (contract.state === 'active') {
      const data = await readRpc(()=>client.runMethod(jettonWallet, 'get_wallet_data'));
      units = data.stack.readBigNumber().toString();
      if (!data.stack.readAddress().equals(owner) || !data.stack.readAddress().equals(master)) throw Error('INVALID_JETTON');
    }
    return NextResponse.json({ balance: formatBluUnits(units), units, master: BLU_JETTON_MASTER, network: 'testnet' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch(error) { const code=balanceFailure(error); console.warn('BLU balance read failed:',code); return NextResponse.json({ code }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
