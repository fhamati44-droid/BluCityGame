// CPU scene integration: real Three geometry/mission loop, mocked GPU and input.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict'),THREE=require('three');
function load(file,req,globals={}){const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;const mod={exports:{}};vm.runInNewContext(out,{exports:mod.exports,module:mod,require:req,...globals});return mod.exports;}
const g=load('lib/levels.ts',n=>n.includes('i18n')?require('./i18n-helper.cjs'):require(n),{Date,Math,Array,Set,JSON,Number});let progress=g.parseLevelProgress(null),hud,effects=[],refs=[],clock=0,frame;
const element=()=>({getContext:()=>null,style:{},classList:{remove(){},add(){}},append(){},remove(){},addEventListener(){},offsetWidth:1,clientWidth:390,clientHeight:844});
const react={useRef(v){const ref={current:v===null?element():v};refs.push(ref);return ref;},useState(v){return[v,next=>{if(next&&typeof next==='object'&&'level'in next)hud=next;}];},useEffect(fn){effects.push(fn);}};
class Renderer{constructor(){this.domElement=element();}setPixelRatio(){}setSize(){}render(){}dispose(){}}
class Rig{constructor(){this.root=new THREE.Group();}update(){}setEnergy(){}setEquipment(){}jump(){}land(){}dispose(){}}
let rejectFinish=false;
const store={useWalletTesting:()=>false,setMissionPosition(){},getProgress:()=>progress,getSyncStatus:()=> 'device',dispatchProgress:c=>(progress=rejectFinish&&c.type==='finish'?progress:g.applyCommand(progress,c,clock)),checkpointProgress:s=>{for(const l of g.LEVELS){const flags=l.id===1?s.cells:l.id===2?s.metro:s.objectives[l.id];flags.forEach((v,i)=>{if(v)progress=g.applyCommand(progress,{type:'collect',id:l.id,index:i},clock);});if(l.id===1?s.restored:l.id===2?s.metroDone:s.completed.includes(l.id))progress=g.applyCommand(progress,{type:'finish',id:l.id},clock);}return progress;}};
let source=fs.readFileSync('app/components/PlayableCity.tsx','utf8');source=source.replace('const key = new Set<string>();','globalThis.sceneTest={state,input:input.current,camera,worldScale,blu,cameraBlockers};const key = new Set<string>();');
const out=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;const mod={exports:{}};const ctx={exports:mod.exports,module:mod,require:n=>n.includes("i18n")?require("./i18n-helper.cjs"):n==='react'?react:n==='three'?new Proxy(THREE,{get:(o,k)=>k==='WebGLRenderer'?Renderer:k==='TextureLoader'?class{load(){}}:o[k]}):n==='./CityRender'?load('app/components/CityRender.ts',require):n==='./HeritageStreet'?load('app/components/HeritageStreet.ts',require):n==='./BluRig'?{BluRig:Rig,toon:c=>new THREE.MeshToonMaterial({color:c})}:n.includes('progress-store')?store:n.includes('levels')?g:n.includes('sponsors')?load('lib/sponsors.ts',require):require(n),document:{hidden:false,createElement:element},window:{addEventListener(){},removeEventListener(){}},navigator:{vibrate(){}},localStorage:{getItem(){return null;}},performance:{now:()=>clock},devicePixelRatio:1,ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}disconnect(){}},requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){},Date,Math,Array,Set,JSON,Number};vm.createContext(ctx);vm.runInContext(out,ctx);mod.exports.default({lang:'en',onMenu(){},onReward(){},serverRestored:false});effects[0]();const scene=ctx.sceneTest;
const tick=(n=1)=>{for(let i=0;i<n;i++){clock+=40;frame();}};scene.input.start=true;tick();
// Keep the character inside the unobstructed center of portrait screens.
for(const [x,z,y] of [[-35,-20,0],[35,-20,0],[0,-50,7]]){
 scene.state.pos.set(x,y,z);scene.state.vy=0;tick(20);
 scene.camera.updateMatrixWorld();
 const projected=new THREE.Vector3(scene.state.pos.x*scene.worldScale,scene.state.pos.y+1,scene.state.pos.z*scene.worldScale).project(scene.camera);
 assert.ok(Math.abs(projected.x)<.6 && Math.abs(projected.y)<.6,'BLU must stay centered at side streets and roof height');
}
const visit=(x,z,y=0)=>{scene.state.pos.set(x,y,z);scene.state.vy=0;tick(2);};
for(const[x,z]of[[-11,-8],[12,-23],[-4,-43]])visit(x,z);assert.equal(hud.cells,3);visit(0,-35);scene.input.charge=true;tick(50);scene.input.charge=false;assert.equal(progress.completed.length,1);assert.equal(progress.coins,100);
scene.input.next=true;tick();for(const[x,z]of[[-13,-44],[11,-49]])visit(x,z);visit(-9,-50);scene.input.charge=true;tick(50);scene.input.charge=false;assert.equal(progress.completed.length,2);
scene.input.next=true;tick();
// Walk mission 3 from the metro exit, rather than teleporting through scenery.
const walkTo=(x,z)=>{for(let n=0;n<1500;n++){const dx=x-scene.state.pos.x,dz=z-scene.state.pos.z;if(Math.hypot(dx,dz)<.35)break;scene.input.x=Math.abs(dx)>.2?Math.sign(dx):0;scene.input.y=Math.abs(dz)>.2?Math.sign(dz):0;tick();}scene.input.x=scene.input.y=0;tick(5);assert.ok(Math.hypot(x-scene.state.pos.x,z-scene.state.pos.z)<1,'Reach mission target using movement');};
walkTo(17,-49);for(const[x,z]of[[17,-42],[17,-25],[17,-16]]){const before=progress.objectives[3].filter(Boolean).length;walkTo(x,z);assert.equal(progress.objectives[3].filter(Boolean).length,before,"Pickup alone is not delivery");assert.equal(hud.carrying,true);walkTo(17,-31);assert.equal(progress.objectives[3].filter(Boolean).length,before+1);}assert.equal(hud.extraGot,3);walkTo(17,-31);assert.equal(hud.nearby,true);rejectFinish=true;scene.input.charge=true;tick(50);assert.equal(hud.levelDone,false);assert.equal(hud.celebrating,false,'Rejected completion must not display victory');rejectFinish=false;tick(50);scene.input.charge=false;assert.equal(progress.completed.length,3);assert.ok(hud.completed.includes(3),'Pause status includes mission 3');

