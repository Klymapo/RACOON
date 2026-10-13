import test from 'node:test';
import assert from 'node:assert/strict';
import {
  zonedDateTimeToEpoch,
  formatInTimeZone
} from '../public/js/time.mjs';
import {
  resolveFieldObservations,
  resolveEpisodeAvailability
} from '../public/js/evidence.mjs';
import {scheduleEvent} from '../public/js/schedule.mjs';
import {stableId, normalizeLegacyCatalog} from '../public/js/model.mjs';

test('converts source wall-clock times through DST into Mexico time', () => {
  const before = zonedDateTimeToEpoch('2026-03-08', '01:30', 'America/Los_Angeles');
  const after = zonedDateTimeToEpoch('2026-03-08', '03:30', 'America/Los_Angeles');
  assert.equal(formatInTimeZone(before, 'America/Mexico_City', 'en-CA'), '2026-03-08 03:30');
  assert.equal(formatInTimeZone(after, 'America/Mexico_City', 'en-CA'), '2026-03-08 04:30');
});

test('marks incompatible field observations as contradictory and preserves candidates', () => {
  const result = resolveFieldObservations([
    {value: 12, field: 'seasonTotal', confidence: 'confirmed', status: 'published', source: {kind: 'official', url: 'https://official.example/verm'}, queriedAt: '2026-10-13T00:00:00Z'},
    {value: 13, field: 'seasonTotal', confidence: 'confirmed', status: 'published', source: {kind: 'platform', url: 'https://platform.example/verm'}, queriedAt: '2026-10-13T01:00:00Z'}
  ]);
  assert.equal(result.value, null);
  assert.equal(result.confidence, 'contradictory');
  assert.deepEqual(result.candidates, [12, 13]);
});

test('The Vermilion Mask does not confirm episode 2 or 3 when sources disagree', () => {
  const result = resolveEpisodeAvailability([
    {episode: 1, airDate: '2026-10-10', confidence: 'confirmed', status: 'published', source: {kind: 'official', url: 'https://the-vermilion-mask.com/en/news/contents/article_l8njwjhk7pkt85jr.html'}},
    {episode: 2, airDate: '2026-10-17', confidence: 'confirmed', status: 'published', source: {kind: 'secondary', url: 'https://guide.example/verm-2'}},
    {episode: 3, airDate: '2026-10-17', confidence: 'confirmed', status: 'published', source: {kind: 'platform', url: 'https://www.crunchyroll.com/es/news/seasonal-lineup/2026/10/11/crunchyroll-calendario-semanal-otono-2026'}}
  ]);
  assert.equal(result.available, null);
  assert.equal(result.confidence, 'contradictory');
  assert.deepEqual(result.candidates, [2, 3]);
  assert.match(result.reason, /contradic/i);
});

test('does not count announced or scheduled episodes as published', () => {
  const result = scheduleEvent({
    published: [{episode: 1, at: '2026-10-10T00:00:00Z'}],
    announced: [{episode: 2, at: '2026-10-17T00:00:00Z'}],
    scheduled: [{episode: 3, at: '2026-10-24T00:00:00Z'}]
  }, Date.parse('2026-10-13T00:00:00Z'));
  assert.equal(result.available, 1);
  assert.equal(result.next.episode, 2);
  assert.equal(result.next.status, 'announced');
  assert.equal(result.confidence, 'confirmed');
});

test('normalizes stable source and legacy identifiers without title deduplication', () => {
  assert.equal(stableId('anilist', 123), 'anilist:123');
  assert.equal(stableId('custom', 'abc'), 'custom:abc');
  const entries = normalizeLegacyCatalog([
    {id: 'verm', name: 'The Vermilion Mask', platform: 'Crunchyroll', date: '2026-10-10', kind: 'Estreno'},
    {id: 'verm-2', name: 'The Vermilion Mask', platform: 'Crunchyroll', date: '2027-04-01', kind: 'Continuación'}
  ]);
  assert.deepEqual(entries.map((entry) => entry.id), ['legacy:verm', 'legacy:verm-2']);
  assert.notEqual(entries[0].id, entries[1].id);
});
