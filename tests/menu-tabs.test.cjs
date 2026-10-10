'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const source = `(() => {\n${bundle}\nglobalThis.ExtraPotionsCore = ExtraPotionsCore;\n})();\n`;
const icon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#91bfff"/></svg>');

async function page(t, width = 1280) {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  await p.route('**/*', r => r.request().isNavigationRequest() ? r.fulfill({ contentType: 'text/html', body: '<!doctype html><main>Page</main>' }) : r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }));
  await p.goto('https://fixture.test/');
  await p.addScriptTag({ content: source });
  return p;
}

// SHIFT and PRISMA build sections through Core's createProduct, which renders a section only when it opens.
async function product(p) {
  await p.evaluate(icon => {
    const page = text => () => { const p = document.createElement('p'); p.className = 'page-text'; p.textContent = text; return p; };
    window.product = ExtraPotionsCore.createProduct({ id: 'shift', name: 'SHIFT', version: '1.0.0', subtitle: 'Tagline', artwork: icon, getSettings: () => ({}),
      sections: [{ id: 'appearance', label: 'Appearance', render: page('Appearance page') }, { id: 'advanced', label: 'Advanced', render: page('Advanced page') }, { id: 'system', label: 'System', render: page('System page') }] });
    product.open();
  }, icon);
  return p.locator('#exp-shift-root');
}
const state = host => host.evaluate(n => {
  const s = n.shadowRoot, tabs = [...s.querySelectorAll('[data-exp-section-tabs] [role=tab]')];
  return { names: tabs.map(t => t.getAttribute('aria-label')), labels: tabs.map(t => t.textContent.trim()), selected: tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'),
    open: [...s.querySelectorAll('.fl-tool-body,.route-body')].filter(b => !b.hidden && !b.classList.contains('fl-tool-hidden')).length,
    text: [...s.querySelectorAll('.route-body:not([hidden]) .page-text')].map(p => p.textContent),
    headerBox: Math.round(s.querySelector('.fl-tool-header').getBoundingClientRect().height) };
});

test('sections become one row of tabs that renders the chosen section', async t => {
  const p = await page(t); const host = await product(p);
  await p.waitForFunction(() => document.querySelector('#exp-shift-root').shadowRoot.querySelector('[data-exp-section-tabs]'));
  let s = await state(host);
  assert.deepEqual(s.names, ['Appearance', 'Advanced', 'System']);
  assert.deepEqual(s.labels, ['Look', 'Advanced', 'System']);
  assert.equal(s.selected, 0); assert.equal(s.open, 1); assert.deepEqual(s.text, ['Appearance page']);
  assert.ok(s.headerBox <= 1, 'section headers are hidden from view');
  await host.locator('[data-exp-section-tab="advanced"]').click();
  s = await state(host); assert.equal(s.selected, 1); assert.equal(s.open, 1); assert.deepEqual(s.text, ['Advanced page']);
  await host.locator('[data-exp-section-tab="advanced"]').click();
  s = await state(host); assert.equal(s.open, 1, 'selecting the active tab keeps its page open');
});

test('the last tab is remembered and arrow keys move between tabs', async t => {
  const p = await page(t); const host = await product(p);
  await host.locator('[data-exp-section-tab="system"]').click();
  await p.evaluate(() => { product.close(); product.open(); });
  await p.waitForTimeout(50);
  assert.equal((await state(host)).selected, 2);
  await host.locator('[data-exp-section-tab="system"]').focus();
  await p.keyboard.press('Home'); assert.equal((await state(host)).selected, 0);
  await p.keyboard.press('ArrowRight'); assert.equal((await state(host)).selected, 1);
  await p.keyboard.press('End'); assert.equal((await state(host)).selected, 2);
});

