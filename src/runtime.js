// Product-neutral host for the code extracted from Dropper 3.3.2.
// Product engines own their settings, content, and actions. Core owns shared UI.
const ExtraPotionsCore = (() => {
  'use strict';
  const version = '3.3.2';
  const sourceVersion = '3.3.2';
  const protocol = 'exp-core-coordination-v1';
  const gridProtocol = 'exp-launcher-grid-v3';
  const GRID_ORDER = 'exp:v3:launcher-order';
  const GRID_DELTA = 'exp:v3:launcher-grid-delta';
  const PRIORITY = { shift: 100, dropper: 90, ward: 60, prisma: 40 };
  const THEME_PRIORITY = { dropper: 4, shift: 3, prisma: 2, ward: 1 };
  const registrations = new WeakMap();
  const floatingNoticeRegistrations = new WeakMap();
  const controllers = new WeakMap();
  const tokenNames = ['bg', 'panel', 'line', 'text', 'muted', 'accent', 'accent2'];
  function menuWidthForMode(mode = 'compact', fullWidth = 312) {
    if (mode === 'narrow') return 220;
    if (mode === 'compact') return 260;
    const full = Number(fullWidth);
    return Number.isFinite(full) ? Math.max(280, Math.min(full, 340)) : 312;
  }
  const partIds = {
    'tdh-tools-dock': 'dock', 'tdh-settings-launcher': 'launcher',
    'tdh-rail-title': 'title', 'tdh-header-version': 'version',
    'tdh-rail-subtitle': 'subtitle', 'tdh-rail-close': 'close',
    'tdh-opacity-range': 'opacity-range', 'tdh-opacity-value': 'opacity-value'
  };
  const canonicalCss = Object.entries(partIds).reduce((css, [id, part]) =>
    css.replaceAll('#' + id, '[data-exp-part="' + part + '"]'), DropperReference.css())
    .replaceAll('.cluster', '.exp-core-theme');
  const compositionCss = `
    :host{color-scheme:dark}
    [data-exp-part="launcher"]{box-sizing:border-box!important;width:48px!important;min-width:48px!important;max-width:48px!important;height:48px!important;min-height:48px!important;max-height:48px!important}
    [data-exp-part="launcher"] .launcher-icon{width:40px!important;height:40px!important}
    .header-icon{width:38px!important;height:38px!important}
    .header-icon .menu-icon{width:38px!important;height:38px!important}
    :host([data-exp-theme-deprioritized="1"]) .theme-row:has(.exp-theme-swatches),:host([data-exp-theme-deprioritized="1"]) #mb-theme-dots{display:none!important}
    :host([data-exp-theme-deprioritized="1"]) #mb-cluster{--mb-bg:var(--theme-bg)!important;--mb-surface:var(--theme-panel)!important;--mb-chip:var(--theme-panel)!important;--mb-ink:var(--theme-text)!important;--mb-muted:var(--theme-muted)!important;--mb-line:var(--theme-line)!important;--mb-brand:var(--theme-accent)!important;--mb-brand-ink:var(--theme-bg)!important;--mb-hover:var(--theme-panel)!important;--mb-track:var(--theme-line)!important}
    [hidden]{display:none!important}
    .exp-core-theme{position:static;display:contents;color:var(--theme-text);font:13px/1.42 ui-sans-serif,system-ui,"Segoe UI",sans-serif}
    [data-exp-part="dock"],[data-exp-part="launcher"]{position:fixed}
    [data-exp-part="dock"]{color:var(--theme-text);scrollbar-width:thin}
    [data-exp-part="dock"] [data-exp-part="title"]{color:var(--theme-text)}
    button,input,select,textarea{font-family:inherit}
    button{color:inherit}
    button:disabled{opacity:.5;cursor:not-allowed}
    button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--theme-accent2);outline-offset:2px}
    button.fl-tool-header{width:100%;border:0;background:transparent;color:var(--theme-text);text-align:left;font:inherit}
    .fl-tool-header .fl-tool-chevron{font:11px/1.42 system-ui}
    .fl-tool-body[hidden]{display:none!important}
    .fl-tool-body>.group,.fl-tool-body>.section,.fl-tool-body>.flat-group{grid-column:1/-1;min-width:0}
    .fl-tool-body :is(.group,.section,.flat-group){display:grid!important;grid-template-columns:minmax(0,1fr)!important}
    .fl-tool-body :is(.group,.section,.flat-group)>*{grid-column:1/-1!important;min-width:0}
    .group,.section,.flat-group{margin:0;padding:0;border:0;background:transparent}
    .group>h3,.section>h3,.section>h2{margin:8px 0 3px;font-size:10px;font-weight:800;color:var(--theme-muted)}
    .group:first-child>h3,.section:first-child>h3{margin-top:6px}
    .group>.row,.section>.row,.flat-group>.row{min-width:0}
    .row>.copy,.row>.row-copy,.row>.setting-label,.row>div:first-child{min-width:0;flex:1}
    .label,.copy>strong,.row-copy>strong,.setting-label{font-size:11px;font-weight:500;line-height:1.25}
    .copy>.help,.row-copy>small,.help,.empty,.note,.meta{font-size:9px;line-height:1.4;color:var(--theme-muted)}
    .copy>.help,.row-copy>small{display:block;margin-top:3px}
    .toggleSwitch{padding:0;min-width:34px;max-width:34px;min-height:20px;max-height:20px}
    .toggleSwitch>span{display:none}
    .row>.life-btn,.mini-row>.life-btn{width:auto;min-width:50px;margin:0;padding:3px 7px}
    .row>select,.mini-row>select{max-width:55%}
    .button-grid,.actions,.profile-actions,.menu-footer,.diagnostics-controls>div,.rules-transfer{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;min-width:0}
    .button-grid>*{min-width:0}
    .life-btn.warn{border-color:#cb6868!important;background:#402020!important;color:#ffd7d7!important}
    input:not([type=file]),textarea{box-sizing:border-box;max-width:100%;min-width:0;border:1px solid var(--theme-line);border-radius:6px;background:var(--theme-bg);color:var(--theme-text);padding:5px 6px;font-size:11px}
    input[type=search],textarea{width:100%}
    .identity{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--theme-line)}
    .identity>.copy{flex:1;min-width:0}
    .identity-actions{display:flex;gap:6px;align-items:center}
    .identity-actions>.life-btn{width:auto;margin:0;padding:3px 6px}
    .theme-row{flex-wrap:wrap}
    .exp-theme-swatches{min-width:0}
    .appearance-group,.auth-advanced,.rule-card,.stat-card{grid-column:1/-1;min-width:0;border:1px solid var(--theme-line);border-radius:7px;margin-top:6px;padding:6px;background:var(--theme-bg)}
    summary{cursor:pointer;font-size:11px}
    .feature-pair,.category-grid{display:block}
    .status-value,output{font-size:10px;color:var(--theme-muted)}
    .live,.sr-only,.status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    .toast{position:fixed;z-index:2147483647;right:12px;max-width:calc(100vw - 24px)}
    .update-notice{position:fixed;z-index:2147483647}
    .diag{margin:6px 0 0}
    .diag[hidden]{display:none!important}
    .diag:not([hidden]){display:block}
    .ward-shell{display:contents}
    .utility-grid,.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    .workspace-actions{grid-column:1/-1}
    .setting-arrow,.step-btn{width:25px;min-height:25px;border:1px solid var(--theme-line);border-radius:6px;background:var(--theme-bg);color:var(--theme-text)}
    .step-value{flex:1;text-align:center;font-size:10px}
    .stepper{display:flex;align-items:center;gap:5px}
  `;
  const TOGGLE = ':is(.toggleSwitch,.switch,[role="switch"])';
  const TOGGLE_BG = 'var(--theme-bg,var(--dropper-bg,var(--bg,#111114)))';
  const TOGGLE_PANEL = 'var(--theme-panel,var(--dropper-panel,var(--panel,var(--surface,#18181d))))';
  const TOGGLE_LINE = 'var(--theme-line,var(--dropper-line,var(--line,var(--border,#41434d))))';
  const TOGGLE_MUTED = 'var(--theme-muted,var(--dropper-muted,var(--muted,#9aa0a6)))';
  const TOGGLE_TEXT = 'var(--theme-text,var(--dropper-text,var(--text,#f4f4f6)))';
  const TOGGLE_ACCENT = 'var(--theme-accent,var(--dropper-accent,var(--accent,var(--teal,#8b5cf6))))';
  const MATTE_TOGGLE_CHROME_CSS = `${TOGGLE}{position:relative!important;box-sizing:border-box!important;flex:none!important;width:34px!important;height:20px!important;min-width:34px!important;min-height:20px!important;padding:0!important;border:1px solid color-mix(in srgb,${TOGGLE_LINE} 88%,${TOGGLE_MUTED} 12%)!important;border-radius:6px!important;background:color-mix(in srgb,${TOGGLE_BG} 84%,${TOGGLE_PANEL} 16%)!important;background-image:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.018)!important;cursor:pointer!important}${TOGGLE}:not(:has(> span))::after{content:""!important;position:absolute!important;top:2px!important;left:2px!important;width:14px!important;height:14px!important;box-sizing:border-box!important;border:0!important;border-radius:4px!important;background:color-mix(in srgb,${TOGGLE_MUTED} 82%,${TOGGLE_TEXT} 18%)!important;box-shadow:none!important}${TOGGLE}>span{display:block!important;position:absolute!important;top:2px!important;left:2px!important;width:14px!important;height:14px!important;box-sizing:border-box!important;border:0!important;border-radius:4px!important;background:color-mix(in srgb,${TOGGLE_MUTED} 82%,${TOGGLE_TEXT} 18%)!important;box-shadow:none!important}${TOGGLE}[aria-checked="true"]{border-color:color-mix(in srgb,${TOGGLE_LINE} 52%,${TOGGLE_ACCENT} 48%)!important;background:color-mix(in srgb,${TOGGLE_PANEL} 72%,${TOGGLE_ACCENT} 28%)!important;background-image:none!important}${TOGGLE}[aria-checked="true"]:not(:has(> span))::after{transform:translateX(14px)!important;background:${TOGGLE_TEXT}!important}${TOGGLE}[aria-checked="true"]>span{transform:translateX(14px)!important;background:${TOGGLE_TEXT}!important}:host([data-ui-theme="pride"]) ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-ui-theme="pride"] ${TOGGLE}[aria-checked="true"],:host([data-theme-skin="gradient"]) ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-theme-skin="gradient"]:not([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"]{background-image:none!important;border-color:color-mix(in srgb,${TOGGLE_LINE} 52%,${TOGGLE_ACCENT} 48%)!important;background:color-mix(in srgb,${TOGGLE_PANEL} 72%,${TOGGLE_ACCENT} 28%)!important}:host([data-ui-theme="contrast"]) ${TOGGLE},:host([data-ui-theme="obsidian"]) ${TOGGLE},.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE},.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}{border:2px solid #fff!important;background:#050505!important;background-image:none!important}:host([data-ui-theme="contrast"]) ${TOGGLE}:not(:has(> span))::after,:host([data-ui-theme="obsidian"]) ${TOGGLE}:not(:has(> span))::after,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}:not(:has(> span))::after,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}:not(:has(> span))::after{top:0!important;left:0!important;border:1px solid #050505!important;background:#fff!important}:host([data-ui-theme="contrast"]) ${TOGGLE}>span,:host([data-ui-theme="obsidian"]) ${TOGGLE}>span,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}>span,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}>span{top:0!important;left:0!important;border:1px solid #050505!important;background:#fff!important}:host([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"],:host([data-ui-theme="obsidian"]) ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}[aria-checked="true"]{background:#fff!important;border-color:#fff!important;background-image:none!important}:host([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after,:host([data-ui-theme="obsidian"]) ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after{background:#050505!important;border-color:#fff!important;transform:translateX(14px)!important}:host([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"]>span,:host([data-ui-theme="obsidian"]) ${TOGGLE}[aria-checked="true"]>span,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}[aria-checked="true"]>span,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}[aria-checked="true"]>span{background:#050505!important;border-color:#fff!important;transform:translateX(14px)!important}@media (forced-colors: active){${TOGGLE}{forced-color-adjust:none;border:1px solid CanvasText!important;background:Canvas!important;background-image:none!important}${TOGGLE}:not(:has(> span))::after{border-color:CanvasText!important;background:CanvasText!important}${TOGGLE}>span{border-color:CanvasText!important;background:CanvasText!important}${TOGGLE}[aria-checked="true"]{border-color:Highlight!important;background:Highlight!important;background-image:none!important}${TOGGLE}[aria-checked="true"]:not(:has(> span))::after{border-color:HighlightText!important;background:HighlightText!important}${TOGGLE}[aria-checked="true"]>span{border-color:HighlightText!important;background:HighlightText!important}}`;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const emit = (type, productId) => document.dispatchEvent(new CustomEvent('exp-core:coordination', { detail: { protocol, type, productId } }));
  function menuThemeOwner() {
    return [...document.querySelectorAll('[data-exp-product-launcher="1"][data-product-id]')]
      .filter(node => node.isConnected && THEME_PRIORITY[node.dataset.productId])
      .sort((a,b) => THEME_PRIORITY[b.dataset.productId] - THEME_PRIORITY[a.dataset.productId])[0] || null;
  }
  function menuPalette(host) {
    if (host?.dataset.productId === 'dropper') {
      const selected = host.shadowRoot?.querySelector('#tdh-cluster')?.dataset.uiTheme;
      const theme = DropperReference.UI_THEMES.find(item => item.id === selected);
      if (theme) return theme;
    }
    try {
      const value = JSON.parse(host.dataset.expMenuPalette || 'null');
      if (!value || !['bg','panel','line','text','muted','accent','accent2'].every(key => /^#[0-9a-f]{3,8}$/i.test(value[key]))) return null;
      if (value.skin && (/url\(|var\(|;|\/\*/i.test(value.skin) || value.skin.length > 300)) return null;
      return value;
    } catch { return null; }
  }
  function publishMenuPalette(host, theme) {
    if (!host || !theme) return;
    const palette = Object.fromEntries([...tokenNames,'id','skin','skinVertical','skinMode'].map(key => [key, theme[key]]));
    const serialized = JSON.stringify(palette);
    if (host.dataset.expMenuPalette === serialized) return;
    host.dataset.expMenuPalette = serialized;
    emit('menu-theme', host.dataset.productId);
  }
  function injectStyle(shadow, css, data = {}) {
    const node = document.createElement('style');
    Object.assign(node.dataset, data);
    node.textContent = css;
    shadow.append(node);
    // Constructed sheets survive pages that block style elements. Keep the style
    // node as a fallback and as the editable public handle used by product code.
    let sheet;
    try { sheet = new CSSStyleSheet(); sheet.replaceSync(css); shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet]; } catch {}
    const observe = new MutationObserver(() => { if (sheet) { try { sheet.replaceSync(node.textContent); } catch {} } });
    observe.observe(node, { childList: true, characterData: true, subtree: true });
    node.dispose = () => { observe.disconnect(); if (sheet) shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets].filter(s => s !== sheet); node.remove(); };
    return node;
  }
  function resolveShadowRoot(target) {
    if (target instanceof ShadowRoot) return target;
    if (target instanceof Element) {
      if (target.shadowRoot instanceof ShadowRoot) return target.shadowRoot;
      const root = target.getRootNode?.();
      if (root instanceof ShadowRoot) return root;
    }
    return null;
  }
  function applyMatteToggleChrome(target) {
    const shadow = resolveShadowRoot(target);
    if (!shadow) return false;
    if (shadow.querySelector('style[data-exp-matte-toggle-chrome]')) return true;
    injectStyle(shadow, MATTE_TOGGLE_CHROME_CSS, { expMatteToggleChrome: '1' });
    return true;
  }
  function applyTwoColumnSettingsGrid(container) {
    if (!(container instanceof HTMLElement)) return false;
    const root = resolveShadowRoot(container);
    if (root && !root.querySelector('style[data-exp-settings-grid]')) {
      injectStyle(root, '[data-exp-settings-grid="two-column"]{display:grid!important;grid-template-columns:minmax(0,1fr)!important;align-items:stretch!important;column-gap:0!important}[data-exp-settings-grid="two-column"]>*{grid-column:1/-1!important;min-width:0!important}[data-exp-settings-grid="two-column"]>[data-exp-grid-cell="compact"]{grid-column:1/-1!important}', { expSettingsGrid: '1' });
    }
    container.dataset.expSettingsGrid = 'two-column';
    if (root) applyMatteToggleChrome(root);
    return true;
  }
  function applyContentDrivenMenuLayout(shadow) {
    if (!(shadow instanceof ShadowRoot)) return false;
    shadow.host.dataset.expContentDrivenMenu = '1';
    if (!shadow.querySelector('style[data-exp-content-driven-menu]')) {
      injectStyle(shadow, '.fl-tool-body .action.warn{border-color:#cb6868!important;background:#402020!important;color:#ffd7d7!important}.fl-tool-body .action.warn:hover{background:#582828!important;color:#fff!important}:host([data-exp-content-driven-menu="1"]) :is(.panel,.ward,#mb-dock,[data-exp-part="dock"]){height:auto!important;min-height:0!important}:host([data-exp-content-driven-menu="1"]) :is(.fl-tool-body,.panel-body,.route-body){height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}:host([data-exp-content-driven-menu="1"]) :is(.fl-tool-header,.panel-head,.route,.nav-item,.group>summary){height:auto!important;min-height:0!important;white-space:normal!important}:host([data-exp-content-driven-menu="1"]) :is(.fl-tool-title,.label,.setting-label,.setting-value,.copy strong,.copy .label){overflow:visible!important;text-overflow:clip!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important}:host([data-exp-content-driven-menu="1"]) :is(.row,.mini-row,.setting-row){height:auto!important;min-height:0!important;align-items:center!important}:host([data-exp-content-driven-menu="1"]) :is(.group,.section,.panel-body:not(.hidden)){grid-template-columns:minmax(0,1fr)!important}:host([data-exp-content-driven-menu="1"]) :is(.group,.section,.panel-body:not(.hidden))>*{grid-column:1/-1!important}.fl-tool-body .row:has(>select){display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)!important;min-width:0!important}.fl-tool-body .row>select{width:100%!important;min-width:0!important;max-width:100%!important}', { expContentDrivenMenu: '1' });
    }
    applyMatteToggleChrome(shadow);
    return true;
  }
  function layoutGrid() {
    const order = read(GRID_ORDER, []);
    const sorted = [...document.querySelectorAll('[data-exp-product-launcher="1"]')].sort((a,b) => {
      const ai = Array.isArray(order) ? order.indexOf(a.dataset.productId) : -1;
      const bi = Array.isArray(order) ? order.indexOf(b.dataset.productId) : -1;
      if (a.dataset.productId !== 'dropper' && b.dataset.productId !== 'dropper' && ai !== bi) return ai < 0 ? 1 : bi < 0 ? -1 : ai - bi;
      return Number(b.dataset.launcherPriority || 0) - Number(a.dataset.launcherPriority || 0) || a.dataset.productId.localeCompare(b.dataset.productId);
    });
    const dropper = sorted.find(node => node.dataset.productId === 'dropper');
    const products = sorted.filter(node => node !== dropper);
    const assign = (node, slot, span = 1) => {
      const row = Math.floor(slot / 3), column = slot % 3;
      Object.assign(node.dataset, { launcherSlot:String(slot), launcherRow:String(row), launcherColumn:String(column), launcherSpan:String(span) });
      node.style.setProperty('--exp-launcher-x', column * 56 + 'px');
      node.style.setProperty('--exp-launcher-y', row * 56 + 'px');
      node.style.setProperty('--exp-launcher-offset', row * 56 + 'px');
    };
    if (dropper) assign(dropper, 0);
    products.forEach((node, index) => assign(node, (dropper ? 1 : 0) + index));
    write(GRID_ORDER, products.map(node => node.dataset.productId));
  }
  function storageRead(key, fallback = null) {
    try { if (typeof GM_getValue === 'function') return GM_getValue(key, fallback); } catch {}
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function storageWrite(key, value) {
    try { if (typeof GM_setValue === 'function') { GM_setValue(key, value); return; } } catch {}
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  function claimNotice(productId, changeId) {
    const key = `exp:v3:${String(productId || 'product')}:notice:${String(changeId || 'change')}`;
    if (storageRead(key, false) === true) return false;
    storageWrite(key, true);
    return true;
  }
  function consumeVersionChange(productId, currentVersion, legacyKey = '') {
    const key = `exp:v3:${String(productId || 'product')}:installed-version`;
    let previous = String(storageRead(key, '') || '');
    if (!previous && legacyKey) { try { previous = String(localStorage.getItem(legacyKey) || ''); } catch {} }
    storageWrite(key, String(currentVersion || ''));
    return previous && previous !== currentVersion && claimNotice(productId, `updated:${currentVersion}`) ? previous : '';
  }
  function visibleFloatingNotices() {
    return [...document.querySelectorAll('[data-exp-product-launcher="1"][data-product-id]')]
      .flatMap(host => [...(host.shadowRoot?.querySelectorAll('[data-exp-floating-notice="1"]') || [])].map(notice => ({ host, notice })))
      .filter(({ notice }) => !notice.hidden && notice.getClientRects().length)
      .sort((a,b) => Number(a.host.dataset.launcherSlot || 0) - Number(b.host.dataset.launcherSlot || 0) || a.host.dataset.productId.localeCompare(b.host.dataset.productId));
  }
  function layoutFloatingNotices() {
    const launchers = [...document.querySelectorAll('[data-exp-product-launcher="1"][data-product-id]')]
      .map(host => host.shadowRoot?.querySelector('[data-exp-part="launcher"],.ward-launcher,.launcher,#tdh-settings-launcher'))
      .filter(Boolean).map(node => node.getBoundingClientRect()).filter(box => box.width && box.height);
    const notices = visibleFloatingNotices();
    if (!launchers.length || !notices.length) return;
    const anchor = document.documentElement.dataset.expLauncherAnchor === 'top' ? 'top' : 'bottom';
    const gridTop = Math.min(...launchers.map(box => box.top));
    const gridBottom = Math.max(...launchers.map(box => box.bottom));
    const gridRight = Math.max(...launchers.map(box => box.right));
    let cursor = anchor === 'top' ? gridBottom + 8 : gridTop - 8;
    for (const { notice } of notices) {
      const width = Math.min(notice.offsetWidth || notice.scrollWidth || 260, Math.max(0, innerWidth - 24));
      const height = notice.offsetHeight || notice.scrollHeight || 72;
      const top = anchor === 'top' ? cursor : cursor - height;
      notice.style.setProperty('width', `${width}px`, 'important');
      notice.style.setProperty('left', `${Math.max(8, Math.min(innerWidth - width - 8, gridRight - width))}px`, 'important');
      notice.style.setProperty('right', 'auto', 'important');
      notice.style.setProperty('top', `${Math.max(8, Math.min(innerHeight - height - 8, top))}px`, 'important');
      notice.style.setProperty('bottom', 'auto', 'important');
      cursor = anchor === 'top' ? top + height + 8 : top - 8;
    }
  }
  function registerFloatingNotice(host, notice) {
    if (!(host instanceof Element) || !(notice instanceof Element)) return () => {};
    if (floatingNoticeRegistrations.has(notice)) return floatingNoticeRegistrations.get(notice);
    notice.dataset.expFloatingNotice = '1';
    const refresh = () => requestAnimationFrame(layoutFloatingNotices);
    const mutation = new MutationObserver(refresh); mutation.observe(notice, { attributes:true, attributeFilter:['hidden','class'] });
    const resize = new ResizeObserver(refresh); resize.observe(notice);
    addEventListener('resize', refresh, { passive:true }); document.addEventListener('exp-core:coordination', refresh);
    const dispose = () => { mutation.disconnect(); resize.disconnect(); removeEventListener('resize', refresh); document.removeEventListener('exp-core:coordination', refresh); floatingNoticeRegistrations.delete(notice); };
    floatingNoticeRegistrations.set(notice, dispose); refresh(); return dispose;
  }
  function registerLauncher(host, options = {}) {
    if (registrations.has(host)) return registrations.get(host);
    const id = options.productId || options.id || host.dataset.productId;
    Object.assign(host.dataset, { expProductLauncher:'1', productId:id, launcherPriority:String(options.priority ?? PRIORITY[id] ?? 0) });
    applyMatteToggleChrome(host);
    const stopProtect = DropperReference.protectLauncherHost(host);
    let frame = 0;
    const refresh = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; layoutGrid(); controllers.get(host)?.layout(); }); };
    document.addEventListener('exp-core:coordination', refresh);
    addEventListener('resize', refresh);
    layoutGrid(); emit('launcher-added', id);
    const dispose = () => { stopProtect(); cancelAnimationFrame(frame); document.removeEventListener('exp-core:coordination', refresh); removeEventListener('resize', refresh); delete host.dataset.expProductLauncher; registrations.delete(host); layoutGrid(); emit('launcher-removed', id); };
    registrations.set(host, dispose);
    return dispose;
  }
  function themes(productTheme) {
    const common = DropperReference.UI_THEMES.filter(t => !['twitch', 'dropper'].includes(t.id));
    return Object.freeze([...common, DropperReference.CRIMSON_THEME, ...(productTheme ? [productTheme] : [DropperReference.UI_THEMES.at(-1)])].map(t => Object.freeze({ ...t, vars: Object.fromEntries(tokenNames.map(k => [k, t[k]])) })));
  }
  function createThemeSwatches({ container, themes: choices, value, onChange = () => {} }) {
    const root = resolveShadowRoot(container);
    if (root && !root.querySelector('style[data-exp-theme-swatches]')) {
      injectStyle(root, '.exp-theme-swatches{display:flex;align-items:center;gap:6px;min-height:28px;flex-wrap:wrap}.exp-theme-swatch{appearance:none;box-sizing:border-box!important;flex:0 0 22px!important;width:22px!important;height:22px!important;min-width:22px!important;min-height:22px!important;max-width:22px!important;max-height:22px!important;padding:0!important;border:2px solid var(--theme-line,var(--line,#41434d));border-radius:5px!important;cursor:pointer}.exp-theme-swatch:hover,.exp-theme-swatch:focus-visible{outline:2px solid var(--theme-accent,var(--accent,#8b5cf6));outline-offset:2px}.exp-theme-swatch.is-on{border-color:var(--theme-text,var(--text,#fff));box-shadow:0 0 0 2px var(--theme-accent,var(--accent,#8b5cf6))}', { expThemeSwatches: '1' });
      applyMatteToggleChrome(root);
    }
    container.classList.add('exp-theme-swatches'); container.setAttribute('role', 'radiogroup'); container.setAttribute('aria-label', 'Menu Theme');
    const buttons = choices.map(theme => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'exp-theme-swatch';
      for (const property of ['width','height','min-width','min-height','max-width','max-height']) button.style.setProperty(property, '22px', 'important');
      button.style.setProperty('border-radius', '5px', 'important');
      button.style.setProperty('padding', '0', 'important');
      button.style.setProperty('box-sizing', 'border-box', 'important');
      button.style.setProperty('flex', '0 0 22px', 'important');
      button.setAttribute('role', 'radio'); button.setAttribute('aria-label', theme.name); button.title = theme.name;
      button.dataset.theme = button.dataset.swatch = theme.id; button.style.background = theme.swatch;
      button.addEventListener('click', () => { paint(theme.id); onChange(theme.id); }); container.append(button); return button;
    });
    function paint(next) { value = next; buttons.forEach((b,i) => { const on = choices[i].id === value; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on || !choices.some(t => t.id === value) && i === 0 ? 0 : -1; }); }
    const keyboard = event => { const current = buttons.indexOf(event.target); if (current < 0 || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length; buttons[next].click(); buttons[next].focus(); };
    container.addEventListener('keydown', keyboard); paint(value);
    return { setValue: paint, destroy() { container.removeEventListener('keydown', keyboard); buttons.forEach(b => b.remove()); } };
  }
  function focusMenuSurface(panel) { if (!(panel instanceof HTMLElement)) return false; panel.tabIndex = -1; panel.style.outline = 'none'; panel.focus({ preventScroll: true }); return true; }
  function createFloatingNotice(options = {}) {
    const { shadow, panel, notice, versionButton = null } = options;
    const host = options.host || shadow?.host;
    if (!(shadow instanceof ShadowRoot) || !(panel instanceof Element) || !(notice instanceof Element)) return Object.freeze({ show() {}, hide() {}, toggle() {}, layout() {}, setMenuOpen() {}, destroy() {} });
    const durationMs = Math.max(0, Number(options.durationMs ?? 30000));
    const manageVersion = options.manageVersion !== false;
    let timer = 0, menuOpen = false, destroyed = false;
    if (!shadow.querySelector('style[data-exp-floating-notice]')) {
      injectStyle(shadow, '.exp-floating-update{position:fixed;z-index:2147483647;box-sizing:border-box;width:min(312px,calc(100vw - 24px));max-width:calc(100vw - 24px);margin:0;padding:10px 32px 10px 10px;border:1px solid var(--exp-notice-border,var(--dropper-accent,#6f42b4));border-radius:10px;background:linear-gradient(180deg,var(--exp-notice-top,#251a35),var(--exp-notice-bottom,#18181d) 70%);color:var(--exp-notice-text,#f4f4f6);box-shadow:0 10px 28px #0008;font:500 9px/1.45 system-ui,sans-serif}.exp-floating-update[hidden]{display:none!important}.exp-floating-update-dismiss{position:absolute;top:7px;right:7px;width:23px;height:23px;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;color:inherit;cursor:pointer;font:15px/1 Arial,sans-serif}.exp-floating-update-dismiss:hover,.exp-floating-update-dismiss:focus-visible{border-color:var(--exp-notice-border,var(--dropper-accent,#6f42b4));outline:none}', { expFloatingNotice: '1' });
    }
    applyMatteToggleChrome(shadow);
    notice.classList.add('update-notice','exp-floating-update'); notice.setAttribute('role','status');
    let dismiss = notice.querySelector(':scope > .exp-floating-update-dismiss');
    if (!dismiss) { dismiss=document.createElement('button'); dismiss.type='button'; dismiss.className='exp-floating-update-dismiss'; dismiss.setAttribute('aria-label','Dismiss changelog'); dismiss.textContent='×'; notice.prepend(dismiss); }
    shadow.append(notice); const unregisterNotice = registerFloatingNotice(host, notice);
    const themeSource = options.themeSource instanceof Element ? options.themeSource : panel;
    function syncTheme() {
      const theme=getComputedStyle(themeSource); const first=(names,fallback)=>names.map(name=>theme.getPropertyValue(name).trim()).find(Boolean)||fallback;
      notice.style.setProperty('--exp-notice-border',first(['--exp-notice-border','--theme-accent','--dropper-accent','--accent','--accent2','--teal','--mb-brand'],theme.borderTopColor||'#6f42b4'));
      notice.style.setProperty('--exp-notice-top',first(['--exp-notice-top','--theme-panel','--surface','--panel','--raised','--mb-surface','--bg','--mb-bg'],theme.backgroundColor||'#251a35'));
      notice.style.setProperty('--exp-notice-bottom',first(['--exp-notice-bottom','--theme-bg','--bg','--mb-bg','--surface','--mb-surface'],theme.backgroundColor||'#18181d'));
      notice.style.setProperty('--exp-notice-text',first(['--exp-notice-text','--theme-text','--text','--mb-ink'],theme.color||'#f4f4f6'));
    }
    const clearTimer=()=>{clearTimeout(timer);timer=0;};
    function layout(){if(destroyed||notice.hidden)return;syncTheme();layoutFloatingNotices();}
    function hide(){clearTimer();notice.hidden=true;versionButton?.setAttribute('aria-expanded','false');layoutFloatingNotices();}
    function show(){notice.hidden=false;versionButton?.setAttribute('aria-expanded','true');clearTimer();if(durationMs)timer=setTimeout(hide,durationMs);requestAnimationFrame(layoutFloatingNotices);}
    function toggle(){if(notice.hidden)show();else hide();}
    function versionClick(){if(manageVersion)toggle();else if(!notice.hidden)show();}
    function setMenuOpen(value){menuOpen=Boolean(value);if(!menuOpen)hide();else requestAnimationFrame(layout);}
    const coordination=()=>requestAnimationFrame(layout);
    dismiss.addEventListener('click',hide);versionButton?.addEventListener('click',versionClick);addEventListener('resize',layout,{passive:true});document.addEventListener('exp-core:coordination',coordination);
    return Object.freeze({show,hide,toggle,layout,setMenuOpen,destroy(){destroyed=true;clearTimer();unregisterNotice();dismiss.removeEventListener('click',hide);versionButton?.removeEventListener('click',versionClick);removeEventListener('resize',layout);document.removeEventListener('exp-core:coordination',coordination);}});
  }
  // Core-owned update and changelog cards use Dropper's menu-width notice
  // geometry directly. The legacy floating-notice coordinator remains exported
  // for compatibility, but it no longer owns these product notices.
  function createMenuNotice(options = {}) {
    const { shadow, panel, notice, versionButton = null } = options;
    const host = options.host || shadow?.host;
    if (!(shadow instanceof ShadowRoot) || !(panel instanceof Element) || !(notice instanceof Element)) {
      return Object.freeze({ show() {}, hide() {}, toggle() {}, layout() {}, setMenuOpen() {}, destroy() {} });
    }
    const durationMs = Math.max(0, Number(options.durationMs ?? 30000));
    const manageVersion = options.manageVersion !== false;
    let timer = 0, menuOpen = false, destroyed = false, frame = 0;

    if (!shadow.querySelector('style[data-exp-floating-notice]')) {
      injectStyle(shadow, '.exp-floating-update{position:fixed;z-index:2147483647;box-sizing:border-box;width:min(312px,calc(100vw - 24px));max-width:calc(100vw - 24px);margin:0;padding:10px 32px 10px 10px;border:1px solid var(--exp-notice-border,var(--dropper-accent,#6f42b4));border-radius:10px;background:linear-gradient(180deg,var(--exp-notice-top,#251a35),var(--exp-notice-bottom,#18181d) 70%);color:var(--exp-notice-text,#f4f4f6);box-shadow:0 10px 28px #0008;font:500 9px/1.45 system-ui,sans-serif}.exp-floating-update[hidden]{display:none!important}.exp-floating-update-dismiss{position:absolute;top:7px;right:7px;width:23px;height:23px;padding:0;border:1px solid transparent;border-radius:7px;background:transparent;color:inherit;cursor:pointer;font:15px/1 Arial,sans-serif}.exp-floating-update-dismiss:hover,.exp-floating-update-dismiss:focus-visible{border-color:var(--exp-notice-border,var(--dropper-accent,#6f42b4));outline:none}', { expFloatingNotice: '1' });
    }
    applyMatteToggleChrome(shadow);
    notice.classList.add('update-notice', 'exp-floating-update');
    notice.dataset.placement = 'menu';
    delete notice.dataset.expFloatingNotice;
    notice.setAttribute('role', 'status');

    let dismiss = notice.querySelector(':scope > .exp-floating-update-dismiss,.update-dismiss');
    if (!dismiss) {
      dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.className = 'exp-floating-update-dismiss';
      dismiss.setAttribute('aria-label', 'Dismiss changelog');
      dismiss.textContent = '×';
      notice.prepend(dismiss);
    }

    const themeSource = options.themeSource instanceof Element ? options.themeSource : panel;
    function syncTheme() {
      const theme = getComputedStyle(themeSource);
      const first = (names, fallback) => names.map(name => theme.getPropertyValue(name).trim()).find(Boolean) || fallback;
      notice.style.setProperty('--exp-notice-border', first(['--exp-notice-border','--theme-accent','--dropper-accent','--accent','--accent2','--teal','--mb-brand'], theme.borderTopColor || '#6f42b4'));
      notice.style.setProperty('--exp-notice-top', first(['--exp-notice-top','--theme-panel','--surface','--panel','--raised','--mb-surface','--bg','--mb-bg'], theme.backgroundColor || '#251a35'));
      notice.style.setProperty('--exp-notice-bottom', first(['--exp-notice-bottom','--theme-bg','--bg','--mb-bg','--surface','--mb-surface'], theme.backgroundColor || '#18181d'));
      notice.style.setProperty('--exp-notice-text', first(['--exp-notice-text','--theme-text','--text','--mb-ink'], theme.color || '#f4f4f6'));
    }
    function widthForMode() {
      return menuWidthForMode(host?.dataset.menuWidth || 'compact');
    }
    function clearTimer() { clearTimeout(timer); timer = 0; }
    function queueLayout() {
      if (destroyed || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; layout(); });
    }
    function layout() {
      if (destroyed || notice.hidden) return;
      syncTheme();
      const width = Math.min(widthForMode(), Math.max(0, innerWidth - 24));
      notice.style.setProperty('width', width + 'px', 'important');

      const panelBox = menuOpen && !panel.hidden && panel.getClientRects().length ? panel.getBoundingClientRect() : null;
      const launcher = shadow.querySelector('[data-exp-part="launcher"],.ward-launcher,.launcher,#tdh-settings-launcher');
      const launcherBox = launcher?.getBoundingClientRect?.();
      const anchorBox = panelBox?.width && panelBox?.height ? panelBox : launcherBox;
      if (!anchorBox?.width || !anchorBox?.height) return;

      const height = notice.offsetHeight || notice.scrollHeight || 72;
      const anchor = document.documentElement.dataset.expLauncherAnchor === 'top' ? 'top' : 'bottom';
      let top;
      if (panelBox?.width && panelBox?.height) {
        const above = panelBox.top - height - 8;
        top = above >= 8 ? above : Math.min(innerHeight - height - 8, panelBox.bottom + 8);
      } else if (anchor === 'top') {
        top = Math.min(innerHeight - height - 8, anchorBox.bottom + 8);
      } else {
        top = Math.max(8, anchorBox.top - height - 8);
      }
      const left = Math.max(8, Math.min(innerWidth - width - 8, anchorBox.right - width));
      notice.style.setProperty('left', left + 'px', 'important');
      notice.style.setProperty('right', 'auto', 'important');
      notice.style.setProperty('top', Math.max(8, top) + 'px', 'important');
      notice.style.setProperty('bottom', 'auto', 'important');
    }
    function hide() {
      clearTimer();
      notice.hidden = true;
      versionButton?.setAttribute('aria-expanded', 'false');
    }
    function show() {
      notice.hidden = false;
      versionButton?.setAttribute('aria-expanded', 'true');
      clearTimer();
      if (durationMs) timer = setTimeout(hide, durationMs);
      queueLayout();
    }
    function toggle() { if (notice.hidden) show(); else hide(); }
    function versionClick() { if (manageVersion) toggle(); else if (!notice.hidden) show(); }
    function setMenuOpen(value) { menuOpen = Boolean(value); queueLayout(); }

    const resize = new ResizeObserver(queueLayout);
    resize.observe(panel);
    resize.observe(notice);
    const mutation = new MutationObserver(queueLayout);
    mutation.observe(notice, { attributes:true, attributeFilter:['hidden'], childList:true, subtree:true });
    const coordination = () => queueLayout();
    dismiss.addEventListener('click', hide);
    versionButton?.addEventListener('click', versionClick);
    addEventListener('resize', queueLayout, { passive:true });
    document.addEventListener('exp-core:coordination', coordination);

    return Object.freeze({
      show, hide, toggle, layout, setMenuOpen,
      destroy() {
        destroyed = true;
        cancelAnimationFrame(frame);
        clearTimer();
        resize.disconnect();
        mutation.disconnect();
        dismiss.removeEventListener('click', hide);
        versionButton?.removeEventListener('click', versionClick);
        removeEventListener('resize', queueLayout);
        document.removeEventListener('exp-core:coordination', coordination);
      },
    });
  }

  function applyTheme(host, value, choices) {
    const controller = controllers.get(host); if (!controller) return;
    controller.setTheme(value, choices);
  }
  function normalizeControls(panel) {
    panel.querySelectorAll('button[role="switch"],button.toggle').forEach(button => {
      button.classList.add('toggleSwitch'); button.setAttribute('role', 'switch');
      if (!button.hasAttribute('aria-checked')) button.setAttribute('aria-checked', 'false');
      const row = button.closest('.row,.mini-row,.fl-switch,.setting-row');
      if (row) { row.classList.add('fl-switch'); const label = row.querySelector('.label,.copy>strong,.row-copy>strong,.setting-label,span'); if (label) label.classList.add('fl-switch-text'); if (!button.hasAttribute('aria-label') && !button.hasAttribute('aria-labelledby')) button.setAttribute('aria-label', label?.textContent || row.textContent.trim()); }
    });
    panel.querySelectorAll('.row,.mini-row,.setting-row').forEach(row => { if (!row.classList.contains('fl-switch')) row.classList.add('mini-row'); });
    panel.querySelectorAll('select').forEach(node => node.classList.add('select-lite'));
    panel.querySelectorAll('button.action,button.secondary,button.primary,button.compact,.diagnostics-controls button,.button-grid button,.menu-footer button').forEach(node => { if (!node.dataset.expPart) node.classList.add('life-btn'); });
    panel.querySelectorAll('.route-body').forEach(body => body.classList.toggle('fl-tool-hidden', body.hidden));
    const active = panel.querySelector('.fl-tool-header[aria-expanded="true"]');
    panel.querySelectorAll('.fl-tool-header').forEach(header => { if (active) header.classList.toggle('last-opened', header === active); const chevron = header.querySelector('.fl-tool-chevron'); if (chevron) chevron.textContent = header.getAttribute('aria-expanded') === 'true' ? '▾' : '▸'; });
  }
  function normalizeHeader(panel) {
    const head = panel.querySelector('.menu-head,header,.head,.ward-header'); if (!head) return;
    head.classList.add('menu-head');
    const brand = head.querySelector('.header-brand,.identity,.brand'); if (!brand) return;
    brand.classList.add('header-brand');
    let icon = brand.firstElementChild;
    if (icon?.tagName === 'IMG' || icon?.tagName.toLowerCase() === 'svg') { const frame = document.createElement('div'); frame.className = 'header-icon'; icon.before(frame); frame.append(icon); icon.classList.add('menu-icon'); icon = frame; }
    if (icon) { icon.classList.add('header-icon'); icon.querySelector('img,svg')?.classList.add('menu-icon'); }
    const copy = brand.children[1]; if (copy) copy.classList.add('header-copy');
    const row = copy?.firstElementChild; row?.classList.add('header-title-row');
    const title = row?.querySelector('h1,h2,h3,strong,.menu-title'); if (title) title.dataset.expPart = 'title';
    const ver = head.querySelector('.version,.header-version,[id$="header-version"]'); if (ver) ver.dataset.expPart = 'version';
    const subtitle = copy?.querySelector('small,.subtitle,.menu-subtitle,[id$="subtitle"]'); if (subtitle) subtitle.dataset.expPart = 'subtitle';
    const close = head.querySelector('.close,.menu-close,[id$="rail-close"]'); if (close) close.dataset.expPart = 'close';
    panel.querySelector('.divider')?.classList.add('header-divider');
    for (const section of panel.querySelectorAll('nav>.tool-panel,nav>section')) {
      section.classList.add('fl-tool-panel'); const control = section.querySelector(':scope>button'); const body = section.querySelector(':scope>div'); if (!control || !body) continue;
      control.classList.add('fl-tool-header'); body.classList.add('fl-tool-body');
      if (!control.querySelector('.fl-tool-title')) { let title = control.querySelector('span:not(.chevron)'); if (!title) { title = document.createElement('span'); title.textContent = control.textContent; control.replaceChildren(title); } title.classList.add('fl-tool-title'); }
      let chevron = control.querySelector('.chevron,.fl-tool-chevron'); if (!chevron) { chevron = document.createElement('span'); chevron.textContent = '▸'; control.append(chevron); } chevron.classList.add('fl-tool-chevron');
    }
  }
  function makeLauncher(launcher, launcherSrc) {
    if (launcher.dataset.expCoreLauncher) return;
    const image = launcher.querySelector('img,.launcher-gem svg,.icon,svg:not(.launcher-ring):not(.ring)');
    if (!image) throw new Error('Core launcher requires the product launcher artwork');
    const mark = image.cloneNode(true); mark.removeAttribute('style'); mark.removeAttribute('id'); mark.setAttribute('class','icon launcher-icon');
    if (launcherSrc && mark.tagName === 'IMG') mark.src = launcherSrc;
    launcher.replaceChildren(mark); launcher.dataset.expCoreLauncher = '1'; launcher.dataset.expPart = 'launcher';
    launcher.removeAttribute('data-help');
  }
  function create(options) {
    const { id, host, shadow, launcher, panel, getSettings = () => ({}), setOpen, shortcutKey = '', productTheme, launcherSrc } = options;
    if (controllers.has(host)) return controllers.get(host);
    // All styling comes from the reference and the composition adapter. Remove
    // product copies and their constructed sheets before mounting the canonical UI.
    shadow.querySelectorAll('style').forEach(node => node.dispose ? node.dispose() : node.remove());
    try { shadow.adoptedStyleSheets = []; } catch {}
    const styles = injectStyle(shadow, canonicalCss + compositionCss, { expCoreStyle:version });
    const themeRoot = document.createElement('div'); themeRoot.className = 'exp-core-theme';
    [...shadow.childNodes].filter(node => node !== styles).forEach(node => themeRoot.append(node)); shadow.append(themeRoot);
    panel.dataset.expPart = 'dock'; panel.classList.add('dropper-menu-surface'); makeLauncher(launcher,launcherSrc); normalizeHeader(panel); normalizeControls(panel);
    applyContentDrivenMenuLayout(shadow);
    applyMatteToggleChrome(shadow);
    const versionButton=panel.querySelector('.version,[data-exp-part="version"]');
    const menuNotices=[...themeRoot.querySelectorAll('.update-notice,.changelog')].map(notice=>createMenuNotice({host,shadow,panel,notice,versionButton:notice.classList.contains('changelog')?versionButton:null,manageVersion:false,durationMs:30000}));
    if (launcherSrc) panel.querySelectorAll('.header-icon img').forEach(image => image.src = launcherSrc);
    host.dataset.coreVersion = version; host.dataset.coreSource = 'Dropper/3.3.2';
    let choices = themes(productTheme), selected = choices.at(-1), open = false, destroyed = false, timer = 0, deadline = 0, frame = 0;
    const removers = [];
    const on = (node,type,fn,opts) => { node.addEventListener(type,fn,opts); removers.push(() => node.removeEventListener(type,fn,opts)); };
    let localTheme = null;
    function paintTheme(theme) {
      selected = theme;
      for (const key of tokenNames) { themeRoot.style.setProperty('--theme-' + key, selected[key]); host.style.setProperty('--' + key, selected[key]); host.style.setProperty('--dropper-' + key, selected[key]); }
      themeRoot.style.setProperty('--theme-skin', selected.skin || selected.swatch || selected.accent);
      themeRoot.style.setProperty('--theme-skin-vertical', selected.skinVertical || selected.skin || selected.swatch || selected.accent);
      Object.assign(themeRoot.dataset, { uiTheme:selected.id, themeSkin:selected.skinMode === 'flat' ? 'flat' : 'gradient' });
      host.dataset.uiTheme = selected.id;
    }
    let observedDropper = null;
    const dropperThemeObserver = new MutationObserver(syncThemeOwner);
    function syncThemeOwner() {
      const owner = menuThemeOwner();
      const dropperThemeSurface = owner?.dataset.productId === 'dropper'
        ? owner.shadowRoot?.querySelector('#tdh-cluster')
        : null;
      if (dropperThemeSurface !== observedDropper) {
        dropperThemeObserver.disconnect();
        observedDropper = dropperThemeSurface;
        if (observedDropper) dropperThemeObserver.observe(observedDropper, { attributes:true, attributeFilter:['data-ui-theme'] });
      }
      const deprioritized = Boolean(owner && owner !== host);
      host.dataset.expThemeDeprioritized = deprioritized ? '1' : '0';
      host.dataset.expThemeOwner = owner?.dataset.productId || id;
      paintTheme(deprioritized && menuPalette(owner) || localTheme);
    }
    function setTheme(value, supplied) {
      if (supplied) choices = supplied.map(t => ({ ...t, ...t.vars, skin:t.skin || t.swatch, skinVertical:t.skinVertical || t.skin || t.swatch }));
      const alias = ({warm:'ember',discord:'glacier',pine:'verdant',obsidian:'contrast'})[value] || value;
      localTheme = choices.find(t => t.id === alias) || choices.at(-1);
      publishMenuPalette(host, localTheme);
      syncThemeOwner();
    }
    function clearTimer() { clearTimeout(timer); timer = 0; deadline = 0; }
    function scheduleDismiss() { clearTimer(); if (!open || getSettings().menuAutoClose === false) return; deadline = Date.now()+15000; timer = setTimeout(() => { if (open && Date.now() >= deadline) setOpen(false,false); },15020); }
    function layout() {
      if (destroyed || !launcher.isConnected) return;
      const state = getSettings(); const width = ['full','compact','narrow'].includes(state.menuWidth) ? state.menuWidth : 'compact';
      host.dataset.menuWidth = width; themeRoot.dataset.panelWidth = width;
      themeRoot.classList.toggle('reduce-motion', state.reduceMotion === true || state.reduceMotion === 'on' || state.reducedMotion === 'reduce' || (state.reduceMotion === 'system' || state.reducedMotion === 'system') && matchMedia('(prefers-reduced-motion:reduce)').matches);
      const opacityValue = Number(state.opacityPercent);
      const opacity = state.customOpacity ? (Number.isFinite(opacityValue) ? Math.max(40, Math.min(100, Math.round(opacityValue / 5) * 5)) : 85)/100 : 1;
      themeRoot.style.setProperty('--dropper-ui-opacity',String(opacity));
      const offset = parseFloat(getComputedStyle(host).getPropertyValue('--exp-launcher-offset')) || 0;
      const x = parseFloat(getComputedStyle(host).getPropertyValue('--exp-launcher-x')) || 0;
      const delta = Math.max(8-(innerHeight-60), Math.min(4, Number(read(GRID_DELTA,0)) || 0));
      const origin = innerHeight-60+delta, anchor = origin <= (innerHeight-48)/2 ? 'top':'bottom';
      document.documentElement.dataset.expLauncherAnchor = anchor;
      let top = anchor === 'top' ? origin+offset : origin-offset;

      top = Math.max(8,Math.min(innerHeight-56,top));
      Object.assign(launcher.style,{top:top+'px',right:(12+x)+'px',bottom:'auto',left:'auto',zIndex:open?'2147483647':'2147483600'});
      const maxWidth = Math.max(0,innerWidth-24), panelWidth = Math.min(menuWidthForMode(width),maxWidth);
      Object.assign(panel.style,{width:panelWidth+'px',maxHeight:Math.max(80,innerHeight-80)+'px',overflowY:'auto',right:'12px',left:'auto',bottom:'auto',zIndex:open?'2147483647':'2147483599'});
      if (!open) return;
      const h = panel.offsetHeight, below = innerHeight-top-56, above = top-8;
      const up = below < h+12 && above >= below;
      host.dataset.openDirection = up?'up':'down';
      panel.style.top = Math.max(8, up ? top-h-8 : Math.min(innerHeight-h-8,top+56))+'px';
      menuNotices.forEach(notice=>notice.layout());
    }
    function queueLayout() { if (!frame && !destroyed) frame = requestAnimationFrame(() => { frame = 0; normalizeControls(panel); layout(); }); }
    let startX=0,startY=0,startDelta=0,pointer=null,dragged=false,axis='',order=[];
    on(launcher,'pointerdown',e=>{if(e.button!==0)return;pointer=e.pointerId;startX=e.clientX;startY=e.clientY;startDelta=Number(read(GRID_DELTA,0))||0;order=read(GRID_ORDER,[]);if(!Array.isArray(order))order=[];if(!order.includes(id))order.push(id);dragged=false;axis='';e.preventDefault();});
    on(document,'pointermove',e=>{if(e.pointerId!==pointer)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(!axis&&Math.max(Math.abs(dx),Math.abs(dy))>4)axis=Math.abs(dx)>Math.abs(dy)?'order':'group';if(!axis)return;dragged=true;e.preventDefault();launcher.classList.add('is-dragging');if(axis==='order'){const from=order.indexOf(id),to=Math.max(0,Math.min(order.length-1,from+Math.round(-dx/56))),next=[...order];next.splice(from,1);next.splice(to,0,id);write(GRID_ORDER,next);}else write(GRID_DELTA,startDelta+dy);layoutGrid();emit('launcher-grid-moved',id);layout();},{passive:false});
    const end=e=>{if(e.pointerId===pointer){pointer=null;launcher.classList.remove('is-dragging');}};
    on(document,'pointerup',end);on(document,'pointercancel',end);
    on(launcher,'click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false;}},true);
    for(const type of ['pointerdown','click','wheel','keydown','input','change'])on(panel,type,scheduleDismiss,{passive:type==='wheel'});
    on(window,'keydown',e=>{if(shortcutKey&&e.altKey&&e.shiftKey&&e.key.toLowerCase()===shortcutKey.toLowerCase()&&!e.repeat){e.preventDefault();setOpen(!open,true);} });
    on(window,'resize',queueLayout);on(document,'exp-core:coordination',queueLayout);
    on(document,'exp-core:coordination',syncThemeOwner);
    const resize = new ResizeObserver(queueLayout); resize.observe(panel);
    const mutation = new MutationObserver(records=>{if(records.some(r=>r.type==='childList'||r.attributeName==='hidden'))queueLayout();}); mutation.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    const controller = {
      layout, setTheme,
      state(value) {open=Boolean(value);panel.classList.toggle('fl-rail-open',open);menuNotices.forEach(notice=>notice.setMenuOpen(open));if(open)scheduleDismiss();else clearTimer();queueLayout();},
      update(){normalizeControls(panel);queueLayout();},
      get dismissAt(){return deadline;},
      destroy(){destroyed=true;clearTimer();cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();dropperThemeObserver.disconnect();menuNotices.forEach(notice=>notice.destroy());removers.forEach(f=>f());styles.dispose();controllers.delete(host);}
    };
    controllers.set(host,controller);setTheme(getSettings().uiTheme || getSettings().theme || id);
    queueLayout();return controller;
  }
  function createReleaseUpdateChecker(options = {}) {
    const productId = String(options.productId || '').toLowerCase();
    const repository = String(options.repository || '');
    const currentVersion = String(options.currentVersion || '');
    const enabled = typeof options.enabled === 'function' ? options.enabled : () => true;
    const onError = typeof options.onError === 'function' ? options.onError : () => {};
    if (!productId || !repository || !currentVersion) throw new Error('Incomplete update checker configuration');

    const ENDPOINT = String(options.endpoint || ('https://api.github.com/repos/' + repository + '/releases/latest'));
    const CACHE_KEY = 'exp:v3:' + productId + ':update-cache';
    const CHECK_INTERVAL = 15 * 60 * 1000;
    const CHECK_LEASE = 30 * 1000;
    let memory = {};

    function readState() {
      try {
        if (typeof GM_getValue === 'function') {
          const value = GM_getValue(CACHE_KEY, null);
          if (value && typeof value === 'object' && !Array.isArray(value)) return { ...value };
        }
      } catch {}
      try {
        const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (value && typeof value === 'object' && !Array.isArray(value)) return { ...value };
      } catch {}
      return { ...memory };
    }
    function writeState(value) {
      memory = { ...(value || {}) };
      try { if (typeof GM_setValue === 'function') GM_setValue(CACHE_KEY, memory); } catch {}
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(memory)); } catch {}
    }
    function releaseDetails(body) {
      const details = [];
      let section = false;
      for (const line of String(body || '').split(/\r?\n/)) {
        if (/^##\s+/.test(line)) { if (section) break; section = true; continue; }
        if (!section) continue;
        const match = line.match(/^\s*[-*]\s+(.+)/);
        if (!match) continue;
        const detail = match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_]/g, '').trim();
        if (detail) details.push(detail.slice(0, 220));
        if (details.length === 4) break;
      }
      return details;
    }
    function normalize(state) {
      const next = { ...(state || {}) };
      if (!Object.hasOwn(next, 'lastCheckAt') && next.checkedAt) next.lastCheckAt = Number(next.checkedAt) || 0;
      if (!Object.hasOwn(next, 'lastRemoteVersion') && next.latest) next.lastRemoteVersion = String(next.latest || '');
      if (!Array.isArray(next.details)) next.details = [];
      return next;
    }
    function snapshot(state, stateName) {
      const next = normalize(state);
      const latest = String(next.lastRemoteVersion || '');
      return {
        checkedAt: Number(next.lastCheckAt || 0),
        latest: latest || null,
        state: stateName || next.state || 'idle',
        current: currentVersion,
        available: Boolean(latest && DropperReference.compareVersions(latest, currentVersion) > 0),
        details: next.details.slice(0, 4),
        checkedForVersion: next.checkedForVersion || null,
        lastRemoteVersion: latest || null,
        lastHttpStatus: Number(next.lastHttpStatus || 0),
        lastError: String(next.lastError || ''),
      };
    }
    function request() {
      return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest !== 'function') return reject(Object.assign(new Error('Update request capability unavailable'), { code:'UPDATE_CAPABILITY' }));
        GM_xmlhttpRequest({
          method:'GET',
          url:ENDPOINT,
          timeout:10000,
          headers:{ Accept:'application/vnd.github+json', 'Cache-Control':'no-cache', Pragma:'no-cache' },
          onload(response) {
            if (response.status >= 200 && response.status < 300) return resolve(response);
            reject(Object.assign(new Error('Update metadata request failed'), { code:'UPDATE_HTTP_' + response.status, status:response.status }));
          },
          onerror:() => reject(Object.assign(new Error('Update metadata request failed'), { code:'UPDATE_NETWORK' })),
          ontimeout:() => reject(Object.assign(new Error('Update metadata request timed out'), { code:'UPDATE_TIMEOUT' })),
        });
      });
    }
    async function check(force = false) {
      let state = normalize(readState());
      if (!enabled() && !force) return snapshot(state, 'disabled');

      const now = Date.now();
      const checkedForCurrentVersion = state.checkedForVersion === currentVersion;
      if (!checkedForCurrentVersion) {
        state.checkedForVersion = currentVersion;
        state.lastCheckAt = 0;
        state.checkLeaseUntil = 0;
        state.lastRemoteVersion = '';
        state.lastHttpStatus = 0;
        state.lastError = '';
        state.details = [];
        state.availableVersion = '';
        state.availableAt = 0;
      }
      writeState(state);

      if (!force && Number(state.checkLeaseUntil || 0) > now) return snapshot(state, 'checking');
      if (!force && checkedForCurrentVersion && now - Number(state.lastCheckAt || 0) < CHECK_INTERVAL) return snapshot(state, 'cached');

      state.checkedForVersion = currentVersion;
      state.lastCheckAt = now;
      state.checkLeaseUntil = now + CHECK_LEASE;
      state.lastError = '';
      state.state = 'checking';
      writeState(state);

      try {
        const response = await request();
        const payload = JSON.parse(String(response.responseText || '{}'));
        const latest = String(payload.tag_name || '').replace(/^v/, '');
        if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(latest)) throw Object.assign(new Error('Invalid update metadata'), { code:'UPDATE_METADATA' });

        state = normalize(readState());
        state.checkedForVersion = currentVersion;
        state.lastCheckAt = Date.now();
        state.checkLeaseUntil = 0;
        state.lastRemoteVersion = latest;
        state.lastHttpStatus = Number(response.status || 0);
        state.lastError = '';
        state.details = releaseDetails(payload.body);
        state.state = 'checked';
        if (DropperReference.compareVersions(latest, currentVersion) > 0) {
          state.availableVersion = latest;
          state.availableAt = Date.now();
        } else {
          state.availableVersion = '';
          state.availableAt = 0;
        }
        writeState(state);
        return snapshot(state, 'checked');
      } catch (error) {
        state = normalize(readState());
        state.checkedForVersion = currentVersion;
        state.lastCheckAt = Date.now();
        state.checkLeaseUntil = 0;
        state.lastError = String(error?.message || 'Update check failed');
        state.state = 'failed';
        writeState(state);
        try { onError(error); } catch {}
        return snapshot(state, 'failed');
      }
    }
    function status() { return snapshot(readState()); }
    return Object.freeze({
      CURRENT_VERSION: currentVersion,
      ENDPOINT,
      CHECK_INTERVAL,
      check,
      status,
      compare: DropperReference.compareVersions,
    });
  }

  function createSupportControl({ url, label = 'Support' } = {}) {
    if (!url) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'support-wrap';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'support-button';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-expanded', 'false');
    button.title = label;
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.2-4.35-9.55-8.45C.42 9.02 2.3 5 6.25 5c2.15 0 3.56 1.21 4.33 2.3C11.36 6.21 12.77 5 14.92 5c3.95 0 5.83 4.02 3.8 7.55C16.36 16.65 12 21 12 21Z"/></svg>';
    const popover = document.createElement('div');
    popover.className = 'support-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', label);
    popover.hidden = true;
    const strong = document.createElement('strong');
    strong.textContent = label;
    const copy = document.createElement('span');
    copy.textContent = 'Donations are optional. All features stay free.';
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = 'Open Ko-fi';
    popover.append(strong, copy, anchor);
    wrapper.append(button, popover);
    const toggle = event => {
      event?.stopPropagation?.();
      popover.hidden = !popover.hidden;
      button.setAttribute('aria-expanded', String(!popover.hidden));
    };
    const outside = event => {
      if (popover.hidden || event.composedPath().includes(wrapper)) return;
      popover.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    };
    button.addEventListener('click', toggle);
    document.addEventListener('pointerdown', outside, true);
    return Object.freeze({
      element: wrapper,
      button,
      popover,
      hide() { popover.hidden = true; button.setAttribute('aria-expanded', 'false'); },
      destroy() { button.removeEventListener('click', toggle); document.removeEventListener('pointerdown', outside, true); wrapper.remove(); },
    });
  }

  function createProductNotice(options = {}) {
    const { host, shadow, panel, versionButton = null } = options;
    if (!(host instanceof Element) || !(shadow instanceof ShadowRoot) || !(panel instanceof Element)) {
      throw new Error('Product notice requires a mounted Core product');
    }
    const notice = document.createElement('div');
    notice.className = 'update-notice';
    notice.hidden = true;
    notice.innerHTML = '<button type="button" class="update-dismiss" aria-label="Dismiss Update Notice">×</button><div class="update-head"><div class="update-heading"><div class="update-kicker">What\'s New</div><div class="update-title"></div></div><div class="update-version"></div></div><div class="update-text"></div><ul class="update-list"></ul><div class="update-footer"><a class="update-release" target="_blank" rel="noopener noreferrer">GitHub Release</a><a class="update-action" target="_blank" rel="noopener noreferrer">Install Update</a></div>';
    (shadow.querySelector('.exp-core-theme') || shadow).append(notice);
    const controller = createMenuNotice({
      host,
      shadow,
      panel,
      notice,
      versionButton: null,
      manageVersion: false,
      durationMs: options.durationMs ?? 30000,
    });
    function show(state = {}) {
      notice.querySelector('.update-kicker').textContent = state.kicker || "What's New";
      notice.querySelector('.update-title').textContent = state.title || '';
      notice.querySelector('.update-version').textContent = state.version ? 'v' + state.version : '';
      notice.querySelector('.update-text').textContent = state.text || '';
      const list = notice.querySelector('.update-list');
      list.replaceChildren();
      const details = Array.isArray(state.details) ? state.details.slice(0, 4) : [];
      for (const detail of details) {
        const item = document.createElement('li');
        item.textContent = detail;
        list.append(item);
      }
      list.hidden = !details.length;
      const release = notice.querySelector('.update-release');
      const releaseUrl = state.releaseUrl || options.releaseUrl || '';
      release.hidden = !releaseUrl;
      if (releaseUrl) release.href = releaseUrl;
      const action = notice.querySelector('.update-action');
      const actionUrl = state.actionUrl || options.installUrl || '';
      action.hidden = !actionUrl || state.showAction === false;
      if (actionUrl) action.href = actionUrl;
      action.textContent = state.actionText || 'Install Update';
      notice.dataset.noticeKind = state.kind || 'current';
      controller.show();
    }
    const versionClick = () => {
      if (typeof options.onVersion === 'function') options.onVersion();
      else controller.toggle();
    };
    versionButton?.addEventListener('click', versionClick);
    return Object.freeze({
      element: notice,
      show,
      hide: controller.hide,
      toggle: controller.toggle,
      layout: controller.layout,
      setMenuOpen: controller.setMenuOpen,
      destroy() {
        versionButton?.removeEventListener('click', versionClick);
        controller.destroy();
        notice.remove();
      },
    });
  }

  function createDiagnosticsReport(product, details = {}) {
    return ExtraPotionsDiagnostics.createReport(product, details, { version, source: 'Dropper', sourceVersion });
  }
  function downloadDiagnostics(report) {
    const name=`${String(report.report||'Diagnostics').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return; } catch {}
    const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;left:-9999px';document.documentElement.append(area);area.select();const success=document.execCommand('copy');area.remove();if(!success)throw new Error('Clipboard unavailable');
  }
  function createDiagnosticsControls(getReport, notify = () => {}) { return ExtraPotionsDiagnostics.createControls(getReport, notify); }
  function createProduct({id,name,version:productVersion,subtitle='',artwork,theme,sections=[],getSettings,onSettings=()=>{},priority,supportUrl=''}) {
    const host=document.createElement('div');host.id='exp-'+id+'-root';host.dataset.expOwned='1';const shadow=host.attachShadow({mode:'open'});const panel=document.createElement('aside');panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',name+' settings');
    const header=document.createElement('header');header.className='menu-head';const brand=document.createElement('div');brand.className='header-brand';const image=document.createElement('img');image.src=artwork;image.alt='';const copy=document.createElement('div');const titleRow=document.createElement('div');const title=document.createElement('strong');title.textContent=name;const v=document.createElement('button');v.type='button';v.className='version';v.textContent='v'+productVersion;titleRow.append(title,v);const sub=document.createElement('small');sub.textContent=subtitle;copy.append(titleRow,sub);brand.append(image,copy);const close=document.createElement('button');close.className='close';close.textContent='×';close.setAttribute('aria-label','Close '+name);const actions=document.createElement('div');actions.className='header-actions';const support=createSupportControl({url:supportUrl,label:'Support '+name});if(support)actions.append(support.element);actions.append(close);header.append(brand,actions);const divider=document.createElement('div');divider.className='header-divider';const nav=document.createElement('nav');
    let isOpen=false, activeId='';let chrome;
    const sectionMap=new Map();
    function renderSection(section,body){const content=section.render({core:api,onSettings});body.replaceChildren(content);chrome?.update();}
    function renderActive(){if(!activeId)return false;const entry=sectionMap.get(activeId);if(!entry||entry.body.hidden)return false;renderSection(entry.section,entry.body);return true;}
    function setOpen(value,focus=true){isOpen=Boolean(value);panel.hidden=!isOpen;launcher.setAttribute('aria-expanded',String(isOpen));if(isOpen){activeId='';nav.querySelectorAll('.route-body').forEach(n=>n.hidden=true);nav.querySelectorAll('button[data-section]').forEach(n=>{n.classList.remove('last-opened');n.setAttribute('aria-expanded','false');});}chrome.state(isOpen);if(focus)(isOpen?focusMenuSurface(panel):launcher.focus());}
    for(const section of sections){const group=document.createElement('section');group.className='tool-panel';const button=document.createElement('button');button.type='button';button.textContent=section.label;button.dataset.section=section.id;const body=document.createElement('div');body.className='route-body';body.hidden=true;sectionMap.set(section.id,{section,body,button});button.addEventListener('click',()=>{const opening=body.hidden;nav.querySelectorAll('.route-body').forEach(n=>n.hidden=true);nav.querySelectorAll('button[data-section]').forEach(n=>{n.classList.toggle('last-opened',n===button);n.setAttribute('aria-expanded',String(opening&&n===button));});body.hidden=!opening;activeId=opening?section.id:'';if(opening)renderSection(section,body);chrome.update();});group.append(button,body);nav.append(group);}
    const launcher=document.createElement('button');launcher.className='launcher';launcher.type='button';launcher.setAttribute('aria-label','Open '+name);const mark=image.cloneNode(true);launcher.append(mark);launcher.addEventListener('click',()=>setOpen(!isOpen));close.addEventListener('click',()=>setOpen(false));panel.append(header,divider,nav);shadow.append(panel,launcher);document.documentElement.append(host);chrome=create({id,host,shadow,panel,launcher,getSettings,setOpen,productTheme:theme});const unregister=registerLauncher(host,{productId:id,priority});
    const key=e=>{if(e.key==='Escape'&&isOpen)setOpen(false);};document.addEventListener('keydown',key);
    return {host,shadow,panel,launcher,versionButton:v,open:()=>setOpen(true),close:()=>setOpen(false),toggle:()=>setOpen(!isOpen),refresh:()=>chrome.update(),renderActive,get isOpen(){return isOpen;},destroy(){document.removeEventListener('keydown',key);support?.destroy();chrome.destroy();unregister();host.remove();}};
  }
  let gridFrame=0;
  const scheduleGrid=()=>{if(!gridFrame)gridFrame=requestAnimationFrame(()=>{gridFrame=0;layoutGrid();});};
  const gridObserver=new MutationObserver(scheduleGrid);
  const startGrid=()=>{if(!document.documentElement)return;gridObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-exp-product-launcher','data-product-id','data-launcher-priority','data-launcher-reserved-rows']});scheduleGrid();};
  if(document.documentElement)startGrid();else addEventListener('DOMContentLoaded',startGrid,{once:true});
  document.addEventListener('exp-core:coordination',scheduleGrid);
  addEventListener('resize',scheduleGrid,{passive:true});
  const api = Object.freeze({version,sourceVersion,protocol,gridProtocol,reference:DropperReference,css:canonicalCss,themes,create,createProduct,createSupportControl,createProductNotice,createLifecycle:()=>createProductLifecycle(api),registerLauncher,layout:layoutGrid,menuWidthForMode,injectStyle,applyTheme,applyMatteToggleChrome,applyTwoColumnSettingsGrid,applyContentDrivenMenuLayout,createThemeSwatches,createFloatingNotice,createMenuNotice,createReleaseUpdateChecker,registerFloatingNotice,layoutFloatingNotices,claimNotice,consumeVersionChange,focusMenuSurface,registerDiagnosticsProduct:ExtraPotionsDiagnostics.registerProduct,productCompatibility:ExtraPotionsDiagnostics.compatibility,createDiagnosticsReport,downloadDiagnostics,createDiagnosticsControls,compareVersions:DropperReference.compareVersions});
  return api;
})();
