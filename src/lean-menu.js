// Layout and surfaces from the approved Lean menu, with product-specific colors.
const ExpLeanMenu = (() => {
  // The shell is shared by existing products and new createProduct/createMenuController consumers.
  const template=Object.freeze({id:'extrapotions-menu',version:1,layout:'sidebar',systemLayout:'grouped',supportNavigation:'system',resetNavigation:'system',donations:'header-heart'});
  const twitch=Object.freeze({bg:'#18181b',panel:'#1f1f23',raised:'#3a3a3d',inset:'#0e0e10',line:'#848494',text:'#efeff1',muted:'#adadb8',hover:'#53535f',accent:'#9146ff',accent2:'#bf94ff',link:'#bf94ff',focus:'#bf94ff',onAccent:'#ffffff'});
  // THREAD supplies its native/default and opt-in gem palette through Core.applyTheme.
  const palettes=Object.freeze({dropper:twitch});
  const sectionIcons = Object.freeze({campaigns:'gift',settings:'system',drops:'gift',streams:'screen',appearance:'brush',advanced:'sliders',system:'system',highlights:'sparkle',protection:'shield',amazon:'bag'});
  // Scoped switches outrank the older product gradient rules.
  const SWITCH='[data-exp-menu-layout="lean"][data-exp-menu-layout="lean"][data-exp-menu-layout="lean"] .toggleSwitch[role="switch"]';
  const css = `
    [data-exp-menu-layout="lean"]{box-sizing:border-box!important;padding:0!important;border:1px solid var(--theme-muted)!important;border-radius:7px!important;background:var(--theme-bg)!important;background-image:none!important;box-shadow:0 4px 10px #0003!important;color:var(--theme-text)!important;font:400 13px/1.4 "Segoe UI",system-ui,sans-serif!important;text-align:start;letter-spacing:0!important;transition:none!important}
    [data-exp-menu-layout="lean"] *{box-sizing:border-box}
    /* One shell must outrank legacy product-ID rules, including Dropper's sibling card. */
    :host :is(#tdh-tools-dock,[data-exp-menu-layout="lean"])[data-exp-menu-template]{position:fixed!important;z-index:2147483647!important;overflow:hidden!important;flex-direction:column;max-height:calc(100dvh - 16px)}
    :host :is(#tdh-tools-dock,[data-exp-menu-layout="lean"])[data-exp-menu-template].fl-rail-open:not([hidden]){display:flex!important}
    [data-exp-menu-layout="lean"] .menu-head{display:flex!important;align-items:center!important;gap:5px!important;width:100%!important;margin:0!important;padding:7px!important;border:0!important;border-bottom:1px solid var(--theme-line)!important;background:transparent!important}
    [data-exp-menu-layout="lean"] .header-brand{display:flex!important;align-items:center!important;gap:6px!important;flex:1;min-width:0}
    [data-exp-menu-layout="lean"] .header-icon{flex:0 0 28px;width:28px!important;height:30px!important;border:0!important;background:transparent!important;overflow:hidden}
    [data-exp-menu-layout="lean"] .header-icon .menu-icon{width:28px!important;height:30px!important;object-fit:contain}
    [data-exp-menu-layout="lean"] .header-copy{flex:1;min-width:0;overflow:visible!important}
    [data-exp-menu-layout="lean"] .header-title-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
    [data-exp-menu-layout="lean"] :is(.header-title-row h2,[data-exp-part="title"],#tdh-rail-title){margin:0!important;font-size:14px!important;font-weight:600!important;line-height:1.3!important}
    [data-exp-menu-layout="lean"] :is([data-exp-part="subtitle"],#tdh-rail-subtitle){display:block!important;margin-top:1px!important;color:var(--theme-muted)!important;font-size:11px!important;line-height:1.35!important}
    [data-exp-menu-layout="lean"] :is([data-exp-part="version"],#tdh-header-version){padding:1px 4px!important;min-height:23px!important;border:1px solid var(--theme-muted)!important;border-radius:4px!important;background:var(--theme-panel)!important;color:var(--theme-text)!important;font-size:11px!important;font-weight:400!important}
    [data-exp-menu-layout="lean"] .header-actions{display:flex!important;align-items:center!important;gap:5px!important;flex:none}
    [data-exp-menu-layout="lean"] :is(.support-button,[data-exp-part="close"],#tdh-rail-close){display:grid!important;place-items:center!important;flex:none;width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;padding:2px!important;border:1px solid var(--theme-muted)!important;border-radius:5px!important;background:var(--theme-panel)!important;color:var(--theme-text)!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] :is(.header-divider,.exp-menu-tagline,[data-exp-part="status"]){display:none!important}
    [data-exp-menu-layout="lean"]>nav{padding:0!important;margin:0!important}
    [data-exp-menu-layout="lean"] .exp-menu-workspace{display:grid!important;grid-template-columns:84px minmax(0,1fr)!important;min-width:0;min-height:0;overflow:hidden;align-items:stretch;flex:1 1 auto}
    [data-exp-menu-layout="lean"] .exp-menu-rail{padding:5px;border-right:1px solid var(--theme-line);min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain;align-self:stretch;background:var(--exp-menu-navigation,transparent)}
    [data-exp-menu-layout="lean"] .exp-menu-content{padding:var(--exp-menu-padding,8px)!important;min-width:0;min-height:0;overflow:auto;max-height:calc(100dvh - 116px);overscroll-behavior:contain}
    [data-exp-menu-layout="lean"] .exp-section-tabs{display:flex!important;flex-direction:column!important;gap:4px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}
    [data-exp-menu-layout="lean"] .exp-menu-shortcuts{display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--theme-line);padding-top:8px;margin-top:8px}
    [data-exp-menu-layout="lean"] :is(.exp-section-tabs>[role=tab],.exp-menu-shortcuts>button){width:100%!important;min-width:0!important;min-height:30px!important;justify-content:flex-start!important;padding:5px 3px!important;text-align:left!important;font:400 12px/1.35 "Segoe UI",sans-serif!important;white-space:normal!important;overflow-wrap:anywhere!important;border:1px solid var(--theme-muted)!important;border-radius:5px!important;background:var(--theme-panel)!important;color:var(--theme-text)!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] .exp-section-tabs>[aria-selected=true]{border-color:var(--theme-focus,var(--theme-accent2))!important;background:color-mix(in srgb,var(--theme-accent2) 13%,var(--theme-panel))!important}
    [data-exp-menu-layout="lean"] .exp-section-tabs .exp-section-icon{display:none!important}
    [data-exp-menu-layout="lean"] .exp-section-tabs .exp-section-tab-label{display:inline!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
    [data-exp-menu-layout="lean"] .exp-menu-content>.fl-tool-panel>.fl-tool-header{position:absolute!important;width:1px!important;height:1px!important;min-height:0!important;margin:-1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important}
    [data-exp-menu-layout="lean"] :is(.fl-tool-panel,.exp-system-card){margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] .fl-tool-body{padding:0!important}
    [data-exp-menu-layout="lean"] :is(.row,.mini-row,.fl-switch,.setting-row){min-width:0!important;min-height:32px;gap:6px!important;padding:var(--exp-menu-row,6px) 0!important;margin:0!important;border:0!important;border-bottom:1px solid var(--theme-line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;line-height:1.4!important}
    [data-exp-menu-layout="lean"] :is(.label,.setting-label,.fl-switch-text,.copy>strong,.row-copy>strong,.mini-row>span,.row>span){font-size:12px!important;font-weight:400!important;line-height:1.4!important;white-space:normal!important;overflow-wrap:anywhere!important;min-width:0!important}
    [data-exp-menu-layout="lean"] :is(.row,.mini-row,.setting-row):has(>select){grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:6px!important}
    [data-exp-menu-layout="lean"] :is(button,input,select,textarea){max-width:100%;color:var(--theme-text);font-family:"Segoe UI",system-ui,sans-serif}
    [data-exp-menu-layout="lean"][data-exp-menu-layout="lean"] .fl-tool-body button{font-size:12px!important;font-weight:400!important;line-height:1.35!important}
    [data-exp-menu-layout="lean"] :is(.life-btn,.action,.secondary,.primary,.compact,select,input:not([type=range]),textarea){min-width:0!important;min-height:var(--exp-menu-control,30px)!important;padding:4px 7px!important;font-size:12px!important;line-height:1.35!important;border:1px solid var(--theme-muted)!important;border-radius:5px!important;background:var(--theme-panel)!important;color:var(--theme-text)!important;white-space:normal!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] option{background:var(--theme-panel)!important;color:var(--theme-text)!important}
    ${SWITCH}{flex:none!important;width:32px!important;min-width:32px!important;max-width:32px!important;height:22px!important;min-height:22px!important;max-height:22px!important;border:1px solid var(--theme-muted)!important;border-radius:4px!important;background:var(--theme-panel)!important;padding:0!important;box-shadow:none!important}
    ${SWITCH}::after{width:12px!important;height:16px!important;top:2px!important;left:2px!important;border-radius:2px!important;background:var(--theme-muted)!important}
    ${SWITCH}>span{display:none!important}
    ${SWITCH}[aria-checked=true]{background:var(--theme-accent)!important}
    ${SWITCH}[aria-checked=true]::after{transform:translateX(14px)!important;background:var(--theme-bg)!important}
    [data-exp-menu-layout="lean"] :is(button,select,input,textarea,summary):focus-visible{outline:2px solid var(--theme-focus,var(--theme-accent2))!important;outline-offset:2px}
    [data-exp-menu-layout="lean"] details{border:0!important;border-bottom:1px solid var(--theme-line)!important;background:transparent!important;padding:0!important;margin:0!important;min-width:0}
    [data-exp-menu-layout="lean"] details>summary{min-height:32px!important;padding:7px 0!important;font-size:12px!important;font-weight:600!important;color:var(--theme-text)!important;cursor:pointer}
    [data-exp-menu-layout="lean"] details>:not(summary){min-width:0;margin-inline:0!important}
    [data-exp-menu-layout="lean"] :is(.note,.help,.empty,.meta){color:var(--theme-muted)!important;font-size:11px!important;line-height:1.5!important}
    [data-exp-menu-layout="lean"] .action-pair{display:flex!important;gap:5px!important;margin:6px 0!important;min-width:0}
    [data-exp-menu-layout="lean"] .action-pair>*{flex:1!important;min-width:0!important;white-space:normal!important}
    [data-exp-menu-layout="lean"][data-exp-menu-layout="lean"] .fl-tool-body .diagnostics-controls .action-pair>button{font-size:11px!important;line-height:1.25!important;padding:3px!important;min-height:28px!important;overflow-wrap:normal!important;word-break:normal!important;white-space:normal!important}
    [data-exp-menu-layout="lean"] [data-exp-system-report]{text-align:center!important;justify-content:center!important;width:100%}
    [data-exp-menu-layout="lean"] :is([data-exp-destructive],[data-exp-system-item=reset]>button,button[data-exp-system-item=reset]){color:light-dark(#9f1239,#fca5a5)!important;border-color:light-dark(#be123c,#f87171)!important;background:transparent!important}
    .exp-floating-update,.update-notice[data-placement="menu"]{max-height:calc(100dvh - 16px)!important;overflow:auto;overscroll-behavior:contain;background:var(--exp-notice-top,var(--theme-bg))!important;background-image:none!important;border-color:var(--exp-notice-border,var(--theme-muted))!important;border-radius:7px!important;box-shadow:0 4px 10px #0003!important;font-size:12px!important}
    .update-notice :is(.update-text,.update-list){overflow-wrap:anywhere;line-height:1.5}
    @media(max-width:300px){[data-exp-menu-layout="lean"][data-exp-menu-layout="lean"] .fl-tool-body .diagnostics-controls .action-pair>button{white-space:normal!important}}
    @media(pointer:coarse){[data-exp-menu-layout="lean"] :is(.life-btn,.action,.secondary,.primary,.exp-menu-shortcuts>button,.exp-section-tabs>[role=tab],select,summary){min-height:36px!important}}

    @media(forced-colors:active){
      [data-exp-menu-layout="lean"] :is(button,select,input,textarea){forced-color-adjust:auto!important;border-color:ButtonText!important}
      ${SWITCH}[aria-checked=true]{background:Highlight!important;forced-color-adjust:none!important}
      ${SWITCH}[aria-checked=true]::after{background:HighlightText!important}
      [data-exp-menu-layout="lean"] .exp-section-tabs>[aria-selected=true]{border-color:Highlight!important}
    }

  `;
  // Products register how to read their health; the header shows it and the tagline moves to the menu footer.
  const statusSources=new Map(),statusPanels=new Map();
  function setMenuStatus(id,getHealth){
    if(typeof getHealth!=='function')throw new TypeError('Menu status needs a health function');
    statusSources.set(String(id).toLowerCase(),getHealth);
    for(const refresh of statusPanels.get(String(id).toLowerCase())||[])refresh();
  }
  function mount({shadow,panel}) {
    const document=panel.ownerDocument,host=shadow.host;
    const id=host?.dataset.productId||host?.id.replace(/^(exp-)|(\-root)$/g,'').replace(/^tdh$/,'dropper');
    const palette=palettes[id],saved=new Map();panel.dataset.expMenuLayout='lean';panel.dataset.expMenuTemplate=template.id+'-v'+template.version;
    const themeRoot=shadow.querySelector('.exp-core-theme,.cluster');
    const properties=['bg','panel','line','text','muted','accent','accent2','link','focus'].map(key=>'--theme-'+key).concat('--exp-menu-hover','background-image');
    for(const property of properties)saved.set(property,[panel.style.getPropertyValue(property),panel.style.getPropertyPriority(property)]);
    function applyPalette(){
      const selected=themeRoot?.dataset.uiTheme;
      for(const[key,[value,priority]]of saved){if(value)panel.style.setProperty(key,value,priority);else panel.style.removeProperty(key);}
      panel.style.setProperty('background-image','none','important');
      panel.style.setProperty('--exp-menu-hover','color-mix(in srgb,var(--theme-accent) 12%,var(--theme-panel))');
      if(palette&&selected!=='contrast'){
        for(const[key,value]of Object.entries(palette)){const property=key==='hover'?'--exp-menu-hover':'--theme-'+key;panel.style.setProperty(property,value);themeRoot?.style.setProperty(property,value);}
        if(themeRoot)themeRoot.dataset.themeSkin='flat';
      }
    }
    applyPalette();
    const themeObserver=new MutationObserver(applyPalette);if(themeRoot)themeObserver.observe(themeRoot,{attributes:true,attributeFilter:['data-ui-theme']});
    const style=document.createElement('style');style.dataset.expLeanMenu='1';style.textContent=css;shadow.append(style);
    const status=document.createElement('div');status.dataset.expPart='status';status.setAttribute('role','status');
    const dot=document.createElement('span');dot.className='exp-status-dot';const statusText=document.createElement('span');statusText.className='exp-status-text';status.append(dot,statusText);
    const tagline=document.createElement('p');tagline.className='exp-menu-tagline';tagline.dataset.expPart='tagline';
    function placeTagline(){
      const text=panel.querySelector('[data-exp-part="subtitle"],#tdh-rail-subtitle')?.textContent.trim();
      if(panel.dataset.expMenuStatus!=='1'||!text){tagline.remove();return;}
      if(tagline.textContent!==text)tagline.textContent=text;
      if(panel.lastElementChild!==tagline)panel.append(tagline);
    }
    let statusTicket=0,statusTimer=0;
    async function refreshStatus(){
      const source=statusSources.get(id);
      if(!source){delete panel.dataset.expMenuStatus;status.remove();placeTagline();return;}
      const copy=panel.querySelector('.header-copy');
      if(!copy){delete panel.dataset.expMenuStatus;status.remove();placeTagline();return;}
      if(!copy.contains(status))copy.append(status);
      if(panel.dataset.expMenuStatus!=='1')panel.dataset.expMenuStatus='1';placeTagline();const ticket=++statusTicket;
      let value=null;try{value=await source();}catch{}
      if(ticket!==statusTicket)return;
      const health=ExpHealthSummary.normalizeHealth(value);
      // Unchanged values are not written again, so observers and screen readers are not woken every poll.
      if(dot.dataset.state!==health.state)dot.dataset.state=health.state;
      if(statusText.textContent!==health.label)statusText.textContent=health.label;
    }
    if(!statusPanels.has(id))statusPanels.set(id,new Set());statusPanels.get(id).add(refreshStatus);
    // Polls only while the menu is on screen. Products show it by the hidden attribute, a class (Dropper's
    // dock, WARD's shell) or an ancestor; the resize observer sees the panel gain or lose its box.
    const shown=()=>!panel.hidden&&panel.getClientRects().length>0;
    let statusShown=shown();
    // A product that hides and shows the panel in one task leaves no hidden state to observe;
    // the hidden attribute's old value still says the menu was reopened.
    function followVisibility(reopened=false){
      const now=shown();if(now===statusShown&&!(now&&reopened))return;statusShown=now;
      clearInterval(statusTimer);statusTimer=0;
      if(now){refreshStatus();statusTimer=setInterval(refreshStatus,10000);}
    }
    const visibility=new MutationObserver(records=>followVisibility(records.some(record=>record.attributeName==='hidden'&&record.oldValue!==null)));
    visibility.observe(panel,{attributes:true,attributeOldValue:true,attributeFilter:['hidden','class','style']});
    const visibilityResize=new ResizeObserver(()=>followVisibility());visibilityResize.observe(panel);
    refreshStatus();if(statusShown)statusTimer=setInterval(refreshStatus,10000);
    const icons=new Set();
    function decorate(){
      for(const header of panel.querySelectorAll('.fl-tool-header')){
        if(header.querySelector('.exp-section-icon'))continue;
        const title=header.querySelector('.fl-tool-title');if(!title)continue;
        const name=sectionIcons[title.textContent.trim().toLowerCase()];if(!name)continue;
        const icon=document.createElement('span');icon.className='exp-section-icon';icon.setAttribute('aria-hidden','true');
        icon.dataset.icon=name;header.prepend(icon);icons.add(icon);
      }
    }
    decorate();const observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});
    return ()=>{visibility.disconnect();visibilityResize.disconnect();clearInterval(statusTimer);statusPanels.get(id)?.delete(refreshStatus);status.remove();tagline.remove();delete panel.dataset.expMenuStatus;themeObserver.disconnect();observer.disconnect();icons.forEach(icon=>icon.remove());style.remove();for(const[key,[value,priority]]of saved){if(value)panel.style.setProperty(key,value,priority);else panel.style.removeProperty(key);}delete panel.dataset.expMenuLayout;delete panel.dataset.expMenuTemplate;};
  }
  return Object.freeze({mount,setMenuStatus,template});
})();
