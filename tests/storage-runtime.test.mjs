import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState, STATE_KEY, saveState} from '../public/js/storage.mjs';
import * as runtime from '../public/js/storage-runtime.mjs';
import {readIndexedSnapshot} from '../public/js/indexeddb.mjs';
function fixture() {
  const state = createDefaultState(); state.tracking.x = {seen:3, favorite:true};
  const values = new Map([[STATE_KEY, JSON.stringify(state)]]), rows = new Map();
  let fail = false, hook;
  const storage = {getItem:k=>values.get(k)??null,setItem(k,v){values.set(k,v);}};
  const db = {close(){},transaction(name,mode){
    if (fail) throw Error('disk');
    const tx={};tx.objectStore=()=>({get(k){const req={};queueMicrotask(()=>{req.result=rows.get(k);req.onsuccess?.();});return req;},put(row){rows.set(row.id,structuredClone(row));hook?.();queueMicrotask(()=>tx.oncomplete?.());}});return tx;
  }};
  return {storage,values,db,rows,fail:()=>{fail=true;},hook:fn=>{hook=fn;},openDatabase:async()=>db};
}
test('activation verifies current state, protects original and persists the opt-in',async()=>{
  const f=fixture(), original=f.storage.getItem(STATE_KEY);
  const r=await runtime.createStorageRuntime(f);
  assert.equal(r.mode,'local'); await r.activate();
  assert.equal(r.mode,'indexeddb');
  assert.equal(f.storage.getItem(runtime.MODE_KEY),'indexeddb');
  assert.equal(f.storage.getItem(runtime.MIGRATION_KEY),original);
  assert.equal((await readIndexedSnapshot(f.db)).tracking.x.seen,3);
  assert.equal(f.storage.getItem(STATE_KEY),original);
});
test('queued edits survive reload and reversible return to local storage',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f); await r.activate();
  for (const seen of [4,5,6]) {const s=createDefaultState();s.tracking.x={seen,favorite:true};assert.equal(saveState(r.storage,s),true);}
  await r.flush(); assert.equal((await readIndexedSnapshot(f.db)).tracking.x.seen,6);
  const reopened=await runtime.createStorageRuntime(f);assert.equal(reopened.mode,'indexeddb');
  assert.equal(JSON.parse(reopened.storage.getItem(STATE_KEY)).tracking.x.seen,6);
  await reopened.deactivate();assert.equal(reopened.mode,'local');
  assert.equal(JSON.parse(f.storage.getItem(STATE_KEY)).tracking.x.seen,6);
  assert.ok(f.rows.get('primary'));
});
test('IndexedDB write failure falls back visibly to the latest local progress',async()=>{
  const f=fixture(),events=[],r=await runtime.createStorageRuntime({...f,onStatus:e=>events.push(e)});await r.activate();f.fail();
  const s=createDefaultState();s.tracking.x={seen:9};assert.equal(saveState(r.storage,s),true);await r.flush();
  assert.equal(r.mode,'local');assert.equal(JSON.parse(f.storage.getItem(STATE_KEY)).tracking.x.seen,9);
  assert.ok(events.some(e=>e.status==='fallback'));
});
test('startup with stale or inaccessible IndexedDB retains newer local data',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f);await r.activate();
  const s=JSON.parse(f.storage.getItem(STATE_KEY));s.tracking.x.seen=8;f.storage.setItem(STATE_KEY,JSON.stringify(s));
  const recovered=await runtime.createStorageRuntime(f);assert.equal(recovered.mode,'local');
  assert.equal(JSON.parse(recovered.storage.getItem(STATE_KEY)).tracking.x.seen,8);
  f.storage.setItem(runtime.MODE_KEY,'indexeddb');f.fail();
  assert.equal((await runtime.createStorageRuntime(f)).mode,'local');
});
test('activation refuses a concurrent edit and never sets the active pointer',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f);
  f.hook(()=>{const s=JSON.parse(f.storage.getItem(STATE_KEY));s.tracking.x.seen=10;f.storage.setItem(STATE_KEY,JSON.stringify(s));});
  await assert.rejects(()=>r.activate(),/cambió/i);assert.equal(r.mode,'local');
  assert.notEqual(f.storage.getItem(runtime.MODE_KEY),'indexeddb');
  assert.equal(JSON.parse(f.storage.getItem(STATE_KEY)).tracking.x.seen,10);
});
test('quota-full local checkpoint is kept in IndexedDB; invalid source cannot activate',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f),write=f.storage.setItem;
  f.storage.setItem=(k,v)=>{if(k===runtime.MIGRATION_KEY)throw Error('quota');write(k,v);};
  await r.activate();assert.equal(r.mode,'indexeddb');assert.equal(f.rows.has('before-indexed'),true);
  assert.equal(JSON.parse(await r.getCheckpoint()).tracking.x.seen,3);
  f.storage.setItem=write;f.storage.setItem(STATE_KEY,'{"schemaVersion":2}');
  await r.deactivate();await assert.rejects(()=>r.activate(),/incompatible/i);
});
test('an unreadable active local mirror blocks startup without replacing either copy',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f);await r.activate();
  const row=structuredClone(f.rows.get('primary'));
  f.storage.setItem(STATE_KEY,'{broken');
  await assert.rejects(()=>runtime.createStorageRuntime(f));
  assert.equal(f.storage.getItem(STATE_KEY),'{broken');assert.deepEqual(f.rows.get('primary'),row);
});
test('the original checkpoint survives rollback and a second activation',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f);await r.activate();
  const original=f.storage.getItem(runtime.MIGRATION_KEY);
  const s=createDefaultState();s.tracking.x={seen:11};saveState(r.storage,s);await r.flush();
  await r.deactivate();await r.activate();
  assert.equal(f.storage.getItem(runtime.MIGRATION_KEY),original);
  assert.equal((await readIndexedSnapshot(f.db)).tracking.x.seen,11);
});
test('a concurrent edit during IndexedDB startup wins over the snapshot read',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f);await r.activate();
  const next=JSON.parse(f.storage.getItem(STATE_KEY));next.tracking.x.seen=12;
  const reopened=await runtime.createStorageRuntime({...f,openDatabase:async()=>{f.storage.setItem(STATE_KEY,JSON.stringify(next));return f.db;}});
  assert.equal(reopened.mode,'local');
  assert.equal(JSON.parse(reopened.storage.getItem(STATE_KEY)).tracking.x.seen,12);
});
test('an edit between runtime readiness and app load is not overwritten by cached startup data',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f);await r.activate();
  const reopened=await runtime.createStorageRuntime(f);
  const next=JSON.parse(f.storage.getItem(STATE_KEY));next.tracking.x.seen=13;f.storage.setItem(STATE_KEY,JSON.stringify(next));
  assert.equal(JSON.parse(reopened.storage.getItem(STATE_KEY)).tracking.x.seen,13);
  assert.equal(reopened.mode,'local');
});


