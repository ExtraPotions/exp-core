/* Plain health facts and safe, product-owned actions. */
const ExpHealthSummary = (() => {
  const labels = Object.freeze({working:'Working',waiting:'Waiting',paused:'Paused',attention:'Needs attention'});
  function normalizeHealth(value) {
    const valid = value && Object.hasOwn(labels, value.state);
    const state = valid ? value.state : 'waiting';
    const checkedAt = Number(value?.checkedAt);
    return {state,label:labels[state],reason:valid && typeof value.reason === 'string' ? value.reason.slice(0,500) : 'Status information is not available yet.',
      checkedAt:Number.isFinite(checkedAt) && checkedAt > 0 ? checkedAt : null,
      action:valid && typeof value.action?.label === 'string' && typeof value.action.run === 'function' ? {label:value.action.label.slice(0,80),run:value.action.run} : null};
  }
  function createHealthControls(getHealth, notify = () => {}) {
    const element=document.createElement('section');element.className='exp-health';element.dataset.expHealth='1';
    element.style.cssText='margin:0 0 10px;padding:8px;border:1px solid var(--theme-line);border-radius:7px;background:var(--theme-inset);min-width:0;overflow-wrap:anywhere';
    const state=document.createElement('strong'),reason=document.createElement('p'),checked=document.createElement('small'),action=document.createElement('button');
    state.dataset.expHealthState='1';reason.dataset.expHealthReason='1';reason.style.cssText='margin:5px 0;line-height:1.4';checked.style.cssText='display:block;margin-bottom:4px';
    action.type='button';action.className='life-btn action';action.hidden=true;
    element.append(state,reason,checked,action);
    let generation=0,disposed=false,pending=false,current=null;
    function render(value) {current=normalizeHealth(value);state.textContent=current.label;reason.textContent=current.reason;checked.textContent=current.checkedAt?`Checked ${new Date(current.checkedAt).toLocaleTimeString()}`:'Not checked yet';action.textContent=current.action?.label||'';action.hidden=!current.action;action.disabled=pending;}
    async function refresh() {
      if(disposed)return;const ticket=++generation;
      try {const value=await getHealth();if(!disposed&&ticket===generation)render(value);}
      catch {if(!disposed&&ticket===generation)render(null);}
    }
    const click=async()=>{
      if(disposed||pending||!current?.action)return;
      const run=current.action.run;pending=true;action.disabled=true;
      try {await run();}catch {if(!disposed)notify('The recovery action did not complete. Open diagnostics for details.');}
      finally {pending=false;if(!disposed){action.disabled=false;await refresh();}}
    };
    element.refreshHealth=refresh;state.setAttribute('role','status');
    action.addEventListener('click',click);render(null);refresh();
    return {element,refresh,dispose(){disposed=true;++generation;action.removeEventListener('click',click);}};
  }
  return Object.freeze({normalizeHealth,createHealthControls});
})();
