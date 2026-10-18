// Transición reversible: lectura IndexedDB y espejo local antes de cada escritura.
import {STATE_KEY, STATE_SCHEMA_VERSION, validateState} from './storage.mjs';
import {openRacoonDatabase, readIndexedSnapshot, writeIndexedSnapshot} from './indexeddb.mjs';
export const MODE_KEY = 'racoon-storage-mode';
export const MIGRATION_KEY = `${STATE_KEY}:before-indexed-v1`;
function parseSource(raw) {
  const state = JSON.parse(raw || 'null');
  if (state?.schemaVersion !== STATE_SCHEMA_VERSION) throw Error('Biblioteca incompatible; conserva un respaldo JSON.');
  return validateState(state);
}
export async function createStorageRuntime({storage, openDatabase = openRacoonDatabase, onStatus = () => {}}) {
  let mode = 'local', queue = Promise.resolve(), pending = 0, busy = false;
  const notify = status => { try {onStatus({status, mode, pending});} catch {} };
  const setMode = value => {
    storage.setItem(MODE_KEY, value);
    if (storage.getItem(MODE_KEY) !== value) throw Error('No se pudo guardar el modo local.');
    mode = value;
  };
  async function withDatabase(action) {
    const db = await openDatabase();
    try {return await action(db);} finally {db.close();}
  }
  function fallback() {
    mode = 'local';
    try {setMode('local');} catch { /* Al reiniciar se detectará la discrepancia. */ }
    notify('fallback');
  }
  let startupRaw = null, startupSourceRaw = null;
  if (storage.getItem(MODE_KEY) === 'indexeddb') {
    // Sin espejo legible no arrancar con un estado vacío ni sobrescribir la base.
    const raw = storage.getItem(STATE_KEY);
    const local = parseSource(raw);
    try {
      const indexed = await withDatabase(readIndexedSnapshot);
      if (!indexed || JSON.stringify(indexed) !== JSON.stringify(local)) throw Error('Copias distintas');
      if (storage.getItem(STATE_KEY) !== raw) throw Error('El origen cambió durante el arranque');
      startupRaw = JSON.stringify(indexed);
      startupSourceRaw = raw;
      mode = 'indexeddb';
      notify('ready');
    } catch {fallback();}
  }
  const facade = {
    getItem(key) {
      if (key === STATE_KEY && startupRaw !== null) {
        const value = startupRaw; startupRaw = null;
        if (storage.getItem(STATE_KEY) !== startupSourceRaw) {
          fallback(); return storage.getItem(STATE_KEY);
        }
        return value;
      }
      return storage.getItem(key);
    },
    setItem(key, value) {
      // El guardado local síncrono debe verificarse antes de encolar IndexedDB.
      storage.setItem(key, value);
      if (storage.getItem(key) !== value) throw Error('No se pudo verificar el espejo local.');
      if (key !== STATE_KEY || mode !== 'indexeddb') return;
      const state = parseSource(value);
      pending++; notify('pending');
      queue = queue.then(async () => {
        if (mode === 'indexeddb') {
          try {await withDatabase(db => writeIndexedSnapshot(db, state));}
          catch {fallback();}
        }
      }).finally(() => {pending--; if (mode === 'indexeddb' && pending === 0) notify('saved');});
    }
  };
  async function exclusive(action) {
    if (busy) throw Error('Hay un cambio de almacenamiento en curso.');
    busy = true;
    try {await queue; return await action();} finally {busy = false;}
  }
  return {
    storage: facade,
    get mode() {return mode;},
    flush: () => queue,
    activate: () => exclusive(async () => {
      if (mode === 'indexeddb') return;
      const raw = storage.getItem(STATE_KEY), source = parseSource(raw);
      if (storage.getItem(MIGRATION_KEY) === null) {
        storage.setItem(MIGRATION_KEY, raw);
        if (storage.getItem(MIGRATION_KEY) !== raw) throw Error('No se pudo verificar el respaldo previo.');
      }
      await withDatabase(db => writeIndexedSnapshot(db, source));
      if (storage.getItem(STATE_KEY) !== raw) throw Error('La biblioteca cambió durante la activación. Intenta nuevamente.');
      setMode('indexeddb'); notify('ready');
    }),
    deactivate: () => exclusive(async () => {
      // Los cambios ya se guardaron primero en el espejo; no restaurar una copia vieja.
      parseSource(storage.getItem(STATE_KEY));
      setMode('local'); notify('local');
    })
  };
}
