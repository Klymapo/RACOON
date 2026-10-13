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
    const status = entries.length ? 'completed' : 'no-update';
    next.updateMeta = {...next.updateMeta, lastChecked: now, providers: {...next.updateMeta.providers, catalog: {status, lastChecked: now, error: null}}};
    return {state: next, status, entries: entries.length};
  } catch (error) {
    next.updateMeta = {...next.updateMeta, lastChecked: now, providers: {...next.updateMeta.providers, catalog: {status: 'failed', lastChecked: now, error: String(error.message || error)}}};
    return {state: next, status: 'failed', error: true};
  }
}
