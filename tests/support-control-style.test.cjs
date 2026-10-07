'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'dist/exp-core.js'), 'utf8');

for (const viewportWidth of [240, 596, 1361]) {
  const width = Math.min(288, viewportWidth - 24);
  test(`support control is self-styled in a custom shell at ${viewportWidth}px viewport without Core shell CSS`, async t => {
    const browser = await chromium.launch({ headless: true });
    t.after(() => browser.close());
    const page = await browser.newPage({ viewport: { width: viewportWidth, height: 600 } });
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: bundle + '\nwindow.testCore = ExtraPotionsCore;' });
    await page.evaluate(width => {
      const host = document.createElement('div');
      document.body.append(host);
      const shadow = host.attachShadow({ mode: 'open' });
      const panel = document.createElement('section');
      panel.style.cssText = `width:${window.testCore.menuWidth()}px;max-width:calc(100vw - 24px);--theme-panel:#171025;--theme-line:#3c2850;--theme-text:#e8ddf2;--theme-muted:#aa98bb;--theme-accent:#7a46c8;--theme-accent2:#9864dc`;
      const header = document.createElement('header');
      const control = window.testCore.createSupportControl({ label: 'Support fixture' });
      const unrelated = document.createElement('button');
      unrelated.textContent = 'Outside control';
      shadow.append(panel); panel.append(header, unrelated); header.append(control.element);
      window.supportFixture = { host, shadow, panel, header, control, unrelated };
    }, width);
    const initial = await page.evaluate(() => {
      const f = window.supportFixture;
      const button = f.control.button, icon = button.querySelector('svg');
      const box = button.getBoundingClientRect(), svg = icon.getBoundingClientRect();
      return { display: getComputedStyle(button).display, width: box.width, height: box.height, iconWidth: svg.width, iconHeight: svg.height, unrelatedDisplay: getComputedStyle(f.unrelated).display, styles: f.shadow.querySelectorAll('style[data-exp-support-control][data-exp-owned="1"]').length };
    });
    assert.equal(initial.display, 'grid', 'support button owns grid layout');
    assert.deepEqual({ width: initial.width, height: initial.height, iconWidth: initial.iconWidth, iconHeight: initial.iconHeight }, { width: 30, height: 30, iconWidth: 15, iconHeight: 15 });
    assert.notEqual(initial.unrelatedDisplay, 'grid', 'support CSS does not restyle unrelated buttons');
    assert.equal(initial.styles, 1);
    await page.evaluate(() => window.supportFixture.control.button.click());
    const opened = await page.evaluate(() => {
      const f = window.supportFixture, popover = f.control.popover;
      const style = getComputedStyle(popover), box = popover.getBoundingClientRect();
      return { visible: !popover.hidden, expanded: f.control.button.getAttribute('aria-expanded'), movedAfterHeader: f.header.nextElementSibling === popover, width: box.width, panelWidth: f.panel.getBoundingClientRect().width, padding: style.paddingTop, border: style.borderTopWidth, background: style.backgroundColor };
    });
    assert.deepEqual(opened, { visible: true, expanded: 'true', movedAfterHeader: true, width, panelWidth: width, padding: '8px', border: '1px', background: 'rgb(23, 16, 37)' });
    if (viewportWidth === 596) {
      fs.mkdirSync(path.join(root, 'test-artifacts'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'test-artifacts/support-control-custom-shell.png') });
    }
    await page.mouse.click(viewportWidth - 8, 560);
    assert.equal(await page.evaluate(() => window.supportFixture.control.popover.hidden), true);
    await page.evaluate(() => window.supportFixture.control.destroy());
    assert.deepEqual(await page.evaluate(() => ({ styles: window.supportFixture.shadow.querySelectorAll('style[data-exp-support-control]').length, buttons: window.supportFixture.shadow.querySelectorAll('.support-button').length, popovers: window.supportFixture.shadow.querySelectorAll('.support-popover').length })), { styles: 0, buttons: 0, popovers: 0 });
  });
}

test('support styling has one Core source and the control owns its stylesheet lifecycle', () => {
  const foundation = fs.readFileSync(path.join(root, 'src/foundation.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(root, 'src/runtime.js'), 'utf8');
  assert.equal(foundation.includes('function supportControlCss()'), true, 'dedicated Core support stylesheet exists');
  assert.equal((foundation.match(/\.support-button svg\s*\{/g) || []).length, 1);
  assert.equal(runtime.includes('style.textContent = CoreFoundation.supportControlCss();'), true);
  assert.equal(runtime.includes('wrapper.append(style, button, popover);'), true);
  assert.equal(foundation.includes('${supportControlCss()}'), true, 'native canonical sheets consume the same support CSS after clearing prior styles');
  assert.equal(runtime.includes("style.dataset.expOwned = '1';"), true, 'standalone stylesheet is marked as Core-owned');
});
