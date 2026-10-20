'use strict';
const {openSystem}=require('./helpers/system-navigation.cjs');
// WARD starts only on its listed stores and on pages carrying Shopify's storefront marker, so suite fixtures carry it.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
const suiteOptions=consumers.options();
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

test('Core product fixtures share diagnostics and detect active peers',async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><body><main>Suite diagnostics fixture</main></body></html>');
  await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>{
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const makeTheme=(id,accent)=>({id,name:id,swatch:accent,bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent,accent2:accent,skin:accent,skinVertical:accent});
    const specs=[['dropper','#9147ff',90],['shift','#3563a3',100],['prisma','#8b5cf6',80],['ward','#318c61',60],['thread','#ff7636',90]];
    const products=[];
    for(const [id,accent,priority] of specs){
      const product=ExtraPotionsCore.createProduct({id,name:id.toUpperCase(),version:'3.3.2',artwork,theme:makeTheme(id,accent),sections:[],priority});
      ExtraPotionsCore.registerDiagnosticsProduct(id,'3.3.2',product.host);
      products.push({id,product});
    }
    const reports=products.map(({id,product})=>ExtraPotionsCore.createDiagnosticsReport(id,{
      host:product.host,
      shadow:product.shadow,
      product:{version:'3.3.2'},
      settings:{fixture:true},
    }));
    const controls=ExtraPotionsCore.createDiagnosticsControls(()=>reports[0],()=>{});
    products[0].product.panel.append(controls);
    const controlLabels=[...controls.querySelectorAll('button')].map(button=>button.textContent);
    const summaries=reports.map(report=>({
      id:report.plugin.id,
      version:report.plugin.version,
      schemaVersion:report.schemaVersion,
      peerStatuses:report.plugin.compatibility.products.map(product=>product.status),
      hasSections:Boolean(report.page&&report.technical&&report.console&&report.plugin),
    }));
    products.forEach(({product})=>product.destroy());
    return {summaries,controlLabels};
  });
  assert.deepEqual(result.controlLabels,['Show Diagnostics','Copy Diagnostics']);
  for(const summary of result.summaries){
    assert.equal(summary.version,'3.3.2');
    assert.equal(summary.schemaVersion,3);
    assert.equal(summary.hasSections,true);
    assert.deepEqual(summary.peerStatuses,Array(5).fill('observed'));
  }
  assert.deepEqual(result.summaries.map(item=>item.id),['dropper','shift','prisma','ward','thread']);
  assert.deepEqual(errors,[]);
});

test('all four built menus keep the size control without an arrangement editor or width field',suiteOptions,async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<script id="shopify-features" type="application/json">{}</script><main>Sample community.</main>'}):r.abort());
 await page.goto('https://fixture.test/');
 await page.evaluate(()=>{window.GM_getValue=(_key,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};});
 for(const name of ['Dropper','WARD','PRISMA','SHIFT'])await page.addScriptTag({content:fs.readFileSync(consumers.file(name,`${name.toLowerCase()}.user.js`),'utf8')});
 for(const id of ['tdh-root','exp-ward-root','exp-prisma-root','exp-shift-root']){
  const host=page.locator('#'+id);await host.waitFor({state:'attached'});
  await host.evaluate(host=>{const s=host.shadowRoot;s.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click();});await openSystem(host,'support');
  assert.equal(await host.locator('.exp-menu-editor').count(),0,id+': no menu editor');
  assert.equal(await host.locator('.exp-section-grip').count(),0,id+': no drag handles');
  assert.equal(await host.getByRole('combobox',{name:'Menu width',exact:true}).count(),0,id+': no menu width control');
  await host.evaluate(host=>host.shadowRoot.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click());
 }
 assert.deepEqual(errors,[]);
});

