'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('JSON settings copies stay local and independent without native structuredClone',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.setContent('<body>Settings copy</body>');
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8')+';window.testCore=ExtraPotionsCore;'});
 const result=await page.evaluate(()=>{window.structuredClone=()=>{throw Error('Native clone crosses sandbox realms');};const original={list:[{name:'original'}],site:{enabled:true}};const copy=testCore.cloneSettings(original);copy.list.push({name:'new'});copy.list[0].name='changed';copy.site.extra={nested:true};return {original,copy,local:Object.getPrototypeOf(copy)===Object.prototype};});
 assert.deepEqual(result.original,{list:[{name:'original'}],site:{enabled:true}});assert.equal(result.copy.list.length,2);assert.equal(result.local,true);
});
