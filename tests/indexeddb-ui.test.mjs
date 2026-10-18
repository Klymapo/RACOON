import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedBackupMessage, registerIndexedBackupControl} from '../public/js/indexeddb-ui.mjs';

function fixture() {
  const handlers = new Map();
  const button = {disabled: false, addEventListener: (event, callback) => handlers.set(event, callback)};
  const status = {textContent: ''};
  const document = {getElementById: id => ({prepareIndexedBackup: button, indexedBackupStatus: status})[id]};
  return {document, button, status, click: () => handlers.get('click')()};
}

test('IndexedDB UI stages on demand without writing localStorage', async () => {
  const f = fixture();
  const storage = {getItem: () => '{"schemaVersion":3}', setItem: () => {throw Error('must not write');}};
  let calls = 0;
  registerIndexedBackupControl({document: f.document, storage, stage: async arg => {
    assert.equal(arg, storage);
    calls++;
    return {status: 'staged'};
  }});
  assert.equal((await f.click()).status, 'staged');
  assert.equal(calls, 1);
  assert.match(f.status.textContent, /creada y verificada/);
  assert.equal(f.button.disabled, false);
});

test('double click is ignored while copying', async () => {
  const f = fixture();
  let release;
  let calls = 0;
  registerIndexedBackupControl({document: f.document, storage: {}, stage: () => {
    calls++;
    return new Promise(resolve => {release = resolve;});
  }});
  const first = f.click();
  assert.equal(f.button.disabled, true);
  assert.equal((await f.click()).status, 'busy');
  assert.equal(calls, 1);
  release({status: 'already-staged'});
  assert.equal((await first).status, 'already-staged');
  assert.match(f.status.textContent, /ya coincide/);
  assert.equal(f.button.disabled, false);
});

test('stale and changed states are never announced as successful', async () => {
  const f = fixture();
  let result = {status: 'stale-snapshot'};
  registerIndexedBackupControl({document: f.document, storage: {}, stage: async () => result});
  await f.click();
  assert.match(f.status.textContent, /no coincide/);
  result = {status: 'source-changed'};
  await f.click();
  assert.match(f.status.textContent, /cambió durante/);
});

test('failure recovers control and hides internal error details', async () => {
  const f = fixture();
  registerIndexedBackupControl({document: f.document, storage: {}, stage: async () => {throw Error('private detail');}});
  assert.equal((await f.click()).status, 'failed');
  assert.match(f.status.textContent, /respaldo JSON/);
  assert.doesNotMatch(f.status.textContent, /private detail/);
  assert.equal(f.button.disabled, false);
});

test('unsupported states and absent controls have safe messages', () => {
  for (const status of ['no-local-state','invalid-local-state','incompatible-local-state','storage-unavailable']) {
    assert.ok(indexedBackupMessage({status}).length > 20);
  }
  assert.equal(registerIndexedBackupControl({document: {getElementById: () => null}, storage: {}}), null);
});
