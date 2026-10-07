'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const workspace = process.env.EXP_SUITE_ROOT || path.resolve(__dirname, '../..');

function instrumentReadableSource(repo) {
  const productRoot = path.join(workspace, repo);
  const testDirectory = repo === 'WARD' ? 'tests-v3' : 'tests';
  const loader = require(path.join(productRoot, testDirectory, 'load-source.cjs'));
  const source = repo === 'Dropper' ? loader.loadDropperSource(productRoot) : loader.loadSource();
  const closing = /\}\)\(\);\s*$/;
  assert.match(source, closing, 'Private health instrumentation requires readable authored assembly');
  const hook = repo === 'Dropper' ? 'window.__health={recoveryNavigationAllowed};})();' : 'window.__health=EXP;})();';
  return source.replace(closing, () => hook);
}

// These fixtures invoke private failure paths, so only their instrumentation uses
// readable assembly. check-suite-coexistence.cjs and product browser tests execute
// the actual minified installs without exposing or depending on private names.
for (const [repo, url, root, system] of [
  ['WARD', 'https://www.amazon.com/dp/fixture', '#exp-ward-root', '.route[data-view="system"]'],
  ['SHIFT', 'https://www.steamgifts.com/', '#exp-shift-root', '[data-section="system"]'],
  ['Dropper', 'https://www.twitch.tv/fixture', '#tdh-root', '[data-panel="tdh-diagnostics-body"]'],
]) {
  test(repo + ' readable internal fixture updates an open System health card when a feature is suspended', {
    skip: !fs.existsSync(path.join(workspace, repo, repo.toLowerCase() + '.user.js')),
  }, async t => {
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.route('**/*', r => r.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><main>Fixture</main></body></html>',
    }));
    await page.goto(url);
    await page.evaluate(() => {
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) {
        return attach.call(this, { ...options, mode: 'open' });
      };
      window.GM_getValue = (key, fallback) => key === 'exp:v3:shift:settings' ? { theme: 'ember' } : fallback;
      window.GM_setValue = () => {};
      window.GM_xmlhttpRequest = () => {};
    });
    await page.addScriptTag({ content: instrumentReadableSource(repo) });
    await page.locator(root).waitFor({ state: 'attached' });
    await page.locator(root).locator('[data-exp-part="launcher"]').click();
    await page.locator(root).locator(system).click();
    const layout = await page.locator(root).locator('[data-exp-product-system]').evaluate(n => n.dataset.expSystemLayout || 'classic');
    if (layout !== 'grouped') await page.locator(root).locator('[data-exp-system-item="timeline"] > summary').click();
    assert.deepEqual(await page.locator(root).locator('[data-exp-product-system] > [data-exp-system-item]').evaluateAll(
      nodes => nodes.map(n => n.dataset.expSystemItem),
    ), layout === 'grouped' ? ['status', 'support', 'reset'] : ['timeline', 'diagnostics', 'issue', 'preferences', 'reset']);
    await page.locator(root).locator('[data-exp-health-state]').waitFor();
    await page.waitForTimeout(50);
    await page.evaluate(repo => {
      if (repo === 'WARD') {
        __health.Retailer = { ...__health.Retailer, detect() { throw Error('fixture'); } };
        for (let i = 0; i < 3; i++) __health.Engine.processBatch();
      } else if (repo === 'SHIFT') {
        __health.Adapters.catalog.steamgifts.process = () => { throw Error('fixture'); };
        for (let i = 0; i < 3; i++) __health.Adapters.process();
      } else {
        for (let i = 0; i < 4; i++) __health.recoveryNavigationAllowed('campaign-stream-retry');
      }
    }, repo);
    await page.waitForFunction(root => document.querySelector(root).shadowRoot.querySelector('[data-exp-health-state]').textContent === 'Needs attention', root, { timeout: 2500 });
    assert.equal(await page.locator(root).locator('[data-exp-health-state]').innerText(), 'Needs attention');
    assert.equal(await page.locator(root).locator('[data-exp-health] button').isVisible(), true);
  });
}
