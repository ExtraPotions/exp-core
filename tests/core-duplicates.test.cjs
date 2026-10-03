'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {scanProduct}=require('../scripts/check-core-duplicates.cjs');

function product(files){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exp-dup-'));
  for(const [name,text] of Object.entries(files)){const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
  return dir;
}

test('flags product code that redoes Core jobs', ()=>{
  const dir=product({'src/ui.js':[
    "const a='https://raw.githubusercontent.com/ExtraPotions/X/main/x.user.js';",
    "const b='https://github.com/ExtraPotions/X/releases/latest/download/x.user.js';",
    "document.addEventListener('pointerdown', close, true);",
    "panel.innerHTML='<div class=\"support-wrap\"></div>';",
  ].join('\n')});
  assert.deepEqual(scanProduct(dir).map(f=>f.rule),['branch-install-link','hard-coded-release-link','page-pointer-listener','private-support-popover']);
});

test('ignores userscript headers, vendored Core, assembled userscripts and allowed lines', ()=>{
  const dir=product({
    'src/header.js':'// @updateURL    https://github.com/ExtraPotions/X/releases/latest/download/x.user.js',
    'src/x.user.js':"document.addEventListener('pointerdown', close, true);",
    'src/vendor/core.js':"document.addEventListener('pointerdown', close, true);",
    'src/ui.js':"// exp-core-allow: tracks viewer interaction, not menus\ndocument.addEventListener('pointerdown', note, true);",
  });
  assert.deepEqual(scanProduct(dir),[]);
});
