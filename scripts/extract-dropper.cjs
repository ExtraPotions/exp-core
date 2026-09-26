'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const acorn = require('acorn');

const root = path.resolve(__dirname, '..');
const normalize = (text) => text.replace(/\r\n/g, '\n');
const sourceVersion = '3.3.2';
const expected = 'ac03b06a443654989158dfe0ca3a521aaba1c6010e18bb6fee768eacde8be2d1';
const expectedCommit = '0292a05a3c0ac6b850d078a5b9d6fa658731b34d';
const releaseUrl = 'https://raw.githubusercontent.com/ExtraPotions/Dropper/v3.3.2/dropper.user.js';
const sourceArg = process.argv.find(value => value.startsWith('--source='));
const requestedSource = sourceArg?.slice(9) || '';
const siblingSource = path.join(root, '..', 'Dropper', 'dropper.user.js');

async function loadSourceBytes() {
  const file = requestedSource || (fs.existsSync(siblingSource) ? siblingSource : '');
  if (file) return fs.readFileSync(file);
  const response = await fetch(releaseUrl, {
    headers: { 'User-Agent': 'exp-core-reference-extractor' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Could not fetch approved Dropper ' + sourceVersion + ' artifact: HTTP ' + response.status);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const bytes = await loadSourceBytes();
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== expected) throw new Error('Extraction requires the approved Dropper ' + sourceVersion + ' install artifact; hash mismatch: ' + digest);

  const source = bytes.toString('utf8');
  const tree = acorn.parse(source, { ecmaVersion: 'latest' });
  const nodes = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type) nodes.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  }
  walk(tree);

  const functions = ['css', 'protectLauncherHost', 'compareVersions'];
  const constants = ['PRIDE_RAINBOW', 'PRIDE_RAINBOW_VERTICAL', 'CRIMSON_THEME', 'UI_THEMES'];
  const pieces = [];
  const entries = [];

  for (const name of constants) {
    const node = nodes.find(n => n.type === 'VariableDeclarator' && n.id.name === name);
    if (!node) throw new Error('Missing reference constant: ' + name);
    pieces.push('const ' + source.slice(node.start, node.end) + ';');
    entries.push({
      name,
      kind: 'constant',
      startLine: source.slice(0, node.start).split('\n').length,
      endLine: source.slice(0, node.end).split('\n').length,
    });
  }

  for (const name of functions) {
    const node = nodes.find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
    if (!node) throw new Error('Missing reference function: ' + name);
    let body = source.slice(node.start, node.end);
    if (name === 'protectLauncherHost') {
      body = body.replace(/^\s*ExtraPotionsDiagnostics\.registerProduct\('dropper', APP_VERSION, host\);\r?\n/m, '');
    }
    pieces.push(body);
    entries.push({
      name,
      kind: 'function',
      startLine: source.slice(0, node.start).split('\n').length,
      endLine: source.slice(0, node.end).split('\n').length,
    });
  }

  const output = '// Generated from the approved Dropper v' + sourceVersion + ' install artifact. Do not edit.\n' +
    'const DropperReference = (() => {\n' +
    'const LAUNCHER_ORDER_KEY = "exp:v3:launcher-order";\n' +
    'const LAUNCHER_GRID_DELTA_KEY = "exp:v3:launcher-grid-delta";\n' +
    pieces.join('\n\n') +
    '\nreturn Object.freeze({ ' + [...constants, ...functions].join(', ') + ' });\n})();\n';

  const metadata = {
    source: 'ExtraPotions/Dropper',
    sourceVersion,
    behaviorSourceVersion: sourceVersion,
    behaviorParity: [
      'launcher-and-menu-badge-sizing',
      'launcher-host-protection',
      'menu-width-notices',
      'badge-only-menu-content-width',
      'version-scoped-update-checks',
      'diagnostic-resource-attribution',
      'diagnostic-ui-geometry',
      'support-control-chrome',
    ],
    commit: expectedCommit,
    path: 'dropper.user.js',
    sha256: digest,
    entries,
  };

  const targets = [
    [path.join(root, 'src', 'dropper-reference.js'), output],
    [path.join(root, 'source-provenance.json'), JSON.stringify(metadata, null, 2) + '\n'],
  ];

  for (const [target, targetContent] of targets) {
    if (process.argv.includes('--check')) {
      if (!fs.existsSync(target) || normalize(fs.readFileSync(target, 'utf8')) !== targetContent) {
        throw new Error('Reference extraction is stale: ' + target);
      }
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, targetContent);
    }
  }
  console.log('Dropper ' + sourceVersion + ' reference verified: ' + digest);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
