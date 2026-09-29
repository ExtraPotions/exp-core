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

test('Core identifies its native foundation and canonical menu widths', async (t) => {
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
    version: pkg.version,
    sourceVersion: pkg.version,
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

test('Core owns canonical interoperability contracts for the current suite', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const contracts = await page.evaluate(() => Object.fromEntries(
    ['dropper', 'shift', 'ward', 'prisma'].map(id => [id, ExtraPotionsCore.suiteContract(id)])
  ));
  assert.equal(contracts.dropper.role, 'flagship');
  assert.equal(contracts.dropper.priority, 4);
  assert.deepEqual(contracts.dropper.capabilities, ['twitch.drops', 'twitch.campaigns', 'twitch.progress', 'twitch.claims', 'twitch.stream-management']);
  assert.deepEqual(contracts.dropper.presentationPhases, []);
  assert.deepEqual(contracts.shift.presentationPhases, ['theme']);
  assert.deepEqual(contracts.ward.presentationPhases, ['classify', 'visibility']);
  assert.deepEqual(contracts.prisma.presentationPhases, ['annotate']);
});

test('diagnostics registration bootstraps Core-owned interoperability metadata', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const state = await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('ward', '3.2.25');
    ExtraPotionsCore.registerDiagnosticsProduct('shift', '3.4.12');
    ExtraPotionsCore.registerDiagnosticsProduct('prisma', '3.1.11');
    ExtraPotionsCore.registerDiagnosticsProduct('dropper', '3.3.20');
    return {
      suite: ExtraPotionsCore.suiteSnapshot(),
      presentation: ExtraPotionsCore.presentationProviders(),
    };
  });
  assert.deepEqual(state.suite.products.map(item => item.id), ['dropper', 'shift', 'ward', 'prisma']);
  assert.deepEqual(state.presentation.map(item => item.id), ['ward', 'shift', 'prisma']);
  assert.deepEqual(state.presentation.map(item => item.phases), [['classify', 'visibility'], ['theme'], ['annotate']]);
});

test('suite registry exposes the flagship product order and product capabilities', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const state = await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('prisma', '3.1.11');
    ExtraPotionsCore.registerDiagnosticsProduct('ward', '3.2.25');
    ExtraPotionsCore.registerDiagnosticsProduct('shift', '3.4.12');
    ExtraPotionsCore.registerDiagnosticsProduct('dropper', '3.3.20');
    return {
      snapshot: ExtraPotionsCore.suiteSnapshot(),
      drops: ExtraPotionsCore.hasProductCapability('twitch.drops'),
      retail: ExtraPotionsCore.capabilityProviders('retail.cleanup').map(item => item.id),
      identity: ExtraPotionsCore.capabilityProviders('text.identity-highlighting').map(item => item.id),
    };
  });
  assert.deepEqual(state.snapshot.products.map(item => item.id), ['dropper', 'shift', 'ward', 'prisma']);
  assert.equal(state.snapshot.products[0].role, 'flagship');
  assert.equal(state.drops, true);
  assert.deepEqual(state.retail, ['ward']);
  assert.deepEqual(state.identity, ['prisma']);
});

test('persisted suite state is queryable across later Core realms', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><head></head><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    ExtraPotionsCore.publishSuiteState('dropper', 'dropper.state-changed', {
      activeReward: true,
      progressPercent: 42,
      routingState: 'verify-stream',
    });
    return {
      all: ExtraPotionsCore.suiteStateSnapshot(),
      latest: ExtraPotionsCore.latestSuiteState('dropper', 'dropper.state-changed'),
      markers: document.querySelectorAll('meta[data-exp-suite-state-product="dropper"]').length,
    };
  });
  assert.equal(result.markers, 1);
  assert.equal(result.all.length, 1);
  assert.equal(result.latest.productId, 'dropper');
  assert.equal(result.latest.type, 'dropper.state-changed');
  assert.deepEqual(result.latest.state, {
    activeReward: true,
    progressPercent: 42,
    routingState: 'verify-stream',
  });
});

