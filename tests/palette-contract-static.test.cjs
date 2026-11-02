const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=['runtime.js','runtime-menus.js'].map(f=>fs.readFileSync(path.join(__dirname,'../src',f),'utf8')).join('\n'),foundation=fs.readFileSync(path.join(__dirname,'../src/foundation.js'),'utf8');
test('menu palettes share the Slate Blue resolver',()=>{assert.match(runtime,/CoreFoundation\.resolveTheme\(requestedTheme\)/);assert.doesNotMatch(runtime,/const alias =/);assert.match(runtime,/paintTheme\(localTheme\)/);});
test('shared menu shell keeps a visible themed outer border',()=>assert.match(foundation,/\[data-exp-part="dock"\] \{[^}]*border:1px solid var\(--theme-line\)/));
