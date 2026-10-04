import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {database,identity} from '@/lib/game-server';
export const runtime='nodejs';
const bucket='blu-metrics';
let ready:Promise<void>|undefined;
async function storage(){const db=database();if(!ready)ready=(async()=>{const {data,error}=await db.storage.getBucket(bucket);if(error||!data){const created=await db.storage.createBucket(bucket,{public:false,fileSizeLimit:1024,allowedMimeTypes:['application/json']});if(created.error){const check=await db.storage.getBucket(bucket);if(check.error)throw Error('METRICS_STORAGE_UNAVAILABLE');if(check.data?.public)throw Error('METRICS_BUCKET_MUST_BE_PRIVATE');}}else if(data.public)throw Error('METRICS_BUCKET_MUST_BE_PRIVATE');})().catch(e=>{ready=undefined;throw e;});await ready;return db.storage.from(bucket);}
const reply=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:NextRequest){try{
 if(req.headers.get('origin')!==req.nextUrl.origin)return reply({code:'INVALID_ORIGIN'},403);
 const raw=await req.text();if(raw.length>12000)return reply({code:'TOO_LARGE'},413);const body=JSON.parse(raw),who=identity(req,body.initData);
 if(body.action==='report'){
  if(!who||!(process.env.BLU_ANALYTICS_ADMIN_IDS||'660174909').split(',').map(x=>x.trim()).includes(who.id))return reply({code:'FORBIDDEN'},403);
  const store=await storage(),days=[];let capped=false;
  for(let offset=0;offset<7;offset++){
   const date=new Date(Date.now()-offset*86400000).toISOString().slice(0,10),items=[];
   for(let page=0;page<5;page++){const r=await store.list(date,{limit:1000,offset:page*1000});if(r.error)throw Error('REPORT_UNAVAILABLE');items.push(...r.data);if(r.data.length<1000)break;if(page===4)capped=true;}
   days.push({date,events:items.filter(x=>x.name.endsWith('.json')).map(x=>{const [event,visitor,source,session,city,mission]=x.name.replace('.json','').split('--');return {event,visitor,source,session,city:Number(city),mission:Number(mission)};})});
  }
  return reply({days,capped,note:'Device/account estimates; client activity is not proof of reward eligibility. Max 5000 events per day in this report.'});
 }
 const {event,source,session,device,city=0,mission=0}=body;
 if(typeof device!=='string'||!/^[a-f0-9-]{36}$/.test(device))return reply({code:'INVALID_DEVICE'},400);
 if(!['visit','ready','play','mission_complete','share','error'].includes(event)||typeof source!=='string'||!/^[a-z0-9_]{1,48}$/.test(source)||typeof session!=='string'||!/^[a-f0-9-]{36}$/.test(session)||!Number.isInteger(city)||city<0||city>20||!Number.isInteger(mission)||mission<0||mission>6)return reply({code:'INVALID_EVENT'},400);
 const secret=process.env.TELEGRAM_BOT_TOKEN;if(!secret)throw Error('CONFIG');
 const visitor=createHmac('sha256',secret).update('metrics:'+ (who?'account:'+who.id:'device:'+device)).digest('hex').slice(0,24);
 const date=new Date().toISOString().slice(0,10),file=`${date}/${event}--${visitor}--${source}--${session}--${city}--${mission}.json`;
 const store=await storage(),result=await store.upload(file,JSON.stringify({v:1}),{contentType:'application/json',upsert:false});
 if(result.error&&String(result.error.statusCode)!=='409')throw Error('WRITE_FAILED');
 return reply({ok:true});
 }catch{return reply({code:'METRICS_UNAVAILABLE'},503);}}
