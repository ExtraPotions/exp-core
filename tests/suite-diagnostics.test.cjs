'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const repos=path.resolve(__dirname,'../..');
const suiteAvailable=['Dropper','WARD','PRISMA','SHIFT'].every(name=>fs.existsSync(path.join(repos,name,`${name.toLowerCase()}.user.js`)));
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
    const specs=[['dropper','#9147ff',90],['shift','#3563a3',100],['prisma','#8b5cf6',80],['ward','#318c61',60]];
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
    assert.deepEqual(summary.peerStatuses,Array(4).fill('observed'));
  }
  assert.deepEqual(result.summaries.map(item=>item.id),['dropper','shift','prisma','ward']);
  assert.deepEqual(errors,[]);
});

test('all four built menus keep arrangement recovery in System and handles left of titles',{skip:!suiteAvailable&&'Requires four sibling product builds'},async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<main>Sample community.</main>'}):r.abort());
 await page.goto('https://fixture.test/');
 await page.evaluate(()=>{window.GM_getValue=(_key,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};});
 for(const name of ['Dropper','WARD','PRISMA','SHIFT'])await page.addScriptTag({content:fs.readFileSync(path.join(repos,name,`${name.toLowerCase()}.user.js`),'utf8')});
 for(const id of ['tdh-root','exp-ward-root','exp-prisma-root','exp-shift-root']){
  const host=page.locator('#'+id);await host.waitFor({state:'attached'});
  await host.evaluate(host=>{const s=host.shadowRoot;s.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click();s.querySelector('[data-panel="tdh-diagnostics-body"],[data-view="system"],[data-route="system"],[data-section="system"]').click();});
  const editor=host.locator('.exp-menu-editor');await editor.waitFor({state:'visible'});
  assert.equal(await editor.evaluate(node=>node.closest('[data-exp-arrange-section]').querySelector('.fl-tool-title').textContent),'System');
  assert.equal(await host.getByRole('switch',{name:'Show System'}).count(),0);
  await editor.locator('summary').click();const toggle=editor.getByRole('switch').first();await toggle.click();
  assert.equal(await host.locator('[data-exp-arrange-section][hidden]').count(),1);
  await editor.getByRole('button',{name:'Reset menu arrangement',exact:true}).click();assert.equal(await host.locator('[data-exp-arrange-section][hidden]').count(),0);
  const facts=await host.locator('[data-exp-arrange-section]').evaluateAll(nodes=>nodes.map(section=>{const grip=section.querySelector('.exp-section-grip').getBoundingClientRect(),title=section.querySelector('.fl-tool-title').getBoundingClientRect();return grip.right<=title.left+1;}));
  assert.ok(facts.every(Boolean),id+': handles remain left');
  const grip=host.getByRole('button',{name:/Rearrange/}).first();await grip.focus();await page.keyboard.press('Alt+ArrowDown');
  assert.equal(await editor.isVisible(),true);
  await editor.getByRole('button',{name:'Reset menu arrangement',exact:true}).click();
  await host.evaluate(host=>host.shadowRoot.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click());
 }
 assert.deepEqual(errors,[]);
});

test('all product menus contain long content and keep the end reachable in short narrow windows',{skip:!suiteAvailable&&'Requires four sibling product builds'},async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());
 for(const viewport of [{width:1280,height:720},{width:360,height:480},{width:320,height:320}]){
  const page=await browser.newPage({viewport});
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<main>Fixture</main>'}):r.abort());await page.goto('https://fixture.test/');
  await page.evaluate(()=>{window.GM_getValue=(_key,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};});
  for(const name of ['Dropper','WARD','PRISMA','SHIFT'])await page.addScriptTag({content:fs.readFileSync(path.join(repos,name,`${name.toLowerCase()}.user.js`),'utf8')});
  for(const id of ['tdh-root','exp-ward-root','exp-prisma-root','exp-shift-root']){
   const host=page.locator('#'+id);await host.waitFor({state:'attached'});
   await host.evaluate(h=>{const s=h.shadowRoot;s.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click();s.querySelector('[data-panel="tdh-diagnostics-body"],[data-view="system"],[data-route="system"],[data-section="system"]').click();const body=[...s.querySelectorAll('.fl-tool-body')].find(n=>!n.hidden&&!n.classList.contains('fl-tool-hidden'));for(let i=0;i<30;i++){const p=document.createElement('p');p.textContent='LongContent'.repeat(25);body.append(p);}const last=document.createElement('button');last.textContent='End marker';last.id='containment-end';body.append(last);window.dispatchEvent(new Event('resize'));});
   await page.waitForTimeout(80);
   const result=await host.evaluate(h=>{const panel=h.shadowRoot.querySelector('[data-exp-part=dock],#tdh-tools-dock');panel.scrollTop=panel.scrollHeight;const box=panel.getBoundingClientRect(),last=h.shadowRoot.querySelector('#containment-end').getBoundingClientRect();return {top:box.top,bottom:box.bottom,left:box.left,right:box.right,scrollable:panel.scrollHeight>panel.clientHeight,overflow:getComputedStyle(panel).overflowY,horizontal:panel.scrollWidth-panel.clientWidth,endTop:last.top,endBottom:last.bottom};});
   assert.ok(result.top>=7&&result.bottom<=viewport.height-7,JSON.stringify({id,viewport,result}));
   assert.ok(result.left>=7&&result.right<=viewport.width-7,JSON.stringify({id,viewport,result}));
   assert.ok(result.scrollable);assert.equal(result.overflow,'auto');assert.ok(result.horizontal<=1,JSON.stringify({id,viewport,result}));
   assert.ok(result.endBottom<=result.bottom+1&&result.endTop>=result.top,JSON.stringify({id,viewport,result}));
   await host.evaluate(h=>h.shadowRoot.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click());
  }
  await page.close();
 }
});

