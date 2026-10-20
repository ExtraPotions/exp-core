'use strict';
const {openSystem}=require('./helpers/system-navigation.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
const products=[['Dropper','dropper','tdh-root','rgb(24, 24, 27)','rgb(145, 70, 255)'],['PRISMA','prisma','exp-prisma-root','rgb(9, 15, 32)','rgb(106, 170, 255)'],['SHIFT','shift','exp-shift-root','rgb(16, 23, 25)','rgb(38, 217, 199)'],['WARD','ward','exp-ward-root','rgb(18, 11, 5)','rgb(182, 106, 22)']];
for(const[repo,id,hostId,background,accent]of products)test(repo+' built compact sidebar preserves product identity, section behavior and Support/Reset access inside System',consumers.options([repo]),async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<!doctype html><main>Sample page</main>'}):r.abort());await page.goto(repo==='WARD'?'https://www.amazon.com/':'https://www.twitch.tv/sample');
 await page.evaluate(()=>{window.GM_getValue=(_,v)=>v;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:503}));return{abort(){}}};});await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,id+'.user.js'),'utf8')});
 const host=page.locator('#'+hostId);await host.locator('[data-exp-part=launcher]').click();await host.locator('.exp-menu-workspace').waitFor();
 const dock=host.locator('[data-exp-part=dock]');const facts=await dock.evaluate(n=>{const s=getComputedStyle(n),probe=document.createElement('i');probe.style.color='var(--theme-accent)';n.append(probe);const accent=getComputedStyle(probe).color;probe.remove();return{width:n.getBoundingClientRect().width,radius:s.borderRadius,background:s.backgroundColor,gradient:s.backgroundImage,accent,overflow:n.scrollWidth-n.clientWidth};});
 assert.deepEqual(facts,{width:304,radius:'7px',background,gradient:'none',accent,overflow:0});
 assert.equal(await host.locator('.exp-section-tabs').getAttribute('aria-orientation'),'vertical');
 for(const tab of await host.locator('.exp-section-tabs [role=tab]').all()){await tab.click();assert.equal(await tab.getAttribute('aria-selected'),'true');assert.equal(await dock.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);}
 const probe=await dock.locator('button[role=switch]:not(:disabled)').first().evaluateHandle(n=>{const copy=n.cloneNode(true);copy.removeAttribute('id');n.parentElement.append(copy);copy.setAttribute('aria-checked','true');return copy;});
 await page.waitForFunction(({node,color})=>getComputedStyle(node).backgroundColor===color,{node:probe,color:accent});
 const toggle=await probe.evaluate(n=>{const style=getComputedStyle(n),thumb=getComputedStyle(n,'::after');return{track:style.backgroundColor,thumb:thumb.backgroundColor,width:style.width,height:style.height,child:n.firstElementChild?getComputedStyle(n.firstElementChild).display:'none'};});await probe.evaluate(n=>n.remove());
 assert.deepEqual(toggle,{track:accent,thumb:background,width:'32px',height:'22px',child:'none'},'flat switch keeps one contrasting thumb');
 assert.equal(await dock.getAttribute('data-exp-menu-template'),'extrapotions-menu-v1');
 assert.equal(await dock.locator('[data-exp-menu-shortcut="support"],[data-exp-menu-shortcut="reset"]').count(),0);
 assert.equal(await dock.getByRole('tab',{name:'System',exact:true}).count(),1);
 for(const label of ['Support','Reset']){await openSystem(host,label);const open=await dock.evaluate((n,label)=>[...n.querySelectorAll('details')].some(d=>d.querySelector(':scope>summary')?.textContent.trim()===label&&d.open),label);assert.ok(open);}
 const first=host.locator('.exp-section-tabs [role=tab]').first();await first.focus();await page.keyboard.press('ArrowDown');assert.equal(await host.locator('.exp-section-tabs [role=tab]').nth(1).getAttribute('aria-selected'),'true');
 for(const width of [320,390,820]){await page.setViewportSize({width,height:650});await page.waitForFunction(id=>{const n=document.querySelector('#'+id).shadowRoot.querySelector('[data-exp-part=dock]'),r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;},hostId);assert.equal(await dock.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&n.scrollWidth<=n.clientWidth+1;}),true);}
 assert.equal(await dock.locator('.support-button').count(),1);assert.equal(await dock.locator('[data-exp-part=version],#tdh-header-version').count(),1);
 if(id==='dropper'){assert.equal(await host.locator('#tdh-card-pause').count(),1);assert.equal(await dock.locator('#tdh-drop-card').count(),1);}
});


