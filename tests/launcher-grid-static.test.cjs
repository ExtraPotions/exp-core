'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const runtimePath = path.join(__dirname, '..', 'src', 'runtime.js');
const source = fs.readFileSync(runtimePath, 'utf8');
const { chromeContract } = require('../src/chrome-contract.js');

function loadLayoutGrid(peers) {
  const start = source.indexOf('  function layoutGrid() {');
  const end = source.indexOf('\n  function registerLauncher', start);
  assert.ok(start >= 0 && end > start, 'layoutGrid source is available');
  const functionSource = source.slice(start, end).trim();
  const storage = new Map();
  const read = (key, fallback) => storage.has(key) ? storage.get(key) : fallback;
  const write = (key, value) => storage.set(key, value);
  const document = { querySelectorAll: () => peers };
  return new Function(
    'read',
    'write',
    'document',
    'GRID_ORDER',
    `${functionSource}\nreturn layoutGrid;`,
  )(read, write, document, 'exp:v3:launcher-order');
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
  const dropper = peer('dropper', 90, 3);
  const shift = peer('shift', 100);
  const prisma = peer('prisma', 80);
  const ward = peer('ward', 60);
  const layoutGrid = loadLayoutGrid([dropper, ward, prisma, shift]);

  layoutGrid();
  assert.deepEqual(placement(dropper), { slot: '0', row: '0', column: '0', span: '1' });
  assert.deepEqual(placement(shift), { slot: '1', row: '0', column: '1', span: '1' });
  assert.deepEqual(placement(prisma), { slot: '2', row: '0', column: '2', span: '1' });
  assert.deepEqual(placement(ward), { slot: '3', row: '1', column: '0', span: '1' });

  dropper.dataset.launcherReservedRows = '1';
  layoutGrid();
  assert.deepEqual(placement(shift), { slot: '1', row: '0', column: '1', span: '1' });
  assert.deepEqual(placement(prisma), { slot: '2', row: '0', column: '2', span: '1' });
  assert.deepEqual(placement(ward), { slot: '3', row: '1', column: '0', span: '1' });
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
    { button: 48, artwork: 40, gap: 8, menuBadge: 38, sourceBadge: 128, dropperRing: 44, siblingRings: false },
  );
  assert.match(source, /\[data-exp-part="launcher"\]\{[^}]*width:48px!important;[^}]*height:48px!important/u);
  assert.match(source, /\[data-exp-part="launcher"\] \.launcher-icon\{width:40px!important;height:40px!important\}/u);
  assert.match(source, /\.header-icon \.menu-icon\{width:38px!important;height:38px!important\}/u);
  assert.match(source, /column \* 56 \+ 'px'/u);
  assert.equal(chromeContract.artwork.launcherButtonSize + chromeContract.artwork.launcherGapSize, 56);
  assert.match(source, /launcher\.replaceChildren\(mark\)/u);
  assert.doesNotMatch(source, /launcher\.append\(ring/u);
  assert.deepEqual(chromeContract.menu.widths, {
    full: { default: 312, min: 280, max: 340 },
    compact: 260,
    narrow: 220,
  });
  assert.deepEqual(chromeContract.menu.badgeOnlyProgress, {
    placement: 'menu-content',
    width: '100%',
    outerBleed: false,
  });
  assert.equal(chromeContract.menu.dockPaddingInlinePx, 9);
  assert.match(source, /function menuWidthForMode\(mode = 'compact', fullWidth = 312\)/u);
  assert.match(source, /return Number\.isFinite\(full\) \? Math\.max\(280, Math\.min\(full, 340\)\) : 312;/u);
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
