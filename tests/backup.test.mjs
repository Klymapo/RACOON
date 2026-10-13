import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../public/js/catalog.mjs';
import {createDefaultState} from '../public/js/storage.mjs';
import {
  createBackup,
  parseBackup,
  mergeBackup,
  replaceWithBackup,
  stateToCsv
} from '../public/js/backup.mjs';

function sampleState() {
  const state = createDefaultState(CATALOG.slice(0, 2));
  state.tracking['legacy:fx'] = {seen: 2, status: 'Viendo', favorite: true, changedAt: 200, availableOverride: null, totalOverride: null, manualFields: []};
  state.catalogCustom['custom:demo'] = {id: 'custom:demo', title: 'Title, with "quote"', mediaKind: 'special'};
  state.preferences.view = 'progress';
  return state;
}

test('creates and previews a complete schema-v3 backup without mutation', () => {
  const state = sampleState();
  const backup = createBackup(state, '2026-10-13T12:00:00.000Z');
  const preview = parseBackup(backup);
  assert.equal(backup.schemaVersion, 3);
  assert.equal(backup.exportedAt, '2026-10-13T12:00:00.000Z');
  assert.equal(preview.valid, true);
  assert.equal(preview.counts.series, 3);
  assert.equal(preview.counts.tracking, 1);
  assert.equal(preview.state.preferences.view, 'progress');
  assert.equal(state.preferences.view, 'progress');
});

test('imports direct v1 and existing v2 JSON formats', () => {
  const legacy = {fx: {seen: 1, grade: 'Viendo', favorite: true, changedAt: 20}};
  const v1 = parseBackup(legacy);
  const v2 = parseBackup({version: 2, exportedAt: '2026-10-13T00:00:00Z', track: legacy});
  assert.equal(v1.valid, true);
  assert.equal(v2.valid, true);
  assert.equal(v1.state.tracking['legacy:fx'].seen, 1);
  assert.equal(v2.state.tracking['legacy:fx'].favorite, true);
});

test('merge keeps newer personal data and adds incoming custom data', () => {
  const current = sampleState();
  const incoming = sampleState();
  incoming.tracking['legacy:fx'].seen = 1;
  incoming.tracking['legacy:fx'].changedAt = 100;
  incoming.catalogCustom['custom:new'] = {id: 'custom:new', title: 'New show', mediaKind: 'season'};
  const merged = mergeBackup(current, createBackup(incoming, '2026-10-14T00:00:00Z'));
  assert.equal(merged.tracking['legacy:fx'].seen, 2);
  assert.ok(merged.catalogCustom['custom:new']);
});

test('replacement is explicit and CSV escapes user titles', () => {
  const incoming = sampleState();
  const replaced = replaceWithBackup(createBackup(incoming));
  assert.equal(replaced.preferences.view, 'progress');
  const csv = stateToCsv(incoming, Object.values(incoming.catalogOfficial).concat(Object.values(incoming.catalogCustom)));
  assert.match(csv, /"Title, with ""quote"""/);
  const invalid = parseBackup({schemaVersion: 3, tracking: {'invalid id': {seen: 1}}, catalogOfficial: {}});
  assert.equal(invalid.valid, false);
  assert.equal(invalid.invalidRecords, 1);
});

test('unrelated or empty JSON cannot silently replace a personal library', () => {
  assert.throws(() => parseBackup({}), /respaldo/i);
  assert.throws(() => parseBackup({hello: 'world'}), /respaldo/i);
  assert.throws(() => replaceWithBackup({}), /respaldo/i);
});

test('merging a v1 backup retains local preferences and does not discard favorites', () => {
  const current = sampleState();
  current.preferences.view = 'calendar';
  const imported = parseBackup({fx: {seen: 3, favorite: true, changedAt: 300}});
  const merged = mergeBackup(current, imported);
  assert.equal(merged.preferences.view, 'calendar');
  assert.equal(merged.tracking['legacy:fx'].seen, 3);
  assert.equal(merged.tracking['legacy:fx'].favorite, true);
});
