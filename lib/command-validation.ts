import {ITEMS,LEVELS,type GameCommand} from './levels';

// Accept only the command schema understood by the server. Never accept balances.
export function validGameCommand(value:unknown):value is GameCommand {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const c=value as Record<string,unknown>;
 if(typeof c.type!=='string')return false;
 const type=c.type;
 const fields:Record<string,string[]>={daily:[],exchange:[],dash:[],buy:['id'],equip:['id'],collect:['id','index'],finish:['id'],'run-start':[],'run-finish':['bolts'],'next-city':[]};
 if(!Object.hasOwn(fields,type))return false;
 if(Object.keys(c).some(k=>!['type','cityLevel',...fields[type]].includes(k)))return false;
 if(c.cityLevel!==undefined&&(!Number.isSafeInteger(c.cityLevel)||Number(c.cityLevel)<1||Number(c.cityLevel)>100))return false;
 switch(c.type){
  case 'buy':return ITEMS.some(item=>item.id===c.id);
  case 'equip':return ['classic','neon','gold'].includes(String(c.id))&&typeof c.id==='string';
  case 'collect':case 'finish':{
   if(!Number.isSafeInteger(c.id)||Number(c.id)<1||Number(c.id)>6)return false;
   return c.type==='finish'||Number.isSafeInteger(c.index)&&Number(c.index)>=0&&Number(c.index)<LEVELS[Number(c.id)-1].required;
  }
  case 'run-finish':return Number.isSafeInteger(c.bolts)&&Number(c.bolts)>=20&&Number(c.bolts)<=200;
  default:return true;
 }
}
