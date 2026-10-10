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

test('a group marked data-exp-collapsible stays collapsible while plain groups open flat', async t => {
  const p = await page(t);
  await p.evaluate(() => {
    const host = document.createElement('div'); host.id = 'tdh-root'; document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' }); const panel = document.createElement('aside'); panel.dataset.expPart = 'dock'; shadow.append(panel);
    for (const [id, title] of [['tdh-drops-body', 'Drops'], ['tdh-diagnostics-body', 'System']]) {
      const section = document.createElement('section'); section.className = 'fl-tool-panel';
      section.innerHTML = `<div class="fl-tool-header" data-panel="${id}"><span class="fl-tool-title">${title}</span></div><div class="fl-tool-body fl-tool-hidden" id="${id}"><p>${title} page</p><div class="card"><details id="${id}-plain"><summary>Plain</summary><div class="row">Row</div></details><details id="${id}-lazy" data-exp-collapsible><summary>Lazy</summary><div class="row">Row</div></details></div></div>`;
      panel.append(section);
    }
    panel.addEventListener('click', e => { const h = e.target.closest('.fl-tool-header'); if (!h) return; const body = shadow.getElementById(h.dataset.panel); const opening = body.classList.contains('fl-tool-hidden'); panel.querySelectorAll('.fl-tool-body').forEach(b => b.classList.add('fl-tool-hidden')); body.classList.toggle('fl-tool-hidden', !opening); });
    ExtraPotionsCore.mountMenuArrangement({ panel, id: 'dropper' });
    window.openSystem = () => { panel.querySelectorAll('.fl-tool-body').forEach(b => b.classList.add('fl-tool-hidden')); shadow.getElementById('tdh-diagnostics-body').classList.remove('fl-tool-hidden'); };
  });
  const host = p.locator('#tdh-root');
  await p.waitForTimeout(50);
  await p.evaluate(() => openSystem()); await p.waitForTimeout(50);
  const read = () => host.evaluate(n => [...n.shadowRoot.querySelectorAll('#tdh-diagnostics-body details')].map(d => ({ lazy: d.hasAttribute('data-exp-collapsible'), open: d.open, flat: d.dataset.expFlat || null })));
  assert.deepEqual(await read(), [{ lazy: false, open: true, flat: '1' }, { lazy: true, open: false, flat: null }]);
  await host.locator('#tdh-diagnostics-body-lazy > summary').click();
  assert.deepEqual(await read(), [{ lazy: false, open: true, flat: '1' }, { lazy: true, open: true, flat: null }], 'the collapsible group opens by its own summary');
});

