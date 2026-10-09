# Shared README Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command (`npm run screenshots` in exp-core) refreshes every product's README screenshots from its current build, replacing four per-product capture scripts.

**Architecture:** A shared tool in `exp-core/scripts/capture-screenshots.cjs` validates each product's `docs/screenshots.config.cjs` shot list, builds the product, loads its userscript into a sandboxed Playwright page (sample HTML, local assets, all other network blocked), captures each listed view, checks the images, and only then copies them into `docs/screenshots/`. Products keep only the shot list and one npm script.

**Tech Stack:** Node (CommonJS), `node:test`, Playwright 1.63 (exp-core's dependency), Git Bash on Windows.

**Spec:** `exp-core/docs/superpowers/specs/2026-10-09-shared-screenshots-design.md`

## Global Constraints

- Workspace root: `C:/Users/OneDareAtHome/Documents/ChatGPT/ExtraPotions`; repos `exp-core`, `Dropper`, `PRISMA`, `SHIFT`, `WARD`, each on local branch `codex/remaining-hardening` (equal to `origin/main`). Commit locally; no push before Task 6, and Task 6 needs the user's explicit go-ahead.
- Product names exactly as exp-core's suite contract lists them: `Dropper`, `SHIFT`, `WARD`, `PRISMA`.
- Shot list path: `docs/screenshots.config.cjs` in each product. Required fields: `build`, `userscript`, `host`, `url`, `page`, `viewport`, `shots`. Optional: `cookies`, `storage`, `setup(page, host)` (runs once after the menu opens). Shot fields: `file` (required, `.png`, unique), `section` (required), `tab`, `include` (`'menu'` default or `'page'`), `viewport`, `before(page, host)`.
- Product npm script: `"screenshots": "node ../exp-core/scripts/capture-screenshots.cjs <Product>"`; Dropper's `capture-screenshots` and WARD's `visual:capture` are removed.
- Captures: `deviceScaleFactor: 2`; images must be over 3000 bytes and pairwise different (SHA-256); output written only after every shot of a product passes; unlisted PNGs warned about, never deleted; one product's failure does not stop the others; exit code non-zero if any failed.
- Network during capture: navigation gets the sample page; `https://raw.githubusercontent.com/ExtraPotions/<Product>/main/assets/<file>` is served from the product's `assets/`; everything else is aborted.
- No release of exp-core or any product; commits must not start with `Release `.
- `npm run` can hang in agent shells on this machine; run the underlying `node` commands directly.

## Review Focus

- A section name that is a substring of another header's text — the tool clicks the first header containing it; today's shot lists have no ambiguous names, and Task 5's image comparison would show a wrong section.
- Dropper's slow start-up: the launcher must be clickable and the progress card painted before capture (Task 5 compares images against today's).
- A product folder missing beside exp-core when running all products — reported as that product's failure, others continue (Task 3 test: folder without a shot list).
- A `tab` that does not exist — fails within seconds with a clear message and leaves `docs/screenshots/` untouched (Task 3 test).
- Running a single product from its own folder — resolves playwright from exp-core, not the product (Task 5 Step 3).

---

### Task 1: Shared installed-browser lookup

**Files:**
- Create: `exp-core/scripts/installed-browser.cjs`
- Modify: `exp-core/scripts/use-installed-browser.cjs`
- Test: `exp-core/tests/installed-browser.test.cjs`

**Interfaces:**
- Produces: `findInstalledBrowser({ env = process.env, exists = fs.existsSync } = {}) => string | null` and `browserCandidates(env) => string[]`.

- [ ] **Step 1: Write the failing test** — `exp-core/tests/installed-browser.test.cjs`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findInstalledBrowser, browserCandidates } = require('../scripts/installed-browser.cjs');

test('EXP_BROWSER_PATH is tried first', () => {
  assert.equal(browserCandidates({ EXP_BROWSER_PATH: 'X:/custom/chrome.exe' })[0], 'X:/custom/chrome.exe');
  assert.equal(findInstalledBrowser({ env: { EXP_BROWSER_PATH: 'X:/custom/chrome.exe' }, exists: p => p === 'X:/custom/chrome.exe' }), 'X:/custom/chrome.exe');
});

