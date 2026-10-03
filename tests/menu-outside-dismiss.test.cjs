'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');

async function mount(t, productOptions = '') {
  const browser=await chromium.launch();t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  await page.setContent('<body style="margin:0"><main style="height:800px">Outside the menu</main></body>');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8')+';window.testCore=ExtraPotionsCore;'});
  await page.evaluate(extra=>{
    const select=document.createElement('select');select.innerHTML='<option>a</option><option>b</option>';
    window.keep=false;
    window.product=testCore.createProduct({id:'test-product',name:'Test',version:'1.0.0',artwork:'https://example.invalid/icon.svg',
      sections:[{id:'one',label:'One',render:()=>select}],getSettings:()=>({menuAutoClose:false}),
      ...(extra==='keep'?{keepOpen:()=>window.keep}:{})});
    window.product.open();window.select=select;
  },productOptions);
  return page;
}
const isOpen=page=>page.evaluate(()=>!window.product.panel.hidden);

test('a product menu closes when the viewer presses outside it', async t=>{
  const page=await mount(t);
  assert.equal(await isOpen(page),true);
  await page.mouse.click(40,40);
  assert.equal(await isOpen(page),false);
});

test('pressing inside the menu or on its launcher does not close it', async t=>{
  const page=await mount(t);
  const box=await page.evaluate(()=>{const r=window.product.panel.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+20};});
  await page.mouse.click(box.x,box.y);
  assert.equal(await isOpen(page),true);
});

test('a focused select and a product keepOpen hook both hold the menu open', async t=>{
  const page=await mount(t,'keep');
  await page.evaluate(()=>{window.product.shadow.querySelector('[data-section="one"]')?.click();window.select.focus();});
  await page.mouse.click(40,40);
  assert.equal(await isOpen(page),true,'native option lists render outside the page');
  await page.evaluate(()=>{window.select.blur();window.keep=true;});
  await page.mouse.click(40,40);
  assert.equal(await isOpen(page),true,'keepOpen holds the menu open');
  await page.evaluate(()=>{window.keep=false;});
  await page.mouse.click(40,40);
  assert.equal(await isOpen(page),false);
});
