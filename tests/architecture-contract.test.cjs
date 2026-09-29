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

test('Core owns shared product-service bootstrap', () => {
  const runtime = read('src/runtime.js');
  assert.match(runtime, /function createProductServices\(options = \{\}\)/u);
  assert.match(runtime, /const lifecycle = createProductLifecycle\(api\)/u);
  assert.match(runtime, /const diagnostics = Object\.freeze/u);
  assert.match(runtime, /const updates = createReleaseUpdateChecker/u);
  assert.match(runtime, /createProductServices/u);
});


test('generated manifest carries the canonical suite contract from one source file', () => {
  const contract = JSON.parse(read('src/suite-contract.json'));
  const manifest = JSON.parse(read('dist/manifest.json'));
  const runtime = read('src/runtime.js');
  const build = read('scripts/build.cjs');
  assert.deepEqual(manifest.suiteContract, contract);
  assert.equal(typeof manifest.files['suite-contract.json'], 'string');
  assert.match(manifest.files['suite-contract.json'], /^[0-9a-f]{64}$/u);
  assert.match(runtime, /__EXP_SUITE_CONTRACT__/u);
  assert.doesNotMatch(runtime, /twitch\.drops|retail\.classification|text\.identity-detection/u);
  assert.match(build, /contractMarker = '__EXP_SUITE_CONTRACT__'/u);
  assert.match(build, /suiteContract/u);
  assert.match(read('src/diagnostic-report.js'), /const supportedProducts = __EXP_SUITE_PRODUCT_IDS__;/u);
  assert.match(build, /const productIdsMarker = '__EXP_SUITE_PRODUCT_IDS__'/u);
  assert.match(build, /JSON\.stringify\(Object\.keys\(suiteContract\)\)/u);
  assert.doesNotMatch(read('src/diagnostic-report.js'), /\['ward', 'dropper', 'prisma', 'shift'\]/u);
});

test('suite manifest owns launcher and theme coordination priorities', () => {
  const contract = JSON.parse(read('src/suite-contract.json'));
  const runtime = read('src/runtime.js');
  assert.deepEqual(
    Object.fromEntries(Object.entries(contract).map(([id, value]) => [id, value.launcherPriority])),
    { dropper: 110, shift: 100, ward: 60, prisma: 40 }
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(contract).map(([id, value]) => [id, value.themePriority])),
    { dropper: 4, shift: 3, ward: 1, prisma: 2 }
  );
  assert.match(runtime, /const LAUNCHER_PRIORITY = Object\.freeze\(Object\.fromEntries/u);
  assert.match(runtime, /const THEME_PRIORITY = Object\.freeze\(Object\.fromEntries/u);
  assert.doesNotMatch(runtime, /const PRIORITY = \{/u);
  assert.doesNotMatch(runtime, /const THEME_PRIORITY = \{[^\n]*dropper/u);
  assert.match(runtime, /const launcherPriority = contract \? contract\.launcherPriority : options\.priority \?\? 0;/u);
  assert.doesNotMatch(runtime, /Number\.MAX_SAFE_INTEGER/u);
  assert.doesNotMatch(runtime, /coreSource = 'Dropper\//u);
  assert.match(runtime, /coreSource = 'exp-core'/u);
  assert.doesNotMatch(runtime, /host\?\.dataset\.productId === 'dropper'/u);
  assert.match(runtime, /createThemeSwatches,publishMenuPalette,createFloatingNotice/u);
  assert.doesNotMatch(runtime, /dropperThemeObserver|observedDropper|#tdh-cluster/u);
  assert.match(runtime, /panel\.classList\.add\('exp-menu-surface'\)/u);
  assert.match(runtime, /button\.id = 'exp-support-button'/u);
  assert.match(runtime, /popover\.id = 'exp-support-popover'/u);
  assert.match(runtime, /--exp-ui-opacity/u);
  assert.doesNotMatch(runtime, /panel\.classList\.add\('dropper-menu-surface'\)/u);
  assert.match(runtime, /const common = CoreFoundation\.SHARED_UI_THEMES;/u);
  assert.doesNotMatch(runtime, /UI_THEMES\.filter\(t => !\['twitch', 'dropper'\]/u);
  const foundation = read('src/foundation.js');
  assert.match(foundation, /const SHARED_UI_THEMES = Object\.freeze\(UI_THEMES\.slice\(0, 6\)\)/u);
  assert.match(foundation, /UI_THEMES, SHARED_UI_THEMES, css/u);
  assert.match(runtime, /const FLOATING_NOTICE_CSS = /u);
  assert.match(runtime, /function ensureFloatingNoticeStyle\(shadow\)/u);
  assert.match(runtime, /function syncNoticeTheme\(notice, themeSource\)/u);
  assert.equal((runtime.match(/\.exp-floating-update\{position:fixed;z-index:2147483647/gu) || []).length, 1);
  assert.equal((runtime.match(/const syncTheme = \(\) => syncNoticeTheme\(notice, themeSource\);/gu) || []).length, 2);
  assert.doesNotMatch(runtime, /host\.style\.setProperty\('--dropper-'/u);
  assert.doesNotMatch(runtime, /themeRoot\.style\.setProperty\('--dropper-ui-opacity'/u);
  assert.doesNotMatch(foundation, /--dropper-ui-opacity:1;/u);
  assert.match(runtime, /var\(--dropper-accent/u);
  assert.match(foundation, /var\(--dropper-ui-opacity,1\)/u);
});
