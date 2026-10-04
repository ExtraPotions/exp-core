/* Feature/context isolation and bounded single-flight recovery. */
const ExpRecoveryControl = (() => {
  function createRecoveryGuard({limit=3,windowMs=120000,now=Date.now}={}) {
    const contexts=new Map();let disposed=false;
    const record=(feature,context)=>{let features=contexts.get(context);if(!features){features=new Map();contexts.set(context,features);}let value=features.get(feature);if(!value){value={times:[],suspended:false,retryPending:false,lastFailureAt:null};features.set(feature,value);}return value;};
    const view=value=>({suspended:value.suspended,consecutiveFailures:value.times.length,retryPending:value.retryPending,lastFailureAt:value.lastFailureAt});
    function failed(feature,context){const value=record(feature,context),time=now();value.times=value.times.filter(at=>time-at<=windowMs);value.times.push(time);value.lastFailureAt=time;if(value.times.length>=limit)value.suspended=true;return view(value);}
    function succeeded(feature,context){const value=record(feature,context);value.times=[];value.suspended=false;return view(value);}
    async function retry(feature,context,run){
      if(disposed||typeof run!=='function')return false;const value=record(feature,context);if(value.retryPending)return false;value.retryPending=true;
      const isCurrent=()=>!disposed&&contexts.get(context)?.get(feature)===value;
      try {await run();if(!isCurrent())return false;succeeded(feature,context);return true;}
      catch(error){if(isCurrent())failed(feature,context);throw error;}
      finally {value.retryPending=false;}
    }
    return Object.freeze({failed,succeeded,snapshot:(feature,context)=>view(record(feature,context)),retry,clearContext:context=>contexts.delete(context),dispose(){disposed=true;contexts.clear();}});
  }
  return Object.freeze({createRecoveryGuard});
})();
