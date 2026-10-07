'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function fixture(t,names){const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'exp-roots-'));t.after(()=>fs.rmSync(workspace,{recursive:true,force:true}));for(const name of names){fs.mkdirSync(path.join(workspace,name));fs.writeFileSync(path.join(workspace,name,'package.json'),'{}');}return workspace;}
function resolver(){return require('../scripts/consumer-roots.cjs');}
test('discovers lower and mixed case siblings without relying on case-insensitive filesystems',t=>{
 const workspace=fixture(t,['dropper','sHiFt','prisma','ward']),suite=resolver().resolveConsumerRoots({workspace,env:{}});
 assert.equal(suite.root('SHIFT'),path.join(workspace,'sHiFt'));assert.equal(suite.root('Dropper'),path.join(workspace,'dropper'));
});
test('alternate roots are explicit and relative mappings resolve against the suite workspace',t=>{
 const workspace=fixture(t,['elsewhere']),suite=resolver().resolveConsumerRoots({workspace,env:{EXP_PRODUCT_ROOTS:JSON.stringify({SHIFT:'elsewhere'})}});
 assert.equal(suite.root('SHIFT'),path.join(workspace,'elsewhere'));
 assert.throws(()=>resolver().resolveConsumerRoots({workspace,env:{EXP_PRODUCT_ROOTS:'bad'}}),/mapping/i);
});
test('strict consumer checks fail on missing artifacts, while standalone skips explain the missing products',t=>{
 const workspace=fixture(t,['dropper']),suite=resolver().resolveConsumerRoots({workspace,env:{}});
 assert.match(suite.options(['Dropper','SHIFT']).skip,/Standalone Core.*Dropper.*SHIFT/);
 const strict=resolver().resolveConsumerRoots({workspace,env:{EXP_REQUIRE_CONSUMERS:'1'}});
 assert.throws(()=>strict.options(['Dropper','SHIFT']),/Required consumer.*Dropper.*SHIFT/);
 fs.writeFileSync(path.join(workspace,'dropper','dropper.user.js'),'fixture');assert.equal(suite.options(['Dropper']).skip,false);
});
test('rejects ambiguous case variants rather than selecting the first match',t=>{
 const workspace=fixture(t,['shift']);
 // On a case-insensitive host, simulate the directory listing from Linux.
 const entries=[{name:'shift',isDirectory:()=>true},{name:'SHIFT',isDirectory:()=>true}];
 assert.throws(()=>resolver().resolveConsumerRoots({workspace,env:{},listDirectories:()=>entries}),/Ambiguous.*SHIFT/);
});

test('every consumer test fails in strict mode when the suite is absent',t=>{
 const workspace=fixture(t,[]),{spawnSync}=require('node:child_process');
 for(const name of ['owned-sheets','suite-health-live','suite-diagnostics','suite-menu-layout','system-health-consumers','typography-consumers','system-menu']){
  const env={...process.env,EXP_SUITE_ROOT:workspace,EXP_PRODUCT_ROOTS:'',EXP_REQUIRE_CONSUMERS:'1'};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['--test',path.join(__dirname,name+'.test.cjs')],{encoding:'utf8',env});
  assert.notEqual(result.status,0,name+' must not succeed by skipping');assert.match(result.stdout+result.stderr,/Required consumer artifacts missing/,name);
 }
});
