// Shared, local-only compatibility controls.
const ExtraPotionsTools = (() => {
  const PRODUCT_ROOT_IDS = __EXP_SUITE_ROOT_IDS__;
  function placeDonationPanel(panel, trigger){
    trigger.closest('.menu-head,header')?.after(panel);
    panel.style.cssText='position:static!important;width:100%!important;max-width:100%!important;margin:7px 0;box-shadow:none';
  }
  function createBitcoinDonation(){
    const address='bc1qg4xq63mwu63qc5dnqugk3qtxvulv5p3frjayna8ey8tu8ey4wpxsg92hv3';
    const details=document.createElement('details');details.className='exp-bitcoin-donation';details.style.cssText='margin-top:7px;min-width:0';
    const summary=document.createElement('summary');summary.textContent='₿ Bitcoin';summary.style.cssText='cursor:pointer;font-weight:700;padding:6px;border:1px solid var(--theme-line);border-radius:7px';
    const code=document.createElement('code');code.textContent=address;code.setAttribute('aria-label','Bitcoin donation address');code.style.cssText='display:block;overflow-wrap:anywhere;word-break:break-all;user-select:all;margin:7px 0;font-size:var(--exp-font-size-body,13px);line-height:1.4';
    const status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='margin:5px 0 0;font-size:var(--exp-font-size-small,11px)';
    const copy=button('Copy Bitcoin address',async()=>{try{await navigator.clipboard.writeText(address);status.textContent='Bitcoin address copied.';}catch{status.textContent='Select and copy the address above.';}});copy.style.cssText='width:100%;min-width:0;white-space:normal;border-radius:7px';
    const wallet=document.createElement('a');wallet.href='bitcoin:'+address;wallet.textContent='Open Bitcoin wallet';
    details.append(summary,code,copy,wallet,status);return details;
  }
  function compatibilitySnapshot(){
    const rows=[];const warnings=[];const versions=new Set();
    for(const [id,rootId] of Object.entries(PRODUCT_ROOT_IDS)){
      const markers=[...document.querySelectorAll('[data-exp-diagnostics-product]')].filter(n=>n.dataset.expDiagnosticsProduct===id);
      if(!markers.length)continue;
      const productVersions=[...new Set(markers.map(n=>n.dataset.expProductVersion||'unknown'))];
      const host=document.getElementById(rootId);
      const core=host?.dataset.coreVersion||null;if(core)versions.add(core);
      rows.push({id,versions:productVersions,core,instances:markers.length});
      if(markers.length>1)warnings.push(`More than one ${id.toUpperCase()} instance is active.`);
    }
    if(versions.size>1)warnings.push('Different core versions are active. Update the products and reload this page.');
    return {products:rows,warnings};
  }
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='life-btn action';b.textContent=label;b.addEventListener('click',fn);return b;};
  function card(title){const d=document.createElement('details');d.className='exp-tools-card';d.style.cssText='border:1px solid var(--theme-line,var(--line,#777));border-radius:7px;padding:7px;margin-top:8px';const s=document.createElement('summary');s.textContent=title;d.append(s);return d;}
  function createCompatibilityControls(){const d=card('Product compatibility'),out=document.createElement('div');out.setAttribute('aria-live','polite');function refresh(){out.replaceChildren();const value=compatibilitySnapshot();for(const p of value.products){const line=document.createElement('p');line.textContent=`${p.id.toUpperCase()} ${p.versions.join(', ')} · ${p.core?'core '+p.core:'native product UI'}`;out.append(line);}const status=document.createElement('p');status.textContent=value.warnings.join(' ')||'No mixed core versions or duplicate instances detected on this page.';out.append(status);const note=document.createElement('small');note.textContent='Only products running on this page are visible. This is not an online update check.';out.append(note);}d.addEventListener('toggle',()=>{if(d.open)refresh();});d.append(out,button('Refresh compatibility',refresh));return d;}
  function createSuiteSiteControls(){
    const d=card('Site control'),out=document.createElement('div');out.setAttribute('aria-live','polite');
    const toggle=document.createElement('button');toggle.type='button';toggle.className='switch';toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Pause all ExtraPotions products on this site');toggle.append(document.createElement('span'));
    const row=document.createElement('div');row.className='row';const copy=document.createElement('div');copy.className='copy';const label=document.createElement('strong');label.textContent='Pause all on this site';const help=document.createElement('small');help.className='help';help.textContent='Stops page changes from every active ExtraPotions product while keeping launchers and System recovery menus available.';copy.append(label,help);row.append(copy,toggle);
    function refresh(){const core=ExtraPotionsCore;const paused=Boolean(core.suiteSitePaused());toggle.setAttribute('aria-checked',String(paused));out.replaceChildren();const status=document.createElement('p');status.textContent=paused?'ExtraPotions page features are paused on this site.':'ExtraPotions page features are active on this site.';out.append(status);for(const product of core.suiteSnapshot().products){const line=document.createElement('p'),state=core.latestSuiteState(product.id)?.state;line.textContent=`${product.id.toUpperCase()} · ${paused?'Site paused':state?.status|| (state?.active===false?'Inactive':'Active')}`;out.append(line);}}
    toggle.addEventListener('click',()=>{const core=ExtraPotionsCore;core.setSuiteSitePaused(!core.suiteSitePaused());refresh();});
    const duration=document.createElement('select');duration.setAttribute('aria-label','Temporary suite pause duration');for(const [value,label] of [['15','15 minutes'],['60','1 hour'],['240','4 hours']]){const option=document.createElement('option');option.value=value;option.textContent=label;duration.append(option);}const temporary=button('Pause temporarily',()=>{ExtraPotionsCore.setSuiteSitePaused(true,location.hostname,Number(duration.value));refresh();});
    d.addEventListener('toggle',()=>{if(d.open)refresh();});d.append(row,duration,temporary,out);refresh();return d;
  }
  const productRepositories = Object.freeze({dropper:'Dropper',shift:'SHIFT',prisma:'PRISMA',ward:'WARD'});
  function productIssueUrl(id, version) {
    if (!Object.hasOwn(productRepositories,id)) throw new Error('Unknown product');
    const product=productRepositories[id];
    const safeVersion=/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(String(version))?String(version):'unknown';
    // Exclude diagnostics, page URLs, account names, and free-form data.
    const body=`Product: ${product} v${safeVersion}\n\nWhat happened?\n\nSteps to reproduce\n1. \n\nExpected behavior\n\nActual behavior\n\nBrowser and userscript manager\n\nDiagnostics (optional)\nReview Show Diagnostics and remove private information before attaching.\n`;
    return 'https://github.com/ExtraPotions/'+product+'/issues/new?title='+encodeURIComponent('['+product+' '+safeVersion+'] Issue')+'&body='+encodeURIComponent(body);
  }
  const productTimelines=new Map(),resettingProducts=new Set();
  const productDataResetting=id=>resettingProducts.has(id);
  function clearProductData(id, {legacyKeys=[]} = {}) {
    if (!Object.hasOwn(productRepositories,id)) throw new Error('Unknown product');
    resettingProducts.add(id);
    try {
    const owns=key=>key.startsWith(`exp:v3:${id}:`)||legacyKeys.some(base=>key===base||key.startsWith(base+':account:'));
    const known=new Set([`exp:v3:${id}:settings`,`exp:v3:${id}:update-cache`,`exp:v3:${id}:installed-version`,`exp:v3:${id}:last-version-v2`,...legacyKeys]);
    for(const storageName of ['localStorage','sessionStorage']) {
      let storage;try{storage=globalThis[storageName];}catch{throw new Error('Could not access product storage.');}if(!storage)continue;
      for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key&&owns(key))known.add(key);}
      for(const key of known) { try{storage.removeItem(key);}catch{throw new Error('Could not clear '+id+' data. Check browser storage permissions.');} }
    }
    try{if(typeof GM_listValues==='function')for(const key of GM_listValues())if(owns(key))known.add(key);}catch{throw new Error('Could not list product storage.');}
    for(const key of known){if(typeof GM_deleteValue==='function')GM_deleteValue(key);else if(typeof GM_setValue==='function')GM_setValue(key,undefined);}
    productTimelines.delete(id);
    return [...known];
    } catch(error){resettingProducts.delete(id);throw error;}
  }
  function createProductTimeline(id,getHealth,notify=()=>{}) {
    if(!Object.hasOwn(productRepositories,id))throw new Error('Unknown product');
    const rows=document.createElement('div');rows.dataset.expProductTimeline='1';
    let disposed=false;
    function render(){rows.replaceChildren();for(const entry of (productTimelines.get(id)||[]).slice().reverse()){
      const line=document.createElement('p');line.textContent=new Date(entry.at).toLocaleTimeString()+' · '+entry.state+' · '+entry.reason;
      line.style.cssText='margin:6px 0;overflow-wrap:anywhere';rows.append(line);
    }}
    async function observedHealth(){const value=await getHealth();if(!disposed){
      const history=productTimelines.get(id)||[];
      const state=String(value?.state||'waiting').slice(0,30),reason=String(value?.reason||'Status unavailable.').replace(/https?:\/\/\S+/gi,'[page]').slice(0,500),last=history.at(-1);
      if(!last||last.state!==state||last.reason!==reason){history.push({at:Date.now(),state,reason});if(history.length>30)history.shift();productTimelines.set(id,history);}
      render();
    }return value;}
    const health=ExtraPotionsCore.createHealthControls(observedHealth,notify);
    const timeline=ExtraPotionsCore.createDisclosure(id==='dropper'?'Dropper Status':'Product Timeline',health.element,rows);
    timeline.addEventListener('toggle',()=>{if(timeline.open)health.refresh();});
    return {element:timeline,dispose(){disposed=true;health.dispose();},refresh:health.refresh};
  }
  function createProductSystem({id,version,timeline,diagnostics,preferences,onReset,notify=()=>{}}) {
    if(!Object.hasOwn(productRepositories,id))throw new Error('Unknown product');
    const system=document.createElement('div');system.dataset.expProductSystem=id;
    system.style.cssText='display:grid;grid-template-columns:minmax(0,1fr);gap:8px;min-width:0;max-width:100%;overflow-wrap:anywhere';
    const issue=button('Create GitHub Issue',()=>{const link=document.createElement('a');link.href=productIssueUrl(id,version);link.target='_blank';link.rel='noopener noreferrer';link.click();});
    issue.style.cssText='width:100%;min-width:0;white-space:normal;border-radius:7px';
    const reset=button('Reset All Settings',async()=>{
      if(!confirm(`Reset all ${productRepositories[id]} settings and stored product data?`))return;
      if(!confirm(`Confirm permanent reset of ${productRepositories[id]} data. This cannot be undone.`))return;
      reset.disabled=true;
      try{await onReset();notify(productRepositories[id]+' reset complete.');}catch{notify('Reset did not complete. Check storage permissions and try again.');}finally{reset.disabled=false;}
    });
    reset.style.cssText='width:100%;min-width:0;white-space:normal;border:1px solid #ff2438;border-radius:7px;background:#e11428;color:#fff;font-weight:700';
    for(const [key,node] of [['timeline',timeline],['diagnostics',diagnostics],['issue',issue],['preferences',preferences],['reset',reset]]){node.dataset.expSystemItem=key;node.style.minWidth='0';node.style.maxWidth='100%';const summary=node.tagName==='DETAILS'?node.querySelector(':scope > summary'):null;if(summary)summary.style.cssText+=';min-height:28px;padding:4px 0;box-sizing:border-box;cursor:pointer';system.append(node);}
    return system;
  }
  return Object.freeze({productIssueUrl,productDataResetting,clearProductData,createProductTimeline,createProductSystem,placeDonationPanel,createBitcoinDonation,compatibilitySnapshot,createCompatibilityControls,createSuiteSiteControls});
})();