test('Core owns strict compact state schemas for the current products', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const contracts = await page.evaluate(() => Object.fromEntries(
    ['dropper', 'shift', 'ward', 'prisma'].map(id => [id, ExtraPotionsCore.suiteContract(id).state])
  ));
  assert.deepEqual(contracts.dropper, {
    type: 'dropper.state-changed',
    fields: { activeReward: 'boolean', progressPercent: 'percent-nullable', routingState: 'token' },
  });
  assert.deepEqual(contracts.shift, {
    type: 'shift.state-changed',
    fields: { active: 'boolean', theme: 'token', safeMode: 'boolean', excluded: 'boolean' },
  });
  assert.deepEqual(contracts.ward, {
    type: 'ward.state-changed',
    fields: { active: 'boolean', pageType: 'token', interventions: 'count', hide: 'count', dim: 'count', collapse: 'count', annotate: 'count' },
  });
  assert.deepEqual(contracts.prisma, {
    type: 'prisma.state-changed',
    fields: { status: 'token', total: 'count', temporarilyHidden: 'boolean' },
  });
});

test('canonical suite state rejects schema drift before publication', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const attempt = fn => {
      try { fn(); return null; } catch (error) { return String(error?.message || error); }
    };
    return {
      identifying: attempt(() => ExtraPotionsCore.publishSuiteState('dropper', 'dropper.state-changed', {
        activeReward: true,
        progressPercent: 50,
        routingState: 'earning',
        streamer: 'private-login',
      })),
      percent: attempt(() => ExtraPotionsCore.publishSuiteState('dropper', 'dropper.state-changed', {
        activeReward: true,
        progressPercent: 101,
        routingState: 'earning',
      })),
      missing: attempt(() => ExtraPotionsCore.publishSuiteState('prisma', 'prisma.state-changed', {
        status: 'ready',
        total: 4,
      })),
      valid: ExtraPotionsCore.publishSuiteState('ward', 'ward.state-changed', {
        active: true,
        pageType: 'search',
        interventions: 4,
        hide: 1,
        dim: 1,
        collapse: 1,
        annotate: 1,
      }),
    };
  });
  assert.match(result.identifying, /Unknown suite state field: streamer/u);
  assert.match(result.percent, /Invalid percent suite state field: progressPercent/u);
  assert.match(result.missing, /Missing suite state field: temporarilyHidden/u);
  assert.equal(result.valid, true);
});

test('all current products publish valid canonical state snapshots', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => ({
    dropper: ExtraPotionsCore.publishSuiteState('dropper', 'dropper.state-changed', {
      activeReward: true,
      progressPercent: 42.5,
      routingState: 'earning',
    }),
    shift: ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', {
      active: true,
      theme: 'midnight',
      safeMode: false,
      excluded: false,
    }),
    ward: ExtraPotionsCore.publishSuiteState('ward', 'ward.state-changed', {
      active: true,
      pageType: 'search',
      interventions: 4,
      hide: 1,
      dim: 1,
      collapse: 1,
      annotate: 1,
    }),
    prisma: ExtraPotionsCore.publishSuiteState('prisma', 'prisma.state-changed', {
      status: 'ready',
      total: 7,
      temporarilyHidden: false,
    }),
  }));
  assert.deepEqual(result, { dropper: true, shift: true, ward: true, prisma: true });
});

test('deduplicated suite state publishing emits only meaningful changes', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const seen = [];
    const stop = ExtraPotionsCore.onSuiteEvent(event => {
      if (event.type === 'shift.state-changed') seen.push(event.detail);
    });
    const first = ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', { active: true, theme: 'midnight', safeMode: false, excluded: false });
    const duplicate = ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', { excluded: false, theme: 'midnight', active: true, safeMode: false });
    const changed = ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', { active: true, theme: 'crimson', safeMode: false, excluded: false });
    stop();
    return { first, duplicate, changed, seen };
  });
  assert.equal(result.first, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.changed, true);
  assert.deepEqual(result.seen, [
    { active: true, excluded: false, safeMode: false, theme: 'midnight' },
    { active: true, excluded: false, safeMode: false, theme: 'crimson' },
  ]);
});

