// Shared ExtraPotions menu categories, submenu behavior, reordering, and visibility.
const ExpMenuArrangement = (() => {
  const CATEGORY_ORDER = Object.freeze(['main', 'appearance', 'advanced', 'system']);
  const CATEGORY_META = Object.freeze({
    main: Object.freeze({ id: 'main', label: 'Main', order: 0 }),
    appearance: Object.freeze({ id: 'appearance', label: 'Appearance', order: 1 }),
    advanced: Object.freeze({ id: 'advanced', label: 'Advanced', order: 2 }),
    system: Object.freeze({ id: 'system', label: 'System', order: 3 }),
  });
  const PRODUCT_SECTIONS = __EXP_SUITE_MENU_SECTIONS__;
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
    // Core created this submenu in its canonical collapsed state. Mark it initialized
    // immediately so a later arrangement refresh cannot re-collapse a user-opened
    // disclosure during the same interaction.
    details.dataset.expMenuInitialized = '1';
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
    [data-exp-menu-submenu]{box-sizing:border-box;min-width:0;max-width:100%;overflow-wrap:anywhere}
    [data-exp-menu-submenu]>summary{cursor:pointer}
  `;

  let tabSerial = 0;
  const tabCss = `
    [data-exp-submenu-tabs]{min-width:0;grid-column:1/-1}
    .exp-submenu-tablist{display:flex;flex-wrap:wrap;gap:4px;padding:4px 0 8px;margin:0 0 10px;border-bottom:1px solid var(--theme-line);min-width:0}
    .exp-submenu-tablist>button{flex:1 1 auto;min-width:0;max-width:100%;min-height:32px;padding:5px 7px!important;font:600 var(--exp-font-size-small,12px)/1.4 "Segoe UI",system-ui,sans-serif!important;color:var(--theme-muted);background:transparent;border:1px solid transparent;border-radius:6px;overflow-wrap:anywhere}
    .exp-submenu-tablist>button[aria-selected=true]{color:var(--theme-text);background:color-mix(in srgb,var(--theme-accent) 20%,var(--theme-inset));border-color:var(--theme-accent)}
    .exp-submenu-tablist>button:focus-visible{outline:2px solid var(--theme-accent2,var(--theme-accent));outline-offset:2px}
    .exp-submenu-tabpanel{min-width:0;max-width:100%}
    .exp-submenu-tabpanel[hidden]{display:none!important}
    .exp-submenu-tabpanel>[data-exp-tab-item]{margin-top:0!important}
    .exp-submenu-tabpanel>details[data-exp-tab-item]{border:0!important;padding:0!important;background:transparent!important}
    .exp-submenu-tabpanel>details[data-exp-tab-item]>summary{display:none!important}
    @media(pointer:coarse){.exp-submenu-tablist>button{min-height:44px}}
  `;
  const shortLabels = Object.freeze({
    'highlight-style':'Style', 'menu-preferences':'Menu', 'settings-transfer':'Transfer',
    'effects-and-integrations':'Effects', 'profiles-and-sites':'Profiles', 'page-tools':'Page',
    'retailer-modules':'Retailers', 'protection-review':'Review', 'page-activity':'Activity',
  });
  function tabLabel(node) {
    // Existing primary sections stay together in Overview. Only submenu
    // disclosures become tabs; status chips and inline explanations stay local.
    if(node.tagName!=='DETAILS'||node.matches('.eligibility-chip,[data-shift-appearance-explanation]'))return null;
    const title = node.querySelector(':scope>summary,:scope>h3,:scope>h2');
    const label = (title?.querySelector('.campaign-manager-title')||title)?.textContent.trim();
    if (!label) return null;
    return shortLabels[slug(label)] || label;
  }
  function mountTabs({panel,id,onChange=()=>{}}) {
    const document=panel.ownerDocument,view=document.defaultView;
    const style=document.createElement('style');style.textContent=tabCss;
    const styleRoot=panel.getRootNode();
    (styleRoot instanceof view.ShadowRoot?styleRoot:(document.head||document.documentElement)).append(style);
    const mounted=new Map(),selection=new Map();let disposed=false,queued=false;
    function groupsFor(container) {
      const groups=new Map(),loose=[];
      const add=(label,node)=>{if(!groups.has(label))groups.set(label,[]);groups.get(label).push(node);};
      const stream=id==='dropper'&&container.id==='tdh-streams-body';
      const drops=id==='dropper'&&container.id==='tdh-drops-body';
      const retailer=id==='ward'&&container.id==='exp-ward-view-tools';
      for(const node of [...container.children]) {
        if(node.matches('style,script,[data-exp-submenu-tabs],.badge-only-progress-slot'))continue;
        let label=tabLabel(node);
        if(stream){
          const key=slug(node.querySelector(':scope>summary')?.textContent);
          label=key==='playback-options'?'Playback':key==='notifications'?'Alerts':node.id==='tdh-routing-history-panel'||['routing-and-backup','interruption-rules','why-did-it-switch'].includes(key)?'Routing':'Stream';
        } else if(drops){
          label=node.id==='tdh-open-campaigns'?'Campaigns':node.id==='tdh-claim-history-panel'?'History':'Progress';
        } else if(retailer){
          label=label==='Retailers'?'Retailers':label?.startsWith('Advanced ')?'Patterns':['Page','Transfer'].includes(label)?'Tools':'Store';
        }
        if(label)add(label,node);else loose.push(node);
      }
      if(loose.length){
        const label=groups.size?'Overview':null;
        if(label)groups.set(label,loose);
      }
      const order=stream?['Stream','Playback','Routing','Alerts']:drops?['Progress','Campaigns','History']:retailer?['Store','Retailers','Patterns','Tools']:['Overview','Page',...groups.keys()];
      return [...new Set(order)].filter(label=>groups.has(label)).map(label=>({label,nodes:groups.get(label)}));
    }
    function mountContainer(container,key) {
      const groups=groupsFor(container);if(groups.length<2)return false;
      const original=[...container.childNodes];
      const root=document.createElement('div');root.dataset.expSubmenuTabs='1';
      const list=document.createElement('div');list.className='exp-submenu-tablist';list.setAttribute('role','tablist');list.setAttribute('aria-label','Submenu sections');root.append(list);
      const tabs=[],panels=[],detailsState=new Map();
      groups.forEach(({label,nodes})=>{
        const serial=++tabSerial,tab=document.createElement('button'),body=document.createElement('div');
        tab.type='button';tab.id='exp-submenu-tab-'+serial;tab.textContent=label;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','exp-submenu-panel-'+serial);
        body.id='exp-submenu-panel-'+serial;body.className='exp-submenu-tabpanel';body.setAttribute('role','tabpanel');body.setAttribute('aria-label',label+' settings');
        for(const node of nodes){if(tabLabel(node)){node.dataset.expTabItem='1';detailsState.set(node,node.open);}body.append(node);}
        tabs.push(tab);panels.push(body);list.append(tab);root.append(body);
      });
      function choose(index,focus=false){
        selection.set(key,groups[index].label);
        tabs.forEach((tab,i)=>{const active=i===index;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;panels[i].hidden=!active;});
        syncOpen();
        if(focus)tabs[index].focus();onChange();
      }
      function syncOpen(){const visible=container.getClientRects().length>0&&!container.closest('[hidden],.fl-tool-hidden')&&view.getComputedStyle(container).visibility!=='hidden';panels.forEach(body=>{for(const node of body.children)if(detailsState.has(node)){const open=visible&&!body.hidden;if(node.open!==open)node.open=open;}});}
      function click(event){const index=tabs.indexOf(event.target.closest('button'));if(index>=0)choose(index);}
      function keydown(event){const current=tabs.indexOf(event.target);if(current<0)return;let index;
        if(event.key==='ArrowRight')index=(current+1)%tabs.length;else if(event.key==='ArrowLeft')index=(current+tabs.length-1)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;
        event.preventDefault();choose(index,true);
      }
      list.addEventListener('click',click);list.addEventListener('keydown',keydown);
      const progressSlot=container.querySelector(':scope>.badge-only-progress-slot');
      container.replaceChildren(...(progressSlot?[progressSlot,root]:[root]));
      const saved=groups.findIndex(group=>group.label===selection.get(key));
      choose(saved<0?0:saved);
      mounted.set(container,{root,syncOpen,destroy(restore){list.removeEventListener('click',click);list.removeEventListener('keydown',keydown);for(const group of groups)for(const node of group.nodes)delete node.dataset.expTabItem;if(restore){for(const [node,open]of detailsState)node.open=open;container.replaceChildren(...original);}}});
      return true;
    }
    function update(){
      if(disposed)return;
      for(const [container,controller]of mounted)if(!panel.contains(container)||controller.root.parentElement!==container){controller.destroy(false);mounted.delete(container);}
      for(const container of panel.querySelectorAll('.fl-tool-body,.route-body,[data-exp-product-system]')){
        // System's grouped contents own their tabs rather than its outer wrapper.
        if(container.querySelector(':scope>[data-exp-product-system]')||mounted.has(container))continue;
        const key=container.id||container.dataset.expProductSystem||container.closest('section')?.querySelector('.fl-tool-title')?.textContent||'submenu';
        mountContainer(container,key);
      }
      for(const controller of mounted.values())controller.syncOpen();
    }
    const observer=new view.MutationObserver(()=>{if(!queued&&!disposed){queued=true;queueMicrotask(()=>{queued=false;update();});}});
    update();observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','aria-expanded']});
    return {update,destroy(){disposed=true;observer.disconnect();for(const [container,controller]of mounted)controller.destroy(controller.root.parentElement===container);mounted.clear();selection.clear();style.remove();}};
  }

  // Tags each menu section with its category and keeps sections in category
  // order (Main, Appearance, Advanced, System). Sections keep their own order
  // inside a category; there is nothing for the user to arrange or hide.
  function mount({ panel, id, onChange = () => {} }) {
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
    const tabs=mountTabs({panel,id,onChange});
    const none = { update() { collapseSubmenus(panel);tabs.update(); }, describe: () => [], destroy() {tabs.destroy();} };
    if (entries.length < 2) return none;
    const parent = entries[0].section.parentElement;
    if (entries.some(entry => entry.section.parentElement !== parent)) return none;
    entries.forEach((entry, index) => {
      entry.category = categoryFor(id, entry, index);
      entry.section.dataset.expMenuCategory = entry.category;
    });
    const style = document.createElement('style'); style.textContent = css;
    const styleRoot = panel.getRootNode();
    (styleRoot instanceof view.ShadowRoot ? styleRoot : (document.head || document.documentElement)).append(style);
    const rank = entry => CATEGORY_ORDER.indexOf(entry.category);
    const desired = [...entries].sort((a, b) => rank(a) - rank(b));
    function apply() {
      const present = entries.filter(entry => entry.section.parentElement === parent);
      const wanted = desired.filter(entry => present.includes(entry));
      const current = [...parent.children].filter(node => wanted.some(entry => entry.section === node));
      const after = current.length ? current.at(-1).nextSibling : null;
      for (const entry of wanted) parent.insertBefore(entry.section, after);
      onChange();
    }
    apply();
    return {
      update() { collapseSubmenus(panel);tabs.update(); },
      describe: () => describe(id, entries.map(({ key, label, category }) => ({ key, label, category }))),
      destroy() {
        tabs.destroy();
        style.remove();
        entries.forEach(entry => { delete entry.section.dataset.expMenuCategory; });
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
    mountTabs,
  });
})();
