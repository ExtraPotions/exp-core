'use strict';
const path=require('node:path');
const {loadSuiteContract}=require('./suite-contract.cjs');
const root=path.resolve(__dirname,'..');
const {flagship,products}=loadSuiteContract(root);
process.stdout.write('flagship='+flagship+'\n');
process.stdout.write('products='+JSON.stringify(products)+'\n');
