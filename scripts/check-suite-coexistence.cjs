'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { loadSuiteContract } = require('./suite-contract.cjs');
const consumers = require('./consumer-roots.cjs').resolveConsumerRoots();

const coreRoot = path.resolve(__dirname, '..');
consumers.options();
const { repositories } = loadSuiteContract(coreRoot);

const PRODUCTS = [
  { id: 'dropper', repo: 'Dropper', file: 'dropper.user.js', root: '#tdh-root' },
  { id: 'shift', repo: 'SHIFT', file: 'shift.user.js', root: '#exp-shift-root' },
  { id: 'ward', repo: 'WARD', file: 'ward.user.js', root: '#exp-ward-root' },
  { id: 'prisma', repo: 'PRISMA', file: 'prisma.user.js', root: '#exp-prisma-root' },
];

assert.deepEqual(
  PRODUCTS.map(product => product.repo).sort(),
  [...repositories].sort(),
  'coexistence coverage must match the suite manifest',
);

function productSource(product) {
  return fs.readFileSync(consumers.file(product.repo, product.file), 'utf8');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const injectionOrder of [['prisma','ward','dropper','shift'], ['shift','dropper','ward','prisma']]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.route('**/*', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body><main><h1>ExtraPotions coexistence fixture</h1><p>bisexual pansexual retail drops fixture</p></main></body></html>',
    }));
    await page.goto('https://www.twitch.tv/');

    await page.evaluate(() => {
      const attachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function forceOpen(options) {
        return attachShadow.call(this, { ...options, mode: 'open' });
      };
      const storage = new Map([['exp:v3:shift:settings',{theme:'ember',accent:'site-default'}]]);
      window.GM_getValue = (key, fallback) => storage.has(key) ? storage.get(key) : fallback;
      window.GM_setValue = (key, value) => storage.set(key, value);
      window.GM_deleteValue = key => storage.delete(key);
      window.GM_addValueChangeListener = () => 1;
      window.GM_removeValueChangeListener = () => {};
      window.GM_registerMenuCommand = () => {};
      window.GM_info = { script: { version: 'coexistence' }, scriptHandler: 'Fixture' };
      window.GM_xmlhttpRequest = options => {
        queueMicrotask(() => options.onerror?.({ status: 0 }));
        return { abort() {} };
      };
      window.fetch = async () => { throw new Error('Fixture network disabled'); };
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async () => {} },
      });
    });

    // Deliberately use a non-priority load order. Core must converge on the
    // canonical suite contract rather than relying on injection order.
    for (const id of injectionOrder) {
      const product = PRODUCTS.find(item => item.id === id);
      await page.addScriptTag({ content: productSource(product) });
    }

    for (const product of PRODUCTS) {
      await page.locator(product.root).waitFor({ state: 'attached' });
    }
    await page.waitForFunction(products => {
      const order = JSON.parse(localStorage.getItem('exp:v3:launcher-order') || '[]');
      return order.length === products.length && products.every(product => {
        const host = document.querySelector(product.root);
        const launcher = host?.shadowRoot?.querySelector('[data-exp-part="launcher"]');
        if (host?.dataset?.launcherSlot === undefined || !launcher) return false;
        // Registration precedes the animation-frame layout. Wait for placement
        // before testing hit targets, while retaining a bounded timeout.
        const box = launcher.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.left >= 0 && box.top >= 0
          && box.right <= innerWidth && box.bottom <= innerHeight;
      });
    }, PRODUCTS);

    const snapshot = await page.evaluate(products => {
      const result = {};
      for (const product of products) {
        const host = document.querySelector(product.root);
        if (!host?.shadowRoot) throw new Error('Missing open shadow root for ' + product.id);
        const launcher = host.shadowRoot.querySelector('[data-exp-part="launcher"]');
        const dock = host.shadowRoot.querySelector('[data-exp-part="dock"]');
        if (!launcher || !dock) throw new Error('Missing Core surface markers for ' + product.id);
        const launcherBox = launcher.getBoundingClientRect();
        result[product.id] = {
          launcher: {
            x: Math.round(launcherBox.x),
            y: Math.round(launcherBox.y),
            width: Math.round(launcherBox.width),
            height: Math.round(launcherBox.height),
            expanded: launcher.getAttribute('aria-expanded'),
            slot: Number(host.dataset.launcherSlot),
          },
          dockHidden: dock.hidden,
          dockDisplay: getComputedStyle(dock).display,
          productId: host.dataset.productId || host.getAttribute('data-product-id') || '',
        };
      }
      return result;
    }, PRODUCTS);

    for (const product of PRODUCTS) {
      assert.equal(snapshot[product.id].launcher.width, 48, product.id + ' launcher width');
      assert.equal(snapshot[product.id].launcher.height, 48, product.id + ' launcher height');
    }

    const coordinates = PRODUCTS.map(product => snapshot[product.id].launcher.y + ':' + snapshot[product.id].launcher.x);
    assert.equal(new Set(coordinates).size, PRODUCTS.length, 'launchers occupy distinct grid positions');

    // Every launcher must be reachable: nothing (another product's launcher or
    // progress card) may sit on top of it.
    const unreachable = await page.evaluate(products => products.filter(product => {
      const host = document.querySelector(product.root);
      const box = host.shadowRoot.querySelector('[data-exp-part="launcher"]').getBoundingClientRect();
      return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) !== host;
    }).map(product => product.id), PRODUCTS);
    assert.deepEqual(unreachable, [], 'every launcher receives clicks at its own position');

    // Opening each product in turn must leave at most one shared menu surface
    // visibly open. This catches competing menu coordinators across products.
    for (const [size,width,height] of [['standard',1280,1000],['large',1280,600],['extra-large',640,500],['extra-large',360,500]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(size=>{localStorage.setItem('exp:suite:menu-size',size);document.dispatchEvent(new CustomEvent('exp-core:menu-size',{detail:size}));},size);
    for (const product of PRODUCTS) {
      // Worst case for stacking: every other product was shown after this one, so
      // load order alone would place their launchers above this product's menu.
      await page.evaluate(id => {
        for (const other of document.querySelectorAll('[data-exp-product-launcher="1"]')) {
          if (other.dataset.productId === id) continue;
          other.hidePopover();
          other.showPopover();
        }
      }, product.id);
      await page.locator(product.root).locator('[data-exp-part="launcher"]').click();
      await page.waitForFunction(root=>{const host=document.querySelector(root),dock=host?.shadowRoot?.querySelector('[data-exp-part="dock"]'),b=dock?.getBoundingClientRect();return dock&&!dock.hidden&&b.width>0&&b.height>0&&b.left>=0&&b.top>=0&&b.right<=innerWidth+.5&&b.bottom<=innerHeight+.5;},product.root);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const visible = await page.evaluate(products => products.filter(product => {
        const host = document.querySelector(product.root);
        const dock = host?.shadowRoot?.querySelector('[data-exp-part="dock"]');
        if (!dock || dock.hidden) return false;
        const style = getComputedStyle(dock);
        const rect = dock.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      }).map(product => product.id), PRODUCTS);
      assert.ok(visible.length <= 1, 'only one suite menu may be visible: ' + JSON.stringify(visible));
      if (visible.length === 1) assert.equal(visible[0], product.id);

      // The open menu must be on top: no other product's launcher or surface may cover any part of it.
      const covered = await page.evaluate(id => {
        const host = document.querySelector('[data-exp-product-launcher="1"][data-product-id="' + id + '"]');
        const box = host.shadowRoot.querySelector('[data-exp-part="dock"]').getBoundingClientRect();
        const covering = new Set();
        for (let column = 0; column < 5; column += 1) {
          for (let row = 0; row < 5; row += 1) {
            const top = document.elementFromPoint(box.left + box.width * (0.1 + 0.2 * column), box.top + box.height * (0.05 + 0.225 * row));
            if (top !== host) covering.add(top?.dataset?.productId || top?.tagName || 'nothing ' + JSON.stringify({x:box.x,y:box.y,w:box.width,h:box.height,vw:innerWidth,vh:innerHeight}));
          }
        }
        // Menus open beside the launcher grid: no launcher or reserved surface (Dropper's progress row) may
        // overlap the open menu's rectangle, whether or not it is drawn on top.
        for (const other of document.querySelectorAll('[data-exp-product-launcher="1"]')) {
          const parts = [other.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher'), ...other.shadowRoot.querySelectorAll('[data-exp-reserved]')];
          for (const part of parts) {
            const b = part?.getBoundingClientRect();
            if (b?.width && b.left < box.right && b.right > box.left && b.top < box.bottom && b.bottom > box.top) covering.add('overlaps ' + other.dataset.productId);
          }
        }
        return [...covering];
      }, product.id);
      assert.deepEqual(covered, [], product.id + ' menu is covered by ' + JSON.stringify(covered));
      const dimensions=await page.locator(product.root).evaluate(host=>{const dock=host.shadowRoot.querySelector('[data-exp-part="dock"]'),b=dock.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,size:host.dataset.expMenuSize,body:host.style.getPropertyValue('--exp-font-size-body'),label:getComputedStyle(host.shadowRoot.querySelector('.fl-tool-title')).fontSize};});
      const topMenus=await page.locator(product.root).evaluate(host=>[...host.shadowRoot.querySelectorAll('.fl-tool-header')].filter(n=>!n.closest('.fl-tool-body')).map(n=>n.querySelector('.fl-tool-title')?.textContent?.trim()).filter(Boolean));
      assert.equal(topMenus.at(-1),'System',product.id+' System must be last');
      assert.equal(dimensions.size,size);assert.equal(dimensions.body,({standard:'14px',large:'16px','extra-large':'18px'})[size]);assert.equal(dimensions.label,dimensions.body,product.id+' rendered menu label size');
      assert.ok(dimensions.left>=0&&dimensions.top>=0&&dimensions.right<=width+.5&&dimensions.bottom<=height+.5,product.id+' '+size+' viewport: '+JSON.stringify(dimensions));
    }
    }

    // Shared launcher slot order must converge to Core's manifest priority,
    // independent of injection order. Physical coordinates are intentionally
    // anchor-dependent, so data-launcher-slot is the authoritative grid order.
    const expectedOrder = ['dropper', 'shift', 'ward', 'prisma'];
    const ordered = PRODUCTS
      .map(product => ({ id: product.id, slot: snapshot[product.id].launcher.slot }))
      .sort((a, b) => a.slot - b.slot)
      .map(item => item.id);
    assert.deepEqual(ordered, expectedOrder);
    const savedOrder = await page.evaluate(() => JSON.parse(localStorage.getItem('exp:v3:launcher-order') || '[]'));
    assert.deepEqual(savedOrder, expectedOrder);

    await page.waitForFunction(()=>document.querySelector('main .exp-prisma-hit'));
    const highlights=await page.locator('main .exp-prisma-hit').evaluateAll(nodes=>nodes.map(n=>({gradient:getComputedStyle(n).backgroundImage,fill:getComputedStyle(n).webkitTextFillColor,palette:n.style.getPropertyValue('--prisma-colors')})));
    assert.ok(highlights.length>=2&&highlights.every(n=>n.gradient.includes('linear-gradient')&&n.fill==='rgba(0, 0, 0, 0)'&&n.palette.includes('#')), 'active SHIFT preserves PRISMA annotation colors: '+JSON.stringify(highlights));
    assert.deepEqual(errors, [], 'suite coexistence browser errors');
    console.log('PASS suite coexistence:', injectionOrder.join(' > '), 'all menu sizes, 360px viewport and active-theme annotation preservation');
    await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
