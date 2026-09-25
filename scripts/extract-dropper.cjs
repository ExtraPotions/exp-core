'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const acorn = require('acorn');
const root = path.resolve(__dirname, '..');
const normalize = (text) => text.replace(/\r\n/g, '\n');
const expected = 'c3455a231b03ce9db018394ac98805e5dd29b472c2ab7d249af5ecccdb48af44';
const expectedCommit = '3b6e1d12c4d0ce12303f6d76c3fe7607f18ee986';
const sourcePath = process.argv.find(value => value.startsWith('--source='))?.slice(9) || path.join(root, '..', 'Dropper', 'dropper.user.js');
const bytes = fs.readFileSync(sourcePath);
const digest = crypto.createHash('sha256').update(bytes).digest('hex');
if (digest !== expected) throw new Error('Extraction requires the approved Dropper 3.2.19 install artifact; hash mismatch: ' + digest);
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
// Export only self-contained helpers actually used by Core. The original badge grid
// closes over Dropper's layoutChrome; other unused helpers retain product state.
const functions = ['css', 'protectLauncherHost', 'compareVersions'];
const constants = ['PRIDE_RAINBOW', 'PRIDE_RAINBOW_VERTICAL', 'CRIMSON_THEME', 'UI_THEMES'];
const pieces = [];
const entries = [];
for (const name of constants) {
  const node = nodes.find(n => n.type === 'VariableDeclarator' && n.id.name === name);
  if (!node) throw new Error('Missing reference constant: ' + name);
  pieces.push('const ' + source.slice(node.start, node.end) + ';');
  entries.push({ name, kind: 'constant', startLine: source.slice(0, node.start).split('\n').length, endLine: source.slice(0, node.end).split('\n').length });
}
for (const name of functions) {
  const node = nodes.find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  if (!node) throw new Error('Missing reference function: ' + name);
  let body = source.slice(node.start, node.end);
  if (name === 'protectLauncherHost') {
    body = body.replace(/^\s*ExtraPotionsDiagnostics\.registerProduct\('dropper', APP_VERSION, host\);\r?\n/m, '');
  }
  pieces.push(body);
  entries.push({ name, kind: 'function', startLine: source.slice(0, node.start).split('\n').length, endLine: source.slice(0, node.end).split('\n').length });
}
const output = '// Generated from the approved Dropper v3.2.20 install artifact. Do not edit.\n' +
  'const DropperReference = (() => {\n' +
  'const LAUNCHER_ORDER_KEY = "exp:v3:launcher-order";\n' +
  'const LAUNCHER_GRID_DELTA_KEY = "exp:v3:launcher-grid-delta";\n' +
  pieces.join('\n\n') +
  '\nreturn Object.freeze({ ' + [...constants, ...functions].join(', ') + ' });\n})();\n';
const metadata = { source: 'ExtraPotions/Dropper', sourceVersion: '3.2.20', commit: expectedCommit, path: 'dropper.user.js', sha256: digest, entries };
const targets = [[path.join(root, 'src', 'dropper-reference.js'), output], [path.join(root, 'source-provenance.json'), JSON.stringify(metadata, null, 2) + '\n']];
for (const [target, content] of targets) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || normalize(fs.readFileSync(target, 'utf8')) !== content) throw new Error('Reference extraction is stale: ' + target);
  } else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); }
}
console.log('Dropper 3.2.20 reference verified: ' + digest);
