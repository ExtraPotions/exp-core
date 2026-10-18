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
    .exp-submenu-home,.exp-submenu-detail{min-width:0;max-width:100%}
    .exp-submenu-home[hidden],.exp-submenu-detail[hidden]{display:none!important}
    .exp-submenu-nav{display:grid;min-width:0}
    .exp-submenu-home>.exp-submenu-tabpanel+.exp-submenu-nav{margin-top:8px;border-top:1px solid var(--theme-line)}
    .exp-submenu-row{display:grid;grid-template-columns:minmax(0,1fr) 14px;align-items:center;gap:10px;width:100%;min-width:0;min-height:40px;margin:0!important;padding:8px 2px!important;text-align:left;font:600 var(--exp-font-size-body,13px)/1.4 "Segoe UI",system-ui,sans-serif!important;color:var(--theme-text);background:transparent!important;border:0!important;border-top:1px solid var(--theme-line)!important;border-radius:0!important;box-shadow:none!important;cursor:pointer;overflow-wrap:anywhere}
    .exp-submenu-nav>.exp-submenu-row:first-child{border-top:0!important}
    .exp-submenu-row:hover>span{color:var(--theme-accent)}
    .exp-submenu-row>svg,.exp-submenu-back>svg{width:14px;height:14px;color:var(--theme-muted);flex:none}
    .exp-submenu-back{display:flex;align-items:center;gap:6px;min-height:36px;margin:0!important;padding:4px 4px 4px 0!important;font:600 var(--exp-font-size-body,13px)/1.4 "Segoe UI",system-ui,sans-serif!important;color:var(--theme-muted);background:transparent!important;border:0!important;box-shadow:none!important;cursor:pointer}
    .exp-submenu-back:hover{color:var(--theme-text)}
    .exp-submenu-title{margin:2px 0 8px;font:700 14px/1.35 "Segoe UI",system-ui,sans-serif;color:var(--theme-text);overflow-wrap:anywhere}
    .exp-submenu-row:focus-visible,.exp-submenu-back:focus-visible{outline:2px solid var(--theme-accent2,var(--theme-accent));outline-offset:2px}
    .exp-submenu-tabpanel{min-width:0;max-width:100%}
    .exp-submenu-tabpanel[hidden]{display:none!important}
    .exp-submenu-tabpanel>[data-exp-tab-item]{margin-top:0!important}
    .exp-submenu-tabpanel>details[data-exp-tab-item]{border:0!important;padding:0!important;background:transparent!important}
    .exp-submenu-tabpanel>details[data-exp-tab-item]>summary{display:none!important}
    @media(pointer:coarse){.exp-submenu-row,.exp-submenu-back{min-height:44px}}
  `;
  const chevron = (document, back) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');svg.setAttribute('aria-hidden', 'true');svg.setAttribute('focusable', 'false');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', back ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5');line.setAttribute('fill', 'none');line.setAttribute('stroke', 'currentColor');line.setAttribute('stroke-width', '1.8');line.setAttribute('stroke-linecap', 'round');line.setAttribute('stroke-linejoin', 'round');
    svg.append(line);return svg;
  };
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
      const groups=new Map(),home=[];
      const add=(label,node)=>{if(!groups.has(label))groups.set(label,[]);groups.get(label).push(node);};
      const stream=id==='dropper'&&container.id==='tdh-streams-body';
      const drops=id==='dropper'&&container.id==='tdh-drops-body';
      const retailer=id==='ward'&&container.id==='exp-ward-view-tools';
      for(const node of [...container.children]) {
        if(node.matches('style,script,[data-exp-submenu-tabs],.badge-only-progress-slot'))continue;
        // Everyday controls stay on the home view; each submenu disclosure becomes
        // a row that opens its own detail view.
        if(drops&&node.id==='tdh-open-campaigns'){home.push(node);continue;}
        let label=tabLabel(node);
        // System status stays open on the home view so recovery actions remain in sight.
        if(!label||(id!=='dropper'&&node.matches('[data-exp-system-item="status"]'))){home.push(node);continue;}
        if(stream){
          const key=slug(node.querySelector(':scope>summary')?.textContent);
          label=key==='playback-options'?'Playback':key==='notifications'?'Alerts':node.id==='tdh-routing-history-panel'||['routing-and-backup','interruption-rules','why-did-it-switch'].includes(key)?'Routing':label;
        } else if(drops){
          label=node.id==='tdh-open-campaigns'?'Campaigns':node.id==='tdh-claim-history-panel'?'History':label;
        } else if(retailer){
          label=label.startsWith('Advanced ')?'Patterns':['Page','Transfer'].includes(label)?'Tools':label;
        }
        add(label,node);
      }
      const order=stream?['Stream Health','Playback','Routing','Alerts']:drops?['Campaigns','History']:retailer?['Seller clarity','Coverage','Retailers','Patterns','Tools']:['Page'];
      const rows=[...new Set([...order,...groups.keys()])].filter(label=>groups.has(label)).map(label=>({label,nodes:groups.get(label)}));
      return {home,rows};
    }
    function mountContainer(container,key) {
      const {home,rows}=groupsFor(container);if(!rows.length||rows.length+(home.length?1:0)<2)return false;
      const original=[...container.childNodes];
      const root=document.createElement('div');root.dataset.expSubmenuTabs='1';
      const homeView=document.createElement('div');homeView.className='exp-submenu-home';
      const nav=document.createElement('div');nav.className='exp-submenu-nav';
      const detail=document.createElement('div');detail.className='exp-submenu-detail';
      const backButton=document.createElement('button');backButton.type='button';backButton.className='exp-submenu-back';backButton.append(chevron(document,true),'Back');
      const title=document.createElement('div');title.className='exp-submenu-title';title.setAttribute('role','heading');title.setAttribute('aria-level','3');
      detail.append(backButton,title);
      const panel=label=>{const body=document.createElement('div');body.id='exp-submenu-panel-'+(++tabSerial);body.className='exp-submenu-tabpanel';body.setAttribute('role','region');body.setAttribute('aria-label',label+' settings');return body;};
      const homePanel=panel('Overview'),navRows=[],panels=[],detailsState=new Map();
      for(const node of home){if(tabLabel(node)){node.dataset.expTabItem='1';detailsState.set(node,node.open);}homePanel.append(node);}
      // Back owns the home panel so a product can reveal any control by clicking
      // the element whose aria-controls names the panel that holds it.
      backButton.setAttribute('aria-controls',homePanel.id);
      homeView.append(...(home.length?[homePanel,nav]:[nav]));
      for(const {label,nodes} of rows){
        const body=panel(label),button=document.createElement('button'),text=document.createElement('span');
        button.type='button';button.className='exp-submenu-row';button.setAttribute('aria-controls',body.id);button.setAttribute('aria-expanded','false');
        text.textContent=label;button.append(text,chevron(document,false));
        for(const node of nodes){node.dataset.expTabItem='1';detailsState.set(node,node.open);body.append(node);}
        body.hidden=true;navRows.push(button);panels.push(body);nav.append(button);detail.append(body);
      }
      root.append(homeView,detail);
      let active=-1;
      function show(index,focus=null){
        active=index;selection.set(key,index<0?null:rows[index].label);
        homeView.hidden=index>=0;detail.hidden=index<0;
        panels.forEach((body,i)=>{body.hidden=i!==index;navRows[i].setAttribute('aria-expanded',String(i===index));});
        title.textContent=index<0?'':rows[index].label;
        syncOpen();
        focus?.focus();onChange();
      }
      function syncOpen(){const visible=container.getClientRects().length>0&&!container.closest('[hidden],.fl-tool-hidden')&&view.getComputedStyle(container).visibility!=='hidden';[homePanel,...panels].forEach(body=>{const shown=body===homePanel?!homeView.hidden:!body.hidden;for(const node of body.children)if(detailsState.has(node)){const open=visible&&shown;if(node.open!==open)node.open=open;}});}
      function goBack(){const from=navRows[active];show(-1,from);}
      function click(event){
        const button=event.target.closest('button');
        if(button===backButton){if(active>=0)goBack();return;}
        const index=navRows.indexOf(button);if(index>=0)show(index,backButton);
      }
      function keydown(event){
        if(event.key!=='Escape'||active<0||event.defaultPrevented||event.target.closest?.('select'))return;
        // Leave the detail view instead of letting the menu's own Escape close it.
        event.preventDefault();event.stopPropagation();goBack();
      }
      root.addEventListener('click',click);root.addEventListener('keydown',keydown);
      const progressSlot=container.querySelector(':scope>.badge-only-progress-slot');
      container.replaceChildren(...(progressSlot?[progressSlot,root]:[root]));
      show(rows.findIndex(row=>row.label===selection.get(key)));
      mounted.set(container,{root,syncOpen,destroy(restore){root.removeEventListener('click',click);root.removeEventListener('keydown',keydown);for(const node of detailsState.keys())delete node.dataset.expTabItem;if(restore){for(const [node,open]of detailsState)node.open=open;container.replaceChildren(...original);}}});
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
    // Compact menus retain the product's native inline disclosures and lazy toggle handlers.
    const tabs={update(){},destroy(){}};
    const none = { update() { collapseSubmenus(panel);tabs.update(); }, select() {}, describe: () => [], destroy() {tabs.destroy();} };
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
    const sectionTabs = ExpMenuTabs.mount({ panel, id, entries: desired });
    return {
      update() { collapseSubmenus(panel); tabs.update(); sectionTabs.update(); },
      select: key => sectionTabs.select(key),
      describe: () => describe(id, entries.map(({ key, label, category }) => ({ key, label, category }))),
      destroy() {
        sectionTabs.destroy();
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
