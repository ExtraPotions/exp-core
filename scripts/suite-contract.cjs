'use strict';
const fs = require('node:fs');
const path = require('node:path');

const PHASES = new Set(['observe','classify','visibility','theme','annotate','ui']);
const MENU_CATEGORIES = new Set(['main','appearance','advanced','system']);
const PRODUCT_ID = /^[a-z][a-z0-9-]+$/u;
const REPOSITORY = /^[A-Za-z0-9._-]+$/u;
const CAPABILITY = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;
const EVENT_TYPE = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;

function assert(condition, message) {
  if (!condition) throw new Error('Invalid suite contract: ' + message);
}

function uniqueStrings(values, label, pattern = null) {
  assert(Array.isArray(values), label + ' must be an array');
  const normalized = values.map(value => String(value || ''));
  assert(normalized.every(Boolean), label + ' cannot contain empty values');
  if (pattern) assert(normalized.every(value => pattern.test(value)), label + ' contains an invalid value');
  assert(new Set(normalized).size === normalized.length, label + ' contains duplicates');
  return normalized;
}

function validateSuiteContract(contract) {
  assert(contract && typeof contract === 'object' && !Array.isArray(contract), 'root must be an object');
  const entries = Object.entries(contract);
  assert(entries.length > 0, 'at least one product is required');
  const repositories = new Set();
  let flagshipCount = 0;

  for (const [id, product] of entries) {
    assert(PRODUCT_ID.test(id), 'invalid product id ' + id);
    assert(product && typeof product === 'object' && !Array.isArray(product), id + ' must be an object');
    assert(product.role === 'product' || product.role === 'flagship', id + ' has invalid role');
    if (product.role === 'flagship') flagshipCount += 1;

    assert(REPOSITORY.test(String(product.repository || '')), id + ' has invalid repository');
    assert(ROOT_ID.test(String(product.rootId || '')), id + ' has invalid rootId');
    assert(!repositories.has(product.repository), id + ' repository is duplicated');
    repositories.add(product.repository);

    for (const field of ['priority','launcherPriority','themePriority']) {
      assert(Number.isFinite(product[field]), id + '.' + field + ' must be finite');
    }

    uniqueStrings(product.capabilities, id + '.capabilities', CAPABILITY);
    const phases = uniqueStrings(product.presentationPhases, id + '.presentationPhases');
    assert(phases.every(phase => PHASES.has(phase)), id + '.presentationPhases contains an unknown phase');

    assert(product.menuSections && typeof product.menuSections === 'object' && !Array.isArray(product.menuSections), id + '.menuSections must be an object');
    for (const [category, sections] of Object.entries(product.menuSections)) {
      assert(MENU_CATEGORIES.has(category), id + '.menuSections has unknown category ' + category);
      uniqueStrings(sections, id + '.menuSections.' + category);
    }

    assert(product.state && typeof product.state === 'object' && !Array.isArray(product.state), id + '.state must be an object');
    assert(EVENT_TYPE.test(String(product.state.type || '')), id + '.state.type is invalid');
    assert(product.state.fields && typeof product.state.fields === 'object' && !Array.isArray(product.state.fields), id + '.state.fields must be an object');
  }

  assert(flagshipCount === 1, 'exactly one flagship is required');
  return contract;
}

function loadSuiteContract(root = path.resolve(__dirname, '..')) {
  const file = path.join(root, 'src', 'suite-contract.json');
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const contract = validateSuiteContract(JSON.parse(text));
  const entries = Object.entries(contract);
  const flagship = entries.find(([, product]) => product.role === 'flagship')[1].repository;
  const repositories = entries.map(([, product]) => product.repository);
  return Object.freeze({
    contract,
    text,
    productIds: Object.freeze(entries.map(([id]) => id)),
    repositories: Object.freeze(repositories),
    flagship,
    products: Object.freeze(repositories.filter(repository => repository !== flagship)),
  });
}

module.exports = { loadSuiteContract, validateSuiteContract };
