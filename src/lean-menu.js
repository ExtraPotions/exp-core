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
  const css = ExpMenuLayout.css;
  // Healthy operation needs no narration; abnormal state remains visible in the open menu.
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
    const style=document.createElement('style');style.dataset.expLeanMenu='1';style.textContent=css;shadow.append(style);const disposeLayout=ExpMenuLayout.mount({panel});
    const status=document.createElement('div');status.dataset.expPart='status';status.setAttribute('role','status');
    const dot=document.createElement('span');dot.className='exp-status-dot';const statusText=document.createElement('span');statusText.className='exp-status-text';status.append(dot,statusText);
    let statusTicket=0,statusTimer=0;
    async function refreshStatus(){
      const source=statusSources.get(id);
      if(!source){delete panel.dataset.expMenuStatus;status.remove();return;}
      const copy=panel.querySelector('.header-copy');
      if(!copy){delete panel.dataset.expMenuStatus;status.remove();return;}
      if(!copy.contains(status))copy.append(status);
      if(panel.dataset.expMenuStatus!=='1')panel.dataset.expMenuStatus='1';const ticket=++statusTicket;
      let value=null;try{value=await source();}catch{}
      if(ticket!==statusTicket)return;
      const health=ExpHealthSummary.normalizeHealth(value);
      status.hidden=health.state==='working'||(id==='dropper'&&health.state==='waiting');
      status.setAttribute('aria-description',health.reason);
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
    return ()=>{disposeLayout();visibility.disconnect();visibilityResize.disconnect();clearInterval(statusTimer);statusPanels.get(id)?.delete(refreshStatus);status.remove();delete panel.dataset.expMenuStatus;themeObserver.disconnect();observer.disconnect();icons.forEach(icon=>icon.remove());style.remove();for(const[key,[value,priority]]of saved){if(value)panel.style.setProperty(key,value,priority);else panel.style.removeProperty(key);}delete panel.dataset.expMenuLayout;delete panel.dataset.expMenuTemplate;};
  }
  return Object.freeze({mount,setMenuStatus,template});
})();
