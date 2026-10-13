import {stableId} from '../model.mjs';

export const ANILIST_URL = 'https://graphql.anilist.co';
const SEARCH_QUERY = `query($search:String!){Page(page:1,perPage:12){media(search:$search,type:ANIME,isAdult:false){id type format season seasonYear title{romaji english native} synonyms description genres episodes status coverImage{large} startDate{year month day} nextAiringEpisode{episode airingAt} siteUrl}}}`;
const DETAIL_QUERY = `query($id:Int!){Media(id:$id,type:ANIME){id type format season seasonYear title{romaji english native} synonyms description genres episodes status coverImage{large} startDate{year month day} nextAiringEpisode{episode airingAt} siteUrl}}`;

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function dateFromParts(date) {
  if (!date?.year) return null;
  return `${String(date.year).padStart(4, '0')}-${String(date.month || 1).padStart(2, '0')}-${String(date.day || 1).padStart(2, '0')}`;
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
  const totalConfidence = Number.isInteger(media.episodes) ? 'confirmed' : 'unverified';
  const premiereDate = dateFromParts(media.startDate);
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
    airingStatus: media.status || 'UNKNOWN',
    nextAiring: media.nextAiringEpisode ? {episode: media.nextAiringEpisode.episode, airingAt: media.nextAiringEpisode.airingAt} : null,
    sources: [source],
    evidence: {
      title: [{value: title, source, confidence: 'confirmed', status: 'published'}],
      totalEpisodes: [{value: Number.isInteger(media.episodes) ? media.episodes : null, source, confidence: totalConfidence, status: 'published'}],
      premiereDate: [{value: premiereDate, source, confidence: premiereDate ? 'confirmed' : 'unverified', status: 'published'}]
    }
  };
}

async function request(query, variables, {fetch, signal, timeoutMs = 12000} = {}) {
  const requester = fetch || globalThis.fetch;
  if (typeof requester !== 'function') throw new Error('AniList no está disponible en este entorno');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await requester(ANILIST_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify({query, variables}),
      signal: signal || controller.signal
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
