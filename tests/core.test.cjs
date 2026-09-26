'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const source = `(() => {\n${bundle}\nglobalThis.ExtraPotionsCore = ExtraPotionsCore;\n})();\n`;
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

test('diagnostics uses paired Copy and Show buttons without an export or disclosure', async (t) => {
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({content:source});
  await page.evaluate(()=>document.body.append(ExtraPotionsCore.createDiagnosticsControls(()=>({report:'Test Diagnostics',complete:true}))));
  assert.equal(await page.locator('details,summary').count(),0);assert.equal(await page.getByRole('button',{name:'Export Diagnostics'}).count(),0);
  const positions=await page.locator('button').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().y));assert.equal(positions[0],positions[1]);
  await page.getByRole('button',{name:'Show Diagnostics',exact:true}).click();assert.equal(JSON.parse(await page.locator('pre').innerText()).complete,true);
  await page.getByRole('button',{name:'Hide Diagnostics',exact:true}).click();assert.equal(await page.locator('pre').isVisible(),false);
});

test('core is a private build-time bundle, not an installable userscript', () => {
  assert.equal(pkg.private, true);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'exp-core.user.js')), false);
  assert.doesNotMatch(bundle, /==UserScript==|@match|@downloadURL|@updateURL/);
});

test('Core identifies the Dropper 3.3.2 baseline and canonical menu widths', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const state = await page.evaluate(() => ({
    version: ExtraPotionsCore.version,
    sourceVersion: ExtraPotionsCore.sourceVersion,
    widths: {
      full: ExtraPotionsCore.menuWidthForMode('full'),
      compact: ExtraPotionsCore.menuWidthForMode('compact'),
      narrow: ExtraPotionsCore.menuWidthForMode('narrow'),
      fullWide: ExtraPotionsCore.menuWidthForMode('full', 500),
      fullSmall: ExtraPotionsCore.menuWidthForMode('full', 250),
    },
  }));
  assert.deepEqual(state, {
    version: '3.3.2',
    sourceVersion: '3.3.2',
    widths: { full: 312, compact: 260, narrow: 220, fullWide: 340, fullSmall: 280 },
  });
});

test('Core products rerender the active section without owning product state', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const theme={id:'shift',name:'Shift',swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'};
    let value='one';
    const product=ExtraPotionsCore.createProduct({id:'shift',name:'SHIFT',version:'3.4.0-dev.1',artwork,theme,getSettings:()=>({menuWidth:'compact'}),sections:[{id:'appearance',label:'Appearance',render(){const node=document.createElement('span');node.textContent=value;return node;}}]});
    product.open();
    product.shadow.querySelector('button[data-section="appearance"]').click();
    const before=product.panel.querySelector('.route-body').textContent;
    value='two';
    const rerendered=product.renderActive();
    const after=product.panel.querySelector('.route-body').textContent;
    product.destroy();
    return {before,after,rerendered};
  });
  assert.deepEqual(result,{before:'one',after:'two',rerendered:true});
});

