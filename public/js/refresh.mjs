import {validateState} from './storage.mjs';

export const FOUR_HOURS = 4 * 60 * 60 * 1000;

export function shouldRefresh(updateMeta = {}, now = Date.now()) {
  return !Number.isFinite(Number(updateMeta.lastChecked)) || Number(updateMeta.lastChecked) <= 0 || now - Number(updateMeta.lastChecked) >= FOUR_HOURS;
}

function copyState(state) {
  return validateState(JSON.parse(JSON.stringify(state)));
}

export async function refreshCatalog(state, loader, now = Date.now()) {
  const next = copyState(state);
  try {
    const entries = await loader();
    if (!Array.isArray(entries)) throw new Error('Respuesta de catálogo inválida');
    for (const entry of entries.filter((item) => item?.id)) next.catalogOfficial[entry.id] = entry;
    next.updateMeta = {...next.updateMeta, lastChecked: now, providers: {...next.updateMeta.providers, catalog: {status: 'completed', lastChecked: now, error: null}}};
    return {state: next, status: 'completed', entries: entries.length};
  } catch (error) {
    next.updateMeta = {...next.updateMeta, providers: {...next.updateMeta.providers, catalog: {status: 'failed', lastChecked: next.updateMeta.providers?.catalog?.lastChecked || 0, error: String(error.message || error)}}};
    return {state: next, status: 'failed', error: true};
  }
}
