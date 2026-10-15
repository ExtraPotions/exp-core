'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

async function open(t,{width=1280,height=800,ids=['dropper','shift','prisma','ward'],body='<main>Flyout fixture</main>'}={}){
  const browser=await chromium.launch();t.after(()=>browser.close());
  const page=await browser.newPage({viewport:{width,height}});
  await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html',body:`<!doctype html><html><body style="margin:0">${body}</body></html>`}):route.abort());
  await page.goto('https://core-flyout.test/');
  await page.addScriptTag({content:source});
  await page.evaluate(ids=>{
    const colors={dropper:'%23bc94f5',shift:'%2380d7d2',prisma:'%2391bfff',ward:'%23e7bb75'};
    const theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
    window.products=Object.fromEntries(ids.map(id=>[id,ExtraPotionsCore.createProduct({id,name:id,version:'3.9.0',artwork:`data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="${colors[id]||'%23888'}"/></svg>`,theme:theme(id),sections:[{id:'one',label:'One',render:()=>{const p=document.createElement('p');p.textContent=id;return p;}}]})]));
  },ids);
  await settle(page);
  return page;
}
// Two identical frames of every launcher, hub, panel and open menu box (menus settle a frame or two after opening).
const settle=page=>page.waitForFunction(()=>{
  const nodes=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].flatMap(h=>[...h.shadowRoot.querySelectorAll('[data-exp-part="launcher"],[data-exp-part="flyout-hub"],[data-exp-part="flyout-panel"],[data-exp-part="dock"]')]);
  const key=nodes.map(n=>{const r=n.getBoundingClientRect();return [r.left,r.top,r.width,getComputedStyle(n).visibility].join(',');}).join('|');
  const stable=window.__flyoutKey===key;window.__flyoutKey=key;return stable&&nodes.length>0;
},null,{polling:'raf'});
const facts=page=>page.evaluate(()=>{
  const box=n=>{if(!n)return null;const r=n.getBoundingClientRect();const s=getComputedStyle(n);return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:s.visibility!=='hidden'&&s.display!=='none'&&r.width>0};};
  const hosts=[...document.querySelectorAll('[data-exp-product-launcher="1"]')];
  const hubs=hosts.map(h=>h.shadowRoot.querySelector('[data-exp-part="flyout-hub"]')).filter(Boolean);
  const hub=hubs[0];
  const panel=hosts.map(h=>h.shadowRoot.querySelector('[data-exp-part="flyout-panel"]')).find(Boolean);
  const tiles=Object.fromEntries(hosts.map(h=>[h.dataset.productId,box(h.shadowRoot.querySelector('[data-exp-part="launcher"]'))]));
  const menus=Object.fromEntries(hosts.map(h=>{const p=h.shadowRoot.querySelector('[data-exp-part="dock"]');return[h.dataset.productId,p&&!p.hidden?box(p):null];}));
  let active=document.activeElement;while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;
  const topAt=(x,y)=>{const n=document.elementFromPoint(x,y);return n?.closest?.('[data-exp-product-launcher="1"]')?.dataset.productId||n?.dataset?.productId||'';};
  return{hubCount:hubs.length,hubHost:hub?.getRootNode().host.dataset.productId||'',hub:box(hub),hubCount2:hub?.querySelector('[data-exp-part="flyout-count"]')?.textContent||'',expanded:hub?.getAttribute('aria-expanded')||'',panel:box(panel),panelVisible:Boolean(panel&&!panel.hidden),tiles,menus,
    activeId:active?.getRootNode?.().host?.dataset.productId||'',activePart:active?.dataset?.expPart||'',open:document.documentElement.dataset.expFlyoutOpen==='1',
    hitAtTiles:Object.fromEntries(Object.entries(tiles).map(([id,b])=>[id,b&&b.visible?topAt(b.left+b.width/2,b.top+b.height/2):''])),
    selected:hosts.filter(h=>h.dataset.expFlyoutSelected==='1').map(h=>h.dataset.productId),
    scrollWidth:document.documentElement.scrollWidth};
});
const clickHub=async page=>{const f=await facts(page);await page.mouse.click(f.hub.left+f.hub.width/2,f.hub.top+f.hub.height/2);await settle(page);};
const clickTile=async(page,id)=>{const f=await facts(page);const b=f.tiles[id];await page.mouse.click(b.left+b.width/2,b.top+b.height/2);await settle(page);};

