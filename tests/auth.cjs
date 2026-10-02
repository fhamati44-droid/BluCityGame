const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:n=>mocks[n]||require(n),process,Buffer,Date,URLSearchParams,Set});return module.exports;}
const {verifyTelegram}=load('lib/telegram.ts');
const token='test-only-bot-secret',now=Math.floor(Date.now()/1000);
function sign(date=now){const p=new URLSearchParams({auth_date:String(date),user:JSON.stringify({id:101,first_name:'Test'})});const check=[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');const key=createHmac('sha256','WebAppData').update(token).digest();p.set('hash',createHmac('sha256',key).update(check).digest('hex'));return p.toString();}
assert.equal(verifyTelegram(sign(),token).id,'101');
assert.equal(verifyTelegram(sign(),token+'wrong'),null);
assert.equal(verifyTelegram(sign(now-3601),token),null);
assert.equal(verifyTelegram(sign(now+120),token),null);
assert.equal(verifyTelegram(sign(now+.5),token),null);
assert.equal(verifyTelegram(sign()+'&auth_date='+now,token),null);
const tampered=new URLSearchParams(sign());tampered.set('user',JSON.stringify({id:202}));assert.equal(verifyTelegram(tampered.toString(),token),null);
(async()=>{let calls=0;const route=load('app/api/ton/payouts/route.ts',{'next/server':{NextResponse:{json:(data,o={})=>({data,status:o.status||200})}},'@/lib/testnet-payout':{processTestnetPayout:async()=>{calls++;return{status:'idle'};}}});const previous=process.env.CRON_SECRET;
try{process.env.CRON_SECRET='test';for(const header of ['', 'Bearer wrong','Bearer éé']){const r=await route.GET({headers:new Headers({authorization:header})});assert.equal(r.status,401);}assert.equal(calls,0);assert.equal((await route.GET({headers:new Headers({authorization:'Bearer test'})})).status,200);assert.equal(calls,1);}finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
console.log('PASS: Telegram signature, tampering, expiration, future timestamps, duplicate fields; cron byte-safe secret validation');
})().catch(error=>{console.error(error);process.exitCode=1;});
