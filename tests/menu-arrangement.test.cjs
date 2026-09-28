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

test('Core arrangement preserves order and hidden keys while adding categories',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();await page.route('https://menu.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto('https://menu.test/');await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>{
    localStorage.setItem('exp:v3:menu-order:shift',JSON.stringify(['profiles','appearance','system','readability','effects']));
    localStorage.setItem('exp:v3:menu-hidden:shift',JSON.stringify(['readability']));
    const panel=document.createElement('aside');panel.style.cssText='--theme-line:#444;--theme-bg:#111;--theme-panel:#18181d;--theme-muted:#aaa;--theme-accent:#b33;--theme-text:#fff';
    const make=(key,label)=>{const s=document.createElement('section');s.className='fl-tool-panel';const h=document.createElement('button');h.className='fl-tool-header';h.dataset.section=key;const t=document.createElement('span');t.className='fl-tool-title';t.textContent=label;h.append(t);const b=document.createElement('div');b.className='fl-tool-body';s.append(h,b);return s;};
    panel.append(make('appearance','Appearance'),make('readability','Readability'),make('effects','Effects & Integrations'),make('profiles','Profiles & Sites'),make('system','System'));document.body.append(panel);
    const controller=ExtraPotionsCore.mountMenuArrangement({panel,id:'shift'});
    const ordered=[...panel.querySelectorAll(':scope > .fl-tool-panel')].map(n=>({key:n.dataset.expArrangeSection,category:n.dataset.expMenuCategory,hidden:n.hidden}));
    const groups=[...panel.querySelectorAll('[data-exp-menu-category-group]')].map(n=>n.dataset.expMenuCategoryGroup);
    controller.destroy();return {ordered,groups};
  });
  assert.deepEqual(result.ordered,[
    {key:'profiles',category:'advanced',hidden:false},{key:'appearance',category:'appearance',hidden:false},{key:'system',category:'system',hidden:false},
    {key:'readability',category:'appearance',hidden:true},{key:'effects',category:'advanced',hidden:false}
  ]);
  assert.deepEqual(result.groups,['appearance','advanced']);
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
    const initiallyOpen=nested.open;
    nested.open=true;
    controller.update();
    const afterUpdate=nested.open;
    ExtraPotionsCore.collapseMenuSubmenus(panel);
    const afterCollapsePass=nested.open;
    controller.destroy();
    return {initiallyOpen,afterUpdate,afterCollapsePass};
  });
  assert.deepEqual(result,{initiallyOpen:false,afterUpdate:true,afterCollapsePass:true});
});

test('Core menu arrangement fits full compact and narrow widths',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:900,height:700}});await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:source});
  for(const mode of ['full','compact','narrow']){
    const facts=await page.evaluate(mode=>{
      const panel=document.createElement('aside');panel.dataset.expMenuWidth=mode;panel.style.cssText=`box-sizing:border-box;width:${ExtraPotionsCore.menuWidthForMode(mode)}px;--theme-line:#444;--theme-bg:#111;--theme-panel:#18181d;--theme-muted:#aaa;--theme-accent:#8b5cf6;--theme-text:#fff`;
      const make=(key,label)=>{const s=document.createElement('section');s.className='fl-tool-panel';const h=document.createElement('button');h.className='fl-tool-header';h.dataset.section=key;const t=document.createElement('span');t.className='fl-tool-title';t.textContent=label;h.append(t);const b=document.createElement('div');b.className='fl-tool-body';s.append(h,b);return s;};
      const appearance=make('appearance','Appearance');const nested=ExtraPotionsCore.createMenuCategoryDisclosure('Readability','appearance',document.createElement('div'));appearance.querySelector('.fl-tool-body').append(nested);
      panel.append(appearance,make('effects','Effects & Integrations'),make('profiles','Profiles & Sites'),make('system','System'));document.body.append(panel);
      const controller=ExtraPotionsCore.mountMenuArrangement({panel,id:'shift'});const editor=panel.querySelector('.exp-menu-editor');
      const result={width:panel.getBoundingClientRect().width,expected:ExtraPotionsCore.menuWidthForMode(mode),editorFits:editor.scrollWidth<=editor.clientWidth+1,groupsFit:[...editor.querySelectorAll('.exp-menu-category-group')].every(g=>g.scrollWidth<=g.clientWidth+1),nestedOpen:nested.open,editorOpen:editor.open};
      controller.destroy();panel.remove();return result;
    },mode);
    assert.equal(facts.width,facts.expected,mode);assert.equal(facts.editorFits,true,mode);assert.equal(facts.groupsFit,true,mode);assert.equal(facts.nestedOpen,false,mode);assert.equal(facts.editorOpen,false,mode);
  }
});
