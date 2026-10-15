'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const source = `(() => {\n${bundle}\nglobalThis.ExtraPotionsCore = ExtraPotionsCore;\n})();\n`;

function luminance(value) {
  const channels = [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(one, two) {
  const [light, dark] = [luminance(one), luminance(two)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

test('ExtraPotions themes preserve their identities and add distinct accessible semantic roles', async t => {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const themes = await page.evaluate(() => ExtraPotionsCore.themes({
    id: 'ward', name: 'WARD', swatch: '#cc7a32', bg: '#111014', panel: '#19171d',
    line: '#443c48', text: '#f5f1f7', muted: '#b5aab8', accent: '#cc7a32', accent2: '#e5aa72',
  }).map(theme => ({ ...theme, vars: undefined })));
  for (const theme of themes) {
    assert.match(theme.raised, /^#[0-9a-f]{6}$/i);
    assert.match(theme.inset, /^#[0-9a-f]{6}$/i);
    assert.match(theme.link, /^#[0-9a-f]{6}$/i);
    assert.match(theme.focus, /^#[0-9a-f]{6}$/i);
    assert.match(theme.onAccent, /^#[0-9a-f]{6}$/i);
    assert.notEqual(theme.raised, theme.panel);
    assert.ok(contrast(theme.link, theme.panel) >= 4.5, `${theme.name} link contrast`);
    assert.ok(contrast(theme.focus, theme.panel) >= 3, `${theme.name} focus contrast`);
    assert.ok(contrast(theme.onAccent, theme.accent) >= 4.5, `${theme.name} accent contrast`);
  }
  assert.ok(themes.some(theme => theme.id === 'ward' && theme.name === 'WARD'));
});
