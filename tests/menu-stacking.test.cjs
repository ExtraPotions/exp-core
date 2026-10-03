'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

// Launcher hosts are top-layer popovers, which stack in the order they were shown. An open menu must
// always be above every other product's launcher, whatever order the products loaded in.
test('an open product menu is never covered by another product launcher',async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route('**/*',route=>route.request().isNavigationRequest()
    ? route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0"><main>Stacking fixture</main></body></html>'})
    : route.abort());
  await page.goto('https://core-stacking.test/');
  await page.addScriptTag({content:source});
  await page.evaluate(()=>{
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
    const section=id=>({id:'main',label:'Main',content:Object.assign(document.createElement('p'),{textContent:id+' menu content'})});
    window.products=['prisma','ward','dropper','shift'].map((id,index)=>ExtraPotionsCore.createProduct({id,name:id,version:'3.3.2',artwork,theme:theme(id),sections:[],priority:[40,60,110,100][index]}));
    localStorage.setItem('exp:v3:launcher-grid-delta','-300');
    document.dispatchEvent(new CustomEvent('exp-core:coordination',{detail:{type:'launcher-grid-moved'}}));
  });
  await page.waitForFunction(()=>{
    const key=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(host=>{const r=host.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher').getBoundingClientRect();return Math.round(r.left)+','+Math.round(r.top);}).join('|');
    const stable=window.__key===key&&key.split('|').every(point=>Number(point.split(',')[1])<600);window.__key=key;return stable;
  },null,{polling:'raf'});

  for(const id of ['prisma','ward','dropper','shift']){
    const covered=await page.evaluate(async id=>{
      // Worst case: every other product was shown after this one, so load order alone would put them on top.
      for(const other of document.querySelectorAll('[data-exp-product-launcher="1"]')){
        if(other.dataset.productId===id)continue;
        other.hidePopover();other.showPopover();
      }
      const product=window.products.find(item=>item.host.dataset.productId===id);
      product.open();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const box=product.panel.getBoundingClientRect();
      const covering=new Set();
      for(let column=0;column<5;column+=1)for(let row=0;row<5;row+=1){
        const top=document.elementFromPoint(box.left+box.width*(0.1+0.2*column),box.top+box.height*(0.05+0.225*row));
        if(top!==product.host)covering.add(top?.dataset?.productId||top?.tagName||'nothing');
      }
      // The menu opens beside the launcher grid, so it must not overlap any launcher at all.
      const overlapping=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].filter(other=>{
        const b=other.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher').getBoundingClientRect();
        return b.left<box.right&&b.right>box.left&&b.top<box.bottom&&b.bottom>box.top;
      }).map(other=>other.dataset.productId);
      const inside=box.left>=7&&box.right<=innerWidth-7&&box.top>=7&&box.bottom<=innerHeight-7;
      product.close();
      return{open:box.width>0&&box.height>0,covering:[...covering],overlapping,inside,side:product.host.dataset.menuSide};
    },id);
    assert.equal(covered.open,true,`${id} menu opened`);
    assert.deepEqual(covered.covering,[],`${id} menu is covered by ${JSON.stringify(covered.covering)}`);
    assert.equal(covered.side,'beside',`${id} menu opens beside the launcher grid`);
    assert.deepEqual(covered.overlapping,[],`${id} menu overlaps launchers ${JSON.stringify(covered.overlapping)}`);
    assert.equal(covered.inside,true,`${id} menu stays inside the window`);
  }
  await page.evaluate(()=>window.products.forEach(product=>product.destroy()));
});

