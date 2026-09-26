'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

for(const viewport of [{width:1280,height:900},{width:360,height:640}])test(`${viewport.width}px: Core launcher grid stays stable when a Dropper-style progress surface toggles`,async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport});
  await page.route('**/*',route=>route.request().isNavigationRequest()
    ? route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><main>Grid fixture</main></body></html>'})
    : route.abort());
  await page.goto('https://core-grid.test/');
  await page.addScriptTag({content:source});
  await page.evaluate(()=>{
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
    window.products=['dropper','shift','prisma','ward'].map((id,index)=>ExtraPotionsCore.createProduct({id,name:id,version:'3.3.2',artwork,theme:theme(id),sections:[],priority:[90,100,80,60][index]}));
    const dropper=window.products[0];
    const progress=document.createElement('div');
    progress.id='progress-fixture';
    progress.style.cssText='position:fixed;width:220px;height:112px;right:68px;top:120px;pointer-events:auto;background:#18181d';
    dropper.shadow.append(progress);
  });
  const boxes=()=>page.evaluate(()=>[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(h=>{const n=h.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher');const r=n.getBoundingClientRect();return{id:h.dataset.productId,row:Number(h.dataset.launcherRow),column:Number(h.dataset.launcherColumn),top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
  for(const anchor of ['bottom','top']){
    await page.evaluate(anchor=>{localStorage.setItem('exp:v3:launcher-grid-delta',anchor==='top'?String(-(innerHeight-68)):'0');document.dispatchEvent(new CustomEvent('exp-core:coordination',{detail:{type:'launcher-grid-moved'}}));},anchor);
    await page.waitForTimeout(80);
    const before=await boxes(),dropper=before.find(n=>n.id==='dropper');
    assert.equal(new Set(before.filter(n=>n.row===0).map(n=>n.column)).size,3);
    for(const l of before){assert.ok(Math.abs(l.top-(dropper.top+(anchor==='top'?1:-1)*l.row*56))<1,`${anchor} ${JSON.stringify(before)}`);assert.ok(Math.abs(l.right-(dropper.right-l.column*56))<1);}
    await page.evaluate(()=>{const p=document.querySelector('[data-product-id="dropper"]').shadowRoot.querySelector('#progress-fixture');p.hidden=!p.hidden;});
    await page.waitForTimeout(40);
    const after=await boxes();
    assert.deepEqual(after,before,'product-local progress visibility must not move Core launcher cells');
    const hits=await page.evaluate(()=>[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(host=>{const launcher=host.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher'),box=launcher.getBoundingClientRect(),hit=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return{id:host.dataset.productId,hit:hit?.dataset?.productId||hit?.id||null};}));
    for(const hit of hits)assert.equal(hit.hit,hit.id,JSON.stringify(hits));
  }
  await page.evaluate(()=>window.products.forEach(product=>product.destroy()));
});