test('shared suite state survives independently loaded Core realms and supports late reads', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const first = await page.evaluate(() => ExtraPotionsCore.publishSuiteState(
    'ward',
    'ward.state-changed',
    { active: true, pageType: 'search', interventions: 3, hide: 1, dim: 1, collapse: 0, annotate: 0 }
  ));
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const duplicate = ExtraPotionsCore.publishSuiteState(
      'ward',
      'ward.state-changed',
      { annotate: 0, collapse: 0, dim: 1, hide: 1, interventions: 3, pageType: 'search', active: true }
    );
    const latest = ExtraPotionsCore.latestSuiteState('ward', 'ward.state-changed');
    const snapshot = ExtraPotionsCore.suiteStateSnapshot('ward');
    const changed = ExtraPotionsCore.publishSuiteState(
      'ward',
      'ward.state-changed',
      { active: true, pageType: 'search', interventions: 4, hide: 1, dim: 1, collapse: 1, annotate: 1 }
    );
    return {
      duplicate,
      changed,
      latest,
      snapshot,
      markers: document.querySelectorAll('meta[data-exp-suite-state-product="ward"]').length,
    };
  });
  assert.equal(first, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.changed, true);
  assert.equal(result.markers, 1);
  assert.equal(result.snapshot.length, 1);
  assert.equal(result.latest.productId, 'ward');
  assert.equal(result.latest.type, 'ward.state-changed');
  assert.equal(result.latest.state.interventions, 3);
  assert.equal(result.latest.state.pageType, 'search');
  assert.ok(result.latest.at > 0);
});

test('suite state rejects oversized payloads before writing shared metadata', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    try {
      ExtraPotionsCore.publishSuiteState('future', 'future.state-changed', { value: 'x'.repeat(5000) });
      return { threw: false };
    } catch (error) {
      return {
        threw: true,
        message: String(error?.message || error),
        markers: document.querySelectorAll('meta[data-exp-suite-state-product="future"]').length,
      };
    }
  });
  assert.equal(result.threw, true);
  assert.match(result.message, /4096/u);
  assert.equal(result.markers, 0);
});

test('suite state subscriptions deliver retained state then meaningful updates', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', {
      active: true, theme: 'midnight', safeMode: false, excluded: false,
    });
    const seen = [];
    const stop = ExtraPotionsCore.subscribeSuiteState('shift', entry => {
      seen.push({ trust: entry.trust, theme: entry.state.theme, active: entry.state.active });
    });
    ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', {
      active: true, theme: 'crimson', safeMode: false, excluded: false,
    });
    stop();
    ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', {
      active: false, theme: 'crimson', safeMode: false, excluded: false,
    });
    return {
      seen,
      trust: ExtraPotionsCore.suiteTrust,
      snapshotTrust: ExtraPotionsCore.suiteSnapshot().trust,
      latestTrust: ExtraPotionsCore.latestSuiteState('shift', 'shift.state-changed')?.trust,
    };
  });
  assert.deepEqual(result.seen, [
    { trust: 'shared-dom-advisory', theme: 'midnight', active: true },
    { trust: 'shared-dom-advisory', theme: 'crimson', active: true },
  ]);
  assert.equal(result.trust, 'shared-dom-advisory');
  assert.equal(result.snapshotTrust, 'shared-dom-advisory');
  assert.equal(result.latestTrust, 'shared-dom-advisory');
});

test('diagnostics bootstrap is idempotent for suite registration events', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const events = await page.evaluate(() => {
    const seen = [];
    const stop = ExtraPotionsCore.onSuiteEvent(event => seen.push(event.type));
    ExtraPotionsCore.registerDiagnosticsProduct('shift', '3.4.12');
    ExtraPotionsCore.registerDiagnosticsProduct('shift', '3.4.12');
    stop();
    return seen;
  });
  assert.equal(events.filter(type => type === 'product.registered').length, 1);
  assert.equal(events.filter(type => type === 'presentation.provider-registered').length, 1);
});

