'use strict';

// Runs Core's tests together with all four products rebuilt on this Core, the
// same combined check CI runs before a Core release. Your product folders are
// never modified: they are copied to a temporary workspace first.
//
//   npm run suite:local
//
// Uses an installed Chrome or Edge (see use-installed-browser.cjs). Expects
// Dropper, SHIFT, WARD, and PRISMA folders beside this one, each with
// node_modules installed.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const consumers = require('./consumer-roots.cjs').resolveConsumerRoots();
const products = ['Dropper', 'SHIFT', 'WARD', 'PRISMA'];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const shell = process.platform === 'win32';
const run = (command, args, options = {}) => spawnSync(command, args, { stdio: 'inherit', shell: command === npm && shell, ...options });
const fail = message => { console.error(message); process.exit(1); };

for (const name of products) {
  if (!fs.existsSync(consumers.file(name, 'package.json'))) fail(`Missing product folder: ${consumers.root(name)}`);
  if (!fs.existsSync(consumers.file(name, 'node_modules'))) fail(`Run npm ci in ${name} first.`);
}

if (run(process.execPath, [path.join(root, 'scripts', 'build.cjs')]).status !== 0) fail('Core build failed.');
const core = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-suite-'));
console.log(`Workspace: ${workspace}`);

try {
  for (const name of products) {
    const source = consumers.root(name);
    const target = path.join(workspace, name);
    // Copy the files git tracks, as they are on disk now (including unsaved-to-git edits).
    const listed = spawnSync('git', ['ls-files', '-z'], { cwd: source, encoding: 'utf8' });
    if (listed.status !== 0) fail(`git ls-files failed in ${name}`);
    for (const file of listed.stdout.split('\0').filter(Boolean)) {
      const from = path.join(source, file);
      if (!fs.existsSync(from)) continue;
      fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
      fs.copyFileSync(from, path.join(target, file));
    }
    fs.symlinkSync(path.join(source, 'node_modules'), path.join(target, 'node_modules'), 'junction');
    // Put this Core into the copy, exactly as the real rollout does.
    const vendor = path.join(target, 'vendor', 'exp-core');
    fs.mkdirSync(vendor, { recursive: true });
    for (const file of ['exp-core.js', 'manifest.json']) fs.copyFileSync(path.join(root, 'dist', file), path.join(vendor, file));
    fs.writeFileSync(path.join(vendor, 'PIN'), `v${core.version}\n`);
    console.log(`Building ${name} on Core ${core.version}...`);
    if (run(npm, ['run', 'build', '--silent'], { cwd: target }).status !== 0) fail(`${name} build failed.`);
  }

  const testFiles = fs.readdirSync(path.join(root, 'tests')).filter(file => file.endsWith('.test.cjs')).map(file => path.join('tests', file));
  const preload = path.join(__dirname, 'use-installed-browser.cjs').replace(/\\/g, '/');
  const result = run(process.execPath, ['--test', ...testFiles], {
    cwd: root,
    env: { ...process.env, EXP_SUITE_ROOT: workspace, EXP_PRODUCT_ROOTS: '', EXP_REQUIRE_CONSUMERS: '1', NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${preload}`.trim() },
  });
  process.exitCode = result.status ?? 1;
  if (process.exitCode === 0) {
    // The same browser gate CI runs: all four real products loaded together, with every menu checked.
    const coexistence = run(process.execPath, [path.join('scripts', 'check-suite-coexistence.cjs')], {
      cwd: root,
      env: { ...process.env, EXP_SUITE_ROOT: workspace, EXP_PRODUCT_ROOTS: '', EXP_REQUIRE_CONSUMERS: '1', NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${preload}`.trim() },
    });
    process.exitCode = coexistence.status ?? 1;
  }
} finally {
  // Remove the junctions first so the product node_modules folders are never touched.
  for (const name of products) {
    try { fs.unlinkSync(path.join(workspace, name, 'node_modules')); } catch { /* already gone */ }
    try { fs.rmdirSync(path.join(workspace, name, 'node_modules')); } catch { /* already gone */ }
  }
  const linked = products.filter(name => fs.existsSync(path.join(workspace, name, 'node_modules')));
  if (linked.length) console.warn(`Left ${workspace} in place because node_modules links could not be removed safely (${linked.join(', ')}).`);
  else fs.rmSync(workspace, { recursive: true, force: true });
}
