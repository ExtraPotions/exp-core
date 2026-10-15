'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
const products=[['PRISMA','prisma','#exp-prisma-root','.launcher','https://example.com/'],['SHIFT','shift','#exp-shift-root','.launcher','https://example.com/'],['WARD','ward','#exp-ward-root','.ward-launcher','https://www.amazon.com/'],['Dropper','dropper','#tdh-root','#tdh-settings-launcher','https://www.twitch.tv/firstchannel']];
for(const [repo,id,selector,launcher,url]of products)test(repo+' installed menus open every submenu row as a detail view and retain product colors',consumers.options([repo]),async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:360,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><main><h1>Product menu checks</h1><p>bisexual pansexual</p></main>'}));
 await page.addInitScript(()=>{const values=new Map();window.GM_getValue=(key,fallback)=>values.has(key)?values.get(key):fallback;window.GM_setValue=(key,value)=>values.set(key,value);window.GM_deleteValue=key=>values.delete(key);window.GM_listValues=()=>[...values.keys()];window.GM_xmlhttpRequest=options=>{queueMicrotask(()=>options.onerror?.({status:503}));return{abort(){}};};});
 await page.goto(url);await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,id+'.user.js'),'utf8')});
 const root=page.locator(selector);
 const rowIn=(scope,label)=>scope.locator('.exp-submenu-row').filter({has:page.getByText(label,{exact:true})});
 const openRow=async label=>{const back=root.locator('.exp-submenu-detail:not([hidden])>.exp-submenu-back');if(await back.count())await back.first().click();await rowIn(root,label).click();};
 await root.waitFor({state:'attached'});await root.locator(launcher).click();
 const palette=await root.locator('[data-exp-part="dock"]').evaluate(n=>getComputedStyle(n).getPropertyValue('--theme-accent').trim());assert.equal(palette,{prisma:'#91bfff',shift:'#80d7d2',ward:'#e7bb75',dropper:'#bc94f5'}[id]);
 const headers=root.locator('.fl-tool-header');const names=await headers.evaluateAll(nodes=>nodes.map(n=>(n.querySelector('.fl-tool-title')||n).textContent.replace(/[▸▾]/g,'').trim()));
 assert.equal(names.at(-1),'System');let visited=0;
 // Sections are main tabs; the inner submenu rows sit inside each section's page.
 const sectionTabs=root.locator('[data-exp-section-tabs][role=tablist] [role=tab]');// A section tab is named by the short word it shows (Core 3.8.2).
 const short={Appearance:'Look',Protection:'Protect'};assert.deepEqual(await sectionTabs.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),names.map(name=>short[name]||name));
 for(let h=0;h<await sectionTabs.count();h++){
  await sectionTabs.nth(h).click();await page.waitForTimeout(80);assert.equal(await sectionTabs.nth(h).getAttribute('aria-selected'),'true');
  assert.equal(await root.locator('.exp-submenu-tablist,[data-exp-submenu-tabs] [role=tab]').count(),0,repo+' has one tab row');
  const navs=root.locator('[data-exp-submenu-tabs] .exp-submenu-nav');
  for(let l=0;l<await navs.count();l++){
   const nav=navs.nth(l);if(!await nav.isVisible())continue;
   const labels=await nav.locator('.exp-submenu-row').allTextContents();
   for(const label of labels){
    await rowIn(nav,label).click();
    const box=root.locator('[data-exp-submenu-tabs]:has(>.exp-submenu-detail:not([hidden]))');
    assert.equal(await box.locator('.exp-submenu-title').textContent(),label);visited++;
    assert.ok(await box.evaluate(n=>n.scrollWidth-n.clientWidth)<=1,repo+' detail overflow '+label);
    await box.locator('.exp-submenu-back').click();assert.equal(await nav.isVisible(),true);
   }
  }
 }
 assert.ok(visited>=4,repo+' has useful submenu rows');
 await openRow('Support');
 await root.getByRole('button',{name:'Show Diagnostics',exact:true}).click();
 const diagnostics=root.locator(id==='dropper'?'#tdh-diagnostics':'.diagnostics-controls pre');await diagnostics.waitFor({state:'visible'});assert.equal(JSON.parse(await diagnostics.innerText()).report,repo+' Diagnostics');
 await openRow('Reset');assert.equal(await root.getByRole('button',{name:'Reset All Settings',exact:true}).isVisible(),true);
 if(id==='dropper'){
  await root.locator('[data-exp-section-tab="tdh-streams-body"]').click();
  const streams=root.locator('#tdh-streams-body');assert.deepEqual(await streams.locator('.exp-submenu-row').allTextContents(),['Stream Health','Playback','Routing','Alerts']);
  await rowIn(streams,'Playback').click();assert.equal(await root.locator('#tdh-remember-content-warnings').isVisible(),true);
 }
 assert.deepEqual(errors,[]);
});
