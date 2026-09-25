'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
for(const viewport of [{width:1280,height:900},{width:360,height:640}])test(`${viewport.width}px: Dropper progress opens inward at either anchor without moving peers out of the three-column grid`,async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport});
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html',body:'<main>Grid fixture</main>'}):r.abort());await page.goto('https://www.twitch.tv/fixture');
 await page.evaluate(()=>{window.GM_getValue=(_k,d)=>d;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=()=>{};});
 for(const name of ['Dropper','WARD','PRISMA','SHIFT'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../..',name,`${name.toLowerCase()}.user.js`),'utf8')});
 await page.waitForSelector('#exp-shift-root',{state:'attached'});
 const boxes=()=>page.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}};const hosts=[...document.querySelectorAll('[data-exp-product-launcher="1"]')];return {launchers:hosts.map(h=>({id:h.dataset.productId,row:Number(h.dataset.launcherRow),column:Number(h.dataset.launcherColumn),...rect(h.shadowRoot.querySelector('.launcher,.ward-launcher,#tdh-settings-launcher'))})),card:rect(document.querySelector('#tdh-root').shadowRoot.querySelector('#tdh-drop-card'))};});
 for(const anchor of ['bottom','top']){
  await page.evaluate(anchor=>{localStorage.setItem('exp:v3:launcher-grid-delta',anchor==='top'?String(-(innerHeight-68)):'0');document.dispatchEvent(new CustomEvent('exp-core:coordination',{detail:{type:'launcher-grid-moved'}}));},anchor);
  await page.waitForTimeout(100);
  const state=await boxes(),dropper=state.launchers.find(n=>n.id==='dropper');
  for(const l of state.launchers){assert.ok(Math.abs(l.top-(dropper.top+(anchor==='top'?1:-1)*l.row*56))<1,`${anchor} ${JSON.stringify(state)}`);assert.ok(Math.abs(l.right-(dropper.right-l.column*56))<1);}
  assert.ok(state.card.right-state.card.left>=180);
  assert.equal(new Set(state.launchers.filter(n=>n.row===0).map(n=>n.column)).size,3);
  if(anchor==='bottom')assert.ok(state.card.bottom<=Math.min(...state.launchers.map(n=>n.top))-7,JSON.stringify(state));
  else assert.ok(state.card.top>=Math.max(...state.launchers.map(n=>n.bottom))+7,JSON.stringify(state));
  if(process.env.EXP_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.EXP_CAPTURE_DIR,`dropper-${viewport.width}-${anchor}.png`)});
  const before=await boxes();await page.locator('#tdh-root #tdh-settings-launcher').click();await page.mouse.move(0,0);await page.waitForTimeout(200);
  const after=await boxes();for(const a of after.launchers){const b=before.launchers.find(n=>n.id===a.id);assert.equal(a.row,b.row);assert.equal(a.column,b.column);assert.ok(Math.abs((a.top+a.bottom)-(b.top+b.bottom))<1);assert.ok(Math.abs((a.left+a.right)-(b.left+b.right))<1);}
  await page.locator('#tdh-root #tdh-settings-launcher').click();
 }
});