test('several products show one launcher in the corner with the lead icon and a count',async t=>{
  const page=await open(t);
  const f=await facts(page);
  assert.equal(f.hubCount,1,'exactly one launcher');
  assert.equal(f.hubHost,'dropper','Dropper leads on its own site');
  assert.deepEqual([f.hub.width,f.hub.height],[48,48]);
  assert.equal(Math.round(1280-f.hub.right),12,'right edge 12px from the window');
  assert.equal(Math.round(800-f.hub.bottom),12,'bottom edge 12px from the window');
  assert.equal(f.hubCount2,'+3');
  const count=await page.evaluate(()=>{const hub=document.querySelector('[data-product-id="dropper"]').shadowRoot.querySelector('[data-exp-part="flyout-hub"]');const c=hub.querySelector('[data-exp-part="flyout-count"]');const r=c.getBoundingClientRect(),h=hub.getBoundingClientRect(),st=getComputedStyle(c);return{overhang:[Math.round(r.right-h.right),Math.round(r.bottom-h.bottom)],height:r.height,radius:st.borderRadius,bg:st.backgroundColor,font:st.fontSize+'/'+st.fontWeight};});
  assert.deepEqual(count,{overhang:[5,5],height:16,radius:'4px',bg:'rgb(39, 39, 42)',font:'10px/600'},'the count is a rounded rectangle overhanging the corner by 5px');
  assert.equal(f.expanded,'false');
  for(const [id,tile] of Object.entries(f.tiles))assert.equal(tile.visible,false,`${id}'s own launcher waits in the flyout`);
  assert.equal(f.panelVisible,false);
});

test('the flyout lists every product in suite order and a tile opens its menu',async t=>{
  const page=await open(t);
  await clickHub(page);
  let f=await facts(page);
  assert.equal(f.expanded,'true');assert.equal(f.open,true);assert.equal(f.panelVisible,true);
  const ids=['dropper','shift','prisma','ward'];
  ids.forEach(id=>{assert.equal(f.tiles[id].visible,true,id);assert.deepEqual([f.tiles[id].width,f.tiles[id].height],[40,40],id);});
  ids.slice(1).forEach((id,i)=>assert.equal(Math.round(f.tiles[id].left-f.tiles[ids[i]].left),46,`${id} follows ${ids[i]} with a 6px gap`));
  assert.equal(Math.round(f.panel.right),Math.round(f.hub.right),'the flyout lines up with the launcher');
  assert.equal(Math.round(f.hub.top-f.panel.bottom),6,'the flyout opens above the corner launcher');
  for(const id of ids){assert.equal(f.hitAtTiles[id],id,`${id}'s tile is on top of the flyout panel`);assert.ok(f.tiles[id].left>=f.panel.left&&f.tiles[id].right<=f.panel.right&&f.tiles[id].top>=f.panel.top&&f.tiles[id].bottom<=f.panel.bottom,`${id} sits inside the panel`);}
  await clickTile(page,'prisma');
  f=await facts(page);
  assert.ok(f.menus.prisma,'PRISMA menu opened');assert.equal(f.open,true,'the flyout stays open with the menu');
  assert.deepEqual(f.selected,['prisma']);
  assert.equal(Math.round(1280-f.menus.prisma.right),8,'the menu is right-aligned 8px from the window edge');
  assert.ok(f.menus.prisma.bottom<=f.panel.top-8+0.5,'the menu sits above the flyout and covers neither it nor the launcher');
  for(const id of ids)assert.equal(f.hitAtTiles[id],id,`${id}'s tile stays reachable with a menu open`);
});

