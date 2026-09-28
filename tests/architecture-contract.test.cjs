'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(root, relative));

test('exp-core owns the shared foundation and no release path extracts from Dropper', () => {
  const pkg = JSON.parse(read('package.json'));
  const build = read('scripts/build.cjs');
  const release = read('.github/workflows/release.yml');
  const manifest = JSON.parse(read('dist/manifest.json'));

  assert.equal(pkg.scripts.extract, undefined);
  assert.equal(pkg.scripts['extract:check'], undefined);
  assert.doesNotMatch(release, /npm run extract/u);
  assert.match(build, /'foundation\.js'/u);
  assert.doesNotMatch(build, /dropper-reference\.js/u);
  assert.equal(manifest.source.source, 'ExtraPotions/exp-core');
  assert.equal(manifest.source.architecture, 'core-native');
  assert.equal(manifest.source.sourceVersion, manifest.coreVersion);
  assert.doesNotMatch(read('src/runtime.js'), /source:\s*['"]Dropper['"]/u);
});

test('legacy Dropper-to-Core generation paths are absent', () => {
  for (const relative of [
    'src/dropper-reference.js',
    'scripts/extract-dropper.cjs',
    'scripts/sync-dropper-menu.cjs',
    'source-provenance.json',
  ]) {
    assert.equal(exists(relative), false, relative);
  }
});

test('Core synchronization treats every product, including Dropper, as a downstream consumer', () => {
  const sync = read('scripts/sync-products.cjs');
  assert.match(sync, /\['Dropper','SHIFT','PRISMA','WARD'\]/u);
  assert.match(sync, /vendor','exp-core','PIN'/u);
  assert.match(sync, /const pin='v'\+version/u);
});

test('Core exposes shared services through the public ExtraPotionsCore API', () => {
  const runtime = read('src/runtime.js');
  assert.match(runtime, /bindDiagnosticsControls:ExtraPotionsDiagnostics\.bindControls/u);
  assert.match(runtime, /mountMenuArrangement:ExpMenuArrangement\.mount/u);
  assert.match(runtime, /createDiagnosticsReport/u);
});
