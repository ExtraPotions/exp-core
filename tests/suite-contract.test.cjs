'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSuiteContract } = require('../scripts/suite-contract.cjs');

function product(overrides = {}) {
  return {
    role: 'product',
    repository: 'TEST',
    rootId: 'exp-test-root',
    priority: 1,
    launcherPriority: 1,
    themePriority: 1,
    capabilities: ['test.capability'],
    presentationPhases: [],
    menuSections: { main: ['main'], system: ['system'] },
    state: { type: 'test.state-changed', fields: { active: 'boolean' } },
    ...overrides,
  };
}

test('suite contract validator accepts one flagship and distinct repositories', () => {
  const contract = {
    flagship: product({ role: 'flagship', repository: 'Flagship' }),
    sibling: product({ repository: 'Sibling' }),
  };
  assert.equal(validateSuiteContract(contract), contract);
});

test('suite contract validator rejects ambiguous topology and invalid shared contracts', () => {
  assert.throws(() => validateSuiteContract({ one: product({ repository:'One' }) }), /exactly one flagship/u);
  assert.throws(() => validateSuiteContract({
    one: product({ role:'flagship', repository:'Same' }),
    two: product({ repository:'Same' }),
  }), /repository is duplicated/u);
  assert.throws(() => validateSuiteContract({
    one: product({ role:'flagship', repository:'One', presentationPhases:['unknown'] }),
  }), /unknown phase/u);
  assert.throws(() => validateSuiteContract({
    one: product({ role:'flagship', repository:'One', menuSections:{ mystery:['x'] } }),
  }), /unknown category/u);
  assert.throws(() => validateSuiteContract({
    one: product({ role:'flagship', repository:'One', rootId:'#bad-root' }),
  }), /invalid rootId/u);
});
