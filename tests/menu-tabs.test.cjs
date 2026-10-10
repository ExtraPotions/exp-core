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

test('each run of setting rows is one boxed card and other content stays outside it', async t => {
  const p = await page(t); const host = await product(p);
  const facts = await host.evaluate(n => {
    const body = n.shadowRoot.querySelector('.route-body:not([hidden])');
    n.shadowRoot.querySelector('.exp-core-theme,.cluster').dataset.uiTheme = 'shift';
    body.insertAdjacentHTML('beforeend', '<div id="cards"><h3>Label</h3><div class="row">A</div><div class="row">B</div><div class="row">C</div><p>Note</p><div class="row">D</div></div>');
    return new Promise(resolve => setTimeout(() => {
      const box = node => { const c = getComputedStyle(node); return { top: c.borderTopWidth + ' ' + c.borderTopColor, right: c.borderRightWidth + ' ' + c.borderRightColor, bottom: c.borderBottomWidth, left: c.borderLeftWidth + ' ' + c.borderLeftColor,
        radius: [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].join(' '), bg: c.backgroundColor, padding: c.padding }; };
      const [a, b, c, d] = [...body.querySelectorAll('#cards>.row')].map(box);
      resolve({ a, b, c, d, note: box(body.querySelector('#cards>p')) });
    }, 100));
  });
  const line = '1px rgb(39, 39, 42)', soft = '1px rgb(28, 28, 31)', card = 'rgb(12, 12, 14)';
  assert.equal(facts.a.top, line); assert.equal(facts.a.radius, '10px 10px 0px 0px'); assert.equal(facts.a.bottom, '0px');
  for (const row of [facts.a, facts.b, facts.c]) { assert.equal(row.left, line); assert.equal(row.right, line); assert.equal(row.bg, card); assert.equal(row.padding, '9px 11px'); }
  assert.equal(facts.b.top, soft); assert.equal(facts.b.radius, '0px 0px 0px 0px');
  assert.equal(facts.c.top, soft); assert.equal(facts.c.radius, '0px 0px 10px 10px'); assert.equal(facts.c.bottom, '1px');
  assert.equal(facts.note.top.split(' ')[0], '0px'); assert.equal(facts.note.left.split(' ')[0], '0px'); assert.equal(facts.note.bottom, '0px');
  assert.deepEqual([facts.d.top, facts.d.right, facts.d.bottom, facts.d.left, facts.d.radius, facts.d.bg], [line, line, '1px', line, '10px 10px 10px 10px', card]);
});

test('rows hidden by the hidden attribute neither open, close nor split a card', async t => {
  const p = await page(t); const host = await product(p);
  const facts = await host.evaluate(n => {
    const body = n.shadowRoot.querySelector('.route-body:not([hidden])');
    n.shadowRoot.querySelector('.exp-core-theme,.cluster').dataset.uiTheme = 'shift';
    body.insertAdjacentHTML('beforeend', '<div id="first"><h3>L</h3><div class="row" hidden>X</div><div class="row">A</div><div class="row">B</div><p>n</p></div>'
      + '<div id="last"><h3>L</h3><div class="row">A</div><div class="row">B</div><div class="row" hidden>X</div><p>n</p></div>'
      + '<div id="middle"><h3>L</h3><div class="row">A</div><div class="row" hidden>X</div><div class="row">B</div><p>n</p></div>');
    return new Promise(resolve => setTimeout(() => {
      const box = node => { const c = getComputedStyle(node); return { top: c.borderTopWidth + ' ' + c.borderTopColor, bottom: c.borderBottomWidth,
        radius: [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius].join(' ') }; };
      const rows = id => [...body.querySelectorAll(`#${id}>.row:not([hidden])`)].map(box);
      resolve({ first: rows('first'), last: rows('last'), middle: rows('middle') });
    }, 100));
  });
  const line = '1px rgb(39, 39, 42)', soft = '1px rgb(28, 28, 31)';
  // In each case the first visible row opens the card and the last visible row closes the same card.
  const card = [{ top: line, bottom: '0px', radius: '10px 10px 0px 0px' }, { top: soft, bottom: '1px', radius: '0px 0px 10px 10px' }];
  assert.deepEqual(facts, { first: card, last: card, middle: card });
});

