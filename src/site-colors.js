// Slate Blue site paint shares the menu palette and device-mode resolver.
const ExpSiteColors = (() => {
  const {THEME_MODES,normalizeThemeMode,resolveTheme}=CoreFoundation;
  const sitePalettes=Object.freeze(THEME_MODES.map(id=>Object.freeze({id,name:id[0].toUpperCase()+id.slice(1)})));
  const sitePalette = id => resolveTheme(id);
  function watchSystem(callback){const query=matchMedia('(prefers-color-scheme: dark)');query.addEventListener('change',callback);return ()=>query.removeEventListener('change',callback);}
  function createSiteColors({product,css,inject}){
    const attribute='data-exp-site-colors',scope=`html[${attribute}="${product}"]`,id='exp-site-colors-'+product;
    let current='system',active=false,stopWatching=null,style=null;
    function render(){
      if(!active)return;
      const palette=resolveTheme(current),text=css(palette,scope);
      if(!style?.isConnected){
        style?.remove();
        style=document.getElementById(id)||(inject?inject(text,{expSiteColors:product}):document.createElement('style'));
        style.id=id;style.dataset.expOwned='1';style.dataset.expSiteColors=product;
        if(!style.isConnected)(document.head||document.documentElement).append(style);
      }
      if(style.textContent!==text)style.textContent=text;
      if(document.documentElement.getAttribute(attribute)!==product)document.documentElement.setAttribute(attribute,product);
      document.documentElement.dataset.expSitePalette='slate-blue-'+palette.mode;
    }
    function apply(next){current=normalizeThemeMode(next);active=true;stopWatching??=watchSystem(()=>{if(current==='system')render();});render();}
    function clear(){active=false;stopWatching?.();stopWatching=null;style?.remove();document.getElementById(id)?.remove();style=null;
      if(document.documentElement.getAttribute(attribute)===product){document.documentElement.removeAttribute(attribute);delete document.documentElement.dataset.expSitePalette;}}
    return Object.freeze({apply,clear,refresh:render,palette:()=>active?resolveTheme(current):null});
  }
  function createThemeModeControl({value='system',onChange,label='Menu theme'}){
    const row=document.createElement('label');row.className='row exp-site-colors';const copy=document.createElement('span');copy.className='copy';
    const title=document.createElement('strong');title.textContent=label;copy.append(title);
    const select=document.createElement('select');select.setAttribute('aria-label',label);select.dataset.expThemeMode='1';
    if(label==='Site theme')select.dataset.expSiteColorsSelect='1';
    for(const {id,name} of sitePalettes){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);}
    ExpMenuHelp.setMenuHelp(select,'Light and Dark use Slate Blue. System follows your device’s appearance.');
    select.value=normalizeThemeMode(value);select.addEventListener('change',()=>onChange?.(select.value));row.append(copy,select);return row;
  }
  const createSiteColorControl = options => createThemeModeControl({...options,label:'Site theme'});
  return Object.freeze({sitePalettes,sitePalette,createSiteColors,createSiteColorControl,createThemeModeControl,normalizeThemeMode,resolveTheme});
})();
