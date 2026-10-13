import {stableId} from '../model.mjs';

export const ANILIST_URL = 'https://graphql.anilist.co';
const SEARCH_QUERY = `query($search:String!){Page(page:1,perPage:12){media(search:$search,type:ANIME,isAdult:false){id type format season seasonYear title{romaji english native} synonyms description genres episodes status coverImage{large} startDate{year month day} nextAiringEpisode{episode airingAt} siteUrl}}}`;
const DETAIL_QUERY = `query($id:Int!){Media(id:$id,type:ANIME){id type format season seasonYear title{romaji english native} synonyms description genres episodes status coverImage{large} startDate{year month day} nextAiringEpisode{episode airingAt} siteUrl}}`;
const SEASON_QUERY = `query($season:MediaSeason!,$year:Int!,$page:Int!){Page(page:$page,perPage:50){pageInfo{hasNextPage} media(season:$season,seasonYear:$year,type:ANIME,isAdult:false){id type format season seasonYear title{romaji english native} synonyms description genres episodes status coverImage{large} startDate{year month day} nextAiringEpisode{episode airingAt} siteUrl}}}`;

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function dateFromParts(date) {
  if (!Number.isInteger(date?.year) || !Number.isInteger(date?.month) || !Number.isInteger(date?.day)) return null;
  const value = `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function mediaKind(media) {
  if (media.format === 'MOVIE') return 'movie';
  if (media.format === 'SPECIAL' || media.format === 'OVA' || media.format === 'ONA') return 'special';
  return media.seasonYear ? 'season' : 'series';
}

export function normalizeAniListMedia(media) {
  const title = media.title?.english || media.title?.romaji || media.title?.native || `Anime ${media.id}`;
  const alternativeTitles = [media.title?.romaji, media.title?.native, ...(media.synonyms || [])].filter((value, index, all) => value && value !== title && all.indexOf(value) === index);
  const source = {kind: 'api', name: 'AniList', url: media.siteUrl || `https://anilist.co/anime/${media.id}`};
  // AniList exposes a catalog total, but it is not an official platform
  // publication count for Mexico and may change during split cours.
  const totalConfidence = Number.isInteger(media.episodes) ? 'estimated' : 'unverified';
  const premiereDate = dateFromParts(media.startDate);
  const queriedAt = new Date().toISOString();
  return {
    id: stableId('anilist', media.id),
    sourceId: String(media.id),
    mediaKind: mediaKind(media),
    title,
    alternativeTitles,
    poster: media.coverImage?.large || null,
    synopsis: stripHtml(media.description),
    genres: media.genres || [],
    season: media.season || null,
    seasonYear: media.seasonYear || null,
    premiereDate,
    totalEpisodes: Number.isInteger(media.episodes) ? media.episodes : null,
    totalConfidence,
    airingStatus: media.status || 'UNKNOWN',
    nextAiring: media.nextAiringEpisode ? {episode: media.nextAiringEpisode.episode, airingAt: media.nextAiringEpisode.airingAt} : null,
    sources: [{...source, queriedAt}],
    evidence: {
      title: [{value: title, source, queriedAt, confidence: 'confirmed', status: 'published'}],
      totalEpisodes: [{value: Number.isInteger(media.episodes) ? media.episodes : null, source, queriedAt, confidence: totalConfidence, status: 'published'}],
      premiereDate: [{value: premiereDate, source, queriedAt, confidence: premiereDate ? 'confirmed' : 'unverified', status: 'published'}],
      nextAiring: [{value: media.nextAiringEpisode ? {episode: media.nextAiringEpisode.episode, airingAt: media.nextAiringEpisode.airingAt} : null, source, queriedAt, confidence: media.nextAiringEpisode ? 'estimated' : 'unverified', status: 'announced'}]
    }
  };
}

async function request(query, variables, {fetch, signal, timeoutMs = 12000} = {}) {
  const requester = fetch || globalThis.fetch;
  if (typeof requester !== 'function') throw new Error('AniList no está disponible en este entorno');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener?.('abort', () => controller.abort(), {once: true});
  try {
    const response = await requester(ANILIST_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({query, variables}),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.errors?.length || !payload.data) throw new Error('Respuesta inválida');
    return payload.data;
  } catch (error) {
    throw new Error(`AniList no disponible: ${error.message || error}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function searchAnime(query, options = {}) {
  if (!String(query || '').trim()) return [];
  const data = await request(SEARCH_QUERY, {search: String(query).trim()}, options);
  return (data.Page?.media || []).map(normalizeAniListMedia);
}

export async function fetchAnimeDetails(id, options = {}) {
  const data = await request(DETAIL_QUERY, {id: Number(id)}, options);
  if (!data.Media) throw new Error('AniList no encontró la serie');
  return normalizeAniListMedia(data.Media);
}

export async function fetchSeasonalAnime({season = 'FALL', year = 2026, maxPages = 10, ...options} = {}) {
  const results = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const data = await request(SEASON_QUERY, {season, year, page}, options);
    if (!Array.isArray(data.Page?.media)) throw new Error('Página estacional inválida');
    results.push(...data.Page.media.map(normalizeAniListMedia));
    if (!data.Page.pageInfo?.hasNextPage) return results;
  }
  throw new Error('El catálogo estacional supera el límite de páginas; no se aplicó una actualización parcial');
}

export function seasonForEntry(entry) {
  if (['WINTER', 'SPRING', 'SUMMER', 'FALL'].includes(entry.season) && Number.isInteger(Number(entry.seasonYear))) return {season: entry.season, year: Number(entry.seasonYear)};
  const date = entry.premiereDate || entry.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const month = Number(date.slice(5, 7));
  return {season: ['WINTER', 'SPRING', 'SUMMER', 'FALL'][Math.floor((month - 1) / 3)], year: Number(date.slice(0, 4))};
}

function normalizeTitle(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function matchLegacyAnime(local, candidates = []) {
  if (local.anilistSourceId) return candidates.find((entry) => entry.sourceId === String(local.anilistSourceId)) || null;
  const localNames = [local.title, local.name, ...(local.alternativeTitles || [])].map(normalizeTitle).filter((name) => name.length >= 8);
  const matches = candidates.filter((entry) => {
    if (local.date && entry.premiereDate && Math.abs(Date.parse(`${local.date}T00:00:00Z`) - Date.parse(`${entry.premiereDate}T00:00:00Z`)) > 45 * 86400000) return false;
    const names = [entry.title, ...(entry.alternativeTitles || [])].map(normalizeTitle);
    return localNames.some((name) => names.includes(name));
  });
  return matches.length === 1 ? matches[0] : null;
}
