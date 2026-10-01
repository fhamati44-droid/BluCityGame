// Exercise real hub button handlers with React-style click events.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(path,req){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:m,exports:m.exports,require:req,Date,Math,Array,Set,JSON,Number,navigator:{vibrate(){}},window:{scrollTo(){}},localStorage:{getItem(){return '1';}}});return m.exports;}
const g=load('lib/levels.ts',require);let progress=g.parseLevelProgress(null),states=[],cursor=0,requests=[],dynamicIndex=0,walletMarkers=[];
const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>states[i]=v];},useEffect(){},useRef:v=>({current:v})};
const Hub=load('app/components/GameHub.tsx',n=>n==='react'?react:n.includes('progress-store')?{useProgress:()=>progress,useSyncStatus:()=> 'device',getSyncStatus:()=> 'device'}:n.includes('levels')?g:n==='next/image'||n==='./CoinPacks'?{default:()=>null}:n==='next/dynamic'?{default:()=>{const type=dynamicIndex++===0?'wallet-marker':'wardrobe-marker';return()=>({type,props:{}});}}:require(n)).default;
function render(){cursor=0;walletMarkers=[];const tree=Hub({lang:'en',name:'Guest',live:false,player:{level:1,charge:70,referrals:0},busy:false,chargeWait:0,onPlay:r=>requests.push(r),onShare(){},onCharge(){}});const buttons=[];function walk(v,hidden=false,keys=[]){if(Array.isArray(v))return v.forEach(c=>walk(c,hidden,keys));if(!v||typeof v!=='object')return;hidden=hidden||Boolean(v.props?.hidden);if(v.key)keys=[...keys,v.key];if(typeof v.type==='function')return walk(v.type(v.props),hidden,keys);if(v.type==='wallet-marker')walletMarkers.push({hidden,keys});if(v.type==='button')buttons.push(v);walk(v.props?.children,hidden,keys);}walk(tree);return buttons;}
function text(v){if(Array.isArray(v))return v.map(text).join('');if(v==null||typeof v==='boolean')return '';if(typeof v!=='object')return String(v);return text(v.props?.children);}
const event={type:'click',currentTarget:{},preventDefault(){}};
let buttons=render();buttons.find(b=>text(b).includes('ENTER THE CITY')).props.onClick(event);assert.equal(requests.at(-1).mode,'story');assert.equal(requests.at(-1).mission,1);
buttons.find(b=>text(b)==='Missions').props.onClick(event);
for(let id=1;id<=6;id++){
 buttons=render();const start=buttons.filter(b=>text(b).includes('ENTER THE CITY')&&!b.props.disabled);assert.equal(start.length,1);start[0].props.onClick(event);assert.equal(requests.at(-1).mode,'story');assert.equal(requests.at(-1).mission,id);
 const circuit=buttons.find(b=>text(b).includes('Energy circuit'));assert.equal(Boolean(circuit.props.disabled),id<=2);if(id>2){circuit.props.onClick(event);assert.equal(requests.at(-1).mode,'circuit');}
 for(let index=0;index<g.LEVELS[id-1].required;index++)progress=g.applyCommand(progress,{type:'collect',id,index});progress=g.applyCommand(progress,{type:'finish',id});
}
console.log('PASS: fresh guest home and missions 1–6 launch story; only circuit button launches circuit; click event never becomes game mode');

buttons=render();buttons.find(b=>text(b)==='BLU').props.onClick(event);render();assert.equal(walletMarkers.length,1);assert.equal(walletMarkers[0].hidden,false);assert.equal(walletMarkers[0].keys.length,0);buttons=render();buttons.find(b=>text(b)==='Home').props.onClick(event);render();assert.equal(walletMarkers.length,1);assert.equal(walletMarkers[0].hidden,true);assert.equal(walletMarkers[0].keys.length,0);
console.log('PASS: wallet is initialized lazily and retained outside tab remounts');
