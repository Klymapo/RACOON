import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState, STATE_KEY} from '../public/js/storage.mjs';
import {readIndexedSnapshot, writeIndexedSnapshot, stageLocalStateMigration} from '../public/js/indexeddb.mjs';

function database({onPut} = {}) {
  const rows = new Map();
  const db = {
    closed: false,
    close() { this.closed = true; },
    transaction(name, mode) {
      assert.equal(name, 'snapshots');
      const tx = {error: null};
      tx.objectStore = () => ({
        get(key) {
          const request = {};
          queueMicrotask(() => { request.result = rows.get(key); request.onsuccess?.(); });
          return request;
        },
        put(row) {
          assert.equal(mode, 'readwrite');
          rows.set(row.id, structuredClone(row));
          onPut?.(row);
          queueMicrotask(() => tx.oncomplete?.());
        }
      });
      return tx;
    }
  };
  return {db, rows};
}

function localStorageWith(value) {
  const values = new Map([[STATE_KEY, value]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test('staging verifies a snapshot without changing the original localStorage', async () => {
  const state = createDefaultState();
  state.tracking['custom:test'] = {seen: 4, favorite: true, status: 'Viendo'};
  const original = JSON.stringify(state);
  const storage = localStorageWith(original);
  const {db} = database();
  assert.equal((await stageLocalStateMigration(storage, async () => db)).status, 'staged');
  assert.equal(storage.getItem(STATE_KEY), original);
  const restored = await readIndexedSnapshot(db);
  assert.equal(restored.tracking['custom:test'].seen, 4);
  assert.equal(restored.tracking['custom:test'].favorite, true);
  assert.equal((await stageLocalStateMigration(storage, async () => db)).status, 'already-staged');
});

test('staging rejects malformed and incompatible sources without touching IndexedDB', async () => {
  let opened = 0;
  const open = async () => { opened++; return database().db; };
  assert.equal((await stageLocalStateMigration(localStorageWith('{'), open)).status, 'invalid-local-state');
  assert.equal((await stageLocalStateMigration(localStorageWith('{"schemaVersion":2}'), open)).status, 'incompatible-local-state');
  assert.equal((await stageLocalStateMigration(localStorageWith(null), open)).status, 'no-local-state');
  assert.equal(opened, 0);
});

test('staging does not claim success if localStorage changed during the transaction', async () => {
  const storage = localStorageWith(JSON.stringify(createDefaultState()));
  const {db} = database({onPut: () => storage.setItem(STATE_KEY, '{"schemaVersion":3,"newer":true}')});
  assert.equal((await stageLocalStateMigration(storage, async () => db)).status, 'source-changed');
  assert.equal(JSON.parse(storage.getItem(STATE_KEY)).newer, true);
});

test('failed IndexedDB open keeps the original local data', async () => {
  const original = JSON.stringify(createDefaultState());
  const storage = localStorageWith(original);
  const result = await stageLocalStateMigration(storage, async () => { throw Error('blocked'); });
  assert.equal(result.status, 'failed');
  assert.equal(storage.getItem(STATE_KEY), original);
});

test('read validates snapshot version and write rejects incompatible state', async () => {
  const {db, rows} = database();
  await assert.rejects(() => writeIndexedSnapshot(db, {schemaVersion: 2}), /incompatible/);
  rows.set('primary', {id: 'primary', schemaVersion: 2, json: '{}'});
  await assert.rejects(() => readIndexedSnapshot(db), /incompatible/);
});

test('a stale IndexedDB snapshot is reported rather than overwriting newer local data', async () => {
  const storage = localStorageWith(JSON.stringify(createDefaultState()));
  const {db} = database();
  assert.equal((await stageLocalStateMigration(storage, async () => db)).status, 'staged');
  const changed = createDefaultState();
  changed.tracking['custom:new'] = {seen: 2, favorite: true, status: 'Viendo'};
  storage.setItem(STATE_KEY, JSON.stringify(changed));
  assert.equal((await stageLocalStateMigration(storage, async () => db)).status, 'stale-snapshot');
  assert.equal((await readIndexedSnapshot(db)).tracking['custom:new'], undefined);
  assert.equal(JSON.parse(storage.getItem(STATE_KEY)).tracking['custom:new'].seen, 2);
});
