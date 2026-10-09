'use strict';

// Preload script: makes Playwright launch an already-installed Chrome or Edge
// instead of the browser Playwright downloads for itself. Use it through
// scripts/test-installed-browser.cjs, or set NODE_OPTIONS="--require <this file>".
//
// Set EXP_BROWSER_PATH to choose a specific browser executable.

const path = require('node:path');
const { findInstalledBrowser } = require('./installed-browser.cjs');

const executablePath = findInstalledBrowser();

if (!executablePath) {
  console.error('No installed Chrome or Edge was found. Set EXP_BROWSER_PATH to a browser executable.');
  process.exit(1);
}

let playwright = null;
try {
  playwright = require(require.resolve('playwright', { paths: [process.cwd(), path.resolve(__dirname, '..')] }));
} catch {
  // This process does not use Playwright; nothing to patch.
}

if (playwright?.chromium) {
  const launch = playwright.chromium.launch.bind(playwright.chromium);
  playwright.chromium.launch = (options = {}) => launch({ ...options, executablePath });
}
