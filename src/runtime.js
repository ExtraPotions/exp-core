// Product-neutral shared runtime. Product engines own their settings, content, and actions.
// exp-core owns shared UI, launcher, diagnostics, update, and coordination behavior.
const ExtraPotionsCore = (() => {
  'use strict';
  const version = '__EXP_CORE_VERSION__';
  const sourceVersion = version; // Backward-compatible alias for Core's own foundation version.
  const SUPPORT_URL = 'https://ko-fi.com/expdare';
  const protocol = 'exp-core-coordination-v1';
  const gridProtocol = 'exp-launcher-grid-v3';
  const GRID_ORDER = 'exp:v3:launcher-order';
  const GRID_DELTA = 'exp:v3:launcher-grid-delta';
  // Product importance, launcher placement, and theme ownership are separate
  // coordination policies backed by the same canonical suite manifest.
  const freezeSuiteContract = values => Object.freeze(Object.fromEntries(
    Object.entries(values || {}).map(([id, value]) => [id, Object.freeze({
      role: String(value?.role || 'product'),
      repository: String(value?.repository || ''),
      rootId: String(value?.rootId || ''),
      priority: Number(value?.priority || 0),
      launcherPriority: Number(value?.launcherPriority || 0),
      themePriority: Number(value?.themePriority || 0),
      capabilities: Object.freeze([...(value?.capabilities || [])]),
      presentationPhases: Object.freeze([...(value?.presentationPhases || [])]),
      menuSections: Object.freeze(Object.fromEntries(
        Object.entries(value?.menuSections || {}).map(([category, sections]) => [category, Object.freeze([...(sections || [])])])
      )),
      state: value?.state ? Object.freeze({
        type: String(value.state.type || ''),
        fields: Object.freeze({ ...(value.state.fields || {}) }),
      }) : null,
    })])
  ));
  const SUITE_PRODUCTS = freezeSuiteContract(__EXP_SUITE_CONTRACT__);
  const SUITE_PRIORITY = Object.freeze(Object.fromEntries(
    Object.entries(SUITE_PRODUCTS).map(([id, value]) => [id, value.priority])
  ));
  const LAUNCHER_PRIORITY = Object.freeze(Object.fromEntries(
    Object.entries(SUITE_PRODUCTS).map(([id, value]) => [id, value.launcherPriority])
  ));
  const THEME_PRIORITY = Object.freeze(Object.fromEntries(
    Object.entries(SUITE_PRODUCTS).map(([id, value]) => [id, value.themePriority])
  ));
  const SUITE_EVENT = 'exp-core:suite';
  const SUITE_SITE_PAUSE_PREFIX = 'exp:v3:suite-site-pause:';
  let suitePauseTimer;
  // Suite events/state cross userscript realms through shared DOM metadata.
  // They are advisory coordination signals, never an authorization boundary.
  const SUITE_TRUST = 'shared-dom-advisory';
  const PAGE_BATCH_EVENT = 'exp-core:page-batch';
  const NAVIGATION_EVENT = 'exp-core:navigation';
  const NAVIGATION_CONTROL_EVENT = 'exp-core:navigation-control';
  const PAGE_PHASE_EVENT = 'exp-core:page-phase';
  const PAGE_PHASE_END_EVENT = 'exp-core:page-phase-end';
  const PRESENTATION_STATE_EVENT = 'exp-core:presentation-state';
  const PRESENTATION_PHASES = Object.freeze({
    observe: 10,
    classify: 20,
    visibility: 30,
    theme: 40,
    annotate: 50,
    ui: 60,
  });
  const PRESENTATION_CHANNELS = Object.freeze(['classification', 'visibility', 'surface', 'annotation']);
  const suiteStateFingerprints = new Map();
  const registrations = new WeakMap();
  const floatingNoticeRegistrations = new WeakMap();
  const controllers = new WeakMap();
  const menuControllers = new WeakMap();
  let noticeSerial = 0;
  const baseTokenNames = ['bg', 'panel', 'line', 'text', 'muted', 'accent', 'accent2'];
  const tokenNames = [...baseTokenNames, 'raised', 'inset', 'link', 'focus', 'onAccent'];
  const hex = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#000000';
  const rgb = value => [1, 3, 5].map(index => parseInt(hex(value).slice(index, index + 2), 16));
  const blend = (from, to, amount) => '#' + rgb(from).map((part, index) => Math.round(part + (rgb(to)[index] - part) * amount).toString(16).padStart(2, '0')).join('');
  const luminance = value => {
    const parts = rgb(value).map(part => { const channel = part / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
    return .2126 * parts[0] + .7152 * parts[1] + .0722 * parts[2];
  };
  const contrast = (one, two) => { const [light, dark] = [luminance(one), luminance(two)].sort((a, b) => b - a); return (light + .05) / (dark + .05); };
  function readable(candidate, background, fallback) {
    if (contrast(candidate, background) >= 4.5) return candidate;
    for (let amount = .15; amount <= 1; amount += .05) {
      const lighter = blend(candidate, '#ffffff', amount);
      if (contrast(lighter, background) >= 4.5) return lighter;
      const darker = blend(candidate, '#000000', amount);
      if (contrast(darker, background) >= 4.5) return darker;
    }
    return fallback;
  }
  function semanticTheme(theme = {}) {
    const panel = hex(theme.panel);
    const background = hex(theme.bg);
    const onAccent = [hex(theme.text), background, '#ffffff', '#000000'].sort((a, b) => contrast(b, theme.accent) - contrast(a, theme.accent))[0];
    return {
      ...theme,
      raised: hex(theme.raised) !== '#000000' || theme.raised === '#000000' ? theme.raised : blend(panel, theme.text, .08),
      inset: hex(theme.inset) !== '#000000' || theme.inset === '#000000' ? theme.inset : blend(background, '#000000', .18),
      link: theme.link && contrast(theme.link, panel) >= 4.5 ? theme.link : readable(theme.accent2, panel, theme.text),
      focus: theme.focus && contrast(theme.focus, panel) >= 3 ? theme.focus : readable(theme.accent2, panel, theme.text),
      onAccent: theme.onAccent && contrast(theme.onAccent, theme.accent) >= 4.5 ? theme.onAccent : onAccent,
    };
  }
  // Callers own foreground, accessibility fallbacks, and removing these inline properties.
  // Settings use the persisted JSON schema. Parse in the caller's userscript realm
  // instead of returning a native structuredClone page-realm Xray wrapper.
  function cloneSettings(value) { return JSON.parse(JSON.stringify(value)); }
  function applyTextGradient(element, backgroundImage) {
    const properties = {'background-color':'transparent','background-image':backgroundImage,'background-clip':'text','-webkit-background-clip':'text','background-size':'auto','background-position':'0% 0%','background-repeat':'repeat'};
    for (const [property,value] of Object.entries(properties)) element.style.setProperty(property,value,'important');
  }
  function replaceMenuContent(container, content) {
    const summary = node => node.querySelector(':scope > summary')?.textContent.trim();
    const expanded = new Set([...container.querySelectorAll('details[open]')].map(summary));
    container.replaceChildren(content);
    for (const node of container.querySelectorAll('details')) if (expanded.has(summary(node))) node.open = true;
  }
  function createDisclosure(label, ...contents) {
    return ExpMenuArrangement.createDisclosure({
      document,
      label,
      category: 'advanced',
      contents,
      className: 'exp-system-card',
    });
  }
  function createSystemGrid(...contents) {
    const grid = document.createElement('div'); grid.dataset.expSystemTools = '1';
    grid.append(...contents); return grid;
  }
  // One suite size. Placement clamps this preferred width to the viewport.
  function menuWidth() { return ExpMenuPreferences.menuSizeTokens().width; }
  const canonicalCss = CoreFoundation.css();
  const compositionCss = `
    [data-exp-part="dock"]{box-sizing:border-box;overflow-x:hidden;overscroll-behavior:contain}
    [data-exp-part="dock"] :is(.row,.group,.section,.fl-tool-body,.route-body,.fl-tool-title){min-width:0;max-width:100%;overflow-wrap:anywhere!important}
    [data-exp-part="dock"] :is(input,select,textarea){min-width:0;max-width:100%}
    .update-notice,.changelog{max-height:calc(100vh - 24px)!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;overflow-wrap:anywhere}

    [data-exp-system-tools]{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;align-items:stretch;grid-column:1/-1!important;min-width:0}
    [data-exp-system-tools]>details{box-sizing:border-box;min-width:0;margin:0!important;padding:7px!important;border:1px solid var(--theme-line);border-radius:7px;grid-column:auto!important;overflow-wrap:anywhere}
    [data-exp-system-tools]>details[open]{grid-column:1/-1!important}
    [data-exp-system-tools]>details>summary{cursor:pointer;font-weight:600}
    .exp-system-card>summary{cursor:pointer}
    .exp-system-card>summary+*{margin-top:6px}
    :host{color-scheme:dark}
    [data-exp-part="launcher"]{box-sizing:border-box!important;width:48px!important;min-width:48px!important;max-width:48px!important;height:48px!important;min-height:48px!important;max-height:48px!important}
    [data-exp-part="launcher"] .launcher-icon{width:40px!important;height:40px!important}
    .header-icon{width:38px!important;height:38px!important}
    .header-icon .menu-icon{width:38px!important;height:38px!important}
    :host([data-exp-theme-deprioritized="1"]) .theme-row:has(.exp-theme-swatches),:host([data-exp-theme-deprioritized="1"]) #mb-theme-dots{display:none!important}
    :host([data-exp-theme-deprioritized="1"]) #mb-cluster{--mb-bg:var(--theme-bg)!important;--mb-surface:var(--theme-panel)!important;--mb-chip:var(--theme-raised)!important;--mb-ink:var(--theme-text)!important;--mb-muted:var(--theme-muted)!important;--mb-line:var(--theme-line)!important;--mb-brand:var(--theme-accent)!important;--mb-brand-ink:var(--theme-onAccent)!important;--mb-hover:var(--theme-raised)!important;--mb-track:var(--theme-line)!important}
    [hidden]{display:none!important}
    .exp-core-theme{position:static;display:contents;color:var(--theme-text);font:13px/1.42 ui-sans-serif,system-ui,"Segoe UI",sans-serif}
    [data-exp-part="dock"],[data-exp-part="launcher"]{position:fixed}
    [data-exp-part="dock"]{color:var(--theme-text);scrollbar-width:thin}
    [data-exp-part="dock"] [data-exp-part="title"]{color:var(--theme-text)}
    .exp-core-theme a{color:var(--theme-link)}
    button,input,select,textarea{font-family:inherit}
    button{color:inherit}
    button:disabled{opacity:.5;cursor:not-allowed}
    button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--theme-focus);outline-offset:2px}
    button.fl-tool-header{width:100%;border:0;background:transparent;color:var(--theme-text);text-align:left;font:inherit}
    .fl-tool-header .fl-tool-chevron{font:var(--exp-font-size-body,13px)/1.42 system-ui}
    .fl-tool-body[hidden]{display:none!important}
    .fl-tool-body>.group,.fl-tool-body>.section,.fl-tool-body>.flat-group{grid-column:1/-1;min-width:0}
    .fl-tool-body :is(.group,.section,.flat-group){display:grid!important;grid-template-columns:minmax(0,1fr)!important}
    .fl-tool-body :is(.group,.section,.flat-group)>*{grid-column:1/-1!important;min-width:0}
    .group,.section,.flat-group{margin:0;padding:0;border:0;background:transparent}
    .group>h3,.section>h3,.section>h2{margin:8px 0 3px;font-size:var(--exp-font-size-small,11px);font-weight:800;color:var(--theme-muted)}
    .group:first-child>h3,.section:first-child>h3{margin-top:6px}
    .group>.row,.section>.row,.flat-group>.row{min-width:0}
    .row>.copy,.row>.row-copy,.row>.setting-label,.row>div:first-child{min-width:0;flex:1}
    .label,.copy>strong,.row-copy>strong,.setting-label{font-size:var(--exp-font-size-body,13px);font-weight:500;line-height:1.25}
    .copy>.help,.row-copy>small,.help,.empty,.note,.meta{font-size:var(--exp-font-size-small,11px);line-height:1.4;color:var(--theme-muted)}
    .copy>.help,.row-copy>small{display:block;margin-top:3px}
    .toggleSwitch{padding:0;min-width:34px;max-width:34px;min-height:20px;max-height:20px}
    .toggleSwitch>span{display:none}
    .row>.life-btn,.mini-row>.life-btn{width:auto;min-width:50px;margin:0;padding:3px 7px}
    .row>select,.mini-row>select{max-width:55%}
    .button-grid,.actions,.profile-actions,.menu-footer,.diagnostics-controls>div,.rules-transfer{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;min-width:0}
    .button-grid>*{min-width:0}
    .life-btn.warn{border-color:#cb6868!important;background:#402020!important;color:#ffd7d7!important}
    input:not([type=file]),textarea{box-sizing:border-box;max-width:100%;min-width:0;border:1px solid var(--theme-line);border-radius:6px;background:var(--theme-inset);color:var(--theme-text);padding:5px 6px;font-size:var(--exp-font-size-body,13px)}
    input[type=search],textarea{width:100%}
    .identity{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--theme-line)}
    .identity>.copy{flex:1;min-width:0}
    .identity-actions{display:flex;gap:6px;align-items:center}
    .identity-actions>.life-btn{width:auto;margin:0;padding:3px 6px}
    .theme-row{flex-wrap:wrap}
    .exp-theme-swatches{min-width:0}
    .appearance-group,.auth-advanced,.rule-card,.stat-card{grid-column:1/-1;min-width:0;border:1px solid var(--theme-line);border-radius:7px;margin-top:6px;padding:6px;background:var(--theme-inset)}
    summary{cursor:pointer;font-size:var(--exp-font-size-body,13px)}
    .feature-pair,.category-grid{display:block}
    .status-value,output{font-size:var(--exp-font-size-small,11px);color:var(--theme-muted)}
    .live,.sr-only,.status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    .toast{position:fixed;z-index:2147483647;right:12px;max-width:calc(100vw - 24px)}
    .update-notice{position:fixed;z-index:2147483647}
    .diag{margin:6px 0 0}
    .diag[hidden]{display:none!important}
    .diag:not([hidden]){display:block}
    .utility-grid,.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    .workspace-actions{grid-column:1/-1}
    .setting-arrow,.step-btn{width:25px;min-height:25px;border:1px solid var(--theme-line);border-radius:6px;background:var(--theme-raised);color:var(--theme-text)}
    .step-value{flex:1;text-align:center;font-size:var(--exp-font-size-small,11px)}
    .stepper{display:flex;align-items:center;gap:5px}
  `;
  const TOGGLE = ':is(.toggleSwitch,.switch,[role="switch"])';
  const TOGGLE_BG = 'var(--theme-bg,var(--bg,#111114))';
  const TOGGLE_PANEL = 'var(--theme-panel,var(--panel,var(--surface,#18181d)))';
  const TOGGLE_LINE = 'var(--theme-line,var(--line,var(--border,#41434d)))';
  const TOGGLE_MUTED = 'var(--theme-muted,var(--muted,#9aa0a6))';
  const TOGGLE_TEXT = 'var(--theme-text,var(--text,#f4f4f6))';
  const TOGGLE_ACCENT = 'var(--theme-accent,var(--accent,var(--teal,#8b5cf6)))';
  const MATTE_TOGGLE_CHROME_CSS = `${TOGGLE}{position:relative!important;box-sizing:border-box!important;flex:none!important;width:34px!important;height:20px!important;min-width:34px!important;min-height:20px!important;padding:0!important;border:1px solid color-mix(in srgb,${TOGGLE_LINE} 88%,${TOGGLE_MUTED} 12%)!important;border-radius:6px!important;background:color-mix(in srgb,${TOGGLE_BG} 84%,${TOGGLE_PANEL} 16%)!important;background-image:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.018)!important;cursor:pointer!important}${TOGGLE}:not(:has(> span))::after{content:""!important;position:absolute!important;top:2px!important;left:2px!important;width:14px!important;height:14px!important;box-sizing:border-box!important;border:0!important;border-radius:4px!important;background:color-mix(in srgb,${TOGGLE_MUTED} 82%,${TOGGLE_TEXT} 18%)!important;box-shadow:none!important}${TOGGLE}>span{display:block!important;position:absolute!important;top:2px!important;left:2px!important;width:14px!important;height:14px!important;box-sizing:border-box!important;border:0!important;border-radius:4px!important;background:color-mix(in srgb,${TOGGLE_MUTED} 82%,${TOGGLE_TEXT} 18%)!important;box-shadow:none!important}${TOGGLE}[aria-checked="true"]{border-color:color-mix(in srgb,${TOGGLE_LINE} 52%,${TOGGLE_ACCENT} 48%)!important;background:color-mix(in srgb,${TOGGLE_PANEL} 72%,${TOGGLE_ACCENT} 28%)!important;background-image:none!important}${TOGGLE}[aria-checked="true"]:not(:has(> span))::after{transform:translateX(14px)!important;background:${TOGGLE_TEXT}!important}${TOGGLE}[aria-checked="true"]>span{transform:translateX(14px)!important;background:${TOGGLE_TEXT}!important}:host([data-ui-theme="pride"]) ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-ui-theme="pride"] ${TOGGLE}[aria-checked="true"],:host([data-theme-skin="gradient"]) ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-theme-skin="gradient"]:not([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"]{background-image:none!important;border-color:color-mix(in srgb,${TOGGLE_LINE} 52%,${TOGGLE_ACCENT} 48%)!important;background:color-mix(in srgb,${TOGGLE_PANEL} 72%,${TOGGLE_ACCENT} 28%)!important}:host([data-ui-theme="contrast"]) ${TOGGLE},:host([data-ui-theme="obsidian"]) ${TOGGLE},.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE},.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}{border:2px solid #fff!important;background:#050505!important;background-image:none!important}:host([data-ui-theme="contrast"]) ${TOGGLE}:not(:has(> span))::after,:host([data-ui-theme="obsidian"]) ${TOGGLE}:not(:has(> span))::after,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}:not(:has(> span))::after,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}:not(:has(> span))::after{top:0!important;left:0!important;border:1px solid #050505!important;background:#fff!important}:host([data-ui-theme="contrast"]) ${TOGGLE}>span,:host([data-ui-theme="obsidian"]) ${TOGGLE}>span,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}>span,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}>span{top:0!important;left:0!important;border:1px solid #050505!important;background:#fff!important}:host([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"],:host([data-ui-theme="obsidian"]) ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}[aria-checked="true"],.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}[aria-checked="true"]{background:#fff!important;border-color:#fff!important;background-image:none!important}:host([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after,:host([data-ui-theme="obsidian"]) ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}[aria-checked="true"]:not(:has(> span))::after{background:#050505!important;border-color:#fff!important;transform:translateX(14px)!important}:host([data-ui-theme="contrast"]) ${TOGGLE}[aria-checked="true"]>span,:host([data-ui-theme="obsidian"]) ${TOGGLE}[aria-checked="true"]>span,.exp-core-theme[data-ui-theme="contrast"] ${TOGGLE}[aria-checked="true"]>span,.exp-core-theme[data-ui-theme="obsidian"] ${TOGGLE}[aria-checked="true"]>span{background:#050505!important;border-color:#fff!important;transform:translateX(14px)!important}@media (forced-colors: active){${TOGGLE}{forced-color-adjust:none;border:1px solid CanvasText!important;background:Canvas!important;background-image:none!important}${TOGGLE}:not(:has(> span))::after{border-color:CanvasText!important;background:CanvasText!important}${TOGGLE}>span{border-color:CanvasText!important;background:CanvasText!important}${TOGGLE}[aria-checked="true"]{border-color:Highlight!important;background:Highlight!important;background-image:none!important}${TOGGLE}[aria-checked="true"]:not(:has(> span))::after{border-color:HighlightText!important;background:HighlightText!important}${TOGGLE}[aria-checked="true"]>span{border-color:HighlightText!important;background:HighlightText!important}}`;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const emit = (type, productId) => document.dispatchEvent(new CustomEvent('exp-core:coordination', { detail: { protocol, type, productId } }));

  function normalizeSuiteCapabilities(values = []) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map(value => String(value || '').trim().toLowerCase()).filter(value => /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(value)))];
  }

  function suiteContract(productId) {
    const id = String(productId || '').toLowerCase();
    const known = SUITE_PRODUCTS[id];
    if (!known) return null;
    return Object.freeze({
      id,
      role: known.role || 'product',
      repository: known.repository || '',
      rootId: known.rootId || '',
      priority: Number(known.priority || SUITE_PRIORITY[id] || 0),
      launcherPriority: Number(known.launcherPriority || LAUNCHER_PRIORITY[id] || 0),
      themePriority: Number(known.themePriority || THEME_PRIORITY[id] || 0),
      capabilities: Object.freeze(normalizeSuiteCapabilities(known.capabilities)),
      presentationPhases: Object.freeze(normalizePresentationPhases(known.presentationPhases || [])),
      menuSections: Object.freeze(Object.fromEntries(
        Object.entries(known.menuSections || {}).map(([category, sections]) => [category, Object.freeze([...sections])])
      )),
      state: known.state ? Object.freeze({
        type: known.state.type,
        fields: Object.freeze({ ...known.state.fields }),
      }) : null,
    });
  }

  function suiteProductNode(productId) {
    const id = String(productId || '').toLowerCase();
    if (!/^[a-z][a-z0-9-]+$/.test(id)) return null;
    return [...document.querySelectorAll('[data-exp-suite-product]')]
      .find(node => node.dataset.expSuiteProduct === id) || null;
  }

  function registerSuiteProduct(options = {}) {
    const id = String(options.id || options.productId || '').toLowerCase();
    const productVersion = String(options.version || options.productVersion || 'unknown');
    if (!/^[a-z][a-z0-9-]+$/.test(id)) throw new Error('Invalid suite product ID');
    const contract = suiteContract(id);
    const capabilities = normalizeSuiteCapabilities(contract ? contract.capabilities : options.capabilities);
    const priority = Number(contract?.priority ?? options.priority ?? 0);
    const role = String(contract?.role ?? options.role ?? 'product');
    let node = suiteProductNode(id);
    const previous = node ? JSON.stringify({
      version: node.dataset.expSuiteVersion || '',
      coreVersion: node.dataset.expSuiteCoreVersion || '',
      role: node.dataset.expSuiteRole || '',
      priority: node.dataset.expSuitePriority || '',
      capabilities: node.dataset.expSuiteCapabilities || '[]',
    }) : null;
    if (!node) {
      node = document.createElement('meta');
      node.dataset.expSuiteProduct = id;
      (document.documentElement || document.head || document.body)?.append(node);
    }
    node.dataset.expSuiteVersion = productVersion;
    node.dataset.expSuiteCoreVersion = version;
    node.dataset.expSuiteRole = role;
    node.dataset.expSuitePriority = String(Number.isFinite(priority) ? priority : 0);
    node.dataset.expSuiteCapabilities = JSON.stringify(capabilities);
    const current = JSON.stringify({
      version: node.dataset.expSuiteVersion,
      coreVersion: node.dataset.expSuiteCoreVersion,
      role: node.dataset.expSuiteRole,
      priority: node.dataset.expSuitePriority,
      capabilities: node.dataset.expSuiteCapabilities,
    });
    if (previous !== current) emitSuiteEvent(id, 'product.registered', { capabilities, role, version: productVersion });
    return Object.freeze({
      id,
      update(next = {}) { return registerSuiteProduct({ id, version: productVersion, role, priority, capabilities, ...next }); },
      dispose() {
        const current = suiteProductNode(id);
        if (current === node) current.remove();
        emitSuiteEvent(id, 'product.unregistered', {});
      },
    });
  }

  function suiteSnapshot() {
    const products = [...document.querySelectorAll('[data-exp-suite-product]')].map(node => {
      let capabilities = [];
      try { capabilities = normalizeSuiteCapabilities(JSON.parse(node.dataset.expSuiteCapabilities || '[]')); } catch {}
      return Object.freeze({
        id: node.dataset.expSuiteProduct,
        version: node.dataset.expSuiteVersion || 'unknown',
        coreVersion: node.dataset.expSuiteCoreVersion || 'unknown',
        role: node.dataset.expSuiteRole || 'product',
        priority: Number(node.dataset.expSuitePriority || 0),
        capabilities: Object.freeze(capabilities),
      });
    }).filter(product => product.id)
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
    return Object.freeze({
      protocol: 'exp-suite-interoperability-v1',
      coreVersion: version,
      trust: SUITE_TRUST,
      products: Object.freeze(products),
    });
  }

  function capabilityProviders(capability) {
    const name = String(capability || '').trim().toLowerCase();
    return Object.freeze(suiteSnapshot().products.filter(product => product.capabilities.includes(name)));
  }

  function hasProductCapability(capability) {
    return capabilityProviders(capability).length > 0;
  }

  function pageContext() {
    return Object.freeze({
      href: location.href,
      origin: location.origin,
      hostname: location.hostname,
      pathname: location.pathname,
      topLevel: window.top === window.self,
    });
  }

  function navigationObserverMarker() {
    return document.querySelector('meta[data-exp-navigation-observer]');
  }

  function ensureSharedNavigationObserver(owner = 'core') {
    let marker = navigationObserverMarker();
    if (marker) return Object.freeze({ leader: false, owner: marker.dataset.expNavigationObserver || 'unknown' });
    marker = document.createElement('meta');
    marker.dataset.expOwned = '1';
    marker.dataset.expNavigationObserver = String(owner || 'core').toLowerCase();
    marker.dataset.expNavigationProtocol = 'exp-navigation-observer-v1';
    marker.dataset.expNavigationEpoch = '0';
    marker.dataset.expNavigationSubscribers = '0';
    (document.head || document.documentElement || document.body)?.append(marker);

    let previous = location.href;
    let epoch = 0;
    let pendingHistoryKind = '';
    let disposed = false;
    const publish = kind => {
      if (disposed) return false;
      const href = location.href;
      if (href === previous) return false;
      previous = href;
      epoch += 1;
      marker.dataset.expNavigationEpoch = String(epoch);
      const payload = JSON.stringify({
        protocol: 'exp-navigation-observer-v1',
        owner: marker.dataset.expNavigationObserver,
        epoch,
        kind: String(kind || 'navigation'),
        href,
        at: Date.now(),
      });
      document.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: payload }));
      return true;
    };
    const originals = {};
    const wrappers = {};
    for (const name of ['pushState', 'replaceState']) {
      const original = history[name];
      originals[name] = original;
      const wrapped = function (...args) {
        const priorKind = pendingHistoryKind;
        pendingHistoryKind = name;
        try {
          const result = Reflect.apply(original, this, args);
          publish(name);
          return result;
        } finally {
          pendingHistoryKind = priorKind;
        }
      };
      wrappers[name] = wrapped;
      history[name] = wrapped;
    }
    const onPopState = () => publish('popstate');
    const onHashChange = () => publish('hashchange');
    const onCurrentEntryChange = () => publish(pendingHistoryKind || 'currententrychange');
    addEventListener('popstate', onPopState);
    addEventListener('hashchange', onHashChange);
    globalThis.navigation?.addEventListener('currententrychange', onCurrentEntryChange);
    const teardown = () => {
      if (disposed || Number(marker.dataset.expNavigationSubscribers || 0) > 0) return false;
      disposed = true;
      for (const name of Object.keys(wrappers)) if (history[name] === wrappers[name]) history[name] = originals[name];
      removeEventListener('popstate', onPopState);
      removeEventListener('hashchange', onHashChange);
      globalThis.navigation?.removeEventListener('currententrychange', onCurrentEntryChange);
      document.removeEventListener(NAVIGATION_CONTROL_EVENT, onControl);
      if (marker.isConnected) marker.remove();
      return true;
    };
    const onControl = event => {
      let payload;
      try { payload = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail; } catch { return; }
      if (!payload || payload.protocol !== 'exp-navigation-observer-v1' || payload.type !== 'release-if-idle') return;
      teardown();
    };
    document.addEventListener(NAVIGATION_CONTROL_EVENT, onControl);
    return Object.freeze({ leader: true, owner: marker.dataset.expNavigationObserver });
  }

  function observeNavigation(callback, options = {}) {
    if (typeof callback !== 'function') throw new TypeError('Navigation callback must be a function');
    ensureSharedNavigationObserver(options.productId || options.owner || 'core');
    let marker = navigationObserverMarker();
    if (marker) marker.dataset.expNavigationSubscribers = String(Number(marker.dataset.expNavigationSubscribers || 0) + 1);
    const listener = event => {
      let payload;
      try { payload = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail; } catch { return; }
      if (!payload || payload.protocol !== 'exp-navigation-observer-v1') return;
      callback(Object.freeze({ ...payload }));
    };
    document.addEventListener(NAVIGATION_EVENT, listener);
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      document.removeEventListener(NAVIGATION_EVENT, listener);
      marker = navigationObserverMarker();
      if (!marker) return;
      const next = Math.max(0, Number(marker.dataset.expNavigationSubscribers || 0) - 1);
      marker.dataset.expNavigationSubscribers = String(next);
      if (!next) document.dispatchEvent(new CustomEvent(NAVIGATION_CONTROL_EVENT, {
        detail: JSON.stringify({ protocol: 'exp-navigation-observer-v1', type: 'release-if-idle' }),
      }));
    };
  }

  function navigationObserverState() {
    const marker = navigationObserverMarker();
    return Object.freeze({
      active: Boolean(marker),
      owner: marker?.dataset.expNavigationObserver || null,
      protocol: marker?.dataset.expNavigationProtocol || null,
      epoch: Number(marker?.dataset.expNavigationEpoch || 0),
      subscribers: Number(marker?.dataset.expNavigationSubscribers || 0),
    });
  }

  function emitSuiteEvent(productId, type, detail = {}) {
    const source = String(productId || 'core').toLowerCase();
    const eventType = String(type || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(eventType)) throw new Error('Invalid suite event type');
    let safeDetail = {};
    try { safeDetail = JSON.parse(JSON.stringify(detail || {})); } catch {}
    const payload = JSON.stringify({
      protocol: 'exp-suite-interoperability-v1',
      coreVersion: version,
      trust: SUITE_TRUST,
      source,
      type: eventType,
      detail: safeDetail,
      at: Date.now(),
    });
    document.dispatchEvent(new CustomEvent(SUITE_EVENT, { detail: payload }));
  }

  function suiteSiteKey(hostname = location.hostname) {
    return `${SUITE_SITE_PAUSE_PREFIX}${String(hostname || 'local-document').trim().toLowerCase()}`;
  }

  // A DOM marker shares a failed persistence write across isolated Core copies on this page.
  function suitePauseFallback(hostname = location.hostname) {
    return [...document.querySelectorAll('meta[data-exp-suite-pause-fallback]')].find(node=>node.dataset.expSuitePauseFallback===suiteSiteKey(hostname));
  }
  function suitePauseValue(hostname = location.hostname) {
    const fallback=suitePauseFallback(hostname);
    if(fallback)return Number(fallback.dataset.until)||0;
    try{return Number(localStorage.getItem(suiteSiteKey(hostname)))||0;}catch{return 0;}
  }
  function suiteSitePausePersisted(hostname = location.hostname) {return !suitePauseFallback(hostname);}
  function suiteSitePaused(hostname = location.hostname) {
    const value=suitePauseValue(hostname);return value===1||value>Date.now();
  }

  function setSuiteSitePaused(paused, hostname = location.hostname, minutes = 0) {
    const host = String(hostname || 'local-document').trim().toLowerCase();
    const value = Boolean(paused);
    const until=value?(Number(minutes)>0?Date.now()+Math.min(1440,Number(minutes))*60000:1):0;
    const fallback=suitePauseFallback(host)||document.createElement('meta');
    fallback.dataset.expOwned='1';fallback.dataset.expSuitePauseFallback=suiteSiteKey(host);fallback.dataset.until=String(until);
    if(!fallback.isConnected)(document.head||document.documentElement).append(fallback);
    try {
      if (value) localStorage.setItem(suiteSiteKey(host),String(until));
      else localStorage.removeItem(suiteSiteKey(host));
      if((Number(localStorage.getItem(suiteSiteKey(host)))||0)===until)fallback.remove();
    } catch {}
    emitSuiteEvent('core', 'suite.site-control', { hostname: host, paused: value });
    scheduleSuitePauseExpiry();
    return value;
  }
  function scheduleSuitePauseExpiry(){clearTimeout(suitePauseTimer);const until=suitePauseValue();if(until>1){suitePauseTimer=setTimeout(()=>{if(suitePauseValue()===until)setSuiteSitePaused(false);else scheduleSuitePauseExpiry();},Math.max(0,until-Date.now()));}}
  addEventListener('storage',event=>{if(event.key!==suiteSiteKey())return;suitePauseFallback()?.remove();emitSuiteEvent('core','suite.site-control',{hostname:String(location.hostname||'local-document').toLowerCase(),paused:suiteSitePaused()});scheduleSuitePauseExpiry();});
  scheduleSuitePauseExpiry();

  function stableSuiteValue(value) {
    if (Array.isArray(value)) return value.map(stableSuiteValue);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableSuiteValue(value[key])]));
  }

  function normalizeSuiteStateForContract(productId, type, state = {}) {
    const source = String(productId || '').toLowerCase();
    const eventType = String(type || '').trim().toLowerCase();
    const contract = suiteContract(source);
    const schema = contract?.state;
    const input = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
    if (!schema || schema.type !== eventType) return stableSuiteValue(input);
    const keys = Object.keys(input);
    const expected = Object.keys(schema.fields);
    const unknown = keys.filter(key => !Object.hasOwn(schema.fields, key));
    if (unknown.length) throw new Error(`Unknown suite state field: ${unknown[0]}`);
    const missing = expected.filter(key => !Object.hasOwn(input, key));
    if (missing.length) throw new Error(`Missing suite state field: ${missing[0]}`);
    const output = {};
    for (const [key, kind] of Object.entries(schema.fields)) {
      const value = input[key];
      if (kind === 'boolean') {
        if (typeof value !== 'boolean') throw new Error(`Invalid boolean suite state field: ${key}`);
        output[key] = value;
      } else if (kind === 'token') {
        const token = String(value ?? '').trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9._:-]{0,79}$/.test(token)) throw new Error(`Invalid token suite state field: ${key}`);
        output[key] = token;
      } else if (kind === 'count') {
        const count = Number(value);
        if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Invalid count suite state field: ${key}`);
        output[key] = count;
      } else if (kind === 'percent-nullable') {
        if (value === null) output[key] = null;
        else {
          const percent = Number(value);
          if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error(`Invalid percent suite state field: ${key}`);
          output[key] = percent;
        }
      } else {
        throw new Error(`Unsupported suite state schema kind: ${kind}`);
      }
    }
    return stableSuiteValue(output);
  }

  function suiteStateNode(productId, type) {
    const source = String(productId || '').toLowerCase();
    const eventType = String(type || '').trim().toLowerCase();
    return [...document.querySelectorAll('meta[data-exp-suite-state-product][data-exp-suite-state-type]')]
      .find(node => node.dataset.expSuiteStateProduct === source && node.dataset.expSuiteStateType === eventType) || null;
  }

  function readSuiteStateNode(node) {
    if (!(node instanceof Element)) return null;
    let state = {};
    try { state = JSON.parse(node.dataset.expSuiteStatePayload || '{}'); } catch {}
    return Object.freeze({
      productId: node.dataset.expSuiteStateProduct || '',
      type: node.dataset.expSuiteStateType || '',
      coreVersion: node.dataset.expSuiteStateCoreVersion || 'unknown',
      trust: node.dataset.expSuiteStateTrust || SUITE_TRUST,
      at: Number(node.dataset.expSuiteStateAt || 0),
      state: Object.freeze(stableSuiteValue(state && typeof state === 'object' ? state : {})),
    });
  }

  function suiteStateSnapshot(productId = '') {
    const source = String(productId || '').toLowerCase();
    return Object.freeze(
      [...document.querySelectorAll('meta[data-exp-suite-state-product][data-exp-suite-state-type]')]
        .filter(node => !source || node.dataset.expSuiteStateProduct === source)
        .map(readSuiteStateNode)
        .filter(Boolean)
        .sort((left, right) => left.productId.localeCompare(right.productId) || left.type.localeCompare(right.type))
    );
  }

  function latestSuiteState(productId, type = '') {
    const source = String(productId || '').toLowerCase();
    const eventType = String(type || '').trim().toLowerCase();
    const states = suiteStateSnapshot(source).filter(entry => !eventType || entry.type === eventType);
    return states.sort((left, right) => right.at - left.at)[0] || null;
  }

  function publishSuiteState(productId, type, state = {}) {
    const source = String(productId || '').toLowerCase();
    const eventType = String(type || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]+$/.test(source)) throw new Error('Invalid suite state product ID');
    if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(eventType)) throw new Error('Invalid suite state event type');
    let safeState = {};
    try {
      safeState = normalizeSuiteStateForContract(source, eventType, JSON.parse(JSON.stringify(state || {})));
    } catch (error) {
      throw error;
    }
    const serialized = JSON.stringify(safeState);
    if (serialized.length > 4096) throw new Error('Suite state payload exceeds 4096 bytes');
    const key = `${source}:${eventType}`;
    let node = suiteStateNode(source, eventType);
    const sharedFingerprint = node?.dataset.expSuiteStatePayload || '';
    if (sharedFingerprint === serialized || suiteStateFingerprints.get(key) === serialized) return false;
    suiteStateFingerprints.set(key, serialized);
    if (!node) {
      node = document.createElement('meta');
      node.dataset.expOwned = '1';
      node.dataset.expSuiteStateProduct = source;
      node.dataset.expSuiteStateType = eventType;
      (document.head || document.documentElement || document.body)?.append(node);
    }
    node.dataset.expSuiteStatePayload = serialized;
    node.dataset.expSuiteStateCoreVersion = version;
    node.dataset.expSuiteStateTrust = SUITE_TRUST;
    node.dataset.expSuiteStateAt = String(Date.now());
    emitSuiteEvent(source, eventType, safeState);
    return true;
  }

  function onSuiteEvent(callback, options = {}) {
    if (typeof callback !== 'function') throw new TypeError('Suite event callback must be a function');
    const expectedType = options.type ? String(options.type).toLowerCase() : null;
    const listener = event => {
      let payload;
      try { payload = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail; } catch { return; }
      if (!payload || payload.protocol !== 'exp-suite-interoperability-v1') return;
      if (expectedType && payload.type !== expectedType) return;
      callback(payload);
    };
    document.addEventListener(SUITE_EVENT, listener);
    return () => document.removeEventListener(SUITE_EVENT, listener);
  }

  function subscribeSuiteState(productId, callback, options = {}) {
    if (typeof callback !== 'function') throw new TypeError('Suite state callback must be a function');
    const source = String(productId || '').toLowerCase();
    if (!/^[a-z][a-z0-9-]+$/.test(source)) throw new Error('Invalid suite state product ID');
    const contractType = suiteContract(source)?.state?.type || '';
    const eventType = String(options.type || contractType).trim().toLowerCase();
    if (eventType && !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(eventType)) throw new Error('Invalid suite state event type');
    let disposed = false;
    const deliver = entry => {
      if (disposed || !entry) return;
      callback(Object.freeze({ ...entry, state: Object.freeze(stableSuiteValue(entry.state || {})) }));
    };
    if (options.immediate !== false) deliver(latestSuiteState(source, eventType));
    const stop = onSuiteEvent(event => {
      if (event.source !== source) return;
      if (eventType && event.type !== eventType) return;
      deliver(latestSuiteState(source, eventType));
    }, eventType ? { type: eventType } : {});
    return () => {
      if (disposed) return;
      disposed = true;
      stop();
    };
  }

  function normalizePresentationPhases(values = []) {
    const list = Array.isArray(values) ? values : [values];
    return [...new Set(list.map(value => String(value || '').trim().toLowerCase()).filter(value => PRESENTATION_PHASES[value]))]
      .sort((left, right) => PRESENTATION_PHASES[left] - PRESENTATION_PHASES[right]);
  }

  function presentationProviderNode(productId) {
    const id = String(productId || '').toLowerCase();
    if (!/^[a-z][a-z0-9-]+$/.test(id)) return null;
    return [...document.querySelectorAll('[data-exp-presentation-provider]')]
      .find(node => node.dataset.expPresentationProvider === id) || null;
  }

  function registerPresentationProvider(options = {}) {
    const id = String(options.id || options.productId || '').toLowerCase();
    if (!/^[a-z][a-z0-9-]+$/.test(id)) throw new Error('Invalid presentation product ID');
    const contract = suiteContract(id);
    if (contract && !contract.presentationPhases.length) throw new Error('Presentation provider is not declared for this suite product');
    const phases = normalizePresentationPhases(contract ? contract.presentationPhases : options.phases || options.phase);
    if (!phases.length) throw new Error('Presentation provider requires at least one valid phase');
    let node = presentationProviderNode(id);
    const previous = node ? JSON.stringify({
      phases: node.dataset.expPresentationPhases || '[]',
      priority: node.dataset.expPresentationPriority || '',
    }) : null;
    if (!node) {
      node = document.createElement('meta');
      node.dataset.expPresentationProvider = id;
      (document.documentElement || document.head || document.body)?.append(node);
    }
    node.dataset.expPresentationPhases = JSON.stringify(phases);
    node.dataset.expPresentationPriority = String(Number(contract?.priority ?? options.priority ?? 0) || 0);
    const current = JSON.stringify({
      phases: node.dataset.expPresentationPhases,
      priority: node.dataset.expPresentationPriority,
    });
    if (previous !== current) emitSuiteEvent(id, 'presentation.provider-registered', { phases });
    return Object.freeze({
      id,
      phases: Object.freeze([...phases]),
      dispose() {
        const current = presentationProviderNode(id);
        if (current === node) current.remove();
        emitSuiteEvent(id, 'presentation.provider-unregistered', {});
      },
    });
  }

  function presentationProviders() {
    return Object.freeze([...document.querySelectorAll('[data-exp-presentation-provider]')].map(node => {
      let phases = [];
      try { phases = normalizePresentationPhases(JSON.parse(node.dataset.expPresentationPhases || '[]')); } catch {}
      return Object.freeze({
        id: node.dataset.expPresentationProvider,
        phases: Object.freeze(phases),
        priority: Number(node.dataset.expPresentationPriority || 0),
      });
    }).filter(provider => provider.id)
      .sort((left, right) => {
        const leftPhase = Math.min(...left.phases.map(phase => PRESENTATION_PHASES[phase]));
        const rightPhase = Math.min(...right.phases.map(phase => PRESENTATION_PHASES[phase]));
        return leftPhase - rightPhase || right.priority - left.priority || left.id.localeCompare(right.id);
      }));
  }

  function suiteHealth() {
    const suite = suiteSnapshot();
    const providers = presentationProviders();
    const providerMap = new Map(providers.map(provider => [provider.id, provider]));
    const conflicts = [];
    const sameList = (left = [], right = []) => left.length === right.length && left.every((value, index) => value === right[index]);
    const products = suite.products.map(product => {
      const contract = suiteContract(product.id);
      if (!contract) {
        conflicts.push({ type: 'unknown-suite-product', products: [product.id] });
        return Object.freeze({ id: product.id, status: 'unknown-product' });
      }
      const expectedCapabilities = [...contract.capabilities].sort();
      const actualCapabilities = [...product.capabilities].sort();
      const provider = providerMap.get(product.id) || null;
      const expectedPhases = [...contract.presentationPhases];
      const actualPhases = provider ? [...provider.phases] : [];
      if (product.role !== contract.role) conflicts.push({ type: 'suite-role-mismatch', products: [product.id], expected: contract.role, actual: product.role });
      if (product.priority !== contract.priority) conflicts.push({ type: 'suite-priority-mismatch', products: [product.id], expected: contract.priority, actual: product.priority });
      if (!sameList(actualCapabilities, expectedCapabilities)) conflicts.push({ type: 'suite-capability-mismatch', products: [product.id], expected: expectedCapabilities, actual: actualCapabilities });
      if (expectedPhases.length && !provider) conflicts.push({ type: 'missing-presentation-provider', products: [product.id], expected: expectedPhases });
      if (!expectedPhases.length && provider) conflicts.push({ type: 'unexpected-presentation-provider', products: [product.id], actual: actualPhases });
      if (provider && !sameList(actualPhases, expectedPhases)) conflicts.push({ type: 'presentation-phase-mismatch', products: [product.id], expected: expectedPhases, actual: actualPhases });
      const latestState = latestSuiteState(product.id);
      return Object.freeze({
        id: product.id,
        status: conflicts.some(conflict => conflict.products?.includes(product.id)) ? 'conflict' : 'healthy',
        coreVersion: product.coreVersion,
        capabilities: Object.freeze(actualCapabilities),
        presentationPhases: Object.freeze(actualPhases),
        stateType: latestState?.type || null,
        stateAt: latestState?.at || 0,
        stateAgeMs: latestState?.at ? Math.max(0, Date.now() - latestState.at) : null,
        state: latestState?.state || null,
      });
    });
    const coreVersions = [...new Set(
      [...document.querySelectorAll('meta[data-exp-diagnostics-product]')]
        .map(node => node.dataset.expCoreVersion)
        .filter(Boolean)
    )].sort();
    if (coreVersions.length > 1) conflicts.push({ type: 'mixed-core-versions', coreVersions });
    const observerCount = document.querySelectorAll('meta[data-exp-page-observer]').length;
    if (observerCount > 1) conflicts.push({ type: 'duplicate-page-observer', instances: observerCount });
    return Object.freeze({
      status: conflicts.length ? 'conflicts-detected' : 'healthy',
      coreVersions: Object.freeze(coreVersions),
      observerCount,
      products: Object.freeze(products),
      conflicts: Object.freeze(conflicts.map(conflict => Object.freeze({ ...conflict }))),
    });
  }

  function readPresentationState(target) {
    if (!(target instanceof Element)) return Object.freeze({});
    try {
      const value = JSON.parse(target.getAttribute('data-exp-presentation-state') || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.freeze({});
      return Object.freeze(Object.fromEntries(Object.entries(value).map(([productId, state]) => [
        productId,
        Object.freeze({ ...(state && typeof state === 'object' && !Array.isArray(state) ? state : {}) }),
      ])));
    } catch {
      return Object.freeze({});
    }
  }

  function setPresentationState(target, productId, patch = {}) {
    if (!(target instanceof Element)) throw new TypeError('Presentation target must be an Element');
    const id = String(productId || '').toLowerCase();
    if (!/^[a-z][a-z0-9-]+$/.test(id)) throw new Error('Invalid presentation product ID');
    const previous = target.getAttribute('data-exp-presentation-state') || '';
    const current = JSON.parse(JSON.stringify(readPresentationState(target)));
    const next = { ...(current[id] || {}) };
    for (const [channel, raw] of Object.entries(patch || {})) {
      if (!PRESENTATION_CHANNELS.includes(channel)) continue;
      if (raw === null || raw === undefined || raw === '') delete next[channel];
      else {
        const value = String(raw).trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9._:-]{0,79}$/.test(value)) throw new Error('Invalid presentation state value');
        next[channel] = value;
      }
    }
    if (Object.keys(next).length) current[id] = next;
    else delete current[id];
    const serialized = Object.keys(current).length ? JSON.stringify(current) : '';
    if (serialized === previous) return readPresentationState(target);
    if (serialized) target.setAttribute('data-exp-presentation-state', serialized);
    else target.removeAttribute('data-exp-presentation-state');
    const phase = pageObserverMarker()?.dataset.expPageObserverPhase || null;
    const detail = JSON.stringify({
      protocol: 'exp-presentation-state-v1',
      source: id,
      channels: Object.keys(next),
      phase,
      at: Date.now(),
    });
    target.dispatchEvent(new CustomEvent(PRESENTATION_STATE_EVENT, {
      bubbles: true,
      composed: true,
      detail,
    }));
    emitSuiteEvent(id, 'presentation.state-changed', { channels: Object.keys(next), phase });
    return readPresentationState(target);
  }

  function clearPresentationState(target, productId) {
    return setPresentationState(target, productId, Object.fromEntries(PRESENTATION_CHANNELS.map(channel => [channel, null])));
  }

  // Only elements carrying the attribute are parsed; closest() skips the rest natively.
  // Visibility checks call this for every candidate element, so an ancestor-by-ancestor
  // JSON walk cost seconds on deep pages.
  function presentationStateChain(target) {
    const chain = [];
    let node = target instanceof Element ? target : target?.parentElement;
    while (node instanceof Element) {
      node = node.closest(PRESENTATION_STATE_SELECTOR);
      if (!node) break;
      const state = readPresentationState(node);
      if (Object.keys(state).length) chain.push(Object.freeze({ node, state }));
      node = node.parentElement;
    }
    return Object.freeze(chain);
  }

  const PRESENTATION_STATE_SELECTOR = '[data-exp-presentation-state]';
  function isPresentationSuppressed(target) {
    for (const entry of presentationStateChain(target)) {
      for (const state of Object.values(entry.state)) {
        if (state?.visibility === 'hide' || state?.visibility === 'collapse') return true;
      }
    }
    return false;
  }

  function pageObserverMarker() {
    return document.querySelector('meta[data-exp-page-observer]');
  }

  function ensureSharedPageObserver(owner = 'core', options = {}) {
    let marker = pageObserverMarker();
    if (marker) return Object.freeze({ leader: false, owner: marker.dataset.expPageObserver || 'unknown' });
    marker = document.createElement('meta');
    marker.dataset.expPageObserver = String(owner || 'core').toLowerCase();
    marker.dataset.expPageObserverProtocol = 'exp-page-observer-v1';
    marker.dataset.expPageObserverEpoch = '0';
    (document.documentElement || document.head || document.body)?.append(marker);

    const delay = Math.max(16, Math.min(500, Number(options.delayMs || 60) || 60));
    let timer = 0;
    let epoch = 0;
    const pending = new Map();
    const queue = (target, record) => {
      if (!(target instanceof Element)) return;
      if (target.closest?.('[data-exp-owned="1"]')) return;
      const state = pending.get(target) || { types: new Set(), added: 0, removed: 0 };
      state.types.add(record.type);
      state.added += record.addedNodes?.length || 0;
      state.removed += record.removedNodes?.length || 0;
      pending.set(target, state);
    };
    // Roots are delivered in chunks, each a complete epoch through every phase, and the
    // event loop gets a turn whenever a task has run past its budget: listeners do real
    // work per root, and one task holding a whole page's batch froze Reddit for seconds.
    const CHUNK_ROOTS = 32;
    const TASK_BUDGET_MS = 8;
    const flush = () => {
      timer = 0;
      const started = performance.now();
      while (pending.size) {
        const chunk = [];
        for (const entry of pending) {
          pending.delete(entry[0]);
          if (entry[0].isConnected) chunk.push(entry);
          if (chunk.length >= CHUNK_ROOTS) break;
        }
        if (chunk.length) deliver(chunk);
        if (pending.size && performance.now() - started >= TASK_BUDGET_MS) {
          timer = setTimeout(flush, 0);
          return;
        }
      }
    };
    const deliver = (entries) => {
      epoch += 1;
      marker.dataset.expPageObserverEpoch = String(epoch);
      const payloads = entries.map(([target, state], index) => [target, JSON.stringify({
        protocol: 'exp-page-observer-v1',
        owner: marker.dataset.expPageObserver,
        epoch,
        rootIndex: index,
        rootCount: entries.length,
        types: [...state.types].sort(),
        added: state.added,
        removed: state.removed,
        href: location.href,
        at: Date.now(),
      })]);
      payloads.forEach(([target, payload]) => {
        target.dispatchEvent(new CustomEvent(PAGE_BATCH_EVENT, { bubbles: true, composed: true, detail: payload }));
      });
      for (const phase of Object.keys(PRESENTATION_PHASES).sort((left, right) => PRESENTATION_PHASES[left] - PRESENTATION_PHASES[right])) {
        marker.dataset.expPageObserverPhase = phase;
        for (const [target, payload] of payloads) {
          target.dispatchEvent(new CustomEvent(`${PAGE_PHASE_EVENT}:${phase}`, { bubbles: true, composed: true, detail: payload }));
        }
        document.dispatchEvent(new CustomEvent(`${PAGE_PHASE_END_EVENT}:${phase}`, {
          detail: JSON.stringify({
            protocol: 'exp-page-observer-v1',
            owner: marker.dataset.expPageObserver,
            epoch,
            phase,
            rootCount: entries.length,
            href: location.href,
            at: Date.now(),
          }),
        }));
        delete marker.dataset.expPageObserverPhase;
      }
    };
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const target = record.target?.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target;
        queue(target, record);
      }
      if (!timer && pending.size) timer = setTimeout(flush, delay);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    return Object.freeze({ leader: true, owner: marker.dataset.expPageObserver });
  }

  function observePage(callback, options = {}) {
    if (typeof callback !== 'function') throw new TypeError('Page observer callback must be a function');
    ensureSharedPageObserver(options.productId || options.owner || 'core', options);
    const listener = event => {
      let payload;
      try { payload = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail; } catch { return; }
      if (!payload || payload.protocol !== 'exp-page-observer-v1') return;
      callback(payload, event.target instanceof Element ? event.target : document.documentElement);
    };
    document.addEventListener(PAGE_BATCH_EVENT, listener);
    return () => document.removeEventListener(PAGE_BATCH_EVENT, listener);
  }

  function observePageBatch(callback, options = {}) {
    if (typeof callback !== 'function') throw new TypeError('Page batch callback must be a function');
    const productId = String(options.productId || options.owner || 'core').toLowerCase();
    const contract = suiteContract(productId);
    const requested = options.phase || contract?.presentationPhases?.[0] || 'observe';
    const phase = normalizePresentationPhases([requested])[0] || 'observe';
    ensureSharedPageObserver(productId, options);
    const roots = new Map();
    const rootEvent = `${PAGE_PHASE_EVENT}:${phase}`;
    const endEvent = `${PAGE_PHASE_END_EVENT}:${phase}`;
    const onRoot = event => {
      let payload;
      try { payload = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail; } catch { return; }
      if (!payload || payload.protocol !== 'exp-page-observer-v1') return;
      const root = event.target instanceof Element ? event.target : null;
      if (root) roots.set(root, payload);
    };
    const onEnd = event => {
      let payload;
      try { payload = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail; } catch { return; }
      if (!payload || payload.protocol !== 'exp-page-observer-v1' || payload.phase !== phase) return;
      const entries = [...roots.entries()];
      roots.clear();
      callback(
        Object.freeze({ ...payload }),
        Object.freeze(entries.map(([root]) => root)),
        Object.freeze(entries.map(([, detail]) => Object.freeze({ ...detail }))),
      );
    };
    document.addEventListener(rootEvent, onRoot);
    document.addEventListener(endEvent, onEnd);
    return () => {
      document.removeEventListener(rootEvent, onRoot);
      document.removeEventListener(endEvent, onEnd);
      roots.clear();
    };
  }

  function observePresentationState(callback, options = {}) {
    if (typeof callback !== 'function') throw new TypeError('Presentation state callback must be a function');
    const source = options.source ? String(options.source).toLowerCase() : '';
    const channel = options.channel ? String(options.channel).toLowerCase() : '';
    const listener = event => {
      let payload;
      try { payload = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail; } catch { return; }
      if (!payload || payload.protocol !== 'exp-presentation-state-v1') return;
      if (source && payload.source !== source) return;
      if (channel && !payload.channels?.includes(channel)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target) callback(Object.freeze({ ...payload }), target);
    };
    document.addEventListener(PRESENTATION_STATE_EVENT, listener);
    return () => document.removeEventListener(PRESENTATION_STATE_EVENT, listener);
  }

  function pageObserverState() {
    const marker = pageObserverMarker();
    return Object.freeze({
      active: Boolean(marker),
      owner: marker?.dataset.expPageObserver || null,
      protocol: marker?.dataset.expPageObserverProtocol || null,
      epoch: Number(marker?.dataset.expPageObserverEpoch || 0),
      phase: marker?.dataset.expPageObserverPhase || null,
    });
  }