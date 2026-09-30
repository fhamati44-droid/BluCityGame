import {createHash} from 'node:crypto';
import {Address,beginCell,external,internal,storeMessage,SendMode,TonClient,WalletContractV4,toNano} from '@ton/ton';
import {mnemonicToPrivateKey,mnemonicValidate} from '@ton/crypto';
import {database} from './game-server';
import {BLU_JETTON_MASTER} from './ton-config';

export const payoutQueryId=(id:string)=>BigInt('0x'+createHash('sha256').update('blu-testnet:'+id).digest('hex').slice(0,16));
export function transferBody(id:string,amount:number,destination:Address,treasury:Address){
 return beginCell().storeUint(0x0f8a7ea5,32).storeUint(payoutQueryId(id),64)
 .storeCoins(BigInt(amount)*BigInt(1000000000)).storeAddress(destination).storeAddress(treasury)
 .storeBit(false).storeCoins(toNano('0.01')).storeBit(false).endCell();
}

// One durable signed external message per reservation. Retries resend the same BOC,
// never create a replacement payment after a timeout or ambiguous chain response.
export async function processTestnetPayout(){
 if(process.env.BLU_TESTNET_PAYOUTS_ENABLED!=='true')return {status:'disabled'};
 const words=(process.env.BLU_TESTNET_TREASURY_MNEMONIC||'').trim().split(/\s+/);
 if(!await mnemonicValidate(words))throw Error('TREASURY_NOT_CONFIGURED');
 const keys=await mnemonicToPrivateKey(words),wallet=WalletContractV4.create({workchain:0,publicKey:keys.publicKey});
 const expected=Address.parse(process.env.BLU_TESTNET_TREASURY_ADDRESS||'');
 if(!wallet.address.equals(expected))throw Error('TREASURY_ADDRESS_MISMATCH');
 const client=new TonClient({endpoint:'https://testnet.toncenter.com/api/v2/jsonRPC',apiKey:process.env.TONCENTER_TESTNET_API_KEY,timeout:10000});
 const master=Address.parse(BLU_JETTON_MASTER),db=database();
 const jettonAddress=async(owner:Address)=>(await client.runMethod(master,'get_wallet_address',[{type:'slice',cell:beginCell().storeAddress(owner).endCell()}])).stack.readAddress();
 const treasuryJetton=await jettonAddress(wallet.address);
 const {data:row,error}=await db.rpc('blu_claim_testnet_payout');if(error)throw Error('PAYOUT_MIGRATION_REQUIRED');
 if(!row)return {status:'idle'};
 if(row.treasury&&row.treasury!==wallet.address.toRawString())throw Error('TREASURY_CHANGED');
 const destination=Address.parse(row.destination),query=payoutQueryId(row.id),recipientJetton=await jettonAddress(destination);
 // Confirmation requires the expected wallet's actual successful credit AND a
 // notification from that wallet to its owner with the same query ID and amount.
 const credit=await client.getContractState(recipientJetton);
 if(credit.state==='active'){
  const data=await client.runMethod(recipientJetton,'get_wallet_data');data.stack.readBigNumber();
  if(!data.stack.readAddress().equals(destination)||!data.stack.readAddress().equals(master))throw Error('INVALID_RECIPIENT_JETTON');
  for(const tx of await client.getTransactions(recipientJetton,{limit:100})){
   if(tx.description.type!=='generic'||tx.description.aborted||tx.description.computePhase.type!=='vm'||!tx.description.computePhase.success||tx.description.actionPhase&&tx.description.actionPhase.resultCode!==0)continue;
   const msg=tx.inMessage;if(msg?.info.type!=='internal'||msg.info.bounced||!msg.info.src.equals(treasuryJetton))continue;
   try{const body=msg.body.beginParse();if(body.loadUint(32)!==0x178d4519||body.loadUintBig(64)!==query||body.loadCoins()!==BigInt(row.amount)*BigInt(1000000000)||!body.loadAddress().equals(wallet.address))continue;
    const notification=tx.outMessages.values().some(out=>{try{if(out.info.type!=='internal'||!out.info.dest.equals(destination))return false;const s=out.body.beginParse();return s.loadUint(32)===0x7362d09c&&s.loadUintBig(64)===query&&s.loadCoins()===BigInt(row.amount)*BigInt(1000000000)&&s.loadAddress().equals(wallet.address);}catch{return false;}});
    if(!notification)continue;
    const {error:e}=await db.from('blu_testnet_withdrawals').update({status:'confirmed',tx_hash:tx.hash().toString('hex')}).eq('id',row.id).eq('status','processing');if(e)throw Error('CONFIRMATION_SAVE_FAILED');return {status:'confirmed',id:row.id};
   }catch(e){if(e instanceof Error&&e.message==='CONFIRMATION_SAVE_FAILED')throw e;}
  }
 }
 if(row.signed_boc){
  if(new Date(row.message_expires_at).getTime()<Date.now())return {status:'review-required',id:row.id};
  await client.sendFile(Buffer.from(row.signed_boc,'base64'));return {status:'processing',id:row.id};
 }
 const data=await client.runMethod(treasuryJetton,'get_wallet_data'),balance=data.stack.readBigNumber();
 if(!data.stack.readAddress().equals(wallet.address)||!data.stack.readAddress().equals(master))throw Error('INVALID_TREASURY_JETTON');
 if(balance<BigInt(row.amount)*BigInt(1000000000)||await client.getBalance(wallet.address)<toNano('0.15'))return {status:'funding-required',id:row.id};
 const open=client.open(wallet),seqno=await open.getSeqno(),timeout=Math.floor(Date.now()/1000)+600;
 const transfer=wallet.createTransfer({seqno,secretKey:keys.secretKey,timeout,sendMode:SendMode.PAY_GAS_SEPARATELY,messages:[internal({to:treasuryJetton,value:toNano('0.08'),body:transferBody(row.id,row.amount,destination,wallet.address)})]});
 const boc=beginCell().store(storeMessage(external({to:wallet.address,init:seqno===0?wallet.init:undefined,body:transfer}))).endCell().toBoc().toString('base64');
 const {data:saved,error:e}=await db.rpc('blu_save_testnet_message',{p_id:row.id,p_boc:boc,p_expires:new Date(timeout*1000).toISOString(),p_treasury:wallet.address.toRawString()});
 if(e||!saved)throw Error('SIGNATURE_SAVE_FAILED');
 await client.sendFile(Buffer.from(saved.signed_boc,'base64'));return {status:'processing',id:row.id};
}
