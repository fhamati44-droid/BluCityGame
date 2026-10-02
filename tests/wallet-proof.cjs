const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const ton=require('@ton/ton'),crypto=require('@ton/crypto');
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(code,{module,exports:module.exports,require:n=>mocks[n]||require(n),process,Buffer,Date,JSON,Number});return module.exports;}
(async()=>{
 const old=process.env.TELEGRAM_BOT_TOKEN;process.env.TELEGRAM_BOT_TOKEN='local-test-secret';
 try{
 const config=load('lib/ton-config.ts'),p=load('lib/wallet-proof.ts',{'./ton-config':config});
 const now=Date.now(),domain='blu.example',keys=crypto.keyPairFromSeed(Buffer.alloc(32,7));
 const challenge=p.walletChallenge('101',domain,now),claims=p.readWalletValue('challenge',challenge.cookie,now);
 assert.ok(claims);assert.equal(p.readWalletValue('challenge',challenge.cookie,now+600001),null);
 assert.equal(p.readWalletValue('verified',challenge.cookie,now),null);
 assert.equal(p.readWalletValue('challenge',challenge.cookie+'x',now),null);
 const wallets=[ton.WalletContractV3R2.create({workchain:0,publicKey:keys.publicKey}),ton.WalletContractV4.create({workchain:0,publicKey:keys.publicKey}),ton.WalletContractV5R1.create({workchain:0,publicKey:keys.publicKey,walletId:{networkGlobalId:-3}})];
 let input;
 for(const w of wallets){
  const stateInit=ton.beginCell().store(ton.storeStateInit(w.init)).endCell().toBoc().toString('base64');
  assert.ok(p.walletPublicKey(w.address.toRawString(),stateInit).equals(keys.publicKey));
  const timestamp=Math.floor(now/1000),signature=crypto.sign(p.proofMessage(w.address.toRawString(),domain,timestamp,challenge.payload),keys.secretKey).toString('base64');
  input={address:w.address.toRawString(),network:'-3',walletStateInit:stateInit,proof:{timestamp,domain:{value:domain,lengthBytes:Buffer.byteLength(domain)},payload:challenge.payload,signature}};
  assert.equal(p.verifyWalletProof(input,claims,'101',domain,now),true);
 }
 assert.equal(p.verifyWalletProof(input,claims,'202',domain,now),false);
 assert.equal(p.verifyWalletProof({...input,proof:{...input.proof,timestamp:String(input.proof.timestamp)}},claims,'101',domain,now),true);
 assert.equal(p.verifyWalletProof({...input,publicKey:Buffer.alloc(32).toString('hex')},claims,'101',domain,now),false);
 assert.equal(p.verifyWalletProof(input,claims,'101','evil.example',now),false);
 assert.equal(p.verifyWalletProof({...input,network:'-239'},claims,'101',domain,now),false);
 assert.equal(p.verifyWalletProof({...input,address:wallets[0].address.toRawString()},claims,'101',domain,now),false);
 for(const patch of [{payload:'replayed'},{signature:Buffer.alloc(64).toString('base64')},{timestamp:Math.floor(now/1000)-601},{domain:{value:domain,lengthBytes:1}}])assert.equal(p.verifyWalletProof({...input,proof:{...input.proof,...patch}},claims,'101',domain,now),false);
 const altered=ton.beginCell().store(ton.storeStateInit({code:ton.beginCell().storeUint(1,8).endCell(),data:wallets[0].init.data})).endCell();
 assert.throws(()=>p.walletPublicKey('0:'+altered.hash().toString('hex'),altered.toBoc().toString('base64')),/UNSUPPORTED_WALLET/);
 const cookie=p.sealWalletValue('verified',{id:'101',domain,network:'-3',address:input.address,expires:now+60000});
 assert.equal(p.verifiedWallet(cookie,'101',domain,input.address),true);assert.equal(p.verifiedWallet(cookie,'202',domain,input.address),false);assert.equal(p.verifiedWallet(cookie,'101',domain,wallets[0].address.toRawString()),false);
 const jar=new Map();
 const next={NextResponse:{json:(data,options={})=>({data,status:options.status||200,cookies:{set:(name,value)=>value?jar.set(name,value):jar.delete(name)}})}};
 const route=load('app/api/ton/proof/route.ts',{'next/server':next,'@/lib/game-server':{identity:r=>r.user?{id:r.user}:null},'@/lib/ton-config':config,'@/lib/wallet-proof':p});
 const req=(body,user='101')=>({user,nextUrl:{origin:'https://blu.example',host:domain},headers:new Headers({origin:'https://blu.example'}),cookies:{get:name=>jar.has(name)?{value:jar.get(name)}:undefined},json:async()=>body});
 assert.equal((await route.POST(req({action:'challenge'},null))).status,401);
 const issued=await route.POST(req({action:'challenge'}));assert.equal(issued.status,200);
 input.proof.payload=issued.data.payload;input.proof.signature=crypto.sign(p.proofMessage(input.address,domain,input.proof.timestamp,input.proof.payload),keys.secretKey).toString('base64');
 assert.equal((await route.POST(req({...input,action:'verify'},'202'))).status,403);
 assert.equal((await route.POST(req({...input,action:'verify'}))).status,200);
 assert.equal(jar.has(p.CHALLENGE_COOKIE),false,'Successful proof clears the browser challenge');
 assert.equal((await route.POST(req({...input,action:'verify'}))).status,403,'Replaying without challenge fails');
 assert.equal((await route.POST(req({action:'status',address:input.address}))).data.verified,true);
 assert.equal((await route.POST(req({action:'status',address:input.address},'202'))).data.verified,false);
 console.log('PASS: signed V3R2/V4R2/V5R1 ownership, address/code/key binding, signature tampering, wrong user/domain/network, expiry, cookies and replay without challenge');
 }finally{if(old===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=old;}
})().catch(error=>{console.error(error);process.exitCode=1;});
