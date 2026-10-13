import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../public/js/catalog.mjs';
import {
  LEGACY_STATE_KEY,
  STATE_KEY,
  createDefaultState,
  loadState,
  saveState,
  validateState
} from '../public/js/storage.mjs';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

class FailingStorage extends MemoryStorage {
  setItem() { throw new Error('quota'); }
}

test('migrates legacy v1 progress and leaves the historical key intact', () => {
  const storage = new MemoryStorage();
  const legacy = {
    verm: {favorite: true, grade: 'Al día', seen: 2, aired: 2, total: 12, changedAt: 1760000000000},
    fx: {grade: 'Viendo', seen: 1, changedAt: 1760000000100}
  };
  storage.setItem(LEGACY_STATE_KEY, JSON.stringify(legacy));
  const result = loadState(storage, CATALOG);
  const verm = result.state.tracking['legacy:verm'];
  assert.equal(result.migrated, true);
  assert.equal(result.state.schemaVersion, 3);
  assert.equal(verm.favorite, true);
  assert.equal(verm.status, 'Al día');
  assert.equal(verm.seen, 2);
  assert.equal(verm.availableOverride, 2);
  assert.equal(verm.totalOverride, 12);
  assert.equal(storage.getItem(LEGACY_STATE_KEY), JSON.stringify(legacy));
  assert.ok(storage.getItem(STATE_KEY));
});

test('repairs malformed stored values without destroying valid personal fields', () => {
  const storage = new MemoryStorage();
  const state = createDefaultState(CATALOG);
  state.tracking['legacy:verm'] = {seen: 4, status: 'Viendo', favorite: true, changedAt: 1760000000000};
  storage.setItem(STATE_KEY, JSON.stringify(state));
  const result = loadState(storage, [{...CATALOG.find((entry) => entry.id === 'legacy:verm'), title: 'Updated catalog title'}]);
  assert.equal(result.state.tracking['legacy:verm'].seen, 4);
  assert.equal(result.state.tracking['legacy:verm'].favorite, true);
  assert.equal(result.state.catalogOfficial['legacy:verm'].title, 'Updated catalog title');
  assert.deepEqual(validateState({schemaVersion: 3, tracking: {'x': {seen: -3, status: 'invalid', favorite: 'yes'}}}).tracking.x, {
    seen: 0,
    status: 'Pendiente',
    favorite: false,
    changedAt: 0,
    availableOverride: null,
    totalOverride: null,
    manualFields: []
  });
});

test('a storage write failure does not throw or replace the in-memory state', () => {
  const state = createDefaultState(CATALOG);
  state.tracking['legacy:verm'] = {seen: 3, status: 'Viendo', favorite: false, changedAt: 1760000000000};
  assert.doesNotThrow(() => saveState(new FailingStorage(), state));
  assert.equal(state.tracking['legacy:verm'].seen, 3);
});
