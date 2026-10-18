// Copia opcional: localStorage permanece como fuente activa.
import {stageLocalStateMigration} from './indexeddb.mjs';

export function indexedBackupMessage(result) {
  switch (result?.status) {
    case 'staged': return 'Copia IndexedDB creada y verificada. Tu biblioteca original sigue intacta.';
    case 'already-staged': return 'La copia IndexedDB ya coincide con tu biblioteca actual.';
    case 'stale-snapshot': return 'La copia IndexedDB no coincide con tu biblioteca actual. No se sobrescribió ningún dato.';
    case 'source-changed': return 'La biblioteca cambió durante la copia. Intenta nuevamente.';
    case 'no-local-state': return 'Todavía no hay una biblioteca guardada para copiar.';
    case 'invalid-local-state': return 'El estado local no es válido. Exporta un respaldo JSON antes de continuar.';
    case 'incompatible-local-state': return 'El esquema local es incompatible. No se modificó ningún dato.';
    case 'storage-unavailable': return 'El almacenamiento local no se puede leer. No se modificó ningún dato.';
    default: return 'No se pudo preparar la copia. La biblioteca original sigue en localStorage; exporta un respaldo JSON.';
  }
}

export function mountIndexedBackupPanel(document) {
  const view = document?.getElementById?.('backupsView');
  if (!view || document.getElementById('prepareIndexedBackup')) return null;
  const panel = document.createElement('article');
  panel.className = 'panel-card';
  panel.innerHTML = '<h3>Copia local experimental (IndexedDB)</h3><p class="muted">Prepara una copia verificable sin reemplazar tu biblioteca actual en localStorage. No migra ni restaura datos automáticamente. Exporta tu JSON como respaldo independiente.</p><button id="prepareIndexedBackup" class="button button-soft" type="button">Preparar copia IndexedDB</button><p id="indexedBackupStatus" class="inline-status" role="status" aria-live="polite"></p>';
  view.insertBefore(panel, view.querySelector('.table-import-panel'));
  return panel;
}

export function registerIndexedBackupControl({document, storage, stage = stageLocalStateMigration} = {}) {
  const button = document?.getElementById?.('prepareIndexedBackup');
  const status = document?.getElementById?.('indexedBackupStatus');
  if (!button || !status) return null;
  let busy = false;
  async function prepare() {
    if (busy) return {status: 'busy'};
    busy = true;
    button.disabled = true;
    status.textContent = 'Preparando copia local…';
    try {
      const result = await stage(storage);
      status.textContent = indexedBackupMessage(result);
      return result;
    } catch {
      status.textContent = indexedBackupMessage({status: 'failed'});
      return {status: 'failed'};
    } finally {
      busy = false;
      button.disabled = false;
    }
  }
  button.addEventListener('click', prepare);
  return {prepare};
}

if (typeof document !== 'undefined') {
  mountIndexedBackupPanel(document);
  let storage;
  try { storage = globalThis.localStorage; } catch { storage = null; }
  registerIndexedBackupControl({document, storage});
}
