import {NextRequest,NextResponse} from 'next/server';
import {Address} from '@ton/ton';
import {identity} from '@/lib/game-server';
import {TON_TESTNET} from '@/lib/ton-config';
import {CHALLENGE_COOKIE,PROOF_COOKIE,walletChallenge,readWalletValue,sealWalletValue,verifiedWallet,verifyWalletProof} from '@/lib/wallet-proof';
export const runtime='nodejs';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/api/ton'};
export async function POST(request:NextRequest){try{
 if(request.headers.get('origin')!==request.nextUrl.origin)return reply({code:'INVALID_ORIGIN'},403);
 const body=await request.json();const who=identity(request,body?.initData);if(!who)return reply({code:'OPEN_TELEGRAM'},401);
 const domain=request.nextUrl.host;
 if(body.action==='status')return reply({verified:typeof body.address==='string'&&verifiedWallet(request.cookies.get(PROOF_COOKIE)?.value,who.id,domain,body.address)});
 if(body.action==='challenge'){
 const c=walletChallenge(who.id,domain),r=reply({payload:c.payload});r.cookies.set(CHALLENGE_COOKIE,c.cookie,{...options,maxAge:600});return r;
 }
 if(body.action==='verify'){
 const c=readWalletValue('challenge',request.cookies.get(CHALLENGE_COOKIE)?.value);
 if(!c||!verifyWalletProof(body,c,who.id,domain))return reply({code:'WALLET_PROOF_INVALID'},403);
 const address=Address.parse(body.address).toRawString();
 const r=reply({verified:true});r.cookies.set(PROOF_COOKIE,sealWalletValue('verified',{id:who.id,domain,network:TON_TESTNET,address,expires:Date.now()+86400000}),{...options,maxAge:86400});r.cookies.set(CHALLENGE_COOKIE,'',{...options,maxAge:0});return r;
 }
 return reply({code:'INVALID_REQUEST'},400);
 }catch{return reply({code:'INVALID_REQUEST'},400);}}
