'use strict';
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const names=process.argv.filter(x=>!x.startsWith('--')).slice(2);
const suite=JSON.parse(fs.readFileSync(path.join(root,'src','suite-contract.json'),'utf8'));
const discoveredProducts=Object.values(suite).map(product=>product.repository).filter(Boolean);
const products=names.length?names:discoveredProducts;
for(const name of products){
  const destination=path.resolve(root,'..',name);
  if(!fs.existsSync(path.join(destination,'package.json')))throw new Error('Product source not found: '+destination);
  const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  const pin='v'+version+'\n';
  const pinTarget=path.join(destination,'vendor','exp-core','PIN');
  if(process.argv.includes('--check')){
    if(!fs.existsSync(pinTarget)||fs.readFileSync(pinTarget,'utf8')!==pin)throw new Error('Core pin differs: '+name+'/PIN');
  } else {
    fs.mkdirSync(path.dirname(pinTarget),{recursive:true});
    fs.writeFileSync(pinTarget,pin);
  }
  for(const file of ['exp-core.js','manifest.json']){
    const source=fs.readFileSync(path.join(root,'dist',file));const target=path.join(destination,'vendor','exp-core',file);
    if(process.argv.includes('--check')){if(!fs.existsSync(target)||!source.equals(fs.readFileSync(target)))throw new Error('Core differs: '+name+'/'+file);}
    else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);}
  }
  console.log(name+': Core matches canonical bundle');
}
