import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState} from '../public/js/storage.mjs';
import {applyTrackingPatch, buildDashboardModel, filterProgressEntries, progressPercentage} from '../public/js/app.mjs';
import {buildCalendarModel} from '../public/js/schedule.mjs';
import {stateToCsv} from '../public/js/backup.mjs';

const movie = {id: 'custom:film', title: 'Mi película', mediaKind: 'movie', premiereDate: '2026-10-17', totalEpisodes: 1, availableEpisodes: 1, weeklySchedule: {frequency: 'weekly', day: 5, startDate: '2026-10-17'}};
const series = {id: 'custom:show', title: 'Serie', mediaKind: 'season', totalEpisodes: 12, availableEpisodes: 3};

test('movies never inflate episode backlog or up-to-date series, even with old episode metadata', () => {
  const state = createDefaultState([movie, series]);
  state.tracking = {[movie.id]: {seen: 0, status: 'Pendiente'}, [series.id]: {seen: 1, status: 'Viendo'}};
  const model = buildDashboardModel([], state, '2026-10-17');
  assert.equal(model.stats.pendingEpisodes, 2);
  assert.equal(model.stats.upToDate, 0);
  assert.equal(model.pending.length, 1);
  assert.equal(progressPercentage(movie, {status: 'Terminada'}), 100);
  assert.equal(progressPercentage(movie, {seen: 1, status: 'Pendiente'}), 0);
});

test('movie progress is a state and viewing date; series progress remains episodic', () => {
  let state = createDefaultState([movie, series]);
  state = applyTrackingPatch(state, movie.id, {status: 'Terminada', watchedAt: '2026-10-17'}, 100);
  assert.equal(filterProgressEntries([], state, {filter: 'finished'})[0].entry.id, movie.id);
  assert.equal(filterProgressEntries([], state, {filter: 'uptodate'}).some(({entry}) => entry.id === movie.id), false);
  assert.equal(filterProgressEntries([], state, {filter: 'pending'}).some(({entry}) => entry.id === movie.id), false);
  assert.equal(filterProgressEntries([], createDefaultState([movie]), {filter: 'pending'}).length, 1);
});

test('movie premieres are single events, with no weekly episodes or next airing', () => {
  const entry = {...movie, nextAiring: {episode: 2, airingAt: Date.parse('2026-10-18T18:00:00Z') / 1000}};
  const first = buildCalendarModel([entry], {}, {weekStart: '2026-10-12'}).days.flatMap(d => d.entries);
  assert.equal(first.length, 1);
  assert.equal(first[0].episodeLabel, 'Estreno de película');
  const next = buildCalendarModel([entry], {}, {weekStart: '2026-10-19'}).days.flatMap(d => d.entries);
  assert.equal(next.length, 0);
});

test('CSV distinguishes movie status and viewing date from episode counts', () => {
  const state = createDefaultState([movie]);
  state.tracking[movie.id] = {status: 'Terminada', watchedAt: '2026-10-17'};
  const csv = stateToCsv(state, [movie]);
  assert.match(csv, /Película/);
  assert.match(csv, /Vista/);
  assert.match(csv, /2026-10-17/);
});
