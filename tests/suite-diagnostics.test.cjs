'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const repos=path.resolve(__dirname,'../..');
test('built products share the same diagnostic controls and detect active peer products',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<main>The bisexual community.</main>'}):r.abort());
 await page.goto('https://www.amazon.com/');
 await page.evaluate(()=>{window.GM_getValue=(_key,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.copiedDiagnostics=text}});});
 for(const name of ['Dropper','WARD','PRISMA','SHIFT'])await page.addScriptTag({content:fs.readFileSync(path.join(repos,name,`${name.toLowerCase()}.user.js`),'utf8')});
 for(const id of ['tdh-root','exp-ward-root','exp-prisma-root','exp-shift-root'])await page.waitForSelector(`#${id}`,{state:'attached'});
 for(const [id,route] of [['tdh-root','dropper'],['exp-ward-root','ward'],['exp-prisma-root','menu'],['exp-shift-root','recovery']]){
  await page.locator(`#${id}`).evaluate((host,route)=>{
   const s=host.shadowRoot;
   s.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher')?.click();
   if(route==='ward')[...s.querySelectorAll('button')].find(n=>n.textContent==='Diagnostics').click();
   else if(route==='dropper')s.querySelector('[data-panel="tdh-diagnostics-body"]').click();
   else s.querySelector(`[data-route="${route}"]`).click();
  },route);
  const host=page.locator(`#${id}`);
  const show=host.getByRole('button',{name:'Show Diagnostics',exact:true});const copy=host.getByRole('button',{name:'Copy Diagnostics',exact:true});
  await show.click();
  const region=host.getByRole('region',{name:'Page, technical, console, and plugin diagnostics'});
  await region.waitFor({state:'visible'});
  const report=JSON.parse(await region.textContent());
  assert.ok(report.page&&report.technical&&report.console&&report.plugin,id);assert.equal(report.schemaVersion,3);
  assert.ok(report.plugin.version&&report.plugin.version!=='unknown',`${id}: version`);
  assert.deepEqual(report.plugin.compatibility.products.map(p=>p.status),Array(4).fill('observed'));
  await copy.click();assert.equal(await host.getByRole('button',{name:'Diagnostics Copied',exact:true}).count(),1,id);
  assert.equal(await page.evaluate(()=>JSON.parse(window.copiedDiagnostics).plugin.id),report.plugin.id);
  await host.getByRole('button',{name:'Hide Diagnostics',exact:true}).click();assert.equal(await region.isVisible(),false);
  await host.evaluate(h=>h.shadowRoot.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher')?.click());
 }
 assert.deepEqual(errors,[]);
});
