'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
const products=[['PRISMA','prisma','#exp-prisma-root','.launcher','https://example.com/'],['SHIFT','shift','#exp-shift-root','.launcher','https://example.com/'],['WARD','ward','#exp-ward-root','.ward-launcher','https://www.amazon.com/'],['Dropper','dropper','#tdh-root','#tdh-settings-launcher','https://www.twitch.tv/firstchannel']];
for(const [repo,id,selector,launcher,url]of products)test(repo+' installed compact tabs expose all sections and retain product colors',consumers.options([repo]),async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:360,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><main><h1>Product menu checks</h1><p>bisexual pansexual</p></main>'}));
 await page.addInitScript(()=>{const values=new Map();window.GM_getValue=(key,fallback)=>values.has(key)?values.get(key):fallback;window.GM_setValue=(key,value)=>values.set(key,value);window.GM_deleteValue=key=>values.delete(key);window.GM_listValues=()=>[...values.keys()];window.GM_xmlhttpRequest=options=>{queueMicrotask(()=>options.onerror?.({status:503}));return{abort(){}};};});
 await page.goto(url);await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,id+'.user.js'),'utf8')});
 const root=page.locator(selector);await root.waitFor({state:'attached'});await root.locator(launcher).click();
 const palette=await root.locator('[data-exp-part="dock"]').evaluate(n=>getComputedStyle(n).getPropertyValue('--theme-accent').trim());assert.equal(palette,{prisma:'#6aaaff',shift:'#26d9c7',ward:'#b66a16',dropper:'#7a46c8'}[id]);
 const headers=root.locator('.fl-tool-header');const names=await headers.evaluateAll(nodes=>nodes.map(n=>(n.querySelector('.fl-tool-title')||n).textContent.replace(/[▸▾]/g,'').trim()));
 assert.equal(names.at(-1),'System');let visited=0;
 for(let h=0;h<await headers.count();h++){
  await headers.nth(h).click();await page.waitForTimeout(80);
  const lists=root.getByRole('tablist');
  for(let l=0;l<await lists.count();l++){
   const list=lists.nth(l);if(!await list.isVisible())continue;
   const labels=await list.getByRole('tab').allTextContents();assert.ok(labels.length<=4,repo+' keeps the compact row focused');
   for(const label of labels){const tab=list.getByRole('tab',{name:label,exact:true});await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');visited++;const overflow=await tab.evaluate(n=>{const box=n.closest('[data-exp-submenu-tabs]');return box.scrollWidth-box.clientWidth;});assert.ok(overflow<=1,repo+' tab overflow '+label);}
  }
 }
 assert.ok(visited>=4,repo+' has useful submenu tabs');
 await root.getByRole('tab',{name:'Support',exact:true}).click();
 await root.getByRole('button',{name:'Show Diagnostics',exact:true}).click();
 const diagnostics=root.locator(id==='dropper'?'#tdh-diagnostics':'.diagnostics-controls pre');await diagnostics.waitFor({state:'visible'});assert.equal(JSON.parse(await diagnostics.innerText()).report,repo+' Diagnostics');
 await root.getByRole('tab',{name:'Reset',exact:true}).click();assert.equal(await root.getByRole('button',{name:'Reset All Settings',exact:true}).isVisible(),true);
 if(id==='dropper'){
  await root.locator('[data-panel="tdh-streams-body"]').click();
  const list=root.locator('#tdh-streams-body').getByRole('tablist');assert.deepEqual(await list.getByRole('tab').allTextContents(),['Stream','Playback','Routing','Alerts']);
  await list.getByRole('tab',{name:'Playback',exact:true}).click();assert.equal(await root.locator('#tdh-remember-content-warnings').isVisible(),true);
 }
 assert.deepEqual(errors,[]);
});
