'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

// Waits until every launcher has been laid out and has stopped moving (two identical frames).
const settle=page=>page.waitForFunction(()=>{
  const nodes=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(host=>host.shadowRoot?.querySelector('[data-exp-part="launcher"],.launcher'));
  if(!nodes.length||nodes.some(node=>!node))return false;
  const key=nodes.map(node=>{const box=node.getBoundingClientRect();return Math.round(box.left)+','+Math.round(box.top);}).join('|');
  const stable=window.__launcherKey===key;window.__launcherKey=key;return stable;
},null,{polling:'raf'});
const launchers=page=>page.evaluate(()=>[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(host=>{const r=host.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher').getBoundingClientRect();return {id:host.dataset.productId,left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
const box=(page,selector)=>page.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};},selector);
// The gap between two rectangles; 0 or less means they touch or overlap.
const gap=(a,b)=>Math.max(b.left-a.right,a.left-b.right,b.top-a.bottom,a.top-b.bottom);

async function open(t,body,{delta}={}){
  const browser=await chromium.launch();t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width:1879,height:885}});
  await page.route('**/*',route=>route.request().isNavigationRequest()
    ? route.fulfill({contentType:'text/html',body:`<!doctype html><html><body style="margin:0">${body}</body></html>`})
    : route.abort());
  await page.goto('https://core-site-controls.test/');
  if(delta!==undefined)await page.evaluate(d=>localStorage.setItem('exp:v3:launcher-grid-delta',JSON.stringify(d)),delta);
  await page.addScriptTag({content:source});
  await page.evaluate(()=>{
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
    window.products=['shift','prisma','ward'].map((id,index)=>ExtraPotionsCore.createProduct({id,name:id,version:'3.3.2',artwork,theme:theme(id),sections:[],priority:[100,80,60][index]}));
    // An older Core on the page (no flyout protocol) keeps every product on the launcher grid: the grid fallback.
    window.products.at(-1).host.removeAttribute('data-exp-flyout');
  });
  await settle(page);
  return page;
}

// Walmart's Sparky chat button, measured in the 2026-10 review at (1772, 793, 60, 60) in a 1879 x 885 window.
const CHAT='<main style="height:3000px">Shop</main><button id="chat" style="position:fixed;right:47px;bottom:32px;width:60px;height:60px">Chat</button>';

test('the launcher group moves clear of a fixed site control, keeps its spacing, and keeps the saved position',async t=>{
  const page=await open(t,CHAT);
  const chat=await box(page,'#chat'),boxes=await launchers(page);
  for(const launcher of boxes)assert.ok(gap(launcher,chat)>=8,`${launcher.id} keeps 8px clear of the chat button: ${JSON.stringify({launcher,chat})}`);
  assert.equal(new Set(boxes.map(b=>Math.round(b.top))).size,1,'the group moves together: '+JSON.stringify(boxes));
  assert.ok(boxes.every(b=>b.bottom<=chat.top-8+0.125&&b.bottom>=chat.top-16),'the group sits just above the chat button: '+JSON.stringify(boxes));
  assert.equal(await page.evaluate(()=>localStorage.getItem('exp:v3:launcher-grid-delta')),null,'the avoidance is not saved as a preference');
  await page.evaluate(()=>document.getElementById('chat').remove());
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-exp-product-launcher="1"]')].every(h=>Math.round(h.shadowRoot.querySelector('.launcher,[data-exp-part="launcher"]').getBoundingClientRect().bottom)===innerHeight-12),null,{timeout:3000}).catch(()=>{});
  const back=await launchers(page);assert.ok(back.every(b=>Math.round(b.bottom)===885-12),'the group returns to its saved place when the control is gone: '+JSON.stringify(back));
});

test('header controls under a group placed at the top push it below them',async t=>{
  const page=await open(t,'<header style="height:60px;display:flex;justify-content:flex-end;gap:4px;padding:6px 40px 0 0;box-sizing:border-box"><a href="#a" id="mine" style="display:block;width:80px;height:40px">My account</a><button style="width:40px;height:40px">Alerts</button><a href="#c" style="display:block;width:40px;height:40px">Cart</a></header><main style="height:3000px">Shop</main>',{delta:-2000});
  const boxes=await launchers(page);
  assert.ok(boxes.every(b=>b.top>=46+8-0.125),'every launcher sits below the header controls: '+JSON.stringify(boxes));
  assert.ok(boxes.every(b=>b.top<=46+8+8),'and no further than needed: '+JSON.stringify(boxes));
});

