'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

test('dragging a launcher moves the launcher group; Shift+drag reorders it',async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route('**/*',route=>route.request().isNavigationRequest()
    ? route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><main>Drag fixture</main></body></html>'})
    : route.abort());
  await page.goto('https://core-drag.test/');
  await page.addScriptTag({content:source});
  await page.evaluate(()=>{
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
    window.products=['dropper','shift','prisma','ward'].map((id,index)=>ExtraPotionsCore.createProduct({id,name:id,version:'3.3.2',artwork,theme:theme(id),sections:[],priority:[90,100,80,60][index]}));
  });
  await page.waitForTimeout(40);
  const boxes=()=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(h=>{const r=h.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher').getBoundingClientRect();return[h.dataset.productId,{slot:Number(h.dataset.launcherSlot),x:r.left+r.width/2,y:r.top+r.height/2}];})));
  const drag=async(from,dx,dy,shift=false)=>{
    if(shift)await page.keyboard.down('Shift');
    await page.mouse.move(from.x,from.y);await page.mouse.down();
    for(let step=1;step<=10;step++)await page.mouse.move(from.x+dx*step/10,from.y+dy*step/10);
    await page.mouse.up();
    if(shift)await page.keyboard.up('Shift');
    await page.waitForTimeout(40);
  };

  const before=await boxes();
  await drag(before.shift,0,-300);
  const moved=await boxes();
  for(const id of Object.keys(before)){
    assert.equal(moved[id].slot,before[id].slot,`plain drag keeps ${id} in its slot`);
    assert.ok(Math.abs(moved[id].y-(before[id].y-300))<2,`plain drag moves ${id} with the group: ${JSON.stringify({before:before[id],moved:moved[id]})}`);
    assert.ok(Math.abs(moved[id].x-before[id].x)<1,`the group stays on the right edge for ${id}`);
  }
  assert.equal(await page.evaluate(()=>Number(localStorage.getItem('exp:v3:launcher-grid-delta'))),-300);

  await drag(moved.shift,-56,0,true);
  const reordered=await boxes();
  assert.notEqual(reordered.shift.slot,moved.shift.slot,'Shift+drag reorders the launcher');
  assert.ok(Math.abs(reordered.shift.y-moved.shift.y)<2,'Shift+drag does not move the group');

  await drag(reordered.shift,0,-5000);
  const top=await boxes();
  assert.ok(Math.min(...Object.values(top).map(box=>box.y))>0,'the group stays inside the window');

  await page.evaluate(()=>window.products.forEach(product=>product.destroy()));
});