// Dropper's Playback rows sit in a flex column with gap:6px, and products may give rows margins.
test('rows of one card touch even when product CSS spaces them, and the card keeps its own gaps', async t => {
  const p = await page(t); const host = await product(p);
  const facts = await host.evaluate(n => {
    const s = n.shadowRoot, body = s.querySelector('.route-body:not([hidden])');
    const style = document.createElement('style'); style.textContent = '.fl-switch{margin:8px 0;box-shadow:0 0 0 3px red}.mini-row{margin-top:6px}#gaps{display:flex;flex-direction:column;gap:6px}#gaps>p{margin:0}'; s.append(style);
    body.insertAdjacentHTML('beforeend', '<div id="gaps"><p>Note</p><div class="fl-switch">A</div><div class="fl-switch">B</div><div class="mini-row">C</div><button type="button">One</button><button type="button">Two</button><div class="fl-switch">D</div><div class="mini-row">E</div></div>');
    return new Promise(resolve => setTimeout(() => {
      const r = sel => s.querySelector('#gaps>' + sel).getBoundingClientRect(), kids = [...s.querySelectorAll('#gaps>*')].map(k => k.getBoundingClientRect());
      const gaps = kids.slice(1).map((k, i) => Math.round((k.top - kids[i].bottom) * 2) / 2);
      resolve({ gaps, shadow: getComputedStyle(s.querySelector('#gaps>.fl-switch')).boxShadow });
    }, 100));
  });
  // Note, A, B, C, One, Two, D, E: 6px to the card, rows touch, 10px after it, 6px between buttons.
  assert.deepEqual(facts.gaps, [6, 0, 0, 10, 6, 6, 0]);
  assert.equal(facts.shadow, 'none');
});

// PRISMA's "explain this match" opens the menu and then its first section on purpose.
test('a section the product opens as the menu shows wins over the remembered tab, even the first', async t => {
  const p = await page(t); const host = await product(p);
  await host.locator('[data-exp-section-tab="system"]').click();
  await p.evaluate(() => product.close()); await p.waitForTimeout(50);
  await host.evaluate(n => { product.open(); n.shadowRoot.querySelector('button[data-section="appearance"]').click(); });
  await p.waitForTimeout(50);
  const s = await state(host);
  assert.equal(s.selected, 0); assert.deepEqual(s.text, ['Appearance page']);
  assert.equal(await p.evaluate(() => localStorage.getItem('exp:suite:menu-tab:shift')), 'system', 'the tab the user chose is still remembered');
});

test('hidden section headers and flattened group labels are not Tab stops, and destroy restores them', async t => {
  const p = await page(t);
  await p.evaluate(() => {
    const host = document.createElement('div'); host.id = 'tdh-root'; document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' }); const panel = document.createElement('aside'); panel.dataset.expPart = 'dock'; shadow.append(panel);
    for (const [id, title] of [['tdh-drops-body', 'Drops'], ['tdh-diagnostics-body', 'System']]) {
      const section = document.createElement('section'); section.className = 'fl-tool-panel';
      section.innerHTML = `<div class="fl-tool-header" data-panel="${id}"><span class="fl-tool-title">${title}</span><button class="fl-tool-chevron" type="button" aria-expanded="false">v</button></div><div class="fl-tool-body fl-tool-hidden" id="${id}"><button type="button" class="first">First</button><div class="card"><details><summary>Group</summary><div class="row"><button type="button" class="inner">Inner</button></div></details></div></div>`;
      panel.append(section);
    }
    panel.addEventListener('click', e => { const h = e.target.closest('.fl-tool-header'); if (!h) return; const body = shadow.getElementById(h.dataset.panel); const opening = body.classList.contains('fl-tool-hidden'); panel.querySelectorAll('.fl-tool-body').forEach(b => b.classList.add('fl-tool-hidden')); body.classList.toggle('fl-tool-hidden', !opening); });
    window.arrangement = ExtraPotionsCore.mountMenuArrangement({ panel, id: 'dropper' });
  });
  const host = p.locator('#tdh-root');
  await p.waitForTimeout(50);
  await host.locator('[data-exp-section-tabs] [role=tab][aria-selected=true]').focus();
  const stops = [];
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press('Tab');
    stops.push(await host.evaluate(n => { const a = n.shadowRoot.activeElement; if (!a) return 'outside';
      return a.closest('.fl-tool-header') ? 'header:' + a.className : a.matches('details[data-exp-flat]>summary') ? 'flat summary' : a.className || a.tagName; }));
  }
  assert.deepEqual(stops.slice(0, 2), ['first', 'inner'], 'Tab goes from the tabs to the page content');
  assert.ok(!stops.some(stop => stop.startsWith('header:') || stop === 'flat summary'), stops.join(', '));
  const toggled = await host.evaluate(n => new Promise(resolve => {
    const details = n.shadowRoot.querySelector('#tdh-drops-body details'); let toggles = 0; details.addEventListener('toggle', () => toggles++);
    details.querySelector('summary').click();
    setTimeout(() => resolve({ toggles, open: details.open }), 100);
  }));
  assert.deepEqual(toggled, { toggles: 0, open: true }, 'a flattened group label does not collapse');
  await host.locator('#tdh-drops-body summary').focus();
  await p.keyboard.press('Enter'); await p.keyboard.press('Space'); await p.waitForTimeout(100);
  assert.equal(await host.evaluate(n => n.shadowRoot.querySelector('#tdh-drops-body details').open), true, 'Enter and Space on a flattened group label do not collapse it');
  const restored = await host.evaluate(n => { arrangement.destroy(); const s = n.shadowRoot;
    return { chevron: s.querySelector('.fl-tool-chevron').getAttribute('tabindex'), header: s.querySelector('.fl-tool-header').getAttribute('tabindex'), summary: s.querySelector('summary').getAttribute('tabindex') }; });
  assert.deepEqual(restored, { chevron: null, header: null, summary: null });
});

