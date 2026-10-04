'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const runtime = fs.readFileSync(path.join(__dirname, '../src/runtime.js'), 'utf8');
const begin = runtime.indexOf('  function createMenuController(options = {}) {');
const end = runtime.indexOf('  function create(options) {', begin);
assert.ok(begin >= 0 && end > begin);

function fixture() {
  class Target {
    constructor() { this.listeners = new Map(); this.attrs = new Map(); this.classes = new Set(); this.classList = { toggle: (n, value) => value ? this.classes.add(n) : this.classes.delete(n) }; }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    dispatchEvent(event) { for (const fn of [...this.listeners.get(event.type) || []]) fn(event); }
    getAttribute(n) { return this.attrs.get(n) ?? null; }
    setAttribute(n, value) { this.attrs.set(n, value); }
    removeAttribute(n) { this.attrs.delete(n); }
  }
  class Select {}
  let now = 1000, serial = 0;
  const timers = new Map();
  const document = new Target(); document.documentElement = new Target();
  const context = vm.createContext({ ExpMenuPreferences:{bindMenuSize:()=>()=>{}}, document, HTMLSelectElement: Select, Event: class { constructor(type) { this.type = type; } }, Date: { now: () => now }, setTimeout(fn) { const id = ++serial; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); } });
  vm.runInContext('const menuControllers = new WeakMap();\n' + runtime.slice(begin, end) + '\nthis.create = createMenuController;', context);
  const create = (id, settings = {}, extra = {}) => {
    const host = new Target(), panel = new Target(), shadow = { activeElement: null };
    let controller; const closes = [];
    const options = { id, host, panel, shadow, getSettings: () => settings, setOpen(value, focus) { closes.push([value, focus]); controller.state(value); }, ...extra };
    controller = context.create(options);
    return { controller, host, panel, shadow, closes, options };
  };
  const pointer = (trusted = true, route = []) => document.dispatchEvent({ type: 'pointerdown', isTrusted: trusted, composedPath: () => route });
  return { context, create, document, Select, timers, pointer, advance(ms) { now += ms; }, now: () => now };
}

test('custom shell controller preserves nodes and mounts only once', () => {
  const f = fixture(), p = f.create('dropper');
  assert.equal(f.context.create(p.options), p.controller);
  assert.equal(f.document.listeners.get('pointerdown').size, 1);
  assert.equal(p.controller.idleTimeoutMs, 15000);
  assert.equal(p.controller.isOpen, false);
  p.controller.state(true);
  assert.equal(p.panel.classes.has('fl-rail-open'), true);
  assert.equal(f.document.documentElement.getAttribute('data-exp-open-menu'), 'dropper');
  assert.equal(p.controller.dismissAt, f.now() + 15000);
  assert.equal(p.controller.timerActive, true);
});

test('opening another product closes the previous custom menu without erasing the new owner', () => {
  const f = fixture(), a = f.create('dropper'), b = f.create('shift');
  a.controller.state(true); b.controller.state(true);
  assert.equal(a.controller.isOpen, false);
  assert.equal(b.controller.isOpen, true);
  assert.equal(f.document.documentElement.getAttribute('data-exp-open-menu'), 'shift');
  a.controller.destroy();
  assert.equal(f.document.documentElement.getAttribute('data-exp-open-menu'), 'shift');
  b.controller.state(false);
  assert.equal(f.document.documentElement.getAttribute('data-exp-open-menu'), null);
});

test('outside closing requires a trusted press outside the product host', () => {
  const f = fixture(), p = f.create('dropper'); p.controller.state(true);
  f.pointer(false); assert.equal(p.controller.isOpen, true);
  f.pointer(true, [p.host]); assert.equal(p.controller.isOpen, true);
  f.pointer(); assert.equal(p.controller.isOpen, false);
  assert.deepEqual(p.closes, [[false, false]]);
});

test('native selects and keepOpen protect custom surfaces on outside presses', () => {
  const f = fixture(); let keep = false;
  const p = f.create('dropper', {}, { keepOpen: () => keep }); p.controller.state(true);
  p.shadow.activeElement = new f.Select(); f.pointer(); assert.equal(p.controller.isOpen, true);
  p.shadow.activeElement = null; keep = true; f.pointer(); assert.equal(p.controller.isOpen, true);
  keep = false; f.pointer(); assert.equal(p.controller.isOpen, false);
});

test('activity resets the shared deadline and late enforcement closes only once', () => {
  const f = fixture(), p = f.create('dropper'); p.controller.state(true);
  const first = p.controller.dismissAt;
  f.advance(1000); p.panel.dispatchEvent({ type: 'input' });
  assert.equal(p.controller.dismissAt, first + 1000);
  assert.equal(p.controller.enforceDeadline(first), false);
  assert.equal(p.controller.enforceDeadline(first + 1000), true);
  assert.equal(p.controller.enforceDeadline(first + 2000), false);
  assert.equal(p.controller.dismissAt, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(p.closes.length, 1);
});

test('disabled auto-close schedules no timer and can be enabled at runtime', () => {
  const f = fixture(), settings = { menuAutoClose: false }, p = f.create('dropper', settings);
  p.controller.state(true); assert.equal(p.controller.dismissAt, 0);
  assert.equal(p.controller.enforceDeadline(f.now() + 999999), false);
  settings.menuAutoClose = true; p.controller.scheduleDismiss(); assert.equal(f.timers.size, 1);
  settings.menuAutoClose = false; p.controller.scheduleDismiss(); assert.equal(f.timers.size, 0);
  assert.equal(p.controller.isOpen, true);
});

test('destroy removes interaction listeners, deadlines and this product ownership', () => {
  const f = fixture(), p = f.create('dropper'); p.controller.state(true);
  const pending = [...f.timers.values()][0]; p.controller.destroy(); p.controller.destroy();
  assert.equal(f.document.listeners.get('pointerdown').size, 0);
  assert.equal(f.document.listeners.get('exp-core:menu-open').size, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.document.documentElement.getAttribute('data-exp-open-menu'), null);
  f.advance(20000); pending(); f.pointer(); p.controller.state(true);
  assert.equal(p.closes.length, 0);
  assert.equal(p.controller.isOpen, false);
});

test('outside-close opt-out and configuration validation remain explicit', () => {
  const f = fixture(), p = f.create('dropper', {}, { closeOnOutsidePointer: false });
  p.controller.state(true); f.pointer(); assert.equal(p.controller.isOpen, true);
  assert.throws(() => f.context.create({}), /Incomplete menu controller/);
});

test('Core-native chrome delegates to the same interaction controller', () => {
  const native = runtime.slice(runtime.indexOf('  function create(options) {'), runtime.indexOf('  function createReleaseUpdateChecker('));
  assert.match(native, /createMenuController\(\{ \.\.\.options/);
  assert.doesNotMatch(native, /data-exp-open-menu|on\(document,\s*['"]pointerdown/);
  assert.match(native, /menuController\.destroy\(\)/);
});