test('Dropper product chrome factories provide support actions and menu notices', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const theme={id:'shift',name:'Shift',swatch:'#8b5cf6',bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent:'#8b5cf6',accent2:'#a78bfa',skin:'#8b5cf6',skinVertical:'#8b5cf6'};
    const product=ExtraPotionsCore.createProduct({id:'shift',name:'SHIFT',version:'3.4.0-dev.1',subtitle:'Adaptive themes and readability',artwork,theme,sections:[],getSettings:()=>({menuWidth:'compact'}),priority:100,supportUrl:'https://ko-fi.com/expdare'});
    const notice=ExtraPotionsCore.createProductNotice({host:product.host,shadow:product.shadow,panel:product.panel,versionButton:product.versionButton,releaseUrl:'https://github.com/ExtraPotions/SHIFT/releases',installUrl:'https://raw.githubusercontent.com/ExtraPotions/SHIFT/main/shift.user.js'});
    notice.show({kicker:'Current Version',title:'SHIFT Changelog',version:'3.4.0-dev.1',details:['One','Two'],showAction:false});
    const support=product.shadow.querySelector('.support-wrap');
    const card=notice.element;
    const value={
      support:Boolean(support),
      supportButton:support?.querySelector('button')?.getAttribute('aria-label'),
      supportHref:support?.querySelector('a')?.getAttribute('href'),
      noticeVisible:!card.hidden,
      noticePlacement:card.dataset.placement,
      title:card.querySelector('.update-title')?.textContent,
      version:card.querySelector('.update-version')?.textContent,
      releaseHref:card.querySelector('.update-release')?.getAttribute('href'),
      actionHidden:card.querySelector('.update-action')?.hidden,
    };
    notice.destroy();product.destroy();
    return value;
  });
  assert.deepEqual(result,{
    support:true,
    supportButton:'Support SHIFT',
    supportHref:'https://ko-fi.com/expdare',
    noticeVisible:true,
    noticePlacement:'menu',
    title:'SHIFT Changelog',
    version:'v3.4.0-dev.1',
    releaseHref:'https://github.com/ExtraPotions/SHIFT/releases',
    actionHidden:true,
  });
});

test('build-time core advertises the product coordination protocols', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  assert.deepEqual(await page.evaluate(() => ({ protocol: ExtraPotionsCore.protocol, gridProtocol: ExtraPotionsCore.gridProtocol })), {
    protocol: 'exp-core-coordination-v1',
    gridProtocol: 'exp-launcher-grid-v3',
  });
});

test('diagnostic reports identify their product', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const report = await page.evaluate(() => ExtraPotionsCore.createDiagnosticsReport('PRISMA', { version: '3.0.1' }));
  assert.equal(report.report, 'PRISMA Diagnostics');
  assert.equal(report.version, '3.0.1');
  assert.equal(report.schemaVersion, 3);
  assert.ok(report.page.structure.elements >= 3);
  assert.equal(report.page.privacy.pageText, 'excluded');
  assert.ok(report.page.performance.resources);
  assert.equal(report.environment.topLevelContext, true);
  assert.ok(Date.parse(report.generatedAt));
  assert.deepEqual(report.ui.swatches, []);
});

test('menu surfaces receive focus without activating the first helper row', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><aside id="menu"><button class="has-tooltip">First category</button></aside></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const menu = document.querySelector('#menu');
    const focused = ExtraPotionsCore.focusMenuSurface(menu);
    return { focused, surfaceActive: document.activeElement === menu, rowActive: document.activeElement === menu.querySelector('button'), tabIndex: menu.tabIndex, outline: menu.style.outline };
  });
  assert.deepEqual(result, { focused: true, surfaceActive: true, rowActive: false, tabIndex: -1, outline: 'none' });
});

test('site diagnostics retain structure and timings without page text, field values, or URL secrets', async (t) => {
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();
  await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><body><h1>PRIVATE_PAGE_TEXT</h1><form><input value="PRIVATE_FORM_VALUE"></form></body></html>'}));
  await page.goto('https://fixture.test/PRIVATE_PATH?token=PRIVATE_QUERY');await page.addScriptTag({content:source});
  const report=await page.evaluate(()=>ExtraPotionsCore.createDiagnosticsReport('Example',{product:{version:'3.0.1'},engine:{active:true}}));
  assert.equal(report.page.origin,'https://fixture.test');assert.equal(report.page.structure.forms,1);assert.equal(report.page.structure.inputs,1);assert.equal(report.engine.active,true);assert.ok(report.page.performance.navigation);
  for(const secret of ['PRIVATE_PAGE_TEXT','PRIVATE_FORM_VALUE','PRIVATE_PATH','PRIVATE_QUERY'])assert.equal(JSON.stringify(report).includes(secret),false);
});

