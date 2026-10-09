'use strict';

// Refreshes README screenshots for ExtraPotions products from their current builds.
//   npm run screenshots                  every product
//   npm run screenshots -- WARD PRISMA   only these
//   --no-build                           skip each product's build step
// Each product lists its shots in docs/screenshots.config.cjs.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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
    const relative = String(url).slice(prefix.length);
    if (/^assets\/[\w-]+(?:\/[\w-]+)*\.[\w]+$/.test(relative)) return { type: 'asset', path: relative };
    return { type: 'abort' };
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

module.exports = { MIN_BYTES, validateConfig, classifyRequest, checkImages };
