'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const repos = process.env.EXP_SUITE_ROOT || path.resolve(__dirname, '../..');
const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const coreSource = `(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;
const shiftFile = path.join(repos, 'SHIFT', 'shift.user.js');

test('every stylesheet Core injects is marked as owned, including constructed sheets', async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><head></head><body><main>Owned sheet fixture</main></body></html>');
  await page.addScriptTag({ content: coreSource });
  const facts = await page.evaluate(async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const node = ExtraPotionsCore.injectStyle(shadow, '.probe{color:red}', { probe: '1' });
    const constructed = shadow.adoptedStyleSheets.at(-1);
    const before = constructed.cssRules[0]?.selectorText;
    node.textContent = '.probe{color:blue}';
    await new Promise((resolve) => setTimeout(resolve, 30));
    const foreign = document.createElement('style');
    foreign.textContent = '.other{color:green}';
    document.head.append(foreign);
    const lifecycle = ExtraPotionsCore.createLifecycle();
    lifecycle.injectStyle(document, '.probe-lifecycle{color:red}', { probe: 'lifecycle' });
    const lifecycleSheets = [...document.styleSheets, ...document.adoptedStyleSheets].filter((sheet) => [...sheet.cssRules].some((rule) => rule.selectorText === '.probe-lifecycle'));
    return {
      lifecycleOwned: lifecycleSheets.length > 0 && lifecycleSheets.every((sheet) => ExtraPotionsCore.isOwnedSheet(sheet)),
      nodeOwned: node.dataset.expOwned,
      before,
      after: constructed.cssRules[0]?.selectorText,
      rules: constructed.cssRules.length,
      updatedRule: constructed.cssRules[1]?.cssText,
      nodeSheetOwned: ExtraPotionsCore.isOwnedSheet(node.sheet),
      constructedOwned: ExtraPotionsCore.isOwnedSheet(constructed),
      foreignOwned: ExtraPotionsCore.isOwnedSheet(foreign.sheet),
    };
  });
  assert.equal(facts.nodeOwned, '1');
  assert.equal(facts.before, '.exp-owned-sheet-marker');
  assert.equal(facts.after, '.exp-owned-sheet-marker', 'marker survives a later edit of the style text');
  assert.match(facts.updatedRule, /blue/);
  assert.equal(facts.lifecycleOwned, true, 'styles injected through the product lifecycle are marked too');
  assert.equal(facts.nodeSheetOwned, true);
  assert.equal(facts.constructedOwned, true);
  assert.equal(facts.foreignOwned, false);
});

test('SHIFT themes leave stylesheets injected by Core alone but still theme ordinary page styles', { skip: !fs.existsSync(shiftFile) && 'Requires the SHIFT build' }, async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.route('**/*', (route) => (route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body style="background:#fff;color:#222"><main><p class="exp-probe-owned">owned</p><p class="exp-probe-plain">plain</p></main></body></html>' })
    : route.abort()));
  await page.goto('https://fixture.test/');
  await page.evaluate(() => {
    const store = new Map([['exp:v3:shift:settings', { schema: 1, theme: 'pride', accent: 'pride-default' }]]);
    window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
    window.GM_setValue = (key, value) => store.set(key, value);
    window.GM_deleteValue = (key) => store.delete(key);
    window.GM_addValueChangeListener = () => 1;
    window.GM_registerMenuCommand = () => {};
    window.GM_info = { script: { version: '3.0.0' }, scriptHandler: 'Fixture' };
    window.GM_xmlhttpRequest = () => {};
  });
  await page.addScriptTag({ content: coreSource });
  await page.evaluate(() => {
    ExtraPotionsCore.createLifecycle().injectStyle(document, '.exp-probe-owned{color:#ff0000;background-color:#00ff00}', { probe: '1' });
    const plain = document.createElement('style');
    plain.textContent = '.exp-probe-plain{color:#ff0000;background-color:#00ff00}';
    document.head.append(plain);
  });
  await page.addScriptTag({ content: fs.readFileSync(shiftFile, 'utf8') });
  await page.waitForTimeout(1500);
  const facts = await page.evaluate(() => {
    const themed = document.documentElement.getAttribute('data-exp-shift');
    const selectors = [];
    const walk = (rules) => { for (const rule of rules) { if (rule.selectorText) selectors.push(rule.selectorText); if (rule.cssRules) walk(rule.cssRules); } };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
    const generated = (name) => selectors.filter((selector) => selector.includes(name) && selector.includes('data-exp-shift-preserve'));
    return { themed, ownedRules: generated('exp-probe-owned').length, plainRules: generated('exp-probe-plain').length };
  });
  assert.equal(facts.themed, 'pride', 'the SHIFT theme is active');
  assert.equal(facts.plainRules > 0, true, 'SHIFT rewrites ordinary page rules (control)');
  assert.equal(facts.ownedRules, 0, 'SHIFT does not rewrite rules from a Core-injected stylesheet');
});