test('legacy settings grids resolve to the shared single-column menu contract', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
    const grid = document.createElement('section');
    const wide = document.createElement('div');
    const compact = document.createElement('div');
    compact.dataset.expGridCell = 'compact';
    grid.append(wide, compact);
    shadow.append(grid);
    const applied = ExtraPotionsCore.applyTwoColumnSettingsGrid(grid);
    return {
      applied,
      marker: grid.dataset.expSettingsGrid,
      hasStyle: Boolean(shadow.querySelector('style[data-exp-settings-grid]')),
      wideColumn: getComputedStyle(wide).gridColumn,
      compactColumn: getComputedStyle(compact).gridColumn,
    };
  });
  assert.deepEqual(result, {
    applied: true,
    marker: 'two-column',
    hasStyle: true,
    wideColumn: '1 / -1',
    compactColumn: '1 / -1',
  });
});

test('menus can opt into content-driven heights and width-aware columns', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const host = document.querySelector('#host');
    host.dataset.menuWidth = 'narrow';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>.group{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}</style><section class="panel"><div class="group"><div class="row"><span class="label">A setting label that must wrap naturally</span></div></div></section>';
    const applied = ExtraPotionsCore.applyContentDrivenMenuLayout(shadow);
    const panel = shadow.querySelector('.panel');
    const group = shadow.querySelector('.group');
    const row = shadow.querySelector('.row');
    const label = shadow.querySelector('.label');
    return {
      applied,
      marker: host.dataset.expContentDrivenMenu,
      panelHeight: getComputedStyle(panel).height,
      columns: getComputedStyle(group).gridTemplateColumns,
      rowMinHeight: getComputedStyle(row).minHeight,
      labelWrap: getComputedStyle(label).whiteSpace,
    };
  });
  assert.equal(result.applied, true);
  assert.equal(result.marker, '1');
  assert.notEqual(result.panelHeight, '0px');
  assert.equal(result.rowMinHeight, '0px');
  assert.equal(result.labelWrap, 'normal');
  assert.doesNotMatch(result.columns, /\s/);
});

test('theme swatches are rounded-square radio buttons with one active choice', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
    const row = document.createElement('div'); shadow.append(row);
    let selected = '';
    ExtraPotionsCore.createThemeSwatches({ container: row, value: 'dark', themes: [{ id: 'dark', name: 'Dark', swatch: '#111' }, { id: 'product', name: 'Product', swatch: 'linear-gradient(135deg,#a0f,#0ff)' }], onChange(value) { selected = value; } });
    const buttons = [...row.querySelectorAll('button')]; buttons[1].click();
    return { role: row.getAttribute('role'), count: buttons.length, selected, active: buttons[1].classList.contains('is-on'), pressed: buttons[1].getAttribute('aria-pressed'), radius: getComputedStyle(buttons[1]).borderRadius };
  });
  assert.deepEqual(result, { role: 'radiogroup', count: 2, selected: 'product', active: true, pressed: 'true', radius: '5px' });
});

test('detached swatches stay square under taller host button styles', async (t) => {
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const page=await browser.newPage();await page.setContent('<div id="host"></div>');await page.addScriptTag({content:source});
  const geometry=await page.evaluate(()=>{
    const root=document.querySelector('#host').attachShadow({mode:'open'}),style=document.createElement('style');style.textContent='button:not(.switch){min-height:40px!important;border-radius:12px!important}';root.append(style);
    const container=document.createElement('div');ExtraPotionsCore.createThemeSwatches({container,themes:[{id:'test',name:'Test',swatch:'#abc'}]});root.append(container);
    const b=container.firstElementChild,r=b.getBoundingClientRect();return{width:r.width,height:r.height,radius:getComputedStyle(b).borderRadius};
  });assert.deepEqual(geometry,{width:22,height:22,radius:'5px'});
});

