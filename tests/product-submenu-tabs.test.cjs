'use strict';
const {openSystem}=require('./helpers/system-navigation.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
const products=[['PRISMA','prisma','#exp-prisma-root','.launcher','https://example.com/'],['WARD','ward','#exp-ward-root','.ward-launcher','https://www.amazon.com/'],['Dropper','dropper','#tdh-root','#tdh-settings-launcher','https://www.twitch.tv/firstchannel']];
for(const [repo,id,selector,launcher,url]of products)test(repo+' built menu expands secondary settings inline and retains product controls/colors',consumers.options([repo]),async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:360,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><main><h1>Product menu checks</h1><p>bisexual pansexual</p></main>'}));
 await page.addInitScript(()=>{const values=new Map();window.GM_getValue=(key,fallback)=>values.has(key)?values.get(key):fallback;window.GM_setValue=(key,value)=>values.set(key,value);window.GM_deleteValue=key=>values.delete(key);window.GM_listValues=()=>[...values.keys()];window.GM_xmlhttpRequest=options=>{queueMicrotask(()=>options.onerror?.({status:503}));return{abort(){}};};});
 await page.goto(url);await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,id+'.user.js'),'utf8')});
 const root=page.locator(selector);await root.waitFor({state:'attached'});await root.locator(launcher).click();
 const panel=root.locator('[data-exp-part="dock"]');
 assert.equal(await panel.evaluate(n=>getComputedStyle(n).getPropertyValue('--theme-accent').trim()),{prisma:'#6aaaff',shift:'#26d9c7',ward:'#b66a16',dropper:'#9146ff'}[id]);
 const tabs=root.locator('[data-exp-section-tabs] [role=tab]');assert.ok(await tabs.count()>=2);
 assert.equal(await root.locator('[role=tablist]').getAttribute('aria-orientation'),'vertical');let visited=0;
 for(let i=0;i<await tabs.count();i++){
  await tabs.nth(i).click();assert.equal(await tabs.nth(i).getAttribute('aria-selected'),'true');
  const summaries=root.locator('.exp-menu-content summary:visible');
  for(let s=0;s<await summaries.count();s++){
   const summary=await summaries.nth(s).elementHandle();if(!await summary.isVisible())continue;
   if(!await summary.evaluate(n=>n.parentElement.open)){await summary.focus();await page.keyboard.press('Enter');}
   assert.equal(await summary.evaluate(n=>n.parentElement.open),true);visited++;
   assert.ok(await summary.evaluate(n=>n.parentElement.scrollWidth-n.parentElement.clientWidth)<=1,repo+' disclosure overflow');
  }
 }
 assert.ok(visited>=4,repo+' preserves secondary settings');assert.equal(await root.locator('.exp-submenu-row').count(),0);
 await openSystem(root,'support');
 await root.getByRole('button',{name:'Show Diagnostics',exact:true}).click();
 const diagnostics=root.locator(id==='dropper'?'#tdh-diagnostics':'.diagnostics-controls pre');await diagnostics.waitFor({state:'visible'});assert.equal(JSON.parse(await diagnostics.innerText()).report,repo+' Diagnostics');
 await openSystem(root,'reset');assert.equal(await root.getByRole('button',{name:'Reset All Settings',exact:true}).isVisible(),true);
 if(id==='dropper'){
  await root.locator('[data-exp-section-tab="tdh-streams-body"]').click();
  const playback=root.locator('summary').filter({hasText:/^Playback options$/});if(!await playback.evaluate(n=>n.parentElement.open))await playback.click();assert.equal(await root.locator('#tdh-remember-content-warnings').isVisible(),true);
 }
 assert.deepEqual(errors,[]);
});