test('inner tabs keep a 28px target on fine pointers', async t => {
  const p = await page(t); const host = await product(p);
  const heights = await host.evaluate(n => {
    const body = n.shadowRoot.querySelector('.route-body:not([hidden])');
    body.insertAdjacentHTML('beforeend', '<details><summary>One</summary><div class="row">a</div></details><details><summary>Two</summary><div class="row">b</div></details>');
    return new Promise(resolve => setTimeout(() => resolve([...n.shadowRoot.querySelectorAll('.exp-submenu-tablist>button')].map(b => [b.getAttribute('aria-selected'), b.getBoundingClientRect().height])), 100));
  });
  assert.ok(heights.some(h => h[0] === 'true') && heights.some(h => h[0] !== 'true'), 'an active and an inactive inner tab exist');
  for (const [sel, h] of heights) assert.ok(h >= 28, `inner tab (selected=${sel}) is ${h}px tall`);
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

test('inner tabs are an underlined text row and buttons follow their roles', async t => {
  const p = await page(t); const host = await product(p);
  const facts = await host.evaluate(n => {
    const s = n.shadowRoot, body = s.querySelector('.route-body:not([hidden])');
    // The fixture's default theme is not SHIFT's, so select SHIFT's to get its accent.
    s.querySelector('.exp-core-theme,.cluster').dataset.uiTheme = 'shift';
    body.insertAdjacentHTML('beforeend', '<details><summary>One</summary><div class="row">a</div></details><details><summary>Two</summary><div class="row">b</div></details><button type="button" class="life-btn action" data-exp-primary="1">Go</button><button type="button" class="life-btn action" data-exp-destructive="1">Reset</button><button type="button" class="life-btn action">Other</button>');
    return new Promise(resolve => setTimeout(() => {
      const list = s.querySelector('.exp-submenu-tablist'), active = list?.querySelector('[aria-selected=true]');
      const css = node => getComputedStyle(node);
      const [primary, destructive, other] = [...body.querySelectorAll(':scope button.life-btn')].slice(-3);
      resolve({ wraps: css(list).flexWrap, activeShadow: css(active).boxShadow.includes('inset'), activeBg: css(active).backgroundColor,
        primary: css(primary).backgroundColor, destructive: css(destructive).borderTopColor, other: css(other).backgroundColor,
        switchSize: (() => { const sw = document.createElement('button'); sw.className = 'toggleSwitch'; sw.setAttribute('aria-checked', 'true'); body.append(sw); const r = sw.getBoundingClientRect(), bg = css(sw).backgroundColor; sw.remove(); return [Math.round(r.width), Math.round(r.height), bg]; })() });
    }, 100));
  });
  assert.equal(facts.wraps, 'nowrap'); assert.equal(facts.activeShadow, true); assert.equal(facts.activeBg, 'rgba(0, 0, 0, 0)');
  assert.equal(facts.primary, 'rgb(128, 215, 210)'); assert.equal(facts.destructive, 'rgb(248, 113, 113)'); assert.equal(facts.other, 'rgba(0, 0, 0, 0)');
  assert.deepEqual(facts.switchSize, [30, 17, 'rgb(128, 215, 210)']);
});

// Opens the SHIFT menu with a checked switch and returns its colours under the given theme state.
async function switchColour(t, { theme, skin, forced } = {}) {
  const p = await page(t); const host = await product(p);
  if (forced) await p.emulateMedia({ forcedColors: 'active' });
  const probe = await host.evaluate((n, { theme, skin }) => {
    const s = n.shadowRoot, root = s.querySelector('.exp-core-theme,.cluster'), body = s.querySelector('.route-body:not([hidden])');
    root.dataset.uiTheme = theme || 'shift'; if (skin) root.dataset.themeSkin = skin;
    const sw = document.createElement('button'); sw.className = 'toggleSwitch'; sw.setAttribute('aria-checked', 'true'); sw.style.transition = 'none'; body.append(sw);
    const ref = document.createElement('i'); ref.style.cssText = 'background:Highlight'; body.append(ref);
    return new Promise(resolve => setTimeout(() => resolve({ bg: getComputedStyle(sw).backgroundColor, highlight: getComputedStyle(ref).backgroundColor }), 100));
  }, { theme, skin });
  return probe;
}

test('a checked switch keeps its colours under the contrast theme, the gradient skin and forced colours', async t => {
  assert.equal((await switchColour(t, { theme: 'contrast' })).bg, 'rgb(255, 255, 255)', 'contrast theme: white switch, not the accent');
  assert.equal((await switchColour(t, { skin: 'gradient' })).bg, 'rgb(128, 215, 210)', 'gradient skin: flat accent, as the lean layout intends');
  const forced = await switchColour(t, { skin: 'gradient', forced: true });
  assert.equal(forced.bg, forced.highlight, 'forced colors: the Highlight system color');
  assert.notEqual(forced.bg, 'rgb(128, 215, 210)');
});

test('the System Reset button is a red outline in the lean menu', async t => {
  const p = await page(t); const host = await product(p);
  const facts = await host.evaluate(n => {
    const s = n.shadowRoot, body = s.querySelector('.route-body:not([hidden])');
    const system = ExtraPotionsCore.createProductSystem({ id: 'shift', version: '1.0.0', timeline: document.createElement('div'), diagnostics: document.createElement('div'), onReset() {}, layout: 'grouped' });
    body.append(system); system.querySelector('[data-exp-system-item="reset"]').open = true;
    return new Promise(resolve => setTimeout(() => {
      const b = system.querySelector('[data-exp-system-item="reset"] button'), c = getComputedStyle(b);
      resolve({ border: c.borderTopColor, width: c.borderTopWidth, bg: c.backgroundColor, destructive: b.dataset.expDestructive });
    }, 100));
  });
  assert.deepEqual(facts, { border: 'rgb(248, 113, 113)', width: '1px', bg: 'rgba(0, 0, 0, 0)', destructive: '1' });
});

test('a long inner tab row scrolls sideways without widening the panel', async t => {
  const p = await page(t, 360); const host = await product(p);
  const facts = await host.evaluate(n => {
    const s = n.shadowRoot, body = s.querySelector('.route-body:not([hidden])');
    body.insertAdjacentHTML('beforeend', Array.from({ length: 12 }, (_, i) => `<details><summary>Group number ${i}</summary><div class="row">r</div></details>`).join(''));
    return new Promise(resolve => setTimeout(() => {
      const list = s.querySelector('.exp-submenu-tablist'), panel = s.querySelector('aside');
      resolve({ scrolls: list.scrollWidth > list.clientWidth, wrap: getComputedStyle(list).flexWrap, overflow: panel.scrollWidth - panel.clientWidth });
    }, 100));
  });
  assert.equal(facts.scrolls, true); assert.equal(facts.wrap, 'nowrap'); assert.ok(facts.overflow <= 1);
});
