import {ITEMS,LEVELS,cityMissions,type GameCommand} from './levels';

// Accept only the command schema understood by the server. Never accept balances.
export function validGameCommand(value:unknown):value is GameCommand {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const c=value as Record<string,unknown>;
 if(typeof c.type!=='string')return false;
 const type=c.type;
 const fields:Record<string,string[]>={'mission-start':['id','position'],'mission-pickup':['id','index','position'],'mission-charge':['id','index','position'],'mission-escort':['id','position'],daily:[],exchange:[],dash:[],buy:['id'],equip:['id'],collect:['id','index','position'],finish:['id','position'],'run-start':[],'run-finish':['bolts'],'next-city':[]};
 if(!Object.hasOwn(fields,type))return false;
 if(Object.keys(c).some(k=>!['type','cityLevel',...fields[type]].includes(k)))return false;
 if(c.cityLevel!==undefined&&(!Number.isSafeInteger(c.cityLevel)||Number(c.cityLevel)<1||Number(c.cityLevel)>100))return false;
 if(c.position!==undefined){const p=c.position as Record<string,unknown>;if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='x,y,z'||![p.x,p.y,p.z].every(v=>typeof v==='number'&&Number.isFinite(v))||Number(p.x)<-17||Number(p.x)>32||Number(p.z)<-96||Number(p.z)>18||Number(p.y)<0||Number(p.y)>20)return false;}
 switch(c.type){
  case 'buy':return ITEMS.some(item=>item.id===c.id);
  case 'equip':return ['classic','neon','gold'].includes(String(c.id))&&typeof c.id==='string';
  case 'mission-start':case 'mission-pickup':case 'mission-charge':case 'mission-escort':case 'collect':case 'finish':{
   if(!Number.isSafeInteger(c.id)||Number(c.id)<1||Number(c.id)>6)return false;
   return ['finish','mission-start','mission-escort'].includes(c.type)||c.type==='mission-charge'&&c.index===undefined||Number.isSafeInteger(c.index)&&Number(c.index)>=0&&Number(c.index)<Math.max(...[1,2,3].map(city=>cityMissions(city)[Number(c.id)-1].required));
  }
  case 'run-finish':return Number.isSafeInteger(c.bolts)&&Number(c.bolts)>=20&&Number(c.bolts)<=200;
  default:return true;
 }
}
