import {unlockedLevel,cityScale,cityMissions,type GameCommand,type LevelProgress,type MissionPosition} from './levels';
const points=(items:number[][]):MissionPosition[]=>items.map(([x,y,z])=>({x,y,z}));
// Compatibility aliases for the neighborhood; live validation uses the current city's definition.
export const MISSION_POINTS:Record<number,MissionPosition[]> = Object.fromEntries(cityMissions(1).map(m=>[m.id,points(m.points)]));
export const MISSION_TERMINALS:Record<number,MissionPosition> = Object.fromEntries(cityMissions(1).map(m=>[m.id,points([m.terminal])[0]]));
type Session={city:number;id:number;started:number;at:number;position:MissionPosition;carrying?:number;escortAt?:number;charge?:{index:number;at:number}};
const distance=(a:MissionPosition,b:MissionPosition)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const invalid=()=>({code:'MISSION_INVALID',retryAfterMs:0,session:undefined});
// These are server-owned event/timing checks, not authoritative physics. A client
// can still fabricate plausible positions and wait; that requires further work.
export function guardMission(raw:unknown,p:LevelProgress,c:GameCommand,now=Date.now()){
 const id=Number(c.id),position=c.position;
 if(!['mission-start','mission-pickup','mission-charge','mission-escort','collect','finish'].includes(c.type))return {session:c.type==='next-city'?undefined:raw};
 if(c.cityLevel!==p.cityLevel||id!==unlockedLevel(p)||p.completed.includes(id)||!position)return invalid();
 if(c.type==='mission-start'){
  const previous=raw as Session|undefined;
  if(distance(position,{x:0,y:0,z:10})>1){
   if(!previous||previous.city!==p.cityLevel||previous.id!==id-1||!p.completed.includes(previous.id as 1))return invalid();
   const travel=Math.hypot(position.x-previous.position.x,position.z-previous.position.z)*cityScale(p.cityLevel);
   const wait=Math.ceil(Math.max(0,travel-2)/24*1000-(now-previous.at));
   if(wait>0)return {code:'MISSION_WAIT',retryAfterMs:Math.min(wait,60000),session:previous};
  }
  return {session:{city:p.cityLevel,id,started:now,at:now,position} as Session};
 }
 const s=raw as Session|undefined;
 if(!s||s.city!==p.cityLevel||s.id!==id||!Number.isSafeInteger(s.at)||s.at>now||now-s.started>86400000)return invalid();
 // Generous ceiling above the scene's fastest dash, scaled to world coordinates.
 const travel=Math.hypot(position.x-s.position.x,position.z-s.position.z)*cityScale(p.cityLevel);
 const wait=Math.ceil(Math.max(0,travel-2)/24*1000-(now-s.at));
 if(wait>0)return {code:'MISSION_WAIT',retryAfterMs:Math.min(wait,60000),session:s};
 const next:Session={...s,position,at:now};
 const mission=cityMissions(p.cityLevel)[id-1];
 const index=c.index??-1,coords=mission.points[index],target=coords?{x:coords[0],y:coords[1],z:coords[2]}:undefined,terminal={x:mission.terminal[0],y:mission.terminal[1],z:mission.terminal[2]};
 const terminalDistance=id<=2?Math.hypot(position.x-terminal.x,position.z-terminal.z):distance(position,terminal);
 if(c.type==='mission-pickup'){
  if(id!==3||!target||p.objectives[id][index]||s.carrying!==undefined||distance(position,target)>2)return invalid();
  next.carrying=index;next.charge=undefined;
 }else if(c.type==='mission-escort'){
  if(id!==5||!p.objectives[id].every(Boolean)||distance(position,(()=>{const point=cityMissions(p.cityLevel)[4].points.at(-1)!;return {x:point[0],y:point[1],z:point[2]};})())>4)return invalid();
  next.escortAt=now;
 }else if(c.type==='mission-charge'){
  const node=id===6&&index>=0;
  if(node?(!target||p.objectives[id][index]||distance(position,target)>2):(!p.objectives[id].every(Boolean)||terminalDistance>4.3))return invalid();
  if(id===5&&!s.escortAt)return invalid();
  next.charge={index:node?index:-1,at:now};
 }else if(c.type==='collect'){
  if(!target||p.objectives[id][index])return invalid();
  if(id===3){if(s.carrying!==index||distance(position,terminal)>2.1)return invalid();delete next.carrying;}
  else if(id<=2){if(Math.hypot(position.x-target.x,position.z-target.z)>2||id===1&&position.y>=3.5)return invalid();}
  else if(distance(position,target)>2)return invalid();
  if(id===6){if(s.charge?.index!==index)return invalid();const delay=1000-(now-s.charge.at);if(delay>0)return {code:'MISSION_WAIT',retryAfterMs:delay,session:s};}
  delete next.charge;
 }else{
  if(!p.objectives[id].every(Boolean)||terminalDistance>4.3||s.charge?.index!==-1)return invalid();
  const delay=1000-(now-s.charge.at);
  if(delay>0)return {code:'MISSION_WAIT',retryAfterMs:delay,session:s};
  if(id===5&&(!s.escortAt||now-s.escortAt<1000))return invalid();
  delete next.charge;return {session:next};
 }
 return {session:next};
}
