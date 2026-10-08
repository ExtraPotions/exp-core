// Layout and surfaces from the approved Lean menu, with product-specific colors.
const ExpLeanMenu = (() => {
  const palettes = Object.freeze({
    dropper: {bg:'#141019',panel:'#1e1827',line:'#393043',text:'#f4effb',muted:'#bbb0ca',accent:'#bc94f5',hover:'#272031'},
    prisma: {bg:'#111723',panel:'#1a2434',line:'#344259',text:'#eff5ff',muted:'#afbed4',accent:'#91bfff',hover:'#25334a'},
    shift: {bg:'#111c1d',panel:'#1b2a2c',line:'#34494b',text:'#effafa',muted:'#afc6c7',accent:'#80d7d2',hover:'#25383a'},
    ward: {bg:'#1c1711',panel:'#2a2219',line:'#4b3e2d',text:'#fff6e9',muted:'#cbbb9f',accent:'#e7bb75',hover:'#382d20'},
  });
  const sectionIcons = Object.freeze({drops:'gift',streams:'screen',appearance:'brush',advanced:'sliders',system:'system',highlights:'sparkle',protection:'shield',amazon:'bag'});
  const css = `
    [data-exp-menu-layout="lean"]{box-sizing:border-box!important;padding:10px!important;border:1px solid var(--theme-line)!important;border-radius:14px!important;background:var(--theme-bg)!important;background-image:none!important;box-shadow:0 16px 44px #0004!important;color:var(--theme-text)!important;font:400 var(--exp-font-size-body,14px)/1.35 "Segoe UI",system-ui,sans-serif!important;text-align:start;letter-spacing:-.1px;transition:none!important}
    [data-exp-menu-layout="lean"] *{box-sizing:border-box}
    [data-exp-menu-layout="lean"] .menu-head{display:flex!important;align-items:center!important;gap:11px!important;width:calc(100% + 20px)!important;margin:-10px -10px 8px!important;padding:12px!important;border-bottom:1px solid var(--theme-line)!important}
    [data-exp-menu-layout="lean"] .header-brand{display:flex!important;align-items:center!important;gap:11px!important;flex:1;min-width:0;width:auto!important}
    [data-exp-menu-layout="lean"] .header-icon{flex:0 0 42px;width:42px!important;height:42px!important;border:1px solid var(--theme-line)!important;border-radius:10px!important;background:var(--theme-panel)!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] .header-icon .menu-icon{width:40px!important;height:40px!important;object-fit:contain}
    [data-exp-menu-layout="lean"] .header-copy{flex:1;min-width:0;overflow:visible!important}
    [data-exp-menu-layout="lean"] .header-title-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    [data-exp-menu-layout="lean"] :is(.header-title-row h2,[data-exp-part="title"],#tdh-rail-title){margin:0!important;font-size:calc(var(--exp-font-size-body,14px) + 3px)!important;line-height:1.2!important;font-weight:650!important;letter-spacing:-.25px!important;color:var(--theme-text)!important}
    [data-exp-menu-layout="lean"] :is([data-exp-part="subtitle"],#tdh-rail-subtitle){display:block!important;margin-top:3px!important;font-size:var(--exp-font-size-small,12px)!important;line-height:1.45!important;color:var(--theme-muted)!important}
    [data-exp-menu-layout="lean"] :is([data-exp-part="version"],#tdh-header-version){padding:2px 5px!important;min-height:0!important;border:1px solid var(--theme-line)!important;border-radius:5px!important;background:transparent!important;background-image:none!important;color:var(--theme-muted)!important;font-size:var(--exp-font-size-small,12px)!important;line-height:1.2!important;font-weight:500!important}
    [data-exp-menu-layout="lean"] .header-actions{display:flex!important;align-items:center!important;gap:7px!important;flex:none}
    [data-exp-menu-layout="lean"] :is(.support-button,[data-exp-part="close"],#tdh-rail-close){display:grid!important;place-items:center!important;flex:none;width:30px!important;height:30px!important;min-width:30px!important;min-height:30px!important;margin:0!important;padding:6px!important;border:1px solid var(--theme-line)!important;border-radius:7px!important;background:transparent!important;background-image:none!important;color:var(--theme-muted)!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] .header-divider{display:none!important}
    [data-exp-menu-layout="lean"]>nav{padding:0!important;margin:0!important}
    [data-exp-menu-layout="lean"] .fl-tool-panel{margin:3px 0 0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] .fl-tool-header{min-height:38px!important;display:flex!important;align-items:center!important;gap:9px!important;padding:9px 10px!important;border:0!important;border-bottom:1px solid var(--theme-line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:var(--theme-text)!important}
    [data-exp-menu-layout="lean"] .fl-tool-header::before{display:none!important}
    [data-exp-menu-layout="lean"] .fl-tool-title{flex:1;min-width:0;font-size:var(--exp-font-size-body,14px)!important;font-weight:500!important;line-height:1.35!important;letter-spacing:-.1px!important;color:inherit!important}
    [data-exp-menu-layout="lean"] .fl-tool-header:is([aria-expanded=true],:has(.fl-tool-chevron[aria-expanded=true])){color:var(--theme-accent)!important}
    [data-exp-menu-layout="lean"] .fl-tool-header:hover{background:var(--exp-menu-hover)!important}
    [data-exp-menu-layout="lean"] .fl-tool-header:focus-visible{outline:2px solid var(--theme-accent)!important;outline-offset:-2px}
    [data-exp-menu-layout="lean"] .fl-tool-chevron{position:relative;flex:none;width:14px;min-width:14px;height:14px;align-self:center;padding:0!important;font-size:14px!important;color:transparent!important;background:none!important;border:0!important}
    [data-exp-menu-layout="lean"] .fl-tool-chevron::after{content:'';position:absolute;top:1px;left:1px;display:block;width:6px;height:6px;border-top:1.5px solid var(--theme-muted);border-right:1.5px solid var(--theme-muted);transform:rotate(45deg);margin:3px}
    [data-exp-menu-layout="lean"] .fl-tool-header:is([aria-expanded=true],:has(.fl-tool-chevron[aria-expanded=true])) .fl-tool-chevron::after{transform:rotate(135deg)}
    [data-exp-menu-layout="lean"] .fl-tool-body{padding:12px 9px 10px!important}
    [data-exp-menu-layout="lean"] .exp-submenu-tablist{display:flex!important;justify-content:flex-start;gap:4px!important;padding:0 0 8px!important;margin:0 0 9px!important;border-bottom:1px solid var(--theme-line)!important}
    [data-exp-menu-layout="lean"] .exp-submenu-tablist>button{flex:0 1 auto!important;min-height:32px!important;padding:5px 9px!important;border:0!important;border-radius:5px!important;background:transparent!important;color:var(--theme-muted)!important;font-size:calc(var(--exp-font-size-body,14px) - 1px)!important;font-weight:400!important;line-height:1.35!important}
    [data-exp-menu-layout="lean"] .exp-submenu-tablist>button[aria-selected=true]{background:var(--exp-menu-hover)!important;color:var(--theme-text)!important}
    [data-exp-menu-layout="lean"] :is(.row,.mini-row,.fl-switch,.setting-row){gap:12px!important;padding:8px 0!important;line-height:1.35!important}
    [data-exp-menu-layout="lean"] :is(.row,.mini-row,.fl-switch,.setting-row)+:is(.row,.mini-row,.fl-switch,.setting-row){border-top:1px solid var(--theme-line)!important}
    [data-exp-menu-layout="lean"] :is(.label,.setting-label,.fl-switch-text,.copy>strong,.row-copy>strong,.mini-row>span){font-weight:500!important;line-height:1.35!important}
    [data-exp-menu-layout="lean"] :is(.copy>.help,.row-copy>small,.help,.row-help,.note,.empty,.meta){line-height:1.4!important;color:var(--theme-muted)!important}
    [data-exp-menu-layout="lean"] :is(.row,.mini-row,.setting-row):has(>select){grid-template-columns:minmax(0,1fr) minmax(104px,.8fr)!important;gap:14px!important}
    [data-exp-menu-layout="lean"] select{border:1px solid var(--theme-line)!important;border-radius:6px!important;background:var(--theme-panel)!important;background-image:none!important;color:var(--theme-text)!important;font-weight:400!important}
    [data-exp-menu-layout="lean"] :is(.group>h3,.section>h3,.section>h2,.stream-subsection-label){margin:10px 0 4px!important;font-weight:600!important;line-height:1.45!important;color:var(--theme-muted)!important}
    [data-exp-menu-layout="lean"] :is(.group,.section):first-child>h3{margin-top:0!important}
    [data-exp-menu-layout="lean"] :is(.fl-tool-body,.route-body) :is(.life-btn,.action,.secondary,.primary,.compact){padding:7px 10px!important;border:1px solid var(--theme-line)!important;border-radius:7px!important;background:var(--theme-panel)!important;background-image:none!important;color:var(--theme-text)!important;font-weight:500!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] :is(.button-grid,.actions,.profile-actions,.menu-footer,.diagnostics-controls>div,.rules-transfer){gap:7px!important}
    [data-exp-menu-layout="lean"] .toggleSwitch{width:34px!important;min-width:34px!important;height:20px!important;min-height:20px!important;padding:2px!important;border:0!important;border-radius:6px!important;background:color-mix(in srgb,var(--theme-muted) 40%,var(--theme-panel))!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] .toggleSwitch::after{top:3px!important;left:3px!important;width:14px!important;height:14px!important;border:0!important;border-radius:3px!important;background:#fff!important;box-shadow:none!important}
    [data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]{background:color-mix(in srgb,var(--theme-accent) 65%,var(--theme-panel))!important}
    [data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]::after{transform:translateX(14px)!important}
    [data-exp-menu-layout="lean"] .diagnostics-controls{margin:10px 0 16px!important}
    [data-exp-menu-layout="lean"] [data-exp-product-system] [data-exp-system-item="reset"] button, [data-exp-menu-layout="lean"] [data-exp-product-system] button[data-exp-system-item="reset"]{margin-top:14px!important;border:0!important;background:#e11428!important;color:#fff!important;font-weight:600!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot{margin:0 0 16px!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card::before,[data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card::after{display:none!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card{border:0!important;background:transparent!important;background-image:none!important;box-shadow:none!important;padding:0!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot .expanded-content{padding:0!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card .stream-info{padding:0!important;min-height:0!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card .progress-copy{grid-template-areas:"status percent" "channel channel" "category category" "bar bar" "reward skip"!important;row-gap:7px!important;align-items:center}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card :is(.progress-head,.drop-status-row){display:contents!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card .stream-channel{grid-area:channel!important;margin-top:1px}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card .drop-percent{grid-area:percent!important;font-size:calc(var(--exp-font-size-body,14px) + 7px)!important;font-weight:650!important;line-height:1.1!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card .status-meta-chip{grid-area:status!important;border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;height:auto!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card .skip-streamer-chip{grid-area:skip!important;border-radius:6px!important;background:transparent!important;font-weight:500!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-card .progress-reward-row{line-height:1.35!important}

    [data-exp-menu-layout="lean"] .badge-only-progress-slot .drop-percent{font-size:calc(var(--exp-font-size-body,14px) + 7px)!important;color:var(--theme-accent)!important;font-weight:650!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot .stream-channel{font-size:var(--exp-font-size-body,14px)!important;font-weight:600!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot :is(.stream-game,.drop-meta,.drop-name,.state-pill,#tdh-updated-ago){font-size:var(--exp-font-size-small,12px)!important;line-height:1.35!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot .drop-bar{height:6px!important;margin:11px 0 7px!important;border-radius:3px!important;background:#ffffff12!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot #tdh-drop-fill{background:var(--theme-accent)!important;border-radius:3px!important}
    [data-exp-menu-layout="lean"] .badge-only-progress-slot .progress-reward-row{white-space:normal!important;flex-wrap:wrap!important;overflow:visible!important}
    [data-exp-menu-layout="lean"] .exp-menu-footer{display:flex;justify-content:space-between;gap:8px;margin:8px -10px -10px;padding:8px 12px;border-top:1px solid var(--theme-line);color:var(--theme-muted);font-size:var(--exp-font-size-small,12px);line-height:1.45}
    [data-exp-menu-layout="lean"] .exp-section-icon{position:relative;display:block;flex:0 0 16px;width:16px;height:16px;color:currentColor}
    [data-exp-menu-layout="lean"] .exp-section-icon::before,[data-exp-menu-layout="lean"] .exp-section-icon::after{content:'';position:absolute;box-sizing:border-box}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=gift]{width:12px;height:11px;flex-basis:12px;margin:3px 2px 0;border:1.5px solid currentColor;border-top:0;border-radius:1px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=gift]::before{left:-3px;top:-3px;width:16px;height:4px;border:1.5px solid currentColor;border-radius:1px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=gift]::after{top:-4px;left:4px;width:2px;height:14px;background:currentColor}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=screen]::before{inset:1px 0 4px;border:1.5px solid currentColor;border-radius:2px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=screen]::after{left:4px;bottom:1px;width:8px;border-top:1.5px solid currentColor}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=sliders]::before{left:0;top:4px;width:16px;height:7px;border-top:1.5px solid currentColor;border-bottom:1.5px solid currentColor}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=sliders]::after{left:4px;top:2px;width:3px;height:5px;border:1.5px solid currentColor;background:var(--theme-bg);box-shadow:5px 6px 0 -1px var(--theme-bg),5px 6px 0 0 currentColor}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=system]::before{inset:1px;border:1.5px dashed currentColor;border-radius:4px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=system]::after{inset:5px;border:1.5px solid currentColor;border-radius:2px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=brush]::before{left:7px;top:0;width:5px;height:11px;border:1.5px solid currentColor;border-radius:1px;transform:rotate(40deg)}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=brush]::after{left:1px;bottom:0;width:6px;height:5px;border:1.5px solid currentColor;border-radius:3px 1px 3px 1px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=sparkle]::before{inset:0;background:currentColor;clip-path:polygon(50% 0,63% 37%,100% 50%,63% 63%,50% 100%,37% 63%,0 50%,37% 37%)}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=shield]::before{inset:0 1px 1px;border:1.5px solid currentColor;border-radius:2px 2px 7px 7px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=shield]::after{left:5px;top:4px;width:6px;height:4px;border-left:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg)}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=bag]::before{inset:4px 1px 0;border:1.5px solid currentColor;border-radius:2px}
    [data-exp-menu-layout="lean"] .exp-section-icon[data-icon=bag]::after{left:5px;top:0;width:6px;height:7px;border:1.5px solid currentColor;border-bottom:0;border-radius:3px 3px 0 0}
    [data-ui-theme="contrast"] [data-exp-menu-layout="lean"] .toggleSwitch{background:#000!important;border:1px solid #fff!important}
    [data-ui-theme="contrast"] [data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]{background:#fff!important}
    [data-ui-theme="contrast"] [data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]::after{background:#000!important}
    @media(max-height:400px){[data-exp-menu-layout="lean"] .exp-menu-footer{padding-block:6px;margin-top:4px}[data-exp-menu-layout="lean"] .fl-tool-body{padding-bottom:4px!important}}
    @media(pointer:coarse){[data-exp-menu-layout="lean"] .exp-submenu-tablist>button{min-height:44px!important}}
    @media(forced-colors:active){[data-exp-menu-layout="lean"] .toggleSwitch{border:1px solid ButtonText!important;background:Canvas!important}[data-exp-menu-layout="lean"] .toggleSwitch::after{background:ButtonText!important}[data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]{background:Highlight!important}[data-exp-menu-layout="lean"] .toggleSwitch[aria-checked=true]::after{background:HighlightText!important}}
  `;
  function mount({shadow,panel}) {
    const document=panel.ownerDocument,host=shadow.host;
    const id=host?.dataset.productId||host?.id.replace(/^(exp-)|(\-root)$/g,'').replace(/^tdh$/,'dropper');
    const palette=palettes[id],saved=new Map();panel.dataset.expMenuLayout='lean';
    const themeRoot=shadow.querySelector('.exp-core-theme,.cluster');
    const properties=['bg','panel','line','text','muted','accent','accent2','link','focus'].map(key=>'--theme-'+key).concat('--exp-menu-hover','background-image');
    for(const property of properties)saved.set(property,[panel.style.getPropertyValue(property),panel.style.getPropertyPriority(property)]);
    function applyPalette(){
      const selected=themeRoot?.dataset.uiTheme;
      for(const[key,[value,priority]]of saved){if(value)panel.style.setProperty(key,value,priority);else panel.style.removeProperty(key);}
      panel.style.setProperty('background-image','none','important');
      panel.style.setProperty('--exp-menu-hover','color-mix(in srgb,var(--theme-accent) 12%,var(--theme-panel))');
      if(palette&&(!selected||selected===id)){
        for(const[key,value]of Object.entries(palette))panel.style.setProperty(key==='hover'?'--exp-menu-hover':'--theme-'+key,value);
        for(const key of ['accent2','link','focus'])panel.style.setProperty('--theme-'+key,palette.accent);
      }
    }
    applyPalette();
    const themeObserver=new MutationObserver(applyPalette);if(themeRoot)themeObserver.observe(themeRoot,{attributes:true,attributeFilter:['data-ui-theme']});
    const style=document.createElement('style');style.dataset.expLeanMenu='1';style.textContent=css;shadow.append(style);
    const footer=document.createElement('footer');footer.className='exp-menu-footer';
    const brand=document.createElement('span');brand.textContent='ExtraPotions';const release=document.createElement('span');footer.append(brand,release);panel.append(footer);
    const icons=new Set();
    function decorate(){
      for(const header of panel.querySelectorAll('.fl-tool-header')){
        if(header.querySelector('.exp-section-icon'))continue;
        const title=header.querySelector('.fl-tool-title');if(!title)continue;
        const name=sectionIcons[title.textContent.trim().toLowerCase()];if(!name)continue;
        const icon=document.createElement('span');icon.className='exp-section-icon';icon.setAttribute('aria-hidden','true');
        icon.dataset.icon=name;header.prepend(icon);icons.add(icon);
      }
      const value=panel.querySelector('[data-exp-part="version"],#tdh-header-version,.version')?.textContent||'';
      if(release.textContent!==value)release.textContent=value;
      if(panel.lastElementChild!==footer)panel.append(footer);
    }
    decorate();const observer=new MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true});
    return ()=>{themeObserver.disconnect();observer.disconnect();icons.forEach(icon=>icon.remove());footer.remove();style.remove();for(const[key,[value,priority]]of saved){if(value)panel.style.setProperty(key,value,priority);else panel.style.removeProperty(key);}delete panel.dataset.expMenuLayout;};
  }
  return Object.freeze({mount});
})();
