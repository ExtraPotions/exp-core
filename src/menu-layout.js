// Approved dense web menu. Product engines, palettes and original control nodes stay owned by products.
const ExpMenuLayout = (() => {
  const S=':host :is(#tdh-tools-dock,[data-exp-menu-layout="lean"])[data-exp-menu-layout="lean"]';
  const C=S+' .exp-menu-content';
  const css=`
    ${S}{box-sizing:border-box!important;padding:0!important;border:1px solid color-mix(in srgb,var(--theme-text) 18%,transparent)!important;border-radius:12px!important;background:var(--theme-bg)!important;background-image:none!important;box-shadow:0 16px 40px #0004!important;color:var(--theme-text)!important;font:400 13px/1.4 "Segoe UI",system-ui,sans-serif!important;text-align:start!important;letter-spacing:0!important;transition:none!important;overflow:hidden!important;max-height:calc(100dvh - 16px)!important;height:auto!important;flex-direction:column!important}
    ${S}.fl-rail-open:not([hidden]){display:flex!important}
    ${S} *{box-sizing:border-box}
    ${S} .menu-head{display:flex!important;align-items:center!important;gap:4px!important;width:100%!important;min-height:48px!important;margin:0!important;padding:2px 4px 2px 10px!important;border:0!important;border-bottom:1px solid color-mix(in srgb,var(--theme-text) 8%,transparent)!important;background:color-mix(in srgb,var(--theme-panel) 60%,var(--theme-bg))!important;flex:none!important}
    ${S} .header-brand{display:flex!important;align-items:center!important;gap:7px!important;flex:1!important;min-width:0!important}
    ${S} .header-icon{flex:0 0 24px!important;width:24px!important;height:26px!important;border:0!important;background:transparent!important;overflow:hidden!important}
    ${S} .header-icon .menu-icon{width:24px!important;height:26px!important;object-fit:contain!important}
    ${S} .header-copy{min-width:0!important;overflow:visible!important}
    ${S} .header-title-row{display:flex!important;align-items:center!important;gap:0!important;flex-wrap:wrap!important}
    ${S} :is(.header-title-row h2,[data-exp-part=title],#tdh-rail-title){margin:0!important;font-size:14px!important;font-weight:600!important;line-height:1.2!important}
    ${S} :is([data-exp-part=subtitle],#tdh-rail-subtitle,.header-divider,.exp-menu-tagline){display:none!important}
    ${S} .header-actions{display:flex!important;align-items:center!important;gap:0!important;flex:none!important}
    ${S} :is(.support-button,[data-exp-part=close],[data-exp-part=version],#tdh-header-version,#tdh-rail-close){display:grid!important;place-items:center!important;flex:none!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;margin:0!important;padding:0!important;border:0!important;border-radius:6px!important;background:transparent!important;color:var(--theme-text)!important;box-shadow:none!important}
    ${S} :is([data-exp-part=version],#tdh-header-version){position:relative!important;display:block!important;font-size:13px!important;line-height:1.4!important}
    ${S} .exp-changelog-icon{display:block;position:absolute;inset:0;margin:auto;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7}
    ${S} [data-exp-part=status]{font-size:12px!important;margin-top:2px!important}
    ${S}>nav{padding:0!important;margin:0!important}
    ${S} .exp-menu-workspace{display:grid!important;grid-template-columns:84px minmax(0,1fr)!important;align-items:stretch!important;min-width:0!important;min-height:var(--exp-menu-navigation-height,0px)!important;overflow:hidden!important;flex:1 1 auto!important}
    ${S} .exp-menu-rail{padding:4px!important;border-right:1px solid color-mix(in srgb,var(--theme-text) 7%,transparent)!important;background:color-mix(in srgb,var(--theme-panel) 82%,var(--theme-bg))!important;min-width:0!important;min-height:0!important;overflow:auto!important;overscroll-behavior:contain}
    ${S} .exp-section-tabs{display:flex!important;flex-direction:column!important;gap:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important}
    ${S} :is(.exp-section-tabs>[role=tab],.exp-menu-shortcuts>button){display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;width:100%!important;min-width:0!important;min-height:44px!important;padding:3px 2px!important;margin:0!important;text-align:center!important;white-space:normal!important;overflow-wrap:anywhere!important;font:500 12px/1.25 -apple-system,"Segoe UI",system-ui,sans-serif!important;border:0!important;border-radius:6px!important;background:transparent!important;color:var(--theme-text)!important;box-shadow:none!important}
    ${S} .exp-section-tabs>[aria-selected=true]{background:color-mix(in srgb,var(--theme-accent2) 22%,transparent)!important}
    ${S} .exp-section-icon{display:block!important;width:16px!important;height:16px!important;flex:none!important;transform:none!important;background:none!important;color:var(--theme-accent2)!important}
    ${S} .exp-section-icon svg{display:block;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7}
    ${S} .exp-section-tabs>[aria-selected=true] .exp-section-icon{color:var(--theme-text)!important}
    ${S} .exp-section-tab-label{display:block!important;overflow:visible!important;text-overflow:clip!important;white-space:normal!important}
    ${S} .exp-menu-shortcuts{gap:0!important;border:0!important;margin-top:8px!important;padding:0!important}
    ${C}{padding:4px 6px 6px!important;min-width:0!important;min-height:0!important;max-height:calc(100dvh - 72px)!important;overflow:auto!important;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--theme-text) 25%,transparent) transparent;background:var(--theme-bg)!important}
    ${C} .fl-tool-panel>.fl-tool-header{position:absolute!important;width:1px!important;height:1px!important;min-height:0!important;margin:-1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important}
    ${C} :is(.fl-tool-panel,.route-body,.fl-tool-body){padding:0!important;margin:0!important;border:0!important;border-radius:0!important;min-width:0!important;background:transparent!important;box-shadow:none!important}
    ${C} :is(.exp-settings-group,.section,.group,details){min-width:0!important;border:0!important;border-radius:8px!important;margin:0 0 6px!important;padding:0!important;background:color-mix(in srgb,var(--theme-panel) 91%,var(--theme-text) 3%)!important;box-shadow:none!important;overflow:hidden}
    ${C} :is(.row,.mini-row,.fl-switch,.setting-row){display:flex!important;align-items:center!important;min-width:0!important;min-height:26px!important;gap:4px!important;padding:2px 8px!important;margin:0!important;border:0!important;border-bottom:1px solid color-mix(in srgb,var(--theme-text) 8%,transparent)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;font-size:13px!important;line-height:1.4!important}
    ${C} :is(.row,.mini-row,.fl-switch,.setting-row):last-child{border-bottom:0!important}
    ${C} :is(.copy,.row-copy,.fl-switch-text,.setting-row>span,.mini-row>span){flex:1;min-width:0!important}
    ${C} :is(.label,.setting-label,.fl-switch-text,.copy>strong,.row-copy>strong,.mini-row>span,.row>span){font-size:13px!important;line-height:1.4!important;font-weight:400!important;white-space:normal!important;overflow-wrap:break-word!important}
    ${C} :is(.copy>.help,.row-copy>small,.row-help,.setting-help){display:none!important}
    ${C} :is(.row,.mini-row,.setting-row):has(>.exp-native-popup),${C} :is(.row,.mini-row,.setting-row):has(>input:not([type=range])){display:grid!important;grid-template-columns:minmax(0,1fr) fit-content(58%)!important;gap:4px!important}
    ${C} :is(button,input,select,textarea){font-family:inherit!important;font-size:13px!important;line-height:1.4!important;max-width:100%!important;min-width:0!important;color:var(--theme-text)!important;box-shadow:none!important}
    ${C} button:not([role=switch]),${C} :is(input:not([type=range]),textarea){min-height:26px!important;height:auto!important;margin:0!important;padding:2px 8px!important;border:1px solid color-mix(in srgb,var(--theme-text) 23%,transparent)!important;border-radius:6px!important;background:color-mix(in srgb,var(--theme-text) 7%,var(--theme-panel))!important;font-weight:400!important;white-space:normal!important;text-align:center!important}
    ${C} :is(input:not([type=range]),textarea){width:100%!important;text-align:start!important}
    ${C} button[role=switch]{position:relative!important;flex:0 0 34px!important;width:34px!important;min-width:34px!important;max-width:34px!important;height:24px!important;min-height:24px!important;max-height:24px!important;padding:0!important;border:0!important;border-radius:4px!important;background:transparent!important;box-shadow:none!important}
    ${C} button[role=switch]::before{content:'';position:absolute;inset:4px 1px;border:0!important;border-radius:4px!important;background:color-mix(in srgb,var(--theme-text) 18%,var(--theme-panel))!important}
    ${C} button[role=switch]::after{content:'';position:absolute!important;top:6px!important;left:3px!important;width:12px!important;height:12px!important;border:0!important;border-radius:2px!important;background:var(--theme-text)!important;transform:none!important}
    ${C} button[role=switch][aria-checked=true]::before{background:var(--theme-accent2)!important}
    ${C} button[role=switch][aria-checked=true]::after{left:19px!important;background:var(--theme-bg)!important}
    ${C} button[role=switch]>span{display:none!important}
    ${C} .exp-native-popup{position:relative!important;display:block!important;min-width:0!important;width:100%!important;max-width:100%!important;border-radius:6px!important;flex:none!important}
    ${C} .exp-native-popup>select{position:absolute!important;inset:0!important;opacity:0!important;width:100%!important;height:100%!important;min-height:0!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important;z-index:1;cursor:pointer}
    ${C} .exp-select-face{position:relative;display:block;align-content:center;min-height:26px;width:auto;padding:2px 22px 2px 4px;font-size:13px!important;line-height:1.4!important;white-space:normal!important;overflow-wrap:anywhere!important;color:var(--theme-text)!important;pointer-events:none}
    ${C} .exp-select-face::after{content:'';position:absolute;right:6px;top:calc(50% - 5px);width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg)}
    ${C} .exp-native-popup:focus-within{outline:2px solid var(--theme-focus,var(--theme-accent2));outline-offset:1px}
    ${C} .exp-native-popup:has(select:disabled){opacity:.45}
    ${C} option{background:var(--theme-panel)!important;color:var(--theme-text)!important}
    ${C} details>summary{display:flex!important;align-items:center!important;gap:4px!important;min-height:26px!important;padding:2px 8px!important;margin:0!important;font-size:13px!important;line-height:1.4!important;font-weight:500!important;list-style:none!important;color:var(--theme-text)!important;cursor:pointer}
    ${C} details>summary::-webkit-details-marker{display:none}
    ${C} details>summary::before{display:none!important}
    ${C} details>summary::after{content:'';width:6px;height:6px;flex:none;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);margin-left:auto}
    ${C} details[open]>summary::after{transform:rotate(45deg)}
    ${C} details[open]>summary{border-bottom:1px solid color-mix(in srgb,var(--theme-text) 8%,transparent)!important}
    ${C} details .exp-settings-group{margin:0!important;background:transparent!important}
    ${C} :is(.actions,.button-grid,.action-pair,.settings-transfer,.rc-menu-actions,.profile-actions){display:flex!important;gap:4px!important;flex-wrap:wrap!important;padding:4px 8px!important;margin:0!important}
    ${C} :is(.actions,.button-grid,.action-pair)>*{flex:1;min-width:0}
    ${C} :is(h2,h3){font-size:13px!important;line-height:1.4!important;margin:0!important;padding:8px 8px 2px!important;color:var(--theme-text)!important}
    ${C} :is(p,.empty,.note){font-size:13px!important;line-height:1.5!important;white-space:normal!important;overflow-wrap:anywhere!important;margin:6px 0!important;padding-inline:8px!important;color:var(--theme-text)!important}
    ${C} :is(form,.identity,.exp-health){padding:8px!important;gap:4px!important}
    ${C} form label:has(>.exp-native-popup){display:grid!important;grid-template-columns:minmax(0,1fr) fit-content(58%)!important;gap:4px!important;align-items:center!important}
    ${C} :is(.row,.mini-row,.setting-row):has(>input[type=number]){grid-template-columns:minmax(0,1fr) 64px!important}
    ${C} :is(.row,.mini-row,.setting-row):has(>input:not([type=number],[type=range],[type=time],[type=color],[hidden])){grid-template-columns:minmax(0,1fr)!important}
    ${C} .action-stack{flex-direction:column!important;align-items:stretch!important}
    ${C} .action-stack>*{width:100%!important}
    ${C} .exp-native-popup:has(select[data-exp-full-width]){width:100%!important}
    ${C} .queue-switches{display:block!important}
    ${C} [data-exp-system-item=support] .action-pair{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:4px!important;padding:4px 0!important}
    ${C} [data-exp-system-item=support] .action-pair>button{padding:2px 4px!important;overflow-wrap:normal!important;word-break:normal!important}
    ${C} [data-exp-system-report]{display:block!important;width:100%!important;text-align:center!important;justify-content:center!important}
    ${C} [data-exp-system-item=preferences]{margin-top:8px!important}
    ${C} [data-exp-system-item=reset]{margin-top:12px!important;padding-top:0!important}
    ${C} [data-exp-system-item=reset]>button{display:block!important;width:100%!important;min-height:32px!important;padding:4px 8px!important;background:#b4232a!important;color:#fff!important;border-color:#971b21!important}
    ${C} [data-exp-system-item=reset]>p:empty{display:none!important}
    ${C} .setting-row:has(>input[aria-label="Content width (px)"]),${C} .setting-row:has(select[aria-label=Names]){grid-template-columns:minmax(0,1fr) 56px!important}
    ${C} .setting-row:has(>input[aria-label="Content width (px)"]){padding-inline:4px!important}
    ${S} :is(button,input,select,textarea,summary):focus-visible{outline:2px solid var(--theme-focus,var(--theme-accent2))!important;outline-offset:2px!important}
    ${S} ::selection{background:var(--theme-accent)!important;color:var(--theme-text)!important}
    .exp-floating-update,.update-notice[data-placement="menu"]{max-height:calc(100dvh - 16px)!important;overflow:auto;overscroll-behavior:contain;background:var(--exp-notice-top,var(--theme-bg))!important;background-image:none!important;border-color:var(--exp-notice-border,var(--theme-muted))!important;border-radius:7px!important;box-shadow:0 4px 10px #0003!important;font-size:12px!important}
    .update-notice :is(.update-text,.update-list){overflow-wrap:anywhere;line-height:1.5}
    ${C} .row:has([data-exp-adapter-health=healthy]){display:none!important}
    ${S} [hidden]{display:none!important}
    @media(forced-colors:active){${S} :is(button,input,select,textarea,summary){forced-color-adjust:auto!important;border-color:ButtonText!important}${C} button[role=switch]::before{background:ButtonFace!important;border:1px solid ButtonText!important}${C} button[role=switch][aria-checked=true]::before{background:Highlight!important}${C} button[role=switch]::after{background:ButtonText!important}${C} [data-exp-system-item=reset]>button{background:ButtonFace!important;color:ButtonText!important}}
  `;
  const paths={gift:'M3 7h14v4H3Zm2 4v7h10v-7M10 7v11M10 7C4 7 4 1 7 2c3 0 3 5 3 5Zm0 0c6 0 6-6 3-5-3 0-3 5-3 5Z',system:'M3 5h14M3 10h14M3 15h14M7 3v4m6 1v4m-8 1v4',brush:'m4 15 9-11 3 3-9 10H3v-3',shield:'M10 2 3 5v5c0 4 7 8 7 8s7-4 7-8V5Z',bag:'M4 6h12v12H4ZM7 6V4a3 3 0 0 1 6 0v2',sparkle:'m10 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z',feed:'M3 3h14v14H3ZM6 6h8M6 10h8m-8 4h5',read:'M3 3h6l1 2 1-2h6v14h-6l-1 1-1-1H3Zm7 2v13',filter:'M3 4h14l-5 6v7l-4-2v-5Z',people:'M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 8v-3a5 5 0 0 1 10 0v3m1-9a3 3 0 0 0 0-6m1 9a4 4 0 0 1 4 4v2'};
  const iconFor={campaigns:'gift',drops:'gift',settings:'system',look:'brush',appearance:'brush',system:'system',protect:'shield',protection:'shield',amazon:'bag',highlights:'sparkle',feed:'feed',read:'read',filters:'filter',people:'people'};
  function mount({panel}){
    const doc=panel.ownerDocument,view=doc.defaultView,wrapped=new Map(),groups=new Set(),moves=[];
    let frame=0;
    // Keep the whole rail visible when there is room; short windows still scroll it.
    // Dropper's original progress card contributes to chrome height instead of being moved or hidden.
    function measure(){frame=0;if(!panel.getClientRects().length)return;const workspace=panel.querySelector('.exp-menu-workspace');if(!workspace)return;const tabs=[...panel.querySelectorAll('.exp-section-tabs>[role=tab]')],natural=tabs.reduce((h,n)=>h+n.getBoundingClientRect().height,8);const children=[...panel.children].filter(n=>n.getClientRects().length&&!['absolute','fixed'].includes(view.getComputedStyle(n).position));const chrome=children.filter(n=>!n.contains(workspace)).reduce((h,n)=>{const s=view.getComputedStyle(n);return h+n.getBoundingClientRect().height+(parseFloat(s.marginTop)||0)+(parseFloat(s.marginBottom)||0);},0)+(parseFloat(view.getComputedStyle(panel).rowGap)||0)*Math.max(0,children.length-1);const value=Math.min(natural,Math.max(0,view.innerHeight-chrome-18))+'px';if(panel.style.getPropertyValue('--exp-menu-navigation-height')!==value)panel.style.setProperty('--exp-menu-navigation-height',value);}
    const queueMeasure=()=>{if(!frame)frame=view.requestAnimationFrame(measure);};
    const updateFace=select=>{const face=wrapped.get(select)?.face;if(face){const original=select.selectedOptions[0]?.textContent||'',text=({Automatic:'Auto','Follow system':'System','Inherit global':'Global','Original text':'Original','Announce on focus':'On focus','Follow campaign order':'Campaign order','Keep an earning stream':'Keep earning','Manual stream protected':'Manual hold'})[original]||original;if(face.textContent!==text)face.textContent=text;}};
    function decorate(){
      const version=panel.querySelector('[data-exp-part=version],#tdh-header-version'),actions=panel.querySelector('.header-actions');
      if(version&&!/changelog/i.test(version.getAttribute('aria-label')||'')){const name=panel.querySelector('[data-exp-part=title],#tdh-rail-title')?.textContent.trim()||'';version.setAttribute('aria-label',('View '+name+' '+version.textContent.trim()+' Changelog').trim());}
      if(version&&actions&&!actions.contains(version)){moves.push([version,version.parentNode,version.nextSibling]);actions.prepend(version);}
      if(version&&actions&&actions.firstElementChild!==version)actions.prepend(version);
      if(version)for(const node of [...version.childNodes])if(node.nodeType===3&&node.textContent.trim()){const label=doc.createElement('span');label.hidden=true;label.dataset.expVersionLabel='1';node.before(label);label.append(node);}
      if(version&&!version.querySelector('.exp-changelog-icon')){const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),p=doc.createElementNS('http://www.w3.org/2000/svg','path');svg.classList.add('exp-changelog-icon');svg.setAttribute('viewBox','0 0 20 20');svg.setAttribute('aria-hidden','true');p.setAttribute('d','M4 3h12v14H4ZM7 7h6m-6 3h6m-6 3h4');svg.append(p);version.prepend(svg);}
      for(const tab of panel.querySelectorAll('.exp-section-tabs>[role=tab]')){
        if(tab.querySelector('[data-exp-layout-icon]'))continue;const name=iconFor[(tab.getAttribute('aria-label')||tab.textContent).trim().toLowerCase()]||'system';
        const span=tab.querySelector('.exp-section-icon')||doc.createElement('span'),svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),p=doc.createElementNS('http://www.w3.org/2000/svg','path');span.className='exp-section-icon';span.setAttribute('aria-hidden','true');span.dataset.expLayoutIcon='1';svg.setAttribute('viewBox','0 0 20 20');p.setAttribute('d',paths[name]);p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');svg.append(p);span.replaceChildren(svg);if(!tab.contains(span))tab.prepend(span);
      }
      const content=panel.querySelector('.exp-menu-content');if(!content)return;
      for(const select of content.querySelectorAll('select')){
        if(!wrapped.has(select)){const focused=select.getRootNode().activeElement===select,wrap=doc.createElement('span'),face=doc.createElement('span');wrap.className='exp-native-popup';face.className='exp-select-face';face.setAttribute('aria-hidden','true');select.before(wrap);wrap.append(select,face);wrapped.set(select,{wrap,face});if(focused)select.focus({preventScroll:true});}updateFace(select);
      }
      for(const [select]of wrapped)if(!panel.contains(select))wrapped.delete(select);
      const rowSelector='.row,.mini-row,.fl-switch,.setting-row';
      const parents=new Set([...content.querySelectorAll(rowSelector)].map(n=>n.parentElement));
      for(const parent of parents){if(parent.classList.contains('exp-settings-group'))continue;let group=null;for(const child of [...parent.children]){if(child.matches(rowSelector)){const focused=panel.getRootNode().activeElement;if(!group){group=doc.createElement('div');group.className='exp-settings-group';child.before(group);groups.add(group);}group.append(child);if(focused&&child.contains(focused))focused.focus({preventScroll:true});}else group=null;}}
      for(const group of groups)if(!panel.contains(group))groups.delete(group);
      queueMeasure();
    }
    const changed=e=>{if(e.target.tagName==='SELECT')updateFace(e.target);};panel.addEventListener('change',changed);panel.addEventListener('input',changed);
    decorate();const observer=new view.MutationObserver(decorate);observer.observe(panel,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected']});const resize=new view.ResizeObserver(queueMeasure);resize.observe(panel);view.addEventListener('resize',queueMeasure);
    return()=>{observer.disconnect();resize.disconnect();view.cancelAnimationFrame(frame);view.removeEventListener('resize',queueMeasure);panel.style.removeProperty('--exp-menu-navigation-height');panel.removeEventListener('change',changed);panel.removeEventListener('input',changed);for(const [select,{wrap}]of wrapped){if(wrap.contains(select))wrap.replaceWith(select);}for(const group of groups)group.replaceWith(...group.childNodes);for(const [node,parent,next]of moves)if(parent.isConnected)parent.insertBefore(node,next?.parentNode===parent?next:null);};
  }
  return Object.freeze({css,mount});
})();
