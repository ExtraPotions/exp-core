// Shared type and alignment for product menus, including custom shells.
const ExpMenuTypography = (() => {
  const css = `
    [data-exp-menu-typography]{font:400 var(--exp-font-size-body,14px)/1.45 "Segoe UI",system-ui,sans-serif!important;text-align:start;letter-spacing:normal}
    [data-exp-menu-typography] :is(button,input,select,textarea){font-family:inherit!important;letter-spacing:normal}
    [data-exp-menu-typography] :is(.row,.mini-row,.fl-switch,.setting-row){gap:12px!important;padding-block:8px!important;align-items:center!important;font-size:var(--exp-font-size-body,14px);line-height:1.4}
    [data-exp-menu-typography] :is(.label,.setting-label,.fl-switch-text,.copy>strong,.row-copy>strong,.mini-row>span){font-size:var(--exp-font-size-body,14px)!important;font-weight:500!important;line-height:1.4!important;letter-spacing:normal;min-width:0}
    [data-exp-menu-typography] :is(.copy>.help,.row-copy>small,.help,.row-help,.note,.empty,.meta){font-size:var(--exp-font-size-small,12px)!important;font-weight:400!important;line-height:1.5!important}
    [data-exp-menu-typography] :is(.copy>.help,.row-copy>small,.row-help){display:block;margin-top:4px}
    [data-exp-menu-typography] :is(.row,.mini-row,.setting-row):has(>select){display:grid!important;grid-template-columns:minmax(0,1fr) minmax(104px,.95fr)!important;column-gap:12px!important}
    [data-exp-menu-typography] :is(.row,.mini-row,.setting-row)>select{width:100%!important;max-width:100%!important;min-width:0!important;justify-self:end}
    [data-exp-menu-typography] select{box-sizing:border-box;min-height:32px!important;padding:5px 8px!important;font-size:var(--exp-font-size-body,14px)!important;line-height:1.4!important;font-weight:400}
    [data-exp-menu-typography] :is(input:not([type=range]):not([type=color]),textarea){font-size:var(--exp-font-size-body,14px)!important;line-height:1.45;min-height:32px}
    [data-exp-menu-typography] .fl-tool-header{align-items:center!important;padding:9px 10px!important;gap:10px}
    [data-exp-menu-typography] .fl-tool-title{font-size:var(--exp-font-size-body,14px)!important;font-weight:600!important;line-height:1.4!important}
    [data-exp-menu-typography] .fl-tool-chevron{flex:none;display:grid;place-items:center;align-self:center;padding:0;width:14px;line-height:1.4}
    [data-exp-menu-typography] .fl-tool-body{padding-inline:10px!important;padding-bottom:10px!important}
    [data-exp-menu-typography] :is(.group>h3,.section>h3,.section>h2,.stream-subsection-label){margin:12px 0 4px!important;font-size:var(--exp-font-size-small,12px)!important;font-weight:600!important;line-height:1.5!important;letter-spacing:normal!important;text-transform:none!important}
    [data-exp-menu-typography] :is(.group,.section):first-child>h3{margin-top:6px!important}
    [data-exp-menu-typography] :is(.fl-tool-body,.route-body) :is(.life-btn,.action,.secondary,.primary,.compact){min-height:32px!important;padding:6px 8px!important;font-size:var(--exp-font-size-body,14px)!important;font-weight:500!important;line-height:1.4!important;text-align:center}
    [data-exp-menu-typography] :is(.button-grid,.actions,.profile-actions,.menu-footer,.diagnostics-controls>div,.rules-transfer){gap:8px!important;align-items:stretch}
    [data-exp-menu-typography] :is(.button-grid,.actions,.profile-actions,.diagnostics-controls)>:is(button,a),[data-exp-menu-typography] .diagnostics-controls>div>button{margin-top:0!important}
    [data-exp-menu-typography] :is(.appearance-group,.exp-system-card,[data-exp-menu-submenu])>summary{display:flex;align-items:center;gap:8px;padding-block:7px;list-style:none;font-size:var(--exp-font-size-body,14px)!important;font-weight:500!important;line-height:1.4!important}
    [data-exp-menu-typography] :is(.appearance-group,.exp-system-card,[data-exp-menu-submenu])>summary::-webkit-details-marker{display:none}
    [data-exp-menu-typography] :is(.appearance-group,.exp-system-card,[data-exp-menu-submenu])>summary::before{content:"▸";flex:0 0 10px;text-align:center}
    [data-exp-menu-typography] :is(.appearance-group,.exp-system-card,[data-exp-menu-submenu])[open]>summary::before{content:"▾"}
    [data-exp-menu-typography] :is(.header-title-row h2,[data-exp-part="title"],#tdh-rail-title){font-size:calc(var(--exp-font-size-body,14px) + 2px)!important;font-weight:700!important;line-height:1.25!important}
    [data-exp-menu-typography] :is([data-exp-part="subtitle"],#tdh-rail-subtitle){font-size:var(--exp-font-size-small,12px)!important;line-height:1.4!important}
    [data-exp-menu-typography] :is([data-exp-part="version"],#tdh-header-version){font-weight:600!important;line-height:1.2!important;font-variant-numeric:tabular-nums}
    [data-exp-menu-typography] :is(output,.status-value,.step-value,.status-check-value){font-variant-numeric:tabular-nums}
  `;
  function mount({shadow,panel}) {
    panel.dataset.expMenuTypography='1';
    const style=document.createElement('style');style.dataset.expMenuTypography='1';style.textContent=css;shadow.append(style);
    return ()=>{style.remove();delete panel.dataset.expMenuTypography;};
  }
  return Object.freeze({mount});
})();