test('compact System groups keep diagnostics visible and expand without horizontal overflow',{skip:!suiteAvailable&&'Requires sibling product builds'},async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());
 for(const name of ['Dropper','WARD','PRISMA','SHIFT']){
  const page=await browser.newPage({viewport:{width:360,height:900}});
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<main>Fixture</main>'}):r.abort());
  await page.goto('https://fixture.test/');await page.evaluate(()=>{window.GM_getValue=(_k,f)=>f;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};});
  await page.addScriptTag({content:fs.readFileSync(path.join(repos,name,name.toLowerCase()+'.user.js'),'utf8')});
  const host=page.locator(name==='Dropper'?'#tdh-root':'#exp-'+name.toLowerCase()+'-root');await host.waitFor({state:'attached'});
  await host.evaluate(h=>{const s=h.shadowRoot;s.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher').click();s.querySelector('[data-panel="tdh-diagnostics-body"],[data-view="system"],[data-route="system"],[data-section="system"]').click();});
  assert.equal(await host.getByRole('button',{name:'Show Diagnostics',exact:true}).isVisible(),true);
  const width=host.getByRole('combobox',{name:'Menu width',exact:true});assert.equal(await width.isVisible(),true);
  assert.equal(await width.evaluate(n=>n.closest('[data-exp-arrange-section]').querySelector('.fl-tool-title').textContent),'System');
  for (const mode of ['full','compact','narrow']) {
    await width.selectOption(mode);
    const inline=await width.evaluate(n=>{const label=n.parentElement.querySelector('.copy,.row-copy,span').getBoundingClientRect(),select=n.getBoundingClientRect();return label.right<=select.left+1&&Math.min(label.bottom,select.bottom)>Math.max(label.top,select.top)&&n.parentElement.scrollWidth<=n.parentElement.clientWidth+1;});
    assert.equal(inline,true,name+' '+mode+' width control must remain inline');
  }
  const preferences=host.locator('[data-exp-system-tools]>details').filter({has:page.locator('summary',{hasText:'Menu preferences'})});assert.equal(await preferences.count(),1);
  await preferences.locator(':scope>summary').click();
  const notifications=preferences.getByRole('switch',{name:/^Menu notifications/});
  await notifications.waitFor({state:'visible',timeout:3000});assert.equal(await notifications.isVisible(),true,name);const checked=await notifications.getAttribute('aria-checked');await notifications.click();
  assert.notEqual(await notifications.getAttribute('aria-checked'),checked);assert.equal(await preferences.evaluate(n=>n.open),true);
  await preferences.locator(':scope>summary').click();
  const grid=host.locator('[data-exp-system-tools]');assert.equal(await grid.count(),1);
  assert.doesNotMatch(await grid.textContent(),/Settings backups|Back up settings|Restore selected backup/);
  assert.equal(await grid.locator(':scope>details[open]').count(),0);
  const cards=grid.locator(':scope>details');assert.ok(await cards.count()>=3);
  for(let i=0;i<await cards.count();i++){
   const card=cards.nth(i);await card.locator(':scope>summary').focus();await page.keyboard.press('Enter');
   assert.equal(await card.evaluate(n=>n.open),true);
   const dimensions=await card.evaluate(n=>({width:n.getBoundingClientRect().width,parent:n.parentElement.getBoundingClientRect().width,overflow:n.scrollWidth-n.clientWidth}));
   assert.ok(Math.abs(dimensions.width-dimensions.parent)<2,JSON.stringify({name,dimensions}));assert.ok(dimensions.overflow<=1,JSON.stringify({name,dimensions}));
   await card.locator(':scope>summary').press('Enter');
  }
  await page.close();
 }
});
