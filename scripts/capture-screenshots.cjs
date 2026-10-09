'use strict';

// Refreshes README screenshots for ExtraPotions products from their current builds.
//   npm run screenshots                  every product
//   npm run screenshots -- WARD PRISMA   only these
//   --no-build                           skip each product's build step
// Each product lists its shots in docs/screenshots.config.cjs.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { findInstalledBrowser } = require('./installed-browser.cjs');

const MIN_BYTES = 3000;
const REQUIRED = ['build', 'userscript', 'host', 'url', 'page', 'viewport', 'shots'];

const isViewport = value => Boolean(value) && Number.isInteger(value.width) && Number.isInteger(value.height) && value.width > 0 && value.height > 0;

function validateConfig(config) {
  const fail = message => { throw new Error(`screenshots.config.cjs: ${message}`); };
  if (!config || typeof config !== 'object') fail('must export an object');
  for (const field of REQUIRED) if (config[field] === undefined) fail(`missing required field "${field}"`);
  if (!Array.isArray(config.build) || config.build.some(item => typeof item !== 'string' || !item)) fail('"build" must be an array of script paths');
  for (const field of ['userscript', 'host', 'page']) if (typeof config[field] !== 'string' || !config[field]) fail(`"${field}" must be a non-empty string`);
  if (typeof config.url !== 'string' || !config.url.startsWith('https://')) fail('"url" must start with https://');
  if (!isViewport(config.viewport)) fail('"viewport" must be { width, height } in pixels');
  if (config.cookies !== undefined && !Array.isArray(config.cookies)) fail('"cookies" must be an array');
  if (config.storage !== undefined && (!config.storage || typeof config.storage !== 'object' || Array.isArray(config.storage))) fail('"storage" must be an object');
  if (config.setup !== undefined && typeof config.setup !== 'function') fail('"setup" must be a function');
  if (!Array.isArray(config.shots) || !config.shots.length) fail('"shots" must be a non-empty array');
  const files = new Set();
  config.shots.forEach((shot, index) => {
    const at = `shots[${index}]`;
    if (!shot || typeof shot.file !== 'string' || !/^[\w.-]+\.png$/.test(shot.file)) fail(`${at}.file must be a .png file name`);
    if (files.has(shot.file)) fail(`${at}.file "${shot.file}" is repeated`);
    files.add(shot.file);
    if (typeof shot.section !== 'string' || !shot.section) fail(`${at}.section is required`);
    if (shot.tab !== undefined && (typeof shot.tab !== 'string' || !shot.tab)) fail(`${at}.tab must be a non-empty string`);
    if (shot.include !== undefined && !['menu', 'page'].includes(shot.include)) fail(`${at}.include must be "menu" or "page"`);
    if (shot.viewport !== undefined && !isViewport(shot.viewport)) fail(`${at}.viewport must be { width, height } in pixels`);
    if (shot.before !== undefined && typeof shot.before !== 'function') fail(`${at}.before must be a function`);
  });
  return config;
}

// Navigation gets the sample page, the product's own launcher assets come from disk, and nothing else leaves the machine.
function classifyRequest(url, isNavigation, productName) {
  const prefix = `https://raw.githubusercontent.com/ExtraPotions/${productName}/main/`;
  if (String(url).startsWith(prefix)) {
    const relative = String(url).slice(prefix.length).split(/[?#]/)[0];
    const segments = relative.split('/');
    const safe = segments.length > 1 && segments[0] === 'assets'
      && segments.slice(1).every(segment => /^[\w.-]+$/.test(segment) && !/^\.+$/.test(segment));
    return safe ? { type: 'asset', path: relative } : { type: 'abort' };
  }
  if (isNavigation) return { type: 'page' };
  return { type: 'abort' };
}

function checkImages(dir, files) {
  const seen = new Map();
  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file));
    if (data.length <= MIN_BYTES) throw new Error(`${file} looks blank (${data.length} bytes)`);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    if (seen.has(hash)) throw new Error(`${file} is identical to ${seen.get(hash)}`);
    seen.set(hash, file);
  }
}

// Runs in the page before the userscript: in-memory userscript storage and no update requests.
function gmInit(storage) {
  const values = new Map(Object.entries(storage || {}));
  window.GM_getValue = (key, fallback) => (values.has(key) ? values.get(key) : fallback);
  window.GM_setValue = (key, value) => values.set(key, value);
  window.GM_deleteValue = key => values.delete(key);
  window.GM_listValues = () => [...values.keys()];
  window.GM_addValueChangeListener = () => 1;
  window.GM_registerMenuCommand = () => {};
  window.GM_xmlhttpRequest = options => { queueMicrotask(() => options.onerror?.({ status: 0 })); return { abort() {} }; };
}

// Playwright's own Chromium when installed, otherwise an installed Chrome or Edge.
async function launchBrowser(chromium) {
  try {
    return await chromium.launch();
  } catch (error) {
    const executablePath = findInstalledBrowser();
    if (!executablePath) throw error;
    return chromium.launch({ executablePath });
  }
}

function runBuild(root, scripts) {
  for (const script of scripts) {
    const result = spawnSync(process.execPath, [path.join(root, script)], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0) {
      const lines = `${result.stderr || ''}\n${result.stdout || ''}`.trim().split(/\r?\n/).filter(Boolean);
      throw new Error(`build step ${script} failed: ${lines[0] || `exit ${result.status}`}`);
    }
  }
}

const firstLine = error => String(error?.message || error).split(/\r?\n/)[0];