scene.input.next=true;tick();visit(8,-10);scene.input.y=-1;for(let n=0;n<180&&scene.state.pos.z>-40;n++)tick();scene.input.y=0;tick(5);assert.ok(scene.state.pos.z < -38,'Rooftop route can be walked with actual input');assert.equal(hud.extraGot,3);scene.input.x=-1;tick(11);scene.input.x=0;tick(5);assert.ok(scene.state.pos.y>=2.9,'Can reach roof terminal without teleporting');scene.input.charge=true;tick(50);scene.input.charge=false;assert.equal(progress.completed.length,4);
scene.input.next=true;tick();walkTo(17,-41);walkTo(14,-47);walkTo(29,-50);assert.equal(hud.escortReady,false,"Escort cannot finish while robot is at pickup");walkTo(24,-52);tick(100);scene.input.charge=true;tick(50);scene.input.charge=false;assert.equal(progress.completed.length,5);
scene.input.next=true;tick();walkTo(24,-60);walkTo(-8,-60);for(const[x,z]of[[-8,-73],[12,-79],[27,-89]]){walkTo(x,z);tick(5);assert.equal(hud.nodeReady,true);const before=progress.objectives[6].filter(Boolean).length;assert.equal(hud.extraGot,before,"Power nodes require charge, not proximity");scene.input.charge=true;tick(50);scene.input.charge=false;assert.equal(progress.objectives[6].filter(Boolean).length,before+1);}walkTo(12,-63);scene.input.charge=true;tick(50);scene.input.charge=false;assert.equal(progress.completed.length,6);assert.equal(progress.coins,1230);scene.input.next=true;tick();assert.equal(progress.cityLevel,2);assert.equal(progress.completed.length,0);
console.log('PASS: actual scene loop completes missions 1–6 with correct checkpoints/rewards, roof collectibles, escort and next transitions');

const actualRig=load('app/components/BluRig.ts',require,{document:{createElement:()=>({getContext:()=>null})}}).BluRig;
const rig=new actualRig();rig.setEquipment({skin:'gold',inventory:['shoes','gloves','battery','gold']});const colors=new Set();rig.root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&o.material.color)colors.add(o.material.color.getHex());});assert.ok(colors.has(0xffc84a));assert.ok(colors.has(0xff664f));assert.ok(colors.has(0xffcf45));rig.dispose();console.log('PASS: purchased skin, shoes and gloves color actual character mesh materials');