test('suite event channel crosses product boundaries with serialized payloads', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => new Promise((resolve) => {
    const stop = ExtraPotionsCore.onSuiteEvent((event) => {
      if (event.type !== 'shift.theme-applied') return;
      stop();
      resolve(event);
    });
    ExtraPotionsCore.emitSuiteEvent('shift', 'shift.theme-applied', { theme: 'obsidian' });
  }));
  assert.equal(result.source, 'shift');
  assert.equal(result.type, 'shift.theme-applied');
  assert.deepEqual(result.detail, { theme: 'obsidian' });
  assert.equal(result.protocol, 'exp-suite-interoperability-v1');
});

test('Core exposes a product-neutral shared page context', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('https://example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await page.goto('https://example.test/products/42?x=1');
  await page.addScriptTag({ content: source });
  const context = await page.evaluate(() => ExtraPotionsCore.pageContext());
  assert.equal(context.origin, 'https://example.test');
  assert.equal(context.hostname, 'example.test');
  assert.equal(context.pathname, '/products/42');
  assert.equal(context.topLevel, true);
});

test('presentation providers follow the shared composition order', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const providers = await page.evaluate(() => {
    ExtraPotionsCore.registerPresentationProvider({ productId: 'prisma' });
    ExtraPotionsCore.registerPresentationProvider({ productId: 'shift' });
    ExtraPotionsCore.registerPresentationProvider({ productId: 'ward' });
    return ExtraPotionsCore.presentationProviders();
  });
  assert.deepEqual(providers.map(item => item.id), ['ward', 'shift', 'prisma']);
  assert.deepEqual(providers[0].phases, ['classify', 'visibility']);
});

test('presentation state keeps product ownership separate on one DOM element', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body><article id="card"></article></body></html>');
  await page.addScriptTag({ content: source });
  const state = await page.evaluate(() => {
    const card = document.querySelector('#card');
    ExtraPotionsCore.setPresentationState(card, 'ward', { classification: 'sponsored', visibility: 'dim' });
    ExtraPotionsCore.setPresentationState(card, 'shift', { surface: 'secondary' });
    ExtraPotionsCore.setPresentationState(card, 'prisma', { annotation: 'identity' });
    return { state: ExtraPotionsCore.readPresentationState(card), raw: card.getAttribute('data-exp-presentation-state') };
  });
  assert.equal(state.state.ward.visibility, 'dim');
  assert.equal(state.state.shift.surface, 'secondary');
  assert.equal(state.state.prisma.annotation, 'identity');
  assert.match(state.raw, /"ward"/u);
});

test('presentation state events identify the exact target and deduplicate no-op writes', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><section id="target">PRIVATE_TEXT</section></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const target = document.querySelector('#target');
    const seen = [];
    const stop = ExtraPotionsCore.observePresentationState((event, node) => {
      seen.push({
        source: event.source,
        channels: event.channels,
        phase: event.phase,
        targetId: node.id,
        serialized: JSON.stringify(event),
      });
    }, { source: 'ward' });
    ExtraPotionsCore.setPresentationState(target, 'ward', { visibility: 'collapse' });
    ExtraPotionsCore.setPresentationState(target, 'ward', { visibility: 'collapse' });
    ExtraPotionsCore.clearPresentationState(target, 'ward');
    stop();
    return seen;
  });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(item => item.targetId), ['target', 'target']);
  assert.deepEqual(result.map(item => item.source), ['ward', 'ward']);
  assert.deepEqual(result.map(item => item.phase), [null, null]);
  assert.equal(result.some(item => item.serialized.includes('PRIVATE_TEXT')), false);
});

test('presentation state events expose the active shared presentation phase', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="target"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const target = document.querySelector('#target');
    const stopPresentation = ExtraPotionsCore.observePresentationState((event, node) => {
      if (node !== target || event.source !== 'ward') return;
      stopPresentation();
      ward.stop();
      resolve({
        phase: event.phase,
        observerPhase: ExtraPotionsCore.pageObserverState().phase,
      });
    }, { source: 'ward' });
    const lifecycle = ExtraPotionsCore.createLifecycle();
    const ward = lifecycle.createScheduler(roots => {
      if (roots.includes(target)) ExtraPotionsCore.setPresentationState(target, 'ward', { visibility: 'dim' });
    }, { source: 'ward' });
    ward.start();
    target.append(document.createElement('span'));
    setTimeout(() => reject(new Error('presentation phase event not observed')), 1500);
  }));
  assert.equal(result.phase, 'classify');
  assert.equal(result.observerPhase, 'classify');
});

