'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/product-tools.js'),'utf8');
function tools(){return vm.runInNewContext(source+';ExtraPotionsTools',{Date,Math});}
test('recovery keeps five validated snapshots, deduplicates, clones and restores without mutating storage',()=>{
 let store=[];const journal=tools().createSettingsRecovery({read:()=>store,write:v=>store=v,validate:v=>({value:Number(v.value)||0})});
 for(let value=0;value<7;value++)journal.capture({value,token:'not a setting'},'change');
 assert.equal(journal.list().length,5);assert.equal(journal.list()[0].settings.value,6);assert.equal(journal.list()[0].settings.token,undefined);
 journal.capture({value:6});assert.equal(journal.list().length,5);
 const entry=journal.list()[0];entry.settings.value=99;assert.equal(journal.restore(entry.id).value,6);
 assert.throws(()=>journal.restore('missing'),/no longer/);
});
test('invalid backup cannot overwrite journal and unavailable storage starts with an empty list',()=>{
 let writes=0;const journal=tools().createSettingsRecovery({read:()=>{throw Error('storage');},write:()=>writes++,validate:()=>{throw Error('invalid');}});
 assert.equal(journal.list().length,0);assert.throws(()=>journal.capture({}),/invalid/);assert.equal(writes,0);
});
test('compatibility controls report mixed versions and duplicate instances without network access',async t=>{
 const {chromium}=require('playwright');const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.setContent('<div id="exp-shift-root" data-core-version="1"></div><div id="exp-prisma-root" data-core-version="2"></div><i data-exp-diagnostics-product="shift" data-exp-product-version="3"></i><i data-exp-diagnostics-product="shift" data-exp-product-version="3"></i><i data-exp-diagnostics-product="prisma" data-exp-product-version="4"></i>');
 await page.addScriptTag({content:source+';window.tools=ExtraPotionsTools;document.body.append(tools.createCompatibilityControls());'});
 const result=await page.evaluate(()=>tools.compatibilitySnapshot());assert.equal(result.warnings.length,2);assert.equal(result.products[0].instances,2);
 await page.getByText('Product compatibility',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('details').textContent.includes('Different core versions'));assert.match(await page.locator('details').innerText(),/Different core versions/);assert.equal(await page.locator('input[type=checkbox]').count(),0);
});
