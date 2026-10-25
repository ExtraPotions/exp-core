'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
test('a tall menu respects the flyout clearance despite its stylesheet viewport limit',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:600}});
 await page.route('**/*',r=>r.fulfill({body:'<!doctype html><html><body>Fixture</body></html>',contentType:'text/html'}));await page.goto('https://core.fixture.test/');await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8')+'\nwindow.core=ExtraPotionsCore;'});
 await page.evaluate(()=>{window.products=['dropper','prisma','ward'].map(id=>core.createProduct({id,name:id,version:'1.0.0',sections:[{id:'settings',label:'Settings',render:()=>{const content=document.createElement('div');content.style.height='900px';content.textContent='Tall settings fixture';return content;}}]}));for(const p of products)core.injectStyle(p.shadow,'[data-exp-part=dock]{max-height:calc(100dvh - 16px)!important}');});
 for(const [size,width]of [['standard',324],['compact',304],['mini',280]]){
  await page.evaluate(size=>{localStorage.setItem('exp:suite:menu-size',size);document.dispatchEvent(new CustomEvent('exp-core:menu-size',{detail:size}));const p=products[0];if(document.documentElement.dataset.expFlyoutOpen!=='1')p.host.shadowRoot.querySelector('[data-exp-part=flyout-hub]').click();p.open();p.shadow.querySelector('[data-section=settings]').click();},size);
  await page.waitForTimeout(120);
  const layout=await page.evaluate(()=>{const p=products[0],menu=p.panel.getBoundingClientRect();return {menu:menu.toJSON(),launchers:products.map(p=>p.host.shadowRoot.querySelector('[data-exp-part=launcher]').getBoundingClientRect().toJSON())};});
  assert.equal(layout.menu.width,width);assert(layout.menu.top>=8);assert(layout.menu.bottom<=600-8);
  for(const b of layout.launchers)assert(layout.menu.bottom+7<=b.top||layout.menu.right+7<=b.left||layout.menu.left>=b.right+7,'menu must leave clearance: '+JSON.stringify(layout));
  await page.evaluate(()=>products[0].close());
 }
});
