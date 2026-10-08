'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8');
const source=`(()=>{${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;})();`;
async function setup(t){const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:320,height:800}});await page.setContent('<div id="menu" style="width:260px;--theme-text:#eee;--theme-accent:#9864dc;--theme-line:#3c2850;--theme-inset:#110b1b;--theme-panel:#171025"></div>');await page.addScriptTag({content:source});return page;}

test('Dropper progress stays above every tab and restores its position on teardown',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="tdh-drops-body"><div class="badge-only-progress-slot"><button id="pause">Pause</button></div><button id="claim">Claim</button><button id="tdh-open-campaigns">Campaigns</button><details id="tdh-claim-history-panel"><summary>History</summary><p>Recent claims</p></details></div>';window.pauses=0;panel.querySelector('#pause').onclick=()=>pauses++;window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'dropper'});});
 for(const label of ['Progress','Campaigns','History']){
  await page.getByRole('tab',{name:label,exact:true}).click();
  assert.equal(await page.locator('#pause').isVisible(),true);
  assert.equal(await page.locator('.badge-only-progress-slot').evaluate(n=>n.nextElementSibling?.hasAttribute('data-exp-submenu-tabs')),true);
 }
 await page.getByRole('button',{name:'Pause',exact:true}).click();assert.equal(await page.evaluate(()=>pauses),1);
 await page.evaluate(()=>{tabs.update();tabs.destroy();});
 assert.equal(await page.locator('#tdh-drops-body').evaluate(n=>n.firstElementChild.className),'badge-only-progress-slot');
 assert.equal(await page.getByRole('tab').count(),0);
 assert.equal(await page.locator('#claim').count(),1);
});
test('compact tabs preserve controls, lazily populate disclosures, and support keyboard navigation',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="advanced"><details><summary>Language</summary></details><details><summary>Sites</summary><button id="save">Save site</button></details></div>';const language=panel.querySelector('details');language.addEventListener('toggle',()=>{if(language.open&&!language.querySelector('input')){const input=document.createElement('input');input.setAttribute('aria-label','Search catalog');language.append(input);}});window.clicks=0;panel.querySelector('#save').addEventListener('click',()=>clicks++);window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'prisma'});});
 await page.getByRole('textbox',{name:'Search catalog'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Save site'}).isVisible(),false);
 await page.getByRole('tab',{name:'Language',exact:true}).focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.getByRole('tab',{name:'Sites',exact:true}).getAttribute('aria-selected'),'true');
 await page.getByRole('button',{name:'Save site'}).click();assert.equal(await page.evaluate(()=>clicks),1);
 await page.keyboard.press('Home');
 await page.getByRole('tab',{name:'Sites',exact:true}).focus();await page.keyboard.press('Home');assert.equal(await page.getByRole('tab',{name:'Language',exact:true}).getAttribute('aria-selected'),'true');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>tabs.destroy());assert.equal(await page.getByRole('tab').count(),0);assert.equal(await page.locator('summary').count(),2);
});
test('selection survives replacement, while refreshes do not duplicate tabs or reset edits',async t=>{
 const page=await setup(t);await page.evaluate(()=>{const panel=document.querySelector('#menu');window.paint=()=>{panel.innerHTML='<div class="fl-tool-body" id="appearance"><section class="group"><h3>Accessibility</h3><button>Reduce motion</button></section><details><summary>Highlight style</summary><select aria-label="Style"><option>Gradient</option><option>Underline</option></select></details></div>';};paint();window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'prisma'});});
 await page.getByRole('tab',{name:'Style',exact:true}).click();await page.getByLabel('Style',{exact:true}).selectOption('Underline');
 await page.evaluate(()=>{tabs.update();tabs.update();});assert.equal(await page.getByRole('tablist').count(),1);assert.equal(await page.getByLabel('Style',{exact:true}).inputValue(),'Underline');
 await page.evaluate(()=>{paint();tabs.update();});assert.equal(await page.getByRole('tab',{name:'Style',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.getByRole('tablist').count(),1);
});
test('closed menus do not populate lazy tabs or open unrelated eligibility disclosures',async t=>{
 const page=await setup(t);await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="advanced" hidden><details><summary>Language</summary></details><details><summary>Sites</summary></details><details class="eligibility-chip"><summary>Eligibility</summary><p>Unverified</p></details></div>';window.populates=0;panel.querySelector('details').addEventListener('toggle',event=>{if(event.target.open)populates++;});window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'prisma'});});
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>populates),0);assert.equal(await page.locator('.eligibility-chip').evaluate(n=>n.open),false);
 await page.evaluate(()=>{document.querySelector('#advanced').hidden=false;});
 await page.getByRole('tab',{name:'Language',exact:true}).click();await page.waitForFunction(()=>populates===1);
 assert.equal(await page.locator('.eligibility-chip').evaluate(n=>n.open),false);
});
