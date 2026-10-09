'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findInstalledBrowser, browserCandidates } = require('../scripts/installed-browser.cjs');

test('EXP_BROWSER_PATH is tried first', () => {
  assert.equal(browserCandidates({ EXP_BROWSER_PATH: 'X:/custom/chrome.exe' })[0], 'X:/custom/chrome.exe');
  assert.equal(findInstalledBrowser({ env: { EXP_BROWSER_PATH: 'X:/custom/chrome.exe' }, exists: p => p === 'X:/custom/chrome.exe' }), 'X:/custom/chrome.exe');
});

test('falls back through Chrome and Edge locations, or returns null', () => {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  assert.equal(findInstalledBrowser({ env: {}, exists: p => p === edge }), edge);
  assert.equal(findInstalledBrowser({ env: {}, exists: () => false }), null);
});
