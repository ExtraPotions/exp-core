'use strict';
// THREAD has modern-Reddit fixtures; the established four-product audits use their original sites.
// Keep its full menu/annotation/coexistence lane explicit in each suite audit inventory.
const path=require('node:path'),{spawnSync}=require('node:child_process');
function checkThread(){
  const root=require('./consumer-roots.cjs').resolveConsumerRoots().root('THREAD');
  const result=spawnSync(process.execPath,[path.join(root,'tests/browser.cjs')],{stdio:'inherit',timeout:240000});
  if(result.status!==0)throw Error('THREAD modern-Reddit integration checks failed');
}
module.exports={checkThread};
if(require.main===module)checkThread();
