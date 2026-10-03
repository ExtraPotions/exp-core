'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8');
for(const fallback of [false,true]){
 test(`registered launcher isolates its backdrop and cleans up (fallback=${fallback})`,async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
  await page.setContent('<style>::backdrop{background:white!important;backdrop-filter:blur(20px)!important;pointer-events:auto!important}</style><button id="site">Site action</button><dialog>Site dialog</dialog>');
  if(fallback)await page.evaluate(()=>{window.CSSStyleSheet=undefined});
  await page.addScriptTag({content:`${bundle}\nwindow.testCore=ExtraPotionsCore;`});
  await page.evaluate(()=>{
   const host=document.createElement('div');host.id='launcher-test';host.attachShadow({mode:'open'});document.body.append(host);
   window.disposeLauncher=testCore.registerLauncher(host,{productId:'shift'});
  });
  const result=await page.locator('#launcher-test').evaluate(host=>({open:host.matches(':popover-open'),display:getComputedStyle(host,'::backdrop').display,pointer:getComputedStyle(host,'::backdrop').pointerEvents}));
  assert.deepEqual(result,{open:true,display:'none',pointer:'none'});
  await page.locator('#site').click();
  await page.evaluate(()=>document.querySelector('dialog').showModal());
  assert.equal(await page.locator('dialog').evaluate(n=>getComputedStyle(n,'::backdrop').backgroundColor),'rgb(255, 255, 255)');
  await page.evaluate(()=>{document.querySelector('dialog').close();disposeLauncher()});
  assert.equal(await page.locator('#launcher-test').evaluate(n=>!!n.shadowRoot.querySelector('[data-exp-launcher-backdrop]')),false);
 });
}
