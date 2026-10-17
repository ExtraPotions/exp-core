'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const bundle = fs.readFileSync(path.join(__dirname, '../dist/exp-core.js'), 'utf8');
async function fixture(t, csp = '') {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head>${csp ? `<meta http-equiv="Content-Security-Policy" content="${csp}">` : ''}</head><body>Outside the shadow</body></html>`);
  await page.addScriptTag({ content: bundle + ';window.core=ExtraPotionsCore;' });
  return page;
}

test('Core uses one parsed shadow stylesheet and keeps editable, isolated handles', async t => {
  const page = await fixture(t);
  const facts = await page.evaluate(async () => {
    const make = () => { const host = document.createElement('div'); document.body.append(host); const root = host.attachShadow({ mode: 'open' }); root.innerHTML = '<p class="probe">Probe</p>'; return root; };
    const first = make(), second = make();
    const a = core.injectStyle(first, '.probe{color:rgb(255,0,0)}'), b = core.injectStyle(second, '.probe{color:rgb(255,0,0)}');
    const duplicateRules = [...first.styleSheets].reduce((sum, sheet) => sum + sheet.cssRules.length, 0);
    a.textContent = '.probe{color:rgb(0,0,255)}';
    await new Promise(resolve => setTimeout(resolve, 30));
    const colors = [first, second].map(root => getComputedStyle(root.querySelector('p')).color);
    const owned = core.isOwnedSheet(a.expSheet) && core.isOwnedSheet(b.expSheet);
    a.dispose(); a.dispose(); b.dispose();
    return { duplicateRules, colors, owned, remaining: first.adoptedStyleSheets.length + second.adoptedStyleSheets.length, outside: document.styleSheets.length };
  });
  assert.equal(facts.duplicateRules, 0, 'public handles must not parse another copy of their CSS');
  assert.deepEqual(facts.colors, ['rgb(0, 0, 255)', 'rgb(255, 0, 0)']);
  assert.equal(facts.owned, true); assert.equal(facts.remaining, 0); assert.equal(facts.outside, 0);
});

test('Core keeps its shadow style fallback when constructed sheets cannot be created', async t => {
  const page = await fixture(t);
  const facts = await page.evaluate(() => {
    window.CSSStyleSheet = class { constructor() { throw new Error('Unavailable'); } };
    const host = document.createElement('div'); document.body.append(host);
    const root = host.attachShadow({ mode: 'open' }); root.innerHTML = '<p>Fallback</p>';
    const node = core.injectStyle(root, 'p{color:rgb(255,0,0)}');
    const color = getComputedStyle(root.querySelector('p')).color;
    node.textContent = 'p{color:rgb(0,0,255)}';
    const updated = getComputedStyle(root.querySelector('p')).color;
    node.dispose();
    return { color, updated, remaining: root.querySelectorAll('style').length };
  });
  assert.deepEqual(facts, { color: 'rgb(255, 0, 0)', updated: 'rgb(0, 0, 255)', remaining: 0 });
});

test('Core constructed styles still paint with style-src none and stay scoped', async t => {
  const page = await fixture(t, "style-src 'none'");
  const facts = await page.evaluate(() => {
    const host = document.createElement('div'); document.body.append(host);
    const root = host.attachShadow({ mode: 'open' }); root.innerHTML = '<p>Scoped</p>';
    const node = core.injectStyle(root, 'p{color:rgb(255,0,0)}body{background:red}');
    return { color: getComputedStyle(root.querySelector('p')).color, outside: getComputedStyle(document.body).backgroundColor, copies: root.adoptedStyleSheets.length, owned: core.isOwnedSheet(node.expSheet) };
  });
  assert.equal(facts.color, 'rgb(255, 0, 0)'); assert.equal(facts.outside, 'rgba(0, 0, 0, 0)');
  assert.equal(facts.copies, 1); assert.equal(facts.owned, true);
});

test('Core activates its fallback if a shadow silently ignores adopted stylesheets', async t => {
  const page = await fixture(t);
  const facts = await page.evaluate(() => {
    const host = document.createElement('div'); document.body.append(host);
    const root = host.attachShadow({ mode: 'open' }); root.innerHTML = '<p>Ignored adoption</p>';
    Object.defineProperty(root, 'adoptedStyleSheets', { get: () => [], set() {} });
    const node = core.injectStyle(root, 'p{color:rgb(255,0,0)}');
    return { color: getComputedStyle(root.querySelector('p')).color, fallback: Boolean(node.sheet), adopted: Boolean(node.expSheet) };
  });
  assert.deepEqual(facts, { color: 'rgb(255, 0, 0)', fallback: true, adopted: false });
});

test('script menu options have explicit readable popup colors independent of native light scheme', async t => {
  const page = await fixture(t);
  const facts = await page.evaluate(async () => {
    const product = core.createProduct({ id: 'prisma', name: 'PRISMA', version: 'fixture', artwork: '', sections: [{ id: 'look', label: 'Look', render() { const select = document.createElement('select'); select.style.colorScheme = 'light'; select.innerHTML = '<optgroup label="Group"><option>My Priority</option><option>Ending Soonest</option></optgroup>'; return select; } }, { id: 'system', label: 'System', render() { return document.createElement('div'); } }] });
    product.open();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const colors = [...product.shadow.querySelectorAll('option,optgroup')].map(node => { const s = getComputedStyle(node); return { color: s.color, background: s.backgroundColor }; });
    const palette = getComputedStyle(product.shadow.querySelector('.exp-core-theme'));
    const probe = document.createElement('span'); probe.style.color = palette.getPropertyValue('--theme-text'); probe.style.backgroundColor = palette.getPropertyValue('--theme-panel'); product.shadow.append(probe);
    const expected = { color: getComputedStyle(probe).color, background: getComputedStyle(probe).backgroundColor };
    product.destroy(); return { colors, expected };
  });
  assert.ok(facts.colors.length >= 3);
  assert.notEqual(facts.expected.background, 'rgba(0, 0, 0, 0)');
  for (const item of facts.colors) assert.deepEqual(item, facts.expected);
});