test('in forced colours the selected section tab and inner tab are underlined in Highlight', async t => {
  const p = await page(t); await p.emulateMedia({ forcedColors: 'active' }); const host = await product(p);
  const facts = await host.evaluate(n => {
    const s = n.shadowRoot, body = s.querySelector('.route-body:not([hidden])');
    body.insertAdjacentHTML('beforeend', '<details><summary>One</summary><div class="row">a</div></details><details><summary>Two</summary><div class="row">b</div></details>');
    const ref = document.createElement('i'); ref.style.cssText = 'color:Highlight'; body.append(ref);
    return new Promise(resolve => setTimeout(() => {
      const mark = node => { const c = getComputedStyle(node); return [c.borderBottomStyle, c.borderBottomWidth, c.borderBottomColor]; };
      const pick = (sel, on) => s.querySelector(`${sel}[aria-selected=${on}]`);
      resolve({ highlight: getComputedStyle(ref).color,
        section: [mark(pick('[data-exp-section-tabs] [role=tab]', true)), mark(pick('[data-exp-section-tabs] [role=tab]', false))],
        inner: [mark(pick('.exp-submenu-tablist>button', true)), mark(pick('.exp-submenu-tablist>button', false))] });
    }, 100));
  });
  const on = ['solid', '2px', facts.highlight];
  assert.deepEqual(facts.section[0], on); assert.equal(facts.section[1][0], 'none');
  assert.deepEqual(facts.inner[0], on); assert.equal(facts.inner[1][0], 'none');
});

test('the menu size preference scales tabs, buttons, header and group labels from the approved default', async t => {
  const p = await page(t); const host = await product(p);
  await host.evaluate(n => {
    ExtraPotionsCore.setMenuStatus('shift', () => ({ state: 'working' }));
    n.shadowRoot.querySelector('.route-body:not([hidden])').insertAdjacentHTML('beforeend', '<details><summary>One</summary><div class="filters"><select><option>x</option></select></div><div class="card"><details><summary>Group</summary><div class="row">r</div></details></div><div class="button-grid"><button type="button" class="action">Btn</button></div></details><details><summary>Two</summary><div class="row">b</div></details>');
  });
  const read = size => host.evaluate((n, size) => {
    ExtraPotionsCore.setMenuSizePreference(size);
    return new Promise(resolve => setTimeout(() => {
      const s = n.shadowRoot, f = sel => getComputedStyle(s.querySelector(sel)).fontSize;
      resolve({ sectionTab: f('[data-exp-section-tabs] [role=tab]'), title: f('[data-exp-part=title]'), version: f('[data-exp-part=version]'), status: f('[data-exp-part=status]'),
        innerTab: f('.exp-submenu-tablist>button'), select: f('.route-body:not([hidden]) select'), button: f('.route-body:not([hidden]) .action'), groupLabel: f('details[data-exp-flat]>summary') });
    }, 100));
  }, size);
  const standard = await read('standard');
  assert.deepEqual(standard, { sectionTab: '11.5px', title: '14px', version: '11px', status: '11.5px', innerTab: '12px', select: '12px', button: '12px', groupLabel: '11px' });
  const large = await read('extra-large');
  for (const [part, px] of Object.entries(large)) assert.ok(parseFloat(px) > parseFloat(standard[part]), `${part}: ${px} at Extra Large, ${standard[part]} at Standard`);
});

test('in compact mode a tab without an icon keeps its label', async t => {
  const p = await page(t, 360);
  await p.evaluate(icon => {
    const page = () => () => document.createElement('p');
    window.product = ExtraPotionsCore.createProduct({ id: 'ward', name: 'WARD', version: '1.0.0', subtitle: 'Tagline', artwork: icon, getSettings: () => ({}),
      sections: [{ id: 'protection', label: 'Protection', render: page() }, { id: 'retailer', label: 'Retailer', render: page() }, { id: 'appearance', label: 'Appearance', render: page() }, { id: 'system', label: 'System', render: page() }] });
    product.open();
  }, icon);
  const host = p.locator('#exp-ward-root');
  await host.evaluate(n => { const style = document.createElement('style'); style.textContent = 'aside{width:220px!important;min-width:0!important}'; n.shadowRoot.append(style); });
  await p.waitForTimeout(100);
  const facts = await host.evaluate(n => { const list = n.shadowRoot.querySelector('[data-exp-section-tabs][role=tablist]');
    return { compact: list.dataset.compact, labels: [...list.children].map(tab => [tab.getAttribute('aria-label'), getComputedStyle(tab.querySelector('.exp-section-tab-label')).display]) }; });
  assert.equal(facts.compact, '1');
  assert.deepEqual(facts.labels, [['Protection', 'none'], ['Retailer', 'block'], ['Appearance', 'none'], ['System', 'none']]);
});
