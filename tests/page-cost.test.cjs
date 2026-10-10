'use strict';
// Costs measured on Reddit (2026-10-09 trace): a paint probe per shadow root, an ancestor
// JSON walk per visibility check, and whole page batches delivered in one task.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist', 'exp-core.js'), 'utf8');
const source = `(() => {\n${bundle}\nglobalThis.ExtraPotionsCore = ExtraPotionsCore;\n})();\n`;

async function openPage(t, html = '<!doctype html><html><body></body></html>') {
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setContent(html);
  await page.addInitScript(() => {});
  await page.evaluate(() => {
    window.__computed = 0;
    const original = window.getComputedStyle;
    window.getComputedStyle = function (...args) { window.__computed += 1; return original.apply(this, args); };
  });
  await page.addScriptTag({ content: source });
  return page;
}

test('styles injected into many shadow roots share one sheet and probe paint once', async (t) => {
  const page = await openPage(t);
  const facts = await page.evaluate(() => {
    const lifecycle = ExtraPotionsCore.createLifecycle();
    const roots = [];
    for (let index = 0; index < 200; index += 1) {
      const host = document.createElement('div');
      document.body.append(host);
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span class="hit">x</span>';
      roots.push(shadow);
    }
    const before = window.__computed;
    const handles = roots.map((shadow) => lifecycle.injectStyle(shadow, '.hit{color:rgb(9, 8, 7)}', { probe: 'shared' }));
    const probes = window.__computed - before;
    const colors = roots.map((shadow) => getComputedStyle(shadow.querySelector('.hit')).color);
    const sheets = new Set(roots.map((shadow) => shadow.adoptedStyleSheets.at(-1)));
    return { probes, styled: colors.filter((color) => color === 'rgb(9, 8, 7)').length, sheets: sheets.size, owned: handles.every((node) => node.dataset.expOwned === '1' && node.dataset.probe === 'shared') };
  });
  assert.ok(facts.probes <= 1, `paint probes: ${facts.probes}`);
  assert.equal(facts.styled, 200);
  assert.equal(facts.sheets, 1, 'identical styles share one constructed sheet');
  assert.equal(facts.owned, true);
});

test('editing or removing one shared style leaves the other roots alone', async (t) => {
  const page = await openPage(t);
  const facts = await page.evaluate(() => {
    const lifecycle = ExtraPotionsCore.createLifecycle();
    const make = () => {
      const host = document.createElement('div');
      document.body.append(host);
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span class="hit">x</span>';
      return shadow;
    };
    const [a, b, c] = [make(), make(), make()];
    const color = (shadow) => getComputedStyle(shadow.querySelector('.hit')).color;
    const [ha, , hc] = [a, b, c].map((shadow) => lifecycle.injectStyle(shadow, '.hit{color:rgb(1, 1, 1)}'));
    ha.textContent = '.hit{color:rgb(2, 2, 2)}';
    const afterEdit = [color(a), color(b), color(c)];
    const markerKept = ExtraPotionsCore.isOwnedSheet(a.adoptedStyleSheets.at(-1));
    hc.remove();
    const afterRemove = [color(a), color(b), color(c)];
    const third = make();
    lifecycle.injectStyle(third, '.hit{color:rgb(1, 1, 1)}');
    return { afterEdit, afterRemove, third: color(third), markerKept, cSheets: c.adoptedStyleSheets.length };
  });
  assert.deepEqual(facts.afterEdit, ['rgb(2, 2, 2)', 'rgb(1, 1, 1)', 'rgb(1, 1, 1)']);
  assert.equal(facts.markerKept, true);
  assert.deepEqual(facts.afterRemove, ['rgb(2, 2, 2)', 'rgb(1, 1, 1)', 'rgb(0, 0, 0)']);
  assert.equal(facts.cSheets, 0);
  assert.equal(facts.third, 'rgb(1, 1, 1)');
});

test('presentation suppression reads only elements that carry presentation state', async (t) => {
  const page = await openPage(t);
  const facts = await page.evaluate(() => {
    let node = document.body;
    for (let depth = 0; depth < 120; depth += 1) { const next = document.createElement('div'); node.append(next); node = next; }
    const leaf = node;
    const hidden = document.body.firstElementChild.firstElementChild;
    let reads = 0;
    const original = Element.prototype.getAttribute;
    Element.prototype.getAttribute = function (name) { if (name === 'data-exp-presentation-state') reads += 1; return original.call(this, name); };
    const clean = ExtraPotionsCore.isPresentationSuppressed(leaf);
    const cleanReads = reads;
    ExtraPotionsCore.setPresentationState(hidden, 'ward', { visibility: 'hide' });
    reads = 0;
    const suppressed = ExtraPotionsCore.isPresentationSuppressed(leaf);
    const suppressedReads = reads;
    ExtraPotionsCore.setPresentationState(hidden, 'ward', { visibility: 'dim' });
    const dimmed = ExtraPotionsCore.isPresentationSuppressed(leaf);
    const chain = ExtraPotionsCore.presentationStateChain?.(leaf)?.length;
    Element.prototype.getAttribute = original;
    return { clean, cleanReads, suppressed, suppressedReads, dimmed, chain };
  });
  assert.equal(facts.clean, false);
  assert.equal(facts.cleanReads, 0, 'no ancestor carries state, so none is parsed');
  assert.equal(facts.suppressed, true);
  assert.ok(facts.suppressedReads <= 1, `reads: ${facts.suppressedReads}`);
  assert.equal(facts.dimmed, false);
});

test('large page batches are delivered in small chunks with the event loop free between them', async (t) => {
  const page = await openPage(t);
  const facts = await page.evaluate(() => new Promise((resolve, reject) => {
    const containers = [];
    for (let index = 0; index < 300; index += 1) { const box = document.createElement('section'); document.body.append(box); containers.push(box); }
    const seen = new Map();
    const batches = [];
    const epochs = [];
    let timerRanAt = -1;
    let delivered = 0;
    const stop = ExtraPotionsCore.observePageBatch((batch, roots) => {
      batches.push(roots.length);
      epochs.push(batch.epoch);
      for (const root of roots) seen.set(root, (seen.get(root) || 0) + 1);
      const until = performance.now() + roots.length * 2;
      while (performance.now() < until) { /* a listener doing 2 ms of work per root */ }
      delivered += roots.length;
      if (batches.length === 1) setTimeout(() => { timerRanAt = delivered; }, 0);
      if (delivered >= 300) {
        stop();
        resolve({ batches, epochs, timerRanAt, once: [...seen.values()].every((count) => count === 1), roots: seen.size });
      }
    }, { productId: 'prisma', delayMs: 20 });
    for (const box of containers) box.append(document.createElement('p'));
    setTimeout(() => reject(new Error(`only ${delivered} roots delivered`)), 10000);
  }));
  assert.equal(facts.roots, 300);
  assert.equal(facts.once, true, 'each root is delivered exactly once');
  assert.ok(facts.batches.length > 1, `batches: ${facts.batches.join(',')}`);
  assert.ok(Math.max(...facts.batches) <= 16, `largest batch ${Math.max(...facts.batches)}`);
  assert.ok(facts.timerRanAt > 0 && facts.timerRanAt < 300, `a timer queued during delivery ran after ${facts.timerRanAt} roots`);
  assert.deepEqual(facts.epochs, [...facts.epochs].sort((a, b) => a - b), 'epochs increase');
});
