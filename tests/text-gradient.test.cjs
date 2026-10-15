'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
test('text gradient protects its background and clip without owning foreground or cleanup',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
 await page.setContent('<style>html main span{background:inherit!important;color:inherit!important}</style><main><span style="color:green">Text</span></main>');
 await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../dist/exp-core.js'),'utf8')+';window.testCore=ExtraPotionsCore;'});
 const result=await page.evaluate(()=>{const node=document.querySelector('span');testCore.applyTextGradient(node,'linear-gradient(red,blue)');const css=getComputedStyle(node);return {image:css.backgroundImage,clip:css.backgroundClip,inlineColor:node.style.color,inlineFill:node.style.webkitTextFillColor,priority:node.style.getPropertyPriority('background-image')};});
 assert.match(result.image,/linear-gradient/);assert.equal(result.clip,'text');assert.equal(result.inlineColor,'green');assert.equal(result.inlineFill,'');assert.equal(result.priority,'important');
});
