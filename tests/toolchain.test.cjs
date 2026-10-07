'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const consumers=require('../scripts/consumer-roots.cjs').resolveConsumerRoots();
function check(root){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
 assert.equal(manifest.engines.node,'>=24');assert.equal(manifest.devDependencies.playwright,'1.63.0');
 assert.equal(lock.packages[''].engines.node,'>=24');assert.equal(lock.packages['node_modules/playwright'].version,'1.63.0');
 const folder=path.join(root,'.github/workflows');
 for(const file of fs.readdirSync(folder).filter(name=>name.endsWith('.yml'))){
  const text=fs.readFileSync(path.join(folder,file),'utf8');
  assert.doesNotMatch(text,/node-version:\s*["']?22\b/,file);
  if(file==='consumer-rollout.yml')assert.match(text,/default: "24"/);
  if(/npm test|node --test/.test(text)&&!/uses:.*consumer-rollout/.test(text))assert.match(text,/playwright install --with-deps chromium/,file+' installs the matching browser');
 }
}
test('Core declares the common toolchain and installs the matching browser for CI',()=>check(path.join(__dirname,'..')));
for(const name of ['Dropper','SHIFT','WARD','PRISMA'])test(name+' uses the common toolchain',consumers.options([name],'package.json'),()=>check(consumers.root(name)));