test('presentation suppression follows ancestor visibility state without treating dim as hidden', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><section id="outer"><span id="inner">Text</span></section></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const outer = document.querySelector('#outer');
    const inner = document.querySelector('#inner');
    ExtraPotionsCore.setPresentationState(outer, 'ward', { visibility: 'dim' });
    const dimSuppressed = ExtraPotionsCore.isPresentationSuppressed(inner);
    ExtraPotionsCore.setPresentationState(outer, 'ward', { visibility: 'collapse' });
    const collapsedSuppressed = ExtraPotionsCore.isPresentationSuppressed(inner);
    return {
      dimSuppressed,
      collapsedSuppressed,
      chain: ExtraPotionsCore.presentationStateChain(inner).map(entry => entry.state),
    };
  });
  assert.equal(result.dimSuppressed, false);
  assert.equal(result.collapsedSuppressed, true);
  assert.equal(result.chain[0].ward.visibility, 'collapse');
});

test('Core lifecycle subscribers share one navigation observer', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.route('https://navigation.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
  await page.goto('https://navigation.test/start');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    const events = [];
    const first = ExtraPotionsCore.createLifecycle();
    const second = ExtraPotionsCore.createLifecycle();
    const stopA = first.onNavigation(event => events.push(['a', event.kind, event.epoch, event.href]));
    const stopB = second.onNavigation(event => events.push(['b', event.kind, event.epoch, event.href]));
    history.pushState({}, '', '/next');
    history.pushState({}, '', '/next');
    history.replaceState({}, '', '/final');
    stopA();
    stopB();
    return {
      events,
      markers: document.querySelectorAll('meta[data-exp-navigation-observer]').length,
      state: ExtraPotionsCore.navigationObserverState(),
    };
  });
  assert.equal(result.markers, 1);
  assert.equal(result.state.active, true);
  assert.equal(result.state.owner, 'lifecycle');
  assert.equal(result.state.epoch, 2);
  assert.deepEqual(result.events.map(item => item.slice(0, 3)), [
    ['a', 'pushState', 1],
    ['b', 'pushState', 1],
    ['a', 'replaceState', 2],
    ['b', 'replaceState', 2],
  ]);
  assert.equal(result.events[0][3], 'https://navigation.test/next');
  assert.equal(result.events[2][3], 'https://navigation.test/final');
});

test('shared page observation uses one DOM leader and broadcasts mutation batches', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const batches = [];
    const stopA = ExtraPotionsCore.observePage(batch => batches.push(['a', batch.epoch]), { productId: 'shift', delayMs: 20 });
    const stopB = ExtraPotionsCore.observePage(batch => {
      batches.push(['b', batch.epoch]);
      stopA(); stopB();
      resolve({ batches, state: ExtraPotionsCore.pageObserverState(), markers: document.querySelectorAll('meta[data-exp-page-observer]').length });
    }, { productId: 'ward', delayMs: 20 });
    document.body.append(document.createElement('section'));
    setTimeout(() => reject(new Error('page batch not observed')), 1000);
  }));
  assert.equal(result.markers, 1);
  assert.equal(result.state.active, true);
  assert.equal(result.state.owner, 'shift');
  assert.equal(result.batches.length, 2);
  assert.deepEqual(result.batches.map(item => item[1]), [1, 1]);
});

