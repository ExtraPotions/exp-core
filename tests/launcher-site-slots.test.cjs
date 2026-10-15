'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

// A Twitch-like top bar: logo, centred search, and the right-hand icon group (with Twitch's zero-size Search
// button first). Signed out the group is Log In and Sign Up; signed in it is six icons and the user menu.
function twitch({signedIn=false,searchWidth=356,bar=true}={}){
  const icons=signedIn
    ?['Prime offers','Open Notifications','Open Threads','Shouts','Bits'].map(l=>`<button aria-label="${l}" style="width:32px;height:32px">.</button>`).join('')+'<button style="width:133px;height:32px">Get Ad-Free</button><button data-a-target="user-menu-toggle" style="width:30px;height:30px">U</button>'
    :'<button data-a-target="login-button" style="width:56px;height:30px">Log In</button><button style="width:68px;height:30px">Sign Up</button><button style="width:30px;height:30px">U</button>';
  return `<nav data-a-target="top-nav-container" style="position:fixed;top:0;left:0;right:0;height:50px;background:#18181b;${bar?'':'display:none'}">
    <div class="top-nav__menu" style="display:flex;align-items:center;height:50px">
      <div style="width:371px;flex:none">logo</div>
      <div style="flex:1;display:flex;justify-content:center;min-width:0"><div style="display:flex;gap:0"><input type="search" data-a-target="tw-input" style="box-sizing:border-box;width:${searchWidth}px;height:36px;${searchWidth?'':'padding:0;border:0'}"><button aria-label="Search Button" style="width:36px;height:36px">S</button></div></div>
      <div style="display:flex;gap:8px;align-items:center;padding:0 8px;flex:none"><button style="width:0;height:0;padding:0;border:0;overflow:hidden">Search</button>${icons}</div>
    </div></nav><main style="padding-top:60px">Stream</main>`;
}
async function open(t,{width=1600,height=900,ids=['dropper','shift','prisma'],body=twitch()}={}){
  const browser=await chromium.launch();t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:`<!doctype html><html><body style="margin:0;background:#0e0e10;color:#ccc">${body}</body></html>`}):route.abort());
  await page.goto('https://www.twitch.tv/somechannel');
  await page.addScriptTag({content:source});
  await page.evaluate(ids=>{
    const theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
    window.products=Object.fromEntries(ids.map(id=>[id,ExtraPotionsCore.createProduct({id,name:id,version:'3.9.0',artwork:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%23bc94f5"/></svg>',theme:theme(id),sections:[]})]));
  },ids);
  await settle(page);
  return page;
}
const settle=page=>page.waitForFunction(()=>{
  const nodes=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].flatMap(h=>[...h.shadowRoot.querySelectorAll('[data-exp-part="launcher"],[data-exp-part="flyout-hub"],[data-exp-part="flyout-panel"],[data-exp-part="dock"]')]);
  const key=nodes.map(n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.width,getComputedStyle(n).visibility].join(',');}).join('|');
  const stable=window.__slotKey===key;window.__slotKey=key;return stable&&nodes.length>0;
},null,{polling:'raf'});
const facts=page=>page.evaluate(()=>{
  const box=n=>{if(!n||n.hidden)return null;const r=n.getBoundingClientRect();if(!r.width)return null;return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const hosts=[...document.querySelectorAll('[data-exp-product-launcher="1"]')];
  const part=name=>hosts.map(h=>h.shadowRoot.querySelector(`[data-exp-part="${name}"]`)).find(Boolean);
  const nav=document.querySelector('.top-nav__menu');
  const right=nav?[...nav.children[2].querySelectorAll('button')].map(b=>b.getBoundingClientRect()).filter(r=>r.width>0):[];
  const searchBox=document.querySelector('[aria-label="Search Button"]')?.getBoundingClientRect();
  return{hub:box(part('flyout-hub')),panel:box(part('flyout-panel')),
    launchers:Object.fromEntries(hosts.map(h=>[h.dataset.productId,box(h.shadowRoot.querySelector('[data-exp-part="launcher"]'))])),
    menus:Object.fromEntries(hosts.map(h=>[h.dataset.productId,box(h.shadowRoot.querySelector('[data-exp-part="dock"]'))])),
    firstIcon:right.length?Math.min(...right.map(r=>r.left)):null,searchRight:searchBox?.right??null};
});
const clickHub=async page=>{const f=await facts(page);await page.mouse.click(f.hub.left+20,f.hub.top+20);await settle(page);};

test('on Twitch the launcher sits in the top bar between search and the icons, signed out',async t=>{
  for(const width of [1600,1280]){
    const page=await open(t,{width});
    const f=await facts(page);
    assert.deepEqual([f.hub.width,f.hub.height],[40,40],`${width}: a 40px launcher`);
    assert.equal(f.hub.top,5,`${width}: centred in the 50px bar`);
    assert.equal(Math.round(f.firstIcon-f.hub.right),16,`${width}: 16px before Twitch's first icon`);
    assert.ok(f.hub.left>=f.searchRight+8,`${width}: clear of the search box`);
    await page.close();
  }
});

test('signed in, the launcher sits before Twitch\'s first icon',async t=>{
  const page=await open(t,{width:1879,height:885,body:twitch({signedIn:true})});
  const f=await facts(page);
  assert.equal(Math.round(f.firstIcon-f.hub.right),16);
  assert.ok(f.hub.left>f.searchRight+8);
  assert.equal(f.hub.top,5);
});

test('the flyout and menus drop down into the right-hand column',async t=>{
  const page=await open(t);
  await clickHub(page);
  let f=await facts(page);
  assert.equal(Math.round(f.panel.top-f.hub.bottom),6,'the flyout opens below the launcher');
  assert.equal(Math.round(f.panel.right),Math.round(f.hub.right));
  for(const tile of Object.values(f.launchers))assert.ok(tile.top>=f.panel.top&&tile.bottom<=f.panel.bottom);
  const tile=f.launchers.shift;await page.mouse.click(tile.left+20,tile.top+20);await settle(page);
  f=await facts(page);
  assert.ok(f.menus.shift,'menu open');
  assert.equal(Math.round(1600-f.menus.shift.right),8,'right-aligned 8px from the window edge');
  assert.ok(f.menus.shift.top>=f.panel.bottom+8-0.5,'below the flyout');
  assert.ok(f.menus.shift.bottom<=900-8+0.5,'inside the window');
});

test('theater mode, a collapsed search box, or a narrow gap put the launcher in the corner',async t=>{
  for(const [label,body,width] of [['theater mode',twitch({bar:false}),1600],['collapsed search',twitch({searchWidth:0}),1600],['narrow gap',twitch({signedIn:true}),900]]){
    const page=await open(t,{width,body});
    const f=await facts(page);
    assert.deepEqual([f.hub.width,Math.round(width-f.hub.right),Math.round(900-f.hub.bottom)],[48,12,12],label);
    await page.close();
  }
});

test('the bar disappearing while the flyout is open does not move it until it closes',async t=>{
  const page=await open(t);
  await clickHub(page);
  const before=(await facts(page)).hub;
  await page.evaluate(()=>{document.querySelector('nav').style.display='none';});
  await page.waitForTimeout(400);await settle(page);
  assert.deepEqual((await facts(page)).hub,before,'no jump while the flyout is open');
  await page.keyboard.press('Escape');await page.waitForTimeout(400);await settle(page);
  const after=(await facts(page)).hub;
  assert.deepEqual([after.width,Math.round(1600-after.right),Math.round(900-after.bottom)],[48,12,12],'the corner once the flyout closes');
});

test('the bar appearing after the products load moves the launcher into it',async t=>{
  const page=await open(t,{body:'<main>Loading</main>'});
  assert.equal((await facts(page)).hub.width,48);
  await page.evaluate(html=>{document.body.insertAdjacentHTML('afterbegin',html);},twitch());
  await page.waitForTimeout(600);await settle(page);
  const f=await facts(page);
  assert.equal(f.hub.width,40);assert.equal(f.hub.top,5);
});

test('Dropper alone on Twitch puts its own launcher in the top bar and opens its menu below',async t=>{
  const page=await open(t,{ids:['dropper']});
  let f=await facts(page);
  assert.equal(f.hub,null,'no flyout launcher for one product');
  const own=f.launchers.dropper;
  assert.deepEqual([own.width,own.top,Math.round(f.firstIcon-own.right)],[40,5,16]);
  await page.mouse.click(own.left+20,own.top+20);await settle(page);
  f=await facts(page);
  assert.ok(f.menus.dropper.top>=own.bottom+8-0.5);assert.equal(Math.round(1600-f.menus.dropper.right),8);
});

test('on Twitch an update card drops below the top-bar launcher',async t=>{
  const page=await open(t);
  const f=await facts(page);
  const card=await page.evaluate(()=>{const host=document.querySelector('[data-product-id="prisma"]');const n=document.createElement('div');n.style.cssText='position:fixed;width:300px;height:120px';host.shadowRoot.append(n);ExtraPotionsCore.placeNotice(host,n,null);const r=n.getBoundingClientRect();return{top:r.top,right:r.right};});
  assert.equal(Math.round(card.top-f.hub.bottom),8);assert.equal(Math.round(1600-card.right),8);
});

test('an update card drops below a reserved strip under the top bar, and ignores it while hidden',async t=>{
  const page=await open(t);
  const f=await facts(page);
  const result=await page.evaluate(()=>{
    // A strip like Dropper's progress strip: right-hand column, just below the top bar, marked reserved.
    const dropper=document.querySelector('[data-product-id="dropper"]');
    const strip=document.createElement('div');strip.dataset.expReserved='1';strip.style.cssText='position:fixed;top:54px;right:7px;width:324px;height:32px';dropper.shadowRoot.append(strip);
    const host=document.querySelector('[data-product-id="prisma"]');
    const card=document.createElement('div');card.style.cssText='position:fixed;width:300px;height:120px';host.shadowRoot.append(card);
    const floating=document.createElement('div');floating.style.cssText='position:fixed;width:300px;height:120px';host.shadowRoot.append(floating);
    ExtraPotionsCore.registerFloatingNotice(host,floating);
    const read=()=>{ExtraPotionsCore.placeNotice(host,card,null);ExtraPotionsCore.layoutFloatingNotices();return{card:card.getBoundingClientRect().top,floating:floating.getBoundingClientRect().top};};
    const shown=read();strip.style.visibility='hidden';const hidden=read();
    return{shown,hidden,stripBottom:strip.getBoundingClientRect().bottom};
  });
  assert.equal(Math.round(result.shown.card-result.stripBottom),8,'placeNotice clears the strip');
  assert.equal(Math.round(result.shown.floating-result.stripBottom),8,'floating notices clear the strip');
  assert.equal(Math.round(result.hidden.card-f.hub.bottom),8,'a hidden strip takes no room');
});

test('the top-bar launcher cannot be dragged out of its slot',async t=>{
  const page=await open(t);
  const before=(await facts(page)).hub;
  await page.mouse.move(before.left+20,before.top+20);await page.mouse.down();
  for(let i=1;i<=10;i++)await page.mouse.move(before.left+20,before.top+20+30*i);
  await page.mouse.up();await page.waitForTimeout(200);await settle(page);
  const after=await facts(page);
  assert.deepEqual([after.hub.left,after.hub.top],[before.left,before.top]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('exp:v3:launcher-grid-delta')),null,'nothing saved');
});

test('Dropper progress draws its ring on the top-bar launcher outline with gaps for the count and marker',async t=>{
  const page=await open(t);
  const ring=()=>page.evaluate(()=>{
    const hub=document.querySelector('[data-product-id="dropper"]').shadowRoot.querySelector('[data-exp-part="flyout-hub"]');
    const svg=hub.querySelector('[data-exp-part="flyout-ring"]');if(!svg||svg.hasAttribute('hidden'))return{shown:false,border:getComputedStyle(hub).borderTopColor};
    const h=hub.getBoundingClientRect(),s=svg.getBoundingClientRect();
    const [halo,track,fill]=[...svg.querySelectorAll('path')];const start=fill.getPointAtLength(0),bbox=fill.getBBox();
    const cuts=[...svg.querySelectorAll('mask rect[fill="black"]')].map(r=>['x','y','width','height'].map(k=>Number(r.getAttribute(k))));
    return{shown:true,offset:[Math.round(s.left-h.left),Math.round(s.top-h.top),Math.round(s.width-h.width)],bbox:[bbox.x,bbox.y,bbox.width,bbox.height],start:[Math.round(start.x),Math.round(start.y)],
      halo:[getComputedStyle(halo).stroke,getComputedStyle(halo).strokeWidth],track:getComputedStyle(track).stroke,fill:getComputedStyle(fill).stroke,width:getComputedStyle(fill).strokeWidth,dash:fill.getAttribute('stroke-dasharray'),cuts,border:getComputedStyle(hub).borderTopColor};
  });
  assert.equal((await ring()).shown,false,'no progress, no ring');
  await page.evaluate(()=>ExtraPotionsCore.setLauncherProgress('dropper',0.47));await settle(page);
  let r=await ring();
  assert.equal(r.shown,true);
  assert.deepEqual(r.offset,[-5,-5,10],'the ring box is 5px outside the launcher on every side');
  assert.deepEqual(r.bbox,[6,6,38,38],'the stroke centre sits 1px inside the 40px launcher edge: the ring is the outline');
  assert.deepEqual(r.start,[25,6],'progress starts at the top centre');
  assert.deepEqual(r.halo,['rgb(14, 14, 16)','4px'],'a dark edge keeps the ring at 3:1 or better on light pages');
  assert.equal(r.width,'2px');assert.equal(r.track,'rgb(63, 63, 70)');assert.equal(r.fill,'rgb(188, 148, 245)');
  assert.ok(r.dash.startsWith('47 '),r.dash);
  assert.equal(r.cuts.length,1,'one gap, around the count');
  assert.equal(r.border,'rgba(0, 0, 0, 0)','the launcher border gives way to the ring, so there is one outline');
  await page.evaluate(()=>ExtraPotionsCore.setLauncherUpdate('prisma',true));await settle(page);
  assert.equal((await ring()).cuts.length,2,'a second gap around the update marker');
  await page.evaluate(()=>ExtraPotionsCore.setLauncherProgress('dropper',null));await settle(page);
  assert.equal((await ring()).shown,false);
});

test('entering theater mode with the flyout closed moves the launcher to the corner without polling',async t=>{
  const page=await open(t);
  assert.equal((await facts(page)).hub.width,40);
  await page.evaluate(()=>{document.querySelector('nav').style.display='none';});
  await page.waitForTimeout(150);await settle(page);
  const f=await facts(page);
  assert.deepEqual([f.hub.width,Math.round(1600-f.hub.right),Math.round(900-f.hub.bottom)],[48,12,12]);
  await page.evaluate(()=>{document.querySelector('nav').style.display='';});
  await page.waitForTimeout(150);await settle(page);
  assert.equal((await facts(page)).hub.width,40,'and back to the top bar after theater mode');
});

test('theater mode that covers the top bar instead of hiding it moves the launcher to the corner',async t=>{
  // Live Twitch, 2026-10-12: the theater player is drawn over the top bar, which keeps its size.
  const page=await open(t);
  assert.equal((await facts(page)).hub.width,40);
  await page.evaluate(()=>{const p=document.createElement('div');p.id='theater';p.style.cssText='position:fixed;inset:0 340px 0 0;z-index:3000;background:#000';document.body.append(p);});
  await page.waitForTimeout(150);await settle(page);
  const f=await facts(page);
  assert.deepEqual([f.hub.width,Math.round(1600-f.hub.right),Math.round(900-f.hub.bottom)],[48,12,12]);
  await page.evaluate(()=>document.getElementById('theater').remove());
  await page.waitForTimeout(150);await settle(page);
  assert.equal((await facts(page)).hub.width,40,'and back to the top bar after theater mode');
});

test('a busy page does not re-measure the top bar on every change',async t=>{
  // Live Twitch chat adds dozens of nodes a second; the slot is re-measured at most every 150ms.
  const page=await open(t);
  const checks=await page.evaluate(()=>new Promise(resolve=>{
    const sel='nav[data-a-target="top-nav-container"] .top-nav__menu',qs=Document.prototype.querySelector;let count=0;
    Document.prototype.querySelector=function(s){if(s===sel)count++;return qs.call(this,s);};
    const chat=document.createElement('div');document.body.append(chat);let n=0;
    const timer=setInterval(()=>{chat.append(document.createElement('p'));if(++n>=100){clearInterval(timer);setTimeout(()=>{Document.prototype.querySelector=qs;resolve(count);},200);}},10);
  }));
  assert.ok(checks<=12,`${checks} measurements for 100 changes in about a second`);
});
