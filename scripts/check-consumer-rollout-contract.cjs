'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const coreRoot = path.resolve(__dirname, '..');
const consumers = require('./consumer-roots.cjs').resolveConsumerRoots();
const { repositories } = require('./suite-contract.cjs').loadSuiteContract(coreRoot);

for (const root of [coreRoot, ...repositories.map(name => consumers.root(name))]) {
  const folder = path.join(root, '.github/workflows');
  assert.deepEqual(fs.readdirSync(folder).sort(), ['release.yml', 'verify.yml']);
  for (const file of ['release.yml', 'verify.yml']) {
    const source = fs.readFileSync(path.join(folder, file), 'utf8');
    assert.match(source, /on:\s*\n  workflow_dispatch:/u);
    assert.doesNotMatch(source, /^  (push|pull_request|schedule|repository_dispatch|workflow_call):/mu);
    assert.doesNotMatch(source, /needs:|consumer-rollout|verify-consumers|git (?:push|commit)/u);
  }
}
console.log('PASS: Core and consumers use independent manual workflows.');