test('Core schedulers share one page observer while preserving character-data opt-in', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="target"></div></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const target = document.querySelector('#target');
    const counts = { ward: 0, prisma: 0 };
    let stage = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      ward.stop();
      prisma.stop();
      resolve({
        counts,
        markers: document.querySelectorAll('meta[data-exp-page-observer]').length,
        observer: ExtraPotionsCore.pageObserverState(),
      });
    };
    const note = (key, roots) => {
      if (!roots.includes(target)) return;
      counts[key] += 1;
      if (stage === 0 && counts.ward >= 1 && counts.prisma >= 1) {
        stage = 1;
        setTimeout(() => { target.firstChild.nodeValue = 'changed'; }, 25);
      } else if (stage === 1 && counts.prisma >= 2) {
        setTimeout(finish, 80);
      }
    };
    const wardLifecycle = ExtraPotionsCore.createLifecycle();
    const prismaLifecycle = ExtraPotionsCore.createLifecycle();
    const ward = wardLifecycle.createScheduler(roots => note('ward', roots), { source: 'ward' });
    const prisma = prismaLifecycle.createScheduler(roots => note('prisma', roots), { source: 'prisma', characterData: true });
    ward.start();
    prisma.start();
    const text = document.createTextNode('initial');
    target.append(text);
    setTimeout(() => reject(new Error('shared scheduler batch not observed')), 1500);
  }));
  assert.equal(result.markers, 1);
  assert.equal(result.observer.active, true);
  assert.equal(result.observer.owner, 'ward');
  assert.equal(result.counts.ward, 1);
  assert.ok(result.counts.prisma >= 2);
});

test('shared schedulers execute product callbacks in presentation phase order', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="target"></div></body></html>');
  await page.addScriptTag({ content: source });
  const order = await page.evaluate(() => new Promise((resolve, reject) => {
    const target = document.querySelector('#target');
    const order = [];
    const wardLifecycle = ExtraPotionsCore.createLifecycle();
    const prismaLifecycle = ExtraPotionsCore.createLifecycle();
    let ward;
    let prisma;
    const note = (name, roots) => {
      if (!roots.includes(target)) return;
      order.push(name);
      if (order.length === 2) {
        ward.stop();
        prisma.stop();
        resolve(order);
      }
    };
    // Register in reverse order to prove execution follows Core phases, not subscription order.
    prisma = prismaLifecycle.createScheduler(roots => note('prisma', roots), { source: 'prisma', characterData: true });
    ward = wardLifecycle.createScheduler(roots => note('ward', roots), { source: 'ward' });
    prisma.start();
    ward.start();
    target.append(document.createElement('span'));
    setTimeout(() => reject(new Error('phase-ordered scheduler batch not observed')), 1500);
  }));
  assert.deepEqual(order, ['ward', 'prisma']);
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

test('suite health includes latest compact product state', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><head></head><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('shift', '3.4.12');
    ExtraPotionsCore.publishSuiteState('shift', 'shift.state-changed', {
      active: true,
      theme: 'midnight',
      safeMode: false,
      excluded: false,
    });
    const health = ExtraPotionsCore.suiteHealth();
    const report = ExtraPotionsCore.createDiagnosticsReport('SHIFT', { version: '3.4.12' });
    return {
      product: health.products.find(item => item.id === 'shift'),
      states: report.interoperability.states,
    };
  });
  assert.equal(result.product.stateType, 'shift.state-changed');
  assert.equal(result.product.state.active, true);
  assert.equal(result.product.state.theme, 'midnight');
  assert.ok(result.product.stateAgeMs >= 0);
  assert.equal(result.states.length, 1);
  assert.equal(result.states[0].productId, 'shift');
});

test('product compatibility merges interoperability health conflicts', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('shift', '3.4.12');
    const healthy = ExtraPotionsCore.productCompatibility();
    ExtraPotionsCore.registerSuiteProduct({
      productId: 'shift',
      productVersion: '3.4.12',
      capabilities: ['appearance.theme'],
    });
    const drift = ExtraPotionsCore.productCompatibility();
    return { healthy, drift };
  });
  assert.equal(result.healthy.status, 'no-conflicts-observed');
  assert.equal(result.healthy.interoperability.status, 'healthy');
  assert.equal(result.drift.status, 'conflicts-detected');
  assert.equal(result.drift.interoperability.status, 'conflicts-detected');
  assert.ok(result.drift.conflicts.some(conflict => conflict.type === 'suite-capability-mismatch'));
});