test('falls back through Chrome and Edge locations, or returns null', () => {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  assert.equal(findInstalledBrowser({ env: {}, exists: p => p === edge }), edge);
  assert.equal(findInstalledBrowser({ env: {}, exists: () => false }), null);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `cd exp-core && node --test tests/installed-browser.test.cjs`
Expected: FAIL — `Cannot find module '../scripts/installed-browser.cjs'`.

- [ ] **Step 3: Create `exp-core/scripts/installed-browser.cjs`**

```js
'use strict';

// Finds an installed Chrome or Edge for Playwright to drive instead of its own downloaded browser.
// Set EXP_BROWSER_PATH to choose a specific browser executable.

const fs = require('node:fs');

function browserCandidates(env = process.env) {
  return [
    env.EXP_BROWSER_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
}

function findInstalledBrowser({ env = process.env, exists = fs.existsSync } = {}) {
  return browserCandidates(env).find(candidate => exists(candidate)) || null;
}

module.exports = { browserCandidates, findInstalledBrowser };
```

- [ ] **Step 4: Use it in `exp-core/scripts/use-installed-browser.cjs`** — replace the `const candidates = [...]` array and the `const executablePath = candidates.find(...)` line with:

```js
const { findInstalledBrowser } = require('./installed-browser.cjs');
const executablePath = findInstalledBrowser();
```

Leave the rest of the file (the "No installed Chrome or Edge was found" exit and the launch patch) unchanged. Remove the now-unused `fs` require only if nothing else in the file uses it.

- [ ] **Step 5: Run tests**

Run: `cd exp-core && node --test tests/installed-browser.test.cjs && node scripts/build.cjs --check && node --test tests/*.test.cjs`
Expected: PASS (238 tests).

- [ ] **Step 6: Commit**

```bash
cd exp-core && git add scripts/installed-browser.cjs scripts/use-installed-browser.cjs tests/installed-browser.test.cjs && git commit -m "refactor: share the installed-browser lookup"
```

---

### Task 2: Shot list validation, request routing, and image checks

**Files:**
- Create: `exp-core/scripts/capture-screenshots.cjs` (pure functions only in this task)
- Test: `exp-core/tests/capture-screenshots.test.cjs`

**Interfaces:**
- Produces (module exports): `validateConfig(config) => config` (throws `Error('screenshots.config.cjs: <message>')`), `classifyRequest(url, isNavigation, productName) => { type: 'page' } | { type: 'asset', path } | { type: 'abort' }`, `checkImages(dir, files) => void` (throws), `MIN_BYTES = 3000`.

- [ ] **Step 1: Write the failing tests** — `exp-core/tests/capture-screenshots.test.cjs`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateConfig, classifyRequest, checkImages, MIN_BYTES } = require('../scripts/capture-screenshots.cjs');

const valid = () => ({
  build: ['scripts/build.cjs'],
  userscript: 'fixture.user.js',
  host: '#fixture-root',
  url: 'https://sample.test/',
  page: '<!doctype html><body></body>',
  viewport: { width: 800, height: 600 },
  shots: [{ file: 'one.png', section: 'Alpha' }, { file: 'two.png', section: 'Beta', tab: 'Second', include: 'page', viewport: { width: 900, height: 700 } }],
});

test('a complete shot list is accepted', () => {
  assert.doesNotThrow(() => validateConfig(valid()));
});

test('each required field is enforced by name', () => {
  for (const field of ['build', 'userscript', 'host', 'url', 'page', 'viewport', 'shots']) {
    const config = valid(); delete config[field];
    assert.throws(() => validateConfig(config), new RegExp(`"${field}"`));
  }
});

test('shot files must be unique .png names', () => {
  const duplicate = valid(); duplicate.shots[1].file = 'one.png';
  assert.throws(() => validateConfig(duplicate), /shots\[1\]\.file "one\.png" is repeated/);
  const notPng = valid(); notPng.shots[0].file = 'one.jpg';
  assert.throws(() => validateConfig(notPng), /shots\[0\]\.file must be a \.png file name/);
});

test('shot options are type-checked', () => {
  const badInclude = valid(); badInclude.shots[0].include = 'both';
  assert.throws(() => validateConfig(badInclude), /shots\[0\]\.include/);
  const noSection = valid(); delete noSection.shots[0].section;
  assert.throws(() => validateConfig(noSection), /shots\[0\]\.section/);
  const badUrl = valid(); badUrl.url = 'http://sample.test/';
  assert.throws(() => validateConfig(badUrl), /"url"/);
  const badSetup = valid(); badSetup.setup = 'wait';
  assert.throws(() => validateConfig(badSetup), /"setup"/);
});

test('requests: navigation gets the page, own assets are local, everything else is blocked', () => {
  assert.deepEqual(classifyRequest('https://www.amazon.com/dp/x', true, 'WARD'), { type: 'page' });
  assert.deepEqual(classifyRequest('https://raw.githubusercontent.com/ExtraPotions/WARD/main/assets/ward-launcher.svg', false, 'WARD'), { type: 'asset', path: 'assets/ward-launcher.svg' });
  assert.deepEqual(classifyRequest('https://raw.githubusercontent.com/ExtraPotions/SHIFT/main/assets/shift-launcher.svg', false, 'WARD'), { type: 'abort' });
  assert.deepEqual(classifyRequest('https://raw.githubusercontent.com/ExtraPotions/WARD/main/assets/../package.json', false, 'WARD'), { type: 'abort' });
  assert.deepEqual(classifyRequest('https://api.github.com/repos/ExtraPotions/WARD/releases/latest', false, 'WARD'), { type: 'abort' });
});

test('images must be non-blank and different from each other', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-check-'));
  try {
    fs.writeFileSync(path.join(dir, 'a.png'), Buffer.alloc(MIN_BYTES + 10, 1));
    fs.writeFileSync(path.join(dir, 'b.png'), Buffer.alloc(MIN_BYTES + 10, 2));
    assert.doesNotThrow(() => checkImages(dir, ['a.png', 'b.png']));
    fs.writeFileSync(path.join(dir, 'c.png'), Buffer.alloc(MIN_BYTES + 10, 1));
    assert.throws(() => checkImages(dir, ['a.png', 'c.png']), /c\.png is identical to a\.png/);
    fs.writeFileSync(path.join(dir, 'd.png'), Buffer.alloc(100, 3));
    assert.throws(() => checkImages(dir, ['d.png']), /d\.png looks blank/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run to see it fail**

Run: `cd exp-core && node --test tests/capture-screenshots.test.cjs`
Expected: FAIL — `Cannot find module '../scripts/capture-screenshots.cjs'`.

- [ ] **Step 3: Create `exp-core/scripts/capture-screenshots.cjs`**

```js
'use strict';

// Refreshes README screenshots for ExtraPotions products from their current builds.
//   npm run screenshots                  every product
//   npm run screenshots -- WARD PRISMA   only these
//   --no-build                           skip each product's build step
// Each product lists its shots in docs/screenshots.config.cjs.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MIN_BYTES = 3000;
const REQUIRED = ['build', 'userscript', 'host', 'url', 'page', 'viewport', 'shots'];

const isViewport = value => Boolean(value) && Number.isInteger(value.width) && Number.isInteger(value.height) && value.width > 0 && value.height > 0;

function validateConfig(config) {
  const fail = message => { throw new Error(`screenshots.config.cjs: ${message}`); };
  if (!config || typeof config !== 'object') fail('must export an object');
  for (const field of REQUIRED) if (config[field] === undefined) fail(`missing required field "${field}"`);
  if (!Array.isArray(config.build) || config.build.some(item => typeof item !== 'string' || !item)) fail('"build" must be an array of script paths');
  for (const field of ['userscript', 'host', 'page']) if (typeof config[field] !== 'string' || !config[field]) fail(`"${field}" must be a non-empty string`);
  if (typeof config.url !== 'string' || !config.url.startsWith('https://')) fail('"url" must start with https://');
  if (!isViewport(config.viewport)) fail('"viewport" must be { width, height } in pixels');
  if (config.cookies !== undefined && !Array.isArray(config.cookies)) fail('"cookies" must be an array');
  if (config.storage !== undefined && (!config.storage || typeof config.storage !== 'object' || Array.isArray(config.storage))) fail('"storage" must be an object');
  if (config.setup !== undefined && typeof config.setup !== 'function') fail('"setup" must be a function');
  if (!Array.isArray(config.shots) || !config.shots.length) fail('"shots" must be a non-empty array');
  const files = new Set();
  config.shots.forEach((shot, index) => {
    const at = `shots[${index}]`;
    if (!shot || typeof shot.file !== 'string' || !/^[\w.-]+\.png$/.test(shot.file)) fail(`${at}.file must be a .png file name`);
    if (files.has(shot.file)) fail(`${at}.file "${shot.file}" is repeated`);
    files.add(shot.file);
    if (typeof shot.section !== 'string' || !shot.section) fail(`${at}.section is required`);
    if (shot.tab !== undefined && (typeof shot.tab !== 'string' || !shot.tab)) fail(`${at}.tab must be a non-empty string`);
    if (shot.include !== undefined && !['menu', 'page'].includes(shot.include)) fail(`${at}.include must be "menu" or "page"`);
    if (shot.viewport !== undefined && !isViewport(shot.viewport)) fail(`${at}.viewport must be { width, height } in pixels`);
    if (shot.before !== undefined && typeof shot.before !== 'function') fail(`${at}.before must be a function`);
  });
  return config;
}

// Navigation gets the sample page, the product's own launcher assets come from disk, and nothing else leaves the machine.
function classifyRequest(url, isNavigation, productName) {
  const prefix = `https://raw.githubusercontent.com/ExtraPotions/${productName}/main/`;
  if (String(url).startsWith(prefix)) {
    const relative = String(url).slice(prefix.length);
    if (/^assets\/[\w-]+(?:\/[\w-]+)*\.[\w]+$/.test(relative)) return { type: 'asset', path: relative };
    return { type: 'abort' };
  }
  if (isNavigation) return { type: 'page' };
  return { type: 'abort' };
}

function checkImages(dir, files) {
  const seen = new Map();
  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file));
    if (data.length <= MIN_BYTES) throw new Error(`${file} looks blank (${data.length} bytes)`);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (seen.has(hash)) throw new Error(`${file} is identical to ${seen.get(hash)}`);
    seen.set(hash, file);
  }
}

