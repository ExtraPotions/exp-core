'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('Core has only manual tests and independent manual publication', () => {
  const folder = path.join(root, '.github/workflows');
  assert.deepEqual(fs.readdirSync(folder).sort(), ['release.yml', 'verify.yml']);
  for (const name of ['release.yml', 'verify.yml']) {
    const text = fs.readFileSync(path.join(folder, name), 'utf8');
    assert.match(text, /on:\s*\n  workflow_dispatch:/u);
    assert.doesNotMatch(text, /^  (push|pull_request|schedule|repository_dispatch|workflow_call):/mu);
    assert.doesNotMatch(text, /needs:|git (?:commit|push)|consumer-rollout|verify-consumers/u);
  }
});
