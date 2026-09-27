const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const helper=fs.readFileSync(path.join(root,'src/menu-arrangement.js'),'utf8').trim();
const dropper=path.join(root,'../Dropper');
const sourceFile=path.join(dropper,'src/dropper.user.js');
const source=fs.readFileSync(sourceFile,'utf8');
const next=source.replace(/(\/\/ BEGIN SHARED MENU ARRANGEMENT\r?\n)[\s\S]*?(\s*\/\/ END SHARED MENU ARRANGEMENT)/,(_,start,end)=>start+helper+'\n  // END SHARED MENU ARRANGEMENT');
if(next===source&&!source.includes(helper))throw new Error('Missing Dropper arrangement markers');
for(const [file,content] of [[sourceFile,next],[path.join(dropper,'src/shared-menu-arrangement.js'),helper+'\n']]){
 if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==content.replace(/\r\n/g,'\n'))throw new Error('Dropper arrangement differs: '+file);}
 else fs.writeFileSync(file,content);
}
console.log('Dropper menu arrangement matches core');
