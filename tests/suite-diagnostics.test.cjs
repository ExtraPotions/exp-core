'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

test('Core product fixtures share diagnostics and detect active peers',async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><body><main>Suite diagnostics fixture</main></body></html>');
  await page.addScriptTag({content:source});
  const result=await page.evaluate(()=>{
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const makeTheme=(id,accent)=>({id,name:id,swatch:accent,bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent,accent2:accent,skin:accent,skinVertical:accent});
    const specs=[['dropper','#9147ff',90],['shift','#3563a3',100],['prisma','#8b5cf6',80],['ward','#318c61',60]];
    const products=[];
    for(const [id,accent,priority] of specs){
      const product=ExtraPotionsCore.createProduct({id,name:id.toUpperCase(),version:'3.3.2',artwork,theme:makeTheme(id,accent),sections:[],priority});
      ExtraPotionsCore.registerDiagnosticsProduct(id,'3.3.2',product.host);
      products.push({id,product});
    }
    const reports=products.map(({id,product})=>ExtraPotionsCore.createDiagnosticsReport(id,{
      host:product.host,
      shadow:product.shadow,
      product:{version:'3.3.2'},
      settings:{fixture:true},
    }));
    const controls=ExtraPotionsCore.createDiagnosticsControls(()=>reports[0],()=>{});
    products[0].panel.append(controls);
    const controlLabels=[...controls.querySelectorAll('button')].map(button=>button.textContent);
    const summaries=reports.map(report=>({
      id:report.plugin.id,
      version:report.plugin.version,
      schemaVersion:report.schemaVersion,
      peerStatuses:report.plugin.compatibility.products.map(product=>product.status),
      hasSections:Boolean(report.page&&report.technical&&report.console&&report.plugin),
    }));
    products.forEach(({product})=>product.destroy());
    return {summaries,controlLabels};
  });
  assert.deepEqual(result.controlLabels,['Show Diagnostics','Copy Diagnostics']);
  for(const summary of result.summaries){
    assert.equal(summary.version,'3.3.2');
    assert.equal(summary.schemaVersion,3);
    assert.equal(summary.hasSections,true);
    assert.deepEqual(summary.peerStatuses,Array(4).fill('observed'));
  }
  assert.deepEqual(result.summaries.map(item=>item.id),['dropper','shift','prisma','ward']);
  assert.deepEqual(errors,[]);
});
