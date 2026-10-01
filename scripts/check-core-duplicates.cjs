'use strict';
// Finds product code that redoes a job Core owns. Byte-for-byte pin checks only
// prove a product carries the released Core; they cannot see a product that
// reimplements Core behavior next to it. Usage:
//   node scripts/check-core-duplicates.cjs [--enforce] [ProductDir ...]
// With no directories it scans every suite product beside exp-core. Report-only
// unless --enforce is given. A line that must stay can carry an
// `exp-core-allow: <reason>` comment on it or on the line above.
const fs = require('node:fs');
const path = require('node:path');
const { loadSuiteContract } = require('./suite-contract.cjs');

const RULES = [
  {
    id: 'branch-install-link',
    test: line => /raw\.githubusercontent\.com\/[^'"\s]+\/main\/[^'"\s]+\.user\.js/.test(line),
    fix: 'Installs must come from published releases: use the update checker\'s INSTALL_URL.',
  },
  {
    id: 'hard-coded-release-link',
    test: line => /releases\/latest\/download\/[^'"\s]+\.user\.js/.test(line) && !/^\s*\/\/\s*@(updateURL|downloadURL)\b/.test(line),
    fix: 'Use the update checker\'s INSTALL_URL instead of a copy of the address.',
  },
  {
    id: 'page-pointer-listener',
    test: line => /\b(document|window)\.addEventListener\(\s*['"]pointerdown['"]/.test(line),
    fix: 'Core closes product menus on outside presses; use its keepOpen hook for exceptions.',
  },
  {
    id: 'private-menu-controller',
    test: line => /data-exp-open-menu|['"]exp-core:menu-open['"]/.test(line),
    fix: 'Open and close the menu through the create() controller from Core, which signals other products.',
  },
  {
    id: 'private-support-popover',
    test: line => /support-popover|createElement\(['"]div['"]\)[^;]*support-wrap|class=["'][^"']*support-wrap/.test(line),
    fix: 'Core adds the support control to every product menu.',
  },
];

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!['vendor', 'node_modules', 'dist'].includes(entry.name)) out.push(...sourceFiles(full)); continue; }
    // Assembled userscripts repeat their parts; only the parts are product source.
    if (entry.name.endsWith('.js') && !entry.name.endsWith('.user.js')) out.push(full);
  }
  return out;
}

function scanProduct(productDir) {
  const src = path.join(productDir, 'src');
  if (!fs.existsSync(src)) return [];
  const findings = [];
  for (const file of sourceFiles(src)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/exp-core-allow:/.test(line) || /exp-core-allow:/.test(lines[index - 1] || '')) return;
      for (const rule of RULES) {
        if (rule.test(line)) findings.push({ rule: rule.id, file: path.relative(path.dirname(productDir), file).replace(/\\/g, '/'), line: index + 1, fix: rule.fix });
      }
    });
  }
  return findings;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const enforce = args.includes('--enforce');
  const coreRoot = path.resolve(__dirname, '..');
  const workspace = path.resolve(coreRoot, '..');
  const dirs = args.filter(arg => !arg.startsWith('--'));
  const products = dirs.length
    ? dirs.map(dir => path.resolve(dir))
    : loadSuiteContract(coreRoot).repositories.map(repo => path.join(workspace, repo)).filter(dir => fs.existsSync(dir));
  let total = 0;
  for (const dir of products) {
    const findings = scanProduct(dir);
    total += findings.length;
    console.log(`${path.basename(dir)}: ${findings.length ? findings.length + ' private cop' + (findings.length === 1 ? 'y' : 'ies') + ' of Core behavior' : 'no private copies of Core behavior'}`);
    for (const item of findings) console.log(`  ${item.file}:${item.line} [${item.rule}] ${item.fix}`);
  }
  if (total && enforce) process.exitCode = 1;
}

module.exports = { RULES, scanProduct };
