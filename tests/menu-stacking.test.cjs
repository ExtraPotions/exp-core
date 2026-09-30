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
