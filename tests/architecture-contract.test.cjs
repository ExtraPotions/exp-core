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

test('Core synchronization discovers downstream consumers from the suite manifest', () => {
  const sync = read('scripts/sync-products.cjs');
  const contract = JSON.parse(read('src/suite-contract.json'));
  assert.match(sync, /loadSuiteContract\(root\)/u);
  assert.match(sync, /repositories:discoveredProducts/u);
  assert.doesNotMatch(sync, /\['Dropper','SHIFT','PRISMA','WARD'\]/u);
  assert.deepEqual(Object.fromEntries(Object.entries(contract).map(([id, value]) => [id, value.repository])), {
    dropper: 'Dropper', shift: 'SHIFT', ward: 'WARD', prisma: 'PRISMA'
  });
  assert.match(sync, /vendor','exp-core','PIN'/u);
  assert.match(sync, /const pin='v'\+version/u);
});

test('consumer verification topology is discovered from the suite manifest', () => {
  const workflow = read('.github/workflows/verify-consumers.yml');
  const matrix = read('scripts/consumer-matrix.cjs');
  assert.match(matrix, /loadSuiteContract\(root\)/u);
  assert.match(matrix, /\{flagship,products\}=loadSuiteContract\(root\)/u);
  assert.match(matrix, /products='\+JSON\.stringify\(products\)/u);
  assert.match(workflow, /node scripts\/consumer-matrix\.cjs >> "\$GITHUB_OUTPUT"/u);
  assert.match(workflow, /fromJSON\(needs\.discover\.outputs\.products\)/u);
  assert.match(workflow, /ExtraPotions\/\$\{\{ needs\.discover\.outputs\.flagship \}\}/u);
  assert.doesNotMatch(workflow, /repository: ExtraPotions\/Dropper/u);
  assert.doesNotMatch(workflow, /product: \[SHIFT, WARD, PRISMA\]/u);
});

test('build, sync, and CI share one validated suite-contract loader', () => {
  const loader = read('scripts/suite-contract.cjs');
  for (const script of ['scripts/build.cjs','scripts/sync-products.cjs','scripts/consumer-matrix.cjs']) {
    assert.match(read(script), /suite-contract\.cjs/u, script);
    assert.match(read(script), /loadSuiteContract/u, script);
  }
  assert.match(loader, /exactly one flagship is required/u);
  assert.match(loader, /repository is duplicated/u);
  assert.match(loader, /presentationPhases contains an unknown phase/u);
  assert.match(loader, /menuSections has unknown category/u);
  assert.match(loader, /has invalid rootId/u);
});

test('visual audit coverage is locked to the suite manifest inventory', () => {
  for (const script of ['scripts/check-product-menus.cjs','scripts/check-annotations.cjs']) {
    const source = read(script);
    assert.match(source, /suite-contract\.cjs/u, script);
    assert.match(source, /repositories/u, script);
    assert.match(source, /product coverage must match suite manifest/u, script);
  }
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

test('Core lifecycle uses product-neutral ownership and style diagnostics', () => {
  const lifecycle = read('src/lifecycle.js');
  assert.match(lifecycle, /\[data-exp-owned="1"\]/u);
  assert.match(lifecycle, /'core\.style'/u);
  assert.doesNotMatch(lifecycle, /data-exp-shift|shift\.style/u);
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
  assert.match(read('src/menu-arrangement.js'), /const PRODUCT_SECTIONS = __EXP_SUITE_MENU_SECTIONS__;/u);
  assert.match(build, /const menuSectionsMarker = '__EXP_SUITE_MENU_SECTIONS__'/u);
  assert.match(build, /value\.menuSections \|\| \{\}/u);
  assert.match(build, /const rootIdsMarker = '__EXP_SUITE_ROOT_IDS__'/u);
  assert.match(read('src/product-tools.js'), /const PRODUCT_ROOT_IDS = __EXP_SUITE_ROOT_IDS__;/u);
  assert.doesNotMatch(read('src/product-tools.js'), /\['dropper','shift','prisma','ward'\]/u);
  assert.doesNotMatch(read('src/product-tools.js'), /id==='dropper'/u);
  assert.deepEqual(Object.keys(contract).sort(), Object.keys(Object.fromEntries(Object.entries(contract).map(([id, value]) => [id, value.menuSections]))).sort());
  assert.match(runtime, /menuSections: Object\.freeze\(Object\.fromEntries/u);
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
  const diagnostics = read('src/diagnostic-report.js');
  assert.doesNotMatch(runtime, /\.ward-launcher|#tdh-settings-launcher|\.ward-header/u);
  assert.doesNotMatch(diagnostics, /\.ward-launcher|#tdh-settings-launcher|#tdh-tools-dock/u);
  assert.match(runtime, /notice\.dataset\.expUpdateNotice = '1'/u);
  assert.match(diagnostics, /first\('\[data-exp-part="launcher"\]'\)/u);
  assert.match(diagnostics, /first\('\[data-exp-part="dock"\]'\)/u);
  assert.doesNotMatch(runtime, /\.ward-shell\{display:contents\}/u);
});