async function openView(host, shot) {
  // Some menus build sections just after opening, so give a header a few seconds to appear.
  const header = host.locator('.fl-tool-header').filter({ hasText: shot.section }).first();
  try {
    await header.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    throw new Error(`section "${shot.section}" not found`);
  }
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  if (!shot.tab) return;
  const tab = host.getByRole('tab', { name: shot.tab, exact: true });
  try {
    await tab.first().waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    throw new Error(`tab "${shot.tab}" not found in section "${shot.section}"`);
  }
  const matches = await tab.count();
  if (matches > 1) throw new Error(`tab "${shot.tab}" matches ${matches} tabs in section "${shot.section}"`);
  try {
    await tab.click({ timeout: 5000 });
  } catch (error) {
    throw new Error(`could not click tab "${shot.tab}" in section "${shot.section}": ${firstLine(error)}`);
  }
}

async function captureProduct({ name, root, browser, build = true }) {
  if (!fs.existsSync(root)) throw new Error(`product folder not found: ${root}`);
  const configPath = path.join(root, 'docs', 'screenshots.config.cjs');
  if (!fs.existsSync(configPath)) throw new Error('docs/screenshots.config.cjs not found');
  delete require.cache[require.resolve(configPath)];
  const config = validateConfig(require(configPath));
  if (build) runBuild(root, config.build);
  const userscript = path.join(root, config.userscript);
  if (!fs.existsSync(userscript)) throw new Error(`userscript ${config.userscript} not found`);

  const work = fs.mkdtempSync(path.join(os.tmpdir(), `${name.toLowerCase()}-shots-`));
  let context = null;
  try {
    context = await browser.newContext({ viewport: config.viewport, deviceScaleFactor: 2 });
    if (config.cookies) await context.addCookies(config.cookies);
    const page = await context.newPage();
    await page.addInitScript(gmInit, config.storage || {});
    await page.route('**/*', route => {
      const request = route.request();
      const decision = classifyRequest(request.url(), request.isNavigationRequest(), name);
      if (decision.type === 'asset') return route.fulfill({ path: path.join(root, decision.path) });
      if (decision.type === 'page') return route.fulfill({ status: 200, contentType: 'text/html', body: config.page });
      return route.abort();
    });
    await page.goto(config.url);
    await page.addScriptTag({ content: fs.readFileSync(userscript, 'utf8') });
    const host = page.locator(config.host);
    await host.waitFor({ state: 'attached' });
    await host.locator('[data-exp-part="launcher"]').click();
    await page.waitForTimeout(400);
    if (config.setup) await config.setup(page, host);

    for (const shot of config.shots) {
      // Each shot uses its own window size, or the shot list's when it has none.
      await page.setViewportSize(shot.viewport || config.viewport);
      await openView(host, shot);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      if (shot.before) await shot.before(page, host);
      await host.evaluate(node => { for (const toast of node.shadowRoot?.querySelectorAll('.toast') || []) toast.hidden = true; });
      const file = path.join(work, shot.file);
      if (shot.include === 'page') await page.screenshot({ path: file });
      else await host.locator('[data-exp-part="dock"]').screenshot({ path: file });
    }

    const files = config.shots.map(shot => shot.file);
    checkImages(work, files);
    const output = path.join(root, 'docs', 'screenshots');
    fs.mkdirSync(output, { recursive: true });
    for (const file of files) fs.copyFileSync(path.join(work, file), path.join(output, file));
    const listed = new Set(files);
    return { count: files.length, unlisted: fs.readdirSync(output).filter(file => file.endsWith('.png') && !listed.has(file)).sort() };
  } finally {
    try {
      await context?.close();
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  }
}

function parseArgs(argv, known) {
  const unknownOption = argv.find(arg => arg.startsWith('--') && arg !== '--no-build');
  if (unknownOption) throw new Error(`Unknown option: ${unknownOption}. The only option is --no-build.`);
  const requested = [...new Set(argv.filter(arg => !arg.startsWith('--')))];
  const unknown = requested.filter(name => !known.includes(name));
  if (unknown.length) throw new Error(`Unknown product: ${unknown.join(', ')}. Choose from ${known.join(', ')}.`);
  return { names: requested.length ? requested : known, build: !argv.includes('--no-build') };
}

async function main(argv = process.argv.slice(2)) {
  const { loadSuiteContract } = require('./suite-contract.cjs');
  const { resolveConsumerRoots } = require('./consumer-roots.cjs');
  const known = loadSuiteContract(path.resolve(__dirname, '..')).repositories;
  let options;
  try {
    options = parseArgs(argv, known);
  } catch (error) {
    console.error(error.message);
    return 1;
  }
  const consumers = resolveConsumerRoots();
  const { chromium } = require('playwright');
  const browser = await launchBrowser(chromium);
  let failed = 0;
  try {
    for (const name of options.names) {
      try {
        const result = await captureProduct({ name, root: consumers.root(name), browser, build: options.build });
        console.log(`${name}: ${result.count} screenshots`);
        if (result.unlisted.length) console.warn(`${name}: not in the shot list (left in place): ${result.unlisted.join(', ')}`);
      } catch (error) {
        failed += 1;
        console.error(`${name}: failed — ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  return failed ? 1 : 0;
}

module.exports = { MIN_BYTES, validateConfig, classifyRequest, checkImages, parseArgs, launchBrowser, captureProduct, main };

if (require.main === module) {
  main().then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
}
