'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/recovery-control.js'),'utf8');
const api=()=>vm.runInNewContext(source+';ExpRecoveryControl',{Date,Object,Promise,Map});
test('recovery failures are bounded and isolated by feature and context',()=>{
 let time=1000;const g=api().createRecoveryGuard({now:()=>time});
 assert.equal(g.failed('scan','a').suspended,false);g.failed('scan','a');assert.equal(g.failed('scan','a').suspended,true);
 assert.equal(g.snapshot('scan','b').suspended,false);assert.equal(g.snapshot('coupon','a').suspended,false);
 g.succeeded('scan','a');assert.equal(g.snapshot('scan','a').consecutiveFailures,0);
 g.failed('scan','a');time+=120001;assert.equal(g.failed('scan','a').consecutiveFailures,1);
});
test('retry is single-flight and a cleared context rejects late completion',async()=>{
 const g=api().createRecoveryGuard();let finish,calls=0;g.failed('scan','a');g.failed('scan','a');g.failed('scan','a');
 const pending=g.retry('scan','a',()=>{calls++;return new Promise(resolve=>finish=resolve);});
 assert.equal(await g.retry('scan','a',()=>calls++),false);assert.equal(calls,1);assert.equal(g.snapshot('scan','a').retryPending,true);
 g.clearContext('a');g.failed('scan','a');finish();assert.equal(await pending,false);assert.equal(g.snapshot('scan','a').consecutiveFailures,1);
 g.dispose();assert.equal(await g.retry('scan','a',()=>calls++),false);
});
