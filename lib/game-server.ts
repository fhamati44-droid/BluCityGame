import {createClient} from '@supabase/supabase-js';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {NextRequest} from 'next/server';
import {verifyTelegram} from './telegram';
export function database(){const url=process.env.SUPABASE_URL?.trim(),key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw Error('SERVER_CONFIG_MISSING');return createClient(url,key,{auth:{persistSession:false}});}
export function sessionToken(id:string){const payload=Buffer.from(JSON.stringify({id,expires:Date.now()+30*86400000})).toString('base64url');return payload+'.'+createHmac('sha256',process.env.TELEGRAM_BOT_TOKEN!).update('blu-session:'+payload).digest('hex');}
export function identity(request:NextRequest,initData:unknown){const token=process.env.TELEGRAM_BOT_TOKEN?.trim();if(!token)return null;if(typeof initData==='string'&&initData){const verified=verifyTelegram(initData,token);return verified?{...verified,telegram:true}:null;}const cookie=request.cookies.get('blu_session')?.value;if(!cookie)return null;try{const[p,s]=cookie.split('.'),expected=createHmac('sha256',token).update('blu-session:'+p).digest('hex');if(!/^[a-f0-9]{64}$/.test(s)||!timingSafeEqual(Buffer.from(s,'hex'),Buffer.from(expected,'hex')))return null;const v=JSON.parse(Buffer.from(p,'base64url').toString());return /^\d{1,20}$/.test(v.id)&&v.expires>Date.now()?{id:v.id,name:'BLU',telegram:false}:null;}catch{return null;}}
export const newTicket=()=>randomBytes(32).toString('hex');
export const ticketHash=(s:string)=>createHmac('sha256',process.env.TELEGRAM_BOT_TOKEN!).update('blu-link:'+s).digest('hex');
