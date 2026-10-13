import {validateState} from './storage.mjs';

export const FOUR_HOURS = 4 * 60 * 60 * 1000;

export function shouldRefresh(updateMeta = {}, now = Date.now()) {
  return !Number.isFinite(Number(updateMeta.lastChecked)) || Number(updateMeta.lastChecked) <= 0 || now - Number(updateMeta.lastChecked) >= FOUR_HOURS;
}

function copyState(state) {
  return validateState(JSON.parse(JSON.stringify(state)));
}

export function mergeCatalogObservation(previous = {}, incoming = {}) {
  const protectedFields = new Set(previous.manualCatalogFields || []);
  const merged = {...previous, ...incoming};
  for (const field of protectedFields) merged[field] = previous[field];
  for (const [field, value] of Object.entries(incoming)) {
    if (value == null && previous[field] != null && field !== 'nextAiring') merged[field] = previous[field];
  }
  for (const field of ['platform', 'platforms', 'regionalAvailability', 'regionalAvailabilityConfidence', 'weeklySchedule', 'scheduleEvents', 'availableEpisodes', 'availableConfidence']) {
    if (!(field in incoming) && field in previous) merged[field] = previous[field];
  }
  merged.manualCatalogFields = [...protectedFields];
  merged.sources = [...new Map([...(previous.sources || []), ...(incoming.sources || [])].filter((source) => source?.url).map((source) => [source.url, source])).values()];
  merged.evidence = {...(previous.evidence || {}), ...(incoming.evidence || {})};
  return merged;
}

export async function refreshCatalog(state, loader, now = Date.now()) {
  const next = copyState(state);
  try {
    const loaded = await loader();
    const entries = Array.isArray(loaded) ? loaded : loaded?.entries;
    if (!Array.isArray(entries)) throw new Error('Respuesta de catálogo inválida');
    let changes = 0;
    for (const entry of entries.filter((item) => item?.id)) {
      const previous = next.catalogOfficial[entry.id];
      const merged = mergeCatalogObservation(previous, entry);
      if (JSON.stringify({...previous, sources: null, evidence: null}) !== JSON.stringify({...merged, sources: null, evidence: null})) changes += 1;
      next.catalogOfficial[entry.id] = merged;
    }
    const status = loaded?.incomplete ? 'partial' : changes ? 'completed' : 'no-update';
    next.updateMeta = {...next.updateMeta, lastChecked: now, providers: {...next.updateMeta.providers, catalog: {status, lastChecked: now, error: null}}};
    return {state: next, status, entries: entries.length};
  } catch (error) {
    next.updateMeta = {...next.updateMeta, lastChecked: now, providers: {...next.updateMeta.providers, catalog: {status: 'failed', lastChecked: now, error: String(error.message || error)}}};
    return {state: next, status: 'failed', error: true};
  }
}
