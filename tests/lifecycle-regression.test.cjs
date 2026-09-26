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

test('Dropper and SHIFT Core fixtures coordinate distinct launcher cells and shared theme ownership', async t => {
  const browser=await chromium.launch();t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.setContent('<!doctype html><html><body><main>Fixture page</main></body></html>');
  await page.addScriptTag({content:source});
  const result=await page.evaluate(async()=>{
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const makeTheme=(id,accent)=>({id,name:id,swatch:accent,bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent,accent2:accent,skin:accent,skinVertical:accent});
    const dropper=ExtraPotionsCore.createProduct({id:'dropper',name:'Dropper',version:'3.3.2',artwork,theme:makeTheme('dropper','#9147ff'),sections:[],priority:90});
    const shift=ExtraPotionsCore.createProduct({id:'shift',name:'Shift',version:'3.3.2',artwork,theme:makeTheme('shift','#3563a3'),sections:[],priority:100});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const slots={reserved:Number(dropper.host.dataset.launcherReservedRows||0),dropper:Number(dropper.host.dataset.launcherSlot),shift:Number(shift.host.dataset.launcherSlot)};
    const owned={owner:shift.host.dataset.expThemeOwner,hidden:shift.host.dataset.expThemeDeprioritized,theme:shift.host.dataset.uiTheme};
    ExtraPotionsCore.applyTheme(dropper.host,'ember');
    await new Promise(resolve=>setTimeout(resolve,0));
    const changed=shift.host.dataset.uiTheme;
    const warmSurface=getComputedStyle(shift.panel).backgroundImage;
    dropper.destroy();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const restored={owner:shift.host.dataset.expThemeOwner,hidden:shift.host.dataset.expThemeDeprioritized,theme:shift.host.dataset.uiTheme};
    shift.destroy();
    return {slots,owned,changed,warmSurface,restored};
  });
  assert.equal(result.slots.dropper,0);
  assert.ok(result.slots.shift>=1,JSON.stringify(result.slots));
  assert.deepEqual(result.owned,{owner:'dropper',hidden:'1',theme:'dropper'});
  assert.equal(result.changed,'ember');
  assert.match(result.warmSurface,/linear-gradient/);
  assert.equal(result.restored.owner,'shift');
  assert.equal(result.restored.hidden,'0');
});
