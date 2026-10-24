// Descriptions belong to settings and consequential actions, not ordinary navigation.
const ExpMenuHelp = (() => {
  let serial=0;
  function setMenuHelp(node,text){
    if(!node||!String(text||'').trim())return node;
    node.dataset.expHelp=String(text).trim();
    node.setAttribute('aria-description',node.dataset.expHelp);
    // Native labels must not become competing help buttons on touch.
    if(!node.closest('label')&&!node.matches('button,input,select,a[href],summary')){node.tabIndex=0;node.setAttribute('role','button');}
    return node;
  }
  function mount({shadow,panel}){
    const doc=panel.ownerDocument,view=doc.defaultView;
    const tip=doc.createElement('div');tip.id='exp-menu-help-'+(++serial);tip.className='exp-menu-help';tip.role='tooltip';tip.hidden=true;
    const style=doc.createElement('style');style.dataset.expMenuHelp='1';
    style.textContent='.exp-menu-help{position:fixed;z-index:2147483647;box-sizing:border-box;max-width:260px;padding:8px 10px;border:1px solid var(--theme-line,#938f99);border-radius:7px;background:var(--theme-panel,#211f26);color:var(--theme-text,#e6e0e9);font:400 12px/1.5 "Segoe UI",system-ui,sans-serif;overflow:auto;overflow-wrap:anywhere;pointer-events:none}.exp-menu-help[hidden]{display:none!important}.exp-menu-help[data-scrollable=true]{pointer-events:auto}.has-tooltip::after{display:none!important}';
    shadow.append(style,tip);
    let target=null,timer=0,frame=0,pointer={x:-1,y:-1};
    const inside=()=>{if(tip.hidden)return false;const r=tip.getBoundingClientRect();return pointer.x>=r.left&&pointer.x<=r.right&&pointer.y>=r.top&&pointer.y<=r.bottom;};
    function hide(){clearTimeout(timer);if(target?.getAttribute('aria-describedby')===tip.id)target.removeAttribute('aria-describedby');target=null;tip.hidden=true;}
    function show(node){
      if(!node?.isConnected)return hide();
      const text=node.dataset.expHelp||node.dataset.tip;if(!text)return;
      const owner=node.closest('[data-exp-part="dock"],[data-exp-part="progress-card"]')||panel;
      const b=owner.getBoundingClientRect(),left=Math.max(8,b.left+6),right=Math.min(view.innerWidth-8,b.right-6),top=Math.max(8,b.top+6),bottom=Math.min(view.innerHeight-8,b.bottom-6);
      if(right<=left||bottom<=top)return hide();
      clearTimeout(timer);if(target&&target!==node)target.removeAttribute('aria-describedby');target=node;target.setAttribute('aria-describedby',tip.id);
      const colors=view.getComputedStyle(owner);for(const key of ['panel','line','text'])tip.style.setProperty('--theme-'+key,colors.getPropertyValue('--theme-'+key));
      // Fixed auto width depends on the previous left offset after resize. Measure
      // intrinsic width first, bounded by the owner, so the final position cannot grow it.
      tip.textContent=text;tip.style.width='max-content';tip.style.maxWidth=(right-left)+'px';tip.style.maxHeight=(bottom-top)+'px';tip.hidden=false;
      const r=node.getBoundingClientRect(),t=tip.getBoundingClientRect();
      tip.style.left=Math.max(left,Math.min(r.left,right-t.width))+'px';
      tip.style.top=Math.max(top,Math.min(r.bottom+t.height+6<=bottom?r.bottom+6:r.top-t.height-6,bottom-t.height))+'px';
      tip.dataset.scrollable=String(tip.scrollHeight>tip.clientHeight);
    }
    const help=node=>node?.closest?.('[data-exp-help],[data-tip]');
    const defer=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(shadow.activeElement!==target&&!inside())hide();},150);};
    const over=e=>{pointer={x:e.clientX,y:e.clientY};const node=help(e.target);if(node&&e.pointerType!=='touch'&&(!inside()||node===target))show(node);};
    const move=e=>{pointer={x:e.clientX,y:e.clientY};if(target&&!inside()&&!target.contains(e.target))defer();};
    const out=e=>{if(help(e.target))defer();};
    const focus=e=>{const node=help(e.target);if(node)show(node);else hide();};
    const click=e=>{const node=help(e.target);if(node){show(node);if(node.matches('[role=button]:not(button)'))e.preventDefault();}else if(!tip.contains(e.target))hide();};
    const key=e=>{if(e.key==='Escape'&&!tip.hidden){hide();e.preventDefault();e.stopImmediatePropagation();return;}const node=help(e.target);if(node?.matches('[role=button]:not(button)')&&['Enter',' '].includes(e.key)){e.preventDefault();show(node);}};
    const layout=e=>{if(target&&!(e?.target instanceof view.Node&&tip.contains(e.target)))show(target);};
    // Menu positioning settles on the next frame after a submenu changes its height.
    const resize=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>layout());});resize.observe(panel);
    for(const [name,fn,capture] of [['pointerover',over],['pointermove',move],['pointerout',out],['focusin',focus],['click',click],['keydown',key,true],['scroll',layout,true]])shadow.addEventListener(name,fn,capture);
    view.addEventListener('resize',layout);view.addEventListener('scroll',layout,true);
    return ()=>{hide();resize.disconnect();cancelAnimationFrame(frame);for(const [name,fn,capture] of [['pointerover',over],['pointermove',move],['pointerout',out],['focusin',focus],['click',click],['keydown',key,true],['scroll',layout,true]])shadow.removeEventListener(name,fn,capture);view.removeEventListener('resize',layout);view.removeEventListener('scroll',layout,true);tip.remove();style.remove();};
  }
  return Object.freeze({setMenuHelp,mount});
})();
