import test from 'node:test';
import assert from 'node:assert/strict';
import * as media from '../public/js/media.mjs';
import {createDefaultState, validateState, loadState, saveState, STATE_KEY} from '../public/js/storage.mjs';
import {createBackup, mergeBackup, parseBackup} from '../public/js/backup.mjs';

const entries = [
  {id: 'custom:s1', title: 'Una serie', mediaKind: 'season', season: 'FALL', totalEpisodes: 12},
  {id: 'custom:s2', title: 'Una serie T2', mediaKind: 'season', totalEpisodes: null},
  {id: 'custom:film', title: 'Una película', mediaKind: 'movie', totalEpisodes: 1, durationMinutes: 110}
];
function sample() {
  const state = createDefaultState(entries);
  state.tracking = {'custom:s1': {seen: 5, favorite: true}, 'custom:s2': {seen: 1}, 'custom:film': {status: 'Terminada', watchedAt: '2026-10-17', favorite: true}};
  return validateState(state);
}

test('migration separates movies from seasons and never invents numbered episodes', () => {
  const state = sample();
  const {works, seasons, episodes, catalogLinks} = state.mediaLibrary;
  assert.equal(Object.keys(works).length, 3);
  assert.equal(Object.keys(seasons).length, 2);
  assert.equal(Object.keys(episodes).length, 0);
  const film = works[catalogLinks['custom:film'].workId];
  assert.equal(film.kind, 'movie');
  assert.equal(catalogLinks['custom:film'].seasonId, null);
  assert.equal(seasons[catalogLinks['custom:s1'].seasonId].number, null);
  assert.equal(seasons[catalogLinks['custom:s2'].seasonId].totalEpisodes, null);
  assert.equal(film.durationMinutes, 110);
  assert.match(film.id, /^work:/);
});

test('explicitly linked seasons keep independent progress under one work', () => {
  const state = sample();
  const workId = state.mediaLibrary.catalogLinks['custom:s1'].workId;
  const linked = media.attachSeason(state, 'custom:s2', workId, 2);
  const seasonId = linked.mediaLibrary.catalogLinks['custom:s2'].seasonId;
  assert.equal(linked.mediaLibrary.seasons[seasonId].workId, workId);
  assert.equal(linked.mediaLibrary.seasons[seasonId].number, 2);
  const progress = media.getMediaProgress(linked, workId);
  assert.deepEqual(progress.seasons.map(s => s.seen).sort(), [1, 5]);
  assert.throws(() => media.attachSeason(state, 'custom:film', workId, 3), /película/i);
});

test('identity and personal data survive refresh, backup restore and merge', () => {
  const state = sample();
  const original = JSON.stringify(state);
  const changed = validateState({...state, catalogOfficial: {...state.catalogOfficial, 'custom:s1': {...state.catalogOfficial['custom:s1'], sourceId: 'new-provider-id', title: 'Título corregido'}}});
  assert.deepEqual(changed.mediaLibrary.catalogLinks, state.mediaLibrary.catalogLinks);
  const restored = parseBackup(createBackup(changed)).state;
  assert.deepEqual(restored.mediaLibrary, changed.mediaLibrary);
  assert.deepEqual(mergeBackup(changed, createBackup(sample())).mediaLibrary.catalogLinks, changed.mediaLibrary.catalogLinks);
  assert.equal(restored.tracking['custom:film'].watchedAt, '2026-10-17');
  assert.equal(JSON.stringify(state), original);
});

test('previous schema-3 data is checkpointed before adding the media library', () => {
  const state = sample();
  delete state.mediaLibrary;
  const original = JSON.stringify(state);
  const values = new Map([[STATE_KEY, original]]);
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  const loaded = loadState(storage);
  saveState(storage, loaded.state);
  assert.equal(values.get(`${STATE_KEY}:before-media-v1`), original);
  assert.equal(JSON.parse(values.get(STATE_KEY)).mediaLibrary.version, 1);
  saveState(storage, loaded.state);
  assert.equal(values.get(`${STATE_KEY}:before-media-v1`), original);
});

test('failed checkpoint leaves the original persisted progress intact', () => {
  const old = {schemaVersion: 3, tracking: {'custom:s1': {seen: 7}}};
  const original = JSON.stringify(old);
  const values = new Map([[STATE_KEY, original]]);
  const storage = {getItem: key => values.get(key) ?? null, setItem(key, value) {
    if (key.endsWith(':before-media-v1')) throw new Error('quota');
    values.set(key, value);
  }};
  assert.equal(saveState(storage, validateState(old)), false);
  assert.equal(values.get(STATE_KEY), original);
});

test('known episode records retain identity through backup and a second normalization', () => {
  let state = sample();
  state.catalogOfficial['custom:s1'] = {...state.catalogOfficial['custom:s1'], episodes: [{number: 2, title: 'Solo este episodio', sources: [{url: 'https://example.org/episode/2'}]}]};
  state = validateState(state);
  const ids = Object.keys(state.mediaLibrary.episodes);
  assert.equal(ids.length, 1);
  assert.deepEqual(Object.keys(parseBackup(createBackup(state)).state.mediaLibrary.episodes), ids);
});

test('merging independently created libraries keeps incoming episode evidence with local identities', () => {
  const local = sample();
  const incoming = sample();
  const foreignSeason = incoming.mediaLibrary.catalogLinks['custom:s1'].seasonId;
  incoming.mediaLibrary.episodes['episode:foreign'] = {id: 'episode:foreign', seasonId: foreignSeason, number: 4, title: 'Evidencia importada'};
  const result = mergeBackup(local, createBackup(incoming));
  const episodes = Object.values(result.mediaLibrary.episodes);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].seasonId, local.mediaLibrary.catalogLinks['custom:s1'].seasonId);
});

test('legacy movie status and counts are preserved without inventing a watched date', () => {
  const state = sample();
  state.tracking['custom:film'] = {status: 'Al día', seen: 1, favorite: true};
  const restored = parseBackup(createBackup(state)).state;
  const id = restored.mediaLibrary.catalogLinks['custom:film'].workId;
  assert.equal(media.getMediaProgress(restored, id).status, 'Al día');
  assert.equal(media.getMediaProgress(restored, id).watchedAt, null);
  assert.equal(restored.tracking['custom:film'].seen, 1);
});
