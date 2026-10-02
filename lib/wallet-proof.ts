import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {Address,Cell,loadStateInit,WalletContractV3R2,WalletContractV4,WalletContractV5R1} from '@ton/ton';
import {signVerify} from '@ton/crypto';
import {TON_TESTNET} from './ton-config';

export const CHALLENGE_COOKIE='blu_wallet_challenge',PROOF_COOKIE='blu_wallet_proof';
type Claims={id:string;domain:string;network:string;expires:number;nonce?:string;address?:string};
const hash=(b:Buffer)=>createHash('sha256').update(b).digest();
function secret(){const token=process.env.TELEGRAM_BOT_TOKEN?.trim();if(!token)throw Error('SERVER_CONFIG_MISSING');return token;}
export function sealWalletValue(kind:'challenge'|'verified',claims:Claims){const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');return payload+'.'+createHmac('sha256',secret()).update(`blu-wallet-${kind}:`+payload).digest('hex');}
export function readWalletValue(kind:'challenge'|'verified',value:string|undefined,now=Date.now()):Claims|null{
 try{
 if(!value||value.length>2048)return null;
 const parts=value.split('.');if(parts.length!==2||!/^[a-f0-9]{64}$/.test(parts[1]))return null;
 const expected=createHmac('sha256',secret()).update(`blu-wallet-${kind}:`+parts[0]).digest();
 if(!timingSafeEqual(expected,Buffer.from(parts[1],'hex')))return null;
 const c=JSON.parse(Buffer.from(parts[0],'base64url').toString());
 return typeof c.id==='string'&&typeof c.domain==='string'&&c.network===TON_TESTNET&&Number.isSafeInteger(c.expires)&&c.expires>now?c:null;
 }catch{return null;}
}
export function walletChallenge(id:string,domain:string,now=Date.now()){
 const claims={id,domain,network:TON_TESTNET,nonce:randomBytes(32).toString('hex'),expires:now+600000};
 return{payload:claims.nonce,cookie:sealWalletValue('challenge',claims)};
}
export function verifiedWallet(value:string|undefined,id:string,domain:string,address?:string){
 const c=readWalletValue('verified',value);
 if(!c||c.id!==id||c.domain!==domain||!c.address)return false;
 try{return !address||Address.parse(address).toRawString()===c.address;}catch{return false;}
}
// Public keys are extracted only from known wallet code and address-matching StateInit.
export function walletPublicKey(address:string,stateInit:string){
 if(typeof stateInit!=='string'||stateInit.length>20000)throw Error('INVALID_PROOF');
 const roots=Cell.fromBoc(Buffer.from(stateInit,'base64'));if(roots.length!==1)throw Error('INVALID_PROOF');
 const a=Address.parse(address);if(a.workChain!==0||!roots[0].hash().equals(a.hash))throw Error('INVALID_PROOF');
 const init=loadStateInit(roots[0].beginParse());if(!init.code||!init.data)throw Error('INVALID_PROOF');
 const zero=Buffer.alloc(32),known=[WalletContractV3R2.create({workchain:0,publicKey:zero}),WalletContractV4.create({workchain:0,publicKey:zero}),WalletContractV5R1.create({workchain:0,publicKey:zero})];
 const version=known.findIndex(w=>w.init.code.hash().equals(init.code!.hash()));if(version<0)throw Error('UNSUPPORTED_WALLET');
 const data=init.data.beginParse();if(version===2&&!data.loadBit())throw Error('INVALID_PROOF');data.skip(64);return data.loadBuffer(32);
}
export function proofMessage(address:string,domain:string,timestamp:number,payload:string){
 const a=Address.parse(address),wc=Buffer.alloc(4),length=Buffer.alloc(4),time=Buffer.alloc(8),d=Buffer.from(domain);
 wc.writeInt32BE(a.workChain);length.writeUInt32LE(d.length);time.writeBigUInt64LE(BigInt(timestamp));
 const message=Buffer.concat([Buffer.from('ton-proof-item-v2/'),wc,a.hash,length,d,time,Buffer.from(payload)]);
 return hash(Buffer.concat([Buffer.from([255,255]),Buffer.from('ton-connect'),hash(message)]));
}
export function verifyWalletProof(input:unknown,challenge:Claims,id:string,domain:string,now=Date.now()){
 try{
 const b=input as {address:string;network:string;walletStateInit:string;publicKey?:string;proof:{timestamp:number|string;domain:{value:string;lengthBytes:number};payload:string;signature:string}};
 if(!b||b.network!==TON_TESTNET||challenge.id!==id||challenge.domain!==domain||challenge.expires<=now||!challenge.nonce)return false;
 const p=b.proof;if(!p)return false;
 if(typeof p.timestamp!=='number'&&(typeof p.timestamp!=='string'||!/^\d{1,16}$/.test(p.timestamp)))return false;
 const timestamp=Number(p.timestamp);
 if(p.payload!==challenge.nonce||p.domain?.value!==domain||p.domain.lengthBytes!==Buffer.byteLength(domain)||!Number.isSafeInteger(timestamp)||timestamp>now/1000+30||timestamp<now/1000-600)return false;
 if(typeof p.signature!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(p.signature))return false;
 const key=walletPublicKey(b.address,b.walletStateInit);
 if(b.publicKey!==undefined&&(typeof b.publicKey!=='string'||!/^[a-f\d]{64}$/i.test(b.publicKey)||!Buffer.from(b.publicKey,'hex').equals(key)))return false;
 return signVerify(proofMessage(b.address,domain,timestamp,p.payload),Buffer.from(p.signature,'base64'),key);
 }catch{return false;}
}
