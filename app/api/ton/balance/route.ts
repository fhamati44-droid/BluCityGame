import { Address, beginCell, TonClient } from '@ton/ton';
import { NextRequest, NextResponse } from 'next/server';
import { BLU_JETTON_MASTER, formatBluUnits } from '@/lib/ton-config';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  let owner: Address;
  try {
    const input = request.nextUrl.searchParams.get('address') || '';
    if (input.length > 100) throw Error();
    owner = Address.parse(input);
    if (owner.workChain !== 0) throw Error();
  } catch { return NextResponse.json({ code: 'INVALID_ADDRESS' }, { status: 400 }); }
  try {
    const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC', apiKey: process.env.TONCENTER_TESTNET_API_KEY, timeout: 10000 });
    const master = Address.parse(BLU_JETTON_MASTER);
    const result = await client.runMethod(master, 'get_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(owner).endCell() }]);
    const jettonWallet = result.stack.readAddress();
    const contract = await client.getContractState(jettonWallet);
    let units = '0';
    if (contract.state === 'active') {
      const data = await client.runMethod(jettonWallet, 'get_wallet_data');
      units = data.stack.readBigNumber().toString();
      if (!data.stack.readAddress().equals(owner) || !data.stack.readAddress().equals(master)) throw Error('INVALID_JETTON');
    }
    return NextResponse.json({ balance: formatBluUnits(units), units, master: BLU_JETTON_MASTER, network: 'testnet' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ code: 'BALANCE_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
