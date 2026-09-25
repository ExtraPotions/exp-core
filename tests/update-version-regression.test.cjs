'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'dist/exp-core.js'), 'utf8');
const factoryStart = bundle.indexOf('  function createReleaseUpdateChecker(');
const factoryEnd = bundle.indexOf('\n  function createDiagnosticsReport(', factoryStart);
assert.ok(factoryStart >= 0 && factoryEnd > factoryStart);
const compareStart = bundle.indexOf('function compareVersions(');
const compareEnd = bundle.indexOf('\nreturn Object.freeze', compareStart);
assert.ok(compareStart >= 0 && compareEnd > compareStart);
const factory = bundle.slice(factoryStart, factoryEnd);
const compare = bundle.slice(compareStart, compareEnd).trim();

function fixture(cached = {}, version = '3.2.13', enabled = true) {
  const key = 'exp:v3:ward:update-cache';
  const storage = new Map([[key, JSON.stringify(cached)]]);
  const requests = [];
  const context = {
    options: { productId: 'ward', repository: 'ExtraPotions/WARD', currentVersion: version, enabled: () => enabled },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    GM_xmlhttpRequest: options => requests.push(options),
    Date, JSON, Object, String, Number, Array, Promise, Error,
  };
  vm.runInNewContext(`const DropperReference = { compareVersions: (${compare}) };\n${factory}\nthis.checker = createReleaseUpdateChecker(options);`, context);
  return { checker: context.checker, requests, state: () => JSON.parse(storage.get(key)) };
}
function respond(request, version = '3.2.14') {
  request.onload({ status: 200, responseText: JSON.stringify({ tag_name: 'v' + version, body: '## ' + version + '\n\n- First concrete change.\n- Second concrete change.\n\n## Older\n\n- Do not include this.' }) });
}

test('new installed version bypasses the previous version throttle and lease', async () => {
  const f = fixture({ checkedForVersion: '3.2.12', lastCheckAt: Date.now(), checkLeaseUntil: Date.now() + 30000, lastRemoteVersion: '99.0.0' });
  const pending = f.checker.check();
  assert.equal(f.requests.length, 1);
  assert.equal(f.state().checkedForVersion, '3.2.13');
  assert.equal(f.state().lastRemoteVersion, '');
  assert.equal(f.checker.status().available, false);
  respond(f.requests[0]);
  const result = await pending;
  assert.equal(result.latest, '3.2.14');
  assert.equal(result.available, true);
  assert.deepEqual(Array.from(result.details), ['First concrete change.', 'Second concrete change.']);
});

test('legacy latest alias cannot restore stale remote data after failed fresh check', async () => {
  const f = fixture({ checkedAt: Date.now(), latest: '99.0.0', details: ['Stale notes'] });
  const pending = f.checker.check();
  assert.equal(f.requests.length, 1);
  assert.equal(f.checker.status().lastRemoteVersion, null);
  assert.equal(f.checker.status().available, false);
  f.requests[0].onerror();
  const result = await pending;
  assert.equal(result.state, 'failed');
  assert.equal(result.latest, null);
  assert.equal(result.lastRemoteVersion, null);
  assert.equal(result.available, false);
  assert.deepEqual(Array.from(result.details), []);
});

test('an explicitly cleared canonical remote version is not replaced by a legacy alias', () => {
  const f = fixture({ checkedForVersion: '3.2.13', lastCheckAt: 0, checkedAt: Date.now(), lastRemoteVersion: '', latest: '99.0.0' });
  assert.equal(f.checker.status().checkedAt, 0);
  assert.equal(f.checker.status().lastRemoteVersion, null);
  assert.equal(f.checker.status().available, false);
});

test('a completed current-version check keeps its fifteen-minute throttle', async () => {
  const f = fixture({ checkedForVersion: '3.2.13', lastCheckAt: Date.now(), lastRemoteVersion: '3.2.13', state: 'checked' });
  const result = await f.checker.check();
  assert.equal(f.requests.length, 0);
  assert.equal(result.available, false);
  assert.equal(result.state, 'cached');
});

test('a current-version in-flight lease suppresses a duplicate background request', async () => {
  const f = fixture();
  const first = f.checker.check();
  const second = await f.checker.check();
  assert.equal(f.requests.length, 1);
  assert.equal(second.state, 'checking');
  respond(f.requests[0], '3.2.13');
  assert.equal((await first).available, false);
});

test('update opt-out prevents background network access but permits an explicit check', async () => {
  const f = fixture({}, '3.2.13', false);
  assert.equal((await f.checker.check()).state, 'disabled');
  assert.equal(f.requests.length, 0);
  const manual = f.checker.check(true);
  assert.equal(f.requests.length, 1);
  respond(f.requests[0]);
  assert.equal((await manual).available, true);
});
