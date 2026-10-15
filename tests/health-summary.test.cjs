'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/health-summary.js'),'utf8');
const api=()=>vm.runInNewContext(source+';ExpHealthSummary',{Date,Object,Promise});
test('health has four honest states and invalid data is waiting',()=>{
 const h=api();
 for(const [state,label] of [['working','Working'],['waiting','Waiting'],['paused','Paused'],['attention','Needs attention']])assert.equal(h.normalizeHealth({state,reason:'Reason',checkedAt:123}).label,label);
 assert.equal(h.normalizeHealth({state:'broken'}).state,'waiting');assert.equal(h.normalizeHealth(null).checkedAt,null);
 assert.equal(h.normalizeHealth({state:'working',reason:'<b>hello</b>'}).reason,'<b>hello</b>');
});
test('health refresh discards stale results and actions run once while pending',async t=>{
 const {chromium}=require('playwright');const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();await page.setContent('<main></main>');
 await page.addScriptTag({content:source+`;window.calls=0;window.resolvers=[];window.control=ExpHealthSummary.createHealthControls(()=>new Promise(resolve=>resolvers.push(resolve)));document.querySelector('main').append(control.element);`});
 await page.evaluate(()=>{control.refresh();resolvers[1]({state:'paused',reason:'Current'});resolvers[0]({state:'working',reason:'Old'});});
 await page.waitForFunction(()=>document.querySelector('[data-exp-health-reason]').textContent==='Current');
 await page.evaluate(()=>{control.dispose();window.control=ExpHealthSummary.createHealthControls(()=>({state:'attention',reason:'<b>retry</b>',action:{label:'Retry',run:()=>{calls++;return new Promise(resolve=>window.done=resolve);}}}));document.querySelector('main').replaceChildren(control.element);});
 await page.getByRole('button',{name:'Retry',exact:true}).click();await page.evaluate(()=>document.querySelector('button').click());assert.equal(await page.evaluate(()=>calls),1);
 assert.equal(await page.locator('[data-exp-health-reason] b').count(),0);await page.evaluate(()=>done());
 await page.waitForFunction(()=>!document.querySelector('button').disabled);
 await page.evaluate(()=>{control.dispose();});
});
