'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=['foundation.js','menu-help.js','site-colors.js'].map(file=>fs.readFileSync(path.join(__dirname,'../src',file),'utf8')).join('\n');
test('Slate Blue exposes only Light, Dark and System and normalizes legacy palettes',()=>{
 const Exp=new Function(source+';return ExpSiteColors;')();
 assert.deepEqual(Exp.sitePalettes.map(p=>p.name),['Light','Dark','System']);
 for(const mode of ['light','dark','system'])for(const key of ['bg','panel','raised','inset','line','text','muted','accent','onAccent'])assert.match(Exp.sitePalette(mode)[key],/^#[0-9a-f]{6}$/);
 assert.equal(Exp.sitePalette('light').bg,'#f4f6fa');assert.equal(Exp.sitePalette('dark').accent,'#8cb7ff');
 for(const legacy of ['off','blue','obsidian','gem','contrast',undefined])assert.equal(Exp.sitePalette(legacy).id,'system');
});
test('System follows device changes, explicit modes stay fixed, clear releases styles and controls offer only three modes',async t=>{
 const {chromium}=require('playwright'),browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({colorScheme:'light'});
 await page.setContent('<main>Page</main>');await page.addScriptTag({content:source+`;window.colors=ExpSiteColors.createSiteColors({product:'demo',css:(p,scope)=>scope+' main{background:'+p.bg+'!important;color:'+p.text+'!important}'});window.site=ExpSiteColors;`});
 const bg=()=>page.locator('main').evaluate(n=>getComputedStyle(n).backgroundColor);
 await page.evaluate(()=>colors.apply('system'));assert.equal(await bg(),'rgb(244, 246, 250)');
 await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.expSitePalette==='slate-blue-dark');assert.equal(await bg(),'rgb(17, 23, 32)');
 await page.evaluate(()=>colors.apply('light'));await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});assert.equal(await bg(),'rgb(244, 246, 250)');
 assert.equal(await page.locator('#exp-site-colors-demo').count(),1);
 await page.evaluate(()=>colors.clear());assert.equal(await page.locator('#exp-site-colors-demo').count(),0);assert.equal(await page.locator('html').getAttribute('data-exp-site-colors'),null);
 await page.evaluate(()=>document.body.append(site.createSiteColorControl({value:'blue',onChange:v=>window.chosen=v})));
 assert.deepEqual(await page.locator('select option').allTextContents(),['Light','Dark','System']);assert.equal(await page.locator('select').inputValue(),'system');
 await page.locator('select').selectOption('dark');assert.equal(await page.evaluate(()=>window.chosen),'dark');
});
test('injected sheet handles are reused across modes and released on clear',async t=>{
 const {chromium}=require('playwright'),browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.setContent('<main>Page</main>');await page.addScriptTag({content:source+`;window.creations=0;window.colors=ExpSiteColors.createSiteColors({product:'demo',css:(p,scope)=>scope+' main{background:'+p.bg+'!important}',inject:(text)=>{
 creations++;const sheet=new CSSStyleSheet();sheet.replaceSync(text);document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet];const node=document.createElement('style');node.type='text/plain';let current=text;
 Object.defineProperty(node,'textContent',{get:()=>current,set:value=>{current=value;sheet.replaceSync(value);}});
 node.remove=()=>{document.adoptedStyleSheets=document.adoptedStyleSheets.filter(s=>s!==sheet);node.parentNode?.removeChild(node);};document.head.append(node);return node;
 }});`});
 await page.evaluate(()=>colors.apply('dark'));assert.equal(await page.locator('main').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(17, 23, 32)');
 await page.evaluate(()=>colors.apply('light'));assert.equal(await page.locator('main').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(244, 246, 250)');
 assert.equal(await page.evaluate(()=>creations),1);await page.evaluate(()=>colors.clear());assert.equal(await page.evaluate(()=>document.adoptedStyleSheets.length),0);
});
