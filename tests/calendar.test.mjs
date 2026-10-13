import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCalendarModel} from '../public/js/schedule.mjs';
import {CATALOG} from '../public/js/catalog.mjs';

const catalog = [
  {id: 'legacy:verm', title: 'The Vermilion Mask', date: '2026-10-17', platform: 'Crunchyroll', day: 5, sourceTime: {date: '2026-10-17', time: '02:30', timeZone: 'America/Los_Angeles'}, scheduleConfidence: 'announced'},
  {id: 'legacy:other', title: 'Other Show', date: '2026-10-14', platform: 'Netflix', day: 2, scheduleConfidence: 'confirmed'}
];

const state = {tracking: {
  'legacy:verm': {seen: 0, availableOverride: 2, totalOverride: 12, status: 'Pendiente'},
  'legacy:other': {seen: 2, availableOverride: 2, totalOverride: 12, status: 'Al día'}
}};

test('builds a navigable Monday-Sunday week and selected mobile day', () => {
  const model = buildCalendarModel(catalog, state, {weekStart: '2026-10-12', selectedDay: '2026-10-17'});
  assert.equal(model.days.length, 7);
  assert.equal(model.days[0].date, '2026-10-12');
  assert.equal(model.days[6].date, '2026-10-18');
  assert.equal(model.selectedDay, '2026-10-17');
  assert.equal(model.mobileEntries[0].id, 'legacy:verm');
});

test('filters calendar by platform and progress status', () => {
  const model = buildCalendarModel(catalog, state, {weekStart: '2026-10-12', selectedDay: '2026-10-14', platform: 'Netflix', status: 'uptodate'});
  assert.deepEqual(model.days.flatMap((day) => day.entries).map((entry) => entry.id), ['legacy:other']);
  assert.equal(model.mobileEntries[0].confidence, 'confirmed');
});

test('keeps announced status and converts source time to Mexico date/time', () => {
  const model = buildCalendarModel(catalog, state, {weekStart: '2026-10-12', selectedDay: '2026-10-17'});
  const event = model.mobileEntries[0];
  assert.equal(event.confidence, 'announced');
  assert.equal(event.statusLabel, 'Anunciado');
  assert.equal(event.mexicoDate, '2026-10-17');
  assert.equal(event.mexicoTime, '2026-10-17 03:30');
});

test('places an event on the Mexico day after timezone conversion', () => {
  const model = buildCalendarModel([{id: 'legacy:late', title: 'Late LA Show', date: '2026-10-17', platform: 'Crunchyroll', sourceTime: {date: '2026-10-17', time: '23:30', timeZone: 'America/Los_Angeles'}, scheduleConfidence: 'confirmed'}], {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-18'});
  assert.equal(model.days.find((day) => day.date === '2026-10-18').entries[0].id, 'legacy:late');
  assert.equal(model.mobileEntries[0].mexicoDate, '2026-10-18');
});

test('projects only a bounded weekly slot after the initial premiere date', () => {
  const model = buildCalendarModel([{id: 'legacy:weekly', title: 'Weekly Show', date: '2026-10-10', day: 5, platform: 'Crunchyroll', scheduleConfidence: 'announced', weeklySchedule: {frequency: 'weekly', day: 5, startDate: '2026-10-10', endDate: '2026-10-18'}}], {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-17'});
  assert.equal(model.mobileEntries[0].id, 'legacy:weekly');
  assert.equal(model.mobileEntries[0].mexicoDate, '2026-10-17');
  assert.equal(model.mobileEntries[0].statusLabel, 'Previsto');
  assert.equal(model.mobileEntries[0].episodeLabel, 'Episodio pendiente de verificar');
});

test('does not project weekly episodes after a finished season', () => {
  const model = buildCalendarModel([{id: 'legacy:finished', title: 'Finished Show', date: '2026-10-01', day: 3, kind: 'Finalizada'}], {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-15'});
  assert.equal(model.mobileEntries.length, 0);
});

test('The Vermilion Mask slot is 02:30 PT and 03:30 in Mexico City', () => {
  const entry = CATALOG.find(({id}) => id === 'legacy:verm');
  const model = buildCalendarModel([entry], {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-17'});
  assert.equal(entry.scheduleEvents[0].sourceTime.time, '02:30');
  assert.equal(model.mobileEntries[0].mexicoTime, '2026-10-17 03:30');
  assert.equal(model.mobileEntries[0].statusLabel, 'Contradictorio');
});

test('the original weekly timetable ends with the published source week', () => {
  const upcoming = buildCalendarModel(CATALOG, {tracking: {}}, {weekStart: '2026-10-19', selectedDay: '2026-10-24'});
  assert.equal(upcoming.days.flatMap(({entries}) => entries).filter(({id}) => id.startsWith('legacy:')).length, 0);
  const current = buildCalendarModel(CATALOG, {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-17'});
  assert.equal(current.days[5].entries.find(({id}) => id === 'legacy:saint').statusLabel, 'Previsto');
});

test('AniList premieres and next Japanese airings enter the Mexico calendar without claiming Mexican streaming', () => {
  const nextEpoch = Date.parse('2026-10-18T02:00:00Z');
  const entry = {id: 'anilist:4321', title: 'Added Series', premiereDate: '2026-10-14', nextAiring: {episode: 3, airingAt: nextEpoch / 1000}, sources: [{kind: 'api', url: 'https://anilist.co/anime/4321'}]};
  const model = buildCalendarModel([entry], {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-17'});
  assert.equal(model.days[2].entries[0].episodeLabel, 'Estreno japonés · fecha AniList');
  assert.equal(model.mobileEntries[0].mexicoTime, '2026-10-17 20:00');
  assert.match(model.mobileEntries[0].platformLabel, /Japón|japonesa/);
  assert.equal(model.mobileEntries[0].statusLabel, 'Previsto');
  const withPlatform = buildCalendarModel([{...entry, platform: 'Crunchyroll'}], {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-17', platform: 'Crunchyroll'});
  assert.equal(withPlatform.mobileEntries.length, 0);
});
