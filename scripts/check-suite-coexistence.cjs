'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { loadSuiteContract } = require('./suite-contract.cjs');

const coreRoot = path.resolve(__dirname, '..');
const workspace = path.resolve(coreRoot, '..');
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
  return fs.readFileSync(path.join(workspace, product.repo, product.file), 'utf8');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
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
      const storage = new Map();
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
    for (const id of ['prisma', 'ward', 'dropper', 'shift']) {
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
        return host?.dataset?.launcherSlot !== undefined
          && Boolean(host?.shadowRoot?.querySelector('[data-exp-part="launcher"]'));
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

    // Opening each product in turn must leave at most one shared menu surface
    // visibly open. This catches competing menu coordinators across products.
    for (const product of PRODUCTS) {
      await page.locator(product.root).evaluate(host => {
        const launcher = host.shadowRoot.querySelector('[data-exp-part="launcher"]');
        launcher.click();
      });
      await page.waitForTimeout(80);
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

    assert.deepEqual(errors, [], 'suite coexistence browser errors');
    console.log('PASS suite coexistence:', ordered.join(' > '));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
