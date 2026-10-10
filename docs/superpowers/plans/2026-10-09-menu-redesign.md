# Menu Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle and restructure the shared ExtraPotions menu into section tabs, a second row of text tabs, neutral surfaces and a per-product accent, for Dropper, PRISMA, SHIFT and WARD.

**Architecture:**
- Core reshapes each product's existing menu markup when it mounts.
- A new `ExpMenuTabs` module builds the main tab row and opens sections by clicking each product's own (now hidden) section header, so the products' section code is unchanged.
- The neutral look, the header status line, flattened groups and the button roles live in Core's lean-menu and menu-tabs styles.
- Products only:
  - register a status source
  - mark their main action
  - vendor the new Core
  - update the tests that click section headers

**Tech Stack:** Plain JavaScript userscripts, Shadow DOM, Node 24 `node:test`, Playwright 1.63 (Chromium).

**Spec:** `exp-core/docs/superpowers/specs/2026-10-09-menu-redesign-design.md`

## Global Constraints

**Neutral tokens:**

| Token | Value |
|---|---|
| bg | `#09090b` |
| card | `#0c0c0e` |
| line | `#27272a` |
| soft line | `#1c1c1f` |
| muted | `#a1a1aa` |
| text | `#fafafa` |
| tab track | `#18181b` |
| raised tab | `#27272a` |

**Accents:**

| Product | Accent |
|---|---|
| Dropper | `#bc94f5` |
| PRISMA | `#91bfff` |
| SHIFT | `#80d7d2` |
| WARD | `#e7bb75` |

The accent is used only for switches, the tab underlines, the focus ring, the primary button and Dropper's progress bar.

**Shell and header:**
- Panel: radius 16px, border 1px line, shadow `0 16px 44px #0006`, and no footer.
- Header padding 14px 14px 12px.
  - Logo: 30px, radius 8px.
  - Name: 14px/600.
  - Version: 11px muted, still a button that opens the changelog.
  - Status line: 11.5px muted with a dot.
  - Heart and close: 26px outlined buttons, radius 7px.

**Main tabs:**
- Segmented track: padding 3px, radius 9px. Tabs show a 12px icon and an 11.5px label.
- Active tab: raised segment with an inset 2px accent underline.
- Short labels: Appearance → Look, Protection → Protect. The full name is the accessible name.
- Tabs become icon-only when the labels do not fit.
- ARIA tablist semantics, with arrow keys, Home and End.
- The last tab is remembered per product under the key `exp:suite:menu-tab:<id>`.

**Inner tabs:** text tabs, 12px muted. The active tab is in text color with an inset 2px accent underline. A 1px soft-line rule sits under the row. The row never wraps and scrolls sideways.

**Groups:**
- Groups are always open.
- The summary becomes an 11px/500 muted label above a card: border 1px line, radius 10px, background card. Rows are 9px 11px with soft-line dividers.
- Exceptions that stay collapsible: `.eligibility-chip` and `[data-shift-appearance-explanation]`.

**Controls:**
- Switches: 30×17.
- Selects: outlined, radius 7px, 12px.
- Primary button: `[data-exp-primary="1"]`, filled with the accent and dark text, radius 8px.
- Secondary buttons: outlined.
- Destructive buttons: `[data-exp-destructive="1"]`, outlined `#f87171`.

**Typography:** Inter, Segoe UI or the system font. Body 13px, labels 11px.

**Compatibility:** existing user menu themes and Dropper's custom opacity keep working. A selected theme overrides the neutral palette, exactly as today's `applyPalette` does.

**Versions:**
- exp-core: 3.8.0.
- Products: a normal feature release each.
  - Release notes include the line "Redesigned menu with tabs and a cleaner look."

**Process:**
- Commits carry no attribution lines.
- Nothing is pushed or published without the user's explicit go-ahead.
- Run SHIFT's suite with `--test-concurrency=1` on this machine.

## Review Focus

