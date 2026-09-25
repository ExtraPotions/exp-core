'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const normalize = text => text.replace(/\r\n/g, '\n');
const files = ['dropper-reference.js','diagnostic-report.js','lifecycle.js','runtime.js'];
const provenance = JSON.parse(fs.readFileSync(path.join(root,'source-provenance.json'),'utf8'));
const source = files.map(file => normalize(fs.readFileSync(path.join(root,'src',file),'utf8')).trim()).join('\n\n') + '\n';
const manifest = { coreVersion:'3.2.17', source:provenance, bundleSha256:hash(source), files:Object.fromEntries(files.map(f=>[f,hash(normalize(fs.readFileSync(path.join(root,'src',f),'utf8')))])) };
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
console.log('Core 3.2.17 '+manifest.bundleSha256);