test('diagnostic reports identify their product', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const report = await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('prisma', '3.0.1');
    const stop = ExtraPotionsCore.observePage(() => {}, { productId: 'prisma' });
    stop();
    return ExtraPotionsCore.createDiagnosticsReport('PRISMA', { version: '3.0.1' });
  });
  assert.equal(report.report, 'PRISMA Diagnostics');
  assert.equal(report.interoperability.suite.products[0].id, 'prisma');
  assert.deepEqual(report.interoperability.suite.products[0].capabilities, ['text.identity-detection', 'text.identity-highlighting', 'identity.catalog']);
  assert.deepEqual(report.interoperability.presentation.providers[0].phases, ['annotate']);
  assert.equal(report.interoperability.pageObserver.active, true);
  assert.equal(report.interoperability.pageObserver.protocol, 'exp-page-observer-v1');
  assert.equal(report.interoperability.health.status, 'healthy');
  assert.deepEqual(report.interoperability.health.coreVersions, [pkg.version]);
  assert.equal(report.version, '3.0.1');
  assert.equal(report.schemaVersion, 3);
  assert.ok(report.page.structure.elements >= 3);
  assert.equal(report.page.privacy.pageText, 'excluded');
  assert.ok(report.page.performance.resources);
  assert.equal(report.environment.topLevelContext, true);
  assert.ok(Date.parse(report.generatedAt));
  assert.deepEqual(report.ui.swatches, []);
});

test('suite health reports interoperability drift without page content', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div>PRIVATE_TEXT</div></body></html>');
  await page.addScriptTag({ content: source });
  const health = await page.evaluate(() => {
    ExtraPotionsCore.registerDiagnosticsProduct('ward', '3.2.25');
    ExtraPotionsCore.registerDiagnosticsProduct('prisma', '3.1.11');
    const stop = ExtraPotionsCore.observePage(() => {}, { productId: 'ward' });
    stop();
    document.querySelector('meta[data-exp-suite-product="ward"]').dataset.expSuiteCapabilities = '[]';
    document.querySelector('meta[data-exp-presentation-provider="prisma"]').dataset.expPresentationPhases = '["theme"]';
    const oldCore = document.createElement('meta');
    oldCore.dataset.expDiagnosticsProduct = 'shift';
    oldCore.dataset.expCoreVersion = '3.3.17';
    document.documentElement.append(oldCore);
    const duplicateObserver = document.createElement('meta');
    duplicateObserver.dataset.expPageObserver = 'duplicate';
    document.documentElement.append(duplicateObserver);
    return ExtraPotionsCore.suiteHealth();
  });
  const types = health.conflicts.map(conflict => conflict.type);
  assert.equal(health.status, 'conflicts-detected');
  assert.ok(types.includes('suite-capability-mismatch'));
  assert.ok(types.includes('presentation-phase-mismatch'));
  assert.ok(types.includes('mixed-core-versions'));
  assert.ok(types.includes('duplicate-page-observer'));
  assert.equal(JSON.stringify(health).includes('PRIVATE_TEXT'), false);
});

test('suite advisory state never advertises an action invocation API', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const api = await page.evaluate(() => ({
    trust: ExtraPotionsCore.suiteTrust,
    invokeSuiteAction: typeof ExtraPotionsCore.invokeSuiteAction,
    requestSuiteAction: typeof ExtraPotionsCore.requestSuiteAction,
  }));
  assert.equal(api.trust, 'shared-dom-advisory');
  assert.equal(api.invokeSuiteAction, 'undefined');
  assert.equal(api.requestSuiteAction, 'undefined');
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

test('Core product services resolve product versions lazily', async (t) => {
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const page = await browser.newPage(); await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: source });
  const result = await page.evaluate(() => {
    let version = '';
    const services = ExtraPotionsCore.createProductServices({
      productId: 'ward',
      repository: 'ExtraPotions/WARD',
      currentVersion: () => version,
      enabled: () => false,
    });
    version = '3.2.23';
    const status = services.updates.status();
    return {
      current: status.current,
      exposed: services.updates.CURRENT_VERSION,
      lifecycle: Boolean(services.lifecycle),
      diagnostics: Boolean(services.diagnostics),
    };
  });
  assert.deepEqual(result, { current: '3.2.23', exposed: '3.2.23', lifecycle: true, diagnostics: true });
});