test('shared diagnostics download includes product state and closed-shadow geometry',async(t)=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage({acceptDownloads:true});
  await page.setContent('<div id="host"></div>');await page.addScriptTag({content:source});
  await page.evaluate(()=>{
    const host=document.querySelector('#host'),shadow=host.attachShadow({mode:'closed'}),panel=document.createElement('div');panel.className='panel';shadow.append(panel);
    const report=ExtraPotionsCore.createDiagnosticsReport('Example',{host,shadow,settings:{enabled:true},engine:{processed:12}});
    window.report=report;window.exportReport=()=>ExtraPotionsCore.downloadDiagnostics(report);
  });
  const promise=page.waitForEvent('download');await page.evaluate(()=>window.exportReport());const download=await promise;
  assert.match(download.suggestedFilename(),/^example-diagnostics-.*\.json$/);
  const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(report.report,'Example Diagnostics');assert.equal(report.settings.enabled,true);assert.equal(report.engine.processed,12);assert.equal(report.ui.surfaces.length,1);assert.equal(report.ui.mounted,true);assert.equal('shadow' in report,false);
});

test('launcher grid fills three-column rows from the bottom and respects priorities', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="ward" data-exp-product-launcher="1" data-product-id="ward" data-launcher-priority="60"></div><div id="shift" data-exp-product-launcher="1" data-product-id="shift" data-launcher-priority="100"></div></body></html>');
  await page.addScriptTag({ content: source });
  await page.waitForFunction(() => document.querySelector('#ward').dataset.launcherSlot === '1');
  const result = await page.evaluate(() => ({
    shift: document.querySelector('#shift').dataset.launcherSlot,
    ward: document.querySelector('#ward').dataset.launcherSlot,
    shiftX: document.querySelector('#shift').style.getPropertyValue('--exp-launcher-x'),
    wardX: document.querySelector('#ward').style.getPropertyValue('--exp-launcher-x'),
    shiftY: document.querySelector('#shift').style.getPropertyValue('--exp-launcher-y'),
    wardY: document.querySelector('#ward').style.getPropertyValue('--exp-launcher-y'),
  }));
  assert.deepEqual(result, { shift: '0', ward: '1', shiftX: '0px', wardX: '56px', shiftY: '0px', wardY: '0px' });
});

test('Dropper progress visibility preserves the compact launcher grid', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="dropper" data-exp-product-launcher="1" data-product-id="dropper" data-launcher-priority="90" data-launcher-reserved-rows="4"></div><div id="shift" data-exp-product-launcher="1" data-product-id="shift" data-launcher-priority="100"></div><div id="ward" data-exp-product-launcher="1" data-product-id="ward" data-launcher-priority="60"></div><div id="prisma" data-exp-product-launcher="1" data-product-id="prisma" data-launcher-priority="40"></div></body></html>');
  await page.addScriptTag({ content: source });
  await page.waitForFunction(() => document.querySelector('#prisma').dataset.launcherSlot);
  const result = await page.evaluate(() => Object.fromEntries(['dropper','shift','ward','prisma'].map((id) => {
    const node = document.querySelector(`#${id}`);
    return [id, { slot: node.dataset.launcherSlot, row: node.dataset.launcherRow, column: node.dataset.launcherColumn, span: node.dataset.launcherSpan }];
  })));
  assert.deepEqual(result, {
    dropper: { slot: '0', row: '0', column: '0', span: '1' },
    shift: { slot: '1', row: '0', column: '1', span: '1' },
    ward: { slot: '2', row: '0', column: '2', span: '1' },
    prisma: { slot: '3', row: '1', column: '0', span: '1' },
  });
  await page.evaluate(() => { document.querySelector('#dropper').dataset.launcherReservedRows = '1'; });
  await page.waitForFunction(() => document.querySelector('#prisma').dataset.launcherSlot === '3');
  const restored = await page.evaluate(() => Object.fromEntries(['shift','ward','prisma'].map((id) => {
    const node = document.querySelector(`#${id}`);
    return [id, { slot: node.dataset.launcherSlot, row: node.dataset.launcherRow, column: node.dataset.launcherColumn }];
  })));
  assert.deepEqual(restored, {
    shift: { slot: '1', row: '0', column: '1' },
    ward: { slot: '2', row: '0', column: '2' },
    prisma: { slot: '3', row: '1', column: '0' },
  });
});

