const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const {PGlite} = require('@electric-sql/pglite');
function load(file, mocks={}) {
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:n=>mocks[n]||require(n),process,Buffer,console});
  return module.exports;
}
(async()=>{
 const config=load('lib/ton-config.ts');
 assert.equal(config.formatBluUnits('999990000000000'),'999990');
 assert.equal(config.formatBluUnits('1'),'0.000000001');
 assert.equal(config.formatBluUnits('1234567890'),'1.23456789');
 assert.throws(()=>config.formatBluUnits('-1'));
 const {Address}=require('@ton/ton');
 let contractState='active', fakeMaster=Address.parse(config.BLU_JETTON_MASTER), fakeOwner=Address.parse('0QChS16WNfKOK5pXdog_j9b4DSTWR2JGUvRaeGt9w2WjR3hF');
 const actualTon=require('@ton/ton');
 const balanceRoute=load('app/api/ton/balance/route.ts',{'next/server':{NextResponse:{json:(data,o={})=>({data,status:o.status||200})}},'@/lib/ton-config':config,'@ton/ton':{...actualTon,TonClient:class {
  async runMethod(address,method){return{stack:method==='get_wallet_address'?{readAddress:()=>fakeOwner}:{readBigNumber:()=>BigInt('999990000000000'),readAddress:(()=>{let n=0;return()=>n++===0?fakeOwner:fakeMaster})()}}}
  async getContractState(){return{state:contractState}}
 }}});
 const balanceRequest={nextUrl:{searchParams:new URLSearchParams({address:fakeOwner.toRawString()})}};
 assert.equal((await balanceRoute.GET(balanceRequest)).data.balance,'999990');
 contractState='uninitialized';assert.equal((await balanceRoute.GET(balanceRequest)).data.balance,'0');contractState='active';
 fakeMaster=fakeOwner;assert.equal((await balanceRoute.GET(balanceRequest)).status,503);
 assert.equal((await balanceRoute.GET({nextUrl:{searchParams:new URLSearchParams({address:'bad'})}})).status,400);
 const origin='https://blu.example';let calls=0;let identity={id:'1'};
 const json=(data,options={})=>({data,status:options.status||200});
 const route=load('app/api/ton/withdrawals/route.ts',{'next/server':{NextResponse:{json}},'@/lib/ton-config':config,'@/lib/game-server':{identity:()=>identity,database:()=>({rpc:async(name,args)=>{calls++;return{data:{id:args.p_id,status:'pending'},error:null}}})}});
 const request=body=>({headers:new Headers({origin}),nextUrl:{origin},json:async()=>body});
 const id='11111111-1111-4111-8111-111111111111';
 const address=Address.parse('0QChS16WNfKOK5pXdog_j9b4DSTWR2JGUvRaeGt9w2WjR3hF');
 const body={action:'request',network:'-3',amount:1,address:address.toRawString(),requestId:id};
 const previous=process.env.BLU_TESTNET_WITHDRAWALS_ENABLED;
 delete process.env.BLU_TESTNET_WITHDRAWALS_ENABLED;
 assert.equal((await route.POST(request(body))).status,503);
 process.env.BLU_TESTNET_WITHDRAWALS_ENABLED='true';
 assert.equal((await route.POST({...request(body),headers:new Headers({origin:'https://evil.example'})})).status,403);
 identity=null;assert.equal((await route.POST(request(body))).status,401);identity={id:'1'};
 for(const patch of [{network:'-239'},{amount:0},{amount:11},{amount:1.5},{address:'broken'},{address:config.BLU_JETTON_MASTER},{address:address.toString({testOnly:false})}]) assert.equal((await route.POST(request({...body,...patch}))).status,400);
 assert.equal(calls,0);assert.equal((await route.POST(request(body))).data.status,'pending');assert.equal(calls,1);
 if(previous===undefined)delete process.env.BLU_TESTNET_WITHDRAWALS_ENABLED;else process.env.BLU_TESTNET_WITHDRAWALS_ENABLED=previous;
 const db=new PGlite();
 await db.exec('create role anon; create role authenticated; create role service_role;');
 for(const file of ['supabase/schema.sql','supabase/progression_v3.sql','supabase/ton_testnet.sql'])await db.exec(fs.readFileSync(file,'utf8'));
 await db.exec("insert into blu_players(telegram_id,display_name,city_save) values(1,'Test','{\"blu\":20}'),(2,'Other','{\"blu\":1}');");
 const reserve=(user,uuid,amount=1)=>db.query('select blu_request_testnet_withdrawal($1,$2,$3,$4) as result',[user,uuid,amount,address.toRawString()]);
 await reserve(1,id,3);await reserve(1,id,3);
 let row=(await db.query('select city_save,city_revision from blu_players where telegram_id=1')).rows[0];assert.equal(row.city_save.blu,17);assert.equal(row.city_revision,1);
 await assert.rejects(()=>reserve(2,id,3),/INVALID_REQUEST/);
 await assert.rejects(()=>reserve(1,id,2),/INVALID_REQUEST/);
 const stale=await db.query("select blu_store_command(1,0,'22222222-2222-4222-8222-222222222222','{\"blu\":20}') as result");assert.equal(stale.rows[0].result.code,'CONFLICT');
 await reserve(1,'33333333-3333-4333-8333-333333333333',7);
 await assert.rejects(()=>reserve(1,'44444444-4444-4444-8444-444444444444'),/DAILY_LIMIT/);
 await assert.rejects(()=>reserve(2,'55555555-5555-4555-8555-555555555555',2),/INSUFFICIENT_BLU/);
 assert.equal((await db.query('select count(*)::int as n from blu_testnet_withdrawals')).rows[0].n,2);
 row=(await db.query('select city_save from blu_players where telegram_id=1')).rows[0];assert.equal(row.city_save.blu,10);
 await db.exec('set role anon;');await assert.rejects(()=>db.query('select * from blu_testnet_withdrawals'),/permission denied/);await assert.rejects(()=>reserve(1,id,3),/permission denied/);
 await db.close();
 console.log('PASS: TON units, testnet/auth/origin guards, disabled withdrawals, atomic reservations, retry idempotency, revision conflicts, daily cap, insufficient funds, private SQL permissions');
})().catch(error=>{console.error(error);process.exitCode=1});
