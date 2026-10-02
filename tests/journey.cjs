// Integration of real API handlers and PostgreSQL migrations; no production data.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
let serverClock=Date.now();
class ServerDate extends Date{static now(){return serverClock;}}
function load(file,mocks={}){
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:n=>n.includes("i18n")?require("./i18n-helper.cjs"):mocks[n]||require(n),process,Buffer,Date:ServerDate,Math,Set,Number,JSON,Array});
 return module.exports;
}
(async()=>{
 const db=new PGlite();
 const previous=process.env.BLU_TESTNET_WITHDRAWALS_ENABLED;
 try{
 await db.exec('create role anon; create role authenticated; create role service_role;');
 for(const file of ['schema','progression_v3','ton_testnet','ton_payouts'])await db.exec(fs.readFileSync(`supabase/${file}.sql`,'utf8'));
 await db.exec("insert into blu_players(telegram_id,display_name) values(101,'Journey'),(202,'Other');");
 const g=load('lib/levels.ts'),config=load('lib/ton-config.ts');
 const adapter={
  from(table){
   assert.ok(['blu_players','blu_testnet_withdrawals'].includes(table));
   let column,value;
   const query={select(){return query;},eq(c,v){column=c;value=v;return query;},order(){return query;},
    async maybeSingle(){const result=await db.query(`select city_save,city_revision,sparks from ${table} where telegram_id=$1`,[value]);return{data:result.rows[0]||null,error:null};},
    async limit(n){assert.equal(column,'telegram_id');const result=await db.query(`select id,amount,status,tx_hash,created_at from ${table} where telegram_id=$1 order by created_at desc limit $2`,[value,n]);return{data:result.rows,error:null};}};
   return query;
  },
  async rpc(name,args){
   try{
    let result;
    if(name==='blu_store_command')result=await db.query('select blu_store_command($1,$2,$3,$4) as result',[args.p_user,args.p_revision,args.p_command,JSON.stringify(args.p_save)]);
    else if(name==='blu_request_testnet_withdrawal')result=await db.query('select blu_request_testnet_withdrawal($1,$2,$3,$4) as result',[args.p_user,args.p_id,args.p_amount,args.p_destination]);
    else throw Error(`Unexpected RPC: ${name}`);
    return{data:result.rows[0].result,error:null};
   }catch(error){return{data:null,error:{message:error.message,code:error.code}};}
  }
 };
 const validation=load('lib/command-validation.ts',{'./levels':g});
 const missionGuard=load('lib/mission-guard.ts',{'./levels':g});
 const rateLimit=load('lib/progress-rate-limit.ts');
 const mocks={'next/server':{NextResponse:{json:(data,options={})=>({data,status:options.status||200})}},'@/lib/game-server':{database:()=>adapter,identity:r=>r.user?{id:r.user}:null},'@/lib/levels':g,'@/lib/ton-config':config,'@/lib/command-validation':validation,'@/lib/progress-rate-limit':rateLimit,'@/lib/mission-guard':missionGuard,'@/lib/beta-access':{walletTestingAllowed:id=>String(id)==='101'},'@/lib/wallet-proof':{PROOF_COOKIE:'proof',verifiedWallet:()=>true}};
 const progress=load('app/api/progress/route.ts',mocks),withdrawal=load('app/api/ton/withdrawals/route.ts',mocks);
 const origin='https://blu.example';
 const request=(user,body)=>({user,headers:new Headers({origin}),nextUrl:{origin,host:'blu.example'},cookies:{get:()=>undefined},json:async()=>body});
 const open=async(user=101)=>{const result=await progress.POST(request(user,{action:'open'}));assert.equal(result.status,200);return result.data;};
 let saved=await open();assert.equal(saved.progress.coins,0);assert.equal(g.unlockedLevel(saved.progress),1);
 const base={action:'command',revision:saved.revision,commandId:randomUUID(),command:{type:'daily'}};
 for(const bad of [null,[],{type:'give-coins'},{type:'daily',coins:9999},{type:'collect',id:'1',index:0},{type:'collect',id:1,index:3},{type:'finish',id:99},{type:'buy',id:'unknown'},{type:'equip',id:'shoes'},{type:'daily',cityLevel:101},{type:'run-finish',bolts:Infinity}])assert.equal((await progress.POST(request(101,{...base,command:bad}))).status,400);
 assert.equal((await progress.POST(request(101,{...base,commandId:'-'.repeat(36)}))).status,400);
 assert.equal((await progress.POST(request(101,{...base,revision:-1}))).status,400);
 assert.equal((await progress.POST({...request(101,base),headers:new Headers({origin:'https://evil.example'})})).status,403);
 assert.equal((await progress.POST({...request(101,base),headers:new Headers()})).status,403);
 assert.equal((await progress.POST(request(null,base))).status,401);
 assert.equal((await open()).revision,0,'Rejected requests never change balances or revision');
 let activeSession=0;
 const rawCommand=async(c,expected=200)=>{serverClock+=3000;const result=await progress.POST(request(101,{action:'command',revision:saved.revision,commandId:randomUUID(),command:{...c,cityLevel:saved.progress.cityLevel}}));assert.equal(result.status,expected,JSON.stringify(result.data));if(result.status===200)saved=result.data;return saved.progress;};
 const command=async(c)=>{
  if(['collect','finish'].includes(c.type)){
   if(saved.progress.completed.includes(c.id))return rawCommand({...c,position:missionGuard.MISSION_TERMINALS[c.id]},400);
   if(activeSession!==c.id){await rawCommand({type:'mission-start',id:c.id,position:{x:0,y:0,z:10}});activeSession=c.id;}
   if(c.type==='collect'){
    const point=missionGuard.MISSION_POINTS[c.id][c.index];
    if(c.id===3)await rawCommand({type:'mission-pickup',id:3,index:c.index,position:point});
    if(c.id===6)await rawCommand({type:'mission-charge',id:6,index:c.index,position:point});
    return rawCommand({...c,position:c.id===3?missionGuard.MISSION_TERMINALS[3]:point});
   }
   if(!saved.progress.objectives[c.id].every(Boolean))return rawCommand({...c,position:missionGuard.MISSION_TERMINALS[c.id]},400);
   if(c.id===5)await rawCommand({type:'mission-escort',id:5,position:missionGuard.MISSION_POINTS[5][1]});
   await rawCommand({type:'mission-charge',id:c.id,position:missionGuard.MISSION_TERMINALS[c.id]});
   return rawCommand({...c,position:missionGuard.MISSION_TERMINALS[c.id]});
  }
  if(c.type==='next-city')activeSession=0;
  return rawCommand(c);
 };
 for(const mission of g.LEVELS){
  await command({type:'finish',id:mission.id});assert.equal(saved.progress.completed.length,mission.id-1,'Cannot finish before collecting');
  for(let index=0;index<mission.required;index++)await command({type:'collect',id:mission.id,index});
  await command({type:'finish',id:mission.id});
  const balance=saved.progress.coins;await command({type:'finish',id:mission.id});assert.equal(saved.progress.coins,balance,'No repeated reward');
  const reopened=await open();assert.equal(reopened.progress.completed.length,mission.id,'Mission survives reopening');
 }
 assert.equal(saved.progress.coins,1230);assert.equal(saved.progress.restored,true);
 await command({type:'buy',id:'shoes'});await command({type:'buy',id:'gloves'});await command({type:'buy',id:'battery'});await command({type:'buy',id:'neon'});await command({type:'dash'});
 assert.equal(saved.progress.coins,440);assert.equal(saved.progress.skin,'neon');assert.equal(saved.progress.dashLevel,1);
 await command({type:'exchange'});await command({type:'exchange'});assert.equal(saved.progress.coins,240);assert.equal(saved.progress.blu,2);
 process.env.BLU_TESTNET_WITHDRAWALS_ENABLED='true';
 const address='0:8e99a37361bfad147090f5e39643043fbd806def35d92a92e5225bb87b3ca9c2';
 const body={action:'request',network:'-3',amount:2,address,requestId:randomUUID()};
 const reserved=await withdrawal.POST(request(101,body));assert.equal(reserved.status,200);
 assert.equal((await withdrawal.POST(request(101,body))).status,200,'Retry is idempotent');
 const fresh=await open();assert.equal(fresh.progress.blu,0);assert.equal(fresh.revision,saved.revision+1);
 const stale=await progress.POST(request(101,{action:'command',revision:saved.revision,commandId:randomUUID(),command:{type:'next-city',cityLevel:1}}));assert.equal(stale.status,409,'Stale save cannot overwrite reserved funds');
 saved=fresh;await command({type:'next-city'});assert.equal(saved.progress.cityLevel,2);assert.equal(saved.progress.completed.length,0);assert.equal(saved.progress.skin,'neon');assert.equal(saved.progress.inventory.length,4);assert.equal(saved.progress.coins,240);assert.equal(saved.progress.blu,0);
 await command({type:'collect',id:1,index:0});const reopened=await open();assert.equal(reopened.progress.objectives[1][0],true);assert.equal(reopened.progress.cityLevel,2);
 const other=await open(202);assert.equal(other.walletTesting,false);assert.equal((await open()).walletTesting,true);
 const publicRevision=other.revision;
 const denied=await progress.POST(request(202,{action:'command',revision:publicRevision,commandId:randomUUID(),command:{type:'exchange'}}));assert.equal(denied.status,403);assert.equal((await open(202)).revision,publicRevision);
 assert.equal((await withdrawal.POST(request(202,{...body,requestId:randomUUID()}))).status,403,'Public account cannot reserve Testnet funds');assert.equal(other.progress.coins,0);assert.equal(other.progress.cityLevel,1);assert.equal(other.progress.inventory.length,0);
 assert.equal((await withdrawal.POST(request(202,{action:'status'}))).data.requests.length,0,'Requests stay private to each account');
 const pending=await withdrawal.POST(request(101,{action:'status'}));assert.equal(pending.data.requests.length,1);assert.equal(pending.data.requests[0].status,'pending');
 // Chain verification itself is covered in ton.cjs; simulate its persisted result here.
 await db.query("update blu_testnet_withdrawals set status='confirmed',tx_hash='verified-chain-proof' where id=$1",[body.requestId]);
 const confirmed=await withdrawal.POST(request(101,{action:'status'}));assert.equal(confirmed.data.requests[0].status,'confirmed');assert.equal(confirmed.data.requests[0].tx_hash,'verified-chain-proof');
 // Two independently loaded handlers share the durable per-user guard.
 const otherHandler=load('app/api/progress/route.ts',mocks);
 serverClock+=60000;saved=await open();
 const flood=async(handler=progress,user=101)=>handler.POST(request(user,{action:'command',revision:user===101?saved.revision:0,commandId:randomUUID(),command:{type:'equip',id:'classic'}}));
 for(let n=0;n<8;n++){const r=await flood(n%2?otherHandler:progress);assert.equal(r.status,200);saved=r.data;}
 const beforeBlocked=saved.revision,blocked=await flood(otherHandler);assert.equal(blocked.status,429);assert.equal(blocked.data.code,'COMMAND_RATE_LIMIT');assert.equal((await open()).revision,beforeBlocked);
 assert.equal((await flood(otherHandler,202)).status,200,'Another player has an independent limit');
 const stored=(await db.query('select city_save from blu_players where telegram_id=101')).rows[0].city_save;assert.equal(stored._serverRate.burst.count,8);assert.equal(saved.progress._serverRate,undefined,'Private limiter metadata is not sent to clients');
 serverClock+=60000;
 for(let n=0;n<60;n++){serverClock+=1001;const r=await flood();assert.equal(r.status,200);saved=r.data;}
 const minuteBlocked=await flood(otherHandler);assert.equal(minuteBlocked.status,429);assert.ok(minuteBlocked.data.retryAfterMs>0&&minuteBlocked.data.retryAfterMs<=60000);
 serverClock+=minuteBlocked.data.retryAfterMs;const resumed=await flood();assert.equal(resumed.status,200);assert.equal(resumed.data.progress.coins,240);
 saved=resumed.data;
 const send=async(command,id=randomUUID())=>progress.POST(request(101,{action:'command',revision:saved.revision,commandId:id,command}));
 let r=await send({type:'daily'});assert.equal(r.status,200);saved=r.data;
 for(const index of [1,2])await command({type:'collect',id:1,index});
 await command({type:'mission-charge',id:1,position:missionGuard.MISSION_TERMINALS[1]});
 const finishId=randomUUID(),finishCommand={type:'finish',id:1,cityLevel:2,position:missionGuard.MISSION_TERMINALS[1]};
 const rewardBlocked=await send(finishCommand,finishId);assert.equal(rewardBlocked.status,429);assert.equal(rewardBlocked.data.code,'MISSION_WAIT');assert.equal((await open()).progress.completed.length,0,'Blocked reward does not mark a mission complete');
 const coinsBefore=saved.progress.coins;serverClock+=rewardBlocked.data.retryAfterMs;r=await send(finishCommand,finishId);assert.equal(r.status,200);assert.equal(r.data.progress.coins,coinsBefore+100);assert.equal(r.data.progress.completed.length,1);
 console.log('PASS: real API + SQL journey: new account, six missions, persisted checkpoints, equipment, dash, conversion, withdrawal retry, revision conflict, city 2, account isolation and confirmed status');
 console.log('PASS: durable burst/minute limits across handlers, account separation, no write on 429, hidden metadata and recovery after expiry');
 }finally{if(previous===undefined)delete process.env.BLU_TESTNET_WITHDRAWALS_ENABLED;else process.env.BLU_TESTNET_WITHDRAWALS_ENABLED=previous;await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
