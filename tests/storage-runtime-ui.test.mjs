import test from 'node:test';
import assert from 'node:assert/strict';
import * as ui from '../public/js/storage-runtime-ui.mjs';
function fixture() {
  const handlers={};
  const nodes=Object.fromEntries(['activateIndexedStorage','deactivateIndexedStorage','storageRuntimeStatus'].map(id=>[id,{textContent:'',disabled:false,addEventListener:(event,fn)=>{handlers[id]=fn;}}]));
  const document={getElementById:id=>nodes[id]};
  return {document,nodes,handlers};
}
test('activation and rollback show only verified outcomes and block double execution',async()=>{
  const f=fixture();let release;let mode='local';
  const runtime={get mode(){return mode;},activate:()=>new Promise(resolve=>{release=()=>{mode='indexeddb';resolve();};}),deactivate:async()=>{mode='local';}};
  ui.registerStorageRuntimeControls(f.document,runtime);
  const pending=f.handlers.activateIndexedStorage();assert.equal(f.nodes.activateIndexedStorage.disabled,true);
  assert.equal(await f.handlers.activateIndexedStorage(),false);
  release();await pending;assert.match(f.nodes.storageRuntimeStatus.textContent,/IndexedDB activo/);
  await f.handlers.deactivateIndexedStorage();assert.match(f.nodes.storageRuntimeStatus.textContent,/localStorage activo/);
});
test('failed activation recovers controls and does not announce success',async()=>{
  const f=fixture();ui.registerStorageRuntimeControls(f.document,{mode:'local',activate:async()=>{throw Error('disk internal');}});
  await f.handlers.activateIndexedStorage();assert.match(f.nodes.storageRuntimeStatus.textContent,/No se pudo/);
  assert.doesNotMatch(f.nodes.storageRuntimeStatus.textContent,/disk internal/);assert.equal(f.nodes.activateIndexedStorage.disabled,false);
});
test('pending writes and fallback are visible without claiming durable IndexedDB storage',()=>{
  const f=fixture();ui.updateStorageRuntimeStatus(f.document,{mode:'indexeddb',status:'pending'});
  assert.match(f.nodes.storageRuntimeStatus.textContent,/Guardando/);
  ui.updateStorageRuntimeStatus(f.document,{mode:'local',status:'fallback'});
  assert.match(f.nodes.storageRuntimeStatus.textContent,/copia local/);
  assert.equal(f.nodes.deactivateIndexedStorage.disabled,true);
});
