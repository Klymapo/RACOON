// RACOON v3: staging optativo; localStorage permanece como fuente activa.
import {STATE_KEY, STATE_SCHEMA_VERSION, validateState} from './storage.mjs';
export const IDB_NAME = 'racoon-v3-local';
export const IDB_VERSION = 1;
const STORE = 'snapshots';
const KEY = 'primary';

export function openRacoonDatabase(factory = globalThis.indexedDB) {
  if (!factory?.open) return Promise.reject(Error('IndexedDB no disponible'));
  return new Promise((resolve, reject) => {
    let blocked = false;
    const req = factory.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, {keyPath: 'id'});
    };
    req.onsuccess = () => {
      if (blocked) { req.result.close(); return; }
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error || Error('Error de IndexedDB'));
    req.onblocked = () => { blocked = true; reject(Error('IndexedDB bloqueada')); };
  });
}

function awaitRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || Error('Error de lectura'));
  });
}

export async function readIndexedSnapshot(db) {
  const row = await awaitRequest(db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY));
  if (!row) return null;
  if (row.schemaVersion !== STATE_SCHEMA_VERSION || typeof row.json !== 'string') throw Error('Esquema incompatible');
  const parsed = JSON.parse(row.json);
  if (parsed?.schemaVersion !== STATE_SCHEMA_VERSION) throw Error('Estado incompatible');
  return validateState(parsed);
}

export async function writeIndexedSnapshot(db, state) {
  if (state?.schemaVersion !== STATE_SCHEMA_VERSION) throw Error('Esquema de origen incompatible');
  const json = JSON.stringify(validateState(state));
  const tx = db.transaction(STORE, 'readwrite');
  const complete = new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || Error('Error de escritura'));
    tx.onabort = () => reject(tx.error || Error('Transacción cancelada'));
  });
  tx.objectStore(STORE).put({id: KEY, schemaVersion: STATE_SCHEMA_VERSION, json, source: STATE_KEY});
  await complete;
  const verified = await readIndexedSnapshot(db);
  if (JSON.stringify(verified) !== json) throw Error('Verificación fallida');
  return verified;
}

export async function stageLocalStateMigration(storage, openDatabase = openRacoonDatabase) {
  if (!storage?.getItem) return {status: 'storage-unavailable'};
  let raw;
  try { raw = storage?.getItem(STATE_KEY); }
  catch { return {status: 'storage-unavailable'}; }
  if (!raw) return {status: 'no-local-state'};
  let source;
  try { source = JSON.parse(raw); }
  catch { return {status: 'invalid-local-state'}; }
  if (source?.schemaVersion !== STATE_SCHEMA_VERSION) return {status: 'incompatible-local-state'};
  let db;
  try {
    db = await openDatabase();
    const existing = await readIndexedSnapshot(db);
    if (existing) return {status: JSON.stringify(existing) === JSON.stringify(validateState(source)) ? 'already-staged' : 'stale-snapshot'};
    await writeIndexedSnapshot(db, validateState(source));
    if (storage.getItem(STATE_KEY) !== raw) return {status: 'source-changed'};
    return {status: 'staged'};
  } catch (error) {
    return {status: 'failed', reason: String(error?.message || error)};
  } finally { db?.close?.(); }
}
