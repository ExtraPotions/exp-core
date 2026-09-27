'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const helper=fs.readFileSync(path.join(__dirname,'../src/menu-arrangement.js'),'utf8');
async function fixture(t,native=false){
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();
 await page.route('**/*',r=>r.fulfill({body:'<!doctype html><body></body>',contentType:'text/html'}));await page.goto('https://fixture.test');
 await page.addScriptTag({content:helper+';window.ExpMenuArrangement=ExpMenuArrangement;'});
 await page.evaluate(native=>{
  const host=document.createElement('div');document.body.append(host);const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML='<style>aside{width:220px}section{margin:5px;border:1px solid gray} .fl-tool-header{display:flex;justify-content:space-between;width:100%;box-sizing:border-box;padding:7px 8px}.fl-tool-body:empty{height:0}</style><aside><nav></nav></aside>';
  const panel=shadow.querySelector('aside'),nav=shadow.querySelector('nav');
  for(const [key,label] of [['one','First'],['appearance','Appearance'],['system','System']]){const section=document.createElement('section');section.className='fl-tool-panel';section.innerHTML=`<${native?'div':'button'} class="fl-tool-header" data-route="${key}"><span class="fl-tool-title">${label}</span><span>▸</span></${native?'div':'button'}><div class="fl-tool-body"></div>`;nav.append(section);}
  window.panel=panel;window.resetCount=0;window.changes=0;window.arrangement=ExpMenuArrangement.mount({panel,id:'test',onChange:()=>window.changes++,resetLaunchers:()=>window.resetCount++});
 },native);
 return page;
}
test('left grips, System recovery, switches and resets work with native and normalized headers',async t=>{
 for(const native of [false,true]){
  const page=await fixture(t,native);
  assert.equal(await page.locator('[data-exp-arrange-section=system] .exp-menu-editor').count(),1);
  assert.equal(await page.locator('input[type=checkbox]').count(),0);
  const bounds=await page.locator('[data-exp-arrange-section=one]').evaluate(section=>{const grip=section.querySelector('.exp-section-grip').getBoundingClientRect(),title=section.querySelector('.fl-tool-title').getBoundingClientRect();return {left:grip.left,right:grip.right,title:title.left};});
  assert.ok(bounds.right<=bounds.title);assert.ok(bounds.left<bounds.title);
  await page.locator('summary').click();assert.equal(await page.getByRole('switch',{name:'Show System'}).count(),0);
  await page.getByRole('switch',{name:'Show Appearance'}).click();assert.equal(await page.locator('[data-exp-arrange-section=appearance]').isVisible(),false);
  await page.evaluate(()=>{const body=panel.querySelector('[data-exp-arrange-section=system] .fl-tool-body');body.replaceChildren();arrangement.update();});
  assert.equal(await page.locator('.exp-menu-editor').count(),1);
  await page.getByRole('button',{name:'Reset menu arrangement',exact:true}).click();assert.equal(await page.locator('[data-exp-arrange-section=appearance]').isVisible(),true);
  await page.getByRole('button',{name:'Reset launcher arrangement',exact:true}).click();assert.equal(await page.evaluate(()=>resetCount),1);
  await page.evaluate(()=>arrangement.destroy());assert.equal(await page.locator('.exp-section-grip,.exp-menu-editor').count(),0);
 }
});
test('keyboard and pointer order persist, cancellation rolls back, storage updates restore System',async t=>{
 const page=await fixture(t);const grip=page.getByRole('button',{name:'Rearrange First'});
 await grip.focus();await page.keyboard.press('Alt+ArrowDown');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('exp:v3:menu-order:test'))),['appearance','one','system']);
 const origin=await grip.boundingBox();const target=await page.locator('[data-exp-arrange-section=system]').boundingBox();
 await page.mouse.move(origin.x+8,origin.y+8);await page.mouse.down();await page.mouse.move(target.x+8,target.y+target.height+10,{steps:5});await page.mouse.up();
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('exp:v3:menu-order:test')))).at(-1),'one');
 const before=await page.evaluate(()=>[...panel.querySelectorAll('[data-exp-arrange-section]')].map(n=>n.dataset.expArrangeSection));
 await grip.dispatchEvent('pointerdown',{button:0,pointerId:88,clientY:100});
 await page.evaluate(()=>{window.dispatchEvent(new PointerEvent('pointermove',{pointerId:88,clientY:0,cancelable:true}));window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:88}));});
 assert.deepEqual(await page.evaluate(()=>[...panel.querySelectorAll('[data-exp-arrange-section]')].map(n=>n.dataset.expArrangeSection)),before);
 await page.evaluate(()=>{localStorage.setItem('exp:v3:menu-hidden:test','["system","appearance"]');window.dispatchEvent(new StorageEvent('storage',{key:'exp:v3:menu-hidden:test'}));});
 assert.equal(await page.locator('[data-exp-arrange-section=system]').isVisible(),true);
 assert.equal(await page.locator('[data-exp-arrange-section=appearance]').isVisible(),false);
});
test('bundled core uses the canonical arrangement helper',()=>{
 assert.ok(fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8').replace(/\r\n/g,'\n').includes(helper.replace(/\r\n/g,'\n').trim()));
});
test('sibling Dropper build uses the canonical arrangement helper',{skip:!fs.existsSync(path.join(__dirname,'../../Dropper/src/dropper.user.js'))&&'Requires sibling Dropper checkout'},()=>{
 for(const file of ['../../Dropper/src/dropper.user.js','../../Dropper/src/shared-menu-arrangement.js']) assert.ok(fs.readFileSync(path.join(__dirname,file),'utf8').replace(/\r\n/g,'\n').includes(helper.replace(/\r\n/g,'\n').trim()),file);
});
