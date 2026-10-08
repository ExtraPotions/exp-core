'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runtimePath = path.join(__dirname, '..', 'src', 'runtime.js');
const source = fs.readFileSync(runtimePath, 'utf8');
const { chromeContract } = require('../src/chrome-contract.js');
const suiteContract = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'suite-contract.json'), 'utf8'));

function loadLayoutGrid(peers) {
  const start = source.indexOf('  function layoutGrid() {');
  const end = source.indexOf('\n  function registerLauncher', start);
  assert.ok(start >= 0 && end > start, 'layoutGrid source is available');
  const functionSource = source.slice(start, end).trim();
  const storage = new Map();
  const read = (key, fallback) => storage.has(key) ? storage.get(key) : fallback;
  const write = (key, value) => storage.set(key, value);
  const document = { querySelectorAll: () => peers };
  const layoutGrid = new Function(
    'read',
    'write',
    'document',
    'GRID_ORDER',
    'SUITE_PRODUCTS',
    `${functionSource}\nreturn layoutGrid;`,
  )(read, write, document, 'exp:v3:launcher-order', suiteContract);
  layoutGrid.storage = storage;
  return layoutGrid;
}

function peer(productId, priority, reservedRows) {
  const dataset = {
    expProductLauncher: '1',
    productId,
    launcherPriority: String(priority),
  };
  if (reservedRows !== undefined) dataset.launcherReservedRows = String(reservedRows);
  return { dataset, style: { setProperty() {} } };
}

function placement(node) {
  return {
    slot: node.dataset.launcherSlot,
    row: node.dataset.launcherRow,
    column: node.dataset.launcherColumn,
    span: node.dataset.launcherSpan,
  };
}

test('shared Core preserves launcher cells when progress visibility changes', () => {
  const dropper = peer('dropper', suiteContract.dropper.launcherPriority, 3);
  const shift = peer('shift', suiteContract.shift.launcherPriority);
  const prisma = peer('prisma', suiteContract.prisma.launcherPriority);
  const ward = peer('ward', suiteContract.ward.launcherPriority);
  const layoutGrid = loadLayoutGrid([dropper, ward, prisma, shift]);

  layoutGrid();
  assert.deepEqual(placement(dropper), { slot: '0', row: '0', column: '0', span: '1' });
  assert.deepEqual(placement(shift), { slot: '3', row: '1', column: '0', span: '1' });
  assert.deepEqual(placement(ward), { slot: '6', row: '2', column: '0', span: '1' });
  assert.deepEqual(placement(prisma), { slot: '9', row: '3', column: '0', span: '1' });

  dropper.dataset.launcherReservedRows = '1';
  layoutGrid();
  assert.deepEqual(placement(dropper), { slot: '0', row: '0', column: '0', span: '1' });
  assert.deepEqual(placement(shift), { slot: '3', row: '1', column: '0', span: '1' });
  assert.deepEqual(placement(ward), { slot: '6', row: '2', column: '0', span: '1' });
  assert.deepEqual(placement(prisma), { slot: '9', row: '3', column: '0', span: '1' });
});

test('shared launcher measurements match the suite contract', () => {
  assert.deepEqual(
    {
      button: chromeContract.artwork.launcherButtonSize,
      artwork: chromeContract.artwork.launcherArtworkSize,
      gap: chromeContract.artwork.launcherGapSize,
      menuBadge: chromeContract.artwork.menuBadgeSize,
      sourceBadge: chromeContract.artwork.sourceBadgeSize,
      dropperRing: chromeContract.artwork.dropperProgressRingSize,
      siblingRings: chromeContract.artwork.siblingProgressRings,
    },
    { button: 48, artwork: 40, gap: 8, menuBadge: 40, sourceBadge: 128, dropperRing: 44, siblingRings: false },
  );
  assert.match(source, /\[data-exp-part="launcher"\]\{[^}]*width:48px!important;[^}]*height:48px!important/u);
  assert.match(source, /\[data-exp-part="launcher"\] \.launcher-icon\{width:40px!important;height:40px!important\}/u);
  assert.match(source, /\.header-icon \.menu-icon\{width:38px!important;height:38px!important\}/u);
  assert.match(source, /column \* 56 \+ 'px'/u);
  assert.match(source, /Math\.round\(dy\/56\)\*3/u);
  assert.match(source, /ArrowUp:-3,ArrowDown:3/u);
  assert.match(source, /assign\(node, stacked \? index \* 3 : index\)/u);
  assert.equal(chromeContract.artwork.launcherButtonSize + chromeContract.artwork.launcherGapSize, 56);
  assert.match(source, /launcher\.replaceChildren\(mark\)/u);
  assert.doesNotMatch(source, /launcher\.append\(ring/u);
  assert.equal(chromeContract.menu.widthPx, 364);
  assert.equal(chromeContract.menu.sizing, 'viewport-clamped');
  assert.deepEqual(chromeContract.menu.badgeOnlyProgress, {
    placement: 'menu-content',
    width: '100%',
    outerBleed: false,
  });
  assert.equal(chromeContract.menu.dockPaddingInlinePx, 12);
  assert.match(source, /function menuWidth\(\) \{ return ExpMenuPreferences\.menuSizeTokens\(\)\.width; \}/u);
  assert.doesNotMatch(source, /menuWidthForMode|data-panel-width|data-menu-width/u);
});


test('active coordination registries exclude archived products', () => {
  assert.doesNotMatch(source, /\bclarity\b|\bmockingbird\b/u);
});

test('cross-product audits exclude archived repositories', () => {
  for (const file of ['check-product-menus.cjs', 'check-annotations.cjs']) {
    const auditSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', file), 'utf8');
    assert.doesNotMatch(auditSource, /\bclarity\b|\bmockingbird\b/iu, file);
  }
});


test('fresh registration order does not become a saved preference', () => {
  const peers = [];
  const layoutGrid = loadLayoutGrid(peers);
  const prisma = peer('prisma', suiteContract.prisma.launcherPriority);
  const ward = peer('ward', suiteContract.ward.launcherPriority);
  const dropper = peer('dropper', suiteContract.dropper.launcherPriority);
  const shift = peer('shift', suiteContract.shift.launcherPriority);

  peers.push(prisma); layoutGrid();
  peers.push(ward); layoutGrid();
  peers.push(dropper); layoutGrid();
  assert.equal(layoutGrid.storage.has('exp:v3:launcher-order'), false);

  peers.push(shift); layoutGrid();
  assert.deepEqual(layoutGrid.storage.get('exp:v3:launcher-order'), ['dropper','shift','ward','prisma']);
  assert.deepEqual(
    [...peers].sort((a,b)=>Number(a.dataset.launcherSlot)-Number(b.dataset.launcherSlot)).map(node=>node.dataset.productId),
    ['dropper','shift','ward','prisma'],
  );
});