test('no empty page: closing the active section through its header reopens a tab', async t => {
  const p = await page(t); const host = await product(p);
  await p.waitForTimeout(50);
  assert.deepEqual((await state(host)).text, ['Appearance page'], 'the first section is open before its header is clicked');
  await host.evaluate(n => n.shadowRoot.querySelector('button[data-section="appearance"]').click());
  await p.waitForTimeout(50);
  assert.equal((await state(host)).open, 1);
});

// Dropper builds its own sections and toggles .fl-tool-hidden itself. The groups sit in a wrapper
// so the page has one top-level group and no inner tab row takes them over.
test('a product that opens System on its own selects the System tab', async t => {
  const p = await page(t);
  await p.evaluate(() => {
    const host = document.createElement('div'); host.id = 'tdh-root'; document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' }); const panel = document.createElement('aside'); panel.dataset.expPart = 'dock'; shadow.append(panel);
    for (const [id, title] of [['tdh-drops-body', 'Drops'], ['tdh-streams-body', 'Streams'], ['tdh-diagnostics-body', 'System']]) {
      const section = document.createElement('section'); section.className = 'fl-tool-panel';
      section.innerHTML = `<div class="fl-tool-header" data-panel="${id}"><span class="fl-tool-title">${title}</span></div><div class="fl-tool-body fl-tool-hidden" id="${id}"><p>${title} page</p><div class="card"><details><summary>Group</summary><div class="row">Row</div></details><details class="eligibility-chip"><summary>Chip</summary>x</details></div></div>`;
      panel.append(section);
    }
    panel.addEventListener('click', e => { const h = e.target.closest('.fl-tool-header'); if (!h) return; const body = shadow.getElementById(h.dataset.panel); const opening = body.classList.contains('fl-tool-hidden'); panel.querySelectorAll('.fl-tool-body').forEach(b => b.classList.add('fl-tool-hidden')); body.classList.toggle('fl-tool-hidden', !opening); });
    ExtraPotionsCore.mountMenuArrangement({ panel, id: 'dropper' });
    window.openSystem = () => { panel.querySelectorAll('.fl-tool-body').forEach(b => b.classList.add('fl-tool-hidden')); shadow.getElementById('tdh-diagnostics-body').classList.remove('fl-tool-hidden'); };
  });
  const host = p.locator('#tdh-root');
  await p.waitForTimeout(50);
  assert.equal((await state(host)).selected, 0);
  await p.evaluate(() => openSystem()); await p.waitForTimeout(50);
  assert.equal((await state(host)).selected, 2, 'the tab follows the section the product opened');
  const groups = await host.evaluate(n => [...n.shadowRoot.querySelectorAll('#tdh-diagnostics-body details')].map(d => ({ chip: d.classList.contains('eligibility-chip'), open: d.open, flat: d.dataset.expFlat || null })));
  assert.deepEqual(groups, [{ chip: false, open: true, flat: '1' }, { chip: true, open: false, flat: null }]);
});

test('narrow panels show icon-only tabs with their names intact and no overflow', async t => {
  const p = await page(t, 360); const host = await product(p);
  // Core's menu placement rewrites the panel's inline width, so the narrow width comes from a stylesheet.
  await host.evaluate(n => { const style = document.createElement('style'); style.textContent = 'aside{width:220px!important;min-width:0!important}'; n.shadowRoot.append(style); });
  await p.waitForTimeout(100);
  const facts = await host.evaluate(n => { const s = n.shadowRoot, list = s.querySelector('[data-exp-section-tabs][role=tablist]'), panel = s.querySelector('aside');
    return { compact: list.dataset.compact, label: getComputedStyle(list.querySelector('.exp-section-tab-label')).display, names: [...list.children].map(t => t.getAttribute('aria-label')), overflow: panel.scrollWidth - panel.clientWidth }; });
  assert.equal(facts.compact, '1'); assert.equal(facts.label, 'none'); assert.deepEqual(facts.names, ['Appearance', 'Advanced', 'System']); assert.equal(facts.overflow, 0);
});
