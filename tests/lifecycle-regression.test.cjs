'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const source = `(() => {\n${bundle}\nglobalThis.ExtraPotionsCore = ExtraPotionsCore;\n})();\n`;

test('queued lifecycle transitions preserve order, recover after failure, and clean up once', async t => {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage(); await page.goto('about:blank'); await page.addScriptTag({content:source});
  const result = await page.evaluate(async () => {
    const events=[]; let attempts=0;
    const product=ExtraPotionsCore.createLifecycle().register({id:'test-product',version:'1.0.0',capabilities:[]},{
      initialize: async()=>{events.push('initialize');await Promise.resolve();},
      enable:()=>{events.push('enable');if(++attempts===1)throw Error('retry');},
      disable:()=>events.push('disable'),cleanup:()=>events.push('cleanup')
    });
    const first=product.initialize();const failed=product.enable().catch(()=>{});await Promise.all([first,failed]);
    await product.initialize();await product.enable();await product.disable();await product.cleanup();await product.cleanup();
    return {events,state:product.state};
  });
  assert.deepEqual(result,{events:['initialize','enable','initialize','enable','disable','cleanup'],state:'cleaned'});
});

test('navigation subscribers detach in either order and restore history methods', async t => {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage(); await page.goto('about:blank');
  await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>{
    const lifecycle=ExtraPotionsCore.createLifecycle(), original=history.pushState, seen=[];
    const stopA=lifecycle.onNavigation(()=>seen.push('a'));
    const stopB=lifecycle.onNavigation(()=>seen.push('b'));
    history.pushState({},'','#one');stopA();history.pushState({},'','#two');stopB();history.pushState({},'','#three');
    return {seen,restored:history.pushState===original};
  });
  assert.deepEqual(result,{seen:['a','b','b'],restored:true});
});

test('Dropper and SHIFT coordinate distinct launcher cells on the same page', async t => {
  const browser=await chromium.launch();t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.addInitScript(()=>{window.GM_getValue=(_key,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=options=>options.onerror?.({status:0});});
  await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><main>Fixture page</main></body></html>'}):route.abort());
  await page.goto('https://www.twitch.tv/core-fixture');
  const repos=path.resolve(__dirname,'../..');
  await page.addScriptTag({content:fs.readFileSync(path.join(repos,'Dropper/dropper.user.js'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(repos,'SHIFT/shift.user.js'),'utf8')});
  await page.waitForFunction(()=>document.querySelector('[data-product-id="dropper"]')?.dataset.launcherReservedRows && document.querySelector('[data-product-id="shift"]')?.dataset.launcherSlot);
  const slots=await page.evaluate(()=>{
    const dropper=document.querySelector('[data-product-id="dropper"]');const shift=document.querySelector('[data-product-id="shift"]');
    return {reserved:Number(dropper.dataset.launcherReservedRows),dropper:Number(dropper.dataset.launcherSlot),shift:Number(shift.dataset.launcherSlot)};
  });
  assert.equal(slots.dropper,0);assert.ok(slots.reserved>=1);assert.ok(slots.shift>=1,JSON.stringify(slots));
  const theme=await page.evaluate(async()=>{
    const dropper=document.querySelector('[data-product-id="dropper"]');
    const shift=document.querySelector('[data-product-id="shift"]');
    const cluster=dropper.shadowRoot.querySelector('#tdh-cluster');
    cluster.dataset.uiTheme='twitch';
    await new Promise(resolve=>setTimeout(resolve,0));
    const owned={owner:shift.dataset.expThemeOwner,hidden:shift.dataset.expThemeDeprioritized,theme:shift.dataset.uiTheme};
    cluster.dataset.uiTheme='ember';
    await new Promise(resolve=>setTimeout(resolve,0));
    const changed=shift.dataset.uiTheme;
    const warmSurface=getComputedStyle(shift.shadowRoot.querySelector('[data-exp-part="dock"]')).backgroundImage;
    dropper.remove();
    document.dispatchEvent(new CustomEvent('exp-core:coordination',{detail:{type:'launcher-removed',productId:'dropper'}}));
    return {owned,changed,warmSurface,restored:{owner:shift.dataset.expThemeOwner,hidden:shift.dataset.expThemeDeprioritized,theme:shift.dataset.uiTheme}};
  });
  assert.deepEqual(theme.owned,{owner:'dropper',hidden:'1',theme:'twitch'});
  assert.equal(theme.changed,'ember');
  assert.match(theme.warmSurface,/linear-gradient/);
  assert.equal(theme.restored.owner,'shift');assert.equal(theme.restored.hidden,'0');
});
