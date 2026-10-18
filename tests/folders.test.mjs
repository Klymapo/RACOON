import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState, validateState} from '../public/js/storage.mjs';
import {createBackup, parseBackup, mergeBackup} from '../public/js/backup.mjs';
import {createFolder, renameFolder, moveFolder, trashFolder, restoreFolder, setFolderMembership, listFolders, foldersForWork} from '../public/js/folders.mjs';
import {filterProgressEntries} from '../public/js/app.mjs';

function sample() {
  const state = createDefaultState([{id: 'custom:show', title: 'Serie', mediaKind: 'season'}, {id: 'custom:film', title: 'Película', mediaKind: 'movie'}]);
  state.tracking['custom:show'] = {seen: 5, favorite: true, status: 'Viendo'};
  return validateState(state);
}
const work = state => state.mediaLibrary.catalogLinks['custom:show'].workId;

test('create, rename and reorder folders without changing progress or identities', () => {
  const original = sample();
  let state = createFolder(original, '  Con papá  ', 10);
  state = createFolder(state, 'Películas', 20);
  const first = listFolders(state)[0].id;
  state = renameFolder(state, first, 'Con mi papá', 30);
  state = moveFolder(state, first, 1, 40);
  assert.deepEqual(listFolders(state).map(f => f.name), ['Películas', 'Con mi papá']);
  assert.deepEqual(state.tracking, original.tracking);
  assert.deepEqual(state.mediaLibrary, original.mediaLibrary);
  assert.equal(listFolders(original).length, 0);
  assert.throws(() => createFolder(state, 'con MI papá'), /existe/i);
  assert.throws(() => createFolder(state, '  '), /nombre/i);
});

test('one work can belong to several folders and library filtering uses work identity', () => {
  let state = createFolder(createFolder(sample(), 'A', 10), 'B', 20);
  const [a, b] = listFolders(state);
  state = setFolderMembership(state, work(state), a.id, true, 30);
  state = setFolderMembership(state, work(state), b.id, true, 40);
  assert.equal(foldersForWork(state, work(state)).length, 2);
  assert.deepEqual(filterProgressEntries([], state, {folder: a.id}).map(x => x.entry.id), ['custom:show']);
  assert.deepEqual(filterProgressEntries([], state, {folder: 'unfiled'}).map(x => x.entry.id), ['custom:film']);
});

test('trashing and restoring a folder preserves works, progress and membership', () => {
  let state = createFolder(sample(), 'Recuperable', 10);
  const id = listFolders(state)[0].id;
  state = setFolderMembership(state, work(state), id, true, 20);
  const before = JSON.stringify(state.tracking);
  state = trashFolder(state, id, 30);
  assert.equal(listFolders(state).length, 0);
  assert.equal(foldersForWork(state, work(state)).length, 0);
  state = restoreFolder(state, id, 40);
  assert.equal(foldersForWork(state, work(state))[0].name, 'Recuperable');
  assert.equal(JSON.stringify(state.tracking), before);
  assert.ok(state.catalogOfficial['custom:show']);
});

test('JSON restore preserves folders and a newer removal is not resurrected by merge', () => {
  let state = createFolder(sample(), 'A', 10);
  const id = listFolders(state)[0].id;
  state = setFolderMembership(state, work(state), id, true, 20);
  const old = createBackup(state);
  assert.deepEqual(parseBackup(old).state.collections, state.collections);
  state = setFolderMembership(state, work(state), id, false, 30);
  assert.equal(foldersForWork(mergeBackup(state, old), work(state)).length, 0);
  state = trashFolder(state, id, 40);
  assert.equal(listFolders(mergeBackup(state, old)).length, 0);
});

test('merging independently created libraries remaps folder membership to local work IDs', () => {
  const local = sample();
  let incoming = createFolder(sample(), 'Importada', 10);
  const folderId = listFolders(incoming)[0].id;
  incoming = setFolderMembership(incoming, work(incoming), folderId, true, 20);
  const merged = mergeBackup(local, createBackup(incoming));
  assert.equal(foldersForWork(merged, work(local))[0].name, 'Importada');
  assert.deepEqual(merged.tracking, local.tracking);
});

test('old backups without folders merge without clearing existing folders', () => {
  const state = createFolder(sample(), 'Conservar', 10);
  const old = createBackup(sample());
  delete old.collections;
  assert.equal(listFolders(mergeBackup(state, old))[0].name, 'Conservar');
});