// Run mode must finish even when the story is waiting for the escort mission.
progress=g.parseLevelProgress(null);for(const id of [1,2,3,4]){for(let index=0;index<g.LEVELS[id-1].required;index++)progress=g.applyCommand(progress,{type:'collect',id,index},clock);progress=g.applyCommand(progress,{type:'finish',id},clock);}
clock=Math.max(clock,60001);effects=[];refs=[];mod.exports.default({lang:'en',onMenu(){},onReward(){},serverRestored:false,challenge:true});effects[0]();const run=ctx.sceneTest;run.input.start=true;tick();run.state.bolts=25;tick(550);run.state.pos.set(0,0,-50);run.state.vy=0;tick(5);assert.equal(hud.nearby,true);run.input.charge=true;tick(50);run.input.charge=false;assert.equal(hud.runDone,true);assert.equal(progress.runs,1);assert.equal(progress.completed.join(','),'1,2,3,4');assert.equal(progress.coins,690);tick(100);assert.equal(progress.runs,1);console.log('PASS: energy circuit awards once without completing or depending on escort mission');

let previewEffects=[],previewGpu=0;const previewReact={useRef:()=>({current:element()}),useState:v=>[v,()=>{}],useEffect:fn=>previewEffects.push(fn)};
const Preview=load('app/components/WardrobePreview.tsx',n=>n.includes('i18n')?require('./i18n-helper.cjs'):n==='react'?previewReact:n==='three'?new Proxy(THREE,{get:(o,k)=>k==='WebGLRenderer'?class{constructor(){previewGpu++;throw Error('GPU unavailable');}}:o[k]}):n==='./BluRig'?{BluRig:Rig}:n.includes('progress-store')?store:require(n),{window:{matchMedia:()=>({matches:true})}}).default;const preview=Preview();assert.equal(preview.props.children[0].type,'img');assert.equal(previewGpu,0,'Touch devices must not create a wardrobe WebGL context');console.log('PASS: mobile wardrobe avoids a second GPU context');

