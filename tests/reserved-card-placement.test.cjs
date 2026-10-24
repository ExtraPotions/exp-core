'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('a reserved card in a Twitch site slot never moves to avoid itself',async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0"><nav data-a-target="top-nav-container" style="position:fixed;top:0;left:0;right:0;height:50px"><div class="top-nav__menu" style="display:flex;align-items:center;height:50px"><div style="width:100px">Logo</div><div style="flex:1;display:flex;justify-content:center"><input type="search" style="width:200px"><button aria-label="Search Button">Search</button></div><div style="display:flex;padding:0 8px"><button data-a-target="user-menu-toggle" style="width:32px;height:32px">User</button></div></div></nav>'}));await page.goto('https://www.twitch.tv/');
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8')+'\nwindow.core=ExtraPotionsCore;'});
  await page.evaluate(()=>{const p=core.createProduct({id:'dropper',name:'Dropper',version:'1.0.0',sections:[{id:'settings',label:'Settings',render:()=>document.createElement('div')}]});window.product=p;const card=document.createElement('div');card.id='test-card';card.dataset.expReserved='1';card.style.cssText='position:fixed;width:252px;height:137px;pointer-events:auto;background:#18181b';p.shadow.append(card);});
  await page.waitForFunction(()=>document.querySelector('[data-exp-product-launcher]')?.shadowRoot.querySelector('[data-exp-part=launcher]')&& Math.abs(document.querySelector('[data-exp-product-launcher]').shadowRoot.querySelector('[data-exp-part=launcher]').getBoundingClientRect().top-5)<=0.125);
  const coordinates=await page.evaluate(async()=>{const card=product.shadow.getElementById('test-card'),values=[];for(let i=0;i<12;i++){core.placeNotice(product.host,card);await new Promise(requestAnimationFrame);values.push(card.getBoundingClientRect().top);}return values;});
  assert.equal(new Set(coordinates).size,1,JSON.stringify(coordinates));
  await page.evaluate(()=>{const other=document.createElement('div');other.dataset.expReserved='1';other.style.cssText='position:fixed;right:8px;top:58px;width:252px;height:40px';product.shadow.append(other);});
  const cleared=await page.evaluate(()=>{const card=product.shadow.getElementById('test-card');return core.placeNotice(product.host,card);});assert.ok(cleared.top>=106);
});
