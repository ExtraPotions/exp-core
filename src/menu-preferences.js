/* Same-origin preferences for product-owned menu surfaces only. */
const ExpMenuPreferences = (() => {
  const key='exp:suite:menu-size',eventName='exp-core:menu-size';
  const sizes=Object.freeze({standard:{body:14,small:12,width:364},large:{body:16,small:14,width:416},'extra-large':{body:18,small:16,width:468}});
  let memory='standard';
  const valid=value=>Object.hasOwn(sizes,value)?value:'standard';
  function menuSizePreference(){try {const stored=localStorage.getItem(key);memory=valid(stored);}catch {}return memory;}
  function setMenuSizePreference(size){memory=valid(size);try{localStorage.setItem(key,memory);}catch{}document.dispatchEvent(new CustomEvent(eventName,{detail:memory}));return memory;}
  function bindMenuSize({host,shadow,panel,onLayout=()=>{}}){
    const disposeTypography=ExpMenuTypography.mount({shadow,panel});
    function apply(size){
      memory=valid(size);const value=sizes[memory];host.dataset.expMenuSize=memory;
      host.style.setProperty('--exp-font-size-body',value.body+'px');host.style.setProperty('--exp-font-size-small',value.small+'px');host.style.setProperty('--exp-menu-width',value.width+'px');
      for(const select of shadow.querySelectorAll('[data-exp-menu-size-select]'))select.value=memory;
      onLayout();
    }
    const changed=event=>apply(event.detail),storage=event=>{if(event.key===key||event.key===null)apply(menuSizePreference());};
    document.addEventListener(eventName,changed);addEventListener('storage',storage);apply(menuSizePreference());
    return ()=>{document.removeEventListener(eventName,changed);removeEventListener('storage',storage);disposeTypography();};
  }
  function createMenuSizeControls(){
    const row=document.createElement('label');row.className='row exp-menu-size';const copy=document.createElement('span');copy.className='copy';
    const title=document.createElement('strong');title.textContent='Menu size';const help=document.createElement('small');help.className='help';help.textContent='Text and controls for ExtraPotions menus on this site.';copy.append(title,help);
    const select=document.createElement('select');select.setAttribute('aria-label','Menu size');select.dataset.expMenuSizeSelect='1';
    for(const [value,label] of [['standard','Standard'],['large','Large'],['extra-large','Extra Large']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
    select.value=menuSizePreference();select.addEventListener('change',()=>setMenuSizePreference(select.value));row.append(copy,select);return row;
  }
  return Object.freeze({menuSizePreference,setMenuSizePreference,bindMenuSize,createMenuSizeControls,menuSizeTokens:()=>sizes[menuSizePreference()]});
})();
