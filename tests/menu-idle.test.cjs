'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('an idle shared menu does not repeatedly replace its chevron text',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();await page.setContent('<body>Idle menu</body>');
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8')+';window.testCore=ExtraPotionsCore;'});
 const result=await page.evaluate(async()=>{
  const product=testCore.createProduct({id:'test-product',name:'Test',version:'1.0.0',artwork:'https://example.invalid/icon.svg',sections:[{id:'one',label:'One',render:()=>document.createElement('p')}],getSettings:()=>({menuAutoClose:false})});
  product.launcher.click();product.shadow.querySelector('[data-section="one"]').click();
  await new Promise(r=>setTimeout(r,150));let count=0;const observer=new MutationObserver(records=>{count+=records.filter(r=>r.type==='childList').length;});observer.observe(product.panel,{childList:true,subtree:true});
  await new Promise(r=>setTimeout(r,200));observer.disconnect();product.destroy();return count;
 });assert.equal(result,0,'idle menu must stop scheduling its own mutation work');
});
