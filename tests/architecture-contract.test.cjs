'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('exp-core owns the shared foundation and no release path extracts from Dropper', () => {
  const pkg = JSON.parse(read('package.json'));
  const build = read('scripts/build.cjs');
  const release = read('.github/workflows/release.yml');
  const provenance = JSON.parse(read('source-provenance.json'));

  assert.equal(pkg.scripts.extract, undefined);
  assert.equal(pkg.scripts['extract:check'], undefined);
  assert.doesNotMatch(release, /npm run extract/u);
  assert.match(build, /'foundation\.js'/u);
  assert.doesNotMatch(build, /dropper-reference\.js/u);
  assert.equal(provenance.source, 'ExtraPotions/exp-core');
  assert.equal(provenance.architecture, 'core-native');
});

test('Core synchronization treats Dropper as a downstream consumer', () => {
  const sync = read('scripts/sync-products.cjs');
  assert.match(sync, /\['Dropper','SHIFT','PRISMA','WARD'\]/u);
  assert.match(sync, /vendor','exp-core','PIN'/u);
  assert.match(sync, /const pin='v'\+version/u);
});

test('retired Dropper extraction cannot regenerate Core', () => {
  const extractor = read('scripts/extract-dropper.cjs');
  const compatibility = read('src/dropper-reference.js');
  assert.match(extractor, /Retired: exp-core is the canonical shared foundation/u);
  assert.doesNotMatch(compatibility, /const DropperReference/u);
});
