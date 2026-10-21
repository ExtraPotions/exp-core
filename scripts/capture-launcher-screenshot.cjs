'use strict';

// Captures the README picture of the shared launcher: eligible maintained builds on a neutral
// sample page with a top bar and the launcher open.
// THREAD's site-specific launcher/menu captures: node ../THREAD/tests/browser.cjs --captures
//   node scripts/capture-launcher-screenshot.cjs
// Writes docs/screenshots/shared-launcher.png. Build the products first.

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..');
const out = path.join(__dirname, '..', 'docs', 'screenshots', 'shared-launcher.png');
const scripts = [['Dropper', 'dropper.user.js'], ['PRISMA', 'prisma.user.js'], ['WARD', 'ward.user.js']]
  .map(([repo, file]) => fs.readFileSync(path.join(root, repo, file), 'utf8'));

// A plain top bar (search in the middle, two buttons on the right) and a chat column, with no site branding.
const page = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0e0e10;color:#adadb8;font:14px system-ui">
<nav data-a-target="top-nav-container" style="position:fixed;top:0;left:0;right:0;height:50px;background:#18181b;border-bottom:1px solid #26262c">
<div class="top-nav__menu" style="display:flex;align-items:center;height:50px">
<div style="width:240px;flex:none;padding-left:16px;color:#efeff1;font-weight:600">Sample site</div>
<div style="flex:1;display:flex;justify-content:center;min-width:0"><div style="display:flex"><input type="search" data-a-target="tw-input" placeholder="Search" style="box-sizing:border-box;width:300px;height:36px;border:1px solid #3f3f46;border-radius:6px 0 0 6px;background:#0e0e10;color:#efeff1;padding:0 10px"><button aria-label="Search Button" style="width:36px;height:36px;border:1px solid #3f3f46;border-left:0;border-radius:0 6px 6px 0;background:#26262c;color:#efeff1">&#9906;</button></div></div>
<div style="display:flex;gap:8px;align-items:center;padding:0 12px;flex:none"><button style="width:0;height:0;padding:0;border:0;overflow:hidden">Search</button><button style="height:30px;padding:0 12px;border:0;border-radius:6px;background:#26262c;color:#efeff1">Log In</button><button style="height:30px;padding:0 12px;border:0;border-radius:6px;background:#3f3f46;color:#efeff1">Sign Up</button></div>
</div></nav>
<main style="position:fixed;top:51px;left:0;right:340px;bottom:0;display:grid;place-items:center;background:#0e0e10">Sample stream</main>
<div class="stream-chat-header" style="position:fixed;left:auto;right:0;top:50px;width:340px;height:40px;background:#18181b;display:grid;align-items:center;justify-items:end;padding-right:16px;box-sizing:border-box;color:#efeff1">Stream Chat</div>
<aside style="position:fixed;right:0;top:90px;width:340px;bottom:0;background:#18181b"></aside></body>`;

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 420 }, deviceScaleFactor: 2 });
    const tab = await context.newPage();
    await tab.addInitScript(() => {
      const values = new Map();
      Object.assign(window, {
        GM_getValue: (key, fallback) => values.has(key) ? values.get(key) : fallback, GM_setValue: (key, value) => values.set(key, value),
        GM_deleteValue: key => values.delete(key), GM_listValues: () => [...values.keys()], GM_addValueChangeListener: () => 1,
        GM_removeValueChangeListener: () => {}, GM_registerMenuCommand: () => {}, GM_xmlhttpRequest: () => ({ abort() {} }),
        GM_info: { script: { version: 'sample' }, scriptHandler: 'Sample' },
      });
    });
    // Product artwork comes from each repository's assets folder, served from the local checkout.
    await tab.route('**/*', route => {
      const request = route.request();
      if (request.isNavigationRequest()) return route.fulfill({ contentType: 'text/html', body: page });
      const asset = /^https:\/\/raw\.githubusercontent\.com\/ExtraPotions\/([A-Za-z-]+)\/main\/assets\/([\w.-]+\.svg)$/.exec(request.url());
      if (asset && fs.existsSync(path.join(root, asset[1], 'assets', asset[2]))) return route.fulfill({ contentType: 'image/svg+xml', body: fs.readFileSync(path.join(root, asset[1], 'assets', asset[2])) });
      return route.abort();
    });
    await tab.goto('https://www.twitch.tv/sample');
    for (const content of scripts) await tab.addScriptTag({ content });
    await tab.waitForTimeout(2500);
    const hub = await tab.evaluate(() => {
      const node = [...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(host => host.shadowRoot.querySelector('[data-exp-part="flyout-hub"]')).find(Boolean);
      const box = node.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    });
    await tab.mouse.click(hub.x, hub.y);
    await tab.mouse.move(10, 400);
    await tab.waitForTimeout(500);
    if (await tab.evaluate(() => document.documentElement.dataset.expFlyoutOpen !== '1')) throw new Error('the launcher did not open');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await tab.screenshot({ path: out, clip: { x: 520, y: 0, width: 580, height: 160 } });
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