module.exports = { MIN_BYTES, validateConfig, classifyRequest, checkImages };
```

- [ ] **Step 4: Run to see it pass**

Run: `cd exp-core && node --test tests/capture-screenshots.test.cjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd exp-core && git add scripts/capture-screenshots.cjs tests/capture-screenshots.test.cjs && git commit -m "feat: validate screenshot shot lists"
```

---

### Task 3: Capture flow, CLI, and end-to-end test

**Files:**
- Modify: `exp-core/scripts/capture-screenshots.cjs`, `exp-core/package.json` (add `"screenshots": "node scripts/capture-screenshots.cjs"` to `scripts`)
- Create: `exp-core/tests/fixtures/screenshots/fixture.user.js`
- Test: `exp-core/tests/capture-screenshots-browser.test.cjs`

**Interfaces:**
- Consumes: Task 1 `findInstalledBrowser`; Task 2 `validateConfig`, `classifyRequest`, `checkImages`.
- Produces: `launchBrowser(chromium) => Promise<Browser>`, `captureProduct({ name, root, browser, build = true }) => Promise<{ count: number, unlisted: string[] }>`, `main(argv) => Promise<0 | 1>`.

- [ ] **Step 1: Create the fixture userscript** — `exp-core/tests/fixtures/screenshots/fixture.user.js`:

```js
// Minimal stand-in for an ExtraPotions menu: a launcher, a dock, two sections, and tabs.
(() => {
  const host = document.createElement('div');
  host.id = 'fixture-root';
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const lines = (word, count) => Array.from({ length: count }, (_, i) => `<p>${word} line ${i + 1}: sample content for a real-looking capture.</p>`).join('');
  shadow.innerHTML = `<style>
    .launcher{position:fixed;right:16px;bottom:16px;width:48px;height:48px}
    [data-exp-part="dock"]{position:fixed;right:80px;top:16px;width:340px;padding:12px;font:15px system-ui;background:#1b2030;color:#eef}
    [data-exp-part="dock"][hidden],.panel[hidden]{display:none}
    .alpha{background:linear-gradient(90deg,#c33,#36c)}
    .beta{background:linear-gradient(90deg,#3c6,#c9c)}
    .toast{position:fixed;top:0;left:0;background:#f00;color:#fff}
  </style>
  <button class="launcher" data-exp-part="launcher" aria-label="Open Fixture">F</button>
  <div class="toast">Toast that must be hidden</div>
  <aside data-exp-part="dock" hidden>
    <div class="fl-tool-header" aria-expanded="false" data-panel="one">Alpha</div>
    <div class="panel alpha" id="one" hidden><div role="tablist"><button role="tab">First</button><button role="tab">Second</button></div>${lines('Alpha', 14)}</div>
    <div class="fl-tool-header" aria-expanded="false" data-panel="two">Beta</div>
    <div class="panel beta" id="two" hidden>${lines('Beta', 14)}</div>
  </aside>`;
  const dock = shadow.querySelector('[data-exp-part="dock"]');
  shadow.querySelector('.launcher').addEventListener('click', () => { dock.hidden = !dock.hidden; });
  for (const header of shadow.querySelectorAll('.fl-tool-header')) {
    header.addEventListener('click', () => {
      for (const other of shadow.querySelectorAll('.fl-tool-header')) {
        const open = other === header;
        other.setAttribute('aria-expanded', String(open));
        shadow.getElementById(other.dataset.panel).hidden = !open;
      }
    });
  }
  fetch('https://example.com/should-be-blocked').then(() => { document.body.dataset.fetch = 'ok'; }, () => { document.body.dataset.fetch = 'blocked'; });
})();
```

- [ ] **Step 2: Write the failing browser tests** — `exp-core/tests/capture-screenshots-browser.test.cjs`:

```js
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