test('a chat button that appears after load moves the group once it is there',async t=>{
  const page=await open(t,'<main style="height:3000px">Shop</main>');
  await page.evaluate(()=>document.body.insertAdjacentHTML('beforeend','<button id="chat" style="position:fixed;right:47px;bottom:32px;width:60px;height:60px">Chat</button>'));
  await page.waitForFunction(()=>{const chat=document.getElementById('chat').getBoundingClientRect();return [...document.querySelectorAll('[data-exp-product-launcher="1"]')].every(h=>h.shadowRoot.querySelector('.launcher,[data-exp-part="launcher"]').getBoundingClientRect().bottom<=chat.top-8+0.125);},null,{timeout:3000});
});

// Allbirds' "Shop Deals" agent, measured 2026-10-14: a fixed role=button inside the open shadow root of a static host.
const SHADOW_CHAT='<main style="height:3000px">Shop</main><div id="agent"><template shadowrootmode="open"><div style="position:fixed;right:24px;bottom:26px"><div role="button" tabindex="0" style="width:208px;height:84px">Shop Deals</div></div></template></div>';

test('a fixed site control inside a shadow root moves the group clear of it',async t=>{
  const page=await open(t,SHADOW_CHAT);
  const deals=await page.evaluate(()=>{const r=document.getElementById('agent').shadowRoot.querySelector('[role=button]').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};});
  const boxes=await launchers(page);
  for(const launcher of boxes)assert.ok(gap(launcher,deals)>=8,`${launcher.id} keeps 8px clear of the shadow-root button: ${JSON.stringify({launcher,deals})}`);
  assert.ok(boxes.every(b=>b.bottom>=deals.top-16),'and moves no further than needed: '+JSON.stringify(boxes));
});

test('a fixed shadow host with role=button moves the group clear of its spans',async t=>{
  const page=await open(t,'<main style="height:3000px">Shop</main><shop-deals id="agent" role="button" tabindex="0" style="position:fixed;right:24px;bottom:26px;width:208px;height:84px"><template shadowrootmode="open"><span style="display:block;width:100%;height:100%"><span>Shop Deals</span></span></template></shop-deals>');
  const deals=await box(page,'#agent'),boxes=await launchers(page);
  for(const launcher of boxes)assert.ok(gap(launcher,deals)>=8,`${launcher.id} keeps 8px clear of the button host: ${JSON.stringify({launcher,deals})}`);
  assert.ok(boxes.every(b=>b.bottom>=deals.top-16),'and moves no further than needed: '+JSON.stringify(boxes));
});

test('ordinary page content under the launchers does not move them',async t=>{
  const page=await open(t,'<main style="height:3000px;position:relative"><a href="#x" style="position:absolute;right:0;top:780px;width:300px;height:80px">Scrolling link</a></main>');
  assert.ok((await launchers(page)).every(b=>Math.round(b.bottom)===885-12),'links that scroll with the page are not avoided');
});

test('links in a page that scrolls inside a fixed full-window container do not move the launchers',async t=>{
  const page=await open(t,'<div id="app" style="position:fixed;inset:0;overflow:auto"><main style="height:3000px;position:relative"><a href="#x" style="position:absolute;right:0;top:780px;width:300px;height:80px">Scrolling link</a></main></div>');
  assert.ok((await launchers(page)).every(b=>Math.round(b.bottom)===885-12),'the app container scrolls, so its links are ordinary content');
});

// Twitch signed out (2026-10, measured at 360px): the window never scrolls; the feed scrolls in an inner container and
// the "Join the Twitch community!" bar with its Sign Up button sits below it in a full-window absolute layer.
const APP_BAR='<div style="position:absolute;inset:0;display:flex;flex-direction:column"><div style="flex:1;display:flex;min-height:0"><nav style="flex:none;width:300px">Channels</nav><div style="flex:1;overflow:auto;position:relative"><main style="height:3000px;position:relative"><a href="#card" style="position:absolute;right:20px;top:420px;width:300px;height:420px">Stream card</a></main></div></div><article style="flex:none;height:57px;display:flex;justify-content:flex-end;align-items:center;padding-right:19px"><button id="join" style="width:81px;height:32px">Sign Up</button></article></div>';

test('a button outside the scrolling content of a page that never scrolls stays put, so the launchers move clear of it',async t=>{
  const page=await open(t,APP_BAR);
  const join=await box(page,'#join'),boxes=await launchers(page);
  for(const launcher of boxes)assert.ok(gap(launcher,join)>=8-0.125,`${launcher.id} keeps 8px clear of Sign Up: ${JSON.stringify({launcher,join})}`);
  // The stream card scrolls inside the feed, which is narrower than the window: it is content, not something to avoid.
  assert.ok(boxes.every(b=>b.bottom>=join.top-16),'the group moves only as far as Sign Up needs: '+JSON.stringify({boxes,join}));
});

