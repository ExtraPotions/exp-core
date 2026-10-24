'use strict';
const {openSystem}=require('./helpers/system-navigation.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
const products=[['Dropper','dropper','tdh-root'],['PRISMA','prisma','exp-prisma-root'],['WARD','ward','exp-ward-root']];

for(const[repo,id,root]of products)test(repo+' Mini diagnostics keep whole words and omit redundant status history',consumers.options([repo]),async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:320,height:740}});
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<!doctype html><main>Fixture</main>'}):r.abort());
 await page.goto(id==='ward'?'https://www.amazon.com/':'https://www.twitch.tv/sample_streamer');
 await page.evaluate(()=>{window.GM_getValue=(_,v)=>v;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:503}));return{abort(){}}};localStorage.setItem('exp:suite:menu-size','mini');});
 await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,id+'.user.js'),'utf8')});const host=page.locator('#'+root),dock=host.locator('[data-exp-part=dock]');await host.locator('[data-exp-part=launcher]').click();
 await openSystem(dock,'support');
 const pair=dock.locator('.diagnostics-controls .action-pair');await pair.waitFor({state:'visible'});
 const sizes=await pair.locator('button').evaluateAll(buttons=>buttons.map(n=>{const s=getComputedStyle(n),canvas=document.createElement('canvas'),c=canvas.getContext('2d');c.font=s.font;return{text:n.textContent,font:s.fontSize,height:n.getBoundingClientRect().height,word:c.measureText('Diagnostics').width,available:n.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),wrap:s.overflowWrap};}));
 for(const size of sizes){assert.equal(size.font,'13px');assert.ok(size.height<=43,JSON.stringify(size));assert.ok(size.word<=size.available,JSON.stringify(size));assert.equal(size.wrap,'normal');}
 assert.equal(await dock.locator('[data-exp-system-activity]').count(),['prisma','ward'].includes(id)?0:1);
 if(id==='shift'){
  await dock.getByRole('tab',{name:'Appearance',exact:true}).click();assert.equal(await dock.getByLabel('Saved theme',{exact:true}).count(),0);assert.equal(await dock.locator('[data-shift-theme]').count(),6);
  for(const button of await dock.locator('[data-shift-theme]').all())assert.ok((await button.boundingBox()).height<=36);
  await dock.getByRole('tab',{name:'Look',exact:true}).click();const check=dock.getByRole('button',{name:'Check now',exact:true});assert.equal(await check.evaluate(n=>getComputedStyle(n).fontSize),'12px');assert.equal(await check.evaluate(n=>getComputedStyle(n).fontWeight),'400');
 }
});

