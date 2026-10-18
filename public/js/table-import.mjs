import {createCustomId, STATUS_VALUES} from './model.mjs';
import {validateState} from './storage.mjs';
import {createFolder, listFolders, setFolderMembership} from './folders.mjs';

export const IMPORT_FIELDS = [
  ['title', 'Título', ['titulo', 'title', 'nombre', 'name']],
  ['id', 'ID (opcional)', ['id']],
  ['format', 'Formato', ['formato', 'format', 'tipo']],
  ['year', 'Año', ['ano', 'year']],
  ['seasonNumber', 'Número de temporada', ['temporada', 'season', 'numero de temporada']],
  ['seen', 'Vistos', ['vistos', 'episodios vistos', 'seen']],
  ['available', 'Disponibles', ['disponibles', 'episodios disponibles', 'available']],
  ['total', 'Total de episodios', ['total', 'total de episodios', 'episodes']],
  ['status', 'Estado', ['estado', 'status']],
  ['rating', 'Calificación personal', ['calificacion', 'calificacion personal', 'rating', 'nota']],
  ['favorite', 'Favorito', ['favorito', 'favorite']],
  ['folders', 'Carpetas (separadas por ;)', ['carpeta', 'carpetas', 'folders']],
  ['watchedAt', 'Fecha vista', ['fecha vista', 'watched at', 'fecha de visualizacion']]
];
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ');
const text = value => String(value ?? '').trim();
export function suggestMapping(headers) {
  const result = {};
  for (const [key, , aliases] of IMPORT_FIELDS) {
    const index = headers.findIndex(header => aliases.includes(norm(header)));
    result[key] = index < 0 ? '' : index;
  }
  if (result.title === '' && headers.length) result.title = 0;
  return result;
}
export function prepareTable(rows, hasHeader) {
  const width = Math.max(0, ...rows.map(row => row.length));
  const aliases = IMPORT_FIELDS.flatMap(([, , values]) => values);
  const detected = rows[0]?.some(value => aliases.includes(norm(value))) || false;
  const header = hasHeader ?? detected;
  const data = header ? rows.slice(1) : rows;
  if (data.length > 10000 || width > 64) throw new Error('Máximo 10 mil registros y 64 columnas por hoja.');
  return {hasHeader: header, headers: Array.from({length: width}, (_, index) => header ? text(rows[0]?.[index]) || `Columna ${index + 1}` : `Columna ${index + 1}`), rows: data};
}
function integer(value, field) {
  if (!text(value)) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 9999) throw new Error(`${field}: usa un entero entre 0 y 9999.`);
  return number;
}
function date(value, date1904) {
  if (!text(value)) return null;
  let result = text(value);
  if (/^\d+(?:\.\d+)?$/.test(result)) {
    const days = Math.floor(Number(result));
    if (days < (date1904 ? 0 : 1) || days > 100000 || (!date1904 && days === 60)) throw new Error('Fecha vista inválida.');
    result = new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : days < 60 ? 31 : 30) + days * 86400000).toISOString().slice(0, 10);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(result)) {
    const [day, month, year] = result.split('/');
    result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(`${result}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) throw new Error('Fecha vista inválida; usa AAAA-MM-DD o DD/MM/AAAA.');
  return result;
}
function recordFrom(row, mapping, options) {
  const get = key => mapping[key] === '' || mapping[key] == null ? '' : text(row[Number(mapping[key])]);
  const title = get('title');
  if (!title || title.length > 300) throw new Error('Título requerido, máximo 300 caracteres.');
  const rawFormat = norm(get('format'));
  const movie = ['pelicula', 'movie', 'film', 'pelicula de anime'].includes(rawFormat);
  if (rawFormat && !movie && !['serie', 'series', 'serie/temporada', 'season', 'anime', 'temporada', 'tv'].includes(rawFormat)) throw new Error('Formato desconocido; revisa esa columna.');
  const format = rawFormat ? (movie ? 'movie' : 'season') : options.format === 'movie' ? 'movie' : 'season';
  const statuses = {'pendiente': 'Pendiente', 'planned': 'Pendiente', 'viendo': 'Viendo', 'watching': 'Viendo', 'al dia': 'Al día', 'terminada': 'Terminada', 'terminado': 'Terminada', 'vista': 'Terminada', 'visto': 'Terminada', 'completed': 'Terminada', 'descartada': 'Descartada', 'abandonada': 'Descartada', 'dropped': 'Descartada'};
  const rawStatus = norm(get('status'));
  const status = options.status && options.status !== 'auto' ? options.status : rawStatus ? statuses[rawStatus] : 'Pendiente';
  if (!STATUS_VALUES.includes(status)) throw new Error('Estado no reconocido. Cambia la columna o el estado del lote.');
  const favorite = norm(get('favorite'));
  if (favorite && !['si', 'yes', 'true', '1', 'no', 'false', '0'].includes(favorite)) throw new Error('Favorito debe ser Sí/No o verdadero/falso.');
  const ratingText = get('rating').replace(',', '.').replace(/\s*\/\s*10$/, '');
  const rating = ratingText ? Number(ratingText) : null;
  if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 10)) throw new Error('Calificación fuera de 0–10.');
  const folders = [...new Set(get('folders').split(/[;\n]/).map(text).filter(Boolean))];
  if (folders.some(name => name.length > 80)) throw new Error('Una carpeta supera 80 caracteres.');
  return {title, externalId: get('id'), format, year: integer(get('year'), 'Año'), seasonNumber: format === 'movie' ? null : integer(get('seasonNumber'), 'Temporada'), seen: format === 'movie' ? null : integer(get('seen'), 'Vistos'), available: format === 'movie' ? null : integer(get('available'), 'Disponibles'), total: format === 'movie' ? null : integer(get('total'), 'Total'), status, rating, favorite: ['si', 'yes', 'true', '1'].includes(favorite), folders, watchedAt: date(get('watchedAt'), options.date1904)};
}
function matches(record, entry) {
  if (record.externalId && record.externalId === entry.id) return true;
  if (norm(record.title) !== norm(entry.title || entry.name)) return false;
  if ((record.format === 'movie') !== (entry.mediaKind === 'movie')) return false;
  if (record.year && entry.seasonYear && record.year !== entry.seasonYear) return false;
  if (record.seasonNumber !== null && entry.seasonNumber != null && record.seasonNumber !== entry.seasonNumber) return false;
  return true;
}
export function buildImportPreview(state, table, mapping, options = {}) {
  if (mapping.title === '' || mapping.title == null) throw new Error('Selecciona la columna Título.');
  const known = Object.values({...state.catalogOfficial, ...state.catalogCustom});
  const earlier = [];
  return table.rows.map((row, index) => {
    try {
      const record = recordFrom(row, mapping, options);
      const candidates = known.filter(entry => matches(record, entry));
      const duplicate = candidates.length || earlier.some(entry => matches(record, entry));
      earlier.push({id: '', title: record.title, mediaKind: record.format, seasonYear: record.year, seasonNumber: record.seasonNumber});
      return {index, record, kind: duplicate ? 'duplicate' : 'new', message: candidates.length > 1 ? `${candidates.length} coincidencias locales: revisar` : candidates.length ? 'Ya existe en Biblioteca' : duplicate ? 'Repetida en el archivo' : 'Nueva ficha manual'};
    } catch (error) { return {index, kind: 'invalid', message: error.message, title: text(row[Number(mapping.title)])}; }
  });
}
export function applyTableImport(state, preview, choices = {}, options = {}) {
  let next = validateState({...state, catalogCustom: {...state.catalogCustom}, catalogOfficial: {...state.catalogOfficial}});
  let imported = 0, skipped = 0;
  const added = [];
  const now = options.now ?? Date.now();
  for (const row of preview) {
    const choice = choices[row.index] || (row.kind === 'new' ? 'import' : 'skip');
    if (row.kind === 'invalid' || choice === 'skip') { skipped++; continue; }
    const record = row.record;
    const entries = Object.values({...next.catalogOfficial, ...next.catalogCustom});
    if (choice !== 'create' && entries.some(entry => matches(record, entry))) { skipped++; continue; }
    const id = createCustomId();
    next.catalogCustom[id] = {id, title: record.title, mediaKind: record.format, seasonYear: record.year, seasonNumber: record.seasonNumber, totalEpisodes: record.total, availableEpisodes: null, sources: [], importedFrom: options.sourceName || 'Tabla local', savedAt: now};
    const manualFields = ['status', ...['seen', 'available', 'total'].filter(field => record[field] !== null).map(field => ({seen: 'seen', available: 'availableOverride', total: 'totalOverride'}[field]))];
    next.tracking[id] = {seen: record.seen ?? 0, availableOverride: record.available, totalOverride: record.total, status: record.status, favorite: record.favorite, rating: record.rating, watchedAt: record.watchedAt, changedAt: now, manualFields};
    added.push({id, record});
    imported++;
  }
  next = validateState(next);
  for (const {id, record} of added) {
    const workId = next.mediaLibrary.catalogLinks[id].workId;
    for (const name of record.folders) {
      let folder = listFolders(next).find(item => norm(item.name) === norm(name));
      if (!folder) { next = createFolder(next, name, now); folder = listFolders(next).find(item => norm(item.name) === norm(name)); }
      next = setFolderMembership(next, workId, folder.id, true, now);
    }
    if (options.folderId) next = setFolderMembership(next, workId, options.folderId, true, now);
  }
  return {state: validateState(next), imported, skipped};
}