test('Escape and an outside click close the flyout; Escape returns focus to the launcher',async t=>{
  const page=await open(t);
  await clickHub(page);await clickTile(page,'shift');
  await page.keyboard.press('Escape');await settle(page);
  let f=await facts(page);
  assert.equal(f.open,false);assert.equal(f.menus.shift,null,'the menu closes with the flyout');
  assert.equal(f.activePart,'flyout-hub','focus is back on the launcher');
  await clickHub(page);await clickTile(page,'ward');
  await page.mouse.click(200,200);await settle(page);
  f=await facts(page);
  assert.equal(f.open,false);assert.equal(f.menus.ward,null);
  for(const tile of Object.values(f.tiles))assert.equal(tile.visible,false);
});

test('arrow keys move between products across hosts and focus survives restacking',async t=>{
  const page=await open(t);
  await page.evaluate(()=>[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(h=>h.shadowRoot.querySelector('[data-exp-part="flyout-hub"]')).find(Boolean).focus());
  await page.keyboard.press('Enter');await settle(page);
  let f=await facts(page);
  assert.equal(f.open,true);assert.equal(f.activeId,'dropper','Enter opens the flyout on the first product');assert.equal(f.activePart,'launcher');
  await page.keyboard.press('ArrowRight');f=await facts(page);assert.equal(f.activeId,'shift');
  await page.keyboard.press('End');f=await facts(page);assert.equal(f.activeId,'ward');
  await page.keyboard.press('ArrowLeft');f=await facts(page);assert.equal(f.activeId,'prisma');
  await page.keyboard.press('Home');f=await facts(page);assert.equal(f.activeId,'dropper');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await settle(page);
  f=await facts(page);assert.ok(f.menus.shift,'Enter opens the product menu');
});

test('opening a menu another way opens the flyout with that product selected',async t=>{
  const page=await open(t);
  await page.evaluate(()=>window.products.ward.open());await settle(page);
  const f=await facts(page);
  assert.equal(f.open,true);assert.deepEqual(f.selected,['ward']);assert.ok(f.menus.ward);
});

test('one product keeps a single launcher that opens its menu directly',async t=>{
  const page=await open(t,{ids:['shift']});
  let f=await facts(page);
  assert.equal(f.hubCount,0,'no flyout launcher');
  assert.equal(f.tiles.shift.visible,true);assert.deepEqual([f.tiles.shift.width,f.tiles.shift.height],[48,48]);
  assert.equal(Math.round(1280-f.tiles.shift.right),12);assert.equal(Math.round(800-f.tiles.shift.bottom),12);
  await clickTile(page,'shift');f=await facts(page);assert.ok(f.menus.shift);
});

test('a page scrollbar narrows the corner: launcher, flyout and tiles stay clear of it',async t=>{
  // A reserved scrollbar gutter makes the fixed-position area narrower than innerWidth, as a classic scrollbar does.
  const page=await open(t,{body:'<style>html{scrollbar-gutter:stable}</style><main style="height:3000px">Tall page</main>'});
  const view=await page.evaluate(()=>{const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;visibility:hidden';document.body.append(d);const w=d.getBoundingClientRect().width;d.remove();return w;});
  assert.ok(view<1280,'the fixture reserves a gutter');
  let f=await facts(page);
  assert.equal(Math.round(view-f.hub.right),12,'right edge 12px from the scrollbar');
  await clickHub(page);f=await facts(page);
  assert.ok(f.panel.right<=view-8,'the flyout stays clear of the scrollbar');
  for(const [id,tile] of Object.entries(f.tiles))assert.ok(tile.left>=f.panel.left&&tile.right<=f.panel.right,id+' sits inside the flyout '+JSON.stringify([tile.left,tile.right,f.panel.left,f.panel.right]));
});

test('a phone-width window keeps the launcher, flyout and menu inside the screen',async t=>{
  const page=await open(t,{width:360,height:640});
  await clickHub(page);await clickTile(page,'dropper');
  const f=await facts(page);
  assert.ok(f.scrollWidth<=360,'no horizontal scroll');
  for(const b of [f.hub,f.panel,f.menus.dropper,...Object.values(f.tiles)])assert.ok(b.left>=0&&b.right<=360,JSON.stringify(b));
  assert.ok(f.menus.dropper.bottom<=f.panel.top,'the menu clears the flyout');
});

test('a launcher without the flyout protocol returns everyone to the grid and leaves no flyout behind',async t=>{
  const page=await open(t,{ids:['dropper','shift']});
  await clickHub(page);
  await page.evaluate(()=>{const h=document.createElement('div');h.dataset.expProductLauncher='1';h.dataset.productId='legacy';const s=h.attachShadow({mode:'open'});const b=document.createElement('button');b.className='launcher';b.dataset.expPart='launcher';b.style.cssText='position:fixed;right:200px;top:20px;width:48px;height:48px';s.append(b);document.documentElement.append(h);});
  await settle(page);
  const f=await facts(page);
  assert.equal(f.hubCount,0);assert.equal(f.panel,null);assert.equal(f.open,false);
  assert.equal(f.tiles.dropper.visible,true);assert.equal(f.tiles.shift.visible,true);
  assert.deepEqual([f.tiles.shift.width,f.tiles.shift.height],[48,48],'grid launchers return to full size');
  const roles=await page.evaluate(()=>[...document.querySelectorAll('[data-exp-flyout-role]')].length);
  assert.equal(roles,0);
});

test('the corner launcher and its flyout move clear of a fixed site control',async t=>{
  const page=await open(t,{body:'<main>Page</main><button id="chat" style="position:fixed;right:0;bottom:0;width:120px;height:60px">Chat</button>'});
  await page.waitForTimeout(700);await settle(page);
  await clickHub(page);
  const f=await facts(page);
  const chat=await page.evaluate(()=>{const r=chat.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom};});
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  assert.equal(overlaps(f.hub,chat),false,JSON.stringify({hub:f.hub,chat}));
  assert.equal(overlaps(f.panel,chat),false,'the flyout clears the control too');
  assert.equal(Math.round(1280-f.hub.right),12,'the launcher stays on the right edge');
});

// A 300x120 notice placed by Core, as update cards and changelogs are.
const placeNotice=(page,id,withMenu)=>page.evaluate(([id,withMenu])=>{
  const host=document.querySelector(`[data-product-id="${id}"]`);let notice=host.shadowRoot.querySelector('.test-notice');
  if(!notice){notice=document.createElement('div');notice.className='test-notice';notice.style.cssText='position:fixed;width:300px;height:120px;background:#333';host.shadowRoot.append(notice);}
  ExtraPotionsCore.placeNotice(host,notice,withMenu?host.shadowRoot.querySelector('[data-exp-part="dock"]'):null);
  const r=notice.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom};
},[id,withMenu]);

test('update cards sit beside the closed launcher and changelogs sit beyond an open menu',async t=>{
  const page=await open(t);
  let f=await facts(page);
  const card=await placeNotice(page,'shift',false);
  assert.equal(Math.round(1280-card.right),8,'right-aligned with the menus');
  assert.equal(Math.round(f.hub.top-card.bottom),8,'just above the closed corner launcher');
  await clickHub(page);await clickTile(page,'shift');
  f=await facts(page);
  const log=await placeNotice(page,'shift',true);
  assert.equal(Math.round(log.right),Math.round(f.menus.shift.right),'shares the menu edge');
  assert.equal(Math.round(f.menus.shift.top-log.bottom),8,'beyond the menu');
});

test('an update marks the product tile and the launcher corner in that product\'s colour',async t=>{
  const page=await open(t);
  const mark=()=>page.evaluate(()=>{const hub=document.querySelector('[data-product-id="dropper"]').shadowRoot.querySelector('[data-exp-part="flyout-hub"]');const m=hub.querySelector('[data-exp-part="flyout-mark"]');const r=m.getBoundingClientRect(),h=hub.getBoundingClientRect();return{hidden:m.hidden,color:getComputedStyle(m).backgroundColor,size:[r.width,r.height],radius:getComputedStyle(m).borderRadius,overhang:[Math.round(r.right-h.right),Math.round(h.top-r.top)],tile:document.querySelector('[data-product-id="prisma"]').dataset.expUpdate||''};});
  assert.equal((await mark()).hidden,true,'no update, no marker');
  await page.evaluate(()=>ExtraPotionsCore.setLauncherUpdate('prisma',true));await settle(page);
  let m=await mark();
  assert.equal(m.hidden,false);assert.equal(m.color,'rgb(145, 191, 255)','PRISMA blue');
  assert.deepEqual(m.size,[10,10]);assert.equal(m.radius,'3px');assert.deepEqual(m.overhang,[4,4]);
  assert.equal(m.tile,'1','PRISMA\'s tile carries the update too');
  await page.evaluate(()=>ExtraPotionsCore.setLauncherUpdate('prisma',false));await settle(page);
  m=await mark();assert.equal(m.hidden,true);assert.equal(m.tile,'');
});

test('update cards from several products show one at a time',async t=>{
  const page=await open(t);
  await page.evaluate(()=>{window.cards=Object.fromEntries(['shift','prisma'].map(id=>{const p=window.products[id];return[id,ExtraPotionsCore.createProductNotice({host:p.host,shadow:p.shadow,panel:p.panel})];}));
    cards.shift.show({title:'SHIFT update',version:'3.9.0'});cards.prisma.show({title:'PRISMA update',version:'3.9.0'});});
  await page.waitForTimeout(200);
  const visible=()=>page.evaluate(()=>Object.fromEntries(Object.entries(cards).map(([id,c])=>[id,!c.element.hidden])));
  assert.deepEqual(await visible(),{shift:true,prisma:false},'the second card waits');
  await page.evaluate(()=>cards.shift.hide());await page.waitForTimeout(200);
  assert.deepEqual(await visible(),{shift:false,prisma:true},'then shows when the first is dismissed');
  await page.evaluate(()=>cards.prisma.hide());
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.expNoticeOwner||''),'');
});

