import {STATUS_VALUES} from './model.mjs';
import {synchronizeMediaLibrary} from './media.mjs';

export const LEGACY_STATE_KEY = 'anime-radar-otono-2026-v1';
export const STATE_KEY = 'racoon-v2-state';
export const STATE_SCHEMA_VERSION = 3;
const MAX_EPISODES = 9999;

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? Math.min(MAX_EPISODES, Math.max(0, number)) : fallback;
}

function optionalInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  return nonNegativeInteger(value, null);
}

function cleanTrackingEntry(raw = {}) {
  const input = objectOrEmpty(raw);
  const status = STATUS_VALUES.includes(input.status) ? input.status : STATUS_VALUES.includes(input.grade) ? input.grade : 'Pendiente';
  const availableOverride = optionalInteger(input.availableOverride ?? input.aired);
  const totalOverride = optionalInteger(input.totalOverride ?? input.total);
  const manualFields = Array.isArray(input.manualFields) ? [...new Set(input.manualFields.filter((field) => ['seen', 'availableOverride', 'totalOverride', 'status'].includes(field)))] : [];
  return {
    seen: nonNegativeInteger(input.seen),
    status,
    favorite: input.favorite === true,
    changedAt: Number.isSafeInteger(Number(input.changedAt)) && Number(input.changedAt) > 0 ? Number(input.changedAt) : 0,
    availableOverride,
    totalOverride,
    manualFields,
    ...(Object.hasOwn(input, 'watchedAt') ? {watchedAt: validDate(input.watchedAt)} : {})
  };
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function createDefaultState(catalog = []) {
  return synchronizeMediaLibrary({
    schemaVersion: STATE_SCHEMA_VERSION,
    catalogOfficial: Object.fromEntries(catalog.filter(Boolean).map((entry) => [entry.id, entry])),
    catalogCustom: {},
    tracking: {},
    preferences: {view: 'home', calendarWeek: null, selectedDay: null, platform: 'all', status: 'all', sort: 'title'},
    sourceCache: {},
    updateMeta: {lastChecked: 0, providers: {}}
  });
}

export function validateState(value) {
  const input = objectOrEmpty(value);
  const state = createDefaultState();
  state.catalogOfficial = objectOrEmpty(input.catalogOfficial);
  state.catalogCustom = objectOrEmpty(input.catalogCustom);
  state.preferences = {...state.preferences, ...objectOrEmpty(input.preferences)};
  state.sourceCache = objectOrEmpty(input.sourceCache);
  state.updateMeta = {...state.updateMeta, ...objectOrEmpty(input.updateMeta)};
  state.mediaLibrary = objectOrEmpty(input.mediaLibrary);
  for (const [id, raw] of Object.entries(objectOrEmpty(input.tracking))) state.tracking[id] = cleanTrackingEntry(raw);
  return synchronizeMediaLibrary(state);
}

export function migrateLegacyTrack(track, catalog = []) {
  const state = createDefaultState(catalog);
  const source = objectOrEmpty(track?.track ?? track);
  for (const [legacyId, raw] of Object.entries(source)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    state.tracking[`legacy:${legacyId}`] = cleanTrackingEntry(raw);
  }
  return state;
}

function parseStorage(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function withCatalog(state, catalog) {
  const next = validateState(state);
  for (const entry of catalog.filter(Boolean)) {
    const stored = next.catalogOfficial[entry.id];
    if (!stored) { next.catalogOfficial[entry.id] = entry; continue; }
    const weeklySchedule = stored.weeklySchedule && entry.weeklySchedule ? {...entry.weeklySchedule, ...stored.weeklySchedule} : stored.weeklySchedule ?? entry.weeklySchedule;
    // v2.1.1 used this date as an artificial visibility cap, not as evidence.
    if (weeklySchedule?.endDate === '2026-10-18' && weeklySchedule.confidence === 'estimated') delete weeklySchedule.endDate;
    const events = new Map((entry.scheduleEvents || []).map((event) => [event.date, event]));
    for (const event of stored.scheduleEvents || []) {
      if (!events.has(event.date) || event.sources?.some((source) => source.queriedAt)) events.set(event.date, event);
    }
    next.catalogOfficial[entry.id] = {
      ...entry,
      ...stored,
      title: entry.title,
      name: entry.name,
      platform: entry.platform,
      weeklySchedule,
      scheduleEvents: [...events.values()],
      scheduleConfidence: entry.id === 'legacy:verm' && stored.scheduleConfidence === 'contradictory' ? 'confirmed' : stored.scheduleConfidence ?? entry.scheduleConfidence,
      episodeCandidates: entry.episodeCandidates ?? stored.episodeCandidates,
      availableEpisodes: stored.availableConfidence === 'estimated' ? entry.availableEpisodes : stored.availableEpisodes,
      availableConfidence: stored.availableConfidence === 'estimated' ? entry.availableConfidence : stored.availableConfidence
    };
  }
  return synchronizeMediaLibrary(next);
}

export function loadState(storage, catalog = []) {
  const stored = parseStorage(storage, STATE_KEY);
  if (stored && typeof stored === 'object' && stored.schemaVersion === STATE_SCHEMA_VERSION) {
    return {state: withCatalog(stored, catalog), migrated: false, repaired: false};
  }
  const legacy = parseStorage(storage, LEGACY_STATE_KEY);
  if (legacy && typeof legacy === 'object') {
    const state = migrateLegacyTrack(legacy, catalog);
    saveState(storage, state);
    return {state, migrated: true, repaired: false};
  }
  return {state: createDefaultState(catalog), migrated: false, repaired: Boolean(stored)};
}

export function saveState(storage, state) {
  const clean = validateState(state);
  try {
    const previous = storage.getItem(STATE_KEY);
    if (previous && !parseStorage(storage, STATE_KEY)?.mediaLibrary?.version) {
      const checkpoint = `${STATE_KEY}:before-media-v1`;
      if (!storage.getItem(checkpoint)) {
        storage.setItem(checkpoint, previous);
        if (storage.getItem(checkpoint) !== previous) return false;
      }
    }
    if (previous) storage.setItem(`${STATE_KEY}:previous`, previous);
    const serialized = JSON.stringify(clean);
    storage.setItem(STATE_KEY, serialized);
    if (storage.getItem(STATE_KEY) !== serialized) {
      if (previous) storage.setItem(STATE_KEY, previous);
      return false;
    }
    return true;
  } catch {
    // The caller keeps the validated in-memory state; quota errors must not erase it.
    return false;
  }
}
