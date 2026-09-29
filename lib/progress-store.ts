'use client';
import { useSyncExternalStore } from 'react';
import { applyCommand, parseLevelProgress, SAVE_KEY, type LevelProgress, type GameCommand } from './levels';
let state=parseLevelProgress(null),status='device',initialized=false,auth='',revision=0,key=SAVE_KEY;
let tail:Promise<void>=Promise.resolve();const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(fn=>fn());
const save=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{status='storage-error';}notify();};
export function getProgress(){return state;}
export function getSyncStatus(){return status;}
export function useProgress(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},getProgress,()=>empty);}
const empty=parseLevelProgress(null);
export async function initializeProgress(initData=''){
 if(initialized)return;initialized=true;auth=initData;
 try{const id=initData?JSON.parse(new URLSearchParams(initData).get('user')||'{}').id:null;const accountKey=id?`blu_account_${id}`:SAVE_KEY;key=accountKey;state=parseLevelProgress(localStorage.getItem(accountKey)||localStorage.getItem(SAVE_KEY));}catch{}notify();
 try{const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:auth,action:'open'}),signal:AbortSignal.timeout(12000)});const d=await r.json();if(!r.ok){status=d.code==='MIGRATION_REQUIRED'?'setup-required':'device';notify();return;}
 const local=state;key=`blu_account_${d.account}`;revision=d.revision;state=parseLevelProgress(JSON.stringify(d.progress));status='cloud';try{localStorage.setItem('blu_active_account',String(d.account));}catch{}save();
 // Migrate objectives from this Telegram device only. Never trust a client-provided wallet.
 if(initData&&state.completed.length===0&&local.completed.length){for(const l of local.completed){for(let i=0;i<local.objectives[l].length;i++)dispatchProgress({type:'collect',id:l,index:i});dispatchProgress({type:'finish',id:l});}}
 }catch{status=auth?'offline':'device';notify();}
}
export function dispatchProgress(command:GameCommand):LevelProgress {
 if(status==='sync-error')return state;
 const next=applyCommand(state,command);if(next===state)return state;state=next;save();
 if(status==='cloud'||status==='saving'){
 status='saving';notify();tail=tail.then(async()=>{
 try{let r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:auth,action:'command',revision,command}),signal:AbortSignal.timeout(12000)});let d=await r.json();
 if(r.status===409){revision=d.revision;r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:auth,action:'command',revision,command})});d=await r.json();}
 if(!r.ok)throw Error(d.code);revision=d.revision;
 // Queued commands are displayed optimistically; install authoritative state after queue drains.
 authoritative=parseLevelProgress(JSON.stringify(d.progress));
 }catch{status='sync-error';notify();}
 }).then(()=>{pending--;if(pending===0&&status!=='sync-error'){state=authoritative;status='cloud';save();}});pending++;
 }
 return state;
}
let pending=0,authoritative=state;
export function checkpointProgress(snapshot:LevelProgress){const current=state;for(const l of [1,2,3,4,5,6]){const flags=l===1?snapshot.cells:l===2?snapshot.metro:snapshot.objectives[l];flags?.forEach((v,i)=>{if(v&&!getProgress().objectives[l]?.[i])dispatchProgress({type:'collect',id:l,index:i});});if((l===1?snapshot.restored:l===2?snapshot.metroDone:snapshot.completed.includes(l as 1))&&!current.completed.includes(l as 1))dispatchProgress({type:'finish',id:l});}return state;}
export async function refreshProgress(){if(status==='device'||status==='setup-required')return;await tail;try{const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:auth,action:'open'})});const d=await r.json();if(r.ok){revision=d.revision;state=parseLevelProgress(JSON.stringify(d.progress));status='cloud';save();}}catch{status='sync-error';notify();}}
export async function createBrowserLink(){const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:auth,action:'link'})});const d=await r.json();if(!r.ok)throw Error(d.code);return `${location.origin}/?connect=${d.ticket}`;}
