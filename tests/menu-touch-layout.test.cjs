'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
for(const [repo,id,url]of [['WARD','exp-ward-root','https://www.amazon.com/'],['PRISMA','exp-prisma-root','https://sample.test/'],['Dropper','tdh-root','https://www.twitch.tv/fixture'],['THREAD','exp-thread-root','https://www.reddit.com/']]){
 test(repo+' approved dense menu preserves native controls, gems and progress across original widths',consumers.options([repo]),async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true});
  await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<!doctype html><main>Authored fixture</main>'}):r.abort());
  await page.addInitScript(()=>{const store=new Map();window.GM_getValue=(k,d)=>store.has(k)?store.get(k):d;window.GM_setValue=(k,v)=>store.set(k,v);window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:0}));return{abort(){}}};});
  await page.goto(url);await page.addScriptTag({content:fs.readFileSync(consumers.file(repo,repo.toLowerCase()+'.user.js'),'utf8')});
  const host=page.locator('#'+id),dock=host.locator('[data-exp-part=dock]');await host.locator('[data-exp-part=launcher]').click();await dock.waitFor({state:'visible'});const gem=await dock.locator('.header-icon').innerHTML();
  assert.deepEqual((await dock.getByRole('tab').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label')))).slice(-2),['Look','System']);
  assert.equal(await dock.locator('.header-actions').evaluate(n=>Boolean(n.firstElementChild?.matches('[data-exp-part=version],#tdh-header-version'))),true);
  for(const [size,width]of [['standard',324],['compact',304],['mini',280]]){
   await page.evaluate(size=>{localStorage.setItem('exp:suite:menu-size',size);document.dispatchEvent(new CustomEvent('exp-core:menu-size',{detail:size}));},size);
   await page.waitForFunction(({id,width})=>Math.abs(document.getElementById(id).shadowRoot.querySelector('[data-exp-part=dock]').getBoundingClientRect().width-width)<.2,{id,width});
   for(const tab of await dock.getByRole('tab').all()){
    await tab.click();await page.waitForTimeout(30);
    const problems=await dock.evaluate(n=>{const bad=[],visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';if(n.scrollWidth>n.clientWidth+1)bad.push('horizontal overflow');
     for(const select of n.querySelectorAll('select')){if(!visible(select))continue;const wrap=select.closest('.exp-native-popup'),face=wrap?.querySelector('.exp-select-face');if(!face){bad.push('missing native picker face');continue;}if(face.textContent!==(select.selectedOptions[0]?.textContent||''))bad.push('stale value');const range=document.createRange();range.selectNodeContents(face);const r=face.getBoundingClientRect();for(const t of range.getClientRects())if(t.left<r.left-.2||t.right>r.right-18+.2||t.bottom>r.bottom+.2)bad.push('clipped selected value');}
     for(const b of n.querySelectorAll('.exp-menu-content button[role=switch]'))if(visible(b)&&Math.abs(b.getBoundingClientRect().height-24)>.2)bad.push('switch size');return bad;});
    assert.deepEqual(problems,[],repo+'/'+size+'/'+await tab.getAttribute('aria-label'));assert.equal(await dock.locator('.header-icon').innerHTML(),gem);
    if(repo==='THREAD'&&await tab.getAttribute('aria-label')==='Look'){const lines=await dock.getByRole('spinbutton',{name:'Content width (px)',exact:true}).evaluate(n=>{const range=document.createRange();range.selectNodeContents(n.closest('label').firstElementChild);return range.getClientRects().length;});assert.equal(lines,1,'short numeric field leaves its label on one line');}
   }
  }
  await dock.getByRole('tab',{name:'System',exact:true}).click();const reset=dock.locator('[data-exp-system-item=reset]');assert.equal(await reset.evaluate(n=>n===n.parentElement.lastElementChild),true);assert.equal(await reset.locator('button').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(180, 35, 42)');
  const rows=await dock.locator('.diagnostics-controls .action-pair button').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));assert.equal(new Set(rows).size,1);
  if(repo==='Dropper'){assert.equal(await host.locator('#tdh-drop-card').count(),1);await dock.getByRole('tab').first().click();assert.equal(await host.locator('#tdh-drop-card').evaluate(n=>n.isConnected),true);}
 });
}
