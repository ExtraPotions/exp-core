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

async function setup(t, { clock = false } = {}) {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const p = await browser.newPage();
  if (clock) await p.clock.install();
  await p.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><main>Page</main>' }));
  await p.goto('https://fixture.test/'); await p.addScriptTag({ content: source });
  await p.evaluate(icon => { window.product = ExtraPotionsCore.createProduct({ id: 'shift', name: 'SHIFT', version: '1.0.0', subtitle: 'Tagline', artwork: icon, getSettings: () => ({}), sections: [{ id: 'a', label: 'Appearance', render: () => document.createElement('p') }, { id: 'b', label: 'System', render: () => document.createElement('p') }] }); product.open(); }, icon);
  await p.waitForTimeout(50);
  return p;
}
const dotOf = p => p.evaluate(() => { const s = document.querySelector('#exp-shift-root').shadowRoot; return { dot: s.querySelector('.exp-status-dot')?.dataset.state || null, text: s.querySelector('.exp-status-text')?.textContent || null }; });

test('waiting, paused and attention states each get their label and dot', async t => {
  const p = await setup(t);
  for (const [state, text] of [['waiting', 'Waiting'], ['paused', 'Paused'], ['attention', 'Needs attention']]) {
    await p.evaluate(state => ExtraPotionsCore.setMenuStatus('shift', () => ({ state, reason: 'x' })), state);
    await p.waitForFunction(text => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === text, text);
    assert.deepEqual(await dotOf(p), { dot: state, text });
  }
});

test('a throwing or rejecting source falls back to waiting without breaking the header', async t => {
  const p = await setup(t);
  await p.evaluate(() => ExtraPotionsCore.setMenuStatus('shift', () => { throw new Error('boom'); }));
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Waiting');
  assert.equal((await dotOf(p)).dot, 'waiting');
  await p.evaluate(() => ExtraPotionsCore.setMenuStatus('shift', () => Promise.reject(new Error('no'))));
  await p.waitForTimeout(50);
  assert.deepEqual(await dotOf(p), { dot: 'waiting', text: 'Waiting' });
});

test('the status follows health changes while the menu stays open (10s poll)', async t => {
  const p = await setup(t, { clock: true });
  await p.evaluate(() => { window.health = { state: 'working' }; ExtraPotionsCore.setMenuStatus('shift', () => window.health); });
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Working');
  await p.evaluate(() => { window.health = { state: 'paused' }; });
  await p.clock.fastForward(10500);
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Paused');
});

test('a header without .header-copy keeps its tagline and gets no status flag', async t => {
  const p = await setup(t);
  await p.evaluate(() => { document.querySelector('#exp-shift-root').shadowRoot.querySelector('.header-copy').classList.remove('header-copy'); ExtraPotionsCore.setMenuStatus('shift', () => ({ state: 'working' })); });
  await p.waitForTimeout(100);
  const r = await p.evaluate(() => { const s = document.querySelector('#exp-shift-root').shadowRoot; return { flag: s.querySelector('[data-exp-menu-layout]').dataset.expMenuStatus ?? null, status: !!s.querySelector('[data-exp-part="status"]'), subtitle: getComputedStyle(s.querySelector('[data-exp-part="subtitle"]')).display }; });
  assert.deepEqual(r, { flag: null, status: false, subtitle: 'block' });
});

test('the status is re-attached when the header is replaced', async t => {
  const p = await setup(t, { clock: true });
  await p.evaluate(() => ExtraPotionsCore.setMenuStatus('shift', () => ({ state: 'working' })));
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Working');
  await p.evaluate(() => { const s = document.querySelector('#exp-shift-root').shadowRoot, old = s.querySelector('.header-copy'), fresh = old.cloneNode(true); fresh.querySelector('[data-exp-part="status"]')?.remove(); old.replaceWith(fresh); });
  await p.clock.fastForward(10500);
  await p.waitForFunction(() => !!document.querySelector('#exp-shift-root').shadowRoot.querySelector('.header-copy [data-exp-part="status"]'));
});
