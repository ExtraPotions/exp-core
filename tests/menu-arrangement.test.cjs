'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

test('Core exposes Main Appearance Advanced System categories',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>({
    categories:ExtraPotionsCore.menuCategories.map(({id,label})=>({id,label})),
    shift:ExtraPotionsCore.categorizeMenuSections('shift',[
      {key:'appearance',label:'Appearance'},{key:'readability',label:'Readability'},
      {key:'effects',label:'Effects & Integrations'},{key:'profiles',label:'Profiles & Sites'},{key:'system',label:'System'}
    ]).map(g=>({id:g.id,keys:g.sections.map(s=>s.key)})),
    prisma:ExtraPotionsCore.categorizeMenuSections('prisma',[
      {key:'page',label:'Highlights'},{key:'style',label:'Highlight Style'},{key:'look',label:'Appearance'},
      {key:'tools',label:'Language'},{key:'sites',label:'Sites'},{key:'system',label:'System'}
    ]).map(g=>({id:g.id,keys:g.sections.map(s=>s.key)}))
  }));
  assert.deepEqual(result.categories,[{id:'main',label:'Main'},{id:'appearance',label:'Appearance'},{id:'advanced',label:'Advanced'},{id:'system',label:'System'}]);
  assert.deepEqual(result.shift,[{id:'appearance',keys:['appearance','readability']},{id:'advanced',keys:['effects','profiles']},{id:'system',keys:['system']}]);
  assert.deepEqual(result.prisma,[{id:'main',keys:['page']},{id:'appearance',keys:['style','look']},{id:'advanced',keys:['tools','sites']},{id:'system',keys:['system']}]);
});

test('Core category disclosures start collapsed',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>{
    const node=document.createElement('div');node.textContent='Product controls';
    const details=ExtraPotionsCore.createMenuCategoryDisclosure('Readability','appearance',node);document.body.append(details);
    return {open:details.open,category:details.dataset.expMenuCategory,submenu:details.dataset.expMenuSubmenu,label:details.querySelector('summary').textContent};
  });
  assert.deepEqual(result,{open:false,category:'appearance',submenu:'1',label:'Readability'});
});

test('Core does not re-collapse a submenu after the user opens it',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>{
    const panel=document.createElement('aside');panel.style.cssText='--theme-line:#444;--theme-bg:#111;--theme-panel:#18181d;--theme-muted:#aaa;--theme-accent:#8b5cf6;--theme-text:#fff';
    const make=(key,label)=>{const s=document.createElement('section');s.className='fl-tool-panel';const h=document.createElement('button');h.className='fl-tool-header';h.dataset.section=key;const t=document.createElement('span');t.className='fl-tool-title';t.textContent=label;h.append(t);const b=document.createElement('div');b.className='fl-tool-body';s.append(h,b);return s;};
    const appearance=make('appearance','Appearance');
    const nested=ExtraPotionsCore.createMenuCategoryDisclosure('Readability','appearance',document.createElement('div'));
    appearance.querySelector('.fl-tool-body').append(nested);
    panel.append(appearance,make('advanced','Advanced'),make('system','System'));document.body.append(panel);
    const controller=ExtraPotionsCore.mountMenuArrangement({panel,id:'shift'});
    // Main section tabs flatten groups inside a page: they are open from the start.
    const initiallyOpen=nested.open,flat=nested.dataset.expFlat||null;
    nested.open=true;
    controller.update();
    const afterUpdate=nested.open;
    ExtraPotionsCore.collapseMenuSubmenus(panel);
    const afterCollapsePass=nested.open;
    controller.destroy();
    return {initiallyOpen,flat,afterUpdate,afterCollapsePass};
  });
  assert.deepEqual(result,{initiallyOpen:true,flat:'1',afterUpdate:true,afterCollapsePass:true});
});

test('Core orders sections by category and offers nothing to rearrange or hide',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();await page.route('https://menu.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto('https://menu.test/');await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>{
    localStorage.setItem('exp:v3:menu-order:shift',JSON.stringify(['profiles','appearance','system']));
    localStorage.setItem('exp:v3:menu-hidden:shift',JSON.stringify(['readability']));
    const panel=document.createElement('aside');
    const make=(key,label)=>{const s=document.createElement('section');s.className='fl-tool-panel';const h=document.createElement('button');h.className='fl-tool-header';h.dataset.section=key;const t=document.createElement('span');t.className='fl-tool-title';t.textContent=label;h.append(t);const b=document.createElement('div');b.className='fl-tool-body';b.id=key+'-body';s.append(h,b);return s;};
    panel.append(make('system','System'),make('profiles','Profiles & Sites'),make('readability','Readability'),make('appearance','Appearance'));document.body.append(panel);
    const controller=ExtraPotionsCore.mountMenuArrangement({panel,id:'shift'});
    const ordered=[...panel.querySelectorAll(':scope > .fl-tool-panel')].map(n=>({key:n.querySelector('.fl-tool-header').dataset.section,category:n.dataset.expMenuCategory,hidden:n.hidden}));
    const extras={grips:panel.querySelectorAll('.exp-section-grip').length,editor:panel.querySelectorAll('.exp-menu-editor').length};
    controller.destroy();return {ordered,extras};
  });
  assert.deepEqual(result.ordered.map(x=>x.key),['readability','appearance','profiles','system']);
  assert.deepEqual(result.ordered.map(x=>x.category),['appearance','appearance','advanced','system']);
  assert.ok(result.ordered.every(x=>x.hidden===false));
  assert.deepEqual(result.extras,{grips:0,editor:0});
});

test('Core menus use the compact width',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:900,height:700}});await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:source});
  const width=await page.evaluate(()=>ExtraPotionsCore.menuWidth());
  assert.equal(width,320);
});
