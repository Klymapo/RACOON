import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCalendarModel} from '../public/js/schedule.mjs';

const catalog = [
  {id: 'legacy:verm', title: 'The Vermilion Mask', date: '2026-10-17', platform: 'Crunchyroll', day: 5, sourceTime: {date: '2026-10-17', time: '03:30', timeZone: 'America/Los_Angeles'}, scheduleConfidence: 'announced'},
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
  assert.equal(event.mexicoTime, '2026-10-17 04:30');
});

test('places an event on the Mexico day after timezone conversion', () => {
  const model = buildCalendarModel([{id: 'legacy:late', title: 'Late LA Show', date: '2026-10-17', platform: 'Crunchyroll', sourceTime: {date: '2026-10-17', time: '23:30', timeZone: 'America/Los_Angeles'}, scheduleConfidence: 'confirmed'}], {tracking: {}}, {weekStart: '2026-10-12', selectedDay: '2026-10-18'});
  assert.equal(model.days.find((day) => day.date === '2026-10-18').entries[0].id, 'legacy:late');
  assert.equal(model.mobileEntries[0].mexicoDate, '2026-10-18');
});
