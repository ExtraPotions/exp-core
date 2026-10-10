'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const source = `(() => {\n${bundle}\nglobalThis.ExtraPotionsCore = ExtraPotionsCore;\n})();\n`;
const icon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>');

test('the header shows the product status in place of its tagline and follows changes', async t => {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const p = await browser.newPage();
  await p.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><main>Page</main>' }));
  await p.goto('https://fixture.test/'); await p.addScriptTag({ content: source });
  const read = () => p.evaluate(() => { const s = document.querySelector('#exp-shift-root').shadowRoot, status = s.querySelector('[data-exp-part="status"]');
    return { text: status?.querySelector('.exp-status-text')?.textContent || null, dot: status?.querySelector('.exp-status-dot')?.dataset.state || null, subtitle: getComputedStyle(s.querySelector('[data-exp-part="subtitle"]')).display }; });
  await p.evaluate(icon => { window.product = ExtraPotionsCore.createProduct({ id: 'shift', name: 'SHIFT', version: '1.0.0', subtitle: 'Tagline', artwork: icon, getSettings: () => ({}), sections: [{ id: 'a', label: 'Appearance', render: () => document.createElement('p') }, { id: 'b', label: 'System', render: () => document.createElement('p') }] }); product.open(); }, icon);
  await p.waitForTimeout(50);
  assert.deepEqual(await read(), { text: null, dot: null, subtitle: 'block' }, 'without a status source the tagline stays');
  await p.evaluate(() => { window.health = { state: 'attention', reason: 'Broken' }; ExtraPotionsCore.setMenuStatus('shift', () => window.health); });
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Needs attention');
  assert.deepEqual(await read(), { text: 'Needs attention', dot: 'attention', subtitle: 'none' });
  await p.evaluate(() => { window.health = { state: 'working', reason: 'Fine' }; product.close(); product.open(); });
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Working');
  assert.equal((await read()).dot, 'working');
});
