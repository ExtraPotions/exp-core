'use strict';
// Every product's diagnostics carry a readability scan, so a washed-out or covered page can be diagnosed from
// Copy Diagnostics or Report a Problem alone. The scan records element names and colors, never page text.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const install = `(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;
const html = `<!doctype html><html><body style="background:#fff;color:#111"><main><p>Readable heading</p><x-card></x-card></main>
<div id="owned-ui" data-exp-owned="1"><p style="color:#fff;background:#fff">Product menu text</p></div>
<div class="veil" style="position:fixed;inset:0;background:rgba(255,255,255,.6);pointer-events:none"></div>
<script>customElements.define('x-card',class extends HTMLElement{connectedCallback(){if(this.shadowRoot)return;this.attachShadow({mode:'open'}).innerHTML='<p class="ghost" style="color:#fafafa;background:#fff">secret message text</p>';}});</script></body></html>`;

async function setup(t) {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('https://fixture.test/');
  await page.addScriptTag({ content: install });
  return page;
}

test('diagnostics list the hardest-to-read text, shadow roots included, without page text or product UI', async t => {
  const page = await setup(t);
  const { readability } = await page.evaluate(() => ExtraPotionsCore.createDiagnosticsReport('WARD', { product: { id: 'ward', version: '1.2.3' } }));
  assert.ok(readability?.scanned > 0, 'report has a readability scan');
  const ghost = readability.worst.find(row => /ghost/.test(row.cls));
  assert.ok(ghost, 'the unreadable shadow-root paragraph is listed: ' + JSON.stringify(readability.worst.slice(0, 3)));
  assert.equal(ghost.host, 'x-card');
  assert.ok(ghost.ratio < 1.5, 'ratio ' + ghost.ratio);
  assert.match(ghost.color, /^rgb/);
  assert.match(ghost.background, /^rgb/);
  assert.ok(ghost.textLength > 0);
  assert.deepEqual(readability.worst.map(row => row.ratio), [...readability.worst.map(row => row.ratio)].sort((a, b) => a - b), 'hardest first');
  assert.ok(readability.worst.length <= 25);
  assert.doesNotMatch(JSON.stringify(readability), /secret|message text|Readable heading|Product menu text/, 'no page or product text');
  assert.ok(!readability.worst.some(row => row.id === 'owned-ui'), 'product-owned UI is skipped');
});

test('diagnostics describe what covers the page, including click-through overlays', async t => {
  const page = await setup(t);
  const { readability } = await page.evaluate(() => ExtraPotionsCore.createDiagnosticsReport('WARD', { product: { id: 'ward', version: '1.2.3' } }));
  const veil = readability.overlays.find(layer => /veil/.test(layer.cls));
  assert.ok(veil, 'the overlay is listed: ' + JSON.stringify(readability.overlays));
  assert.equal(veil.background, 'rgba(255, 255, 255, 0.6)');
  assert.equal(veil.pointerEvents, 'none');
  assert.equal(veil.coverage, 1);
  assert.ok(readability.points.length === 3 && readability.points.every(point => point.chain.length > 0), 'sample points describe the element under them');
});

test('a product-supplied readability section is kept', async t => {
  const page = await setup(t);
  const { readability } = await page.evaluate(() => ExtraPotionsCore.createDiagnosticsReport('SHIFT', { product: { id: 'shift', version: '1.0.0' }, readability: { source: 'product' } }));
  assert.deepEqual(readability, { source: 'product' });
});
