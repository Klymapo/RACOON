import {createCustomId} from './model.mjs';

export const isMovie = (entry) => entry?.mediaKind === 'movie';
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const internalId = (kind) => `${kind}:${createCustomId().slice(7)}`;
const validId = (value, kind) => typeof value === 'string' && new RegExp(`^${kind}:[A-Za-z0-9._-]+$`).test(value);

// Catalog and tracking remain authoritative. This index stores identities and
// relationships, never a second copy of personal progress.
export function synchronizeMediaLibrary(state) {
  const previous = object(state.mediaLibrary);
  const oldLinks = object(previous.catalogLinks);
  const oldWorks = object(previous.works);
  const oldSeasons = object(previous.seasons);
  const oldEpisodes = object(previous.episodes);
  const library = {version: 1, works: {}, seasons: {}, episodes: {}, catalogLinks: {}};
  const entries = Object.values({...object(state.catalogOfficial), ...object(state.catalogCustom)});
  for (const entry of entries) {
    if (!entry?.id) continue;
    const old = object(oldLinks[entry.id]);
    const kind = isMovie(entry) ? 'movie' : 'series';
    const candidate = entry.workId || old.workId;
    const compatible = validId(candidate, 'work') && oldWorks[candidate]?.kind === kind;
    const workId = compatible ? candidate : internalId('work');
    const work = library.works[workId] || {
      id: workId, kind, title: entry.title || entry.name || 'Sin título',
      durationMinutes: kind === 'movie' ? count(entry.durationMinutes) : null,
      catalogIds: [], sourceIds: []
    };
    work.catalogIds.push(entry.id);
    if (entry.sourceId) work.sourceIds.push({provider: entry.id.split(':')[0], id: String(entry.sourceId)});
    library.works[workId] = work;
    let seasonId = null;
    if (kind === 'series') {
      // One catalog entry represents a season until a user explicitly links it.
      // FALL/SPRING are release seasons, not season numbers of a TV series.
      seasonId = validId(old.seasonId, 'season') && !library.seasons[old.seasonId] ? old.seasonId : internalId('season');
      library.seasons[seasonId] = {
        id: seasonId, workId, catalogId: entry.id,
        number: count(entry.seasonNumber) ?? count(oldSeasons[seasonId]?.number),
        title: entry.title || entry.name || 'Sin título',
        totalEpisodes: count(entry.totalEpisodes), availableEpisodes: count(entry.availableEpisodes)
      };
      // Only explicitly supplied episode records become entities. A total of
      // twelve episodes is not evidence for twelve known/published episodes.
      const supplied = Array.isArray(entry.episodes) ? entry.episodes : [];
      const known = Object.values(oldEpisodes).filter(ep => ep?.seasonId === seasonId);
      const byNumber = new Map([...known, ...supplied].filter(ep => count(ep?.number) > 0).map(ep => [ep.number, ep]));
      for (const episode of byNumber.values()) {
        const existing = known.find(ep => ep.number === episode.number);
        const id = validId(existing?.id, 'episode') ? existing.id : internalId('episode');
        library.episodes[id] = {...episode, id, seasonId};
      }
    }
    library.catalogLinks[entry.id] = {workId, seasonId};
  }
  return {...state, mediaLibrary: library};
}

export function attachSeason(state, entryId, workId, seasonNumber = null) {
  const current = synchronizeMediaLibrary(state);
  const layer = Object.hasOwn(current.catalogCustom, entryId) ? 'catalogCustom' : 'catalogOfficial';
  const entry = current[layer][entryId];
  if (!entry || isMovie(entry)) throw new Error('Una película no puede vincularse como temporada');
  if (current.mediaLibrary.works[workId]?.kind !== 'series') throw new Error('Obra de serie no encontrada');
  if (seasonNumber !== null && count(seasonNumber) === null) throw new Error('Número de temporada inválido');
  return synchronizeMediaLibrary({...current, [layer]: {...current[layer], [entryId]: {...entry, workId, seasonNumber}}});
}

export function getMediaProgress(state, entityId) {
  const current = synchronizeMediaLibrary(state);
  const library = current.mediaLibrary;
  const work = library.works[entityId];
  if (work?.kind === 'movie') {
    const tracking = current.tracking?.[work.catalogIds[0]] || {};
    return {kind: 'movie', status: tracking.status === 'Terminada' ? 'Vista' : tracking.status || 'Pendiente', watchedAt: tracking.watchedAt || null, favorite: tracking.favorite === true};
  }
  const seasons = Object.values(library.seasons).filter(season => season.workId === entityId || season.id === entityId).map(season => ({
    id: season.id, number: season.number, catalogId: season.catalogId,
    seen: current.tracking?.[season.catalogId]?.seen || 0,
    status: current.tracking?.[season.catalogId]?.status || 'Pendiente'
  }));
  return {kind: 'series', seasons};
}
