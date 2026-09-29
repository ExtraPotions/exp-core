'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { loadSuiteContract } = require('./suite-contract.cjs');

const coreRoot = path.resolve(__dirname, '..');
const workspace = path.resolve(coreRoot, '..');
const { repositories } = loadSuiteContract(coreRoot);

const release = fs.readFileSync(path.join(coreRoot, '.github/workflows/release.yml'), 'utf8');
assert.match(release, /name: Dispatch Core release to consumers/u);
assert.match(release, /secrets\.CORE_ROLLOUT_TOKEN/u);
assert.match(release, /event_type:"exp-core-release"/u);
assert.match(release, /repos\/ExtraPotions\/\$repo\/dispatches/u);

for (const repository of repositories) {
  const workflowPath = path.join(workspace, repository, '.github/workflows/sync-exp-core.yml');
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /repository_dispatch:\s*\n\s*types: \[exp-core-release\]/u, repository + ' dispatch trigger');
  assert.match(workflow, /schedule:\s*\n\s*- cron:/u, repository + ' scheduled fallback');
  assert.match(workflow, /github\.event\.client_payload\.tag \|\| inputs\.tag \|\| ''/u, repository + ' release tag forwarding');
  assert.match(workflow, /ExtraPotions\/exp-core\/\.github\/workflows\/consumer-rollout\.yml@main/u, repository + ' shared rollout workflow');
}

console.log('PASS event-driven Core rollout contract:', repositories.join(', '));
