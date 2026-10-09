'use strict';

// Finds an installed Chrome or Edge for Playwright to drive instead of its own downloaded browser.
// Set EXP_BROWSER_PATH to choose a specific browser executable.

const fs = require('node:fs');

function browserCandidates(env = process.env) {
  return [
    env.EXP_BROWSER_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
}

function findInstalledBrowser({ env = process.env, exists = fs.existsSync } = {}) {
  return browserCandidates(env).find(candidate => exists(candidate)) || null;
}

module.exports = { browserCandidates, findInstalledBrowser };