test('floating changelogs live outside the menu and follow the launcher grid', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(async () => {
    const host=document.createElement('div');const shadow=host.attachShadow({mode:'open'});const panel=document.createElement('aside');const version=document.createElement('button');const launcher=document.createElement('button');const notice=document.createElement('div');
    launcher.className='launcher';launcher.style.cssText='position:fixed;right:12px;bottom:12px;width:48px;height:48px';panel.style.cssText='position:fixed;right:12px;top:300px;width:260px;height:180px;--accent:#22cc88;--surface:#123a2a;--bg:#071b13;--text:#edfff7';notice.hidden=true;notice.textContent='Version 3.0.1 changes';notice.style.cssText='position:fixed;width:260px;height:80px';shadow.append(panel,version,launcher,notice);document.body.append(host);ExtraPotionsCore.registerLauncher(host,{productId:'ward'});
    const floating=ExtraPotionsCore.createFloatingNotice({shadow,panel,notice,versionButton:version});floating.setMenuOpen(true);version.click();await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const launcherRect=launcher.getBoundingClientRect(),noticeRect=notice.getBoundingClientRect();
    return {outside:notice.parentNode===shadow,visible:!notice.hidden,expanded:version.getAttribute('aria-expanded'),aligned:noticeRect.right===launcherRect.right,above:noticeRect.bottom<launcherRect.top,hasDismiss:Boolean(notice.querySelector('.exp-floating-update-dismiss')),border:notice.style.getPropertyValue('--exp-notice-border'),top:notice.style.getPropertyValue('--exp-notice-top'),text:notice.style.getPropertyValue('--exp-notice-text')};
  });
  assert.deepEqual(result,{outside:true,visible:true,expanded:'true',aligned:true,above:true,hasDismiss:true,border:'#22cc88',top:'#123a2a',text:'#edfff7'});
});

test('matte toggle chrome is exported and uses theme-surface color-mix without Pride fills', () => {
  assert.match(source, /applyMatteToggleChrome/);
  assert.match(source, /color-mix\(in srgb/);
  assert.match(source, /:not\(:has\(> span\)\)::after/);
  assert.match(source, /forced-colors:\s*active/);
  assert.match(source, /data-ui-theme="contrast"/);
  assert.match(source, /data-ui-theme="obsidian"/);
  assert.match(source, /background-image:none!important/);
  assert.doesNotMatch(source, /:host\(\[data-ui-theme="pride"\]\)[^{]*\[aria-checked="true"\]\{[^}]*linear-gradient/);
});

test('matte toggles are 34 by 20 with a rounded-square ::after knob', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const host = document.querySelector('#host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>:host{--bg:#111114;--panel:#18181d;--line:#41434d;--muted:#9aa0a6;--text:#f4f4f6;--accent:#8b5cf6}.switch{width:48px;height:28px;border-radius:999px}</style><button class="switch" role="switch" aria-checked="false"></button>';
    ExtraPotionsCore.applyMatteToggleChrome(shadow);
    const track = shadow.querySelector('.switch');
    const knob = getComputedStyle(track, '::after');
    return {
      applied: Boolean(shadow.querySelector('style[data-exp-matte-toggle-chrome]')),
      width: getComputedStyle(track).width,
      height: getComputedStyle(track).height,
      radius: getComputedStyle(track).borderRadius,
      backgroundImage: getComputedStyle(track).backgroundImage,
      knobWidth: knob.width,
      knobHeight: knob.height,
      knobRadius: knob.borderRadius,
      knobContent: knob.content,
    };
  });
  assert.equal(result.applied, true);
  assert.equal(result.width, '34px');
  assert.equal(result.height, '20px');
  assert.equal(result.radius, '6px');
  assert.doesNotMatch(result.backgroundImage, /linear-gradient/);
  assert.equal(result.knobWidth, '14px');
  assert.equal(result.knobHeight, '14px');
  assert.equal(result.knobRadius, '4px');
  assert.notEqual(result.knobContent, 'none');
});

