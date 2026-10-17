'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../scripts/use-installed-browser.cjs'),'utf8');

function preload(executablePath,platform='win32') {
  const chromium={launch:options=>options};
  const fakeRequire=name=>name==='./installed-browser.cjs'?{findInstalledBrowser:()=>executablePath}:name==='fixture-playwright'?{chromium}:require(name);
  fakeRequire.resolve=()=> 'fixture-playwright';
  vm.runInNewContext(source,{require:fakeRequire,__dirname:path.join(__dirname,'../scripts'),console,process:{platform,cwd:()=>__dirname}});
  return chromium;
}

test('Windows browser preload refuses full Chrome before launching it',()=>{
  assert.throws(()=>preload('C:/fixture/chrome.exe'),/headless shell/);
});

test('headless shell preserves the requested launch settings',()=>{
  const executablePath='C:/fixture/chrome-headless-shell.exe';
  const result=preload(executablePath).launch({headless:true,args:['--fixture']});
  assert.equal(result.executablePath,executablePath);
  assert.equal(result.headless,true);
  assert.deepEqual(result.args,['--fixture']);
});

test('non-Windows browser selection is unchanged',()=>{
  assert.equal(preload('/usr/bin/chromium','linux').launch().executablePath,'/usr/bin/chromium');
});
