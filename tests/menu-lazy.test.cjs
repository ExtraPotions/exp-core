'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('unopened menus defer section tabs and their observers, and open, refresh and destroy safely', async t => {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  await page.setContent('<body>Menu fixture</body>');
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '../dist/exp-core.js'), 'utf8') + ';window.core=ExtraPotionsCore;' });
  const result = await page.evaluate(async () => {
    let panelObservers = 0, renders = 0;
    for (const name of ['MutationObserver', 'ResizeObserver']) {
      const Native = window[name];
      window[name] = class extends Native {
        observe(target, options) { if (target.matches?.('aside')) panelObservers++; return super.observe(target, options); }
      };
    }
    const make = id => core.createProduct({ id, name: id, version: 'fixture', artwork: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
      getSettings: () => ({ menuAutoClose: false }), sections: ['look', 'system'].map(id => ({ id, label: id, render() { renders++; const node = document.createElement('p'); node.textContent = id; return node; } })) });
    const untouched = make('ward'); untouched.refresh(); untouched.destroy();
    const product = make('prisma'); product.refresh();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const before = { panelObservers, renders, tabs: product.shadow.querySelectorAll('[role=tab]').length };
    product.open();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const after = { panelObservers, renders, tabs: product.shadow.querySelectorAll('[role=tab]').length, open: product.isOpen };
    product.close(); product.open();
    const reopened = { panelObservers, open: product.isOpen };
    product.destroy();
    return { before, after, reopened, removed: !document.querySelector('#exp-prisma-root,#exp-ward-root') };
  });
  assert.equal(result.before.renders, 0); assert.equal(result.before.tabs, 0);
  assert.equal(result.after.tabs, 2); assert.equal(result.after.renders, 1); assert.equal(result.after.open, true);
  assert.ok(result.after.panelObservers > result.before.panelObservers); assert.equal(result.reopened.panelObservers, result.after.panelObservers);
  assert.equal(result.reopened.open, true); assert.equal(result.removed, true);
});