// The city grows, but the character and chase distance stay human sized.
for(const cityLevel of [1,4,9]){
 progress={...g.parseLevelProgress(null),cityLevel};effects=[];refs=[];
 mod.exports.default({lang:'en',onMenu(){},onReward(){},serverRestored:false});effects[0]();
 const current=ctx.sceneTest;current.input.start=true;tick();current.state.pos.set(12,0,-35);tick(30);
 current.camera.updateMatrixWorld();
 const center=new THREE.Vector3(12*current.worldScale,1,-35*current.worldScale).project(current.camera);
 const top=new THREE.Vector3(12*current.worldScale,2,-35*current.worldScale).project(current.camera);
 const bottom=new THREE.Vector3(12*current.worldScale,0,-35*current.worldScale).project(current.camera);
 assert.ok(Math.abs(center.x)<.15&&Math.abs(center.y)<.35,'Scaled cities must track the actual world position');
 assert.ok(Math.abs(top.y-bottom.y)>.25,'BLU must remain large enough on portrait screens');
}
console.log('PASS: world-space camera tracks cities 1, 4 and 9 with consistent visible character size');
// Exercise real touch handlers: story movement, jump, slide, dash and interruption.
effects=[];refs=[];progress=g.parseLevelProgress(null);
vm.runInContext('(function(){'+ts.transpileModule(source.replace('const [gestureMode, setGestureMode] = useState(false);','const [gestureMode, setGestureMode] = useState(true);'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText+'\n})();',ctx);
const touchTree=mod.exports.default({lang:'en',onMenu(){},onReward(){},serverRestored:false});effects[0]();
const stage=touchTree.props.children[0].props,controls=ctx.sceneTest.input;
const down=(x,y)=>stage.onTouchStart({touches:[{clientX:x,clientY:y}]}),up=(x,y)=>stage.onTouchEnd({changedTouches:[{clientX:x,clientY:y}]});
down(100,200);stage.onTouchMove({touches:[{clientX:165,clientY:135}]});assert.equal(controls.x,1);assert.equal(controls.y,-1);stage.onTouchCancel();assert.equal(controls.x,0);assert.equal(controls.y,0);assert.equal(controls.charge,false);
down(100,200);up(100,140);assert.equal(controls.jump,true);down(100,200);up(100,260);assert.equal(controls.slide,true);
clock+=400;down(100,200);up(100,200);clock+=100;down(100,200);up(100,200);assert.equal(controls.dash,true);
console.log('PASS: actual gesture handlers support free travel, jump, slide, double-tap dash and cancel reset');
// Complete every authored city using the actual scene loop, not just state commands.
vm.runInContext('(function(){'+out+'\n})();',ctx);
for(const cityLevel of [1,2,3]){
 progress={...g.parseLevelProgress(null),cityLevel};effects=[];refs=[];
 let menus=0;mod.exports.default({lang:'en',onMenu(){menus++;},onReward(){},serverRestored:false});effects[0]();
 const current=ctx.sceneTest;current.input.start=true;tick(2);
 const at=coords=>{current.state.pos.fromArray(coords);current.state.vy=0;tick(3);};
 const charge=()=>{current.input.charge=true;tick(65);current.input.charge=false;tick();};
 for(const mission of g.cityMissions(cityLevel)){
  for(const coords of mission.points){at(coords);if(mission.id===3)at(mission.terminal);if(mission.id===6)charge();}
  at(mission.terminal);if(mission.id===5)tick(110);charge();
  assert.ok(progress.completed.includes(mission.id),`City ${cityLevel} mission ${mission.id} must finish`);
  assert.equal(progress.coins,[100,250,430,650,910,1230][mission.id-1]);
  current.input.next=true;tick(2);
 }
 assert.equal(menus,1);assert.equal(progress.cityLevel,Math.min(3,cityLevel+1));
}
console.log('PASS: all 18 authored scene missions finish, city-specific counts/routes, rewards once and final campaign end');

// Completed missions remain playable with zero writes to the real account.
for(const cityLevel of [1,2,3])for(const mission of g.cityMissions(cityLevel)){
 progress=g.parseLevelProgress(JSON.stringify({...g.parseLevelProgress(null),cityLevel,completed:[1,2,3,4,5,6],claimed:[1,2,3,4,5,6],coins:90,blu:8}));
 const before=JSON.stringify(progress);effects=[];refs=[];let menus=0;
 mod.exports.default({lang:'en',mission:mission.id,replay:true,onMenu(){menus++;},onReward(){throw Error('Practice must not request a reward');},serverRestored:false});effects[0]();
 const current=ctx.sceneTest;current.input.start=true;tick(2);
 assert.equal(hud.level,mission.id);assert.equal(hud.levelDone,false);
 const at=coords=>{current.state.pos.fromArray(coords);current.state.vy=0;tick(3);};
 const charge=()=>{current.input.charge=true;tick(65);current.input.charge=false;tick();};
 for(const coords of mission.points){at(coords);if(mission.id===3)at(mission.terminal);if(mission.id===6)charge();}
 at(mission.terminal);if(mission.id===5)tick(110);charge();
 assert.equal(hud.levelDone,true,`Replay city ${cityLevel} mission ${mission.id}`);
 assert.equal(hud.coins,90);assert.equal(JSON.stringify(progress),before,'Practice must preserve all saved state');
 current.input.next=true;tick(2);assert.equal(menus,1);assert.equal(JSON.stringify(progress),before);
}
for(let id=1;id<=6;id++){const p=g.businessPlot(id);assert.ok(p.x-p.width/2>20.3,'Storefront must be beyond sidewalk');for(let j=id+1;j<=6;j++)assert.ok(Math.abs(p.z-g.businessPlot(j).z)>p.depth+2,'Plots require gaps');}
console.log('PASS: 18 practice replays finish without account writes or reward duplication; reserved plots clear sidewalk and one another');

const Heritage=load('app/components/HeritageStreet.ts',require).heritageStreet;
for(const city of [1,2,3]){
  const street=Heritage(city,new THREE.Texture());street.root.updateMatrixWorld(true);
  const bounds=street.blockers.map(b=>new THREE.Box3().setFromObject(b));
  assert.equal(bounds.length,4);
  for(const b of bounds)assert.ok(b.max.x<-20.3,'Heritage building body must clear the sidewalk');
  for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++)assert.equal(bounds[i].intersectsBox(bounds[j]),false,'Heritage plots must not overlap');
  let batches=0;street.root.traverse(o=>{if(o.isInstancedMesh)batches++;});assert.equal(batches,5,'Facade ornaments are batched by material');
  street.dispose();
}
const Render=load('app/components/CityRender.ts',require).CityRender;
let draws=0;const fallbackRenderer={render(){draws++;},setPixelRatio(){},setSize(){}};
const fallback=new Render(fallbackRenderer,new THREE.Scene(),new THREE.DirectionalLight());
fallback.resize(360,800);fallback.render(new THREE.PerspectiveCamera(),new THREE.Vector3(),.016,true);assert.equal(draws,1);fallback.dispose();
console.log('PASS: heritage plot separation, batched facade geometry and renderer fallback');
