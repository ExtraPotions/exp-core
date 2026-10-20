'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('THREAD is a distinct site product with reading capabilities and separate menu routes',()=>{
 const contract=require('../src/suite-contract.json').thread;
 assert.equal(contract.repository,'THREAD');assert.equal(contract.rootId,'exp-thread-root');assert.deepEqual(contract.capabilities,['reddit.reading','reddit.local-context','reddit.local-filtering']);assert.deepEqual(contract.menuSections.system,['system']);
 const flyout=new Function(fs.readFileSync(path.join(__dirname,'../src/launcher-flyout.js'),'utf8')+';return ExpLauncherFlyout;')();
 assert.equal(flyout.isSiteProduct('thread'),true);assert.equal(flyout.leadProduct([{dataset:{productId:'shift'}},{dataset:{productId:'thread',expSiteProduct:'1'}}]),'thread');assert.deepEqual(flyout.flyoutOrder(['thread','ward','shift','dropper','prisma'].map(productId=>({dataset:{productId}}))),['dropper','shift','prisma','ward','thread']);
});
