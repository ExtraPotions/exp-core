'use strict';
// Opens every section of every product menu and looks for layout mistakes that
// unit tests miss: headings squeezed into a column of single letters, and the
// same button shown twice in one section.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const repos = process.env.EXP_SUITE_ROOT || path.resolve(__dirname, '../..');
const products = [
  { name: 'Dropper', host: '#tdh-root' },
  { name: 'WARD', host: '#exp-ward-root' },
  { name: 'PRISMA', host: '#exp-prisma-root' },
  { name: 'SHIFT', host: '#exp-shift-root' },
];
const suiteAvailable = products.every(({ name }) => fs.existsSync(path.join(repos, name, `${name.toLowerCase()}.user.js`)));

// Live status text can be much longer than the placeholder text in a fixture,
// so give every summary/status/health slot a long value before measuring.
function stressStatusText(hostSelector) {
  const shadow = document.querySelector(hostSelector).shadowRoot;
  for (const node of shadow.querySelectorAll('[class*="summary"]:not([class*="chevron"]), [id*="summary"], [id*="health"]')) {
    if (node.children.length === 0 && !node.closest('.update-notice, .changelog') && node.tagName !== 'SUMMARY') {
      node.textContent = 'Claims: none · Drop: monitoring · Bonus: monitoring';
    }
  }
}

// Runs inside the page against one open menu section.
function inspectSection(hostSelector) {
  const host = document.querySelector(hostSelector);
  const shadow = host.shadowRoot;
  const visible = (node) => {
    if (!node.isConnected || node.closest('[hidden]')) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return (rect.width > 0 || rect.height > 0) && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const problems = [];
  for (const node of shadow.querySelectorAll('*')) {
    if (!visible(node) || ['STYLE', 'SCRIPT', 'SVG', 'PATH'].includes(node.tagName.toUpperCase())) continue;
    const own = [...node.childNodes].filter((child) => child.nodeType === 3).map((child) => child.textContent).join('').replace(/\s+/g, ' ').trim();
    if (own.length < 6) continue;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const range = document.createRange();
    const tops = new Set();
    for (const child of node.childNodes) {
      if (child.nodeType !== 3 || !child.textContent.trim()) continue;
      range.selectNodeContents(child);
      for (const line of range.getClientRects()) tops.add(Math.round(line.top / 2));
    }
    const lines = tops.size;
    if (style.textOverflow === 'ellipsis' && lines === 1) continue; // deliberately shrinks and truncates
    if (rect.width < 24 || lines >= own.length * 0.6) {
      problems.push(`squeezed text in ${node.tagName.toLowerCase()}${node.id ? "#" + node.id : ""}${typeof node.className === "string" && node.className ? "." + node.className.split(" ")[0] : ""} "${own.slice(0, 30)}" is ${Math.round(rect.width)}px wide over ${Math.round(lines)} lines`);
    }
  }
  const labels = new Map();
  for (const button of shadow.querySelectorAll('button, [role="button"], a.update-action')) {
    if (!visible(button) || button.getAttribute('role') === 'switch' || button.matches('.fl-tool-chevron, .fl-tool-header, .launcher, .ward-launcher, [aria-label="Close"], .close')) continue;
    if (button.closest('.update-notice, .changelog, [data-exp-update-notice]')) continue;
    const label = (button.textContent || '').replace(/\s+/g, ' ').trim();
    if (label.length < 3) continue;
    const scope = button.closest('.fl-tool-body, .route-body, [role="region"], details') || shadow;
    if (/^(details|view source|source|learn more|more|edit|remove|delete|open|view|copy)$/i.test(label)) continue; // per-row actions
    const key = label;
    const seen = labels.get(scope) || new Map();
    seen.set(key, (seen.get(key) || 0) + 1);
    labels.set(scope, seen);
  }
  for (const seen of labels.values()) {
    for (const [label, count] of seen) if (count > 1) problems.push(`"${label}" appears ${count} times in one section`);
  }
  return problems;
}

for (const viewport of [{ width: 360, height: 900 }, { width: 1100, height: 900 }]) {
  for (const product of products) {
    test(`${product.name} menu sections have no squeezed text or repeated buttons at ${viewport.width}px`, { skip: !suiteAvailable && 'Requires four sibling product builds' }, async (t) => {
      const browser = await chromium.launch();
      t.after(() => browser.close());
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/*', (route) => (route.request().isNavigationRequest()
        ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="background:#24262b"><main>Menu layout fixture</main></body></html>' })
        : route.abort()));
      await page.goto(product.name === 'WARD' ? 'https://www.amazon.com/' : product.name === 'Dropper' ? 'https://www.twitch.tv/' : 'https://fixture.test/');
      await page.evaluate(() => {
        const attach = Element.prototype.attachShadow;
        Element.prototype.attachShadow = function (options) { return attach.call(this, { ...options, mode: 'open' }); };
        const store = new Map();
        window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
        window.GM_setValue = (key, value) => store.set(key, value);
        window.GM_deleteValue = (key) => store.delete(key);
        window.GM_addValueChangeListener = () => 1;
        window.GM_removeValueChangeListener = () => {};
        window.GM_registerMenuCommand = () => {};
        window.GM_info = { script: { version: '3.0.0' }, scriptHandler: 'Fixture' };
        window.GM_xmlhttpRequest = () => {};
      });
      await page.addScriptTag({ content: fs.readFileSync(path.join(repos, product.name, `${product.name.toLowerCase()}.user.js`), 'utf8') });
      const host = page.locator(product.host);
      await host.waitFor({ state: 'attached' });
      await host.evaluate((node) => node.shadowRoot.querySelector('.launcher, .ward-launcher, #tdh-settings-launcher').click());
      const supportStyle = await host.evaluate(node => {
        const control = node.shadowRoot.querySelector('.support-button');
        const icon = control?.querySelector('svg');
        const buttonRect = control?.getBoundingClientRect();
        const iconRect = icon?.getBoundingClientRect();
        return { width: buttonRect?.width, height: buttonRect?.height, iconWidth: iconRect?.width, iconHeight: iconRect?.height, display: control && getComputedStyle(control).display };
      });
      assert.deepEqual(supportStyle, { width: 30, height: 30, iconWidth: 15, iconHeight: 15, display: 'grid' }, product.name + ': support control has canonical rendered styles');
      const headers = await host.evaluate((node) => [...node.shadowRoot.querySelectorAll('.fl-tool-header, [data-route], [data-view], [data-section]')]
        .filter((item) => item.matches('.fl-tool-header') || !item.closest('.fl-tool-header'))
        .map((item, index) => { item.dataset.layoutProbe = String(index); return { index, label: (item.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) }; }));
      assert.ok(headers.length >= 2, `${product.name}: menu sections found`);
      const problems = [];
      for (const header of headers) {
        await host.evaluate((node, index) => {
          const button = node.shadowRoot.querySelector(`[data-layout-probe="${index}"]`);
          if (button && button.getAttribute('aria-expanded') !== 'true') button.click();
          for (const details of node.shadowRoot.querySelectorAll('details')) details.open = true;
        }, header.index);
        await page.waitForTimeout(120);
        await page.evaluate(stressStatusText, product.host);
        await page.waitForTimeout(60);
        const found = await page.evaluate(inspectSection, product.host);
        for (const problem of found) problems.push(`${header.label}: ${problem}`);
      }
      assert.deepEqual([...new Set(problems)], [], `${product.name} at ${viewport.width}px`);
      assert.deepEqual(errors, []);
    });
  }
}
