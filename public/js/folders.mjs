import {createCustomId} from './model.mjs';

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const valid = (value, prefix) => new RegExp(`^${prefix}:[A-Za-z0-9._-]+$`).test(value);
const nameOf = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export function normalizeCollections(value) {
  const input = object(value);
  const result = {version: 1, folders: {}, memberships: {}};
  for (const [id, raw] of Object.entries(object(input.folders))) {
    const folder = object(raw);
    const name = nameOf(folder.name);
    if (!valid(id, 'folder') || !name || name.length > 80) continue;
    result.folders[id] = {id, name, rank: integer(folder.rank), changedAt: integer(folder.changedAt), trashedAt: folder.trashedAt == null ? null : integer(folder.trashedAt)};
  }
  for (const [workId, memberships] of Object.entries(object(input.memberships))) {
    if (!valid(workId, 'work')) continue;
    const clean = {};
    for (const [folderId, raw] of Object.entries(object(memberships))) {
      if (!result.folders[folderId]) continue;
      clean[folderId] = {assigned: raw?.assigned === true, changedAt: integer(raw?.changedAt)};
    }
    result.memberships[workId] = clean;
  }
  return result;
}

export function listFolders(state, trashed = false) {
  return Object.values(normalizeCollections(state.collections).folders).filter(folder => (folder.trashedAt !== null) === trashed).sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}
function named(state, name, except = null) {
  const clean = nameOf(name);
  if (!clean || clean.length > 80) throw new Error('Usa un nombre de 1 a 80 caracteres.');
  if (listFolders(state).some(folder => folder.id !== except && folder.name.toLocaleLowerCase('es') === clean.toLocaleLowerCase('es'))) throw new Error('Ya existe una carpeta con ese nombre. Renombra la carpeta activa primero.');
  return clean;
}
function changeFolder(state, id, patch) {
  const collections = normalizeCollections(state.collections);
  if (!collections.folders[id]) throw new Error('Carpeta no encontrada.');
  collections.folders[id] = {...collections.folders[id], ...patch};
  return {...state, collections};
}
export function createFolder(state, name, now = Date.now()) {
  const clean = named(state, name);
  const collections = normalizeCollections(state.collections);
  const id = `folder:${createCustomId().slice(7)}`;
  const rank = Math.max(-1, ...listFolders(state).map(folder => folder.rank)) + 1;
  collections.folders[id] = {id, name: clean, rank, changedAt: integer(now), trashedAt: null};
  return {...state, collections};
}
export function renameFolder(state, id, name, now = Date.now()) {
  return changeFolder(state, id, {name: named(state, name, id), changedAt: integer(now)});
}
export function moveFolder(state, id, direction, now = Date.now()) {
  const folders = listFolders(state);
  const index = folders.findIndex(folder => folder.id === id);
  const target = index + direction;
  if (![-1, 1].includes(direction) || index < 0 || target < 0 || target >= folders.length) return state;
  [folders[index], folders[target]] = [folders[target], folders[index]];
  const collections = normalizeCollections(state.collections);
  folders.forEach((folder, rank) => { if (folder.rank !== rank) collections.folders[folder.id] = {...folder, rank, changedAt: integer(now)}; });
  return {...state, collections};
}
export function trashFolder(state, id, now = Date.now()) {
  return changeFolder(state, id, {trashedAt: integer(now), changedAt: integer(now)});
}
export function restoreFolder(state, id, now = Date.now()) {
  const folder = normalizeCollections(state.collections).folders[id];
  if (!folder) throw new Error('Carpeta no encontrada.');
  named(state, folder.name, id);
  return changeFolder(state, id, {trashedAt: null, changedAt: integer(now), rank: Math.max(-1, ...listFolders(state).map(item => item.rank)) + 1});
}
export function setFolderMembership(state, workId, folderId, assigned, now = Date.now()) {
  const collections = normalizeCollections(state.collections);
  if (!state.mediaLibrary?.works[workId] || !collections.folders[folderId] || collections.folders[folderId].trashedAt !== null) throw new Error('Obra o carpeta no disponible.');
  collections.memberships[workId] = {...collections.memberships[workId], [folderId]: {assigned: assigned === true, changedAt: integer(now)}};
  return {...state, collections};
}
export function foldersForWork(state, workId) {
  const memberships = normalizeCollections(state.collections).memberships[workId] || {};
  return listFolders(state).filter(folder => memberships[folder.id]?.assigned);
}
export function mergeCollections(current, incoming, workIdMap = {}) {
  const base = normalizeCollections(current);
  const next = normalizeCollections(incoming);
  for (const [id, folder] of Object.entries(next.folders)) {
    if (!base.folders[id] || folder.changedAt > base.folders[id].changedAt) base.folders[id] = folder;
  }
  for (const [sourceId, memberships] of Object.entries(next.memberships)) {
    for (const workId of workIdMap[sourceId] || [sourceId]) {
      base.memberships[workId] = {...base.memberships[workId]};
      for (const [folderId, value] of Object.entries(memberships)) {
        const local = base.memberships[workId][folderId];
        if (!local || value.changedAt > local.changedAt) base.memberships[workId][folderId] = value;
      }
    }
  }
  return normalizeCollections(base);
}
