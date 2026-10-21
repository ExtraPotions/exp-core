'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadSuiteContract}=require('../scripts/suite-contract.cjs');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
test('maintained consumers exclude SHIFT while legacy runtime identity remains compatible',()=>{
 const suite=loadSuiteContract();assert.deepEqual([...suite.maintainedRepositories].sort(),['Dropper','PRISMA','THREAD','WARD']);
 assert.equal(suite.contract.shift.maintenance,'retired');assert.ok(suite.repositories.includes('SHIFT'));
 assert.equal(suite.contract.shift.rootId,'exp-shift-root');
});
test('routine sync and browser packs exclude retired SHIFT, while explicit legacy tools remain available',()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 assert.match(read('scripts/sync-products.cjs'),/maintainedRepositories:discoveredProducts/);
 for(const file of ['check-annotations.cjs','check-product-menus.cjs']){
  const s=read('scripts/'+file);assert.doesNotMatch(s,/SHIFT\/node_modules/);assert.match(s,/EXP_INCLUDE_RETIRED/);
 }
});
test('active consumer discovery succeeds without a SHIFT directory or dependencies',t=>{
 const os=require('node:os'),workspace=fs.mkdtempSync(path.join(os.tmpdir(),'exp-active-only-'));t.after(()=>fs.rmSync(workspace,{recursive:true,force:true}));
 for(const repo of loadSuiteContract().maintainedRepositories){fs.mkdirSync(path.join(workspace,repo));fs.writeFileSync(path.join(workspace,repo,repo.toLowerCase()+'.user.js'),'fixture');}
 const roots=require('../scripts/consumer-roots.cjs').resolveConsumerRoots({workspace,env:{EXP_REQUIRE_CONSUMERS:'1'}});
 assert.equal(roots.options().skip,false);assert.equal(fs.existsSync(roots.root('SHIFT')),false);
});
for(const [repo,root,url] of [['Dropper','tdh-root','https://www.twitch.tv/fixture'],['PRISMA','exp-prisma-root','https://fixture.test/'],['WARD','exp-ward-root','https://www.amazon.com/'],['THREAD','exp-thread-root','https://www.reddit.com/']])test(repo+' remains independently usable with SHIFT absent',consumers.options([repo]),async t=>{
 const {chromium}=require('playwright');const browser=await chromium.launch();t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="background:rgb(18,18,18);color:rgb(238,238,238)"><main><p>bisexual pansexual</p></main></body></html>'}):r.abort());
 await page.addInitScript(()=>{const values=new Map([['exp:v3:shift:settings',{theme:'blue',retained:'retirement-fixture'}]]);window.GM_getValue=(k,d)=>values.has(k)?values.get(k):d;window.GM_setValue=(k,v)=>{if(k.startsWith('exp:v3:shift'))throw Error('SHIFT settings modified');values.set(k,v)};window.GM_deleteValue=k=>{if(k.startsWith('exp:v3:shift'))throw Error('SHIFT settings deleted');values.delete(k)};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:503}));return{abort(){}}};});
 await page.goto(url);await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,repo.toLowerCase()+'.user.js'),'utf8')});
 const host=page.locator('#'+root);await host.locator('[data-exp-part=launcher]').click();
 const dock=host.locator('[data-exp-part=dock]');assert.equal(await dock.isVisible(),true);
 const {openSystem}=require('./helpers/system-navigation.cjs');await openSystem(host,'support');
 for(const name of ['Show Diagnostics','Copy Diagnostics','Reset All Settings'])assert.equal(await dock.getByRole('button',{name,exact:true}).isVisible(),true);
 assert.equal(await page.locator('#exp-shift-root').count(),0);
 assert.deepEqual(await page.evaluate(()=>({settings:GM_getValue('exp:v3:shift:settings'),background:getComputedStyle(document.body).backgroundColor})),{settings:{theme:'blue',retained:'retirement-fixture'},background:'rgb(18, 18, 18)'});
 const box=await dock.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390.5);
 assert.deepEqual(errors,[]);
});