test('a product that registers its launcher before building its menu keeps the flyout styles',async t=>{
  // WARD's order: registerLauncher first, then the canonical menu (create), which resets the shadow root's styles.
  const page=await open(t,{ids:['dropper','shift']});
  await page.evaluate(()=>{
    const host=document.createElement('div');const shadow=host.attachShadow({mode:'open'});
    const launcher=document.createElement('button');launcher.type='button';launcher.className='launcher';launcher.dataset.expPart='launcher';const art=document.createElement('img');art.alt='';art.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%23e7bb75"/></svg>';launcher.append(art);
    const panel=document.createElement('section');panel.hidden=true;shadow.append(launcher,panel);document.documentElement.append(host);
    ExtraPotionsCore.registerLauncher(host,{productId:'ward'});
    ExtraPotionsCore.create({id:'ward',host,shadow,launcher,panel,setOpen:()=>{},launcherSrc:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%23e7bb75"/></svg>'});
  });
  await settle(page);
  const ward=await page.evaluate(()=>{const h=document.querySelector('[data-product-id="ward"]');const l=h.shadowRoot.querySelector('[data-exp-part="launcher"]');
    return{role:h.dataset.expFlyoutRole,visibility:getComputedStyle(l).visibility,styles:['expLauncherBackdrop','expFlyoutStyle'].filter(k=>h.shadowRoot.querySelector(`style[data-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}]`))};});
  assert.deepEqual(ward,{role:'hidden',visibility:'hidden',styles:['expLauncherBackdrop','expFlyoutStyle']},'its launcher waits in the closed flyout');
});

test('a launcher re-shown while the flyout is open never covers the tiles',async t=>{
  // Host protection and page scripts can re-show a launcher at any time, which puts it on top of the top layer.
  const page=await open(t);
  const hub=(await facts(page)).hub;await page.mouse.click(hub.left+hub.width/2,hub.top+hub.height/2);await settle(page);
  for(const id of ['dropper','prisma']){
    await page.evaluate(id=>{const host=document.querySelector(`[data-product-id="${id}"]`);host.hidePopover();host.showPopover();},id);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const f=await facts(page);
    assert.equal(f.open,true);
    assert.deepEqual(f.hitAtTiles,{dropper:'dropper',shift:'shift',prisma:'prisma',ward:'ward'},`after re-showing ${id}`);
  }
  // Core's own re-shows do not restack again: the top layer settles instead of cycling every frame.
  const toggles=await page.evaluate(()=>new Promise(resolve=>{let count=0;const hosts=[...document.querySelectorAll('[data-exp-product-launcher="1"]')];const on=()=>count++;hosts.forEach(h=>h.addEventListener('toggle',on));setTimeout(()=>{hosts.forEach(h=>h.removeEventListener('toggle',on));resolve(count);},400);}));
  assert.equal(toggles,0);
});

test('the shared launcher names a pending update and progress, not only shows them',async t=>{
  const page=await open(t);
  const label=()=>page.evaluate(()=>[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(h=>h.shadowRoot.querySelector('[data-exp-part="flyout-hub"]')).find(Boolean).getAttribute('aria-label'));
  assert.equal(await label(),'ExtraPotions: Dropper, SHIFT, PRISMA, WARD');
  await page.evaluate(()=>{ExtraPotionsCore.setLauncherUpdate('shift',true);ExtraPotionsCore.setLauncherProgress('dropper',0.47);});
  assert.equal(await label(),'ExtraPotions: Dropper, SHIFT, PRISMA, WARD. SHIFT update available. Dropper 47%');
});

test('a closed menu that is not marked hidden still queues its update card',async t=>{
  // WARD closes its menu by not drawing the panel; the panel keeps hidden=false.
  const page=await open(t);
  await page.evaluate(()=>{const ward=window.products.ward;ward.panel.hidden=false;ward.panel.style.setProperty('display','none','important');
    window.cards=Object.fromEntries(['shift','ward'].map(id=>{const p=window.products[id];return[id,ExtraPotionsCore.createProductNotice({host:p.host,shadow:p.shadow,panel:p.panel})];}));
    cards.shift.show({title:'SHIFT update',version:'3.9.0'});cards.ward.show({title:'WARD update',version:'3.9.0'});});
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(cards).map(([id,c])=>[id,!c.element.hidden]))),{shift:true,ward:false});
});

