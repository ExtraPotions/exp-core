/* Product sections as one row of tabs. Core opens a section by clicking the product's own
   (hidden) section header, so each product keeps its section code and lazy rendering. */
const ExpMenuTabs = (() => {
  const shortLabels = Object.freeze({ appearance: 'Look', protection: 'Protect' });
  const icons = Object.freeze({ drops: 'gift', streams: 'screen', appearance: 'brush', advanced: 'sliders', system: 'system', highlights: 'sparkle', protection: 'shield', amazon: 'bag' });
  // Disclosures that are inline controls, not groups, stay collapsible.
  // Products use data-exp-collapsible for groups that build expensive content when opened.
  const KEEP_COLLAPSIBLE = '.eligibility-chip,[data-shift-appearance-explanation],[data-exp-tab-item],[data-exp-collapsible]';
  // The doubled attribute outranks Core's content-driven `:host(...) :is(.fl-tool-header,...)` rule,
  // which would otherwise give the hidden headers their full height back.
  const css = `
    [data-exp-section-tabs][data-exp-section-tabs]>.fl-tool-panel>.fl-tool-header,[data-exp-section-tabs][data-exp-section-tabs] nav>.fl-tool-panel>.fl-tool-header{position:absolute!important;width:1px!important;height:1px!important;min-height:0!important;margin:-1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important}
    [data-exp-section-tabs] .fl-tool-panel{margin:0!important;border:0!important;background:transparent!important}
    [data-exp-section-tabs] .fl-tool-body{padding:0!important}
    .exp-section-tabs{display:flex;gap:2px;margin:0 0 2px;padding:3px;border-radius:9px;background:var(--exp-menu-track,#18181b);min-width:0}
    .exp-section-tabs>[role=tab]{flex:1 1 auto;display:flex;align-items:center;justify-content:center;gap:4px;min-width:0;min-height:28px;padding:4px 2px;border:0;border-radius:7px;background:transparent;color:var(--theme-muted);font:500 11.5px/1.2 Inter,"Segoe UI",system-ui,sans-serif;white-space:nowrap;cursor:pointer}
    .exp-section-tabs>[role=tab]:hover{color:var(--theme-text)}
    .exp-section-tabs>[role=tab][aria-selected=true]{background:var(--theme-line);color:var(--theme-text);box-shadow:inset 0 -2px 0 var(--theme-accent)}
    .exp-section-tabs>[role=tab]:focus-visible{outline:2px solid var(--theme-accent);outline-offset:1px}
    .exp-section-tabs .exp-section-icon{flex:0 0 12px;transform:scale(.8)}
    .exp-section-tabs .exp-section-tab-label{overflow:hidden;text-overflow:ellipsis}
    .exp-section-tabs[data-compact="1"] .exp-section-tab-label{display:none}
    [data-exp-section-tabs] details[data-exp-flat]{border:0!important;padding:0!important;margin:0!important;background:transparent!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary{display:block!important;margin:14px 0 6px!important;padding:0!important;list-style:none!important;color:var(--theme-muted)!important;font:500 11px/1.3 Inter,"Segoe UI",system-ui,sans-serif!important;pointer-events:none!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary::before,[data-exp-section-tabs] details[data-exp-flat]>summary::after{display:none!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary::-webkit-details-marker{display:none}
    [data-exp-section-tabs] details[data-exp-flat]>:not(summary){margin:0!important;border:1px solid var(--theme-line)!important;border-top-width:0!important;border-radius:0!important;background:var(--theme-panel)!important}
    [data-exp-section-tabs] details[data-exp-flat]>summary+*{border-top-width:1px!important;border-top-left-radius:10px!important;border-top-right-radius:10px!important}
    [data-exp-section-tabs] details[data-exp-flat]>:not(summary):last-child{border-bottom-left-radius:10px!important;border-bottom-right-radius:10px!important}
    [data-exp-section-tabs] details[data-exp-flat]>:not(summary)+:not(summary){border-top:1px solid var(--exp-menu-soft,#1c1c1f)!important}
    [data-exp-section-tabs] details[data-exp-flat]>:is(.row,.mini-row,.fl-switch,.setting-row){padding:9px 11px!important}
  `;
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const isOpen = entry => !entry.body.hidden && !entry.body.classList.contains('fl-tool-hidden');
  let serial = 0;

  function mount({ panel, id, entries }) {
    const document = panel.ownerDocument, view = document.defaultView;
    const style = document.createElement('style'); style.textContent = css;
    const styleRoot = panel.getRootNode();
    (styleRoot instanceof view.ShadowRoot ? styleRoot : (document.head || document.documentElement)).append(style);
    const storageKey = 'exp:suite:menu-tab:' + id;
    const list = document.createElement('div');
    list.className = 'exp-section-tabs'; list.dataset.expSectionTabs = '1';
    list.setAttribute('role', 'tablist'); list.setAttribute('aria-label', 'Sections');
    const saved = new Map();
    const tabs = entries.map(entry => {
      const index = ++serial, slug = entry.label.toLowerCase();
      const tab = document.createElement('button');
      tab.type = 'button'; tab.id = 'exp-section-tab-' + index; tab.dataset.expSectionTab = entry.key;
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-label', entry.label);
      if (!entry.body.id) entry.body.id = 'exp-section-panel-' + index;
      tab.setAttribute('aria-controls', entry.body.id);
      const icon = document.createElement('span'); icon.className = 'exp-section-icon'; icon.setAttribute('aria-hidden', 'true');
      if (icons[slug]) icon.dataset.icon = icons[slug];
      const text = document.createElement('span'); text.className = 'exp-section-tab-label'; text.textContent = shortLabels[slug] || entry.label;
      tab.append(icon, text); list.append(tab);
      saved.set(entry, { tabindex: entry.header.getAttribute('tabindex'), hidden: entry.header.getAttribute('aria-hidden'), role: entry.body.getAttribute('role'), labelledby: entry.body.getAttribute('aria-labelledby') });
      entry.header.setAttribute('tabindex', '-1'); entry.header.setAttribute('aria-hidden', 'true');
      entry.body.setAttribute('role', 'tabpanel'); entry.body.setAttribute('aria-labelledby', tab.id);
      return tab;
    });
    panel.dataset.expSectionTabs = '1';
    let wasVisible = false, syncing = false, disposed = false, queued = false;
    const visible = () => !panel.hidden && panel.getClientRects().length > 0;

    function place() {
      const parent = entries[0].section.parentElement; if (!parent) return;
      const first = [...parent.children].find(node => entries.some(entry => entry.section === node));
      if (first && list.nextElementSibling !== first) parent.insertBefore(list, first);
    }
    function flatten() {
      for (const entry of entries) for (const details of entry.body.querySelectorAll('details')) {
        // A group can become an inner-tab item after it was flattened; inner tabs own it then.
        if (details.matches(KEEP_COLLAPSIBLE)) { if (details.dataset.expFlat) delete details.dataset.expFlat; continue; }
        details.dataset.expFlat = '1';
        if (!details.open) details.open = true;
      }
    }
    // Tabs shrink with an ellipsis instead of overflowing the row, so a label that no longer
    // fits is the signal to drop to icons.
    function compact() {
      list.dataset.compact = '0';
      const clipped = list.scrollWidth > list.clientWidth + 1 || [...list.querySelectorAll('.exp-section-tab-label')].some(label => label.scrollWidth > label.clientWidth + 1);
      list.dataset.compact = clipped ? '1' : '0';
    }
    function open(index) { if (entries[index] && !isOpen(entries[index])) entries[index].header.click(); }
    function sync() {
      if (syncing || disposed) return;
      syncing = true;
      try {
        place();
        const nowVisible = visible();
        let active = entries.findIndex(isOpen);
        if (nowVisible) {
          const remembered = entries.findIndex(entry => entry.key === read(storageKey));
          // On opening, the remembered tab wins over a product's default first section; a section
          // the product opened on purpose (anything but the first) is kept.
          if (!wasVisible && remembered >= 0 && active <= 0 && remembered !== active) open(remembered);
          else if (active < 0) open(remembered >= 0 ? remembered : 0);
          active = entries.findIndex(isOpen);
        }
        wasVisible = nowVisible;
        tabs.forEach((tab, i) => { const on = i === active; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on || (active < 0 && i === 0) ? 0 : -1; });
        flatten();
        if (nowVisible) compact();
      } finally { syncing = false; }
    }
    function select(index, focus = false) {
      if (!entries[index]) return;
      write(storageKey, entries[index].key);
      open(index); sync();
      if (focus) tabs[index].focus();
    }
    const click = event => { const index = tabs.indexOf(event.target.closest('[role=tab]')); if (index >= 0) select(index); };
    const keydown = event => {
      const current = tabs.indexOf(event.target); if (current < 0) return;
      const last = tabs.length - 1;
      const index = event.key === 'ArrowRight' ? (current + 1) % tabs.length : event.key === 'ArrowLeft' ? (current + last) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? last : -1;
      if (index < 0) return;
      event.preventDefault(); select(index, true);
    };
    list.addEventListener('click', click); list.addEventListener('keydown', keydown);
    const observer = new view.MutationObserver(() => { if (!queued && !disposed) { queued = true; queueMicrotask(() => { queued = false; sync(); }); } });
    observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'aria-expanded', 'open'] });
    const resize = new view.ResizeObserver(() => { if (visible()) compact(); }); resize.observe(panel);
    sync();
    return {
      update: sync,
      select: key => select(entries.findIndex(entry => entry.key === key)),
      destroy() {
        disposed = true; observer.disconnect(); resize.disconnect();
        list.removeEventListener('click', click); list.removeEventListener('keydown', keydown); list.remove(); style.remove();
        delete panel.dataset.expSectionTabs;
        for (const [entry, before] of saved) {
          for (const [node, name, value] of [[entry.header, 'tabindex', before.tabindex], [entry.header, 'aria-hidden', before.hidden], [entry.body, 'role', before.role], [entry.body, 'aria-labelledby', before.labelledby]]) {
            if (value === null) node.removeAttribute(name); else node.setAttribute(name, value);
          }
          entry.body.querySelectorAll('details[data-exp-flat]').forEach(details => delete details.dataset.expFlat);
        }
      },
    };
  }
  return Object.freeze({ mount });
})();
