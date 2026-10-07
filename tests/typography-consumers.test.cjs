"use strict";
// Exercise the installed artifacts together, including inherited small text.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const{chromium}=require('playwright');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();const products=[['Dropper','dropper.user.js','tdh-root'],['SHIFT','shift.user.js','exp-shift-root'],['PRISMA','prisma.user.js','exp-prisma-root'],['WARD','ward.user.js','exp-ward-root']];
const suiteOptions=consumers.options();
for (const width of [360,1920]) {
  test(`installed menus align controls and preserve typography across sizes at ${width}px`, suiteOptions, async t=>{
    const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width,height:1080}});
    await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({body:'<!doctype html><html><body style="font:10px/1 Times New Roman"><main>Site content</main></body></html>',contentType:'text/html'}):r.abort());
    await page.goto('https://www.twitch.tv/');
    await page.evaluate(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'})};window.GM_getValue=(_,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:0}));return{abort(){}}};});
    for(const[name,file] of products)await page.addScriptTag({content:fs.readFileSync(consumers.file(name,file),'utf8')});
    for(const[size,body,small] of [['standard',14,12],['large',16,14],['extra-large',18,16]]){
      await page.evaluate(size=>{localStorage.setItem('exp:suite:menu-size',size);document.dispatchEvent(new CustomEvent('exp-core:menu-size',{detail:size}));},size);
      for(const[name,,id] of products){
        const host=page.locator('#'+id);await host.evaluate(n=>n.shadowRoot.querySelector('[data-exp-part="launcher"]').click());
        const count=await host.evaluate(n=>n.shadowRoot.querySelectorAll('.fl-tool-header').length);let rows=0;
        for(let index=0;index<count;index++){
          await host.evaluate((n,index)=>{const b=n.shadowRoot.querySelectorAll('.fl-tool-header')[index];if(b.getAttribute('aria-expanded')!=='true')b.click();n.shadowRoot.querySelectorAll('details').forEach(d=>d.open=true);},index);
          await page.waitForTimeout(60);
          const facts=await host.evaluate((n,{body,small})=>{
            const panel=n.shadowRoot.querySelector('[data-exp-part="dock"]'),problems=[];let rows=0;
            const visible=n=>n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden';
            if(parseFloat(getComputedStyle(panel).fontSize)!==body)problems.push('Incorrect menu body size');
            if(panel.scrollWidth>panel.clientWidth+1)problems.push('Horizontal menu overflow');
            const version=panel.querySelector('[data-exp-part="version"],#tdh-header-version');
            if(version&&(parseFloat(getComputedStyle(version).fontSize)!==small||version.getBoundingClientRect().height>28))problems.push('Version control should use compact metadata typography');
            for(const row of panel.querySelectorAll('.row,.mini-row,.fl-switch,.setting-row')){
              if(!visible(row))continue;
              const control=row.querySelector(':scope > select,:scope > button[role="switch"]');if(!control)continue;rows++;
              const r=row.getBoundingClientRect(),c=control.getBoundingClientRect(),style=getComputedStyle(control),rowStyle=getComputedStyle(row);
              const right=r.right-parseFloat(rowStyle.paddingRight)-parseFloat(rowStyle.borderRightWidth);
              if(Math.abs(right-c.right)>1)problems.push('Control right edge: '+row.textContent.trim());
              if(Math.abs((r.top+r.bottom)/2-(c.top+c.bottom)/2)>1)problems.push('Control vertical alignment: '+row.textContent.trim());
              if(!style.fontFamily.includes('Segoe UI'))problems.push('Control font differs from menu');
              if(control.tagName==='SELECT'&&(parseFloat(style.fontSize)!==body||c.height<32))problems.push('Dropdown text or height: '+row.textContent.trim());
              const copy=row.querySelector('.label,.fl-switch-text,.copy>strong,.row-copy>strong');
              if(copy&&parseFloat(getComputedStyle(copy).fontSize)!==body)problems.push('Label size: '+copy.textContent);
            }
            for(const help of panel.querySelectorAll('.help,.row-help,.row-copy>small'))if(visible(help)&&parseFloat(getComputedStyle(help).fontSize)!==small)problems.push('Helper text size: '+help.textContent);
            return {problems,rows};
          },{body,small});
          rows+=facts.rows;assert.deepEqual(facts.problems,[],`${name}, ${size}, section ${index}`);
        }
        assert.ok(rows>0,name+' has measured controls');
        await host.evaluate(n=>n.shadowRoot.querySelector('[data-exp-part="launcher"]').click());
      }
    }
    assert.deepEqual(await page.locator('main').evaluate(n=>({font:getComputedStyle(n).fontFamily,size:getComputedStyle(n).fontSize})),{font:'"Times New Roman"',size:'10px'});
  });
}
for(const viewport of [{width:1920,height:1080},{width:390,height:700}])test(`all product menu text remains readable at ${viewport.width}px`,suiteOptions,async t=>{const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport});await page.route('**/*',r=>r.fulfill({body:'<!doctype html><html><body><main style="font-size:16px">Site text</main></body></html>',contentType:'text/html'}));await page.goto('https://www.twitch.tv/');await page.evaluate(()=>{const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return attach.call(this,{...o,mode:'open'})};window.GM_getValue=(_,fallback)=>fallback;window.GM_setValue=()=>{};window.GM_xmlhttpRequest=o=>{queueMicrotask(()=>o.onerror?.({status:0}));return{abort(){}}};window.fetch=async()=>{throw Error('Fixture offline')};});for(const[name,file]of products)await page.addScriptTag({content:fs.readFileSync(consumers.file(name,file),'utf8')});
for(const[name,,id]of products){const host=page.locator('#'+id);await host.waitFor({state:'attached'});await host.evaluate(n=>n.shadowRoot.querySelector('[data-exp-part="launcher"]').click());const count=await host.evaluate(n=>n.shadowRoot.querySelectorAll('button[data-section],button.fl-tool-header').length);const issues=[];for(let index=0;index<count;index++){await host.evaluate((n,index)=>{const buttons=n.shadowRoot.querySelectorAll('button[data-section],button.fl-tool-header');const b=buttons[index];if(b&&b.getAttribute('aria-expanded')!=='true')b.click();n.shadowRoot.querySelectorAll('details').forEach(d=>d.open=true);},index);await page.waitForTimeout(30);issues.push(...await host.evaluate(n=>{const bad=[];const walker=document.createTreeWalker(n.shadowRoot,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const text=walker.currentNode;if(!text.textContent.trim())continue;const node=text.parentElement;if(!node||node.closest('style,script,option'))continue;const range=document.createRange();range.selectNodeContents(text);if(!range.getClientRects().length||getComputedStyle(node).visibility==='hidden')continue;const size=parseFloat(getComputedStyle(node).fontSize);if(size<10.99)bad.push({text:text.textContent.trim().slice(0,60),size,tag:node.localName,classes:node.className});}return bad;}));}assert.deepEqual(issues,[],name+' contains undersized visible text');await host.evaluate(n=>n.shadowRoot.querySelector('[data-exp-part="launcher"]').click());}assert.equal(await page.locator('main').evaluate(n=>getComputedStyle(n).fontSize),'16px');});

for (const viewport of [{width:1920,height:1080},{width:390,height:700}]) {
  test(`Dropper progress confirmation stays readable at ${viewport.width}px`, suiteOptions, async t => {
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage({viewport});
    await page.route('**/*', r => r.fulfill({body:'<!doctype html><html><body></body></html>',contentType:'text/html'}));
    await page.goto('https://www.twitch.tv/');
    await page.evaluate(() => { window.GM_xmlhttpRequest = () => {}; });
    await page.addScriptTag({content:fs.readFileSync(consumers.file('Dropper','dropper.user.js'),'utf8')});
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
