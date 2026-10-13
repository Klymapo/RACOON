import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../public/js/catalog.mjs';
import {buildCalendarModel} from '../public/js/schedule.mjs';
import {buildDashboardModel, saveCatalogEntry, applyTrackingPatch, filterProgressEntries} from '../public/js/app.mjs';
import {normalizeAniListMedia, seasonForEntry} from '../public/js/providers/anilist.mjs';
import {createDefaultState, loadState, saveState} from '../public/js/storage.mjs';
import {createBackup, replaceWithBackup} from '../public/js/backup.mjs';
import {refreshCatalog} from '../public/js/refresh.mjs';
import {createCustomId} from '../public/js/model.mjs';

test('legacy weekly slots continue through four weeks and month change, without publishing episodes', () => {
  const source = CATALOG.find((entry) => entry.id === 'legacy:verm');
  const state = createDefaultState(CATALOG);
  const before = source.availableEpisodes;
  for (const [week, saturday] of [['2026-10-19', '2026-10-24'], ['2026-10-26', '2026-10-31'], ['2026-11-02', '2026-11-07'], ['2026-11-09', '2026-11-14']]) {
    const event = buildCalendarModel([source], state, {weekStart: week, selectedDay: saturday}).mobileEntries[0];
    assert.equal(event?.mexicoDate, saturday);
    assert.equal(event?.statusLabel, 'Previsto');
    assert.match(event?.platformLabel, /Crunchyroll/);
    assert.ok(event?.sources?.[0]?.url);
  }
  assert.equal(state.catalogOfficial[source.id].availableEpisodes, before);
});

test('explicit pauses and completion suppress only affected projections', () => {
  const entry = {id: 'custom:pause', title: 'Pause', date: '2026-10-10', platform: 'Crunchyroll', weeklySchedule: {frequency: 'weekly', day: 5, startDate: '2026-10-10'}, scheduleEvents: [{date: '2026-10-24', status: 'paused', confidence: 'confirmed'}]};
  assert.equal(buildCalendarModel([entry], {tracking: {}}, {weekStart: '2026-10-19', selectedDay: '2026-10-24'}).mobileEntries.length, 0);
  assert.equal(buildCalendarModel([entry], {tracking: {}}, {weekStart: '2026-10-26', selectedDay: '2026-10-31'}).mobileEntries[0].statusLabel, 'Previsto');
  assert.equal(buildCalendarModel([{...entry, airingStatus: 'FINISHED'}], {tracking: {}}, {weekStart: '2026-10-26', selectedDay: '2026-10-31'}).mobileEntries.length, 0);
});

test('weekly source-zone events cross Mexico week boundaries and Pacific DST safely', () => {
  const late = {id: 'custom:late', title: 'Late', date: '2026-10-18', weeklySchedule: {frequency: 'weekly', day: 6, startDate: '2026-10-18'}, sourceTime: {date: '2026-10-18', time: '23:30', timeZone: 'America/Los_Angeles'}};
  const monday = buildCalendarModel([late], {tracking: {}}, {weekStart: '2026-10-19', selectedDay: '2026-10-19'}).mobileEntries[0];
  assert.equal(monday.mexicoDate, '2026-10-19');
  const pacific = {...late, date: '2026-10-17', weeklySchedule: {frequency: 'weekly', day: 5, startDate: '2026-10-17'}, sourceTime: {date: '2026-10-17', time: '02:30', timeZone: 'America/Los_Angeles'}};
  const october = buildCalendarModel([pacific], {tracking: {}}, {weekStart: '2026-10-26', selectedDay: '2026-10-31'}).mobileEntries[0];
  const november = buildCalendarModel([pacific], {tracking: {}}, {weekStart: '2026-11-02', selectedDay: '2026-11-07'}).mobileEntries[0];
  assert.equal(october.mexicoTime, '2026-10-31 03:30');
  assert.equal(november.mexicoTime, '2026-11-07 04:30');
});

test('adding an AniList series survives refresh and backup across calendar, dashboard, progress and favorites', async () => {
  const entry = normalizeAniListMedia({id: 987654, title: {english: 'Coherence Show'}, format: 'TV', season: 'FALL', seasonYear: 2026, status: 'RELEASING', startDate: {year: 2026, month: 10, day: 10}, nextAiringEpisode: {episode: 2, airingAt: Date.parse('2026-10-17T02:00:00Z') / 1000}, siteUrl: 'https://anilist.co/anime/987654'});
  let state = saveCatalogEntry(createDefaultState(CATALOG), entry, {platform: 'Crunchyroll'});
  state = applyTrackingPatch(state, entry.id, {seen: 1, favorite: true, status: 'Viendo'}, 100);
  assert.equal(filterProgressEntries(CATALOG, state, {filter: 'favorites'}).some(({entry: item}) => item.id === entry.id), true);
  assert.equal(buildCalendarModel([state.catalogOfficial[entry.id]], state, {weekStart: '2026-10-12', selectedDay: '2026-10-16'}).mobileEntries[0].eventKind, 'japan-airing');
  assert.ok(buildDashboardModel(CATALOG, state, '2026-10-13').upcoming.some((item) => item.id === entry.id));
  const values = new Map();
  const storage = {getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value)};
  saveState(storage, state);
  state = loadState(storage, CATALOG).state;
  const refreshed = await refreshCatalog(state, async () => [{...entry, totalEpisodes: 12, nextAiring: {episode: 3, airingAt: Date.parse('2026-10-24T02:00:00Z') / 1000}}], 200);
  assert.equal(refreshed.state.tracking[entry.id].seen, 1);
  assert.equal(refreshed.state.tracking[entry.id].favorite, true);
  const restored = replaceWithBackup(createBackup(refreshed.state));
  assert.equal(restored.catalogOfficial[entry.id].totalEpisodes, 12);
  assert.equal(restored.tracking[entry.id].seen, 1);
  assert.equal(restored.tracking[entry.id].favorite, true);
});

test('season lookup follows each title instead of hard-coding fall 2026', () => {
  assert.deepEqual(seasonForEntry({premiereDate: '2027-04-12'}), {season: 'SPRING', year: 2027});
  assert.deepEqual(seasonForEntry({season: 'WINTER', seasonYear: 2028}), {season: 'WINTER', year: 2028});
});

test('custom IDs use the browser crypto method without losing its binding', () => {
  assert.match(createCustomId(), /^custom:[a-f0-9-]+$/);
});

test('loading v2.1.1 removes only its artificial end date, preserving sourced interruptions', () => {
  const state = createDefaultState(CATALOG);
  state.catalogOfficial['legacy:verm'].weeklySchedule.endDate = '2026-10-18';
  state.catalogOfficial['legacy:verm'].scheduleEvents.push({date: '2026-10-24', status: 'paused', sources: [{url: 'https://example.test/pause', queriedAt: '2026-10-20T00:00:00Z'}]});
  const values = new Map([['racoon-v2-state', JSON.stringify(state)]]);
  const storage = {getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value)};
  const loaded = loadState(storage, CATALOG).state.catalogOfficial['legacy:verm'];
  assert.equal(loaded.weeklySchedule.endDate, undefined);
  assert.ok(loaded.scheduleEvents.some((event) => event.date === '2026-10-24' && event.status === 'paused'));
});