test('a link in an article header scrolls with the page and does not move the launchers',async t=>{
  const page=await open(t,'<main style="height:3000px;position:relative"><article style="position:absolute;right:0;top:780px;width:300px"><header><a href="#x" style="display:block;height:80px">Article title</a></header></article></main>');
  assert.ok((await launchers(page)).every(b=>Math.round(b.bottom)===885-12),'only the page banner counts as a pinned header');
});

test('a hidden chat button that is later shown moves the group once it is visible',async t=>{
  const page=await open(t,'<main style="height:3000px">Shop</main><button id="chat" style="display:none;position:fixed;right:47px;bottom:32px;width:60px;height:60px">Chat</button>');
  assert.ok((await launchers(page)).every(b=>Math.round(b.bottom)===885-12),'nothing to avoid while it is hidden');
  await page.evaluate(()=>{document.getElementById('chat').style.display='block';});
  await page.waitForFunction(()=>{const chat=document.getElementById('chat').getBoundingClientRect();return [...document.querySelectorAll('[data-exp-product-launcher="1"]')].every(h=>h.shadowRoot.querySelector('.launcher,[data-exp-part="launcher"]').getBoundingClientRect().bottom<=chat.top-8+0.125);},null,{timeout:1500});
});

// An infinite feed scrolls and changes for as long as the reader scrolls. Each site-control check hit-tests a grid
// of points, so the check waits for a pause and runs at most every 2s meanwhile, instead of every 500ms.
test('a feed that keeps scrolling and changing is re-checked rarely, and a chat button that appears meanwhile is still avoided',async t=>{
  const page=await open(t,'<main id="feed" style="height:3000px">Feed</main>');
  await page.evaluate(()=>{
    window.__hitTests=0;
    const original=Document.prototype.elementsFromPoint;
    Document.prototype.elementsFromPoint=function(...args){window.__hitTests+=1;return original.apply(this,args);};
  });
  const calls=await page.evaluate(async()=>{
    const feed=document.getElementById('feed');
    for(let tick=0;tick<50;tick+=1){
      const post=document.createElement('article');post.style.height='200px';post.textContent='Post '+tick;feed.append(post);feed.style.height=(3000+tick*200)+'px';
      scrollBy(0,200);
      if(tick===10)document.body.insertAdjacentHTML('beforeend','<button id="chat" style="position:fixed;right:47px;bottom:32px;width:60px;height:60px">Chat</button>');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    return window.__hitTests;
  });
  const chat=await box(page,'#chat');
  assert.ok((await launchers(page)).every(b=>b.bottom<=chat.top-8+0.125),'the chat button that appeared while scrolling is avoided before scrolling stops');
  // Today a check samples about 160 points; ten checks in 5s was 1,620 calls. Three checks is the most this allows.
  assert.ok(calls<=600,`${calls} hit tests in 5s of scrolling`);
});

// Reddit's right sidebar is position:sticky. Its links are page content in a column, not controls pinned over the
// page: counting them moved the launcher up ~300px and made every check run all four search rounds.
const STICKY_SIDEBAR='<div style="display:flex;justify-content:flex-end"><main style="height:6000px;flex:1">Feed</main><aside id="sidebar" style="position:sticky;top:56px;align-self:flex-start;width:300px;height:820px">'+Array.from({length:14},(_,i)=>`<a href="#" style="display:block;height:52px;margin-bottom:6px">Link ${i}</a>`).join('')+'</aside></div>';

test('links in a tall sticky sidebar are page content: the launchers stay put and scrolling past them stays cheap',async t=>{
  const page=await open(t,STICKY_SIDEBAR);
  await page.evaluate(()=>{window.__hitTests=0;const original=Document.prototype.elementsFromPoint;Document.prototype.elementsFromPoint=function(...args){window.__hitTests+=1;return original.apply(this,args);};});
  // A reader scrolls a step, reads, and scrolls again: each pause outlasts the recheck's wait.
  for(let step=0;step<8;step+=1){await page.mouse.wheel(0,400);await page.waitForTimeout(450);}
  await settle(page);
  assert.ok((await launchers(page)).every(b=>Math.round(b.bottom)===885-12),'the launchers are not moved by sidebar links');
  const calls=await page.evaluate(()=>window.__hitTests);
  // One search round per check samples the group's grid; four rounds per check was the failure.
  assert.ok(calls<=8*250,`${calls} hit tests for 8 scroll steps`);
});