for(const[repo,id,root]of products)test(repo+' compact design retains settings, bounded help and real changelog',consumers.options([repo]),async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1000,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<!doctype html><main>Fixture</main>'}):r.abort());
 await page.goto(id==='ward'?'https://www.amazon.com/':'https://www.twitch.tv/sample_streamer');
 await page.evaluate(()=>{window.GM_getValue=(_,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:503}));return{abort(){}}};localStorage.setItem('exp:suite:menu-size','large');});
 await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,id+'.user.js'),'utf8')});
 const host=page.locator('#'+root),dock=host.locator('[data-exp-part=dock]');await host.locator('[data-exp-part=launcher]').click();
 assert.equal(await host.getAttribute('data-exp-menu-size'),'compact','retired sizes fall back to Compact');
 if(id==='dropper'){
  assert.deepEqual(await dock.locator('[data-exp-section-tabs] [role=tab]').allTextContents(),['Campaigns','Settings','Look','System']);
  assert.equal(await dock.getByRole('button',{name:/^(Pause|Resume)$/}).count(),1);
  assert.equal(await host.locator('#tdh-card-pause').count(),1);
  assert.equal(await host.locator('#tdh-drop-card').getAttribute('data-presentation'),'compact-card');
  await dock.getByRole('tab',{name:'Look',exact:true}).click();
 }else await dock.getByRole('tab',{name:'Look',exact:true}).click();
 const size=dock.locator('[data-exp-menu-size-select]');assert.equal(await size.isVisible(),true,'Menu Size directly in Look');
 assert.deepEqual(await size.locator('option').allTextContents(),['Standard','Compact','Mini']);
 const measurements=[];
 for(const[mode,width]of [['standard',324],['compact',304],['mini',280]]){
  await size.selectOption(mode);await page.waitForTimeout(80);
  const measure=await dock.evaluate(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,overflow:n.scrollWidth-n.clientWidth,font:getComputedStyle(n).fontSize,padding:parseFloat(getComputedStyle(n.querySelector('.exp-menu-content')).paddingTop),control:n.querySelector('[data-exp-menu-size-select]').getBoundingClientRect().height}));
  assert.equal(measure.width,width);assert.equal(measure.overflow,0);measurements.push(measure);
  if(id==='dropper')assert.ok(await host.locator('#tdh-drop-card').evaluate(n=>n.getBoundingClientRect().width<=n.closest('[data-exp-part=dock]').clientWidth));
 }
 assert.ok(measurements.every(m=>m.padding<=6&&m.control>=26),'all original widths use the approved dense controls');assert.equal(measurements[0].font,measurements[2].font,'text remains readable');
 const help=dock.locator('.exp-menu-size [data-exp-help]');await help.focus();
 const tip=host.locator('[role=tooltip]');assert.equal(await tip.isVisible(),true);
 const within=async()=>{await page.waitForTimeout(80);const a=await tip.boundingBox(),b=await dock.boundingBox();assert.ok(a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width+1&&a.y+a.height<=b.y+b.height+1,'help contained by menu: '+JSON.stringify({a,b}));};
 await within();await page.keyboard.press('Escape');assert.equal(await tip.isVisible(),false);
 
 await openSystem(dock,'support');
 await page.waitForTimeout(80);
 const show=dock.getByRole('button',{name:'Show Diagnostics',exact:true}),copy=dock.getByRole('button',{name:'Copy Diagnostics',exact:true});
 const a=await show.boundingBox(),b=await copy.boundingBox();assert.ok(Math.abs(a.y-b.y)<1&&a.x+a.width<=b.x+1,'diagnostics share one row: '+JSON.stringify({a,b}));
 const report=dock.getByRole('button',{name:'Report a Problem',exact:true});assert.equal(await report.evaluate(n=>getComputedStyle(n).textAlign),'center');
 await report.focus();await within();await page.keyboard.press('Escape');
 await openSystem(dock,'reset');
 const reset=dock.getByRole('button',{name:'Reset All Settings',exact:true});assert.match(await reset.getAttribute('aria-description'),/reset|remove|clear/i);
 await reset.focus();await within();await page.keyboard.press('Escape');
 const version=host.locator('[data-exp-part=version],#tdh-header-version').first();await version.click();
 const notice=host.locator('.update-notice').filter({visible:true});assert.equal(await notice.count(),1);assert.match(await notice.textContent(),/Changelog|What's New|Changes/i);
 assert.ok(await notice.getByRole(id==='dropper'?'button':'link',{name:/GitHub Release/i}).count(),'real release action retained');
 await notice.locator('button').first().focus();await page.keyboard.press('Escape');assert.equal(await notice.isVisible(),false);assert.equal(await version.evaluate(n=>n.getRootNode().activeElement===n),true);
 for(const width of [320,768]){await page.setViewportSize({width,height:600});await page.waitForTimeout(80);assert.ok(await dock.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&n.scrollWidth<=n.clientWidth;}));}
 assert.deepEqual(errors,[]);assert.equal(await dock.locator('input[type=checkbox]').count(),0);
});

test('help restores descriptions and disposes its nodes and listeners',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();await page.setContent('<div id=host></div>');
 await page.addScriptTag({content:fs.readFileSync(__dirname+'/../src/menu-help.js','utf8')+`;const shadow=document.querySelector('#host').attachShadow({mode:'open'}),panel=document.createElement('aside'),label=document.createElement('span');panel.style.cssText='position:fixed;left:10px;top:10px;width:272px;height:200px';panel.dataset.expPart='dock';label.textContent='Setting';ExpMenuHelp.setMenuHelp(label,'Help '.repeat(200));panel.append(label);shadow.append(panel);window.disposeHelp=ExpMenuHelp.mount({shadow,panel});`});
 const host=page.locator('#host');await host.locator('[data-exp-help]').focus();assert.equal(await host.locator('[role=tooltip]').isVisible(),true);
 await page.evaluate(()=>disposeHelp());assert.equal(await host.locator('[role=tooltip]').count(),0);assert.equal(await host.locator('[aria-describedby]').count(),0);
});