test('span knobs stay single and skip the ::after fallback', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const host = document.querySelector('#host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>:host{--bg:#111114;--panel:#18181d;--line:#41434d;--muted:#9aa0a6;--text:#f4f4f6;--accent:#22cc88}.switch{width:48px;height:28px;border-radius:999px}.switch span{display:block;width:20px;height:20px;border-radius:999px}</style><button class="switch" role="switch" aria-checked="true"><span></span></button>';
    ExtraPotionsCore.applyMatteToggleChrome(shadow);
    const track = shadow.querySelector('.switch');
    const knob = track.querySelector('span');
    const after = getComputedStyle(track, '::after');
    return {
      width: getComputedStyle(track).width,
      height: getComputedStyle(track).height,
      backgroundImage: getComputedStyle(track).backgroundImage,
      knobWidth: getComputedStyle(knob).width,
      knobHeight: getComputedStyle(knob).height,
      knobRadius: getComputedStyle(knob).borderRadius,
      afterContent: after.content,
      afterWidth: after.width,
    };
  });
  assert.equal(result.width, '34px');
  assert.equal(result.height, '20px');
  assert.doesNotMatch(result.backgroundImage, /linear-gradient/);
  assert.equal(result.knobWidth, '14px');
  assert.equal(result.knobHeight, '14px');
  assert.equal(result.knobRadius, '4px');
  assert.equal(result.afterContent, 'none');
});

test('Pride ON tracks stay matte instead of rainbow fills', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const host = document.querySelector('#host');
    host.dataset.uiTheme = 'pride';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>:host{--bg:#2b1f32;--panel:#3a2942;--line:#76567d;--muted:#d8b9cd;--text:#fff2fa;--accent:#e07ca6}.switch[aria-checked="true"]{background:linear-gradient(90deg,#c97b83,#d29a70,#d0c07d,#70a886,#7091b6,#a27ba9)}</style><button class="switch" role="switch" aria-checked="true"></button>';
    ExtraPotionsCore.applyMatteToggleChrome(shadow);
    const track = getComputedStyle(shadow.querySelector('.switch'));
    return { image: track.backgroundImage, color: track.backgroundColor };
  });
  assert.doesNotMatch(result.image, /linear-gradient/);
  assert.notEqual(result.color, 'rgba(0, 0, 0, 0)');
});

test('High Contrast toggles use black tracks and white knobs', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const host = document.querySelector('#host');
    host.dataset.uiTheme = 'contrast';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button class="switch" role="switch" aria-checked="false"></button><button class="toggleSwitch" role="switch" aria-checked="true"></button>';
    ExtraPotionsCore.applyMatteToggleChrome(shadow);
    const off = shadow.querySelector('.switch');
    const on = shadow.querySelector('.toggleSwitch');
    const offKnob = getComputedStyle(off, '::after');
    const onKnob = getComputedStyle(on, '::after');
    return {
      offBg: getComputedStyle(off).backgroundColor,
      offBorder: getComputedStyle(off).borderTopColor,
      offKnob: offKnob.backgroundColor,
      onBg: getComputedStyle(on).backgroundColor,
      onKnob: onKnob.backgroundColor,
      onTransform: onKnob.transform,
    };
  });
  assert.equal(result.offBg, 'rgb(5, 5, 5)');
  assert.equal(result.offBorder, 'rgb(255, 255, 255)');
  assert.equal(result.offKnob, 'rgb(255, 255, 255)');
  assert.equal(result.onBg, 'rgb(255, 255, 255)');
  assert.equal(result.onKnob, 'rgb(5, 5, 5)');
  assert.match(result.onTransform, /14px|matrix/);
});

