'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'consumer-rollout.yml'), 'utf8');

test('Core owns the complete downstream rollout sequence', () => {
  const labels = [
    'Sync latest released Core',
    'Detect Core changes',
    'Prepare consumer patch release',
    'Verify pinned Core',
    'Rebuild and test consumer',
    'Commit Core-driven patch release',
    'Publish Core-driven release',
  ];
  const positions = labels.map(label => workflow.indexOf(label));
  assert.ok(positions.every(index => index >= 0), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a,b) => a-b), positions);
});

test('Core rollout is change-gated and verifies before publication', () => {
  assert.match(workflow, /git diff --quiet -- vendor\/exp-core/u);
  assert.match(workflow, /steps\.changed\.outputs\.value == 'true'/u);
  assert.match(workflow, /node scripts\/verify-exp-core-pin\.cjs/u);
  assert.match(workflow, /npm test/u);
  assert.match(workflow, /gh release create/u);
});

test('Core rollout stops cleanly without publishing when main moved while it ran', () => {
  assert.match(workflow, /git fetch --quiet origin main/u);
  assert.match(workflow, /if \[ "\$\(git rev-parse origin\/main\)" != "\$started" \]; then/u);
  assert.match(workflow, /echo "pushed=false" >> "\$GITHUB_OUTPUT"/u);
  assert.match(workflow, /steps\.changed\.outputs\.value == 'true' && steps\.commit\.outputs\.pushed == 'true'/u);
});

test('Core rollout remains product-neutral through workflow inputs', () => {
  assert.match(workflow, /product:/u);
  assert.match(workflow, /script-asset:/u);
  assert.match(workflow, /icon-asset:/u);
  assert.match(workflow, /release-sections:/u);
  assert.doesNotMatch(workflow, /ExtraPotions\/(?:SHIFT|PRISMA|WARD|Dropper)/u);
});