test('a product with its own card takes a turn in the same queue',async t=>{
  // Dropper draws its own update card; it asks Core for a turn and gives it back when the card hides.
  const page=await open(t);
  const state=()=>page.evaluate(()=>({owner:document.documentElement.dataset.expNoticeOwner||'',shift:!cards.shift.element.hidden}));
  await page.evaluate(()=>{const p=window.products.shift;window.cards={shift:ExtraPotionsCore.createProductNotice({host:p.host,shadow:p.shadow,panel:p.panel})};
    window.turn=ExtraPotionsCore.takeNoticeTurn('dropper:update');cards.shift.show({title:'SHIFT update',version:'3.9.0'});});
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.turn),true,'the first card gets the turn');
  assert.deepEqual(await state(),{owner:'dropper:update',shift:false},'SHIFT waits');
  assert.equal(await page.evaluate(()=>ExtraPotionsCore.takeNoticeTurn('dropper:second')),false,'a second card waits too');
  await page.evaluate(()=>ExtraPotionsCore.releaseNoticeTurn('dropper:update'));await page.waitForTimeout(200);
  assert.deepEqual(await state(),{owner:'shift:1',shift:true},'then SHIFT shows');
});

test('a card shown before the other products load still holds the turn',async t=>{
  // Dropper loads first and shows its card while it is alone; SHIFT's card must wait for it.
  const page=await open(t,{ids:['shift']});
  assert.equal(await page.evaluate(()=>ExtraPotionsCore.takeNoticeTurn('dropper:update')),true);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.expNoticeOwner||''),'dropper:update');
});