test('a product folder without a shot list fails with a clear message', async t => {
  const browser = await launchBrowser(chromium); t.after(() => browser.close());
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-empty-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await assert.rejects(captureProduct({ name: 'Fixture', root, browser, build: false }), /docs\/screenshots\.config\.cjs not found/);
});

test('unknown product names are rejected before anything runs', async () => {
  assert.equal(await main(['NotAProduct', '--no-build']), 1);
});
```

- [ ] **Step 3: Run to see them fail**

Run: `cd exp-core && node --test tests/capture-screenshots-browser.test.cjs`
Expected: FAIL — `captureProduct is not a function` (or `launchBrowser is not a function`).

- [ ] **Step 4: Implement** — in `exp-core/scripts/capture-screenshots.cjs`, add after the existing requires:

```js
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { findInstalledBrowser } = require('./installed-browser.cjs');
```

Add before `module.exports`:

```js
// Runs in the page before the userscript: in-memory userscript storage and no update requests.
function gmInit(storage) {
  const values = new Map(Object.entries(storage || {}));
  window.GM_getValue = (key, fallback) => (values.has(key) ? values.get(key) : fallback);
  window.GM_setValue = (key, value) => values.set(key, value);
  window.GM_deleteValue = key => values.delete(key);
  window.GM_listValues = () => [...values.keys()];
  window.GM_addValueChangeListener = () => 1;
  window.GM_registerMenuCommand = () => {};
  window.GM_xmlhttpRequest = options => { queueMicrotask(() => options.onerror?.({ status: 0 })); return { abort() {} }; };
}

