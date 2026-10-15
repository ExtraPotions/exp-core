'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
// The release before the flyout. For about a day after release a product may still carry it next to products on
// the new Core; the page must fall back to the grid without losing a launcher.
const root=path.join(__dirname,'..');
const legacy=fs.readFileSync(path.join(__dirname,'fixtures','exp-core-3.8.5.js'),'utf8');
const current=fs.readFileSync(path.join(root,'dist','exp-core.js'),'utf8');
const loader=(bundle,ids)=>`(()=>{\n${bundle}\nconst theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
window.products=window.products||{};for(const id of ${JSON.stringify(ids)})window.products[id]=ExtraPotionsCore.createProduct({id,name:id,version:'1.0.0',artwork:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>',theme:theme(id),sections:[]});\n})();\n`;

async function page(t){
  const browser=await chromium.launch();t.after(()=>browser.close());
  const p=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));t.after(()=>assert.deepEqual(errors,[],'no page errors'));
  await p.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<!doctype html><body><main>Mixed</main></body>'}):r.abort());
  await p.goto('https://mixed-core.test/');
  return p;
}
const state=p=>p.evaluate(()=>{
  const hosts=[...document.querySelectorAll('[data-exp-product-launcher="1"]')];
  return{hubs:hosts.filter(h=>h.shadowRoot.querySelector('[data-exp-part="flyout-hub"],[data-exp-part="flyout-panel"]')).length,roles:hosts.filter(h=>h.dataset.expFlyoutRole).length,
    launchers:Object.fromEntries(hosts.map(h=>{const l=h.shadowRoot.querySelector('[data-exp-part="launcher"]');const r=l.getBoundingClientRect();const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return[h.dataset.productId,{size:Math.round(r.width),visible:getComputedStyle(l).visibility!=='hidden',onTop:top===h}];}))};
});
const settle=p=>p.waitForTimeout(500);
function assertGrid(s,ids,label){
  assert.equal(s.hubs,0,`${label}: no flyout launcher`);assert.equal(s.roles,0,`${label}: no flyout roles`);
  assert.deepEqual(Object.keys(s.launchers).sort(),[...ids].sort(),`${label}: no launcher lost`);
  for(const [id,l] of Object.entries(s.launchers))assert.deepEqual(l,{size:48,visible:true,onTop:true},`${label}: ${id} is a full-size, reachable grid launcher`);
}

for(const order of [['new','old'],['old','new']]){
  test(`a 3.8.5 product next to new-Core products keeps everyone on the grid (${order.join(' then ')})`,async t=>{
    const p=await page(t);
    for(const which of order)await p.addScriptTag({content:which==='new'?loader(current,['dropper','shift']):loader(legacy,['prisma'])});
    await settle(p);
    assertGrid(await state(p),['dropper','shift','prisma'],order.join(' then '));
    await p.evaluate(()=>window.products.shift.launcher.click());await settle(p);
    assert.equal(await p.evaluate(()=>!window.products.shift.panel.hidden),true,'a launcher still opens its menu');
  });
}

test('a late 3.8.5 product flips an open flyout back to the grid and leaves nothing behind',async t=>{
  const p=await page(t);
  await p.addScriptTag({content:loader(current,['dropper','shift'])});await settle(p);
  let s=await state(p);assert.equal(s.hubs,1,'two new-Core products share a flyout launcher');
  await p.evaluate(()=>document.querySelector('[data-product-id="dropper"]').shadowRoot.querySelector('[data-exp-part="flyout-hub"]').click());await settle(p);
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.expFlyoutOpen),'1');
  await p.addScriptTag({content:loader(legacy,['ward'])});await settle(p);
  assertGrid(await state(p),['dropper','shift','ward'],'after the late product');
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.expFlyoutOpen||''),'','the open state is cleared');
});
