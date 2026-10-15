/* Canonical ExtraPotions shared lifecycle runtime. */
function createProductLifecycle(shared) {
  const VERSION = shared.version;
  const PROTOCOL = 'exp-core-coordination-v1';
  const CAPABILITIES = new Set(['lifecycle', 'settings', 'diagnostics', 'dom-scheduler', 'navigation', 'launcher', 'ui']);
  const products = new Map();
  const cleanups = new Set();
  const errors = [];
  const metrics = { batches: 0, roots: 0, startedAt: Date.now() };
  let coordinator;
  const navigationSubscribers = new Set();
  let stopNavigationHooks;
  let suiteControlCleanup;

  function compareVersions(left, right) {
    const a = String(left).split(/[.-]/).slice(0, 3).map((part) => Number(part) || 0);
    const b = String(right).split(/[.-]/).slice(0, 3).map((part) => Number(part) || 0);
    for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
    return 0;
  }

  function negotiate(peerVersion, peerProtocol = PROTOCOL) {
    if (peerProtocol !== PROTOCOL || !/^\d+\.\d+\.\d+/.test(peerVersion || '')) return { compatible: false, selection: 'isolated', reason: 'PROTOCOL_INCOMPATIBLE' };
    const comparison = compareVersions(VERSION, peerVersion);
    return { compatible: true, selection: comparison < 0 ? 'peer-newer' : comparison > 0 ? 'local-newer' : 'equal', reason: 'COMPATIBLE' };
  }

  const safeError = (error, source = 'core') => {
    const message = String(error && error.message || error || 'Unknown error').replace(/https?:\/\/\S+/g, '[url]').slice(0, 180);
    errors.push({ source, code: error && error.code || 'UNEXPECTED', message, at: Date.now() });
    if (errors.length > 12) errors.shift();
  };

  function ensureCoordinator() {
    if (!document.documentElement) return null;
    coordinator = document.querySelector('[data-exp-core-coordinator="1"]');
    if (!coordinator) {
      coordinator = document.createElement('meta');
      coordinator.dataset.expCoreCoordinator = '1';
      coordinator.dataset.protocol = PROTOCOL;
      coordinator.dataset.protocolVersion = '1';
      document.documentElement.append(coordinator);
    }
    const selected = coordinator.dataset.activeCoreVersion;
    if (!selected || compareVersions(VERSION, selected) > 0) coordinator.dataset.activeCoreVersion = VERSION;
    return coordinator;
  }

  function announce(type, detail = {}) {
    const node = ensureCoordinator();
    if (!node) return;
    const payload = { protocol: PROTOCOL, protocolVersion: 1, coreVersion: VERSION, type, ...detail };
    document.dispatchEvent(new CustomEvent('exp-core:coordination', { detail: payload }));
  }

  function publishProduct(manifest, state) {
    const node = ensureCoordinator();
    if (!node) return;
    const key = `product${manifest.id.replace(/[^a-z0-9]/gi, '')}`;
    node.dataset[key] = JSON.stringify({ id: manifest.id, version: manifest.version, state, capabilities: manifest.capabilities });
    announce('product-state', { productId: manifest.id, productVersion: manifest.version, state });
  }

  function validateManifest(manifest) {
    if (!manifest || !/^[a-z][a-z0-9-]+$/.test(manifest.id || '')) throw Object.assign(new Error('Invalid product ID'), { code: 'MANIFEST_ID' });
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version || '')) throw Object.assign(new Error('Invalid product version'), { code: 'MANIFEST_VERSION' });
    if (!Array.isArray(manifest.capabilities)) throw Object.assign(new Error('Capabilities must be an array'), { code: 'MANIFEST_CAPABILITIES' });
    const missing = manifest.capabilities.filter((item) => !CAPABILITIES.has(item));
    if (missing.length) throw Object.assign(new Error(`Missing Core capability: ${missing.join(', ')}`), { code: 'CAPABILITY_MISSING' });
  }

  function register(manifest, hooks) {
    validateManifest(manifest);
    if (products.has(manifest.id)) return products.get(manifest.id).public;
    const record = { manifest: Object.freeze({ ...manifest }), hooks, state: 'registered', queue: Promise.resolve(), desiredEnabled: false };
    const transition = (allowed, next, action) => {
      record.queue = record.queue.catch(() => {}).then(async () => {
        if (!allowed.includes(record.state)) return;
        try {
          if(next==='enabled'&&shared.suiteSitePaused?.()){record.state='disabled';publishProduct(record.manifest,'disabled');return;}
          await action?.();
          record.state = next;
          publishProduct(record.manifest, next);
        } catch (error) {
          record.state = 'failed';
          safeError(error, manifest.id);
          publishProduct(record.manifest, 'failed');
          throw error;
        }
      });
      return record.queue;
    };
    const enable = () => {
      record.desiredEnabled = true;
      if (shared.suiteSitePaused?.()) return transition(['initialized'], 'disabled');
      return transition(['initialized', 'disabled'], 'enabled', hooks.enable);
    };
    const disable = () => { record.desiredEnabled = false; return transition(['enabled'], 'disabled', hooks.disable); };
    record.public = Object.freeze({
      manifest: record.manifest,
      get state() { return record.state; },
      initialize: () => transition(['registered', 'failed'], 'initialized', hooks.initialize),
      enable,
      disable,
      cleanup: () => transition(['registered', 'initialized', 'enabled', 'disabled', 'failed'], 'cleaned', hooks.cleanup)
    });
    products.set(manifest.id, record);
    if (!suiteControlCleanup && typeof shared.onSuiteEvent === 'function') {
      suiteControlCleanup = shared.onSuiteEvent((event) => {
        if (event.type !== 'suite.site-control' || event.detail?.hostname !== String(location.hostname || 'local-document').toLowerCase()) return;
        for (const item of products.values()) {
          item.queue=item.queue.catch(()=>{}).then(async()=>{const paused=shared.suiteSitePaused?.();try{if(paused&&item.state==='enabled'){await item.hooks.disable?.();item.state='disabled';publishProduct(item.manifest,'disabled');}else if(!paused&&item.desiredEnabled&&item.state==='disabled'){await item.hooks.enable?.();item.state='enabled';publishProduct(item.manifest,'enabled');}}catch(error){item.state='failed';safeError(error,item.manifest.id);publishProduct(item.manifest,'failed');}});
        }
      }, { type: 'suite.site-control' });
      cleanups.add(() => { suiteControlCleanup?.(); suiteControlCleanup = null; });
    }
    publishProduct(record.manifest, 'registered');
    return record.public;
  }

  function createScheduler(callback, options = {}) {
    let observer;
    let sharedObserverCleanup;
    let frame = 0;
    let active = false;
    const roots = new Set();
    const flush = () => {
      frame = 0;
      if (!active || !roots.size) return;
      const batch = [...roots];
      roots.clear();
      metrics.batches += 1;
      metrics.roots += batch.length;
      try { callback(batch); } catch (error) { safeError(error, options.source || 'scheduler'); }
    };
    const queueRoot = (root) => {
      if (!active || !root || root.closest?.('[data-exp-owned="1"]')) return false;
      const target = root.nodeType === Node.TEXT_NODE ? root.parentElement : root;
      if (!target) return false;
      roots.add(target);
      return true;
    };
    const schedule = (root) => {
      if (!queueRoot(root)) return;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const startDedicatedObserver = () => {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const target = mutation.target?.nodeType === Node.TEXT_NODE ? mutation.target.parentElement : mutation.target;
          if (!target) continue;
          if (target.closest?.('[data-exp-owned="1"]')) continue;
          if (mutation.type === 'childList') {
            const changed = [...mutation.addedNodes, ...mutation.removedNodes];
            if (changed.length && changed.every((node) => node.nodeType === 1 && (node.matches?.('[data-exp-owned="1"]') || node.closest?.('[data-exp-owned="1"]')))) continue;
          }
          schedule(target);
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: Boolean(options.attributes),
        characterData: Boolean(options.characterData),
        attributeFilter: options.attributeFilter
      });
    };
    return Object.freeze({
      start() {
        if (active) return;
        active = true;
        if (!options.attributes && typeof shared.observePageBatch === 'function') {
          const productId = options.source || 'scheduler';
          const phase = options.phase || shared.suiteContract?.(productId)?.presentationPhases?.[0] || 'observe';
          sharedObserverCleanup = shared.observePageBatch((batch, batchRoots, details) => {
            for (let index = 0; index < batchRoots.length; index += 1) {
              const types = Array.isArray(details?.[index]?.types) ? details[index].types : [];
              if (!options.characterData && types.length && types.every(type => type === 'characterData')) continue;
              queueRoot(batchRoots[index]);
            }
            if (roots.size) {
              if (frame) { cancelAnimationFrame(frame); frame = 0; }
              flush();
            }
          }, { productId, phase });
        } else if (!options.attributes && typeof shared.observePage === 'function') {
          sharedObserverCleanup = shared.observePage((batch, root) => {
            const types = Array.isArray(batch?.types) ? batch.types : [];
            if (!options.characterData && types.length && types.every(type => type === 'characterData')) return;
            schedule(root);
          }, { productId: options.source || 'scheduler' });
        } else {
          startDedicatedObserver();
        }
        schedule(document.documentElement);
      },
      stop() {
        active = false;
        sharedObserverCleanup?.();
        sharedObserverCleanup = null;
        observer?.disconnect();
        observer = null;
        roots.clear();
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      },
      schedule,
      flush
    });
  }

  function onNavigation(callback) {
    if (typeof callback !== 'function') throw new TypeError('Navigation callback must be a function');
    if (typeof shared.observeNavigation === 'function') {
      let disposed = false;
      const stop = shared.observeNavigation(event => callback({
        href: event.href,
        kind: event.kind,
        epoch: event.epoch,
      }), { owner: 'lifecycle' });
      const cleanup = () => {
        if (disposed) return;
        disposed = true;
        stop();
        cleanups.delete(cleanup);
      };
      cleanups.add(cleanup);
      return cleanup;
    }
    let previous=location.href;
    const subscriber=({href})=>{if(href!==previous){previous=href;callback({href});}};
    if (!stopNavigationHooks) {
      const originals={},wrappers={};
      const check=()=>{const href=location.href;for(const notify of [...navigationSubscribers])notify({href});};
      for(const name of ['pushState','replaceState']){const original=history[name];originals[name]=original;const wrapped=function(...args){const result=Reflect.apply(original,this,args);check();return result;};wrappers[name]=wrapped;history[name]=wrapped;}
      addEventListener('popstate',check);addEventListener('hashchange',check);globalThis.navigation?.addEventListener('currententrychange',check);
      stopNavigationHooks=()=>{for(const name of Object.keys(wrappers))if(history[name]===wrappers[name])history[name]=originals[name];removeEventListener('popstate',check);removeEventListener('hashchange',check);globalThis.navigation?.removeEventListener('currententrychange',check);stopNavigationHooks=null;};
    }
    navigationSubscribers.add(subscriber);
    let disposed=false;
    const cleanup=()=>{if(disposed)return;disposed=true;navigationSubscribers.delete(subscriber);cleanups.delete(cleanup);if(!navigationSubscribers.size)stopNavigationHooks?.();};
    cleanups.add(cleanup);return cleanup;
  }


  function protectLauncherHost(host) { return shared.reference.protectLauncherHost(host); }

  function registerLauncher(host, options) { const cleanup = shared.registerLauncher(host, options); cleanups.add(cleanup); return cleanup; }

  function pageView() {
    try { if (typeof unsafeWindow !== 'undefined' && unsafeWindow?.document) return unsafeWindow; } catch {}
    return window;
  }

  function isShadowRoot(node) {
    return Boolean(node && node.nodeType === 11 && node.host);
  }

  // Every stylesheet Core injects begins with an empty marker rule. A constructed sheet
  // has no owner node, and a tool such as SHIFT cannot see a JavaScript flag across
  // userscript sandboxes, but it can always read the first rule through the CSSOM.
  const OWNED_SHEET_MARKER = '.exp-owned-sheet-marker{}';
  const ensureMarker = (text) => { const value = String(text || ''); return value.startsWith(OWNED_SHEET_MARKER) ? value : OWNED_SHEET_MARKER + value; };

  function appendShadowStyle(root, css, data) {
    const node = document.createElement('style');
    try { node.textContent = ensureMarker(css); } catch (error) { safeError(error, 'core.style'); }
    node.dataset.expOwned = '1';
    for (const [key, value] of Object.entries(data || {})) node.dataset[key] = String(value);
    root.append(node);
    return node;
  }

  function paintToken() {
    return `expink${Math.random().toString(36).slice(2, 10)}`;
  }

  function withPaintProbe(css, token) {
    css = ensureMarker(css);
    return `${css}\n[data-${token}]{color:rgb(1, 2, 3)!important}`;
  }

  function isConnectedNode(node) {
    try { return Boolean(node && (node.isConnected || node.host?.isConnected)); } catch { return false; }
  }

  function sheetHasRules(sheet) {
    try { return sheet.cssRules.length > 0; } catch { return null; }
  }

  function sawPaint(token, parent) {
    if (!parent || !isConnectedNode(parent)) return false;
    const probe = document.createElement('span');
    probe.setAttribute(`data-${token}`, '');
    parent.append(probe);
    let painted = false;
    try { painted = getComputedStyle(probe).color === 'rgb(1, 2, 3)'; } catch {}
    try { probe.remove(); } catch { probe.parentNode?.removeChild(probe); }
    return painted;
  }

  function writeSheet(sheet, text, view) {
    const source = ensureMarker(text);
    try { sheet.replaceSync(source); return; } catch {}
    view.Function('sheet', 'css', 'sheet.replaceSync(css)')(sheet, source);
  }

  function setAdopted(host, sheets) {
    try { host.adoptedStyleSheets = sheets; return; } catch {}
    const view = pageView();
    const proto = isShadowRoot(host) ? (view.ShadowRoot || ShadowRoot).prototype : (view.Document || Document).prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'adoptedStyleSheets');
    if (!desc?.set) throw new Error('adoptedStyleSheets unavailable');
    desc.set.call(host, sheets);
  }

  function adoptConstructable(host, css, shadow) {
    const view = pageView();
    const Ctor = view.CSSStyleSheet || (typeof CSSStyleSheet === 'function' ? CSSStyleSheet : null);
    if (typeof Ctor !== 'function' || !Ctor.prototype.replaceSync) return null;
    const current = host.adoptedStyleSheets;
    if (!current || typeof current[Symbol.iterator] !== 'function') return null;
    const sheet = new Ctor();
    const token = paintToken();
    writeSheet(sheet, withPaintProbe(css, token), view);
    const before = current.length;
    setAdopted(host, [...current, sheet]);
    const sample = shadow || host.documentElement || host;
    if (host.adoptedStyleSheets.length !== before + 1) {
      try { setAdopted(host, [...host.adoptedStyleSheets].filter((item) => item !== sheet)); } catch {}
      throw new Error('adoptedStyleSheets ignored');
    }
    const painted = isConnectedNode(sample) ? sawPaint(token, sample) : sheetHasRules(sheet) !== false;
    if (!painted) {
      try { setAdopted(host, [...host.adoptedStyleSheets].filter((item) => item !== sheet)); } catch {}
      throw new Error('adoptedStyleSheets did not paint');
    }
    writeSheet(sheet, css, view);
    return {
      sheet,
      write: (text) => writeSheet(sheet, text, view),
      detach() {
        try { setAdopted(host, [...host.adoptedStyleSheets].filter((item) => item !== sheet)); } catch {}
      }
    };
  }

  // Shadow roots share one constructed sheet per stylesheet text. Paint is probed once per
  // page: every probe forces a style recalculation of the whole page, which on a site with
  // thousands of components (Reddit) cost seconds. Later roots only check that their adopted
  // list took the sheet. A root that edits its style gets its own copy first.
  const sharedShadowSheets = new Map();
  // null until the first connected root answers; false sends every later root to the fallback.
  let shadowAdoptionPaints = null;

  function withoutOne(list, sheet, replacement) {
    const next = [...list];
    const index = next.lastIndexOf(sheet);
    if (index >= 0) { if (replacement) next[index] = replacement; else next.splice(index, 1); }
    return next;
  }

  function adoptionPaints(root, Ctor, view) {
    const token = paintToken();
    const probe = new Ctor();
    writeSheet(probe, withPaintProbe('', token), view);
    setAdopted(root, [...root.adoptedStyleSheets, probe]);
    try { return sawPaint(token, root); } finally { try { setAdopted(root, withoutOne(root.adoptedStyleSheets, probe)); } catch {} }
  }

  function adoptShared(root, css) {
    const view = pageView();
    const Ctor = view.CSSStyleSheet || (typeof CSSStyleSheet === 'function' ? CSSStyleSheet : null);
    if (typeof Ctor !== 'function' || !Ctor.prototype.replaceSync) return null;
    const current = root.adoptedStyleSheets;
    if (!current || typeof current[Symbol.iterator] !== 'function') return null;
    if (shadowAdoptionPaints === false) throw new Error('adoptedStyleSheets did not paint');
    let entry = sharedShadowSheets.get(css);
    if (!entry) {
      const created = new Ctor();
      writeSheet(created, css, view);
      entry = { sheet: created, users: 0 };
    }
    let sheet = entry.sheet;
    const before = current.length;
    setAdopted(root, [...current, sheet]);
    if (root.adoptedStyleSheets.length !== before + 1) {
      try { setAdopted(root, withoutOne(root.adoptedStyleSheets, sheet)); } catch {}
      throw new Error('adoptedStyleSheets ignored');
    }
    if (shadowAdoptionPaints === null && isConnectedNode(root)) {
      let painted = false;
      try { painted = adoptionPaints(root, Ctor, view); } catch {}
      shadowAdoptionPaints = painted;
      if (!painted) {
        try { setAdopted(root, withoutOne(root.adoptedStyleSheets, sheet)); } catch {}
        throw new Error('adoptedStyleSheets did not paint');
      }
    }
    entry.users += 1;
    sharedShadowSheets.set(css, entry);
    let shared = true;
    const release = () => {
      if (!shared) return;
      shared = false;
      entry.users -= 1;
      if (entry.users <= 0 && sharedShadowSheets.get(css) === entry) sharedShadowSheets.delete(css);
    };
    return {
      write(text) {
        if (!shared) { writeSheet(sheet, text, view); return; }
        const own = new Ctor();
        writeSheet(own, text, view);
        const list = [...root.adoptedStyleSheets];
        // A component that reassigned its list dropped the shared copy; the edit still lands.
        setAdopted(root, list.includes(sheet) ? withoutOne(list, sheet, own) : [...list, own]);
        release();
        sheet = own;
      },
      detach() {
        try { setAdopted(root, withoutOne(root.adoptedStyleSheets, sheet)); } catch {}
        release();
      }
    };
  }

  function injectShadowStyle(root, css, data) {
    const mark = (node) => {
      node.dataset.expOwned = '1';
      for (const [key, value] of Object.entries(data || {})) node.dataset[key] = String(value);
      return node;
    };
    const fail = (error) => safeError(Object.assign(error || new Error('Style injection failed'), { code: 'STYLE_INJECTION' }), 'core.style');
    // Adopted sheets stay inside the shadow and still apply when the page CSP
    // blocks <style>. GM_addElement / GM_addStyle are not used here: managers
    // attach those to the document and leak header/nav/button/* onto the site.
    try {
      const adopted = adoptShared(root, css);
      if (adopted) {
        const node = document.createElement('style');
        let current = css;
        Object.defineProperty(node, 'textContent', {
          configurable: true,
          enumerable: true,
          get() { return current; },
          set(value) {
            current = String(value || '');
            try { adopted.write(current); } catch (error) { fail(error); }
          }
        });
        node.remove = () => {
          try { adopted.detach(); } catch {}
          if (node.parentNode) node.parentNode.removeChild(node);
        };
        try { root.append(node); } catch {}
        return mark(node);
      }
    } catch (error) { fail(error); }
    return appendShadowStyle(root, css, data);
  }

  function injectStyle(root, cssText, data = {}) {
    const css = String(cssText || '');
    if (isShadowRoot(root)) return injectShadowStyle(root, css, data);
    const isShadow = false;
    const view = pageView();
    const doc = view.document || document;
    const parent = isShadow ? root : (doc.documentElement || doc.head || doc.body);
    const host = isShadow ? root : doc;
    const sample = isShadow ? root : (doc.body || doc.documentElement);
    const mark = (node) => {
      node.dataset.expOwned = '1';
      for (const [key, value] of Object.entries(data || {})) node.dataset[key] = String(value);
      return node;
    };
    const fail = (error) => safeError(Object.assign(error || new Error('Style injection failed'), { code: 'STYLE_INJECTION' }), 'core.style');
    const handle = (write, detach) => {
      const node = document.createElement('style');
      let current = css;
      Object.defineProperty(node, 'textContent', {
        configurable: true,
        enumerable: true,
        get() { return current; },
        set(value) {
          current = String(value || '');
          try { write(current); } catch (error) { fail(error); }
        }
      });
      node.remove = () => {
        try { detach(); } catch {}
        if (node.parentNode) node.parentNode.removeChild(node);
      };
      parent.append(node);
      return mark(node);
    };
    try {
      if (typeof GM_addElement === 'function') {
        const token = paintToken();
        let live = GM_addElement(parent, 'style', { textContent: withPaintProbe(css, token) });
        if (live && sawPaint(token, sample)) {
          try { live.textContent = ensureMarker(css); } catch {}
          return handle(
            (text) => {
              try { live.textContent = ensureMarker(text); } catch {
                const next = GM_addElement(parent, 'style', { textContent: ensureMarker(text) });
                try { live.remove(); } catch {}
                live = next;
              }
            },
            () => { try { live.remove(); } catch {} }
          );
        }
        try { live?.remove(); } catch {}
      }
    } catch (error) { fail(error); }
    try {
      if (!isShadow && typeof GM_addStyle === 'function') {
        const token = paintToken();
        let live = GM_addStyle(withPaintProbe(css, token));
        if (live && sawPaint(token, sample)) {
          try { live.textContent = ensureMarker(css); } catch {}
          return handle(
            (text) => {
              try { live.textContent = ensureMarker(text); } catch { live = GM_addStyle(ensureMarker(text)); }
            },
            () => { try { live.remove(); } catch {} }
          );
        }
        try { live?.remove(); } catch {}
      }
    } catch (error) { fail(error); }
    try {
      const adopted = adoptConstructable(host, css, sample);
      if (adopted) return handle((text) => adopted.write(text), () => adopted.detach());
    } catch (error) { fail(error); }
    const node = document.createElement('style');
    try { node.textContent = ensureMarker(css); } catch (error) { fail(error); }
    parent.append(node);
    return mark(node);
  }

  function diagnosticSnapshot() {
    return {
      core: { version: VERSION, protocol: PROTOCOL, capabilities: [...CAPABILITIES] },
      products: [...products.values()].map(({ manifest, state }) => ({ id: manifest.id, version: manifest.version, state })),
      metrics: { ...metrics, uptimeMs: Date.now() - metrics.startedAt },
      errors: errors.map(({ source, code, message }) => ({ source, code, message }))
    };
  }

  function focusMenuSurface(surface) { if (!(surface instanceof HTMLElement)) return false; if (!surface.hasAttribute('tabindex')) surface.setAttribute('tabindex', '-1'); surface.style.outline='none'; surface.focus({ preventScroll: true }); return true; }

  addEventListener('pagehide', () => { for (const cleanup of cleanups) { try { cleanup(); } catch {} } }, { once: true });
  return Object.freeze({
    VERSION, PROTOCOL, register, createScheduler, onNavigation, registerLauncher, announce, negotiate, safeError,
    diagnosticSnapshot, diagnostics: diagnosticSnapshot, focusMenuSurface, injectStyle,
    registerFloatingNotice: shared.registerFloatingNotice,
    layoutFloatingNotices: shared.layoutFloatingNotices,
    claimNotice: shared.claimNotice,
    consumeVersionChange: shared.consumeVersionChange,
  });
}
