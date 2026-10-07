'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {loadSuiteContract} = require('./suite-contract.cjs');

function resolveConsumerRoots({workspace, env = process.env, listDirectories = directory => fs.readdirSync(directory, {withFileTypes:true})} = {}) {
  workspace = path.resolve(workspace || env.EXP_SUITE_ROOT || path.join(__dirname, '../..'));
  const {repositories} = loadSuiteContract();
  let mapping = {};
  if (env.EXP_PRODUCT_ROOTS) {
    try {
      mapping = JSON.parse(env.EXP_PRODUCT_ROOTS);
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping) ||
          Object.entries(mapping).some(([key,value]) => !repositories.includes(key) || typeof value !== 'string' || !value.trim())) throw Error();
    } catch (_) { throw new Error('Invalid EXP_PRODUCT_ROOTS mapping. Use product repository names and directory paths.'); }
  }
  const entries = fs.existsSync(workspace) ? listDirectories(workspace).filter(entry => entry.isDirectory() || entry.isSymbolicLink?.()) : [];
  const roots = new Map();
  for (const name of repositories) {
    if (Object.hasOwn(mapping,name)) { roots.set(name,path.resolve(workspace,mapping[name])); continue; }
    const matches = entries.filter(entry => entry.name.toLowerCase() === name.toLowerCase());
    if (matches.length > 1) throw new Error(`Ambiguous consumer directory for ${name}: ${matches.map(entry => entry.name).join(', ')}`);
    roots.set(name,path.join(workspace,matches[0]?.name || name));
  }
  const root = name => {
    if (!roots.has(name)) throw new Error('Unknown consumer: '+name);
    return roots.get(name);
  };
  const file = (name,...parts) => path.join(root(name),...parts);
  const options = (names = repositories, required = name => name.toLowerCase()+'.user.js') => {
    const missing = names.filter(name => !fs.existsSync(file(name,typeof required === 'function' ? required(name) : required)));
    if (missing.length && env.EXP_REQUIRE_CONSUMERS === '1') throw new Error('Required consumer artifacts missing: '+missing.join(', '));
    return {skip: missing.length ? 'Standalone Core: optional consumer checks skipped; missing '+missing.join(', ')+'. The suite release gate requires these checks.' : false};
  };
  return Object.freeze({workspace,root,file,options});
}
module.exports = {resolveConsumerRoots};