// A surface a product marks with data-exp-reserved (Dropper's progress card) sits left of the launchers.
// Menus open directly above it, sharing its right edge, and notices stack beyond the open menu: nothing may
// cover the card or a launcher. With the launchers anchored at the top, the stack flips below the card.
// In a short window there is no room to stack the notice beyond the menu, so it sits beside the menu instead.
for(const height of [900,500])for(const marker of ['card','row'])for(const anchor of ['bottom','top'])test(`menus and notices stay clear of a reserved progress card and each other, ${anchor} anchor, ${height}px window (${marker} marked)`,async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1280,height}});
  await page.route('**/*',route=>route.request().isNavigationRequest()
    ? route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0"><main>Reserved fixture</main></body></html>'})
    : route.abort());
  await page.goto('https://core-reserved.test/');
  await page.addScriptTag({content:source});
  await page.evaluate(anchor=>{
    localStorage.setItem('exp:v3:launcher-grid-delta',anchor==='top'?'-700':'0');
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const theme=id=>({id,name:id,swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'});
    window.products=['shift','ward','prisma'].map((id,index)=>ExtraPotionsCore.createProduct({id,name:id,version:'3.3.2',artwork,theme:theme(id),sections:[],priority:[100,60,40][index]}));
    // Like Dropper: the product with the card reserves its row, so every launcher stacks in one column.
    window.products[0].host.dataset.launcherReservedRows='1';
    ExtraPotionsCore.layout();
    document.dispatchEvent(new CustomEvent('exp-core:coordination',{detail:{type:'launcher-reservation'}}));
  },anchor);
  await page.waitForFunction(()=>{const key=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(h=>{const r=h.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher').getBoundingClientRect();return Math.round(r.left)+','+Math.round(r.top);}).join('|');const stable=window.__key===key&&!key.includes(',-');window.__key=key;return stable;},null,{polling:'raf'});
  // A progress card 260 wide and 100 tall, directly left of the first launcher, like Dropper's. The marker
  // is either the card itself or (as Dropper 3.3.33 does) the whole row holding the card and the launcher.
  await page.evaluate(marker=>{
    const host=window.products[0].host,own=host.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher').getBoundingClientRect();
    const card=document.createElement('div');
    card.style.cssText=`position:fixed;width:260px;height:100px;left:${own.left-8-260}px;top:${own.bottom-100}px;background:#222`;
    host.shadowRoot.append(card);window.card=card;
    if(marker==='card')card.dataset.expReserved='1';
    else{const row=document.createElement('div');row.dataset.expReserved='1';row.style.cssText=`position:fixed;pointer-events:none;left:${own.left-8-260}px;width:${own.right-(own.left-8-260)}px;top:${own.bottom-112}px;height:112px`;host.shadowRoot.append(row);}
  },marker);
  for(const product of ['shift','ward','prisma']){
    const result=await page.evaluate(async id=>{
      const product=window.products.find(item=>item.host.dataset.productId===id);
      // A realistic menu (about 200px tall) and changelog notice (about 205px tall), as real products have.
      if(!product.panel.querySelector('[data-test-filler]')){const filler=document.createElement('div');filler.dataset.testFiller='1';filler.style.cssText='height:170px';product.panel.append(filler);}
      product.open();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const notice=document.createElement('div');notice.style.cssText='position:fixed;width:260px;height:205px';product.shadow.append(notice);
      ExtraPotionsCore.placeNotice(product.host,notice,product.panel);
      const box=node=>{const r=node.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
      const menu=box(product.panel),card=box(window.card),note=box(notice);
      const hits=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      const launchers=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(h=>box(h.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher')));
      notice.remove();product.close();
      return{side:product.host.dataset.menuSide,menu,card,note,menuHitsCard:hits(menu,card),noteHitsCard:hits(note,card),noteHitsMenu:hits(note,menu),menuHitsLauncher:launchers.some(l=>hits(menu,l)),noteHitsLauncher:launchers.some(l=>hits(note,l))};
    },product);
    const detail=`${product}: ${JSON.stringify(result)}`;
    assert.equal(result.side,'reserved',detail);
    assert.ok(Math.abs(result.menu.right-result.card.right)<=1,`menu shares the card's right edge. ${detail}`);
    if(anchor==='bottom')assert.ok(result.menu.bottom<=result.card.top-7,`menu opens above the card. ${detail}`);
    else assert.ok(result.menu.top>=result.card.bottom+7,`menu opens below the card. ${detail}`);
    const beside=result.note.right<=result.menu.left-7;
    if(height===900){
      assert.equal(beside,false,`with room to spare the notice stacks beyond the menu. ${detail}`);
      if(anchor==='bottom')assert.ok(result.note.bottom<=result.menu.top-7,`notice stacks above the menu. ${detail}`);
      else assert.ok(result.note.top>=result.menu.bottom+7,`notice stacks below the menu. ${detail}`);
    }
    const inside=box=>box.left>=7&&box.right<=1280-7&&box.top>=7&&box.bottom<=height-7;
    assert.ok(inside(result.menu),`the menu stays inside the window. ${detail}`);
    assert.ok(inside(result.note),`the notice stays inside the window. ${detail}`);
    for(const key of ['menuHitsCard','noteHitsCard','noteHitsMenu','menuHitsLauncher','noteHitsLauncher'])assert.equal(result[key],false,`${key}. ${detail}`);
  }
  await page.evaluate(()=>window.products.forEach(product=>product.destroy()));
});
