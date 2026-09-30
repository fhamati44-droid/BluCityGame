'use client';
import {useSyncExternalStore} from 'react';
import {applyCommand,parseLevelProgress,SAVE_KEY,type LevelProgress,type GameCommand} from './levels';
type Pending={id:string;command:GameCommand};
const empty=parseLevelProgress(null);
let state=empty,status='device',initialized=false,auth='',revision=0,key=SAVE_KEY,pending=0,authoritative=state;
let tail:Promise<void>=Promise.resolve(),outbox:Pending[]=[];const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>listeners.delete(fn);};
const notify=()=>listeners.forEach(fn=>fn());
const journal=()=>localStorage.setItem(key+'_outbox',JSON.stringify(outbox));
const save=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{status='storage-error';}notify();};
export const getProgress=()=>state;
export const getSyncStatus=()=>status;
export function useProgress(){return useSyncExternalStore(subscribe,getProgress,()=>empty);}
export function useSyncStatus(){return useSyncExternalStore(subscribe,getSyncStatus,()=> 'device');}
async function request(body:object){const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:auth,...body}),signal:AbortSignal.timeout(12000)});return{r,d:await r.json()};}
function queue(entry:Pending){pending++;status='saving';notify();tail=tail.then(async()=>{
 if(status==='sync-error')return;
 try{let{r,d}=await request({action:'command',revision,command:entry.command,commandId:entry.id});
 if(r.status===409&&Number.isInteger(d.revision)){revision=d.revision;({r,d}=await request({action:'command',revision,command:entry.command,commandId:entry.id}));}
 if(!r.ok)throw Error(d.code);revision=d.revision;authoritative=parseLevelProgress(JSON.stringify(d.progress));outbox=outbox.filter(e=>e.id!==entry.id);journal();
 }catch{status='sync-error';notify();}
 }).then(()=>{pending--;if(pending===0&&status!=='sync-error'){state=authoritative;status='cloud';save();}});}
export async function initializeProgress(initData=''){
 if(initialized)return;initialized=true;auth=initData;
 try{const id=initData?JSON.parse(new URLSearchParams(initData).get('user')||'{}').id:null;key=id?`blu_account_${id}`:SAVE_KEY;state=parseLevelProgress(localStorage.getItem(key)||localStorage.getItem(SAVE_KEY));}catch{}notify();
 try{const{r,d}=await request({action:'open'});if(!r.ok){status=d.code==='MIGRATION_REQUIRED'?'setup-required':auth?'offline':'device';notify();return;}
 const local=state;key=`blu_account_${d.account}`;revision=d.revision;state=parseLevelProgress(JSON.stringify(d.progress));authoritative=state;status='cloud';
 try{const saved=JSON.parse(localStorage.getItem(key+'_outbox')||'[]');outbox=Array.isArray(saved)?saved.filter(e=>typeof e.id==='string'&&e.command?.type):[];}catch{outbox=[];}save();
 for(const entry of outbox){state=applyCommand(state,entry.command);queue(entry);}save();
 // Import old mission checkpoints; never import an unverified wallet or purchased items.
 if(initData&&state.completed.length===0&&local.completed.length){for(const id of local.completed){for(let i=0;i<local.objectives[id].length;i++)dispatchProgress({type:'collect',id,index:i});dispatchProgress({type:'finish',id});}}
 }catch{status=auth?'offline':'device';notify();}
}
export function dispatchProgress(command:GameCommand):LevelProgress{
 if(status==='sync-error'||status==='storage-error'||status==='offline')return state;
 command={...command,cityLevel:command.cityLevel??state.cityLevel};
 const next=applyCommand(state,command);if(next===state)return state;
 if(status==='cloud'||status==='saving'){
 const entry={id:crypto.randomUUID(),command};outbox.push(entry);try{journal();}catch{outbox.pop();status='storage-error';notify();return state;}state=next;save();queue(entry);
 }else{const old=state;state=next;try{localStorage.setItem(key,JSON.stringify(state));}catch{state=old;status='storage-error';}notify();}
 return state;
}
export function checkpointProgress(snapshot:LevelProgress){for(const id of [1,2,3,4,5,6]){const flags=id===1?snapshot.cells:id===2?snapshot.metro:snapshot.objectives[id];flags?.forEach((v,i)=>{if(v&&!state.objectives[id]?.[i])dispatchProgress({type:'collect',id,index:i});});if((id===1?snapshot.completed.includes(1):id===2?snapshot.metroDone:snapshot.completed.includes(id as 1))&&!state.completed.includes(id as 1))dispatchProgress({type:'finish',id});}return state;}
export async function refreshProgress(){if(status==='device'||status==='setup-required')return;await tail;if(outbox.length){status='sync-error';notify();return;}try{const{r,d}=await request({action:'open'});if(r.ok){revision=d.revision;state=parseLevelProgress(JSON.stringify(d.progress));status='cloud';save();}else{status='sync-error';notify();}}catch{status='sync-error';notify();}}
export async function createBrowserLink(){const{r,d}=await request({action:'link'});if(!r.ok)throw Error(d.code);return `${location.origin}/?connect=${d.ticket}`;}
