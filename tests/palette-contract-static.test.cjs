'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const reference = fs.readFileSync(path.join(__dirname, '..', 'src', 'foundation.js'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'src', 'runtime.js'), 'utf8');

test('Core exposes the locked common palette order and product-neutral Crimson fallback', () => {
  const ids = ['ember', 'midnight', 'glacier', 'contrast', 'verdant', 'pride'];
  let cursor = -1;
  for (const id of ids) {
    const next = reference.indexOf(`id:"${id}"`, cursor + 1);
    assert.ok(next > cursor, `${id} follows the locked palette order`);
    cursor = next;
  }
  assert.match(reference, /const CRIMSON_THEME = Object\.freeze\(\{ id:"crimson"/u);
  assert.match(reference, /const SHARED_UI_THEMES = Object\.freeze\(UI_THEMES\.slice\(0, 6\)\)/u);
  assert.match(runtime, /const common = CoreFoundation\.SHARED_UI_THEMES;/u);
  assert.match(runtime, /\.\.\.common, CoreFoundation\.CRIMSON_THEME/u);
});

test('locked Midnight and deep Crimson tokens are exact', () => {
  for (const token of ['#050a12', '#0c1726', '#3563a3', '#65558f', '#348f8b', '#d4deeb']) assert.match(reference, new RegExp(token, 'u'));
  for (const token of ['#0c0508', '#1d090f', '#941f2f', '#5e2144', '#2f746e', '#e5d2d7', '#b63243']) assert.match(reference, new RegExp(token, 'u'));
});

test('shared menu shell keeps a visible themed outer border', () => {
  assert.match(reference, /\[data-exp-part="dock"\] \{[^}]*border:1px solid var\(--theme-line\)/u);
  assert.doesNotMatch(reference, /\[data-exp-part="dock"\] \{[^}]*border:0;/u);
});
