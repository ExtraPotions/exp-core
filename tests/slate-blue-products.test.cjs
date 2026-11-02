'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const workspace=path.resolve(__dirname,'../..');
const products=[['Dropper','dropper','#tdh-root','https://www.twitch.tv/directory'],['PRISMA','prisma','#exp-prisma-root','https://example.test/'],['WARD','ward','#exp-ward-root','https://www.amazon.com/'],['Thread','thread','#exp-thread-root','https://www.reddit.com/r/example/']];
for(const [repo,id,selector,url]of products)test(repo+' exposes only Slate Blue modes, migrates old palettes and follows System',async t=>{
 const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:834,height:1000},colorScheme:'light'});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const fixture=id==='thread'?require(path.join(workspace,'Thread/tests/fixture.cjs')):'<!doctype html><style>body{background:white;color:black}main{background:white}</style><main>Sample product page</main>';
 await page.route('**/*',route=>{const name=path.basename(new URL(route.request().url()).pathname),asset=path.join(workspace,repo,'assets',name);if(name.endsWith('.svg')&&fs.existsSync(asset))return route.fulfill({path:asset,contentType:'image/svg+xml'});return route.request().isNavigationRequest()?route.fulfill({body:fixture,contentType:'text/html'}):route.abort();});
 await page.goto(url);await page.evaluate(id=>{
  const old={uiTheme:'pride',siteColors:'obsidian',gemTheme:true,theme:'contrast',customOpacity:true,opacityPercent:40};
  const values=new Map([['exp:v3:'+id+':settings',old],['exp:v1:thread:reader:settings',old]]);
  window.GM_getValue=(key,fallback)=>values.has(key)?values.get(key):fallback;window.GM_setValue=(key,value)=>values.set(key,value);window.GM_listValues=()=>[...values.keys()];window.GM_deleteValue=key=>values.delete(key);window.GM_xmlhttpRequest=options=>{queueMicrotask(()=>options.onerror?.());return{abort(){}};};
 },id);
 await page.addScriptTag({content:fs.readFileSync(path.join(workspace,repo,id+'.user.js'),'utf8')});const host=page.locator(selector);await host.locator('[data-exp-part=launcher]').click();await host.getByRole('tab',{name:'Look',exact:true}).click();
 const menu=host.getByRole('combobox',{name:'Menu theme',exact:true});assert.deepEqual(await menu.locator('option').allTextContents(),['Light','Dark','System']);assert.equal(await menu.inputValue(),'system');
 const site=host.getByRole('combobox',{name:'Site theme',exact:true});if(id!=='prisma'){assert.deepEqual(await site.locator('option').allTextContents(),['Light','Dark','System']);assert.equal(await site.inputValue(),'system');}
 assert.equal(await host.locator('input[type=color],.exp-theme-swatch,#tdh-opacity-range').count(),0);assert.equal(await host.getByRole('switch',{name:'Custom Opacity',exact:true}).count(),0);
 const dock=host.locator('[data-exp-part=dock]'),background=()=>dock.evaluate(n=>getComputedStyle(n).getPropertyValue('--theme-bg').trim());
 for(const mode of ['dark','light','system']){
  await menu.selectOption(mode);if(id!=='prisma')await site.selectOption(mode);
  const expected=mode==='dark'?'#111720':'#f4f6fa';assert.equal(await background(),expected);
  await page.emulateMedia({colorScheme:'dark'});if(mode==='system')await page.waitForFunction(selector=>getComputedStyle(document.querySelector(selector).shadowRoot.querySelector('[data-exp-part=dock]')).getPropertyValue('--theme-bg').trim()==='#111720',selector);else assert.equal(await background(),expected);
  await page.emulateMedia({colorScheme:'light'});if(mode==='system')await page.waitForFunction(selector=>getComputedStyle(document.querySelector(selector).shadowRoot.querySelector('[data-exp-part=dock]')).getPropertyValue('--theme-bg').trim()==='#f4f6fa',selector);
  for(const width of [320,834]){await page.setViewportSize({width,height:1000});await dock.scrollIntoViewIfNeeded();assert.equal(await dock.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);if(process.env.EXP_CAPTURE_SLATE==='1'){const dir=path.join(workspace,'local-verification/slate-blue-20261102');fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:path.join(dir,id+'-'+mode+'-'+width+'.png')});}}
 }
 await menu.focus();assert.equal(await menu.evaluate(n=>n===n.getRootNode().activeElement),true);assert.deepEqual(errors,[]);
});