test('all product menus contain long content and keep the end reachable in short narrow windows',suiteOptions,async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());
 for(const viewport of [{width:1280,height:720},{width:360,height:480},{width:320,height:320}]){
  const page=await browser.newPage({viewport});
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<script id="shopify-features" type="application/json">{}</script><main>Fixture</main>'}):r.abort());await page.goto('https://fixture.test/');
  await page.evaluate(()=>{window.GM_getValue=(_key,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};});
  for(const name of ['Dropper','WARD','PRISMA','SHIFT'])await page.addScriptTag({content:fs.readFileSync(consumers.file(name,`${name.toLowerCase()}.user.js`),'utf8')});
  for(const id of ['tdh-root','exp-ward-root','exp-prisma-root','exp-shift-root']){
   const host=page.locator('#'+id);await host.waitFor({state:'attached'});
   await host.evaluate(h=>h.shadowRoot.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click());await openSystem(host,'support');await host.evaluate(h=>{const s=h.shadowRoot;const body=[...s.querySelectorAll('.fl-tool-body')].find(n=>n.getClientRects().length>0&&!n.hidden&&!n.classList.contains('fl-tool-hidden'));for(let i=0;i<30;i++){const p=document.createElement('p');p.textContent='LongContent'.repeat(25);body.append(p);}const last=document.createElement('button');last.textContent='End marker';last.id='containment-end';body.append(last);window.dispatchEvent(new Event('resize'));});
   // Placement follows the resize on a later frame; wait for it (up to 5s on a busy machine), then assert as before.
   await page.waitForFunction(([id,height])=>{const panel=document.getElementById(id).shadowRoot.querySelector('[data-exp-part=dock],#tdh-tools-dock');const scroller=panel.querySelector('.exp-menu-content');const box=panel?.getBoundingClientRect();return !!box&&box.top>=7&&box.bottom<=height-7&&scroller.scrollHeight>scroller.clientHeight;},[id,viewport.height],{timeout:5000}).catch(()=>{});
   const result=await host.evaluate(h=>{const panel=h.shadowRoot.querySelector('[data-exp-part=dock],#tdh-tools-dock'),scroller=panel.querySelector('.exp-menu-content');scroller.scrollTop=scroller.scrollHeight;const end=h.shadowRoot.querySelector('#containment-end');end.scrollIntoView({block:'end'});const box=panel.getBoundingClientRect(),last=end.getBoundingClientRect();return {top:box.top,bottom:box.bottom,left:box.left,right:box.right,scrollable:scroller.scrollHeight>scroller.clientHeight,overflow:getComputedStyle(scroller).overflowY,horizontal:panel.scrollWidth-panel.clientWidth,endTop:last.top,endBottom:last.bottom};});
   assert.ok(result.top>=7&&result.bottom<=viewport.height-7,JSON.stringify({id,viewport,result}));
   assert.ok(result.left>=7&&result.right<=viewport.width-7,JSON.stringify({id,viewport,result}));
   assert.ok(result.scrollable);assert.equal(result.overflow,'auto');assert.ok(result.horizontal<=1,JSON.stringify({id,viewport,result}));
   assert.ok(result.endBottom<=result.bottom+1&&result.endTop>=result.top,JSON.stringify({id,viewport,result}));
   await host.evaluate(h=>h.shadowRoot.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click());
  }
  await page.close();
 }
});

test('compact System groups keep diagnostics visible and expand without horizontal overflow',suiteOptions,async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());
 for(const name of ['Dropper','WARD','PRISMA','SHIFT']){
  const page=await browser.newPage({viewport:{width:360,height:900}});
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<script id="shopify-features" type="application/json">{}</script><main>Fixture</main>'}):r.abort());
  await page.goto('https://fixture.test/');await page.evaluate(()=>{window.GM_getValue=(_k,f)=>f;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};});
  await page.addScriptTag({content:fs.readFileSync(consumers.file(name,name.toLowerCase()+'.user.js'),'utf8')});
  const host=page.locator(name==='Dropper'?'#tdh-root':'#exp-'+name.toLowerCase()+'-root');await host.waitFor({state:'attached'});
  await host.evaluate(h=>{const s=h.shadowRoot;s.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click();});await openSystem(host,'support');
  const grid=host.locator('[data-exp-product-system]');assert.equal(await grid.count(),1);
  const layout=await grid.evaluate(n=>n.dataset.expSystemLayout||'classic');
  assert.equal(await host.getByRole('button',{name:'Show Diagnostics',exact:true}).isVisible(),true);
  assert.doesNotMatch(await grid.textContent(),/Settings backups|Back up settings|Restore selected backup|Maintenance|Site control|Product compatibility|Why am I waiting|Activity history/);
  assert.deepEqual(await grid.locator('[data-exp-system-item]').evaluateAll(nodes=>nodes.map(n=>n.dataset.expSystemItem)),layout==='grouped'?['status','support','reset']:['timeline','diagnostics','issue','preferences','reset']);
  const summaries=grid.locator(':scope > details > summary');assert.ok(await summaries.count()>=3);
  for(let i=0;i<await summaries.count();i++){
   const summary=summaries.nth(i);if(!await summary.evaluate(n=>n.parentElement.open)){await summary.focus();await page.keyboard.press('Enter');}
   assert.equal(await summary.evaluate(n=>n.parentElement.open),true);
   assert.ok(await summary.evaluate(n=>n.parentElement.scrollWidth-n.parentElement.clientWidth)<=1,name+' disclosure fits');
   await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.evaluate(n=>n.parentElement.open),false);assert.equal(await summary.evaluate(n=>n===n.getRootNode().activeElement),true);
  }
  await page.close();
 }
});
