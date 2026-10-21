'use strict';
// Follow the visible navigation path; Support/Reset are disclosures inside System.
async function openSystem(root, group) {
  const tab=root.getByRole('tab',{name:'System',exact:true});
  if(await tab.getAttribute('aria-selected')!=='true'){
    try{await tab.click({timeout:5000});}catch(error){
      const path=require('node:path'),fs=require('node:fs'),dir=path.resolve(__dirname,'../../../local-verification/suite-system-20261020');fs.mkdirSync(dir,{recursive:true});
      await root.page().screenshot({path:path.join(dir,'navigation-failure.png')});
      const facts=await root.evaluate(host=>{const box=n=>n?{rect:n.getBoundingClientRect().toJSON(),z:getComputedStyle(n).zIndex,overflow:getComputedStyle(n).overflow,display:getComputedStyle(n).display}:null;return{host:host.id,panel:box(host.shadowRoot.querySelector('[data-exp-part=dock]')),card:box(document.querySelector('#tdh-root')?.shadowRoot.querySelector('#tdh-drop-card')),system:box([...host.shadowRoot.querySelectorAll('[role=tab]')].find(n=>n.textContent.trim()==='System'))};});fs.writeFileSync(path.join(dir,'navigation-failure.json'),JSON.stringify(facts,null,2));throw error;
    }
  }
  if(!group)return;
  if(['support','reset'].includes(group.toLowerCase())){
    const direct=root.locator('[data-exp-system-item="'+group.toLowerCase()+'"]');
    if(await direct.count()&&!await direct.evaluate(node=>node.tagName==='DETAILS'))return;
  }
  const summary=root.locator('summary').filter({hasText:new RegExp('^'+group+'$','i')});
  if(!await summary.evaluate(node=>node.parentElement.open))await summary.click();
}
module.exports={openSystem};
