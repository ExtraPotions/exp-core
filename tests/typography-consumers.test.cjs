"use strict";
// Exercise the installed artifacts together, including inherited small text.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const{chromium}=require('playwright');
const workspace=process.env.EXP_SUITE_ROOT||path.resolve(__dirname,'../..');const products=[['Dropper','dropper.user.js','tdh-root'],['SHIFT','shift.user.js','exp-shift-root'],['PRISMA','prisma.user.js','exp-prisma-root'],['WARD','ward.user.js','exp-ward-root']];
const suiteAvailable=products.every(([name,file])=>fs.existsSync(path.join(workspace,name,file)));
for(const viewport of [{width:1920,height:1080},{width:390,height:700}])test(`all product menu text remains readable at ${viewport.width}px`,{skip:!suiteAvailable?'Consumer artifacts are checked in the suite gate':false},async t=>{const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport});await page.route('**/*',r=>r.fulfill({body:'<!doctype html><html><body><main style="font-size:16px">Site text</main></body></html>',contentType:'text/html'}));await page.goto('https://www.twitch.tv/');await page.evaluate(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'})};window.GM_getValue=(_,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:0}));return{abort(){}}};window.fetch=async()=>{throw Error('Fixture offline')};});for(const[name,file]of products)await page.addScriptTag({content:fs.readFileSync(path.join(workspace,name,file),'utf8')});
for(const[name,,id]of products){const host=page.locator('#'+id);await host.waitFor({state:'attached'});await host.evaluate(n=>n.shadowRoot.querySelector('[data-exp-part="launcher"]').click());const count=await host.evaluate(n=>n.shadowRoot.querySelectorAll('button[data-section],button.fl-tool-header').length);const issues=[];for(let index=0;index<count;index++){await host.evaluate((n,index)=>{const buttons=n.shadowRoot.querySelectorAll('button[data-section],button.fl-tool-header');const b=buttons[index];if(b&&b.getAttribute('aria-expanded')!=='true')b.click();n.shadowRoot.querySelectorAll('details').forEach(d=>d.open=true);},index);await page.waitForTimeout(30);issues.push(...await host.evaluate(n=>{const bad=[];const walker=document.createTreeWalker(n.shadowRoot,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const text=walker.currentNode;if(!text.textContent.trim())continue;const node=text.parentElement;if(!node||node.closest('style,script,option'))continue;const range=document.createRange();range.selectNodeContents(text);if(!range.getClientRects().length||getComputedStyle(node).visibility==='hidden')continue;const size=parseFloat(getComputedStyle(node).fontSize);if(size<10.99)bad.push({text:text.textContent.trim().slice(0,60),size,tag:node.localName,classes:node.className});}return bad;}));}assert.deepEqual(issues,[],name+' contains undersized visible text');await host.evaluate(n=>n.shadowRoot.querySelector('[data-exp-part="launcher"]').click());}assert.equal(await page.locator('main').evaluate(n=>getComputedStyle(n).fontSize),'16px');});

for (const viewport of [{width:1920,height:1080},{width:390,height:700}]) {
  test(`Dropper progress confirmation stays readable at ${viewport.width}px`, {skip:!suiteAvailable?'Consumer artifacts are checked in the suite gate':false}, async t => {
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({viewport});
    await page.route('**/*', r => r.fulfill({body:'<!doctype html><html><body></body></html>',contentType:'text/html'}));
    await page.goto('https://www.twitch.tv/');
    await page.evaluate(() => { window.GM_xmlhttpRequest = () => {}; });
    await page.addScriptTag({content:fs.readFileSync(path.join(workspace,'Dropper','dropper.user.js'),'utf8')});
    await page.waitForFunction(() => document.getElementById('tdh-root')?.shadowRoot?.getElementById('tdh-drop-card'));
    for (const stacked of [false,true]) {
      const facts = await page.evaluate(stacked => {
        const root=document.getElementById('tdh-root').shadowRoot;
        const card=root.getElementById('tdh-drop-card');
        card.parentElement.classList.toggle('progress-stack',stacked);
        const button=card.querySelector('.skip-streamer-chip');
        button.disabled=false;
        button.classList.add('is-armed');
        button.querySelector('.skip-label').textContent='Confirm';
        const countdown=button.querySelector('.skip-countdown');
        countdown.hidden=false; countdown.textContent='3s';
        return [...button.querySelectorAll('.skip-label,.skip-countdown')].map(n=>({text:n.textContent,size:parseFloat(getComputedStyle(n).fontSize),fits:n.scrollWidth<=n.clientWidth}));
      },stacked);
      assert.ok(facts.every(f=>f.size>=11&&f.fits),JSON.stringify({stacked,facts}));
    }
  });
}
