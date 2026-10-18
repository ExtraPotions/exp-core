'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8');
const source=`(()=>{${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;})();`;
async function setup(t){const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:320,height:800}});await page.setContent('<div id="menu" style="width:260px;--theme-text:#eee;--theme-muted:#aaa;--theme-accent:#9864dc;--theme-line:#3c2850;--theme-inset:#110b1b;--theme-panel:#171025"></div>');await page.addScriptTag({content:source});return page;}
const row=(page,name)=>page.locator('.exp-submenu-row').filter({hasText:name});
const back=page=>page.getByRole('button',{name:'Back',exact:true});

test('Dropper progress stays above home and every detail view, and restores its position on teardown',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="tdh-drops-body"><div class="badge-only-progress-slot"><button id="pause">Pause</button></div><button id="claim">Claim</button><details class="campaign-manager" id="tdh-open-campaigns"><summary><span class="campaign-manager-title">Open Campaigns</span></summary><p>Games</p></details><details id="tdh-claim-history-panel"><summary>History</summary><p>Recent claims</p></details></div>';window.pauses=0;panel.querySelector('#pause').onclick=()=>pauses++;window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'dropper'});});
 assert.equal(await page.locator('#claim').isVisible(),true,'loose controls stay on the home view');
 assert.equal(await page.getByRole('tab').count(),0,'no second tab row');
 assert.equal(await page.locator('#tdh-open-campaigns').isVisible(),true,'campaign ordering remains on home');
 for(const label of ['History']){
  await row(page,label).click();
  assert.equal(await page.locator('#pause').isVisible(),true);
  assert.equal(await page.locator('#claim').isVisible(),false);
  assert.equal(await page.locator('.badge-only-progress-slot').evaluate(n=>n.nextElementSibling?.hasAttribute('data-exp-submenu-tabs')),true);
  await back(page).click();
 }
 await page.getByRole('button',{name:'Pause',exact:true}).click();assert.equal(await page.evaluate(()=>pauses),1);
 await page.evaluate(()=>{tabs.update();tabs.destroy();});
 assert.equal(await page.locator('#tdh-drops-body').evaluate(n=>n.firstElementChild.className),'badge-only-progress-slot');
 assert.equal(await page.locator('.exp-submenu-row').count(),0);
 assert.equal(await page.locator('#claim').count(),1);
 assert.equal(await page.locator('summary').count(),2);
});

test('rows open a detail view that lazily populates, and Back returns focus to the row',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="advanced"><details><summary>Language</summary></details><details><summary>Sites</summary><button id="save">Save site</button></details></div>';const language=panel.querySelector('details');language.addEventListener('toggle',()=>{if(language.open&&!language.querySelector('input')){const input=document.createElement('input');input.setAttribute('aria-label','Search catalog');language.append(input);}});window.clicks=0;panel.querySelector('#save').addEventListener('click',()=>clicks++);window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'prisma'});});
 assert.equal(await row(page,'Language').isVisible(),true);
 assert.equal(await row(page,'Sites').isVisible(),true);
 assert.equal(await page.getByRole('textbox',{name:'Search catalog'}).count(),0,'closed detail views stay unpopulated');
 assert.equal(await page.getByRole('button',{name:'Save site'}).isVisible(),false);
 await row(page,'Language').click();
 await page.getByRole('textbox',{name:'Search catalog'}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Language'}).isVisible(),true);
 assert.equal(await back(page).evaluate(n=>n===n.getRootNode().activeElement),true,'focus moves to Back');
 assert.equal(await row(page,'Sites').isVisible(),false);
 await back(page).click();
 assert.equal(await row(page,'Language').evaluate(n=>n===document.activeElement),true,'focus returns to the row');
 await row(page,'Sites').click();
 await page.getByRole('button',{name:'Save site'}).click();assert.equal(await page.evaluate(()=>clicks),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>tabs.destroy());assert.equal(await page.locator('.exp-submenu-row').count(),0);assert.equal(await page.locator('summary').count(),2);
});

test('Escape leaves a detail view without closing the menu, and still reaches the page on the home view',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="advanced"><button id="loose">Loose</button><details><summary>Sites</summary><button id="save">Save site</button><select id="pick" aria-label="Pick"><option>One</option><option>Two</option></select></details></div>';window.closes=0;document.addEventListener('keydown',e=>{if(e.key==='Escape')closes++;});window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'prisma'});});
 await row(page,'Sites').click();
 await page.getByRole('button',{name:'Save site'}).focus();await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>closes),0,'the menu-level Escape handler does not run');
 assert.equal(await row(page,'Sites').isVisible(),true);
 assert.equal(await row(page,'Sites').evaluate(n=>n===document.activeElement),true);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>closes),1,'Escape on the home view reaches the menu handler');
});

