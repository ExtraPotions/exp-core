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