test('launcher registration and swatches apply matte chrome to product shadows', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="host"></div><div id="swatch-host"></div></body></html>');
  await page.addScriptTag({ content: source });
  const registered = await page.evaluate(() => {
    const host = document.querySelector('#host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button class="switch" role="switch" aria-checked="true"></button>';
    ExtraPotionsCore.registerLauncher(host, { productId: 'ward', priority: 60 });
    const track = shadow.querySelector('.switch');
    return {
      hasStyle: Boolean(shadow.querySelector('style[data-exp-matte-toggle-chrome]')),
      width: getComputedStyle(track).width,
      height: getComputedStyle(track).height,
      image: getComputedStyle(track).backgroundImage,
    };
  });
  assert.equal(registered.hasStyle, true);
  assert.equal(registered.width, '34px');
  assert.equal(registered.height, '20px');
  assert.doesNotMatch(registered.image, /linear-gradient/);
  const swatched = await page.evaluate(() => {
    const host = document.querySelector('#swatch-host');
    const shadow = host.attachShadow({ mode: 'open' });
    const row = document.createElement('div');
    shadow.append(row);
    ExtraPotionsCore.createThemeSwatches({ container: row, themes: [{ id: 'dark', name: 'Dark', swatch: '#111' }] });
    return Boolean(shadow.querySelector('style[data-exp-matte-toggle-chrome]'));
  });
  assert.equal(swatched, true);
});

test('automatic notices are claimed once per product change across page loads', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('https://notices.test/**', route => route.fulfill({ contentType:'text/html', body:'<!doctype html><html><body></body></html>' }));
  await page.goto('https://notices.test/one');
  await page.addScriptTag({ content: source });
  assert.deepEqual(await page.evaluate(() => ({
    first: ExtraPotionsCore.claimNotice('ward', 'available:4.0.0'),
    repeat: ExtraPotionsCore.claimNotice('ward', 'available:4.0.0'),
    other: ExtraPotionsCore.claimNotice('shift', 'available:4.0.0'),
  })), { first: true, repeat: false, other: true });
  await page.goto('https://notices.test/two');
  await page.addScriptTag({ content: source });
  assert.equal(await page.evaluate(() => ExtraPotionsCore.claimNotice('ward', 'available:4.0.0')), false);
});

test('simultaneous product notices stack beside the complete launcher grid', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const facts = await page.evaluate(async () => {
    for (const [id, priority] of [['shift',100],['ward',60]]) {
      const host=document.createElement('div');
      const shadow=host.attachShadow({mode:'open'});
      shadow.innerHTML='<style>.launcher{position:fixed;right:calc(12px + var(--exp-launcher-x));bottom:12px;width:48px;height:48px}.notice{position:fixed;width:240px;height:70px;background:#111;color:white}</style><button class="launcher"></button><div class="notice">Update</div>';
      document.documentElement.append(host);
      ExtraPotionsCore.registerLauncher(host,{productId:id,priority});
      ExtraPotionsCore.registerFloatingNotice(host,shadow.querySelector('.notice'));
    }
    ExtraPotionsCore.layout();
    await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    ExtraPotionsCore.layoutFloatingNotices();
    const launchers=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(host=>host.shadowRoot.querySelector('.launcher').getBoundingClientRect());
    const notices=[...document.querySelectorAll('[data-exp-product-launcher="1"]')].map(host=>host.shadowRoot.querySelector('.notice').getBoundingClientRect()).sort((a,b)=>a.top-b.top);
    return { gridTop:Math.min(...launchers.map(box=>box.top)), notices:notices.map(box=>({top:box.top,bottom:box.bottom,right:box.right})) };
  });
  assert.equal(facts.notices.length, 2);
  assert.ok(facts.notices[0].bottom <= facts.notices[1].top, JSON.stringify(facts));
  assert.ok(facts.notices[1].bottom <= facts.gridTop, JSON.stringify(facts));
});
