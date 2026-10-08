'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const { loadSuiteContract } = require('./suite-contract.cjs');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const normalize = text => text.replace(/\r\n/g, '\n');
const files = ['foundation.js','diagnostic-report.js','lifecycle.js','product-tools.js','menu-arrangement.js','health-summary.js','recovery-control.js','lean-menu.js','menu-typography.js','menu-preferences.js','runtime.js'];
const contractFile = 'suite-contract.json';
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const { contract: suiteContract, text: contractText } = loadSuiteContract(root);
const rawSource = files.map(file => normalize(fs.readFileSync(path.join(root,'src',file),'utf8')).trim()).join('\n\n') + '\n';
const marker = '__EXP_CORE_VERSION__';
const contractMarker = '__EXP_SUITE_CONTRACT__';
const productIdsMarker = '__EXP_SUITE_PRODUCT_IDS__';
const menuSectionsMarker = '__EXP_SUITE_MENU_SECTIONS__';
const rootIdsMarker = '__EXP_SUITE_ROOT_IDS__';
const markerCount = rawSource.split(marker).length - 1;
const contractMarkerCount = rawSource.split(contractMarker).length - 1;
const productIdsMarkerCount = rawSource.split(productIdsMarker).length - 1;
const menuSectionsMarkerCount = rawSource.split(menuSectionsMarker).length - 1;
const rootIdsMarkerCount = rawSource.split(rootIdsMarker).length - 1;
if (markerCount !== 1) throw new Error('Core runtime version marker must appear exactly once');
if (contractMarkerCount !== 1) throw new Error('Core suite contract marker must appear exactly once');
if (productIdsMarkerCount !== 1) throw new Error('Core suite product ID marker must appear exactly once');
if (menuSectionsMarkerCount !== 1) throw new Error('Core suite menu sections marker must appear exactly once');
if (rootIdsMarkerCount !== 1) throw new Error('Core suite root ID marker must appear exactly once');
const source = rawSource
  .replace(marker, version)
  .replace(contractMarker, JSON.stringify(suiteContract))
  .replace(productIdsMarker, JSON.stringify(Object.keys(suiteContract)))
  .replace(menuSectionsMarker, JSON.stringify(Object.fromEntries(
    Object.entries(suiteContract).map(([id, value]) => [id, value.menuSections || {}])
  )))
  .replace(rootIdsMarker, JSON.stringify(Object.fromEntries(
    Object.entries(suiteContract).map(([id, value]) => [id, value.rootId])
  )));
const provenance = { source:'ExtraPotions/exp-core', sourceVersion:version, architecture:'core-native' };
const fileHashes = Object.fromEntries(files.map(f=>[f,hash(normalize(fs.readFileSync(path.join(root,'src',f),'utf8')))]));
fileHashes[contractFile] = hash(contractText);
const manifest = { coreVersion:version, source:provenance, suiteContract, bundleSha256:hash(source), files:fileHashes };
const forbiddenUserscript = path.join(root,'exp-core.user.js');
if (fs.existsSync(forbiddenUserscript)) throw new Error('exp-core is build-time only; remove exp-core.user.js');
const targets = [
  [path.join(root,'dist','exp-core.js'),source],
  [path.join(root,'dist','manifest.json'),JSON.stringify(manifest,null,2)+'\n']
];
for (const [file,content] of targets) {
  if(process.argv.includes('--check')) {if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)throw new Error('Stale Core artifact: '+file);}
  else {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
}
console.log('Core '+version+' '+manifest.bundleSha256);