// Playwright's own Chromium when installed, otherwise an installed Chrome or Edge.
async function launchBrowser(chromium) {
  try {
    return await chromium.launch();
  } catch (error) {
    const executablePath = findInstalledBrowser();
    if (!executablePath) throw error;
    return chromium.launch({ executablePath });
  }
}

function runBuild(root, scripts) {
  for (const script of scripts) {
    const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) {
      const lines = `${result.stderr || ''}\n${result.stdout || ''}`.trim().split(/\r?\n/).filter(Boolean);
      throw new Error(`build step ${script} failed: ${lines[0] || `exit ${result.status}`}`);
    }
  }
}

async function openView(host, shot) {
  const header = host.locator('.fl-tool-header').filter({ hasText: shot.section });
  if (!(await header.count())) throw new Error(`section "${shot.section}" not found`);
  if ((await header.first().getAttribute('aria-expanded')) !== 'true') await header.first().click();
  if (!shot.tab) return;
  const tab = host.getByRole('tab', { name: shot.tab, exact: true });
  try {
    await tab.click({ timeout: 5000 });
  } catch {
    throw new Error(`tab "${shot.tab}" not found in section "${shot.section}"`);
  }
}

async function captureProduct({ name, root, browser, build = true }) {
  const configPath = path.join(root, 'docs', 'screenshots.config.cjs');
  if (!fs.existsSync(configPath)) throw new Error('docs/screenshots.config.cjs not found');
  delete require.cache[require.resolve(configPath)];
  const config = validateConfig(require(configPath));
  if (build) runBuild(root, config.build);
  const userscript = path.join(root, config.userscript);
  if (!fs.existsSync(userscript)) throw new Error(`userscript ${config.userscript} not found`);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), `${name.toLowerCase()}-shots-`));
  const context = await browser.newContext({ viewport: config.viewport, deviceScaleFactor: 2 });
  try {
    if (config.cookies) await context.addCookies(config.cookies);
    const page = await context.newPage();
    await page.addInitScript(gmInit, config.storage || {});
    await page.route('**/*', route => {
      const request = route.request();
      const decision = classifyRequest(request.url(), request.isNavigationRequest(), name);
      if (decision.type === 'asset') return route.fulfill({ path: path.join(root, decision.path) });
      if (decision.type === 'page') return route.fulfill({ status: 200, contentType: 'text/html', body: config.page });
      return route.abort();
    });
    await page.goto(config.url);
    await page.addScriptTag({ content: fs.readFileSync(userscript, 'utf8') });
    const host = page.locator(config.host);
    await host.waitFor({ state: 'attached' });
    await host.locator('[data-exp-part="launcher"]').click();
    await page.waitForTimeout(400);
    if (config.setup) await config.setup(page, host);

    for (const shot of config.shots) {
      if (shot.viewport) await page.setViewportSize(shot.viewport);
      await openView(host, shot);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      if (shot.before) await shot.before(page, host);
      await host.evaluate(node => { for (const toast of node.shadowRoot?.querySelectorAll('.toast') || []) toast.hidden = true; });
      const file = path.join(work, shot.file);
      if (shot.include === 'page') await page.screenshot({ path: file });
      else await host.locator('[data-exp-part="dock"]').screenshot({ path: file });
    }

    const files = config.shots.map(shot => shot.file);
    checkImages(work, files);
    const output = path.join(root, 'docs', 'screenshots');
    fs.mkdirSync(output, { recursive: true });
    for (const file of files) fs.copyFileSync(path.join(work, file), path.join(output, file));
    const listed = new Set(files);
    return { count: files.length, unlisted: fs.readdirSync(output).filter(file => file.endsWith('.png') && !listed.has(file)).sort() };
  } finally {
    await context.close();
    fs.rmSync(work, { recursive: true, force: true });
  }
}