test('the open detail view survives repaints without moving focus, and refreshes do not duplicate rows',async t=>{
 const page=await setup(t);await page.evaluate(()=>{const panel=document.querySelector('#menu');window.paint=()=>{panel.innerHTML='<div class="fl-tool-body" id="appearance"><section class="group"><h3>Accessibility</h3><button>Reduce motion</button></section><details><summary>Highlight style</summary><select aria-label="Style"><option>Gradient</option><option>Underline</option></select></details><details><summary>Menu preferences</summary><p>Size</p></details></div>';};paint();window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'prisma'});});
 assert.equal(await page.getByRole('button',{name:'Reduce motion'}).isVisible(),true,'loose sections form the home view');
 await row(page,'Style').click();await page.getByLabel('Style',{exact:true}).selectOption('Underline');
 await page.evaluate(()=>{tabs.update();tabs.update();});assert.equal(await page.locator('[data-exp-submenu-tabs]').count(),1);assert.equal(await page.locator('.exp-submenu-row').count(),2);assert.equal(await page.getByLabel('Style',{exact:true}).inputValue(),'Underline');
 await page.evaluate(()=>{document.body.focus();paint();tabs.update();});
 assert.equal(await page.getByLabel('Style',{exact:true}).isVisible(),true,'the detail view stays open after a repaint');
 assert.equal(await page.getByRole('button',{name:'Reduce motion'}).isVisible(),false);
 assert.equal(await page.evaluate(()=>document.activeElement===document.body),true,'a repaint does not move focus');
 assert.equal(await page.locator('.exp-submenu-row').count(),2);
});

test('panels keep aria-controls owners so products can reveal a control in any view',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="look"><button id="mode">Display mode</button><details><summary>Readability</summary><button id="contrast">Contrast</button></details><details><summary>Motion</summary><button id="motion">Reduce</button></details></div>';window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'shift'});
  window.reveal=id=>{const panel=document.getElementById(id).closest('.exp-submenu-tabpanel');document.querySelector(`[aria-controls="${panel.id}"]`).click();};});
 assert.equal(await page.locator('.exp-submenu-row').evaluateAll(rows=>rows.every(r=>document.getElementById(r.getAttribute('aria-controls'))?.classList.contains('exp-submenu-tabpanel'))),true);
 await page.evaluate(()=>reveal('contrast'));assert.equal(await page.locator('#contrast').isVisible(),true);
 await page.evaluate(()=>reveal('motion'));assert.equal(await page.locator('#motion').isVisible(),true);
 await page.evaluate(()=>reveal('mode'));assert.equal(await page.locator('#mode').isVisible(),true);
 assert.equal(await page.locator('#motion').isVisible(),false);
});

test('closed menus do not populate lazy detail views or open unrelated eligibility disclosures',async t=>{
 const page=await setup(t);await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div class="fl-tool-body" id="advanced" hidden><details><summary>Language</summary></details><details><summary>Sites</summary></details><details class="eligibility-chip"><summary>Eligibility</summary><p>Unverified</p></details></div>';window.populates=0;panel.querySelector('details').addEventListener('toggle',event=>{if(event.target.open)populates++;});window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'prisma'});});
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>populates),0);assert.equal(await page.locator('.eligibility-chip').evaluate(n=>n.open),false);
 await page.evaluate(()=>{document.querySelector('#advanced').hidden=false;});
 await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>populates),0,'the home view does not open detail disclosures');
 await row(page,'Language').click();await page.waitForFunction(()=>populates===1);
 assert.equal(await page.locator('.eligibility-chip').evaluate(n=>n.open),false);
});

test('non-Dropper System status stays on home while Support and Reset become rows',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');panel.innerHTML='<div data-exp-product-system="shift"><details data-exp-system-item="status"><summary>Status</summary><button id="resume">Resume</button></details><details data-exp-system-item="support"><summary>Support</summary><button>Show Diagnostics</button></details><details data-exp-system-item="reset"><summary>Reset</summary><button>Reset All Settings</button></details></div>';window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'shift'});});
 assert.deepEqual(await page.locator('.exp-submenu-row').allTextContents(),['Support','Reset']);
 assert.equal(await page.locator('[data-exp-system-item="status"]').evaluate(n=>n.open),true);
 assert.equal(await page.getByRole('button',{name:'Resume'}).isVisible(),true);
 await row(page,'Support').click();
 assert.equal(await page.getByRole('button',{name:'Resume'}).isVisible(),false);
 await back(page).click();
 assert.equal(await page.getByRole('button',{name:'Resume'}).isVisible(),true);
});

test('WARD retailer rows keep their own names and group page tools',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>{const panel=document.querySelector('#menu');const d=(label,body='<p>x</p>')=>`<details><summary>${label}</summary>${body}</details>`;panel.innerHTML=`<div class="route-body" id="exp-ward-view-tools">${d('Coverage')}<section><h3>Amazon</h3><button>Protect Amazon</button></section>${d('Seller clarity')}${d('Retailer modules')}${d('Advanced Amazon')}${d('Page tools')}${d('Settings transfer')}</div>`;window.tabs=ExtraPotionsCore.mountSubmenuTabs({panel,id:'ward'});});
 assert.deepEqual(await page.locator('.exp-submenu-row').allTextContents(),['Seller clarity','Coverage','Retailers','Patterns','Tools']);
 assert.equal(await page.getByRole('button',{name:'Protect Amazon'}).isVisible(),true);
});
