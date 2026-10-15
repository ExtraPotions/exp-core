'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const flyout=new Function(fs.readFileSync(path.join(__dirname,'..','src','launcher-flyout.js'),'utf8')+'\nreturn ExpLauncherFlyout;')();
const host=(productId,{flyout:advertised=true,site=false}={})=>({dataset:{productId,...(advertised?{expFlyout:'1'}:{}),...(site?{expSiteProduct:'1'}:{})}});

test('flyout mode needs two or more launchers that all speak the flyout protocol',()=>{
  assert.equal(flyout.flyoutActive([host('shift')]),false,'one launcher keeps today\'s single launcher');
  assert.equal(flyout.flyoutActive(['dropper','shift','prisma','ward'].map(id=>host(id))),true);
  assert.equal(flyout.flyoutActive([host('dropper'),host('shift'),host('prisma'),host('ward',{flyout:false})]),false,'an older Core on the page keeps the grid for everyone');
  assert.equal(flyout.flyoutActive([]),false);
});

test('the site product leads, otherwise the first product in suite order',()=>{
  assert.equal(flyout.leadProduct([host('prisma'),host('shift'),host('dropper',{site:true})]),'dropper');
  assert.equal(flyout.leadProduct([host('shift'),host('ward',{site:true})]),'ward');
  assert.equal(flyout.leadProduct([host('prisma'),host('shift')]),'shift');
  assert.equal(flyout.leadProduct([host('ward'),host('prisma')]),'prisma');
  assert.equal(flyout.leadProduct([]),'');
});

test('flyout order is suite order whatever the load order',()=>{
  assert.deepEqual(flyout.flyoutOrder([host('ward'),host('prisma'),host('dropper',{site:true}),host('shift')]),['dropper','shift','prisma','ward']);
  assert.deepEqual(flyout.flyoutOrder([host('zeta'),host('prisma'),host('alpha')]),['prisma','alpha','zeta'],'unknown products follow, alphabetically');
});

test('only products made for one site are site products',()=>{
  assert.equal(flyout.isSiteProduct('dropper'),true);
  assert.equal(flyout.isSiteProduct('ward'),true);
  assert.equal(flyout.isSiteProduct('shift'),false);
  assert.equal(flyout.isSiteProduct('prisma'),false);
});
