const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const workspace = path.resolve(__dirname, '../..');
const { chromium } = require(path.join(workspace, 'SHIFT/node_modules/playwright'));
const products = [
 ['Dropper','Dropper/dropper.user.js','#tdh-root','#tdh-settings-launcher'],
 ['PRISMA','PRISMA/prisma.user.js','#exp-prisma-root','.launcher'],
 ['SHIFT','SHIFT/shift.user.js','#exp-shift-root','.launcher'],
 ['WARD','WARD/ward.user.js','#exp-ward-root','.ward-launcher']
];
(async () => {
 const browser=await chromium.launch({headless:true});
 const output=path.join(workspace,'outputs/annotation/verified');fs.mkdirSync(output,{recursive:true});
 try { for(const [name,file,hostSelector,launcher] of products) {
  const page=await browser.newPage({viewport:{width:1000,height:1000}});page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body style="background:white;color:black"><main>Offline annotation fixture</main></body></html>'}));
  await page.goto(name==='Dropper'?'https://www.twitch.tv/':name==='WARD'?'https://www.amazon.com/':'https://fixture.test/');
  await page.evaluate(()=>{
   const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'})};
   const storage=new Map();window.GM_getValue=(k,d)=>storage.has(k)?storage.get(k):d;window.GM_setValue=(k,v)=>storage.set(k,v);window.GM_deleteValue=k=>storage.delete(k);window.GM_addValueChangeListener=()=>1;window.GM_registerMenuCommand=()=>{};
   window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:0}));return{abort(){}}};window.fetch=async()=>{throw Error('Offline test')};
  });
  let code=fs.readFileSync(path.join(workspace,file),'utf8');
  if(name==='SHIFT')code=code.replace('EXP.UI = (() => {','window.__testedEXP=EXP; EXP.UI = (() => {');
  await page.addScriptTag({content:code});const root=page.locator(hostSelector);await root.waitFor({state:'attached'});await root.locator(launcher).click();
  async function route(id){await root.evaluate((h,id)=>{const s=h.shadowRoot,b=s.querySelector('[data-route="'+id+'"],[data-view="'+id+'"],[data-panel="'+id+'"]');if(!b)throw Error('Missing '+id);if(b.getAttribute('aria-expanded')!=='true')b.click()},id);}
  async function aligned(selector,count){const boxes=await root.locator(selector).evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));assert.equal(boxes.length,count,name+' '+selector);assert.ok(boxes.every(b=>Math.abs(b.y-boxes[0].y)<1),name+' same row '+JSON.stringify(boxes));}
  async function fits(selector){const results=await root.locator(selector).evaluateAll(ns=>ns.filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return {text:n.getAttribute('aria-label')||n.textContent,left:r.left,right:r.right,parentLeft:p.left,parentRight:p.right}}));for(const r of results)assert.ok(r.left>=r.parentLeft-1&&r.right<=r.parentRight+1,name+' overflow '+JSON.stringify(r));}
  for(const width of ['narrow','compact','full']){
   if(name==='Dropper'){await route('tdh-menu-body');await root.locator('#tdh-collapsed-width').selectOption(width);}
   else {await route('menu');await root.getByLabel(name==='SHIFT'?'Menu width':name==='PRISMA'?'Panel + menu width':'Panel width',{exact:true}).selectOption(width);}
   if(name==='Dropper'){
    const widthControl=await root.locator('#tdh-collapsed-width').boundingBox();assert.ok(widthControl.width>=90,'full Compact label width');await fits('#tdh-collapsed-width');
    const radius=await root.locator(launcher).evaluate(n=>({radius:getComputedStyle(n).borderRadius,w:n.offsetWidth,h:n.offsetHeight}));assert.deepEqual(radius,{radius:'12px',w:48,h:48});
    await route('tdh-recover-body');await aligned('#tdh-refresh-now,#tdh-reset-session',2);await aligned('#tdh-diagnostics-toggle,#tdh-copy-diagnostics',2);
    assert.equal(await root.locator('#tdh-export-diagnostics').count(),0);
    assert.ok((await root.locator('#tdh-diagnostics-toggle').boundingBox()).y<(await root.locator('#tdh-refresh-now').boundingBox()).y);
    assert.ok((await root.locator('#tdh-clear-activity').boundingBox()).y<(await root.locator('#tdh-refresh-now').boundingBox()).y);assert.ok((await root.locator('#tdh-clear-activity').boundingBox()).y>(await root.locator('#tdh-diagnostics-toggle').boundingBox()).y);
    assert.equal(await root.locator('#tdh-clear-activity').evaluate(n=>n.previousElementSibling.tagName),'HR');
    for(const id of ['tdh-refresh-now','tdh-reset-session'])assert.equal(await root.locator('#'+id).evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(64, 32, 32)');
    await route('tdh-tools-body');await aligned('.queue-switches>.fl-switch',3);await fits('.queue-switches>.fl-switch');
    assert.ok((await root.locator('#tdh-queue-preference').boundingBox()).width>=120);await fits('#tdh-queue-preference');
    const bottoms=await root.locator('.queue-switches .fl-switch-text').evaluateAll(ns=>ns.map(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect().bottom;}));assert.ok(Math.max(...bottoms)-Math.min(...bottoms)<2,'label text bottom alignment');
   } else if(name==='PRISMA'){
    assert.equal(await root.getByText('Open-menu shortcut',{exact:true}).count(),0);assert.equal(await root.getByText('PRISMA 3.0.1',{exact:true}).count(),0);
    await route('tools');assert.ok(await root.locator('.identity').count()>=1);
   } else if(name==='SHIFT'){
    assert.equal(await root.locator('[data-route="profiles"]').count(),0);assert.equal(await root.getByText('Open-menu shortcut',{exact:true}).count(),0);
    await route('look');assert.equal(await root.getByLabel('Text contrast',{exact:true}).count(),0);await route('read');assert.ok(await root.getByLabel('Text contrast',{exact:true}).isVisible());assert.ok(await root.getByRole('button',{name:'Review',exact:true}).isVisible());
   } else if(name==='WARD'){
    await route('recover');await aligned('.settings-transfer>button',2);await fits('.settings-transfer>button');
    assert.equal(await root.getByRole('button',{name:'Reset Amazon',exact:true}).evaluate(n=>n.closest('.row').previousElementSibling.tagName),'HR');
    await route('page');assert.equal(await root.locator('.hero').count(),0);
    await route('tools');assert.equal(await root.locator('#exp-ward-view-tools .hero,#exp-ward-view-tools .status-grid').count(),0);assert.equal(await root.getByText('Retailer status',{exact:true}).count(),0);
    await route('read');await fits('.row>select');
   }
   const redActions={PRISMA:[['recover','Reset'],['page','Reset site'],['tools','Restore']],SHIFT:[['recover','Reset'],['page','Reset site']],WARD:[['recover','Reset Amazon'],['page','Clear']]}[name]||[];
   for(const [section,label] of redActions){await route(section);await page.mouse.move(1,1);const color=await root.getByRole('button',{name:label,exact:true}).evaluate(n=>getComputedStyle(n).backgroundColor);assert.equal(color,'rgb(64, 32, 32)',name+' red '+label);}
   await page.mouse.move(1,1);await page.screenshot({path:path.join(output,name+'-'+width+'.png')});
  }
  if(name==='SHIFT'){
   await route('look');
   for(const palette of ['Warm charcoal','Graphite','Midnight','High contrast','Pine','Ember','Pride','SHIFT gem']){
    await root.getByRole('button',{name:palette,exact:true}).click();
    const colors=await page.evaluate(()=>{const E=window.__testedEXP,s=document.querySelector('#exp-shift-root');return{page:getComputedStyle(document.body).backgroundColor,menu:getComputedStyle(s.shadowRoot.querySelector('.panel')).backgroundColor}});assert.equal(colors.page,colors.menu,palette+' preview');
    await root.getByRole('button',{name:'Apply',exact:true}).click();
    const saved=await page.evaluate(()=>{const E=window.__testedEXP;E.Settings.load();const s=E.Settings.effective(),t=E.Themes.resolve(s.theme,s.accent,s);return{accent:s.accent,expected:t.accent,menu:document.querySelector('#exp-shift-root').style.getPropertyValue('--teal'),page:getComputedStyle(document.documentElement).getPropertyValue('--exp-shift-accent').trim()}});assert.equal(saved.menu,saved.expected,palette+' saved menu');assert.equal(saved.page,saved.expected,palette+' saved page');
    assert.equal(await root.locator('.exp-theme-swatch').count(),8);
   }
  }
  assert.deepEqual(errors,[],name);console.log('PASS annotation checks:',name);await page.close();
 }} finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
