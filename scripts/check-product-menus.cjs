const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const workspace=path.resolve(__dirname,'../..');process.chdir(workspace);
const {chromium}=require(path.join(workspace,'SHIFT/node_modules/playwright'));
const products=[
  {name:'PRISMA',file:'PRISMA/prisma.user.js',host:'#exp-prisma-root',launcher:'.launcher',advanced:'[data-route="recover"]',palette:'[data-route="look"]'},
  {name:'SHIFT',file:'SHIFT/shift.user.js',host:'#exp-shift-root',launcher:'.launcher',advanced:'[data-route="recover"]',palette:'[data-route="look"]'},
  {name:'WARD',file:'WARD/ward.user.js',host:'#exp-ward-root',launcher:'.ward-launcher',advanced:'[data-view="recover"]',palette:'[data-view="look"]'},
  {name:'Dropper',file:'Dropper/dropper.user.js',host:'#tdh-root',launcher:'#tdh-settings-launcher',advanced:'[data-panel="tdh-recover-body"]',palette:'[data-panel="tdh-look-body"]'}
];
(async()=>{
  const browser=await chromium.launch({headless:true});const out=path.resolve('outputs/menu-verification');fs.mkdirSync(out,{recursive:true});
  try{
    for(const p of products){
      const page=await browser.newPage({viewport:{width:1100,height:950},acceptDownloads:true});page.setDefaultTimeout(5000);
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body style="background:#24262b;color:#eee;font-family:Arial"><main><h1>Menu regression fixture</h1><p>bisexual pansexual</p></main></body></html>'}));
      await page.goto(p.name==='Dropper'?'https://www.twitch.tv/':p.name==='WARD'?'https://www.amazon.com/':'https://fixture.test/');
      await page.evaluate(()=>{
        const attach=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){return attach.call(this,{...options,mode:'open'})};
        const storage=new Map();window.GM_getValue=(k,d)=>storage.has(k)?storage.get(k):d;window.GM_setValue=(k,v)=>storage.set(k,v);window.GM_deleteValue=k=>storage.delete(k);window.GM_addValueChangeListener=()=>1;window.GM_removeValueChangeListener=()=>{};
        window.GM_registerMenuCommand=()=>{};window.GM_info={script:{version:'3.0.0'},scriptHandler:'Fixture'};
        window.GM_xmlhttpRequest=options=>{queueMicrotask(()=>options.onerror?.({status:0}));return {abort(){}}};
        window.fetch=async()=>{throw Error('Fixture network disabled')};
        window.__copied='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text}});
      });
      await page.addScriptTag({content:fs.readFileSync(p.file,'utf8')});
      const root=page.locator(p.host);await root.waitFor({state:'attached'});await root.locator(p.launcher).click();
      await root.locator(p.advanced).click();
      await root.getByRole('button',{name:'Show Diagnostics',exact:true}).click();
      const reportNode=root.locator(p.name==='Dropper'?'#tdh-diagnostics':'.diagnostics-controls pre');
      await reportNode.waitFor({state:'visible'});
      const report=JSON.parse(await reportNode.innerText());assert.equal(report.report,p.name+' Diagnostics');
      {const inset=await reportNode.evaluate(n=>({height:n.getBoundingClientRect().height,overflow:getComputedStyle(n).overflowY,scrolls:n.scrollHeight>n.clientHeight,tab:n.tabIndex}));assert.equal(inset.height,160);assert.equal(inset.overflow,'auto');assert.equal(inset.scrolls,true);assert.equal(inset.tab,0);}
      assert.equal(await root.getByRole('button',{name:'Export Diagnostics',exact:true}).count(),0);
      await root.getByRole('button',{name:'Hide Diagnostics',exact:true}).click();await reportNode.waitFor({state:'hidden'});
      if(p.name!=='Dropper'){assert.equal(report.schemaVersion,2);assert.equal(report.ui.mounted,true);assert.ok(report.environment.viewport.width);assert.ok(report.settings||report.client);assert.ok(report.page.structure.elements);assert.ok(report.page.performance.resources);assert.equal(report.page.privacy.formValues,'excluded');}
      await root.getByRole('button',{name:'Copy Diagnostics',exact:true}).click();await page.waitForFunction(()=>window.__copied);assert.equal(JSON.parse(await page.evaluate(()=>window.__copied)).report,report.report);
      await root.locator(p.palette).click();
      const swatches=root.locator('.exp-theme-swatch,.mb-theme-dot');
      await swatches.first().waitFor({state:'visible'});assert.equal(await swatches.count(),8,p.name+' palette count');
      for(const width of ['narrow','compact','full']){
        await root.evaluate((host,{width,name,palette})=>{
          const s=host.shadowRoot;
          if(name==='Dropper'){
            const menu=s.querySelector('[data-panel="tdh-menu-body"]');
            if(menu.getAttribute('aria-expanded')!=='true')menu.click();
            const select=s.querySelector('#tdh-collapsed-width');select.value=width;select.dispatchEvent(new Event('change',{bubbles:true}));
            const target=s.querySelector(palette);if(target.getAttribute('aria-expanded')!=='true')target.click();
            return;
          }
          const settings=s.querySelector('[data-route="menu"],[data-view="menu"]');if(settings.getAttribute('aria-expanded')!=='true')settings.click();
          const select=[...s.querySelectorAll('select')].find(n=>['Menu width','Panel width','Panel + menu width'].includes(n.getAttribute('aria-label')));assertSelect(select);
          function assertSelect(select){if(!select)throw Error('Width control missing');select.value=width;select.dispatchEvent(new Event('change',{bubbles:true}));}
          const target=s.querySelector(palette);if(target.getAttribute('aria-expanded')!=='true')target.click();
        },{width,name:p.name,palette:p.palette});
        await page.mouse.move(20,20);
        const surface=root.locator(p.name==='Dropper'?'#tdh-tools-dock':'.dropper-menu-surface');
        const actualWidth=await surface.evaluate(n=>Math.round(n.getBoundingClientRect().width));
        if(p.name!=='Dropper')assert.equal(actualWidth,{narrow:220,compact:260,full:312}[width],p.name+' '+width);
        const sizes=await swatches.evaluateAll(nodes=>nodes.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height,r:getComputedStyle(n).borderRadius})));
        for(const size of sizes){assert.equal(size.w,size.h,p.name+': '+JSON.stringify(size));assert.equal(size.w,22);assert.equal(size.r,'5px');}
        await surface.screenshot({path:path.join(out,p.name+'-'+width+'.png')});
      }
      if(p.name==='PRISMA'){
        await root.locator('[data-route="tools"]').click();assert.equal(await root.locator('.identity').count(),3);
        const alignment=await root.locator('.identity-actions').evaluateAll(nodes=>nodes.every(n=>{const [a,b]=[...n.children].map(x=>x.getBoundingClientRect());return Math.abs(a.y+a.height/2-b.y-b.height/2)<1}));assert.ok(alignment);
        await page.screenshot({path:path.join(out,'PRISMA-identities.png')});
        await root.locator('[data-route="recover"]').click();assert.equal(await root.getByText('Matcher Status',{exact:true}).count(),0);assert.equal(await root.getByText('Processing Metrics',{exact:true}).count(),0);
        assert.equal(await root.locator('input[type="file"]:visible').count(),0);await page.screenshot({path:path.join(out,'PRISMA-settings.png')});
        const transfers=await root.getByRole('button',{name:/^(Import|Export) settings$/}).evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));assert.equal(transfers.length,2);assert.equal(transfers[0],transfers[1]);
        await root.locator('[data-route="menu"]').click();await root.getByLabel('Panel + menu width',{exact:true}).selectOption('narrow');await root.locator('[data-route="tools"]').click();
        const identityLayout=await root.locator('.identity').evaluateAll(nodes=>nodes.map(row=>{const r=row.getBoundingClientRect(),a=row.querySelector('.identity-actions').getBoundingClientRect();return{right:r.right,actionsRight:a.right,overflow:row.scrollWidth-row.clientWidth}}));
        for(const row of identityLayout){assert.ok(row.actionsRight<=row.right+1,JSON.stringify(row));assert.ok(row.overflow<=1,JSON.stringify(row));}
        await root.getByRole('searchbox',{name:'Search identity catalog'}).fill('pride');assert.ok(await root.locator('.identity').count()<=3);
      }
      if(p.name==='SHIFT'){
        assert.equal(await root.locator('[data-route="profiles"]').count(),0);
        await root.locator('[data-route="read"]').click();assert.equal(await root.getByLabel('Text contrast',{exact:true}).isVisible(),true);
      }
      assert.deepEqual(errors,[],p.name+' browser errors');console.log('PASS',p.name,'standalone product bundle','show/copy diagnostics and layout');await page.close();
    }
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