test('quota exhaustion in localStorage does not block IndexedDB persistence or reload',async()=>{
  const f=fixture(),runtime1=await runtime.createStorageRuntime(f);await runtime1.activate();
  const original=f.storage.getItem(STATE_KEY),setter=f.storage.setItem;
  f.storage.setItem=(key,value)=>{if(key===STATE_KEY||key===STATE_KEY+':previous')throw Error('QuotaExceededError');setter(key,value);};
  const next=createDefaultState();next.tracking.x={seen:22};
  assert.equal(saveState(runtime1.storage,next),true);
  await runtime1.flush();
  assert.equal(runtime1.mode,'indexeddb');
  assert.equal(f.storage.getItem(STATE_KEY),original);
  assert.equal((await readIndexedSnapshot(f.db)).tracking.x.seen,22);
  const runtime2=await runtime.createStorageRuntime(f);
  assert.equal(runtime2.mode,'indexeddb');
  assert.equal(JSON.parse(runtime2.storage.getItem(STATE_KEY)).tracking.x.seen,22);
  await assert.rejects(()=>runtime2.deactivate(),/QuotaExceededError/);
  assert.equal(runtime2.mode,'indexeddb');
});
test('local direct edits win over old IndexedDB data, but an unchanged stale mirror does not',async()=>{
  const f=fixture(),r=await runtime.createStorageRuntime(f);await r.activate();
  const next=createDefaultState();next.tracking.x={seen:26};
  r.storage.setItem(STATE_KEY,JSON.stringify(next));await r.flush();
  const old=JSON.parse(f.storage.getItem(STATE_KEY));old.tracking.x.seen=99;
  f.storage.setItem(STATE_KEY,JSON.stringify(old));
  assert.equal((await runtime.createStorageRuntime(f)).mode,'local');
});
test('failed IndexedDB writes with a stale mirror warn, do not silently downgrade to old progress',async()=>{
  const f=fixture(),events=[],r=await runtime.createStorageRuntime({...f,onStatus:s=>events.push(s.status)});
  await r.activate();const set=f.storage.setItem;
  f.storage.setItem=(k,v)=>{if(k===STATE_KEY)throw Error('quota');set(k,v);};
  f.fail();const s=createDefaultState();s.tracking.x={seen:77};
  assert.equal(saveState(r.storage,s),true);await r.flush();
  assert.equal(r.mode,'indexeddb');
  assert.ok(events.includes('failed'));
  assert.equal(JSON.parse(r.storage.getItem(STATE_KEY)).tracking.x.seen,77);
});

test('failed writes with both stores unavailable keep the visibly unsaved status',async()=>{
 const f=fixture(),events=[],r=await runtime.createStorageRuntime({...f,onStatus:v=>events.push(v.status)});
 await r.activate();const setter=f.storage.setItem;
 f.storage.setItem=(k,v)=>{if(k===STATE_KEY)throw Error('quota');setter(k,v);};f.fail();
 const state=createDefaultState();state.tracking.x={seen:88};
 saveState(r.storage,state);await r.flush();
 assert.equal(events.at(-1),'failed');
 assert.equal(r.mode,'indexeddb');
});
