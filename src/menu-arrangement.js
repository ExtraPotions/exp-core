// Shared ExtraPotions menu categories, submenu behavior, reordering, and visibility.
const ExpMenuArrangement = (() => {
  const CATEGORY_ORDER = Object.freeze(['main', 'appearance', 'advanced', 'system']);
  const CATEGORY_META = Object.freeze({
    main: Object.freeze({ id: 'main', label: 'Main', order: 0 }),
    appearance: Object.freeze({ id: 'appearance', label: 'Appearance', order: 1 }),
    advanced: Object.freeze({ id: 'advanced', label: 'Advanced', order: 2 }),
    system: Object.freeze({ id: 'system', label: 'System', order: 3 }),
  });
  const PRODUCT_SECTIONS = Object.freeze({
    shift: Object.freeze({
      appearance: Object.freeze(['appearance', 'readability']),
      advanced: Object.freeze(['effects', 'effects-integrations', 'profiles', 'profiles-sites']),
      system: Object.freeze(['system']),
    }),
    prisma: Object.freeze({
      main: Object.freeze(['page', 'highlights']),
      appearance: Object.freeze(['style', 'highlight-style', 'look', 'appearance']),
      advanced: Object.freeze(['tools', 'language', 'sites']),
      system: Object.freeze(['system']),
    }),
    ward: Object.freeze({
      main: Object.freeze(['protection', 'amazon', 'tools']),
      appearance: Object.freeze(['appearance']),
      advanced: Object.freeze(['advanced', 'patterns', 'advanced-amazon']),
      system: Object.freeze(['system']),
    }),
    dropper: Object.freeze({
      main: Object.freeze(['drops', 'streams']),
      appearance: Object.freeze(['appearance']),
      advanced: Object.freeze(['advanced']),
      system: Object.freeze(['system']),
    }),
  });
  const GENERIC_SECTIONS = Object.freeze({
    appearance: Object.freeze(['appearance', 'readability', 'style', 'highlight-style', 'look', 'theme', 'themes']),
    advanced: Object.freeze(['advanced', 'effects', 'integrations', 'profiles', 'sites', 'language', 'patterns', 'routing', 'playback']),
    system: Object.freeze(['system', 'settings', 'diagnostics', 'maintenance', 'recovery']),
  });
  const slug = value => String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const categoryList = Object.freeze(CATEGORY_ORDER.map(id => CATEGORY_META[id]));

  function categoryFor(productId, section = {}, index = 0) {
    const product = slug(productId);
    const key = slug(section.key || section.id || section.route);
    const label = slug(section.label || section.name || section.title);
    const tokens = new Set([key, label].filter(Boolean));
    const profile = PRODUCT_SECTIONS[product] || {};
    for (const category of CATEGORY_ORDER) {
      const aliases = profile[category] || [];
      if (aliases.some(alias => tokens.has(slug(alias)))) return category;
    }
    for (const category of ['system', 'appearance', 'advanced']) {
      if (GENERIC_SECTIONS[category].some(alias => tokens.has(slug(alias)))) return category;
    }
    if (index === 0) return 'main';
    return 'main';
  }

  function describe(productId, sections = []) {
    const groups = new Map(CATEGORY_ORDER.map(id => [id, {
      ...CATEGORY_META[id],
      sections: [],
    }]));
    sections.forEach((section, index) => {
      const category = categoryFor(productId, section, index);
      groups.get(category).sections.push(section);
    });
    return CATEGORY_ORDER.map(id => groups.get(id)).filter(group => group.sections.length);
  }

  function createDisclosure({ document, label, category = 'advanced', key = '', contents = [], className = 'exp-system-card' } = {}) {
    if (!document?.createElement) throw new Error('Menu disclosure requires a document');
    const details = document.createElement('details');
    details.className = className;
    details.dataset.expMenuSubmenu = '1';
    details.dataset.expMenuCategory = CATEGORY_META[category] ? category : 'advanced';
    if (key) details.dataset.expMenuKey = slug(key);
    details.open = false;
    const summary = document.createElement('summary');
    summary.textContent = String(label || CATEGORY_META[category]?.label || 'Advanced');
    details.append(summary, ...contents);
    return details;
  }

  function collapseSubmenus(root) {
    if (!root?.querySelectorAll) return;
    for (const details of root.querySelectorAll('details[data-exp-menu-submenu]')) {
      if (details.dataset.expMenuInitialized === '1') continue;
      details.open = false;
      details.dataset.expMenuInitialized = '1';
    }
  }

  const css = `
    [data-exp-arrange-section]{position:relative}
    [data-exp-arrange-section]>.fl-tool-header{padding-left:38px!important}
    .exp-section-grip{position:absolute!important;left:4px!important;right:auto!important;top:4px!important;width:28px!important;height:26px!important;min-width:0!important;min-height:0!important;padding:0!important;border:1px solid var(--theme-line);border-radius:6px!important;background:var(--theme-bg);color:var(--theme-muted);touch-action:none;cursor:grab;z-index:1}
    .exp-section-grip[data-dragging=true]{cursor:grabbing}
    .exp-menu-editor{grid-column:1/-1;box-sizing:border-box;width:100%;min-width:0;padding:7px;border:1px solid var(--theme-line);border-radius:7px;background:var(--theme-bg);overflow:hidden}
    .exp-menu-editor>summary{cursor:pointer;font-weight:700}
    .exp-menu-category-list{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;min-width:0;margin-top:7px}
    .exp-menu-category-group{min-width:0;padding:6px;border:1px solid var(--theme-line);border-radius:6px;background:var(--theme-panel)}
    .exp-menu-category-title{margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--theme-muted);text-transform:uppercase}
    .exp-menu-editor .exp-menu-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;margin-top:5px}
    .exp-menu-editor .exp-menu-row>span{min-width:0;overflow-wrap:anywhere}
    .exp-menu-editor button[role=switch]{flex:0 0 32px;width:32px;height:20px;padding:2px;border-radius:5px;border:1px solid var(--theme-line);background:var(--theme-panel)}
    .exp-menu-editor button[role=switch]::before{content:'';display:block;width:12px;height:12px;border-radius:3px;background:var(--theme-muted)}
    .exp-menu-editor button[aria-checked=true]{background:var(--theme-accent)}
    .exp-menu-editor button[aria-checked=true]::before{margin-left:auto;background:var(--theme-text)}
    .exp-menu-editor .exp-reset{width:100%;margin-top:7px;border-radius:6px}
    [data-exp-arrange-section][hidden]{display:none!important}
    [data-exp-menu-submenu]{box-sizing:border-box;min-width:0;max-width:100%;overflow-wrap:anywhere}
    [data-exp-menu-submenu]>summary{cursor:pointer}
    [data-exp-menu-width="narrow"] .exp-menu-editor{padding:6px}
    [data-exp-menu-width="narrow"] .exp-menu-category-group{padding:5px}
    [data-exp-menu-width="narrow"] .exp-menu-editor .exp-menu-row{gap:5px}
    [data-exp-menu-width="compact"] .exp-menu-category-list,
    [data-exp-menu-width="full"] .exp-menu-category-list{grid-template-columns:minmax(0,1fr)}
  `;

  function mount({ panel, id, onChange = () => {}, resetLaunchers = () => {} }) {
    const document = panel.ownerDocument, view = document.defaultView;
    collapseSubmenus(panel);
    const entries = [...panel.querySelectorAll(':scope .fl-tool-panel')].filter(section => section.parentElement === panel || section.parentElement?.closest('.fl-tool-panel') === null).map(section => {
      const header = section.querySelector(':scope>.fl-tool-header');
      const body = section.querySelector(':scope>.fl-tool-body');
      if (!header || !body) return null;
      const label = (header.querySelector('.fl-tool-title') || header).textContent.replace(/[▸▾›]/g, '').trim();
      const key = header.dataset.route || header.dataset.section || header.dataset.panel || body.id;
      return { section, header, body, label, key };
    }).filter(entry => entry?.key);
    if (entries.length < 2) return { update() { collapseSubmenus(panel); }, destroy() {} };
    const parent = entries[0].section.parentElement;
    if (entries.some(entry => entry.section.parentElement !== parent)) return { update() { collapseSubmenus(panel); }, destroy() {} };
    entries.forEach((entry, index) => {
      entry.category = categoryFor(id, entry, index);
      entry.section.dataset.expMenuCategory = entry.category;
    });
    const defaults = entries.map(entry => entry.key);
    const orderKey = `exp:v3:menu-order:${id}`, hiddenKey = `exp:v3:menu-hidden:${id}`;
    const read = key => { try { const value = JSON.parse(view.localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter(x => typeof x === 'string'))] : []; } catch { return []; } };
    const save = (key, value) => { try { view.localStorage.setItem(key, JSON.stringify(value)); } catch {} };
    let order = [...new Set([...read(orderKey), ...defaults])], hidden = read(hiddenKey), drag = null;
    const recovery = entries.find(entry => entry.category === 'system') || entries.find(entry => entry.label.toLowerCase() === 'system') || entries[0];
    const style = document.createElement('style'); style.textContent = css;
    const styleRoot = panel.getRootNode();
    (styleRoot instanceof view.ShadowRoot ? styleRoot : (document.head || document.documentElement)).append(style);
    const abort = new view.AbortController();
    const on = (node, type, handler, options = {}) => node.addEventListener(type, handler, { ...options, signal: abort.signal });
    const editor = document.createElement('details'); editor.className = 'exp-menu-editor'; editor.dataset.expMenuSubmenu = '1';
    const summary = document.createElement('summary'); summary.textContent = 'Edit menu'; editor.append(summary);
    const categoryList = document.createElement('div'); categoryList.className = 'exp-menu-category-list'; editor.append(categoryList);
    const categoryGroups = new Map();
    const switches = new Map();
    const ordered = () => [...parent.children].filter(node => node.hasAttribute('data-exp-arrange-section'));
    function groupFor(category) {
      if (categoryGroups.has(category)) return categoryGroups.get(category);
      const group = document.createElement('div'); group.className = 'exp-menu-category-group'; group.dataset.expMenuCategoryGroup = category;
      const title = document.createElement('div'); title.className = 'exp-menu-category-title'; title.textContent = CATEGORY_META[category]?.label || 'Main';
      group.append(title); categoryList.append(group); categoryGroups.set(category, group); return group;
    }
    function apply() {
      const desired = [...entries].sort((a,b) => order.indexOf(a.key)-order.indexOf(b.key));
      desired.forEach((entry,index) => { const current = ordered()[index]; if (current !== entry.section) parent.insertBefore(entry.section,current || null); });
      entries.forEach(entry => {
        const isHidden = entry !== recovery && hidden.includes(entry.key);
        if (entry.section.hidden !== isHidden) entry.section.hidden = isHidden;
        switches.get(entry.key)?.setAttribute('aria-checked', String(!isHidden));
      });
      onChange();
    }
    function update() {
      collapseSubmenus(panel);
      const target = recovery.body.querySelector('[data-exp-system-tools]') || recovery.body;
      if (editor.parentElement !== target) target.append(editor);
    }
    for (const entry of entries) {
      entry.section.dataset.expArrangeSection = entry.key;
      const grip = document.createElement('button'); grip.type = 'button'; grip.className = 'exp-section-grip'; grip.textContent = '⠿';
      grip.setAttribute('aria-label', `Rearrange ${entry.label}`); grip.title = 'Drag to reorder, or use Alt + Up/Down'; entry.section.append(grip); entry.grip = grip;
      on(grip, 'click', event => { event.preventDefault(); event.stopPropagation(); });
      on(grip, 'pointerdown', event => {
        if (event.button !== 0 || drag) return;
        event.preventDefault(); event.stopPropagation();
        drag = { entry, pointer: event.pointerId, y: event.clientY, snapshot: [...order], moved: false };
        parent.setPointerCapture?.(event.pointerId); grip.dataset.dragging = 'true';
      });
      on(grip, 'keydown', event => {
        if (!event.altKey || !['ArrowUp','ArrowDown'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const visible = ordered().filter(node => !node.hidden).map(node => node.dataset.expArrangeSection);
        const from = visible.indexOf(entry.key), to = from + (event.key === 'ArrowUp' ? -1 : 1);
        if (to < 0 || to >= visible.length) return;
        const target = order.indexOf(visible[to]), source = order.indexOf(entry.key);
        [order[source], order[target]] = [order[target], order[source]];
        save(orderKey,order); apply(); grip.focus();
      });
      if (entry === recovery) continue;
      const row = document.createElement('div'); row.className = 'exp-menu-row';
      const label = document.createElement('span'); label.textContent = entry.label;
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.setAttribute('role','switch'); toggle.setAttribute('aria-label',`Show ${entry.label}`);
      switches.set(entry.key,toggle);
      on(toggle,'click',() => { hidden = hidden.includes(entry.key) ? hidden.filter(key => key !== entry.key) : [...hidden,entry.key]; save(hiddenKey,hidden); apply(); });
      row.append(label,toggle); groupFor(entry.category).append(row);
    }
    for (const category of CATEGORY_ORDER) {
      const group = categoryGroups.get(category);
      if (group) categoryList.append(group);
    }
    on(view,'pointermove',event => {
      if (!drag || event.pointerId !== drag.pointer || Math.abs(event.clientY-drag.y) < 5 && !drag.moved) return;
      event.preventDefault(); drag.moved = true;
      const others = ordered().filter(node => node !== drag.entry.section && !node.hidden);
      const next = others.find(node => { const rect=node.getBoundingClientRect(); return event.clientY < rect.top+rect.height/2; });
      order = order.filter(key => key !== drag.entry.key);
      const index = next ? order.indexOf(next.dataset.expArrangeSection) : others.length ? order.indexOf(others.at(-1).dataset.expArrangeSection)+1 : order.length;
      order.splice(index,0,drag.entry.key); apply();
    }, { passive:false });
    function end(event) {
      if (!drag || event.pointerId !== drag.pointer) return;
      const previous = drag; drag = null; delete previous.entry.grip.dataset.dragging;
      if (event.type !== 'pointerup') { order = previous.snapshot; apply(); } else save(orderKey,order);
      if (parent.hasPointerCapture?.(previous.pointer)) parent.releasePointerCapture(previous.pointer);
      previous.entry.grip.focus();
    }
    on(view,'pointerup',end); on(view,'pointercancel',end); on(parent,'lostpointercapture',end);
    on(view,'storage',event => { if ([orderKey,hiddenKey,null].includes(event.key) && !drag) { order=[...new Set([...read(orderKey),...defaults])]; hidden=read(hiddenKey); apply(); } });
    function resetButton(label, action) { const button=document.createElement('button');button.type='button';button.className='life-btn exp-reset';button.textContent=label;on(button,'click',action);editor.append(button); }
    resetButton('Reset menu arrangement',() => { order=[...defaults];hidden=[];save(orderKey,order);save(hiddenKey,hidden);apply(); });
    resetButton('Reset launcher arrangement',resetLaunchers);
    editor.open = false;
    apply(); update();
    return {
      update,
      describe: () => describe(id, entries.map(({key,label,category}) => ({ key, label, category }))),
      destroy() {
        abort.abort();style.remove();editor.remove();
        entries.forEach(entry => {
          entry.grip.remove();
          delete entry.section.dataset.expArrangeSection;
          delete entry.section.dataset.expMenuCategory;
          entry.section.hidden=false;
        });
      }
    };
  }

  return Object.freeze({
    categories: categoryList,
    categoryFor,
    describe,
    createDisclosure,
    collapseSubmenus,
    mount,
  });
})();
