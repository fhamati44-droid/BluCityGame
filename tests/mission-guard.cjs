const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require:n=>n.includes("i18n")?require("./i18n-helper.cjs"):mocks[n]||require(n),Date,Math,Set,Array,Number,Object,JSON});return module.exports;}
const g=load('lib/levels.ts'),guard=load('lib/mission-guard.ts',{'./levels':g}),validation=load('lib/command-validation.ts',{'./levels':g});
let p=g.parseLevelProgress(null),session,now=100000;
const send=(c,advance=4000)=>{now+=advance;c={...c,cityLevel:p.cityLevel};const r=guard.guardMission(session,p,c,now);if(!r.code){session=r.session;p=g.applyCommand(p,c,now);}return r;};
const invalid=c=>{const before=JSON.stringify({p,session});assert.equal(send(c).code,'MISSION_INVALID');assert.equal(JSON.stringify({p,session}),before,'Rejected event never changes state');};
invalid({type:'collect',id:1,index:0,position:guard.MISSION_POINTS[1][0]});
assert.equal(validation.validGameCommand({type:'collect',id:1,index:0,position:{x:NaN,y:0,z:0}}),false);
assert.equal(validation.validGameCommand({type:'finish',id:1,position:{x:0,y:0,z:-35,balance:900}}),false);
for(const mission of g.LEVELS){
 assert.ok(!send({type:'mission-start',id:mission.id,position:{x:0,y:0,z:10}}).code);
 const tooFast=send({type:mission.id===3?'mission-pickup':mission.id===6?'mission-charge':'collect',id:mission.id,index:0,position:guard.MISSION_POINTS[mission.id][0]},0);assert.equal(tooFast.code,'MISSION_WAIT');
 invalid({type:'finish',id:mission.id,position:guard.MISSION_TERMINALS[mission.id]});

 for(let index=0;index<mission.required;index++){
  const position=guard.MISSION_POINTS[mission.id][index];
  if(mission.id===3){invalid({type:'collect',id:3,index,position:guard.MISSION_TERMINALS[3]});assert.ok(!send({type:'mission-pickup',id:3,index,position}).code);invalid({type:'collect',id:3,index:(index+1)%3,position:guard.MISSION_TERMINALS[3]});}
  if(mission.id===4)invalid({type:'collect',id:4,index,position:{...position,y:0}});
  if(mission.id===6){invalid({type:'collect',id:6,index,position});assert.ok(!send({type:'mission-charge',id:6,index,position}).code);assert.equal(send({type:'collect',id:6,index,position},0).code,'MISSION_WAIT');}
  assert.ok(!send({type:'collect',id:mission.id,index,position:mission.id===3?guard.MISSION_TERMINALS[3]:position}).code);
 }
 if(mission.id===5){invalid({type:'mission-charge',id:5,position:guard.MISSION_TERMINALS[5]});assert.ok(!send({type:'mission-escort',id:5,position:guard.MISSION_POINTS[5][1]}).code);}
 assert.ok(!send({type:'mission-charge',id:mission.id,position:guard.MISSION_TERMINALS[mission.id]}).code);
 assert.equal(send({type:'finish',id:mission.id,position:guard.MISSION_TERMINALS[mission.id]},0).code,'MISSION_WAIT');
 assert.ok(!send({type:'finish',id:mission.id,position:guard.MISSION_TERMINALS[mission.id]}).code);
 if(mission.id===1)assert.ok(!send({type:'mission-start',id:2,position:{x:-9,y:0,z:-50}}).code,'Continue after walking away from the previous terminal');
 const coins=p.coins;invalid({type:'finish',id:mission.id,position:guard.MISSION_TERMINALS[mission.id]});assert.equal(p.coins,coins);
}
assert.equal(p.coins,1230);
const oldSession=session;p=g.applyCommand(p,{type:'next-city'});session=oldSession;invalid({type:'collect',id:1,index:0,position:guard.MISSION_POINTS[1][0]});
console.log('PASS: six server mission sessions, movement timing, delivery pickup, roof height, escort prerequisite, node/terminal charging, no repeated rewards and old-city rejection');
for(const cityLevel of [1,2,3]){
 p={...g.parseLevelProgress(null),cityLevel};session=undefined;
 const point=a=>({x:a[0],y:a[1],z:a[2]});
 for(const mission of g.cityMissions(cityLevel)){
  assert.ok(!send({type:'mission-start',id:mission.id,position:{x:0,y:0,z:10}},10000).code);
  for(let index=0;index<mission.required;index++){
   const position=point(mission.points[index]);
   if(mission.id===3)assert.ok(!send({type:'mission-pickup',id:3,index,position},10000).code);
   if(mission.id===6)assert.ok(!send({type:'mission-charge',id:6,index,position},10000).code);
   assert.equal(validation.validGameCommand({type:'collect',id:mission.id,index,position}),true);
   assert.ok(!send({type:'collect',id:mission.id,index,position:mission.id===3?point(mission.terminal):position},10000).code);
  }
  if(mission.id===5)assert.ok(!send({type:'mission-escort',id:5,position:point(mission.points.at(-1))},10000).code);
  assert.ok(!send({type:'mission-charge',id:mission.id,position:point(mission.terminal)},10000).code);
  assert.ok(!send({type:'finish',id:mission.id,position:point(mission.terminal)},10000).code);
  const coins=p.coins;invalid({type:'finish',id:mission.id,position:point(mission.terminal)});assert.equal(p.coins,coins);
 }
 assert.equal(p.coins,1230);
 if(cityLevel===3)assert.equal(g.applyCommand(p,{type:'next-city'}),p,'Completed campaign cannot mint endless city rewards');
}
const legacy=g.parseLevelProgress(JSON.stringify({...p,cityLevel:9,coins:9000,blu:12,inventory:['shoes'],skin:'classic'}));
assert.equal(legacy.cityLevel,3);assert.equal(legacy.coins,9000);assert.equal(legacy.blu,12);assert.ok(legacy.inventory.includes('shoes'));assert.equal(legacy.completed.length,6);
console.log('PASS: all 18 server-validated missions, varying requirements, exact-once rewards, final-city cap and legacy balance preservation');
