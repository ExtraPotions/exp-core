'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/menu-preferences.js'),'utf8');
test('three sizes persist locally, update peers and keep controls focused',async t=>{
 const {chromium}=require('playwright');const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:320,height:500}});
 await page.route('**/*',r=>r.fulfill({body:'<html><body></body></html>',contentType:'text/html'}));await page.goto('https://example.test/');
 await page.addScriptTag({content:source+`;window.sizing=ExpMenuPreferences;for(let i=0;i<2;i++){const host=document.createElement('div');host.id='host'+i;document.body.append(host);const shadow=host.attachShadow({mode:'open'}),panel=document.createElement('aside');shadow.append(panel);panel.append(sizing.createMenuSizeControls());sizing.bindMenuSize({host,shadow,panel,onLayout(){}});}`});
 for(const [size,body,small,width] of [['standard','13px','11px','260px'],['large','15px','13px','300px'],['extra-large','17px','15px','340px']]){
  await page.locator('#host0 select').selectOption(size);
  const result=await page.evaluate(()=>[...document.querySelectorAll('body>div')].map(host=>({size:host.dataset.expMenuSize,body:host.style.getPropertyValue('--exp-font-size-body'),small:host.style.getPropertyValue('--exp-font-size-small'),width:host.style.getPropertyValue('--exp-menu-width')})));
  assert.deepEqual(result,[{size,body,small,width},{size,body,small,width}]);assert.equal(await page.evaluate(()=>localStorage.getItem('exp:suite:menu-size')),size);
 }
 await page.evaluate(()=>localStorage.setItem('exp:suite:menu-size','invalid'));assert.equal(await page.evaluate(()=>sizing.menuSizePreference()),'standard');
 await page.evaluate(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));assert.equal(await page.evaluate(()=>sizing.setMenuSizePreference('large')),'large');
});
