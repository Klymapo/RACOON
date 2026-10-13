import {migrateLegacyTrack, validateState} from './storage.mjs';

const BACKUP_SCHEMA_VERSION = 3;
const VALID_ID = /^(?:legacy|anilist|custom):[A-Za-z0-9._-]+$/;

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceState(input) {
  if (input?.state && typeof input.state === 'object') return input.state;
  if (input?.track && typeof input.track === 'object') return migrateLegacyTrack(input.track);
  if (input?.schemaVersion === BACKUP_SCHEMA_VERSION) return input;
  return migrateLegacyTrack(input);
}

function countState(state) {
  return {
    series: Object.keys(state.catalogOfficial).length + Object.keys(state.catalogCustom).length,
    official: Object.keys(state.catalogOfficial).length,
    custom: Object.keys(state.catalogCustom).length,
    tracking: Object.keys(state.tracking).length
  };
}

function sanitizeState(state) {
  const clean = validateState(state);
  const invalid = [];
  for (const layer of ['catalogOfficial', 'catalogCustom', 'tracking']) {
    for (const id of Object.keys(clean[layer])) {
      if (!VALID_ID.test(id)) {
        invalid.push(id);
        delete clean[layer][id];
      }
    }
  }
  return {state: clean, invalid};
}

export function createBackup(state, exportedAt = new Date().toISOString()) {
  const clean = validateState(state);
  return {
    format: 'racoon-backup',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    catalogOfficial: clone(clean.catalogOfficial),
    catalogCustom: clone(clean.catalogCustom),
    tracking: clone(clean.tracking),
    preferences: clone(clean.preferences),
    sourceCache: clone(clean.sourceCache),
    updateMeta: clone(clean.updateMeta)
  };
}

export function parseBackup(input) {
  const candidate = sourceState(objectOrEmpty(input));
  const {state, invalid} = sanitizeState(candidate);
  return {
    valid: invalid.length === 0,
    version: Number(input?.schemaVersion || input?.version || 1),
    exportedAt: input?.exportedAt || null,
    state,
    counts: countState(state),
    invalidRecords: invalid.length,
    conflicts: []
  };
}

export function mergeBackup(current, incoming) {
  const base = validateState(current);
  const next = parseBackup(incoming).state;
  base.catalogOfficial = {...base.catalogOfficial, ...next.catalogOfficial};
  base.catalogCustom = {...base.catalogCustom, ...next.catalogCustom};
  for (const [id, value] of Object.entries(next.tracking)) {
    const previous = base.tracking[id];
    if (!previous || Number(value.changedAt) >= Number(previous.changedAt)) base.tracking[id] = value;
  }
  base.preferences = {...base.preferences, ...next.preferences};
  base.sourceCache = {...base.sourceCache, ...next.sourceCache};
  base.updateMeta = {...base.updateMeta, ...next.updateMeta};
  return base;
}

export function replaceWithBackup(incoming) {
  return parseBackup(incoming).state;
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function stateToCsv(state, catalog = []) {
  const current = validateState(state);
  const rows = [['ID', 'Título', 'Episodios vistos', 'Episodios disponibles', 'Total', 'Estado', 'Favorito', 'Último cambio']];
  for (const entry of catalog) {
    const track = current.tracking[entry.id] || {};
    rows.push([
      entry.id,
      entry.title || entry.name || 'Sin título',
      track.seen || 0,
      track.availableOverride ?? '',
      track.totalOverride ?? '',
      track.status || 'Pendiente',
      track.favorite ? 'Sí' : 'No',
      track.changedAt || ''
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
