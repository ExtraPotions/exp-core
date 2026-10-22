'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=['menu-help.js','site-colors.js'].map(file=>fs.readFileSync(path.join(__dirname,'../src',file),'utf8')).join('\n');
test('site palettes expose six named palettes with complete light and dark tokens',()=>{
 const Exp=new Function(source+';return ExpSiteColors;')();
 assert.deepEqual(Exp.sitePalettes.map(p=>p.name),['Default','Indigo','Blue','Green','Red','Gray']);
 for(const p of Exp.sitePalettes)for(const mode of ['dark','light'])for(const key of ['bg','panel','raised','inset','line','text','muted','accent','onAccent'])assert.match(p[mode][key],/^#[0-9a-f]{6}$/,p.id+' '+mode+' '+key);
 assert.equal(Exp.sitePalette('blue','light').bg,'#e7f0fb');assert.equal(Exp.sitePalette('blue','dark').accent,'#82b9ff');assert.equal(Exp.sitePalette('missing'),null);
 assert.equal(Exp.sitePalette('obsidian','dark',[{id:'obsidian',name:'Obsidian',dark:{bg:'#03060a'},light:{bg:'#03060a'}}]).bg,'#03060a');
});
test('one scoped style per product follows the site mode, clears completely and the control lists Off first',async t=>{
 const {chromium}=require('playwright');const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.route('**/*',r=>r.fulfill({body:'<html class="dark"><body><main>Page</main></body></html>',contentType:'text/html'}));await page.goto('https://example.test/');
 await page.addScriptTag({content:source+`;window.site=ExpSiteColors;let listener=null;window.colors=site.createSiteColors({product:'demo',mode:()=>document.documentElement.classList.contains('dark')?'dark':'light',watch:cb=>{listener=cb;window.watching=true;return ()=>{listener=null;window.watching=false;};},css:(p,scope)=>scope+' main{background:'+p.bg+'!important;color:'+p.text+'!important}'});window.flip=()=>{document.documentElement.classList.toggle('dark');listener?.();};`});
 const state=()=>page.evaluate(()=>({attr:document.documentElement.getAttribute('data-exp-site-colors'),palette:document.documentElement.dataset.expSitePalette||null,styles:document.querySelectorAll('#exp-site-colors-demo').length,bg:getComputedStyle(document.querySelector('main')).backgroundColor,watching:!!window.watching}));
 await page.evaluate(()=>colors.apply('green'));assert.deepEqual(await state(),{attr:'demo',palette:'green-dark',styles:1,bg:'rgb(14, 25, 19)',watching:true});
 await page.evaluate(()=>flip());assert.deepEqual(await state(),{attr:'demo',palette:'green-light',styles:1,bg:'rgb(232, 243, 235)',watching:true});
 await page.evaluate(()=>colors.apply('red'));assert.equal((await state()).palette,'red-light');assert.equal((await state()).styles,1);
 await page.evaluate(()=>colors.apply('off'));assert.deepEqual(await state(),{attr:null,palette:null,styles:0,bg:'rgba(0, 0, 0, 0)',watching:false});
 await page.evaluate(()=>{const row=site.createSiteColorControl({value:'blue',offLabel:'Example',onChange:v=>window.chosen=v});row.id='row';document.body.append(row);});
 assert.deepEqual(await page.locator('#row option').allTextContents(),['Example','Default','Indigo','Blue','Green','Red','Gray']);assert.equal(await page.locator('#row select').inputValue(),'blue');
 await page.locator('#row select').selectOption('gray');assert.equal(await page.evaluate(()=>window.chosen),'gray');
});
