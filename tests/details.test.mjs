import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLibraryCard, renderWorkDetail} from '../public/js/detail-ui.mjs';

const show = {id: 'custom:show', title: 'Una historia', mediaKind: 'season', totalEpisodes: 12, availableEpisodes: 4, synopsis: 'Un misterio.', platform: 'Prime Video', sources: [{name: 'Fuente', url: 'https://example.org/show', queriedAt: '2026-10-17T12:00:00Z'}]};

test('compact cards summarize progress and expose only a detail-opening action', () => {
  const card = renderLibraryCard(show, {seen: 2, status: 'Viendo', favorite: true});
  assert.match(card, /2 vistos/);
  assert.match(card, /4 disponibles/);
  assert.match(card, /2 pendientes/);
  assert.match(card, /12 total/);
  assert.match(card, /data-open-detail="custom:show"/);
  assert.doesNotMatch(card, /<input|<select|data-progress-action|data-series-delete/);
});

test('unknown episode counts remain unknown and progress editing belongs to the detail', () => {
  const entry = {...show, totalEpisodes: null, availableEpisodes: null};
  const card = renderLibraryCard(entry, {seen: 2});
  assert.match(card, /\? disponibles/);
  assert.match(card, /\? pendientes/);
  const detail = renderWorkDetail(entry, {seen: 2, manualFields: []});
  assert.match(detail, /data-progress-field="seen"/);
  assert.match(detail, /data-progress-action="plus"/);
  assert.match(detail, /data-close-detail/);
});

test('universal movie detail has viewing status/date without episode controls', () => {
  const detail = renderWorkDetail({...show, mediaKind: 'movie', durationMinutes: 95}, {status: 'Terminada', watchedAt: '2026-10-17'});
  assert.match(detail, /Vista/);
  assert.match(detail, /95 min/);
  assert.match(detail, /data-progress-field="watchedAt"/);
  assert.doesNotMatch(detail, /data-progress-field="seen"|data-progress-action="plus"/);
});

test('detail escapes catalog text, rejects unsafe sources and labels regional uncertainty', () => {
  const detail = renderWorkDetail({...show, title: '<img onerror="alert(1)">', synopsis: '<script>attack()</script>', sources: [{url: 'javascript:alert(1)'}, show.sources[0]]}, {});
  assert.doesNotMatch(detail, /<script>|href="javascript:/);
  assert.match(detail, /&lt;script&gt;/);
  assert.match(detail, /https:\/\/example.org\/show/);
  assert.match(detail, /sin verificar/i);
});
