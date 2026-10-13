import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../public/js/catalog.mjs';
import {createDefaultState} from '../public/js/storage.mjs';
import {buildDashboardModel, applyTrackingPatch, filterProgressEntries, progressPercentage, createApp} from '../public/js/app.mjs';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

function fakeElement() {
  return {innerHTML: '', textContent: '', value: '', classList: {add() {}, remove() {}, toggle() {}}, setAttribute() {}, addEventListener() {}};
}

function fakeDocument() {
  const nodes = new Map(['homeStats', 'pendingList', 'upcomingList', 'progressList', 'freshness', 'homeUpdated', 'backupSummary'].map((id) => [id, fakeElement()]));
  return {getElementById: (id) => nodes.get(id) || fakeElement(), querySelectorAll: () => [], addEventListener() {}, nodes};
}

test('dashboard counts pending episodes and upcoming series from local state', () => {
  const state = createDefaultState(CATALOG);
  state.catalogOfficial['legacy:verm'].availableEpisodes = 3;
  state.tracking['legacy:verm'] = {seen: 1, status: 'Viendo', favorite: false, changedAt: 10, availableOverride: null, totalOverride: 12, manualFields: []};
  const model = buildDashboardModel(CATALOG, state, '2026-10-13');
  assert.equal(model.stats.tracked, 1);
  assert.equal(model.stats.pendingEpisodes, 2);
  assert.equal(model.pending[0].id, 'legacy:verm');
  assert.equal(model.pending[0].remaining, 2);
});

test('dashboard uses the next weekly slot instead of only the premiere date', () => {
  const model = buildDashboardModel(CATALOG, createDefaultState(CATALOG), '2026-10-13');
  assert.ok(model.upcoming.some((entry) => entry.id === 'legacy:witch' && entry.date === '2026-10-14'));
});

test('dashboard labels an added series next airing as Japanese even with a platform set', () => {
  const state = createDefaultState(CATALOG);
  state.catalogOfficial['anilist:4321'] = {id: 'anilist:4321', title: 'Added', platform: 'Crunchyroll', nextAiring: {episode: 3, airingAt: Date.parse('2026-10-18T02:00:00Z') / 1000}};
  const upcoming = buildDashboardModel(CATALOG, state, '2026-10-13').upcoming.find(({id}) => id === 'anilist:4321');
  assert.equal(upcoming.date, '2026-10-17');
  assert.match(upcoming.platformLabel, /japonesa/);
});

test('tracking patches preserve manual progress when catalog metadata changes', () => {
  const state = createDefaultState(CATALOG);
  state.tracking['legacy:verm'] = {seen: 2, status: 'Viendo', favorite: true, changedAt: 10, availableOverride: 2, totalOverride: 12, manualFields: ['availableOverride']};
  const next = applyTrackingPatch(state, 'legacy:verm', {availableOverride: 5}, 20);
  const remote = {...next, catalogOfficial: {...next.catalogOfficial, 'legacy:verm': {...next.catalogOfficial['legacy:verm'], availableEpisodes: 9}}};
  assert.equal(remote.tracking['legacy:verm'].seen, 2);
  assert.equal(remote.tracking['legacy:verm'].availableOverride, 5);
  assert.equal(remote.tracking['legacy:verm'].favorite, true);
});

test('app controller persists local tracking actions without a server', () => {
  const storage = new MemoryStorage();
  const app = createApp({document: fakeDocument(), storage, fetch: async () => { throw new Error('network should not be used'); }, now: () => 50});
  app.setTracking('legacy:verm', {seen: 1, status: 'Viendo'});
  assert.equal(app.getState().tracking['legacy:verm'].seen, 1);
  assert.ok(storage.getItem('racoon-v2-state'));
  app.selectView('progress');
  assert.equal(app.getView(), 'progress');
});

test('progress filters connect search, status, and favorites to the library model', () => {
  const state = createDefaultState(CATALOG);
  state.tracking['legacy:verm'] = {seen: 1, availableOverride: 2, status: 'Viendo', favorite: true};
  state.tracking['legacy:over'] = {seen: 4, availableOverride: 4, status: 'Al día', favorite: false};
  assert.deepEqual(filterProgressEntries(CATALOG, state, {query: 'vermilion', filter: 'favorites'}).map(({entry}) => entry.id), ['legacy:verm']);
  assert.deepEqual(filterProgressEntries(CATALOG, state, {filter: 'uptodate'}).map(({entry}) => entry.id), ['legacy:over']);
});

test('progress percentage uses confirmed season total, not just the episodes already available', () => {
  assert.equal(progressPercentage({totalEpisodes: 12, availableEpisodes: 1}, {seen: 1}), 8);
  assert.equal(progressPercentage({totalEpisodes: null, availableEpisodes: 2}, {seen: 1}), 50);
  assert.equal(progressPercentage({totalEpisodes: null, availableEpisodes: null}, {seen: 1}), 0);
});

test('discarded titles do not inflate the dashboard following count or upcoming slots', () => {
  const state = createDefaultState(CATALOG);
  state.tracking['legacy:verm'] = {seen: 0, status: 'Descartada', availableOverride: 1};
  const model = buildDashboardModel(CATALOG, state, '2026-10-13');
  assert.equal(model.stats.tracked, 0);
  assert.equal(model.pending.some(({id}) => id === 'legacy:verm'), false);
  assert.equal(model.upcoming.some(({id}) => id === 'legacy:verm'), false);
});

test('editing progress while AniList is in flight cannot be rolled back by its response', async () => {
  let finishRequest;
  let requests = 0;
  const response = {ok: true, json: async () => ({data: {Page: {pageInfo: {hasNextPage: false}, media: []}}})};
  const fetch = async () => ++requests === 1 ? new Promise((resolve) => { finishRequest = resolve; }) : response;
  const app = createApp({document: fakeDocument(), storage: new MemoryStorage(), fetch, now: () => 1000});
  const pending = app.refreshRemote(true);
  app.setTracking('legacy:verm', {seen: 2, favorite: true, status: 'Viendo'});
  finishRequest(response);
  await pending;
  assert.equal(app.getState().tracking['legacy:verm'].seen, 2);
  assert.equal(app.getState().tracking['legacy:verm'].favorite, true);
});
