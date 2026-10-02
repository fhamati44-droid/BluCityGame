// Durable per-player write limits. Persisted with the save under its revision lock.
// This limits command flooding; it does not prove movement or prevent timed bots.
export const COMMAND_WINDOW_MS=60000,COMMAND_LIMIT=60;
export const BURST_WINDOW_MS=1000,BURST_LIMIT=8;
export const REWARD_INTERVAL_MS=2000;
type Window={started:number;count:number};
export type ProgressRate={minute:Window;burst:Window;lastRewardAt?:number};
function window(value:unknown,now:number,duration:number):Window{
 const v=value as Window|undefined;
 return v&&Number.isSafeInteger(v.started)&&Number.isSafeInteger(v.count)&&v.count>=0&&v.started<=now&&now-v.started<duration?{started:v.started,count:v.count}:{started:now,count:0};
}
export function progressRateLimit(raw:unknown,now=Date.now(),reward=false):{allowed:boolean;retryAfterMs:number;rate:ProgressRate}{
 const old=raw as ProgressRate|undefined;
 const minute=window(old?.minute,now,COMMAND_WINDOW_MS),burst=window(old?.burst,now,BURST_WINDOW_MS);
 const lastRewardAt=Number.isSafeInteger(old?.lastRewardAt)&&old!.lastRewardAt!<=now?old!.lastRewardAt:undefined;
 const retryAfterMs=Math.max(minute.count>=COMMAND_LIMIT?minute.started+COMMAND_WINDOW_MS-now:0,burst.count>=BURST_LIMIT?burst.started+BURST_WINDOW_MS-now:0,reward&&lastRewardAt!==undefined?lastRewardAt+REWARD_INTERVAL_MS-now:0);
 return{allowed:retryAfterMs===0,retryAfterMs,rate:{minute:{...minute,count:minute.count+1},burst:{...burst,count:burst.count+1},...(reward?{lastRewardAt:now}:lastRewardAt!==undefined?{lastRewardAt}:{})}};
}
