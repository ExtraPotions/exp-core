'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'dist', 'exp-core.js'), 'utf8');
const install = `(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

async function setup(t) {
  const browser = await chromium.launch({ headless:true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('**/*', route => route.fulfill({
    contentType:'text/html',
    body:'<!doctype html><html><body><h1>PRIVATE_BODY_TEXT</h1><input value="PRIVATE_FIELD_VALUE"></body></html>',
  }));
  await page.goto('https://fixture.test/PRIVATE_PATH?token=PRIVATE_QUERY');
  await page.addScriptTag({ content:install });
  return page;
}

test('Core diagnostics bound console capture and redact private page evidence', async t => {
  const page = await setup(t);
  const result = await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('ward','1.2.3');
    for (let index = 0; index < 130; index += 1) console.log('event', index);
    console.warn('Problem https://example.test/private?token=SECRET and member@example.test', { password:'PRIVATE_PASSWORD', okay:3 });
    window.dispatchEvent(new ErrorEvent('error',{error:new Error('Runtime failure'),message:'Runtime failure',lineno:4}));
    const report = ExtraPotionsCore.createDiagnosticsReport('WARD',{product:{version:'1.2.3'},engine:{active:true}});
    return { report, serialized:JSON.stringify(report) };
  });
  assert.equal(result.report.plugin.version,'1.2.3');
  assert.equal(result.report.engine.active,true);
  assert.equal(result.report.plugin.state,undefined,'product state is reported once, at the top level');
  assert.equal(result.report.plugin.stateLocation,'top-level');
  assert.equal(result.report.technical.environment,undefined);
  assert.equal(result.report.technical.ui,undefined);
  assert.ok(result.report.environment&&result.report.ui);
  assert.ok(result.report.console.entries.length <= 100);
  assert.ok(result.report.console.omitted >= 30);
  for (const secret of ['PRIVATE_BODY_TEXT','PRIVATE_FIELD_VALUE','PRIVATE_PATH','PRIVATE_QUERY','PRIVATE_PASSWORD','member@example.test','token=SECRET']) {
    assert.equal(result.serialized.includes(secret),false,secret);
  }
});

test('Core diagnostics controls create fresh reports and preserve Show then Copy order', async t => {
  const page = await setup(t);
  await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('ward','1.2.3');
    window.revision=0;
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});
    document.body.append(ExtraPotionsCore.createDiagnosticsControls(
      () => ExtraPotionsCore.createDiagnosticsReport('WARD',{revision:++window.revision}),
      () => {},
    ));
  });
  assert.deepEqual(await page.locator('.diagnostics-controls button').allTextContents(),['Show Diagnostics','Copy Diagnostics']);
  await page.getByRole('button',{name:'Show Diagnostics',exact:true}).click();
  assert.equal(JSON.parse(await page.locator('pre').innerText()).revision,1);
  await page.getByRole('button',{name:'Copy Diagnostics',exact:true}).click();
  const copied=await page.evaluate(()=>JSON.parse(window.copied));
  assert.equal(copied.revision,2);
});

test('Core diagnostics redact URL-shaped keys and normalize unknown resource initiators', async t => {
  const page = await setup(t);
  const result = await page.evaluate(() => {
    const original = performance.getEntriesByType.bind(performance);
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: type => type === 'resource'
        ? [{ initiatorType:'https://private.example/channel?token=SECRET', duration:12, transferSize:34 }]
        : original(type),
    });
    return ExtraPotionsCore.createDiagnosticsReport('WARD', {
      product:{version:'1.2.3'},
      ['https://private.example/private-key?mode=1']:'kept-value',
    });
  });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('private.example'), false);
  assert.equal(serialized.includes('PRIVATE_PATH'), false);
  assert.equal(serialized.includes('SECRET'), false);
  assert.equal(result['[url]'], 'kept-value');
  assert.deepEqual(Object.keys(result.page.performance.resources.byType), ['other']);
  assert.deepEqual(result.page.performance.resources.byType.other, { count:1, durationMs:12, transferBytes:34 });
});
