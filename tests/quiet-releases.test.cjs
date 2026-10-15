'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'dist/exp-core.js'), 'utf8');
const slice = (start, end) => {
  const from = bundle.indexOf(start);
  const to = bundle.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing ${start}`);
  return bundle.slice(from, to);
};
const factory = slice('  function createReleaseUpdateChecker(', '\n  function createDiagnosticsReport(');
const compare = slice('function compareVersions(', '\nreturn Object.freeze').trim();
const helper = slice('  function isQuietUpgrade(', '\n  function visibleFloatingNotices(');

function fixture(cached = {}, version = '3.2.13') {
  const key = 'exp:v3:ward:update-cache';
  const storage = new Map([[key, JSON.stringify(cached)]]);
  const requests = [];
  const context = {
    ExtraPotionsTools: { productDataResetting: () => false },
    options: { productId: 'ward', repository: 'ExtraPotions/WARD', currentVersion: version, enabled: () => true },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    GM_xmlhttpRequest: o => requests.push(o),
    Date, JSON, Object, String, Number, Array, Promise, Error,
  };
  vm.runInNewContext(`const CoreFoundation = { compareVersions: (${compare}) };\n${factory}\nthis.checker = createReleaseUpdateChecker(options);`, context);
  return { checker: context.checker, requests };
}
function release(request, tag, body) {
  request.onload({ status: 200, responseText: JSON.stringify({ tag_name: 'v' + tag, body }) });
}
async function checkWith(body, tag = '3.2.14', cached = {}) {
  const f = fixture(cached);
  const pending = f.checker.check(true);
  release(f.requests[0], tag, body);
  return { result: await pending, f };
}
const quietUpgrade = (() => {
  const context = {};
  vm.runInNewContext(`const CoreFoundation = { compareVersions: (${compare}) };\n${helper}\nthis.isQuietUpgrade = isQuietUpgrade;`, context);
  return context.isQuietUpgrade;
})();

test('a matching (quiet) heading marks the available release quiet', async () => {
  const { result } = await checkWith('## 3.2.14 — 2026-10-12 (quiet)\n\n- First.\n- Second.\n\n## 3.2.13 — 2026-10-01\n\n- Old.');
  assert.equal(result.available, true);
  assert.equal(result.quiet, true);
  assert.deepEqual(Array.from(result.details), ['First.', 'Second.']);
});

test('hyphen separators and CRLF bodies are read as quiet', async () => {
  const { result } = await checkWith('## 3.2.14 - 2026-10-12 (quiet)\r\n\r\n- First.\r\n- Second.\r\n');
  assert.equal(result.quiet, true);
});

test('normal, mismatched, missing, and malformed headings are not quiet', async () => {
  for (const body of [
    '## 3.2.14 — 2026-10-12\n\n- First.\n- Second.',
    '## 3.2.15 — 2026-10-12 (quiet)\n\n- Wrong version.\n- Second.',
    '- No heading at all.',
    '',
    '## Release notes (quiet)\n\n- No version.',
    '## 3.2.14 — 2026-10-12 (quiet) extra\n\n- Suffix not last.',
  ]) {
    const { result } = await checkWith(body);
    assert.equal(result.quiet, false, JSON.stringify(body));
  }
});

test('quiet is false when the release is not newer than the installed version', async () => {
  const { result } = await checkWith('## 3.2.13 — 2026-10-12 (quiet)\n\n- Same.\n- Version.', '3.2.13');
  assert.equal(result.available, false);
  assert.equal(result.quiet, false);
});

test('a cached quiet result keeps its flag in status()', async () => {
  const { f } = await checkWith('## 3.2.14 — 2026-10-12 (quiet)\n\n- First.\n- Second.');
  assert.equal(f.checker.status().quiet, true);
});

test('a newer normal release replaces a cached quiet result', async () => {
  const { f } = await checkWith('## 3.2.14 — 2026-10-12 (quiet)\n\n- First.\n- Second.');
  const pending = f.checker.check(true);
  release(f.requests[1], '3.2.15', '## 3.2.15 — 2026-10-13\n\n- Loud.\n- Release.');
  const result = await pending;
  assert.equal(result.latest, '3.2.15');
  assert.equal(result.quiet, false);
});

test('a new installed version clears a cached quiet flag', () => {
  const f = fixture({ checkedForVersion: '3.2.12', lastCheckAt: Date.now(), lastRemoteVersion: '3.2.14', quiet: true }, '3.2.13');
  f.checker.check();
  assert.equal(f.checker.status().quiet, false);
});

test('isQuietUpgrade is true only when every skipped release is quiet', () => {
  const released = ['3.4.26', '3.4.25', '3.4.24', '3.4.23'];
  assert.equal(quietUpgrade('3.4.25', '3.4.26', released, ['3.4.26']), true);
  assert.equal(quietUpgrade('3.4.24', '3.4.26', released, ['3.4.26']), false, 'skipped normal 3.4.25');
  assert.equal(quietUpgrade('3.4.24', '3.4.26', released, ['3.4.25', '3.4.26']), true);
  assert.equal(quietUpgrade('3.4.25', '3.4.26', released, []), false);
  assert.equal(quietUpgrade('3.4.25', '3.4.27', released, ['3.4.26']), false, 'current missing from notes');
  assert.equal(quietUpgrade('3.4.26', '3.4.25', released, ['3.4.25']), false, 'downgrade');
  assert.equal(quietUpgrade('', '3.4.26', released, ['3.4.26']), false);
  assert.equal(quietUpgrade('garbage', '3.4.26', released, ['3.4.26']), false);
  assert.equal(quietUpgrade('3.4.25', '3.4.26', null, null), false);
});

test('automatic update checks are throttled to once every 12 hours', async () => {
  const hour = 60 * 60 * 1000;
  const recent = fixture({ checkedForVersion: '3.2.13', lastCheckAt: Date.now() - 11 * hour, lastRemoteVersion: '3.2.13', state: 'checked' });
  assert.equal((await recent.checker.check()).state, 'cached');
  assert.equal(recent.requests.length, 0);
  const stale = fixture({ checkedForVersion: '3.2.13', lastCheckAt: Date.now() - 13 * hour, lastRemoteVersion: '3.2.13', state: 'checked' });
  stale.checker.check();
  assert.equal(stale.requests.length, 1);
  assert.equal(recent.checker.CHECK_INTERVAL, 12 * hour);
});

test('a forced check ignores the 12-hour throttle', () => {
  const f = fixture({ checkedForVersion: '3.2.13', lastCheckAt: Date.now(), lastRemoteVersion: '3.2.13', state: 'checked' });
  f.checker.check(true);
  assert.equal(f.requests.length, 1);
});

test('the shared chrome contract advertises the 12-hour interval', () => {
  assert.match(fs.readFileSync(path.join(root, 'src/chrome-contract.js'), 'utf8'), /const UPDATE_CHECK_INTERVAL_MS = 12 \* 60 \* 60 \* 1000;/);
});
