import {MIGRATION_KEY} from './storage-runtime.mjs';
import {createBackup} from './backup.mjs';
export function updateStorageRuntimeStatus(document, {status,mode}) {
  const node=document.getElementById('storageRuntimeStatus');
  if (!node) return;
  node.textContent=status==='pending' ? 'Guardando en IndexedDB… Espera la confirmación antes de cerrar.' : status==='failed' ? 'No se confirmó el guardado en IndexedDB ni en la copia local. Exporta un JSON ahora; no cierres esta pestaña.' : status==='independent' ? 'Guardado en IndexedDB verificado. La copia local puede estar desactualizada por falta de espacio; exporta JSON periódicamente.' : status==='fallback' ? 'IndexedDB falló. Se usa la última copia local disponible; exporta un respaldo JSON.' : mode==='indexeddb' ? 'IndexedDB activo y verificado; copia local cuando hay espacio.' : 'localStorage activo. La copia IndexedDB se conserva.';
  const activate=document.getElementById('activateIndexedStorage'),deactivate=document.getElementById('deactivateIndexedStorage');
  if(activate)activate.disabled=mode==='indexeddb';
  if(deactivate)deactivate.disabled=mode!=='indexeddb';
}
export function registerStorageRuntimeControls(document,runtime) {
  const activate=document.getElementById('activateIndexedStorage'),deactivate=document.getElementById('deactivateIndexedStorage');
  if(!activate||!deactivate)return null;
  let busy=false;
  const perform=async action=>{
    if(busy)return false;
    busy=true;activate.disabled=true;deactivate.disabled=true;
    document.getElementById('storageRuntimeStatus').textContent='Verificando biblioteca y almacenamiento…';
    try {await runtime[action]();updateStorageRuntimeStatus(document,{mode:runtime.mode});return true;}
    catch {updateStorageRuntimeStatus(document,{mode:runtime.mode});document.getElementById('storageRuntimeStatus').textContent='No se pudo cambiar el almacenamiento. Tus datos se conservaron; exporta un respaldo y vuelve a intentar.';return false;}
    finally {busy=false;}
  };
  activate.addEventListener('click',()=>perform('activate'));
  deactivate.addEventListener('click',()=>perform('deactivate'));
  updateStorageRuntimeStatus(document,{mode:runtime.mode});
  return {perform};
}
export function mountStorageRuntimePanel(document,runtime,storage) {
  const view=document.getElementById('backupsView');
  if(!view||document.getElementById('activateIndexedStorage'))return;
  const panel=document.createElement('article');panel.className='panel-card';
  panel.innerHTML='<h3>Almacenamiento local reversible</h3><p class="muted">Puedes activar IndexedDB como biblioteca principal. Guarda un espejo en localStorage solo cuando hay espacio, sin bloquear el guardado por cuota. Revertir a localStorage exige que la biblioteca quepa. Exporta JSON periódicamente; no sincroniza entre dispositivos.</p><button id="activateIndexedStorage" type="button" class="button button-soft">Activar IndexedDB</button> <button id="deactivateIndexedStorage" type="button" class="button button-soft">Volver a localStorage</button> <button id="downloadIndexedCheckpoint" type="button" class="button button-soft">Descargar respaldo previo</button><p id="storageRuntimeStatus" class="inline-status" role="status" aria-live="polite"></p>';
  view.appendChild(panel);registerStorageRuntimeControls(document,runtime);
  document.getElementById('downloadIndexedCheckpoint').addEventListener('click',async()=>{
    try {
      const raw=await runtime.getCheckpoint();if(!raw)throw Error('Sin respaldo');
      const backup=createBackup(JSON.parse(raw));
      const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='racoon-antes-indexeddb.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch {document.getElementById('storageRuntimeStatus').textContent='No hay un respaldo previo disponible. Exporta el respaldo JSON actual desde Ajustes.';}
  });
}
