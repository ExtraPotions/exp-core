'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const contract=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/suite-contract.json'),'utf8'));
const rootIds=Object.fromEntries(Object.entries(contract).map(([id,value])=>[id,value.rootId]));
const source=fs.readFileSync(path.join(__dirname,'../src/product-tools.js'),'utf8').replace('__EXP_SUITE_ROOT_IDS__',JSON.stringify(rootIds));
function tools(){return vm.runInNewContext(source+';ExtraPotionsTools',{Date,Math});}
test('shared tools no longer expose settings backups',()=>{assert.equal(tools().createSettingsRecovery,undefined);assert.equal(tools().createRecoveryControls,undefined);});
test('compatibility controls report mixed versions and duplicate instances without network access',async t=>{
 const {chromium}=require('playwright');const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.setContent('<div id="exp-shift-root" data-core-version="1"></div><div id="exp-prisma-root" data-core-version="2"></div><i data-exp-diagnostics-product="shift" data-exp-product-version="3"></i><i data-exp-diagnostics-product="shift" data-exp-product-version="3"></i><i data-exp-diagnostics-product="prisma" data-exp-product-version="4"></i>');
 await page.addScriptTag({content:source+';window.tools=ExtraPotionsTools;document.body.append(tools.createCompatibilityControls());'});
 const result=await page.evaluate(()=>tools.compatibilitySnapshot());assert.equal(result.warnings.length,2);assert.equal(result.products[0].instances,2);
 await page.getByText('Product compatibility',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('details').textContent.includes('Different core versions'));assert.match(await page.locator('details').innerText(),/Different core versions/);assert.equal(await page.locator('input[type=checkbox]').count(),0);
});

test('Bitcoin donation displays and copies the exact address with an honest clipboard fallback',async t=>{
 const {chromium}=require('playwright');const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.goto('about:blank');await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copied=value;}}}));
 await page.addScriptTag({content:source+';document.body.append(ExtraPotionsTools.createBitcoinDonation());'});
 await page.getByText('₿ Bitcoin',{exact:true}).click();const address='bc1qg4xq63mwu63qc5dnqugk3qtxvulv5p3frjayna8ey8tu8ey4wpxsg92hv3';
 assert.equal(await page.locator('code').textContent(),address);assert.equal(await page.getByRole('link',{name:'Open Bitcoin wallet'}).getAttribute('href'),'bitcoin:'+address);
 await page.getByRole('button',{name:'Copy Bitcoin address'}).click();assert.equal(await page.evaluate(()=>window.copied),address);
 await page.evaluate(()=>navigator.clipboard.writeText=async()=>{throw Error('denied');});await page.getByRole('button',{name:'Copy Bitcoin address'}).click();
 assert.equal(await page.getByRole('status').textContent(),'Select and copy the address above.');
});


test('compatibility inventory is injected from the suite manifest',()=>{assert.doesNotMatch(source,/\['dropper','shift','prisma','ward'\]/u);assert.doesNotMatch(source.slice(source.indexOf('  function compatibilitySnapshot()'),source.indexOf('  const button=')),/id==='dropper'/u);assert.match(source,/const PRODUCT_ROOT_IDS = \{/u);});
