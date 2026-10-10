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

async function setup(t, { clock = false, settings = {} } = {}) {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const p = await browser.newPage();
  if (clock) await p.clock.install();
  await p.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><main>Page</main>' }));
  await p.goto('https://fixture.test/'); await p.addScriptTag({ content: source });
  await p.evaluate(([icon, settings]) => { window.product = ExtraPotionsCore.createProduct({ id: 'shift', name: 'SHIFT', version: '1.0.0', subtitle: 'Tagline', artwork: icon, getSettings: () => settings, sections: [{ id: 'a', label: 'Appearance', render: () => document.createElement('p') }, { id: 'b', label: 'System', render: () => document.createElement('p') }] }); product.open(); }, [icon, settings]);
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

// Dropper's dock and WARD's shell show and hide by a class, never the hidden attribute.
test('the poll stops while a class hides the menu, refreshes as it shows, and leaves unchanged text alone', async t => {
  const p = await setup(t, { clock: true, settings: { menuAutoClose: false } });
  await p.evaluate(() => { window.calls = 0; window.health = { state: 'working' }; ExtraPotionsCore.setMenuStatus('shift', () => { window.calls++; return window.health; }); });
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Working');
  await p.evaluate(() => { const s = document.querySelector('#exp-shift-root').shadowRoot; window.writes = 0;
    new MutationObserver(records => { window.writes += records.length; }).observe(s.querySelector('[data-exp-part="status"]'), { subtree: true, childList: true, characterData: true, attributes: true });
    const style = document.createElement('style'); style.textContent = '[data-exp-menu-layout].closed{display:none!important}'; s.append(style); });
  await p.clock.runFor(30500); await p.waitForTimeout(50);
  const open = await p.evaluate(() => ({ calls: window.calls, writes: window.writes }));
  assert.ok(open.calls >= 4, `the open menu polls (${open.calls} calls)`);
  assert.equal(open.writes, 0, 'an unchanged status is not rewritten');
  await p.evaluate(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('[data-exp-menu-layout]').classList.add('closed'));
  await p.waitForTimeout(100);
  const before = await p.evaluate(() => window.calls);
  await p.clock.runFor(30500); await p.waitForTimeout(50);
  assert.equal(await p.evaluate(() => window.calls), before, 'no polling while the class hides the menu');
  await p.evaluate(() => { window.health = { state: 'paused' }; document.querySelector('#exp-shift-root').shadowRoot.querySelector('[data-exp-menu-layout]').classList.remove('closed'); });
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('.exp-status-text')?.textContent === 'Paused', null, { timeout: 2000 });
});
