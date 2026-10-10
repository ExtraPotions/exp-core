"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
// Dimensions and colors from the approved Lean reference, before implementation.
const products=[['Dropper','dropper','tdh-root','rgb(188, 148, 245)'],['PRISMA','prisma','exp-prisma-root','rgb(145, 191, 255)'],['SHIFT','shift','exp-shift-root','rgb(128, 215, 210)'],['WARD','ward','exp-ward-root','rgb(231, 187, 117)']];
const categoryIcons={Dropper:{Drops:'gift',Streams:'screen',Appearance:'brush',System:'system'},PRISMA:{Highlights:'sparkle',Appearance:'brush',Advanced:'sliders',System:'system'},SHIFT:{Appearance:'brush',Advanced:'sliders',System:'system'},WARD:{Protection:'shield',Amazon:'bag',Appearance:'brush',System:'system'}};
for(const[repo,id,hostId,accent]of products)test(repo+' installed menu matches approved Lean geometry and keeps theme preferences working',consumers.options([repo]),async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:1000}});
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<!doctype html><main>Page content</main>'}):r.abort());
 await page.goto(repo==='WARD'?'https://www.amazon.com/':'https://www.twitch.tv/testchannel');
 await page.evaluate(()=>{window.GM_getValue=(_,v)=>v;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:503}));return{abort(){}}};});
 await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,id+'.user.js'),'utf8')});
 const host=page.locator('#'+hostId);await host.locator('[data-exp-part="launcher"]').click();
 if(id==='dropper')await host.evaluate(n=>{const legacy=n.ownerDocument.createElement('style');legacy.textContent='.cluster[data-theme-skin="gradient"] #tdh-tools-dock{background-image:linear-gradient(#000,#fff)!important}';n.shadowRoot.append(legacy);});
 const facts=await host.evaluate(n=>{
  const dock=n.shadowRoot.querySelector('[data-exp-part="dock"]'),header=dock.querySelector('.menu-head'),badge=header.querySelector('.header-icon'),title=header.querySelector('[data-exp-part="title"],#tdh-rail-title'),close=header.querySelector('[data-exp-part="close"],#tdh-rail-close'),style=getComputedStyle(dock);
  const probe=document.createElement('span');probe.style.color='var(--theme-accent)';dock.append(probe);const accent=getComputedStyle(probe).color;probe.remove();
  return{width:dock.getBoundingClientRect().width,radius:style.borderRadius,background:style.backgroundColor,border:style.borderTopColor,gradient:style.backgroundImage,badge:Math.round(badge.getBoundingClientRect().width),title:getComputedStyle(title).fontSize,titleWeight:getComputedStyle(title).fontWeight,close:Math.round(close.getBoundingClientRect().width),footer:dock.querySelectorAll('footer,.exp-menu-footer').length,accent,overflow:dock.scrollWidth-dock.clientWidth};
 });
 assert.deepEqual(facts,{width:320,radius:'16px',background:'rgb(9, 9, 11)',border:'rgb(39, 39, 42)',gradient:'none',badge:30,title:'14px',titleWeight:'600',close:26,footer:0,accent,overflow:0});
 const categories=await host.locator('.fl-tool-header').evaluateAll(headers=>headers.map(header=>{
  const icon=header.querySelector('.exp-section-icon'),shape=icon&&getComputedStyle(icon,'::before');
  return{title:header.querySelector('.fl-tool-title').textContent.trim(),icon:icon?.dataset.icon,hidden:icon?.getAttribute('aria-hidden'),shape:shape?.content,width:icon?.getBoundingClientRect().width};
 }));
 assert.deepEqual(Object.fromEntries(categories.map(c=>[c.title,c.icon])),categoryIcons[repo]);
 assert.equal(new Set(categories.map(c=>c.icon)).size,categories.length,'Every category in a product has a distinct icon');
 for(const category of categories){assert.equal(category.hidden,'true');assert.equal(category.shape,'""');assert.ok(category.width>=12&&category.width<=16);}
 const type=await host.locator('.fl-tool-title').first().evaluate(n=>({font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize,line:getComputedStyle(n).lineHeight,weight:getComputedStyle(n).fontWeight,tracking:getComputedStyle(n).letterSpacing}));
 assert.ok(type.font.includes('Segoe UI'));assert.equal(type.size,'13px');assert.ok(parseFloat(type.line)>=16);assert.equal(type.weight,'500');assert.equal(type.tracking,'-0.1px');
 // Section headers sit behind the main tab row, one tab per section in the same order.
 const tabs=await host.locator('[data-exp-section-tabs][role=tablist] [role=tab]').evaluateAll(nodes=>nodes.map(n=>({name:n.getAttribute('aria-label'),height:n.getBoundingClientRect().height})));
 assert.deepEqual(tabs.map(tab=>tab.name),categories.map(c=>c.title));
 for(const tab of tabs)assert.ok(Math.round(tab.height)>=28,JSON.stringify(tab));
 const headerHeights=await host.locator('.fl-tool-header').evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().height)));
 assert.ok(headerHeights.every(height=>height<=1),'section headers are hidden behind the tabs '+JSON.stringify(headerHeights));
 // At the default 320px menu every product shows its tab labels, not icons only.
 const labelRow=await host.locator('[data-exp-section-tabs][role=tablist]').evaluate(list=>({compact:list.dataset.compact,labels:[...list.querySelectorAll('.exp-section-tab-label')].map(label=>label.textContent+':'+getComputedStyle(label).display+':'+label.scrollWidth+'/'+label.clientWidth)}));
 assert.equal(labelRow.compact,'0',JSON.stringify(labelRow));
 assert.ok(labelRow.labels.every(label=>label.split(':')[1]!=='none'),JSON.stringify(labelRow));
 // Runs of setting rows are boxed cards: at least one visible row opens a card.
 const cardStarts=await host.locator('[data-exp-part="dock"]').evaluate(dock=>[...dock.querySelectorAll('.row,.mini-row,.fl-switch,.setting-row')].filter(row=>row.checkVisibility()&&row.getBoundingClientRect().height>0).filter(row=>{const c=getComputedStyle(row);return c.borderTopWidth==='1px'&&c.borderTopLeftRadius==='10px';}).length);
 assert.ok(cardStarts>0,'an opened menu shows at least one boxed card of setting rows');
 // A retained custom theme must change the menu, rather than becoming an inert setting.
 const themeRoot=host.locator('.exp-core-theme,.cluster').first();
 await themeRoot.evaluate(n=>{n.dataset.uiTheme='contrast';n.style.setProperty('--theme-bg','#000000');n.style.setProperty('--theme-accent','#ffffff');});
 await page.waitForTimeout(30);
 assert.equal(await host.locator('[data-exp-part="dock"]').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(0, 0, 0)');
});
