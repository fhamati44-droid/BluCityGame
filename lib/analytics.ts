'use client';
type Event='visit'|'ready'|'play'|'mission_complete'|'share'|'error';
let device='',session='',source='direct',auth='',sent=new Set<string>();
export function startAnalytics(initData=''){
 try{
 auth=initData;if(!session)session=crypto.randomUUID();
 try{device=localStorage.getItem('blu_metrics_device')||crypto.randomUUID();localStorage.setItem('blu_metrics_device',device);}catch{device=crypto.randomUUID();}
 const query=new URLSearchParams(location.search),start=new URLSearchParams(initData).get('start_param')||query.get('tgWebAppStartParam')||'';
 source=(start.startsWith('cmp_')?start.slice(4):start.startsWith('ref_')?'referral':query.get('utm_source')||'direct').toLowerCase().replace(/[^a-z0-9_]/g,'_').slice(0,48)||'direct';
 track('visit');
 }catch{/* Measurement must never interrupt the game. */}
}
export function track(event:Event,city=0,mission=0){
 if(!session)return;
 const key=`${event}:${city}:${mission}`;if(sent.has(key))return;sent.add(key);
 try{void fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({event,city,mission,session,source,device,initData:auth})}).then(r=>{if(!r.ok)sent.delete(key);}).catch(()=>sent.delete(key));}catch{sent.delete(key);}
}
