'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bundle=fs.readFileSync(path.join(__dirname,'..','dist','exp-core.js'),'utf8');
const source=`(()=>{\n${bundle}\nglobalThis.ExtraPotionsCore=ExtraPotionsCore;\n})();\n`;

test('Core product fixtures share diagnostic controls and detect active peers',async t=>{
  const browser=await chromium.launch();t.after(()=>browser.close());const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html><body><main>Suite diagnostics fixture</main></body></html>');
  await page.addScriptTag({content:source});
  await page.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedDiagnostics=text;}}});
    const artwork='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="%238b5cf6"/></svg>';
    const makeTheme=(id,accent)=>({id,name:id,swatch:accent,bg:'#101014',panel:'#18181d',line:'#34343b',text:'#efeff1',muted:'#adadb8',accent,accent2:accent,skin:accent,skinVertical:accent});
    const specs=[
      ['dropper','#9147ff',90],
      ['shift','#3563a3',100],
      ['prisma','#8b5cf6',80],
      ['ward','#318c61',60],
    ];
    window.fixtures={};
    for(const [id,accent,priority] of specs){
      const product=ExtraPotionsCore.createProduct({id,name:id.toUpperCase(),version:'3.3.2',artwork,theme:makeTheme(id,accent),sections:[],priority});
      ExtraPotionsCore.registerDiagnosticsProduct(id,'3.3.2',product.host);
      const controls=ExtraPotionsCore.createDiagnosticsControls(
        ()=>ExtraPotionsCore.createDiagnosticsReport(id,{
          host:product.host,
          shadow:product.shadow,
          product:{version:'3.3.2'},
          settings:{fixture:true},
        }),
        ()=>{},
      );
      product.panel.append(controls);
      window.fixtures[id]=product;
    }
  });

  for(const id of ['dropper','shift','prisma','ward']){
    const host=page.locator(`#exp-${id}-root`);
    await host.evaluate(node=>node.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher')?.click());
    const show=host.getByRole('button',{name:'Show Diagnostics',exact:true});
    const copy=host.getByRole('button',{name:'Copy Diagnostics',exact:true});
    await show.click();
    const region=host.getByRole('region',{name:'Page, technical, console, and plugin diagnostics'});
    await region.waitFor({state:'visible'});
    const report=JSON.parse(await region.textContent());
    assert.ok(report.page&&report.technical&&report.console&&report.plugin,id);
    assert.equal(report.schemaVersion,3);
    assert.equal(report.plugin.id,id);
    assert.equal(report.plugin.version,'3.3.2');
    assert.deepEqual(report.plugin.compatibility.products.map(p=>p.status),Array(4).fill('observed'));
    await copy.click();
    assert.equal(await host.getByRole('button',{name:'Diagnostics Copied',exact:true}).count(),1,id);
    assert.equal(await page.evaluate(()=>JSON.parse(window.copiedDiagnostics).plugin.id),id);
    await host.getByRole('button',{name:'Hide Diagnostics',exact:true}).click();
    assert.equal(await region.isVisible(),false);
    await host.evaluate(node=>node.shadowRoot.querySelector('[data-exp-part="launcher"],.launcher')?.click());
  }

  await page.evaluate(()=>Object.values(window.fixtures).forEach(product=>product.destroy()));
  assert.deepEqual(errors,[]);
});
