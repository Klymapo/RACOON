export const STATUS_VALUES = ['Pendiente', 'Viendo', 'Al día', 'Terminada', 'Descartada'];
export const MEDIA_KINDS = ['series', 'season', 'movie', 'special'];

export function stableId(kind, sourceId) {
  return `${String(kind).toLowerCase()}:${String(sourceId)}`;
}

export function normalizeLegacyCatalog(raw = []) {
  return raw.map((entry) => ({
    ...entry,
    id: stableId('legacy', entry.id),
    legacyId: entry.id,
    mediaKind: entry.mediaKind || 'season',
    title: entry.title || entry.name || 'Sin título',
    availableEpisodes: entry.availableEpisodes ?? null,
    totalEpisodes: entry.totalEpisodes ?? null,
    sources: entry.sources || (entry.source ? [{kind: 'secondary', url: entry.source}] : [])
  }));
}

export function createCustomId(random = globalThis.crypto?.randomUUID) {
  return stableId('custom', random ? random() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}