- **A product opens a section on its own while the menu is open** (Dropper's "open Diagnostics", or the version button opening the changelog): the matching tab becomes selected, and nothing fights back. Covered in Task 2: the "product opens System" test.
- **A test or script DOM-clicks the active section's header,** which closes it in product code: the menu must not end up with no page showing. Covered in Task 2: the "no empty page" test.
- **Very narrow panels** (the menu size preference at its smallest, or a 360px window): there's no horizontal overflow, and the tabs become icon-only with their accessible names intact. Covered in Task 2: the "narrow" test.
- **A user with a non-default menu theme** (warm, contrast, Pride): the theme still recolors the menu. The neutral palette must not override it. Covered in Task 1: the lean contract's retained-theme assertion.
- **Products that build section contents lazily on open** (SHIFT and PRISMA through `createProduct`): selecting a tab must render that section's content. Covered in Task 2: the `createProduct` test checks the page text.

---

## File Structure

**exp-core**

| File | Status | Responsibility |
|---|---|---|
| `src/menu-tabs.js` | new | Main section tab row: build, select, remember, keyboard, compact mode, flattening of groups. |
| `src/menu-arrangement.js` | modify | Mount `ExpMenuTabs` from `mount()`, update and destroy it alongside the inner tabs. Restyle the inner tab CSS. |
| `src/lean-menu.js` | modify | Neutral palette, shell, header, status line, cards, controls and button roles. Owns `setMenuStatus`. |
| `src/product-tools.js` | modify | Mark Reset as `data-exp-destructive`. |
| `src/runtime.js` | modify | Export `setMenuStatus`. |
| `scripts/build.cjs` | modify | Add `menu-tabs.js` to the bundle list, before `menu-arrangement.js`. |
| `scripts/capture-screenshots.cjs` | modify | Open sections through the main tabs when they exist. |
| `tests/menu-tabs.test.cjs` | new | Tab behaviour on a `createProduct` fixture and on a Dropper-style fixture. |
| `tests/menu-status.test.cjs` | new | Status line. |
| `tests/lean-menu-visual-contract.test.cjs` | modify | New look values. |
| `tests/system-menu.test.cjs` | modify | Its two inline file lists gain `menu-tabs.js`. |

**Products**
- `src/ui.js` for SHIFT, PRISMA and WARD, or `src/parts/07-markup-lists-and-appearance.js` for Dropper: register the status source and mark the main action.
- Tests that click section headers.
- `vendor/exp-core/*`, release files and README screenshots.

---

### Task 1: Neutral palette, shell and header look

**Files:**
- Modify: `exp-core/src/lean-menu.js` (the `palettes` object, lines 3-8, and the `css` template's shell, header and section rules)
- Test: `exp-core/tests/lean-menu-visual-contract.test.cjs`

**Interfaces:**
- Produces: CSS custom properties on the panel: `--theme-bg`, `--theme-panel`, `--theme-line`, `--theme-text`, `--theme-muted`, `--theme-accent` and `--exp-menu-hover`, plus `--exp-menu-soft: #1c1c1f` and `--exp-menu-track: #18181b`. Later tasks style with these.

- [ ] **Step 1: Write the failing test.** In `tests/lean-menu-visual-contract.test.cjs`:
  - Replace the `products` table, which carries the per-product backgrounds, with the accents below.
  - Replace the `facts` object and its `assert.deepEqual`.

```js
const products=[['Dropper','dropper','tdh-root','rgb(188, 148, 245)'],['PRISMA','prisma','exp-prisma-root','rgb(145, 191, 255)'],['SHIFT','shift','exp-shift-root','rgb(128, 215, 210)'],['WARD','ward','exp-ward-root','rgb(231, 187, 117)']];
// for(const[repo,id,hostId,accent]of products) ...
 const facts=await host.evaluate(n=>{
  const dock=n.shadowRoot.querySelector('[data-exp-part="dock"]'),header=dock.querySelector('.menu-head'),badge=header.querySelector('.header-icon'),title=header.querySelector('[data-exp-part="title"],#tdh-rail-title'),close=header.querySelector('[data-exp-part="close"],#tdh-rail-close'),style=getComputedStyle(dock);
  const probe=document.createElement('span');probe.style.color='var(--theme-accent)';dock.append(probe);const accent=getComputedStyle(probe).color;probe.remove();
  return{width:dock.getBoundingClientRect().width,radius:style.borderRadius,background:style.backgroundColor,border:style.borderTopColor,gradient:style.backgroundImage,badge:Math.round(badge.getBoundingClientRect().width),title:getComputedStyle(title).fontSize,titleWeight:getComputedStyle(title).fontWeight,close:Math.round(close.getBoundingClientRect().width),footer:dock.querySelectorAll('footer,.exp-menu-footer').length,accent,overflow:dock.scrollWidth-dock.clientWidth};
 });
 assert.deepEqual(facts,{width:320,radius:'16px',background:'rgb(9, 9, 11)',border:'rgb(39, 39, 42)',gradient:'none',badge:30,title:'14px',titleWeight:'600',close:26,footer:0,accent,overflow:0});
```

Leave the category icon, typography and retained-theme assertions further down the test in place. Change only:
- the type facts: `size` to `'13px'`
- the `line` assertion, which becomes `assert.ok(parseFloat(type.line) >= 16)`

- [ ] **Step 2: Run it to verify it fails**

Run: `cd exp-core && node --test --test-name-pattern="SHIFT installed menu" tests/lean-menu-visual-contract.test.cjs`
Expected: FAIL. The `background` and `radius` values differ, for example `rgb(17, 28, 29)` and `14px`.

- [ ] **Step 3: Implement.** In `src/lean-menu.js`:

  (a) Replace the `palettes` declaration:

```js
  // Neutral surfaces shared by every product; only the accent identifies the product.
  const neutral=Object.freeze({bg:'#09090b',panel:'#0c0c0e',line:'#27272a',text:'#fafafa',muted:'#a1a1aa',hover:'#18181b'});
  const accents=Object.freeze({dropper:'#bc94f5',prisma:'#91bfff',shift:'#80d7d2',ward:'#e7bb75'});
  const palettes=Object.freeze(Object.fromEntries(Object.entries(accents).map(([id,accent])=>[id,{...neutral,accent}])));
```

  (b) In the `css` template, replace these rules with the ones below: the shell rule (`[data-exp-menu-layout="lean"]{…}`) and the rules for `.menu-head`, `.header-icon`, `.header-icon .menu-icon`, the title, version and subtitle, `.header-actions` and the support/close buttons.

```css
    [data-exp-menu-layout="lean"]{--exp-menu-soft:#1c1c1f;--exp-menu-track:#18181b;box-sizing:border-box!important;padding:0 14px 14px!important;border:1px solid var(--theme-line)!important;border-radius:16px!important;background:var(--theme-bg)!important;background-image:none!important;box-shadow:0 16px 44px #0006!important;color:var(--theme-text)!important;font:400 13px/1.45 Inter,"Segoe UI",system-ui,sans-serif!important}
    [data-exp-menu-layout="lean"] .menu-head{display:flex!important;align-items:center!important;gap:10px!important;width:calc(100% + 28px)!important;margin:0 -14px 2px!important;padding:14px 14px 12px!important;border:0!important;background:transparent!important}
    [data-exp-menu-layout="lean"] .header-brand{display:flex!important;align-items:center!important;gap:10px!important;flex:1;min-width:0}
    [data-exp-menu-layout="lean"] .header-icon{flex:0 0 30px;width:30px!important;height:30px!important;border:0!important;border-radius:8px!important;background:transparent!important;overflow:hidden}
    [data-exp-menu-layout="lean"] .header-icon .menu-icon{width:30px!important;height:30px!important;object-fit:contain}
    [data-exp-menu-layout="lean"] :is(.header-title-row h2,[data-exp-part="title"],#tdh-rail-title){margin:0!important;font-size:14px!important;font-weight:600!important;line-height:1.3!important;letter-spacing:0!important}
    [data-exp-menu-layout="lean"] :is([data-exp-part="version"],#tdh-header-version){padding:0!important;min-height:0!important;border:0!important;background:transparent!important;color:var(--theme-muted)!important;font-size:11px!important;font-weight:400!important}
    [data-exp-menu-layout="lean"] :is([data-exp-part="subtitle"],#tdh-rail-subtitle){display:block!important;margin-top:1px!important;color:var(--theme-muted)!important;font-size:11.5px!important;line-height:1.35!important}
    [data-exp-menu-layout="lean"] .header-actions{display:flex!important;align-items:center!important;gap:6px!important;flex:none}
    [data-exp-menu-layout="lean"] :is(.support-button,[data-exp-part="close"],#tdh-rail-close){display:grid!important;place-items:center!important;flex:none;width:26px!important;height:26px!important;min-height:0!important;padding:0!important;border:1px solid var(--theme-line)!important;border-radius:7px!important;background:transparent!important;color:var(--theme-muted)!important}
    [data-exp-menu-layout="lean"] :is(.support-button,[data-exp-part="close"],#tdh-rail-close):hover{color:var(--theme-text)!important;background:var(--exp-menu-hover)!important}
```

  Then edit the selectors that set the panel text font (`.row` and the others) to use 13px wherever `var(--exp-font-size-body,14px)` appears in lean rules. Keep the menu size preference working by leaving `ExpMenuTypography`'s own variables untouched.

- [ ] **Step 4: Run all four products' lean contract tests**

Run: `cd exp-core && node scripts/build.cjs && node scripts/sync-products.cjs && (cd ../SHIFT && npm run build) && (cd ../PRISMA && npm run build) && (cd ../WARD && npm run build) && (cd ../Dropper && npm run build) && node --test tests/lean-menu-visual-contract.test.cjs`
Expected: PASS, 4 tests. The retained-theme assertion further down still passes, because `applyPalette` only applies the product palette when no other theme is selected.

- [ ] **Step 5: Commit** (exp-core only; products are re-vendored in Task 6)

```bash
cd exp-core && git add src/lean-menu.js tests/lean-menu-visual-contract.test.cjs dist && git commit -m "feat: neutral menu surfaces with a product accent and a compact header"
```

---

### Task 2: Main section tabs

**Files:**
- Create: `exp-core/src/menu-tabs.js`
- Modify: `exp-core/src/menu-arrangement.js` (`mount()`, near lines 196-240)
- Modify: `exp-core/scripts/build.cjs:9` (the `files` list: insert `'menu-tabs.js'` before `'menu-arrangement.js'`)
- Modify: `exp-core/tests/system-menu.test.cjs:37,44` (the same insertion in both inline `files` lists)
- Test: `exp-core/tests/menu-tabs.test.cjs`

**Interfaces:**
- Consumes: the `entries` that `ExpMenuArrangement.mount` already computes, `{section, header, body, label, key}`.
- Produces:
  - `ExpMenuTabs.mount({panel, id, entries}) → {update(), destroy()}`
  - the attributes `[data-exp-section-tabs]` on the panel and on the tab list, and `[data-exp-section-tab="<key>"]` with `role="tab"` and `aria-label="<full label>"` on each tab
  - `[data-exp-flat="1"]` on flattened `details` elements
  - `select(key)` on the returned object, for later tasks

- [ ] **Step 1: Write the failing tests.** Create `exp-core/tests/menu-tabs.test.cjs`:

```js
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
  await host.evaluate(n => n.shadowRoot.querySelector('button[data-section="appearance"]').click());
  await p.waitForTimeout(50);
  assert.equal((await state(host)).open, 1);
});

// Dropper builds its own sections and toggles .fl-tool-hidden itself.
test('a product that opens System on its own selects the System tab', async t => {
  const p = await page(t);
  await p.evaluate(() => {
    const host = document.createElement('div'); host.id = 'tdh-root'; document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' }); const panel = document.createElement('aside'); panel.dataset.expPart = 'dock'; shadow.append(panel);
    for (const [id, title] of [['tdh-drops-body', 'Drops'], ['tdh-streams-body', 'Streams'], ['tdh-diagnostics-body', 'System']]) {
      const section = document.createElement('section'); section.className = 'fl-tool-panel';
      section.innerHTML = `<div class="fl-tool-header" data-panel="${id}"><span class="fl-tool-title">${title}</span></div><div class="fl-tool-body fl-tool-hidden" id="${id}"><p>${title} page</p><details><summary>Group</summary><div class="row">Row</div></details><details class="eligibility-chip"><summary>Chip</summary>x</details></div>`;
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
  await host.evaluate(n => { const panel = n.shadowRoot.querySelector('aside'); panel.style.setProperty('width', '220px', 'important'); });
  await p.waitForTimeout(100);
  const facts = await host.evaluate(n => { const s = n.shadowRoot, list = s.querySelector('[data-exp-section-tabs][role=tablist]'), panel = s.querySelector('aside');
    return { compact: list.dataset.compact, label: getComputedStyle(list.querySelector('.exp-section-tab-label')).display, names: [...list.children].map(t => t.getAttribute('aria-label')), overflow: panel.scrollWidth - panel.clientWidth }; });
  assert.equal(facts.compact, '1'); assert.equal(facts.label, 'none'); assert.deepEqual(facts.names, ['Appearance', 'Advanced', 'System']); assert.equal(facts.overflow, 0);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd exp-core && node scripts/build.cjs && node --test tests/menu-tabs.test.cjs`
Expected: all 5 tests FAIL. No `[data-exp-section-tabs]` element appears, so the first test times out.

- [ ] **Step 3: Create `exp-core/src/menu-tabs.js`**

```js
/* Product sections as one row of tabs. Core opens a section by clicking the product's own
   (hidden) section header, so each product keeps its section code and lazy rendering. */
const ExpMenuTabs = (() => {
  const shortLabels = Object.freeze({ appearance: 'Look', protection: 'Protect' });
  const icons = Object.freeze({ drops: 'gift', streams: 'screen', appearance: 'brush', advanced: 'sliders', system: 'system', highlights: 'sparkle', protection: 'shield', amazon: 'bag' });
  // Disclosures that are inline controls, not groups, stay collapsible.
  const KEEP_COLLAPSIBLE = '.eligibility-chip,[data-shift-appearance-explanation],[data-exp-tab-item]';
  const css = `
    [data-exp-section-tabs]>.fl-tool-panel>.fl-tool-header,[data-exp-section-tabs] nav>.fl-tool-panel>.fl-tool-header{position:absolute!important;width:1px!important;height:1px!important;min-height:0!important;margin:-1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important}
    [data-exp-section-tabs] .fl-tool-panel{margin:0!important;border:0!important;background:transparent!important}
    [data-exp-section-tabs] .fl-tool-body{padding:0!important}
    .exp-section-tabs{display:flex;gap:2px;margin:0 0 2px;padding:3px;border-radius:9px;background:var(--exp-menu-track,#18181b);min-width:0}
    .exp-section-tabs>[role=tab]{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:28px;padding:4px 6px;border:0;border-radius:7px;background:transparent;color:var(--theme-muted);font:500 11.5px/1.2 Inter,"Segoe UI",system-ui,sans-serif;white-space:nowrap;cursor:pointer}
    .exp-section-tabs>[role=tab]:hover{color:var(--theme-text)}
    .exp-section-tabs>[role=tab][aria-selected=true]{background:var(--theme-line);color:var(--theme-text);box-shadow:inset 0 -2px 0 var(--theme-accent)}
    .exp-section-tabs>[role=tab]:focus-visible{outline:2px solid var(--theme-accent);outline-offset:1px}
    .exp-section-tabs .exp-section-icon{flex:0 0 12px;transform:scale(.8)}
    .exp-section-tabs .exp-section-tab-label{overflow:hidden;text-overflow:ellipsis}
    .exp-section-tabs[data-compact="1"] .exp-section-tab-label{display:none}
    [data-exp-section-tabs] details[data-exp-flat]{border:0!important;padding:0!important;margin:0!important;background:transparent!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary{display:block!important;margin:14px 0 6px!important;padding:0!important;list-style:none!important;color:var(--theme-muted)!important;font:500 11px/1.3 Inter,"Segoe UI",system-ui,sans-serif!important;pointer-events:none!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary::before,[data-exp-section-tabs] details[data-exp-flat]>summary::after{display:none!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary::-webkit-details-marker{display:none}
    [data-exp-section-tabs] details[data-exp-flat]>:not(summary){margin:0!important;border:1px solid var(--theme-line)!important;border-top-width:0!important;border-radius:0!important;background:var(--theme-panel)!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary+*{border-top-width:1px!important;border-top-left-radius:10px!important;border-top-right-radius:10px!important}
    [data-exp-section-tabs] details[data-exp-flat]>:not(summary):last-child{border-bottom-left-radius:10px!important;border-bottom-right-radius:10px!important}
    [data-exp-section-tabs] details[data-exp-flat]>:not(summary)+:not(summary){border-top:1px solid var(--exp-menu-soft,#1c1c1f)!important}
    [data-exp-section-tabs] details[data-exp-flat]>:is(.row,.mini-row,.fl-switch,.setting-row){padding:9px 11px!important}
  `;
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const isOpen = entry => !entry.body.hidden && !entry.body.classList.contains('fl-tool-hidden');
  let serial = 0;

  function mount({ panel, id, entries }) {
    const document = panel.ownerDocument, view = document.defaultView;
    const style = document.createElement('style'); style.textContent = css;
    const styleRoot = panel.getRootNode();
    (styleRoot instanceof view.ShadowRoot ? styleRoot : (document.head || document.documentElement)).append(style);
    const storageKey = 'exp:suite:menu-tab:' + id;
    const list = document.createElement('div');
    list.className = 'exp-section-tabs'; list.dataset.expSectionTabs = '1';
    list.setAttribute('role', 'tablist'); list.setAttribute('aria-label', 'Sections');
    const saved = new Map();
    const tabs = entries.map(entry => {
      const index = ++serial, slug = entry.label.toLowerCase();
      const tab = document.createElement('button');
      tab.type = 'button'; tab.id = 'exp-section-tab-' + index; tab.dataset.expSectionTab = entry.key;
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-label', entry.label);
      if (!entry.body.id) entry.body.id = 'exp-section-panel-' + index;
      tab.setAttribute('aria-controls', entry.body.id);
      const icon = document.createElement('span'); icon.className = 'exp-section-icon'; icon.setAttribute('aria-hidden', 'true');
      if (icons[slug]) icon.dataset.icon = icons[slug];
      const text = document.createElement('span'); text.className = 'exp-section-tab-label'; text.textContent = shortLabels[slug] || entry.label;
      tab.append(icon, text); list.append(tab);
      saved.set(entry, { tabindex: entry.header.getAttribute('tabindex'), hidden: entry.header.getAttribute('aria-hidden'), role: entry.body.getAttribute('role'), labelledby: entry.body.getAttribute('aria-labelledby') });
      entry.header.setAttribute('tabindex', '-1'); entry.header.setAttribute('aria-hidden', 'true');
      entry.body.setAttribute('role', 'tabpanel'); entry.body.setAttribute('aria-labelledby', tab.id);
      return tab;
    });
    panel.dataset.expSectionTabs = '1';
    let wasVisible = false, syncing = false, disposed = false, queued = false;
    const visible = () => !panel.hidden && panel.getClientRects().length > 0;

    function place() {
      const parent = entries[0].section.parentElement; if (!parent) return;
      const first = [...parent.children].find(node => entries.some(entry => entry.section === node));
      if (first && list.nextElementSibling !== first) parent.insertBefore(list, first);
    }
    function flatten() {
      for (const entry of entries) for (const details of entry.body.querySelectorAll('details')) {
        if (details.matches(KEEP_COLLAPSIBLE)) continue;
        details.dataset.expFlat = '1';
        if (!details.open) details.open = true;
      }
    }
    function compact() {
      list.dataset.compact = '0';
      list.dataset.compact = list.scrollWidth > list.clientWidth + 1 ? '1' : '0';
    }
    function open(index) { if (entries[index] && !isOpen(entries[index])) entries[index].header.click(); }
    function sync() {
      if (syncing || disposed) return;
      syncing = true;
      try {
        place();
        const nowVisible = visible();
        let active = entries.findIndex(isOpen);
        if (nowVisible) {
          const remembered = entries.findIndex(entry => entry.key === read(storageKey));
          // On opening, the remembered tab wins over a product's default first section; a section
          // the product opened on purpose (anything but the first) is kept.
          if (!wasVisible && remembered >= 0 && active <= 0 && remembered !== active) open(remembered);
          else if (active < 0) open(remembered >= 0 ? remembered : 0);
          active = entries.findIndex(isOpen);
        }
        wasVisible = nowVisible;
        tabs.forEach((tab, i) => { const on = i === active; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on || (active < 0 && i === 0) ? 0 : -1; });
        flatten();
        if (nowVisible) compact();
      } finally { syncing = false; }
    }
    function select(index, focus = false) {
      if (!entries[index]) return;
      write(storageKey, entries[index].key);
      open(index); sync();
      if (focus) tabs[index].focus();
    }
    const click = event => { const index = tabs.indexOf(event.target.closest('[role=tab]')); if (index >= 0) select(index); };
    const keydown = event => {
      const current = tabs.indexOf(event.target); if (current < 0) return;
      const last = tabs.length - 1;
      const index = event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current + last) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? last : -1;
      if (index < 0) return;
      event.preventDefault(); select(index, true);
    };
    list.addEventListener('click', click); list.addEventListener('keydown', keydown);
    const observer = new view.MutationObserver(() => { if (!queued && !disposed) { queued = true; queueMicrotask(() => { queued = false; sync(); }); } });
    observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'aria-expanded', 'open'] });
    const resize = new view.ResizeObserver(() => { if (visible()) compact(); }); resize.observe(panel);
    sync();
    return {
      update: sync,
      select: key => select(entries.findIndex(entry => entry.key === key)),
      destroy() {
        disposed = true; observer.disconnect(); resize.disconnect();
        list.removeEventListener('click', click); list.removeEventListener('keydown', keydown); list.remove(); style.remove();
        delete panel.dataset.expSectionTabs;
        for (const [entry, before] of saved) {
          for (const [node, name, value] of [[entry.header, 'tabindex', before.tabindex], [entry.header, 'aria-hidden', before.hidden], [entry.body, 'role', before.role], [entry.body, 'aria-labelledby', before.labelledby]]) {
            if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
          }
          entry.body.querySelectorAll('details[data-exp-flat]').forEach(details => delete details.dataset.expFlat);
        }
      },
    };
  }
  return Object.freeze({ mount });
})();
```

- [ ] **Step 4: Mount it from the arrangement.** In `src/menu-arrangement.js` `mount()`, directly after `apply();`:

```js
    const sectionTabs = ExpMenuTabs.mount({ panel, id, entries: desired });
```

  Replace the returned object's `update` and `destroy` with:

```js
      update() { collapseSubmenus(panel); tabs.update(); sectionTabs.update(); },
      select: key => sectionTabs.select(key),
      ...
      destroy() {
        sectionTabs.destroy();
        tabs.destroy();
```

  (keep the rest of `destroy` as it is). Add `'menu-tabs.js'` before `'menu-arrangement.js'` in `scripts/build.cjs` and in both inline lists in `tests/system-menu.test.cjs`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd exp-core && node scripts/build.cjs && node --test tests/menu-tabs.test.cjs`
Expected: PASS, 5 tests. If the `createProduct` fixture needs a value the test did not supply, add it to the fixture, never to `menu-tabs.js`.

- [ ] **Step 6: Run the whole exp-core suite**

Run: `cd exp-core && npm test`
Expected: PASS, except tests that click section headers or expect accordion behaviour, such as `submenu-tabs`, `menu-*` and `suite-menu-layout`. Fix each one by selecting the section through `[data-exp-section-tab="<key>"]`. Replace assertions that expect several sections open, or expect `aria-expanded` toggling on headers, with the tab equivalents. Run until green.

- [ ] **Step 7: Commit**

```bash
cd exp-core && git add src/menu-tabs.js src/menu-arrangement.js scripts/build.cjs tests dist && git commit -m "feat: product sections as one row of tabs"
```

---

### Task 3: Header status line

**Files:**
- Modify: `exp-core/src/lean-menu.js`. Add `setMenuStatus` and the status element. Export `Object.freeze({mount,setMenuStatus})`.
- Modify: `exp-core/src/runtime.js:2238`. Add `setMenuStatus:ExpLeanMenu.setMenuStatus` to the `api` object.
- Test: `exp-core/tests/menu-status.test.cjs`

**Interfaces:**
- Produces:
  - `ExtraPotionsCore.setMenuStatus(productId: string, getHealth: () => health | Promise<health>)`, where `health` is the shape `normalizeHealth` accepts: `{state: 'working' | 'waiting' | 'paused' | 'attention', reason}`.
  - The header element `[data-exp-part="status"]`, containing `.exp-status-dot[data-state]` and `.exp-status-text`.
  - `panel.dataset.expMenuStatus === '1'` when a status source exists. The subtitle is then hidden.

- [ ] **Step 1: Write the failing test.** Create `exp-core/tests/menu-status.test.cjs`:

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd exp-core && node scripts/build.cjs && node --test tests/menu-status.test.cjs`
Expected: FAIL with `ExtraPotionsCore.setMenuStatus is not a function`.

- [ ] **Step 3: Implement.** In `src/lean-menu.js`, above `function mount`:

```js
  // Products register how to read their health; the header shows it in place of the tagline.
  const statusSources=new Map(),statusPanels=new Map();
  function setMenuStatus(id,getHealth){
    if(typeof getHealth!=='function')throw new TypeError('Menu status needs a health function');
    statusSources.set(String(id).toLowerCase(),getHealth);
    for(const refresh of statusPanels.get(String(id).toLowerCase())||[])refresh();
  }
```

  Inside `mount`, after the palette code:

```js
    const status=document.createElement('div');status.dataset.expPart='status';status.setAttribute('role','status');
    const dot=document.createElement('span');dot.className='exp-status-dot';const statusText=document.createElement('span');statusText.className='exp-status-text';status.append(dot,statusText);
    let statusTicket=0,statusTimer=0;
    async function refreshStatus(){
      const source=statusSources.get(id);
      if(!source){delete panel.dataset.expMenuStatus;status.remove();return;}
      const copy=panel.querySelector('.header-copy');if(copy&&status.parentElement!==copy)copy.append(status);
      panel.dataset.expMenuStatus='1';const ticket=++statusTicket;
      let value=null;try{value=await source();}catch{}
      if(ticket!==statusTicket)return;
      const health=ExpHealthSummary.normalizeHealth(value);
      dot.dataset.state=health.state;statusText.textContent=health.label;
    }
    if(!statusPanels.has(id))statusPanels.set(id,new Set());statusPanels.get(id).add(refreshStatus);
    const visibility=new MutationObserver(()=>{clearInterval(statusTimer);statusTimer=0;if(!panel.hidden){refreshStatus();statusTimer=setInterval(refreshStatus,10000);}});
    visibility.observe(panel,{attributes:true,attributeFilter:['hidden']});
    refreshStatus();if(!panel.hidden)statusTimer=setInterval(refreshStatus,10000);
```

  Add to the returned cleanup: `visibility.disconnect();clearInterval(statusTimer);statusPanels.get(id)?.delete(refreshStatus);status.remove();delete panel.dataset.expMenuStatus;`

  Add these CSS rules to the `css` template:

```css
    [data-exp-menu-layout="lean"][data-exp-menu-status] :is([data-exp-part="subtitle"],#tdh-rail-subtitle){display:none!important}
    [data-exp-menu-layout="lean"] [data-exp-part="status"]{display:flex;align-items:center;gap:6px;margin-top:1px;color:var(--theme-muted);font-size:11.5px;line-height:1.35}
    [data-exp-menu-layout="lean"] .exp-status-dot{flex:none;width:6px;height:6px;border-radius:50%;background:#a1a1aa}
    [data-exp-menu-layout="lean"] .exp-status-dot[data-state=working]{background:#4ade80}
    [data-exp-menu-layout="lean"] .exp-status-dot:is([data-state=waiting],[data-state=paused]){background:#fbbf24}
    [data-exp-menu-layout="lean"] .exp-status-dot[data-state=attention]{background:#f87171}
```

  Change the module's final line to `return Object.freeze({mount,setMenuStatus});`. In `runtime.js` add `setMenuStatus:ExpLeanMenu.setMenuStatus,` inside the `api` object literal, next to `createProduct`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd exp-core && node scripts/build.cjs && node --test tests/menu-status.test.cjs tests/lean-menu-visual-contract.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd exp-core && git add src/lean-menu.js src/runtime.js tests/menu-status.test.cjs dist && git commit -m "feat: header status line from the product's health"
```

---

### Task 4: Inner tabs, cards and button roles

**Files:**
- Modify: `exp-core/src/lean-menu.js` (CSS for `.exp-submenu-tablist`, rows, switches, selects and buttons)
- Modify: `exp-core/src/product-tools.js` (the grouped System Reset button)
- Test: `exp-core/tests/menu-tabs.test.cjs` (append)

**Interfaces:**
- Consumes: `[data-exp-section-tabs]` from Task 2.
- Produces: the button roles `[data-exp-primary="1"]` (accent fill) and `[data-exp-destructive="1"]` (red outline). Products set `data-exp-primary`; Core sets `data-exp-destructive` on Reset.

- [ ] **Step 1: Write the failing test.** Append to `tests/menu-tabs.test.cjs`:

```js
test('inner tabs are an underlined text row and buttons follow their roles', async t => {
  const p = await page(t); const host = await product(p);
  const facts = await host.evaluate(n => {
    const s = n.shadowRoot, body = s.querySelector('.route-body:not([hidden])');
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd exp-core && node scripts/build.cjs && node --test --test-name-pattern="inner tabs" tests/menu-tabs.test.cjs`
Expected: FAIL on `wraps` or `primary`.

- [ ] **Step 3: Implement.** In `lean-menu.js` `css`, replace the three `.exp-submenu-tablist` rules and the button rules with:

```css
    [data-exp-menu-layout="lean"] .exp-submenu-tablist{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;scrollbar-width:none;gap:14px!important;margin:0 -14px 2px!important;padding:9px 14px 0!important;border-bottom:1px solid var(--exp-menu-soft)!important}
    [data-exp-menu-layout="lean"] .exp-submenu-tablist>button{flex:none!important;min-height:0!important;padding:0 0 7px!important;border:0!important;border-radius:0!important;background:transparent!important;color:var(--theme-muted)!important;font:500 12px/1.3 Inter,"Segoe UI",system-ui,sans-serif!important}
    [data-exp-menu-layout="lean"] .exp-submenu-tablist>button[aria-selected=true]{background:transparent!important;color:var(--theme-text)!important;box-shadow:inset 0 -2px 0 var(--theme-accent)!important}
    [data-exp-menu-layout="lean"] :is(.life-btn,.action,.secondary,.primary,.compact):not([data-exp-part]){min-height:32px!important;padding:6px 10px!important;border:1px solid var(--theme-line)!important;border-radius:8px!important;background:transparent!important;color:var(--theme-text)!important;font:500 12px/1.3 Inter,"Segoe UI",system-ui,sans-serif!important}
    [data-exp-menu-layout="lean"] [data-exp-primary="1"]{border-color:var(--theme-accent)!important;background:var(--theme-accent)!important;color:#09090b!important;font-weight:600!important}
    [data-exp-menu-layout="lean"] [data-exp-destructive="1"]{border-color:#f87171!important;color:#fca5a5!important;background:transparent!important}
    [data-exp-menu-layout="lean"] select{min-height:28px!important;padding:3px 9px!important;border:1px solid var(--theme-line)!important;border-radius:7px!important;background:transparent!important;color:var(--theme-text)!important;font-size:12px!important}
    [data-exp-menu-layout="lean"] .toggleSwitch{width:30px!important;min-width:30px!important;height:17px!important;border:0!important;border-radius:999px!important;background:var(--theme-line)!important}
    [data-exp-menu-layout="lean"] .toggleSwitch::after{top:2px!important;left:2px!important;width:13px!important;height:13px!important;border:0!important;background:var(--theme-muted)!important;transform:none!important}
    [data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]{background:var(--theme-accent)!important}
    [data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]::after{background:#09090b!important;transform:translateX(13px)!important}
```

  The forced-colors rules already in the template stay after these lines, so high-contrast system modes still win.

  In `product-tools.js` `groupedProductSystem`, right after the Reset button is created (`const reset=wide(button('Reset All Settings',…))`), add `reset.dataset.expDestructive='1';`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd exp-core && node scripts/build.cjs && node --test tests/menu-tabs.test.cjs tests/system-menu.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd exp-core && git add src/lean-menu.js src/product-tools.js tests/menu-tabs.test.cjs dist && git commit -m "feat: underlined inner tabs, outlined controls, primary and destructive buttons"
```

---

### Task 5: Screenshot tool opens sections through tabs

**Files:**
- Modify: `exp-core/scripts/capture-screenshots.cjs:107-130` (`openView`)
- Test: `exp-core/tests/capture-screenshots-browser.test.cjs` (existing fixture tests must stay green)

- [ ] **Step 1: Implement.** Replace the first part of `openView` with:

```js
async function openView(host, shot) {
  // Products on the shared menu show sections as tabs; older menus still have section headers.
  const sectionTab = host.locator(`[data-exp-section-tabs] [role="tab"][aria-label="${shot.section}"]`);
  const header = host.locator('.fl-tool-header').filter({ hasText: shot.section }).first();
  if (await sectionTab.count()) {
    await sectionTab.first().click();
  } else {
    try {
      await header.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      throw new Error(`section "${shot.section}" not found`);
    }
    if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  }
  if (!shot.tab) return;
  const tab = host.locator('.exp-submenu-tablist, [role="tablist"]:not([data-exp-section-tabs])').getByRole('tab', { name: shot.tab, exact: true });
```

  The rest (wait, count and click with the existing messages) is unchanged.

- [ ] **Step 2: Run the screenshot tests**

Run: `cd exp-core && node --test tests/capture-screenshots-browser.test.cjs tests/capture-screenshots.test.cjs`
Expected: PASS. The fixture has no section tabs, so the header path is still exercised.

- [ ] **Step 3: Commit**

```bash
cd exp-core && git add scripts/capture-screenshots.cjs && git commit -m "chore: screenshot tool opens sections through the menu tabs"
```

---

### Task 6: Core release 3.8.0, vendored into every product

**Files:**
- Modify: `exp-core/package.json`, `exp-core/package-lock.json`, `exp-core/src/chrome-contract.js:8`, `exp-core/CHANGELOG.md` and `exp-core/dist/*`
- Modify: each product's `vendor/exp-core/*`

- [ ] **Step 1: Bump and build**

```bash
cd exp-core && sed -i "s/const VERSION = '3.7.9';/const VERSION = '3.8.0';/" src/chrome-contract.js && npm version 3.8.0 --no-git-tag-version
```

  Prepend to `CHANGELOG.md`:

```
## 3.8.0 — 2026-10-09

- Redesigns the shared menu: sections are tabs, inner pages are a second row of tabs, and groups are always-open cards.
- Neutral surfaces with each product's accent, a compact header with a live status line, and clear primary and destructive buttons.
```

  Then run `node scripts/build.cjs && node scripts/sync-products.cjs`.

- [ ] **Step 2: Run the exp-core suite**

Run: `cd exp-core && npm test`
Expected: PASS. Every product-facing exp-core test runs against the re-vendored product builds once Tasks 7-10 rebuild them. Until then, tests that read installed product bundles may fail. Record those test names in the ledger and re-run this step after Task 10.

- [ ] **Step 3: Commit**

```bash
cd exp-core && git add -A CHANGELOG.md dist package.json package-lock.json src/chrome-contract.js && git commit -m "Release exp-core 3.8.0: redesigned menu"
```

  (The commit stays local. If later tasks need Core fixes, they go in commits before this one: soft-reset it, commit the fix, then recommit the release.)

---

### Task 7: SHIFT on the redesigned menu

**Files:**
- Modify: `SHIFT/src/ui.js`
  - Register the status source next to `createProduct`.
  - Leave every action unmarked; SHIFT has no primary action in this release.
- Modify: SHIFT tests that click section headers.
- Modify: `SHIFT/vendor/exp-core/*` and `SHIFT/shift.user.js`.

- [ ] **Step 1: Register status.** In `SHIFT/src/ui.js`, immediately after `product = ExtraPotionsCore.createProduct({…});` returns, add:

```js
    ExtraPotionsCore.setMenuStatus('shift', systemHealthSnapshot);
```

  (`systemHealthSnapshot` is the function SHIFT already passes to `createProductTimeline`.)

- [ ] **Step 2: Build and run the suite to find header-click tests**

Run: `cd SHIFT && npm run build && npm test -- --test-concurrency=1 > ../shift-menu.log 2>&1; grep -E "^✖" ../shift-menu.log | sort -u`
Expected: failures limited to tests that open sections through `button[data-section=…]`, `.fl-tool-header` or `route` locators with `.click()`, or that assert accordion state.

- [ ] **Step 3: Fix each failing test.** Replace section opening with tab selection, using the same key:

```js
// before: await host.locator('button[data-section="advanced"]').click();
await host.locator('[data-exp-section-tab="advanced"]').click();
// before (DOM): s.querySelector('button[data-section="advanced"]').click();
s.querySelector('[data-exp-section-tab="advanced"]').click();
```

  An assertion that a section is closed, or that two are open at once, becomes an assertion on `aria-selected` of the matching tab. Do not change product source to satisfy a test; if a test reveals a real Core defect, fix it in exp-core (see Task 6, Step 3).

- [ ] **Step 4: Run the suite until green**

Run: `cd SHIFT && npm test -- --test-concurrency=1`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
cd SHIFT && git add src/ui.js tests vendor shift.user.js && git commit -m "feat: SHIFT on the redesigned menu"
```

---

### Task 8: PRISMA on the redesigned menu

**Files:** `PRISMA/src/ui.js`, PRISMA tests, `PRISMA/vendor/exp-core/*` and `PRISMA/prisma.user.js`

- [ ] **Step 1: Register status and mark the main action.** In `PRISMA/src/ui.js`, after `product = ExtraPotionsCore.createProduct({…});`, add:

```js
    ExtraPotionsCore.setMenuStatus('prisma', systemHealthSnapshot);
```

  Find the button that rescans the page: `grep -n "Rescan" src/ui.js`. Where it is created, add `button.dataset.expPrimary = '1';`, using that button's own variable name.

- [ ] **Step 2: Build and find failures**

Run: `cd PRISMA && npm run build && npm test > ../prisma-menu.log 2>&1; grep -E "^✖" ../prisma-menu.log | sort -u`
Expected: failures limited to header-click and accordion tests.

- [ ] **Step 3: Fix each failing test** with the same replacement as Task 7, Step 3.

- [ ] **Step 4: Add the primary-action check.** Add to the PRISMA test that opens the Highlights section (or create `tests/menu-redesign.test.cjs` using that test's setup):

```js
  assert.equal(await host.locator('[data-exp-primary="1"]').count(), 1);
```

- [ ] **Step 5: Run the suite until green**

Run: `cd PRISMA && npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd PRISMA && git add src/ui.js tests vendor prisma.user.js && git commit -m "feat: PRISMA on the redesigned menu"
```

---

### Task 9: WARD on the redesigned menu

**Files:** `WARD/src/ui.js`, WARD `tests-v3`, `WARD/vendor/exp-core/*` and `WARD/ward.user.js`

WARD builds its own nav, not `createProduct`. Core's `normalizeHeader` already turns WARD's `nav>section` into `.fl-tool-panel`, so tabs apply without markup changes.

- [ ] **Step 1: Register status and mark the main action.** In `WARD/src/ui.js`, after the menu panel is built (where `healthControl` is first created), add:

```js
    ExtraPotionsCore.setMenuStatus('ward', systemHealthSnapshot);
```

  Find the "Reapply protection" button (`grep -n "Reapply protection" src/*.js`). Where it is created, add `.dataset.expPrimary = '1'` on that element.

- [ ] **Step 2: Build and find failures**

Run: `cd WARD && npm run build && npm test > ../ward-menu.log 2>&1; grep -E "^✖" ../ward-menu.log | sort -u`

- [ ] **Step 3: Fix each failing test** with the same replacement as Task 7, Step 3. WARD's route buttons carry `data-route` or the section key; use the key `ExpMenuArrangement` reports, which `[data-exp-section-tab]` mirrors.

- [ ] **Step 4: Run the suite until green**

Run: `cd WARD && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd WARD && git add src tests-v3 vendor ward.user.js && git commit -m "feat: WARD on the redesigned menu"
```

---

### Task 10: Dropper on the redesigned menu

**Files:** `Dropper/src/parts/07-markup-lists-and-appearance.js`, Dropper tests, `Dropper/vendor/exp-core/*`, `Dropper/src/dropper.user.js` and `Dropper/dropper.user.js`

- [ ] **Step 1: Register status and mark the main action.** In `07-markup-lists-and-appearance.js`, directly after `ExtraPotionsCore.mountMenuArrangement({ panel: ui.dock, id: "dropper", … })`, add:

```js
    ExtraPotionsCore.setMenuStatus("dropper", systemHealthSnapshot);
```

  In the Drops markup, add `data-exp-primary="1"` to the "Show Drops Inventory" button (`id="tdh-toggle-inventory"`).

- [ ] **Step 2: Build and find failures**

Run: `cd Dropper && npm run build && npm test > ../dropper-menu.log 2>&1; grep -E "^✖" ../dropper-menu.log | sort -u`

- [ ] **Step 3: Fix each failing test** with the same replacement as Task 7, Step 3. Dropper's header key is its `data-panel` value: `tdh-drops-body`, `tdh-streams-body`, `tdh-progress-body` or `tdh-diagnostics-body`.

  Dropper's progress card stays under the header, and the main tabs follow it. Keep the `pride-theme-contract` assertions:
  - `belowHeader`
  - `aboveDrops`, now measured against the tab row, `[data-exp-section-tabs][role=tablist]`
  - `slotAfterHeader`

- [ ] **Step 4: Run the suite until green**

Run: `cd Dropper && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd Dropper && git add src tests vendor dropper.user.js && git commit -m "feat: Dropper on the redesigned menu"
```

---

### Task 11: Visual review, release preparation and README screenshots

**Files:** each product's release files (via `prepare:release:feature`) and `docs/screenshots/*`

- [ ] **Step 1: Re-run the exp-core suite against the rebuilt products**

Run: `cd exp-core && npm test`
Expected: PASS, every test, including the four lean contracts.

- [ ] **Step 2: Capture review screenshots of all four menus.**
  - Default tab: one screenshot per product.
  - One inner tab per product: Dropper Streams/Routing, PRISMA Look/Style, SHIFT Advanced/Profiles, WARD Amazon/Store.
  - One at 360px wide.
  - Send them to the user, then stop and wait for their approval. This is a gate: no release preparation until the user approves the look.

- [ ] **Step 3: After approval, prepare normal releases.** Run in each product:

```bash
RELEASE_NOTES_JSON='["Redesigned menu with tabs and a cleaner look.","Shows a live status line in the menu header."]' npm run prepare:release:feature
```

  Then run `node scripts/capture-screenshots.cjs` (WARD: `node scripts/capture-visuals.cjs`), and `npm test` once more in each product.

- [ ] **Step 4: Commit each product locally**

```bash
git add -A && git commit -m "Release <Product> <version>: redesigned menu"
```

- [ ] **Step 5: Ask the user for the go-ahead to publish.** Then follow the established order:
  1. Push exp-core and wait for v3.8.0 to publish.
  2. For each product: `node scripts/verify-exp-core-pin.cjs && git fetch origin && git rebase origin/main && git push origin HEAD:main`.
  3. Confirm each served `@version`.