async function main(argv = process.argv.slice(2)) {
  const { loadSuiteContract } = require('./suite-contract.cjs');
  const { resolveConsumerRoots } = require('./consumer-roots.cjs');
  const known = loadSuiteContract(path.resolve(__dirname, '..')).repositories;
  const requested = argv.filter(arg => !arg.startsWith('--'));
  const unknown = requested.filter(name => !known.includes(name));
  if (unknown.length) {
    console.error(`Unknown product: ${unknown.join(', ')}. Choose from ${known.join(', ')}.`);
    return 1;
  }
  const names = requested.length ? requested : known;
  const consumers = resolveConsumerRoots();
  const { chromium } = require('playwright');
  const browser = await launchBrowser(chromium);
  let failed = 0;
  try {
    for (const name of names) {
      try {
        const result = await captureProduct({ name, root: consumers.root(name), browser, build: !argv.includes('--no-build') });
        console.log(`${name}: ${result.count} screenshots`);
        if (result.unlisted.length) console.warn(`${name}: not in the shot list (left in place): ${result.unlisted.join(', ')}`);
      } catch (error) {
        failed += 1;
        console.error(`${name}: failed — ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  return failed ? 1 : 0;
}
```

Replace the `module.exports` line with:

```js
module.exports = { MIN_BYTES, validateConfig, classifyRequest, checkImages, launchBrowser, captureProduct, main };

if (require.main === module) {
  main().then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
}
```

Add to `exp-core/package.json` `scripts`: `"screenshots": "node scripts/capture-screenshots.cjs"`.

- [ ] **Step 5: Run the tests**

Run: `cd exp-core && node --test tests/capture-screenshots-browser.test.cjs tests/capture-screenshots.test.cjs`
Expected: PASS (12 tests).

- [ ] **Step 6: Full suite**

Run: `cd exp-core && node scripts/build.cjs --check && node --test tests/*.test.cjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd exp-core && git add scripts/capture-screenshots.cjs package.json tests/fixtures/screenshots tests/capture-screenshots-browser.test.cjs && git commit -m "feat: shared README screenshot tool"
```

---

### Task 4: Product shot lists replace the per-product capture scripts

Do Steps 1–7 once per product. Each product gets its own commit.

**Files (per product `<P>`; tests dir `<T>` = `tests`, WARD `tests-v3`):**
- Create: `<P>/docs/screenshots.config.cjs`, `<P>/<T>/screenshots-config.test.cjs`
- Modify: `<P>/package.json`
- Delete: `Dropper/scripts/capture-screenshots.cjs`, `PRISMA/scripts/capture-screenshots.cjs`, `SHIFT/scripts/capture-screenshots.cjs`, `WARD/scripts/capture-visuals.cjs`
- Modify (WARD): `WARD/tests-v3/fallback.test.cjs:62-68`
- Modify (SHIFT): `SHIFT/docs/testing.md:15`

**Interfaces:**
- Consumes: Task 3's `captureProduct` contract and the shot-list fields in Global Constraints.

- [ ] **Step 1: Write the failing test** — `<P>/<T>/screenshots-config.test.cjs`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('README screenshots and the shot list name the same images', () => {
  const config = require(path.join(root, 'docs', 'screenshots.config.cjs'));
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const referenced = [...new Set([...readme.matchAll(/docs\/screenshots\/([\w.-]+\.png)/g)].map(match => match[1]))].sort();
  assert.deepEqual(config.shots.map(shot => shot.file).sort(), referenced);
});

test('screenshots run through the shared exp-core tool', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.screenshots, /^node \.\.\/exp-core\/scripts\/capture-screenshots\.cjs (Dropper|SHIFT|WARD|PRISMA)$/);
  for (const retired of ['capture-screenshots', 'visual:capture']) assert.equal(pkg.scripts[retired], undefined, retired);
  for (const file of ['scripts/capture-screenshots.cjs', 'scripts/capture-visuals.cjs']) assert.equal(fs.existsSync(path.join(root, file)), false, file);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `cd <P> && node --test <T>/screenshots-config.test.cjs`
Expected: FAIL — `Cannot find module '.../docs/screenshots.config.cjs'`.

- [ ] **Step 3: Write `<P>/docs/screenshots.config.cjs`.** For `page`, copy the `samplePage` string from the product's current capture script verbatim (Dropper/PRISMA/WARD: single-quoted string; SHIFT: template literal) before deleting that script.

Dropper:

```js
'use strict';

// README screenshots, captured by exp-core's shared tool: npm run screenshots

// Twitch campaign data is not available offline, so the progress card shows sample values.
async function paintSampleProgress(page, host) {
  await host.evaluate(node => {
    const shadow = node.shadowRoot;
    const set = (id, text, className) => {
      const element = shadow.getElementById(id);
      if (!element) return;
      element.textContent = text;
      if (className) element.className = className;
    };
    set('tdh-stream-channel', 'sample_streamer');
    set('tdh-stream-game', 'Sample Game');
    set('tdh-drop-meta', '28 / 60 min');
    set('tdh-drop-name', 'Sample Reward');
    set('tdh-drop-state', 'Earning', 'state-pill good');
    set('tdh-updated-ago', 'Checked 12s ago');
    set('tdh-eligibility-summary', '✓ Eligible · 32 min remaining');
    set('tdh-eligibility-checklist-summary', 'Ready');
    const eligibility = shadow.getElementById('tdh-reward-eligibility');
    if (eligibility) eligibility.dataset.tone = 'good';
    const fill = shadow.getElementById('tdh-drop-fill');
    if (fill) fill.style.width = '47%';
  });
}

module.exports = {
  build: ['scripts/assemble-parts.cjs', 'scripts/minify-dist.cjs'],
  userscript: 'dropper.user.js',
  host: '#tdh-root',
  url: 'https://www.twitch.tv/sample_streamer',
  page: '<!doctype html><html><head><title>Twitch</title></head><body style="margin:0;background:#0e0e10"></body></html>',
  viewport: { width: 960, height: 1400 },
  // A placeholder sign-in cookie keeps the menu out of its signed-out state.
  cookies: [{ name: 'auth-token', value: 'sample', domain: '.twitch.tv', path: '/' }],
  // Let Dropper finish starting up before the first capture.
  setup: page => page.waitForTimeout(1600),
  shots: [
    { file: 'drops-menu.png', section: 'Drops', tab: 'Progress', before: paintSampleProgress },
    { file: 'streams-menu.png', section: 'Streams', tab: 'Playback', before: paintSampleProgress },
  ],
};
```

PRISMA (`page`: the `samplePage` string from `PRISMA/scripts/capture-screenshots.cjs`):

```js
'use strict';

// README screenshots, captured by exp-core's shared tool: npm run screenshots

module.exports = {
  build: ['scripts/build.cjs'],
  userscript: 'prisma.user.js',
  host: '#exp-prisma-root',
  url: 'https://sample.test/guide',
  page: /* samplePage from PRISMA/scripts/capture-screenshots.cjs, verbatim */,
  viewport: { width: 900, height: 640 },
  shots: [
    // The sample page with live highlights next to the open Highlights menu.
    { file: 'highlights-demo.png', section: 'Highlights', include: 'page' },
    { file: 'appearance.png', section: 'Appearance', tab: 'Style', viewport: { width: 900, height: 1400 } },
  ],
};
```

SHIFT (`page`: the `samplePage` template literal from `SHIFT/scripts/capture-screenshots.cjs`):

```js
'use strict';

// README screenshots, captured by exp-core's shared tool: npm run screenshots

const THEME = 'Midnight';

async function applyTheme(page, host) {
  const swatch = host.locator(`.exp-theme-swatch[aria-label*="${THEME}"]`);
  if (!(await swatch.count())) {
    const found = await host.locator('.exp-theme-swatch').evaluateAll(items => items.map(item => item.getAttribute('aria-label')));
    throw new Error(`Missing ${THEME} theme; found ${found.join(', ')}`);
  }
  await swatch.first().click();
  await page.waitForTimeout(600);
}

module.exports = {
  build: ['scripts/build.cjs'],
  userscript: 'shift.user.js',
  host: '#exp-shift-root',
  url: 'https://sample.test/read',
  page: /* samplePage from SHIFT/scripts/capture-screenshots.cjs, verbatim */,
  viewport: { width: 900, height: 760 },
  shots: [
    // The sample page with a website theme applied next to the open Appearance menu.
    { file: 'appearance-demo.png', section: 'Appearance', tab: 'Overview', include: 'page', before: applyTheme },
    { file: 'readability.png', section: 'Appearance', tab: 'Readability', viewport: { width: 900, height: 1400 } },
  ],
};
```

WARD (`page`: the `samplePage` string from `WARD/scripts/capture-visuals.cjs`):

```js
'use strict';

// README screenshots, captured by exp-core's shared tool: npm run screenshots

module.exports = {
  build: ['scripts/build.cjs'],
  userscript: 'ward.user.js',
  host: '#exp-ward-root',
  url: 'https://www.amazon.com/dp/sample',
  page: /* samplePage from WARD/scripts/capture-visuals.cjs, verbatim */,
  viewport: { width: 960, height: 1400 },
  shots: [
    { file: 'protection.png', section: 'Protection', tab: 'Overview' },
    { file: 'amazon.png', section: 'Amazon', tab: 'Store' },
  ],
};
```

(The `/* … */` markers above mean: paste that exact string literal there; they are not left in the file.)

- [ ] **Step 4: Switch the npm script and delete the old capture script**

In `<P>/package.json` `scripts`: set `"screenshots": "node ../exp-core/scripts/capture-screenshots.cjs <P>"` (Dropper, PRISMA, SHIFT, WARD exactly), and delete `"capture-screenshots"` (Dropper) / `"visual:capture"` (WARD). Then `git rm` the old capture script.

- [ ] **Step 5: Update references**

WARD `tests-v3/fallback.test.cjs` — replace the test at lines 62–68 with:

```js
test('the README shot list targets the README screenshots without theme or warm output', () => {
  const config = require('../docs/screenshots.config.cjs');
  assert.deepEqual(config.shots.map(shot => shot.file).sort(), ['amazon.png', 'protection.png']);
  assert.doesNotMatch(read('docs/screenshots.config.cjs'), /warm-charcoal\.png/);
});
```

SHIFT `docs/testing.md:15` — append to that paragraph: ` Refresh them with \`npm run screenshots\` (needs exp-core checked out beside SHIFT).`

- [ ] **Step 6: Run the tests**

Run: `cd <P> && node --test <T>/screenshots-config.test.cjs` then the full suite (`node scripts/build.cjs && node --test tests/*.test.cjs`; Dropper `node scripts/assemble-parts.cjs && node scripts/minify-dist.cjs && node --test tests/*.test.cjs`; WARD `tests-v3/*.test.cjs`).
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd <P> && git add -A docs/screenshots.config.cjs package.json <T> scripts docs/testing.md && git commit -m "chore: capture README screenshots with the shared exp-core tool"
```
(Only stage paths that exist in that repo; `docs/testing.md` is SHIFT only.)

---

### Task 5: Run the shared tool and compare with today's images

**Files:** `<P>/docs/screenshots/*.png` (only if they change)

- [ ] **Step 1: Save today's images**

```bash
cd C:/Users/OneDareAtHome/Documents/ChatGPT/ExtraPotions && mkdir -p /tmp/shots-before && for d in Dropper PRISMA SHIFT WARD; do mkdir -p /tmp/shots-before/$d && cp $d/docs/screenshots/*.png /tmp/shots-before/$d/; done
```

- [ ] **Step 2: Capture everything**

Run: `cd exp-core && node scripts/capture-screenshots.cjs`
Expected: `Dropper: 2 screenshots`, `SHIFT: 2 screenshots`, `WARD: 2 screenshots`, `PRISMA: 2 screenshots`, no failures, exit 0.

- [ ] **Step 3: Single-product run from a product folder**

Run: `cd WARD && node ../exp-core/scripts/capture-screenshots.cjs WARD --no-build`
Expected: `WARD: 2 screenshots`.

- [ ] **Step 4: Compare** — open each new image and its `/tmp/shots-before` counterpart with the Read tool. They must show the same view, the same sample content, the same version number, no hover state, and no toast. Rendering noise (byte differences with identical appearance) is fine. Any visible difference means a shot-list value did not carry over: fix the shot list, recapture, compare again.

- [ ] **Step 5: Commit any changed images**

For each product with changed PNGs: `git add docs/screenshots && git commit -m "docs: recapture README screenshots with the shared tool"`. Products whose images did not change get no commit.

---

### Task 6: Publish (requires the user's explicit go-ahead)

- [ ] **Step 1: Ask** "Ready to push the shared screenshot tool to exp-core and the shot lists to the four products?" Proceed only on a clear yes.
- [ ] **Step 2: Push** — in exp-core, then Dropper, PRISMA, SHIFT, WARD: `git fetch origin && git rebase origin/main && git push origin HEAD:main`. None of these commits starts with `Release `, so no release workflow publishes.
- [ ] **Step 3: Confirm** each repo's `Verify` workflow for the pushed commit succeeds (`.release-tools/github-cli/bin/gh.exe run list -R ExtraPotions/<repo> -L 3`).
