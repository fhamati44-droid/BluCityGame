import {NextRequest,NextResponse} from 'next/server';
import {applyCommand,parseLevelProgress,type GameCommand} from '@/lib/levels';
import {database,identity,newTicket,ticketHash,sessionToken} from '@/lib/game-server';
export const runtime='nodejs';
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){try{
 const body=await request.json();const who=identity(request,body.initData);const db=database();
 if(body.action==='connect'){
 if(typeof body.ticket!=='string'||!/^[a-f0-9]{64}$/.test(body.ticket))return reply({code:'INVALID_LINK'},400);
 const {data,error}=await db.rpc('blu_consume_link',{p_hash:ticketHash(body.ticket)});if(error||!data)return reply({code:'LINK_EXPIRED'},401);
 const r=reply({ok:true});r.cookies.set('blu_session',sessionToken(String(data)),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:30*86400,path:'/'});return r;
 }
 if(!who)return reply({code:'OPEN_TELEGRAM'},401);
 if(body.action==='link'){
 const ticket=newTicket();const {error}=await db.from('blu_browser_links').insert({ticket_hash:ticketHash(ticket),telegram_id:who.id,expires_at:new Date(Date.now()+10*60000).toISOString()});return error?reply({code:'MIGRATION_REQUIRED'},503):reply({ticket});
 }
 const {data:row,error}=await db.from('blu_players').select('city_save,city_revision,sparks').eq('telegram_id',who.id).maybeSingle();
 if(error)return reply({code:error.code==='42703'||error.code==='PGRST204'?'MIGRATION_REQUIRED':'SAVE_UNAVAILABLE'},503);
 if(!row)return reply({code:'PLAYER_NOT_READY'},409);
 const progress= row.city_save?parseLevelProgress(JSON.stringify(row.city_save)):parseLevelProgress(null);
 const revision=row.city_revision||0;
 if(body.action==='open')return reply({progress,revision,account:who.id,paymentsReady:!!process.env.TELEGRAM_WEBHOOK_SECRET&&process.env.BLU_PAYMENTS_ENABLED==='true'});
 if(body.action!=='command'||!body.command||typeof body.command.type!=='string')return reply({code:'INVALID_COMMAND'},400);
 if(body.revision!==revision)return reply({code:'CONFLICT',progress,revision},409);
 const command=body.command as GameCommand;const next=applyCommand(progress,command);if(next===progress)return reply({progress,revision,account:who.id});
 const {data:updated,error:saveError}=await db.from('blu_players').update({city_save:next,city_revision:revision+1}).eq('telegram_id',who.id).eq('city_revision',revision).select('city_revision').maybeSingle();
 if(saveError)return reply({code:'SAVE_UNAVAILABLE'},503);if(!updated)return reply({code:'CONFLICT',...(await load(db,who.id))},409);
 return reply({progress:next,revision:revision+1,account:who.id});
 }catch{return reply({code:'INVALID_REQUEST'},400);}}
async function load(db:ReturnType<typeof database>,id:string){const{data}=await db.from('blu_players').select('city_save,city_revision').eq('telegram_id',id).single();return{progress:data?.city_save,revision:data?.city_revision};}
