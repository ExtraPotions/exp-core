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
  // GitHub prefills an issue from the link; longer links fail, so a large report goes by clipboard.
  const ISSUE_URL_LIMIT=8000;
  function productIssueUrl(id, version, {health,diagnostics,copied=false}={}) {
    if (!Object.hasOwn(productRepositories,id)) throw new Error('Unknown product');
    const product=productRepositories[id];
    const safeVersion=/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(String(version))?String(version):'unknown';
    // Status is the product's own plain-language health text with links and addresses removed.
    // Diagnostics are the product's own redacted report, attached only when the person reports.
    const plain=value=>String(value||'').replace(/https?:\/\/\S+/gi,'[link]').replace(/\S+@\S+/g,'[address]').replace(/\s+/g,' ').trim().slice(0,200);
    const status=health&&plain(health.label)?`\nStatus: ${plain(health.label)}${plain(health.reason)?' - '+plain(health.reason):''}\n`:'';
    const template=`Product: ${product} v${safeVersion}\n${status}\nWhat happened?\n\nSteps to reproduce\n1. \n\nExpected behavior\n\nActual behavior\n\nBrowser and userscript manager\n\n`;
    const link=body=>'https://github.com/ExtraPotions/'+product+'/issues/new?title='+encodeURIComponent('['+product+' '+safeVersion+'] Issue')+'&body='+encodeURIComponent(body);
    if(diagnostics&&typeof diagnostics==='object'){
      const review='Diagnostics (review and remove anything private before submitting)\n';
      for(const text of [JSON.stringify(diagnostics,null,2),JSON.stringify(diagnostics)]){const url=link(template+review+'```json\n'+text+'\n```\n');if(url.length<=ISSUE_URL_LIMIT)return url;}
      return link(template+review+(copied?'The diagnostics were copied to your clipboard when you selected Report a Problem. Paste them here.\n':'The diagnostics are too long for the link. Select Copy Diagnostics and paste them here.\n'));
    }
    return link(template+'Diagnostics (optional)\nSelect Copy Diagnostics, paste them here, and remove anything private.\n');
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
  // Groups consecutive entries that share a key, keeping the newest time and a count.
  function groupTimelineEntries(entries,key=entry=>entry.reason){
    const groups=[];for(const entry of entries||[]){const k=key(entry),last=groups.at(-1);
      if(last&&last.key===k){last.count++;last.at=Math.max(last.at,Number(entry.at)||0);}else groups.push({...entry,key:k,count:1,at:Number(entry.at)||0});}
    return groups;
  }
  function createProductTimeline(id,getHealth,notify=()=>{},{layout='classic'}={}) {
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
    if(layout==='grouped'){
      // Status stays open so its recovery action is visible; history is one tap away.
      const activity=document.createElement('div');activity.dataset.expProductActivity='1';
      const log=ExtraPotionsCore.createDisclosure('Recent activity',activity,rows);log.dataset.expSystemActivity='1';
      const status=ExtraPotionsCore.createDisclosure('Status',health.element,log);status.open=true;
      status.addEventListener('toggle',()=>{if(status.open)health.refresh();});
      log.addEventListener('toggle',()=>{if(log.open)health.refresh();});
      return {element:status,activity,log,dispose(){disposed=true;health.dispose();},refresh:health.refresh};
    }
    const timeline=ExtraPotionsCore.createDisclosure(id==='dropper'?'Dropper Status':'Product Timeline',health.element,rows);
    timeline.addEventListener('toggle',()=>{if(timeline.open)health.refresh();});
    return {element:timeline,dispose(){disposed=true;health.dispose();},refresh:health.refresh};
  }
  const RESET_ARM_MS=4000;
  function groupedProductSystem({id,version,timeline,diagnostics,preferences,onReset,notify}) {
    const product=productRepositories[id];
    const system=document.createElement('div');system.dataset.expProductSystem=id;system.dataset.expSystemLayout='grouped';
    system.style.cssText='display:grid;grid-template-columns:minmax(0,1fr);gap:8px;min-width:0;max-width:100%;overflow-wrap:anywhere';
    const wide=node=>{node.style.cssText+=';width:100%;min-width:0;white-space:normal;border-radius:7px';return node;};
    const note=text=>{const p=document.createElement('p');p.textContent=text;p.style.cssText='margin:6px 0;font-size:var(--exp-font-size-small,11px);line-height:1.4';return p;};
    // Support: Copy is the everyday action; Show stays available for review.
    const pair=diagnostics.querySelector?.('.action-pair'),buttons=pair?[...pair.querySelectorAll(':scope > button')]:[];
    const copy=buttons.find(b=>/^Copy/.test(b.textContent)),show=buttons.find(b=>/^(Show|Hide)/.test(b.textContent));
    if(copy&&show&&show.compareDocumentPosition(copy)&Node.DOCUMENT_POSITION_FOLLOWING)pair.insertBefore(copy,show);
    const output=diagnostics.querySelector?.('pre');if(output)output.style.cssText+=';max-height:240px;overflow:auto';
    const health=()=>({label:timeline.querySelector?.('[data-exp-health-state]')?.textContent||'',reason:timeline.querySelector?.('[data-exp-health-reason]')?.textContent||''});
    // Each report takes a fresh diagnostics report, copies it, and attaches it to the issue when it fits.
    const report=wide(button('Report a Problem',async()=>{
      if(report.disabled)return;report.disabled=true;
      let data=null,copied=false;
      try{const source=typeof ExtraPotionsDiagnostics==='object'?ExtraPotionsDiagnostics.reportSource?.(diagnostics):null;if(source)data=await source();}catch{}
      if(data){try{await navigator.clipboard.writeText(JSON.stringify(data,null,2));copied=true;}catch{}}
      try{const link=document.createElement('a');link.href=productIssueUrl(id,version,{health:health(),diagnostics:data,copied});link.target='_blank';link.rel='noopener noreferrer';link.click();}
      finally{report.disabled=false;}
    }));
    report.dataset.expSystemReport='1';
    const support=ExtraPotionsCore.createDisclosure('Support',diagnostics,report,note('Report a Problem attaches diagnostics from that moment. GitHub issues are public, so remove anything private before submitting.'));
    // Reset: one tap arms, a second tap within a few seconds confirms. No browser dialogs.
    const resetStatus=note('');resetStatus.setAttribute('role','status');resetStatus.setAttribute('aria-live','polite');
    let armedUntil=0,armTimer=0;
    const reset=wide(button('Reset All Settings',async()=>{
      if(reset.disabled)return;
      if(Date.now()>=armedUntil){
        armedUntil=Date.now()+RESET_ARM_MS;reset.textContent='Tap Again to Reset';reset.dataset.expResetArmed='1';
        resetStatus.textContent=`Tap again within ${RESET_ARM_MS/1000} seconds to permanently reset ${product}.`;
        clearTimeout(armTimer);armTimer=setTimeout(disarm,RESET_ARM_MS);return;
      }
      disarm();reset.disabled=true;
      try{await onReset();notify(product+' reset complete.');}catch{notify('Reset did not complete. Check storage permissions and try again.');}finally{reset.disabled=false;}
    }));
    function disarm(){clearTimeout(armTimer);armedUntil=0;reset.textContent='Reset All Settings';delete reset.dataset.expResetArmed;resetStatus.textContent='';}
    reset.style.cssText+=';border:1px solid #ff2438;background:#e11428;color:#fff;font-weight:700';
    const resetCard=ExtraPotionsCore.createDisclosure('Reset',note(`Clears ${product} settings and stored data on this browser. This cannot be undone.`),reset,resetStatus);
    resetCard.addEventListener('toggle',()=>{if(!resetCard.open)disarm();});
    for(const [key,node] of [['status',timeline],['support',support],['preferences',preferences],['reset',resetCard]]){
      if(!node)continue;node.dataset.expSystemItem=key;node.style.minWidth='0';node.style.maxWidth='100%';
      const summary=node.tagName==='DETAILS'?node.querySelector(':scope > summary'):null;if(summary)summary.style.cssText+=';min-height:28px;padding:4px 0;box-sizing:border-box;cursor:pointer';system.append(node);
    }
    return system;
  }
  function createProductSystem({id,version,timeline,diagnostics,preferences,onReset,notify=()=>{},layout='classic'}) {
    if(!Object.hasOwn(productRepositories,id))throw new Error('Unknown product');
    if(layout==='grouped')return groupedProductSystem({id,version,timeline,diagnostics,preferences,onReset,notify});
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
  return Object.freeze({productIssueUrl,productDataResetting,clearProductData,groupTimelineEntries,createProductTimeline,createProductSystem,placeDonationPanel,createBitcoinDonation,compatibilitySnapshot,createCompatibilityControls,createSuiteSiteControls});
})();
