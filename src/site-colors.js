/* Optional page colours for a product's own site. Core owns the palette list, the Site colors control
   and one scoped style per product; each product maps the palette tokens onto its site's own surfaces. */
const ExpSiteColors = (() => {
  const base=Object.freeze({
    dark:{bg:'#18181b',panel:'#202024',raised:'#2b2b31',inset:'#111114',line:'#85858f',text:'#f4f4f6',muted:'#b9b9c3',onAccent:'#111114'},
    light:{bg:'#f4f4f6',panel:'#ffffff',raised:'#e9e9ee',inset:'#ededf1',line:'#777780',text:'#202024',muted:'#555560',onAccent:'#ffffff'},
  });
  // [id, name, dark accent, light accent, dark surfaces bg/panel/raised/inset, light surfaces bg/panel/raised/inset]
  const table=[
    ['default','Default','#c4c4cc','#50505c'],
    ['indigo','Indigo','#b4a2ff','#5943b6',['#171222','#241c36','#34284a','#0f0b18'],['#eee8f7','#faf7ff','#e1d8ef','#e5ddf1']],
    ['blue','Blue','#82b9ff','#155cad',['#0b1420','#132337','#1e324a','#070e18'],['#e7f0fb','#f6faff','#d7e6f7','#dce8f6']],
    ['green','Green','#85c99e','#216b3c',['#0e1913','#162a1e','#203b2a','#07100b'],['#e8f3eb','#f5fcf7','#d5e8dc','#dcece2']],
    ['red','Red','#f6a0a0','#a52b35',['#201214','#321d22','#452931','#160b0f'],['#f8eaec','#fff7f8','#f0d9df','#f1dfe4']],
    ['gray','Gray','#aeb3b9','#4f5964',['#181a1c','#22262a','#30363b','#111315'],['#eceff1','#fafbfc','#dce2e6','#e1e6ea']],
  ];
  const surfaces=values=>values?{bg:values[0],panel:values[1],raised:values[2],inset:values[3]}:{};
  const sitePalettes=Object.freeze(table.map(([id,name,darkAccent,lightAccent,dark,light])=>Object.freeze({id,name,
    dark:Object.freeze({...base.dark,...surfaces(dark),accent:darkAccent}),light:Object.freeze({...base.light,...surfaces(light),accent:lightAccent})})));
  function sitePalette(id,mode='dark',extra=[]){const palette=[...extra,...sitePalettes].find(item=>item.id===id);return palette?{id:palette.id,name:palette.name,mode:mode==='light'?'light':'dark',...palette[mode==='light'?'light':'dark']}:null;}
  const systemMode=()=>matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
  function watchSystem(callback){const query=matchMedia('(prefers-color-scheme: light)');query.addEventListener('change',callback);return ()=>query.removeEventListener('change',callback);}
  // mode() reads the site's current light/dark state; watch(callback) reports changes and returns a disposer.
  // Products with manager style grants can supply their lifecycle's CSP-aware injector.
  function createSiteColors({product,css,mode=systemMode,watch=watchSystem,extra=[],inject}){
    const attribute='data-exp-site-colors',scope=`html[${attribute}="${product}"]`,id='exp-site-colors-'+product;
    let current='off',stopWatching=null,style=null;
    function render(){
      const palette=sitePalette(current,mode(),extra);if(!palette)return clear();
      const text=css(palette,scope);
      if(!style?.isConnected){
        style?.remove();
        style=document.getElementById(id)||(inject?inject(text,{expSiteColors:product}):document.createElement('style'));
        style.id=id;style.dataset.expOwned='1';style.dataset.expSiteColors=product;
        if(!style.isConnected)(document.head||document.documentElement).append(style);
      }
      if(style.textContent!==text)style.textContent=text;
      if(document.documentElement.getAttribute(attribute)!==product)document.documentElement.setAttribute(attribute,product);
      document.documentElement.dataset.expSitePalette=palette.id+'-'+palette.mode;
    }
    function apply(next){current=next||'off';if(!sitePalette(current,'dark',extra))return clear();stopWatching??=watch(render);render();}
    function clear(){current='off';stopWatching?.();stopWatching=null;style?.remove();document.getElementById(id)?.remove();style=null;
      if(document.documentElement.getAttribute(attribute)===product){document.documentElement.removeAttribute(attribute);delete document.documentElement.dataset.expSitePalette;}}
    return Object.freeze({apply,clear,refresh:()=>{if(current!=='off')render();},palette:()=>sitePalette(current,mode(),extra)});
  }
  function createSiteColorControl({value='off',onChange,offLabel='Site default',extra=[],help='Recolor this site’s pages with a palette. Follows the site’s light or dark mode. Menus keep their own theme.'}){
    const row=document.createElement('label');row.className='row exp-site-colors';const copy=document.createElement('span');copy.className='copy';
    const title=document.createElement('strong');title.textContent='Site colors';ExpMenuHelp.setMenuHelp(title,help);copy.append(title);
    const select=document.createElement('select');select.setAttribute('aria-label','Site colors');select.dataset.expSiteColorsSelect='1';
    for(const [id,name] of [['off',offLabel],...[...extra,...sitePalettes].map(item=>[item.id,item.name])]){const option=document.createElement('option');option.value=id;option.textContent=name;select.append(option);}
    select.value=sitePalette(value,'dark',extra)?value:'off';select.addEventListener('change',()=>onChange?.(select.value));row.append(copy,select);return row;
  }
  return Object.freeze({sitePalettes,sitePalette,createSiteColors,createSiteColorControl});
})();
