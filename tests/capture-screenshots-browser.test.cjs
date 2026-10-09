'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { captureProduct, launchBrowser, main } = require('../scripts/capture-screenshots.cjs');

const fixture = path.join(__dirname, 'fixtures', 'screenshots', 'fixture.user.js');

function product(shots, extra = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-product-'));
  fs.mkdirSync(path.join(root, 'docs', 'screenshots'), { recursive: true });
  fs.copyFileSync(fixture, path.join(root, 'fixture.user.js'));
  fs.writeFileSync(path.join(root, 'docs', 'screenshots.config.cjs'), `module.exports = {
    build: [],
    userscript: 'fixture.user.js',
    host: '#fixture-root',
    url: 'https://sample.test/page',
    page: '<!doctype html><html><body style="background:#fff"><h1>Sample</h1></body></html>',
    viewport: { width: 900, height: 900 },
    setup: async (page) => {
      await page.waitForFunction(() => document.body.dataset.fetch);
      require('node:fs').writeFileSync(${JSON.stringify(path.join(root, 'fetch.txt'))}, await page.evaluate(() => document.body.dataset.fetch));
    },
    shots: ${JSON.stringify(shots)},
    ${extra}
  };`);
  return root;
}

test('captures listed shots, blocks other requests, and keeps unlisted images', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([{ file: 'alpha.png', section: 'Alpha', tab: 'Second' }, { file: 'beta.png', section: 'Beta', include: 'page' }]);
  fs.writeFileSync(path.join(root, 'docs', 'screenshots', 'old.png'), 'leftover');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const result = await captureProduct({ name: 'Fixture', root, browser, build: false });
  assert.equal(result.count, 2);
  assert.deepEqual(result.unlisted, ['old.png']);
  const out = name => fs.readFileSync(path.join(root, 'docs', 'screenshots', name));
  assert.ok(out('alpha.png').length > 3000 && out('beta.png').length > 3000);
  assert.notDeepEqual(out('alpha.png'), out('beta.png'));
  assert.equal(fs.readFileSync(path.join(root, 'fetch.txt'), 'utf8'), 'blocked');
  assert.equal(fs.readFileSync(path.join(root, 'docs', 'screenshots', 'old.png'), 'utf8'), 'leftover');
});

test('a missing tab fails the product and leaves docs/screenshots untouched', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([{ file: 'alpha.png', section: 'Alpha' }, { file: 'missing.png', section: 'Alpha', tab: 'Missing' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser, build: false }), /tab "Missing" not found in section "Alpha"/);
  assert.deepEqual(fs.readdirSync(path.join(root, 'docs', 'screenshots')), []);
});

test('a missing section fails with its name', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([{ file: 'gamma.png', section: 'Gamma' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser, build: false }), /section "Gamma" not found/);
});

test('a failing build step stops that product before capturing', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([{ file: 'alpha.png', section: 'Alpha' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'broken.cjs'), 'console.error("build exploded"); process.exit(3);');
  const config = path.join(root, 'docs', 'screenshots.config.cjs');
  fs.writeFileSync(config, fs.readFileSync(config, 'utf8').replace('build: []', "build: ['broken.cjs']"));
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser }), /build step broken\.cjs failed: build exploded/);
  assert.deepEqual(fs.readdirSync(path.join(root, 'docs', 'screenshots')), []);
});

test('a shot list naming a missing userscript fails before capturing', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([{ file: 'alpha.png', section: 'Alpha' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const config = path.join(root, 'docs', 'screenshots.config.cjs');
  fs.writeFileSync(config, fs.readFileSync(config, 'utf8').replace("userscript: 'fixture.user.js'", "userscript: 'nope.user.js'"));
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser, build: false }), /userscript nope\.user\.js not found/);
  assert.deepEqual(fs.readdirSync(path.join(root, 'docs', 'screenshots')), []);
});

test('a product folder without a shot list fails with a clear message', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-empty-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser, build: false }), /docs\/screenshots\.config\.cjs not found/);
});

test('a section built after the menu opens is still found', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([{ file: 'delta.png', section: 'Delta' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal((await captureProduct({ name: 'Fixture', root, browser, build: false })).count, 1);
});

test('a tab name matching more than one tab fails with the count', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([{ file: 'twin.png', section: 'Alpha', tab: 'Twin' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser, build: false }), /tab "Twin" matches 2 tabs in section "Alpha"/);
});

test('a shot without its own viewport uses the shot list viewport, not the previous shot\'s', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = product([
    { file: 'small.png', section: 'Alpha', include: 'page', viewport: { width: 700, height: 500 } },
    { file: 'default.png', section: 'Beta', include: 'page' },
  ]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await captureProduct({ name: 'Fixture', root, browser, build: false });
  const size = name => { const png = fs.readFileSync(path.join(root, 'docs', 'screenshots', name)); return [png.readUInt32BE(16), png.readUInt32BE(20)]; };
  assert.deepEqual(size('small.png'), [1400, 1000]);
  assert.deepEqual(size('default.png'), [1800, 1800]);
});

test('a missing product folder is named in the error', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = path.join(os.tmpdir(), 'shots-no-such-product');
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser, build: false }), new RegExp(`product folder not found: ${root.replace(/[\\.]/g, '\\$&')}`));
});

test('the temporary folder is removed even when the browser fails to open a page', async t => {
  const root = product([{ file: 'alpha.png', section: 'Alpha' }]);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const leftovers = () => fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('fixture-shots-')).sort();
  const before = leftovers();
  const brokenBrowser = { newContext: async () => { throw new Error('no context today'); } };
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser: brokenBrowser, build: false }), /no context today/);
  assert.deepEqual(leftovers(), before);
});

test('unknown product names are rejected before anything runs', async () => {
  assert.equal(await main(['NotAProduct', '--no-build']), 1);
});
