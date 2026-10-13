import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAniListMedia, searchAnime, fetchAnimeDetails, fetchSeasonalAnime} from '../public/js/providers/anilist.mjs';
import {saveCatalogEntry} from '../public/js/app.mjs';
import {createDefaultState} from '../public/js/storage.mjs';

const media = {
  id: 123,
  type: 'ANIME',
  format: 'TV',
  season: 'SPRING',
  seasonYear: 2026,
  title: {romaji: 'Sousou no Frieren', english: 'Frieren: Beyond Journey\'s End', native: '葬送のフリーレン'},
  synonyms: ['Frieren'],
  description: '<p>Una maga viaja después de la aventura.</p>',
  genres: ['Adventure', 'Fantasy'],
  episodes: null,
  status: 'RELEASING',
  coverImage: {large: 'https://img.example/frieren.jpg'},
  startDate: {year: 2026, month: 4, day: 3},
  nextAiringEpisode: {episode: 4, airingAt: 1796400000},
  siteUrl: 'https://anilist.co/anime/123'
};

function response(payload) {
  return {ok: true, json: async () => payload};
}

test('normalizes AniList media with a permanent ID and unverified missing total', () => {
  const entry = normalizeAniListMedia(media);
  assert.equal(entry.id, 'anilist:123');
  assert.equal(entry.mediaKind, 'season');
  assert.equal(entry.title, "Frieren: Beyond Journey's End");
  assert.deepEqual(entry.alternativeTitles, ['Sousou no Frieren', '葬送のフリーレン', 'Frieren']);
  assert.equal(entry.totalEpisodes, null);
  assert.equal(entry.sources[0].url, 'https://anilist.co/anime/123');
  assert.equal(entry.evidence.totalEpisodes[0].confidence, 'unverified');
});

test('search sends only public AniList GraphQL fields and normalizes results', async () => {
  let request;
  const fetch = async (url, options) => { request = {url, options}; return response({data: {Page: {media: [media]}}}); };
  const results = await searchAnime('Frieren', {fetch});
  assert.equal(results[0].id, 'anilist:123');
  assert.equal(request.url, 'https://graphql.anilist.co');
  assert.equal(request.options.headers.Authorization, undefined);
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.match(request.options.body, /Frieren/);
});

test('detail lookup and network failure are explicit', async () => {
  const details = await fetchAnimeDetails(123, {fetch: async () => response({data: {Media: media}})});
  assert.equal(details.id, 'anilist:123');
  await assert.rejects(() => searchAnime('x', {fetch: async () => { throw new Error('offline'); }}), /AniList/);
});

test('seasonal refresh uses one public query without credentials', async () => {
  let request;
  const results = await fetchSeasonalAnime({season: 'FALL', year: 2026, fetch: async (url, options) => {
    request = {url, options};
    return response({data: {Page: {media: [media]}}});
  }});
  assert.equal(results[0].id, 'anilist:123');
  assert.equal(request.options.headers.Authorization, undefined);
  assert.match(request.options.body, /FALL/);
  assert.match(request.options.body, /2026/);
});

test('saves a result with missing fields by permanent ID without duplicating it', () => {
  const state = createDefaultState();
  const entry = normalizeAniListMedia({...media, episodes: null});
  const saved = saveCatalogEntry(state, entry, {platforms: [], regionalAvailability: null});
  assert.ok(saved.catalogOfficial['anilist:123']);
  assert.equal(saved.catalogOfficial['anilist:123'].totalEpisodes, null);
  assert.equal(Object.keys(saved.catalogOfficial).length, 1);
});
