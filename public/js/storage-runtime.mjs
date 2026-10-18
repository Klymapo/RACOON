// En modo IndexedDB, la copia local es opcional: nunca bloquea la cuota del catálogo.
import {STATE_KEY, STATE_SCHEMA_VERSION, validateState} from './storage.mjs';
import {openRacoonDatabase, readIndexedRecord, writeIndexedSnapshot, ensureIndexedCheckpoint, readIndexedCheckpoint} from './indexeddb.mjs';
export const MODE_KEY = 'racoon-storage-mode';
export const MIGRATION_KEY = `${STATE_KEY}:before-indexed-v1`;
function parseSource(raw) {
  const state = JSON.parse(raw || 'null');
  if (state?.schemaVersion !== STATE_SCHEMA_VERSION) throw Error('Biblioteca incompatible; conserva un respaldo JSON.');
  return validateState(state);
}
export async function createStorageRuntime({storage, openDatabase = openRacoonDatabase, onStatus = () => {}}) {
  let mode = 'local', queue = Promise.resolve(), pending = 0, busy = false, volatileState = null, startMirror = null, started = false;
  const auxiliary = new Map();
  const notify = status => {try {onStatus({status,mode,pending});} catch {}};
  const localGet = key => storage.getItem(key);
  function setMode(value) {
    storage.setItem(MODE_KEY,value);
    if (localGet(MODE_KEY) !== value) throw Error('No se pudo guardar el modo local.');
    mode = value;
  }
  async function withDatabase(action) {
    const db = await openDatabase();
    try {return await action(db);} finally {db.close();}
  }
  function fallback() {
    volatileState = null;
    mode = 'local';
    try {setMode('local');} catch {}
    notify('fallback');
  }
  if (localGet(MODE_KEY) === 'indexeddb') {
    const raw = localGet(STATE_KEY);
    // No degradar silenciosamente ante una biblioteca corrupta.
    if (raw !== null) parseSource(raw);
    try {
      const record = await withDatabase(readIndexedRecord);
      if (!record) throw Error('IndexedDB sin biblioteca');
      const indexedRaw = JSON.stringify(record.state);
      if (localGet(STATE_KEY) !== raw || (raw !== indexedRaw && record.mirrorRaw !== raw)) throw Error('Edición local ajena, recuperando copia local');
      startMirror = raw;
      volatileState = indexedRaw;
      mode = 'indexeddb';
      notify('ready');
    } catch (error) {
      // Si se perdió el espejo y también IndexedDB, no abrir una biblioteca vacía.
      if (raw === null) throw Error('No existe biblioteca recuperable. Importa tu respaldo JSON.');
      fallback();
    }
  }
  const facade = {
    getItem(key) {
      if (key === STATE_KEY && mode === 'indexeddb') {
        // Si otro proceso modificó el espejo durante el arranque, conservar su edición.
        if (!started) {
          started = true;
          if (localGet(STATE_KEY) !== startMirror) {fallback(); return localGet(STATE_KEY);}
        }
        return volatileState;
      }
      return auxiliary.has(key) ? auxiliary.get(key) : localGet(key);
    },
    setItem(key,value) {
      value = String(value);
      if (mode !== 'indexeddb') {
        storage.setItem(key,value);
        if(localGet(key)!==value) throw Error('No se pudo verificar la copia local.');
        return;
      }
      // Los checkpoints pueden exceder la cuota: se conservan en memoria durante esta sesión.
      if (key !== STATE_KEY) {
        auxiliary.set(key,value);
        try {storage.setItem(key,value);} catch {}
        return;
      }
      const state = parseSource(value);
      volatileState = value;
      let mirrorRaw = null, mirrorOK = false, saveOutcome = 'failed';
      try {
        storage.setItem(key,value);
        mirrorRaw = localGet(key);
        mirrorOK = mirrorRaw === value;
      } catch {mirrorRaw = localGet(key);}
      // Capturar el espejo realmente escrito: diferencia cuota agotada de edición concurrente.
      pending++;notify('pending');
      queue = queue.catch(()=>{}).then(async()=>{
        try {
          await withDatabase(db=>writeIndexedSnapshot(db,state,{mirrorRaw}));
          saveOutcome = mirrorOK?'saved':'independent';
        } catch {
          if(mirrorOK && localGet(STATE_KEY)===value) fallback();
          else {saveOutcome = 'failed'; notify('failed');}
        }
      }).finally(()=>{pending--; if(mode==='indexeddb' && pending===0)notify(saveOutcome);});
    }
  };
  async function exclusive(action) {
    if(busy) throw Error('Hay un cambio de almacenamiento en curso.');
    busy = true;
    try {await queue; return await action();} finally {busy=false;}
  }
  return {
    storage:facade,
    get mode(){return mode;},
    flush:()=>queue,
    getCheckpoint:async()=>{
      const local=localGet(MIGRATION_KEY);
      if(local)return local;
      const stored=await withDatabase(readIndexedCheckpoint);
      return stored ? JSON.stringify(stored) : null;
    },
    activate:()=>exclusive(async()=>{
      if(mode==='indexeddb')return;
      const raw=localGet(STATE_KEY),source=parseSource(raw);
      await withDatabase(async db=>{
        await ensureIndexedCheckpoint(db,source);
        await writeIndexedSnapshot(db,source,{mirrorRaw:raw});
      });
      if(localGet(MIGRATION_KEY)===null) {
        try {storage.setItem(MIGRATION_KEY,raw);} catch {}
      }
      if(localGet(STATE_KEY)!==raw)throw Error('La biblioteca cambió durante la activación. Intenta nuevamente.');
      setMode('indexeddb');volatileState=raw;startMirror=raw;started=true;notify('ready');
    }),
    deactivate:()=>exclusive(async()=>{
      if(mode==='local')return;
      // No forzar reversión al espejo antiguo si la cuota impide copiar lo actual.
      const latest=JSON.stringify(parseSource(volatileState));
      storage.setItem(STATE_KEY,latest);
      if(localGet(STATE_KEY)!==latest)throw Error('No cabe la biblioteca en localStorage. Exporta JSON antes de revertir.');
      setMode('local');volatileState=null;notify('local');
    })
  };
}
