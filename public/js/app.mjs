import {CATALOG} from './catalog.mjs';
import {createDefaultState, loadState, saveState, validateState} from './storage.mjs';
import {isMovie} from './media.mjs';
import {renderMovieCard, renderMovieForm} from './movie-ui.mjs';
import {buildCalendarModel} from './schedule.mjs';
import {mexicoDate} from './time.mjs';
import {searchAnime, fetchAnimeDetails, fetchSeasonalAnime, matchLegacyAnime, seasonForEntry} from './providers/anilist.mjs';
import {registerPwa} from './pwa.mjs';
import {createBackup, parseBackup, mergeBackup, replaceWithBackup, stateToCsv} from './backup.mjs';
import {shouldRefresh, refreshCatalog, mergeCatalogObservation, FOUR_HOURS} from './refresh.mjs';
import {createCustomId} from './model.mjs';

const RACOON_VERSION = '3.0.0-alpha.2';
const VIEWS = ['home', 'calendar', 'progress', 'add', 'backups'];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function entryMap(catalog, state) {
  return Object.fromEntries([...catalog, ...Object.values(state.catalogOfficial), ...Object.values(state.catalogCustom)].map((entry) => [entry.id, entry]));
}

function availableFor(entry, tracking = {}) {
  if (isMovie(entry)) return 0;
  return tracking.availableOverride ?? entry.availableEpisodes ?? 0;
}

function availableValue(entry, tracking = {}) {
  if (isMovie(entry)) return null;
  return tracking.availableOverride ?? entry.availableEpisodes ?? null;
}

function totalFor(entry, tracking = {}) {
  if (isMovie(entry)) return null;
  return tracking.totalOverride ?? entry.totalEpisodes ?? null;
}

function normalizeTracking(tracking = {}) {
  return {seen: 0, status: 'Pendiente', favorite: false, changedAt: 0, availableOverride: null, totalOverride: null, manualFields: [], ...tracking};
}

function optionalFormInteger(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function addDays(ymd, amount) {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function mondayOf(ymd) {
  const date = new Date(`${ymd}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  return addDays(ymd, 1 - day);
}

function nextWeeklyDate(entry, today) {
  const firstWeek = mondayOf(today);
  for (let offset = 0; offset < 5; offset += 1) {
    const weekStart = addDays(firstWeek, offset * 7);
    const events = buildCalendarModel([entry], {tracking: {}}, {weekStart}).days.flatMap(({entries}) => entries)
      .filter((event) => event.mexicoDate >= today)
      .sort((left, right) => String(left.mexicoTime || left.mexicoDate).localeCompare(String(right.mexicoTime || right.mexicoDate)));
    if (events.length) return {date: events[0].mexicoDate, platformLabel: events[0].platformLabel, statusLabel: events[0].statusLabel};
  }
  return null;
}

export function buildDashboardModel(catalog, state, today = mexicoDate(Date.now())) {
  const entries = entryMap(catalog, state);
  const tracked = Object.entries(state.tracking)
    .map(([id, raw]) => ({id, entry: entries[id], tracking: normalizeTracking(raw)}))
    .filter(({entry, tracking}) => entry && !['Terminada', 'Descartada'].includes(tracking.status));
  const pending = tracked.map(({id, entry, tracking}) => ({id, entry, tracking, available: availableFor(entry, tracking), remaining: Math.max(0, availableFor(entry, tracking) - tracking.seen)}))
    .filter((item) => !isMovie(item.entry) && item.remaining > 0)
    .sort((left, right) => right.remaining - left.remaining || String(left.entry.title || left.entry.name).localeCompare(String(right.entry.title || right.entry.name)));
  const upcoming = Object.values(entries).filter((entry) => !['Terminada', 'Descartada'].includes(state.tracking[entry.id]?.status)).map((entry) => {
    const event = nextWeeklyDate(entry, today);
    return event ? {...entry, ...event} : null;
  }).filter(Boolean).sort((left, right) => {
    const leftPriority = left.id?.startsWith('anilist:') || left.id?.startsWith('custom:') || state.tracking[left.id] ? 0 : 1;
    const rightPriority = right.id?.startsWith('anilist:') || right.id?.startsWith('custom:') || state.tracking[right.id] ? 0 : 1;
    return leftPriority - rightPriority || left.date.localeCompare(right.date);
  }).slice(0, 6);
  return {
    stats: {
      tracked: tracked.filter(({entry}) => !isMovie(entry)).length,
      pendingSeries: pending.length,
      pendingEpisodes: pending.reduce((sum, item) => sum + item.remaining, 0),
      upToDate: tracked.filter(({entry, tracking}) => !isMovie(entry) && availableFor(entry, tracking) > 0 && tracking.seen >= availableFor(entry, tracking)).length
    },
    pending,
    upcoming
  };
}

export function applyTrackingPatch(state, id, patch, changedAt = Date.now()) {
  const current = normalizeTracking(state.tracking[id]);
  return {
    ...state,
    tracking: {...state.tracking, [id]: {...current, ...patch, changedAt}}
  };
}

export function saveCatalogEntry(state, entry, edits = {}) {
  const previous = state.catalogOfficial[entry.id] || state.catalogCustom[entry.id] || {};
  const changedFields = Object.keys(edits).filter((field) => JSON.stringify(edits[field]) !== JSON.stringify(entry[field] ?? null));
  const saved = {...previous, ...entry, ...edits, id: entry.id, savedAt: Date.now(), manualCatalogFields: [...new Set([...(previous.manualCatalogFields || []), ...changedFields])]};
  const tracking = state.tracking[entry.id] ? state.tracking : {...state.tracking, [entry.id]: normalizeTracking()};
  if (entry.id.startsWith('custom:')) return validateState({...state, tracking, catalogCustom: {...state.catalogCustom, [entry.id]: saved}});
  return validateState({...state, tracking, catalogOfficial: {...state.catalogOfficial, [entry.id]: saved}});
}

export function filterProgressEntries(catalog, state, {query = '', filter = 'all', sort = 'title'} = {}) {
  const normalizedQuery = String(query).trim().toLocaleLowerCase();
  const entries = Object.values(entryMap(catalog, state)).map((entry) => {
    const tracking = normalizeTracking(state.tracking?.[entry.id]);
    const available = availableValue(entry, tracking);
    const remaining = available === null ? null : Math.max(0, available - tracking.seen);
    return {entry, tracking, available, remaining};
  }).filter(({entry, tracking, available, remaining}) => {
    const haystack = `${entry.title || entry.name} ${entry.alternativeTitles?.join(' ') || ''}`.toLocaleLowerCase();
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    if (filter === 'watching' && tracking.status !== 'Viendo') return false;
    if (filter === 'pending' && !(isMovie(entry) ? ['Pendiente', 'Viendo'].includes(tracking.status) : remaining !== null && remaining > 0)) return false;
    if (filter === 'uptodate' && (isMovie(entry) || !(available !== null && available > 0 && tracking.seen >= available))) return false;
    if (filter === 'finished' && tracking.status !== 'Terminada') return false;
    if (filter === 'favorites' && !tracking.favorite) return false;
    return true;
  });
  const compareTitle = (left, right) => String(left.entry.title || left.entry.name).localeCompare(String(right.entry.title || right.entry.name), 'es');
  entries.sort((left, right) => {
    if (sort === 'progress') return (right.tracking.seen - left.tracking.seen) || compareTitle(left, right);
    if (sort === 'status') return String(left.tracking.status).localeCompare(String(right.tracking.status), 'es') || compareTitle(left, right);
    if (sort === 'favorites') return Number(right.tracking.favorite) - Number(left.tracking.favorite) || compareTitle(left, right);
    return compareTitle(left, right);
  });
  return entries;
}

export function progressPercentage(entry, tracking = {}) {
  if (isMovie(entry)) return tracking.status === 'Terminada' ? 100 : 0;
  const denominator = tracking.totalOverride ?? entry.totalEpisodes ?? tracking.availableOverride ?? entry.availableEpisodes;
  return denominator > 0 ? Math.min(100, Math.round(((tracking.seen || 0) / denominator) * 100)) : 0;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function memoryStorage() {
  const values = new Map();
  return {getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value))};
}

export function createApp({document = globalThis.document, storage = globalThis.localStorage || memoryStorage(), fetch = globalThis.fetch, now = Date.now} = {}) {
  let {state} = loadState(storage, CATALOG);
  let currentView = VIEWS.includes(state.preferences.view) ? state.preferences.view : 'home';
  let searchResults = new Map();
  let selectedSeries = null;
  let pwaController = null;
  let pendingImport = null;
  let refreshInFlight = null;
  const elements = (id) => document?.getElementById?.(id);

  function setText(id, value) {
    const node = elements(id);
    if (node) node.textContent = value;
  }

  function persist() {
    state = validateState(state);
    const saved = saveState(storage, state);
    const warning = elements('saveWarning');
    if (warning) {
      warning.hidden = saved;
      warning.textContent = saved ? '' : 'No se pudo guardar en este dispositivo. Tus datos anteriores se conservaron; exporta un respaldo antes de cerrar.';
    }
    return saved;
  }

  function renderHome() {
    const model = buildDashboardModel(CATALOG, state, mexicoDate(now()));
    const stats = elements('homeStats');
    if (stats) stats.innerHTML = [
      ['tracked', model.stats.tracked, 'Series en seguimiento'],
      ['pending', model.stats.pendingEpisodes, 'Episodios pendientes'],
      ['current', model.stats.upToDate, 'Series al corriente'],
      ['upcoming', model.upcoming.length, 'Próximas emisiones']
    ].map(([, value, label]) => `<article class="stat-card"><strong>${value}</strong><span>${label}</span></article>`).join('');
    const pending = elements('pendingList');
    if (pending) pending.innerHTML = model.pending.length ? model.pending.slice(0, 4).map((item) => `<div class="stack-item"><div class="stack-icon">${escapeHtml(item.entry.icon || '✦')}</div><div class="stack-copy"><strong>${escapeHtml(item.entry.title || item.entry.name)}</strong><span>${item.remaining} episodio${item.remaining === 1 ? '' : 's'} pendiente${item.remaining === 1 ? '' : 's'}</span></div><button class="mini-button" type="button" data-progress-action="plus" data-id="${escapeHtml(item.id)}" aria-label="Marcar un episodio visto de ${escapeHtml(item.entry.title || item.entry.name)}">+1</button></div>`).join('') : '<div class="empty-state"><strong>Todo en calma</strong>No tienes episodios pendientes.</div>';
    const upcoming = elements('upcomingList');
    if (upcoming) upcoming.innerHTML = model.upcoming.length ? model.upcoming.slice(0, 4).map((entry) => `<div class="stack-item"><div class="stack-icon">${escapeHtml(entry.icon || '✦')}</div><div class="stack-copy"><strong>${escapeHtml(entry.title || entry.name)}</strong><span>${escapeHtml(entry.date)} · ${escapeHtml(entry.platformLabel || 'Fuente pendiente')} · ${escapeHtml(entry.statusLabel)}</span></div></div>`).join('') : '<div class="empty-state"><strong>Sin próximas emisiones</strong>Agrega una serie para verla aquí.</div>';
    const checked = Number(state.updateMeta?.lastChecked);
    const provider = state.updateMeta?.providers?.catalog;
    const freshness = checked ? `Fuentes: ${provider?.status === 'failed' ? 'sin conexión' : 'revisadas'} · ${new Date(checked).toLocaleString('es-MX', {dateStyle: 'short', timeStyle: 'short'})}` : 'Fuentes pendientes de primera revisión';
    setText('homeUpdated', `${freshness} · guardado local`);
  }

  function renderProgress() {
    const target = elements('progressList');
    if (!target) return;
    const entries = filterProgressEntries(CATALOG, state, {query: elements('progressSearch')?.value || '', filter: elements('progressFilter')?.value || 'all', sort: elements('progressSort')?.value || state.preferences.sort || 'title'});
    const cards = entries.map(({entry, tracking, available}) => {
      const id = entry.id;
      const total = totalFor(entry, tracking);
      const percent = progressPercentage(entry, tracking);
      const poster = safeHttpUrl(entry.poster) ? `<img src="${escapeHtml(entry.poster)}" alt="" loading="lazy">` : escapeHtml(entry.icon || '✦');
      const availableLabel = available === null ? 'pendiente' : available;
      if (isMovie(entry)) return renderMovieCard(entry, tracking, poster);
      return `<article class="library-card" data-library-id="${escapeHtml(id)}"><div class="poster">${poster}</div><div class="card-content"><div class="card-topline"><select class="status-select" data-progress-field="status" data-id="${escapeHtml(id)}" aria-label="Estado de ${escapeHtml(entry.title || entry.name)}">${['Pendiente', 'Viendo', 'Al día', 'Terminada', 'Descartada'].map((value) => `<option value="${value}"${tracking.status === value ? ' selected' : ''}>${value}</option>`).join('')}</select><button class="favorite-button ${tracking.favorite ? 'is-favorite' : ''}" type="button" data-progress-action="favorite" data-id="${escapeHtml(id)}" aria-label="${tracking.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${tracking.favorite ? '★' : '☆'}</button></div><h3>${escapeHtml(entry.title || entry.name)}</h3><div class="card-meta"><span>${tracking.seen} vistos · ${availableLabel} disponibles · ${total ?? '?'} total</span></div><div class="progress-line"><span style="width:${percent}%"></span></div><div class="progress-edit-grid"><label>Vistos<input type="number" min="0" max="9999" value="${tracking.seen}" data-progress-field="seen" data-id="${escapeHtml(id)}"></label><label>Disponibles<input type="number" min="0" max="9999" value="${available ?? ''}" placeholder="?" data-progress-field="availableOverride" data-id="${escapeHtml(id)}"></label><label>Total<input type="number" min="0" max="9999" value="${total ?? ''}" placeholder="?" data-progress-field="totalOverride" data-id="${escapeHtml(id)}"></label></div><div class="card-actions"><button class="mini-button" type="button" data-progress-action="minus" data-id="${escapeHtml(id)}">−1</button><button class="mini-button" type="button" data-progress-action="plus" data-id="${escapeHtml(id)}">＋1</button><button class="mini-button" type="button" data-progress-action="catchup" data-id="${escapeHtml(id)}"${available === null ? ' disabled' : ''}>Al corriente</button></div></div></article>`;
    });
    target.innerHTML = cards.join('') || '<div class="empty-state"><strong>Tu biblioteca está vacía</strong>Agrega tu primera serie.</div>';
    target.querySelectorAll?.('[data-library-id]')?.forEach((card) => {
      const id = card.dataset.libraryId;
      const entry = entryMap(CATALOG, state)[id];
      const tracking = normalizeTracking(state.tracking[id]);
      if (isMovie(entry)) {
        card.querySelector('.card-actions')?.insertAdjacentHTML('beforeend', `<button class="mini-button" type="button" data-series-edit="${escapeHtml(id)}">Editar ficha</button><button class="mini-button" type="button" data-series-delete="${escapeHtml(id)}">Eliminar</button>`);
        return;
      }
      const denominator = totalFor(entry, tracking) ?? availableValue(entry, tracking);
      card.querySelector('.card-meta')?.insertAdjacentHTML('beforeend', `<span> · ${denominator > 0 ? `${progressPercentage(entry, tracking)}% de ${totalFor(entry, tracking) ? 'la temporada' : 'lo disponible'}` : 'porcentaje pendiente'}</span>`);
      const availabilityTrust = tracking.availableOverride !== null ? 'disponibles: ajuste local' : entry.availableConfidence === 'confirmed' ? 'disponibles: confirmado' : 'disponibles: sin verificar';
      const totalTrust = tracking.totalOverride !== null ? 'total: ajuste local' : entry.totalConfidence === 'confirmed' ? 'total: confirmado' : entry.totalEpisodes !== null && entry.totalEpisodes !== undefined ? 'total: previsto' : 'total: sin verificar';
      card.querySelector('.card-meta')?.insertAdjacentHTML('beforeend', `<small>${availabilityTrust} · ${totalTrust}</small>`);
      if (id.startsWith('legacy:')) return;
      card.querySelector('.card-actions')?.insertAdjacentHTML('beforeend', `<button class="mini-button" type="button" data-series-edit="${escapeHtml(id)}">Editar ficha</button><button class="mini-button" type="button" data-series-delete="${escapeHtml(id)}">Eliminar</button>`);
    });
  }

  function renderCalendarEntry(entry) {
    const source = entry.sources?.[0];
    const sourceAge = source?.queriedAt ? `consultada ${escapeHtml(source.queriedAt.slice(0, 10))}` : 'revisión sin fecha registrada';
    const timeStatus = entry.timeConfidence === 'confirmed' ? ' · hora confirmada' : '';
    return `<article class="episode-card">${safeHttpUrl(entry.poster) ? `<img class="episode-poster" src="${escapeHtml(entry.poster)}" alt="" loading="lazy">` : ''}<strong>${escapeHtml(entry.title || entry.name)}</strong><span>${escapeHtml(entry.episodeLabel)} · ${escapeHtml(entry.platformLabel || entry.platform || 'Plataforma pendiente')}</span><span class="confidence">${escapeHtml(entry.statusLabel)}${timeStatus}${entry.mexicoTime ? ` · ${escapeHtml(entry.mexicoTime.slice(11))} CDMX` : ''}</span>${entry.projectionNote ? `<small>${escapeHtml(entry.projectionNote)}</small>` : ''}${safeHttpUrl(source?.url) ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">Ver fuente · ${sourceAge}</a>` : '<small>Fuente pendiente de verificar</small>'}</article>`;
  }

  function renderCalendar() {
    const today = mexicoDate(now());
    const weekStart = state.preferences.calendarWeek || mondayOf(today);
    const selectedDay = state.preferences.selectedDay || weekStart;
    const entries = Object.values({...Object.fromEntries(CATALOG.map((entry) => [entry.id, entry])), ...state.catalogOfficial, ...state.catalogCustom});
    const platformSelect = elements('calendarPlatform');
    const selectedPlatform = state.preferences.platform || 'all';
    let effectivePlatform = selectedPlatform;
    if (platformSelect) {
      const platforms = [...new Set(Object.values(entries).flatMap((entry) => [entry.platform, ...(entry.platforms || [])]).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'es'));
      platformSelect.innerHTML = ['<option value="all">Todas las plataformas</option>', ...platforms.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`)].join('');
      effectivePlatform = platforms.includes(selectedPlatform) ? selectedPlatform : 'all';
      platformSelect.value = effectivePlatform;
    }
    const model = buildCalendarModel(entries, state, {weekStart, selectedDay, platform: effectivePlatform, status: state.preferences.status || 'all'});
    if (elements('calendarStatus')) elements('calendarStatus').value = state.preferences.status || 'all';
    const selector = elements('daySelector');
    if (selector) selector.innerHTML = model.days.map((day, index) => `<button class="day-chip ${day.date === model.selectedDay ? 'is-active' : ''}" type="button" data-calendar-day="${day.date}" role="tab" aria-selected="${day.date === model.selectedDay}"><strong>${DAY_NAMES[index]} ${day.date.slice(8, 10)}</strong><small>${day.entries.length} evento${day.entries.length === 1 ? '' : 's'}</small></button>`).join('');
    const calendar = elements('calendar');
    if (!calendar) return;
    calendar.innerHTML = model.days.map((day, index) => `<section class="calendar-day ${day.date === model.selectedDay ? 'is-selected' : ''}" data-calendar-panel="${day.date}"><header><h3>${DAY_NAMES[index]} · ${day.date.slice(8, 10)}/${day.date.slice(5, 7)}</h3><span>${day.entries.length}</span></header>${day.entries.length ? day.entries.map(renderCalendarEntry).join('') : '<div class="empty-state">Sin eventos para este día. Puedes revisar otra semana.</div>'}</section>`).join('');
  }

  function renderSearchResults(results = []) {
    const target = elements('searchResults');
    if (!target) return;
    searchResults = new Map(results.map((entry) => [entry.sourceId || entry.id, entry]));
    target.innerHTML = results.length ? results.map((entry) => `<article class="result-card"><div class="poster">${entry.poster ? `<img src="${escapeHtml(entry.poster)}" alt="" loading="lazy">` : escapeHtml(entry.title?.slice(0, 1) || '✦')}</div><h3>${escapeHtml(entry.title)}</h3><div class="card-meta">${escapeHtml(entry.season || 'Temporada no confirmada')} ${escapeHtml(entry.seasonYear || '')} · ${escapeHtml(entry.mediaKind)}</div><p>${escapeHtml(entry.synopsis || 'Sin sinopsis verificada.')}</p><span class="badge">ID ${escapeHtml(entry.id)}</span><div class="card-actions"><button class="mini-button" type="button" data-series-select="${escapeHtml(entry.sourceId || entry.id)}">Revisar ficha</button></div></article>`).join('') : '<div class="empty-state"><strong>No encontramos coincidencias</strong>Prueba con otro título o guarda una serie personalizada.</div>';
  }

  function renderSeriesConfirmation(entry) {
    const target = elements('seriesConfirmation');
    if (!target) return;
    target.classList.remove('is-hidden');
    if (isMovie(entry)) { target.innerHTML = renderMovieForm(entry); return; }
    target.innerHTML = `<div class="panel-heading"><h3>Confirmar serie</h3><span class="badge badge-teal">${escapeHtml(entry.id)}</span></div><div class="series-form"><label>Título<input data-series-field="title" value="${escapeHtml(entry.title || '')}"></label><label>Títulos alternativos<input data-series-field="alternativeTitles" value="${escapeHtml((entry.alternativeTitles || []).join(', '))}"></label><label>Sinopsis<textarea data-series-field="synopsis" rows="4">${escapeHtml(entry.synopsis || '')}</textarea></label><div class="form-grid"><label>Géneros<input data-series-field="genres" value="${escapeHtml((entry.genres || []).join(', '))}" placeholder="Pendiente de verificar"></label><label>Temporada<input data-series-field="season" value="${escapeHtml(entry.season || '')}" placeholder="Pendiente"></label><label>Año<input type="number" data-series-field="seasonYear" value="${entry.seasonYear ?? ''}" placeholder="Pendiente"></label><label>Estreno<input type="date" data-series-field="premiereDate" value="${escapeHtml(entry.premiereDate || '')}"></label><label>Total de episodios<input type="number" min="0" data-series-field="totalEpisodes" value="${entry.totalEpisodes ?? ''}" placeholder="Pendiente"></label><label>Estado de emisión<input data-series-field="airingStatus" value="${escapeHtml(entry.airingStatus || '')}" placeholder="Pendiente"></label><label>Plataforma<input data-series-field="platform" value="${escapeHtml(entry.platform || entry.platforms?.[0] || '')}" placeholder="Pendiente de verificar"></label><label>Disponibilidad México<input data-series-field="regionalAvailability" value="${escapeHtml(entry.regionalAvailability || '')}" placeholder="Pendiente de verificar"></label></div></div><div class="tag-row"><span class="status-pill">ID permanente: ${escapeHtml(entry.id)}</span><span class="status-pill">Fuente consultada: AniList</span></div><p class="muted">Fuente: <a href="${escapeHtml(entry.sources?.[0]?.url || '#')}" target="_blank" rel="noopener noreferrer">AniList ↗</a>. Los campos regionales quedan sin verificar hasta confirmar una fuente mexicana.</p><div class="button-row"><button class="button button-primary" type="button" data-save-series="${escapeHtml(entry.id)}">Guardar en mi biblioteca</button><button class="button button-ghost" type="button" data-cancel-series>Cancelar</button></div>`;
    const sourceLink = target.querySelector('.tag-row + p.muted a');
    if (sourceLink && !safeHttpUrl(entry.sources?.[0]?.url)) sourceLink.removeAttribute('href');
    target.querySelector('.series-form')?.insertAdjacentHTML('beforeend', `<p class="muted">Patrón semanal manual de la plataforma: es una previsión, nunca confirma episodios disponibles. Déjalo vacío si no lo conoces.</p><div class="form-grid"><label>Día semanal<select data-series-field="weeklyDay"><option value="">Sin patrón</option>${DAY_NAMES.map((name, index) => `<option value="${index}"${entry.weeklySchedule?.day === index ? ' selected' : ''}>${name}</option>`).join('')}</select></label><label>Hora de plataforma<input type="time" data-series-field="sourceHour" value="${escapeHtml(entry.sourceTime?.time || '')}"></label><label>Zona de esa hora<select data-series-field="sourceZone"><option value="America/Mexico_City">Ciudad de México</option><option value="America/Los_Angeles">Pacífico de EE. UU.</option><option value="Asia/Tokyo">Japón</option></select></label><label>URL fuente del patrón<input type="url" data-series-field="patternUrl" value="${escapeHtml(entry.patternUrl || '')}" placeholder="https://…"></label></div>`);
    if (target.querySelector('[data-series-field="sourceZone"]')) target.querySelector('[data-series-field="sourceZone"]').value = entry.sourceTime?.timeZone || 'America/Mexico_City';
    if (entry.id.startsWith('custom:')) {
      target.querySelector('.tag-row .status-pill:last-child').textContent = 'Ficha manual · sin fuente automática';
      target.querySelector('.tag-row + p.muted')?.remove();
    }
  }

  function renderAddStatus(message = '') { setText('searchStatus', message); }

  function allEntries() {
    return Object.values({...Object.fromEntries(CATALOG.map((entry) => [entry.id, entry])), ...state.catalogOfficial, ...state.catalogCustom});
  }

  function renderBackupSummary() {
    const summary = elements('backupSummary');
    if (summary) summary.textContent = `${allEntries().length} obras · ${Object.keys(state.tracking).length} con seguimiento · ${state.updateMeta?.lastBackupAt ? `respaldo ${String(state.updateMeta.lastBackupAt).slice(0, 10)}` : 'sin respaldo reciente'}`;
    const rollback = elements('exportMigrationBackup');
    if (rollback) {
      try { rollback.hidden = !storage.getItem('racoon-v2-state:before-media-v1'); }
      catch { rollback.hidden = true; }
    }
  }

  function downloadFile(name, content, type) {
    if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], {type}));
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function refreshRemote(manual = false) {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = runRefresh(manual).finally(() => { refreshInFlight = null; });
    return refreshInFlight;
  }

  async function runRefresh(manual) {
    setText('freshness', manual ? 'Actualizando fuentes…' : 'Comprobando fuentes…');
    const catalogBeforeRefresh = state.catalogOfficial;
    const known = Object.values(catalogBeforeRefresh).filter((entry) => String(entry.id).startsWith('anilist:') || (String(entry.id).startsWith('legacy:') && entry.anilistSourceId));
    const cursor = Number(state.updateMeta?.anilistCursor) || 0;
    const batch = Array.from({length: Math.min(20, known.length)}, (_, index) => known[(cursor + index) % known.length]);
    let processedKnown = 0;
    let refreshedIds = [];
    const result = await refreshCatalog(state, async () => {
      const entries = [];
      const failures = [];
      let rateLimited = false;
      const legacy = Object.values(catalogBeforeRefresh).filter((entry) => String(entry.id).startsWith('legacy:') && !entry.anilistSourceId);
      const groups = new Map();
      for (const local of legacy) {
        const season = seasonForEntry(local);
        if (!season) continue;
        const key = `${season.season}:${season.year}`;
        if (!groups.has(key)) groups.set(key, {season, locals: []});
        groups.get(key).locals.push(local);
      }
      for (const {season, locals} of groups.values()) {
        try {
          const seasonal = await fetchSeasonalAnime({...season, fetch});
          const used = new Set();
          for (const local of locals) {
            const remote = matchLegacyAnime(local, seasonal);
            if (!remote || used.has(remote.id)) continue;
            used.add(remote.id);
            const next = {...local, ...remote, id: local.id, legacyId: local.legacyId, title: local.title, name: local.name, alias: local.alias, platform: local.platform, platforms: local.platforms, weeklySchedule: local.weeklySchedule, scheduleEvents: local.scheduleEvents, sources: [...(local.sources || []), ...(remote.sources || [])]};
            next.anilistSourceId = remote.sourceId;
            if (Number.isInteger(remote.totalEpisodes)) next.totalEpisodes = remote.totalEpisodes;
            // AniList announces Japanese airings; it cannot confirm episodes published in Mexico.
            next.availableEpisodes = local.availableEpisodes;
            next.availableConfidence = local.availableConfidence;
            entries.push(next);
          }
        } catch (error) { failures.push(error); if (/429/.test(String(error))) { rateLimited = true; break; } }
      }
      for (const entry of rateLimited ? [] : batch) {
        try {
          const remote = await fetchAnimeDetails(entry.anilistSourceId || entry.sourceId || entry.id.split(':')[1], {fetch});
          entries.push(entry.id.startsWith('legacy:') ? {...remote, id: entry.id, anilistSourceId: remote.sourceId, platform: entry.platform, weeklySchedule: entry.weeklySchedule, scheduleEvents: entry.scheduleEvents, availableEpisodes: entry.availableEpisodes, availableConfidence: entry.availableConfidence} : remote);
          processedKnown += 1;
        } catch (error) { failures.push(error); if (/429/.test(String(error))) break; processedKnown += 1; /* conserva el último dato confirmado */ }
      }
      if (!entries.length && failures.length) throw failures[0];
      refreshedIds = [...new Set(entries.map((entry) => entry.id))];
      return {entries, incomplete: failures.length > 0};
    }, now());
    // Rebase observations onto live data: an in-flight request must not revive
    // deletions or replace fields the person edited after the request began.
    const catalogOfficial = {...state.catalogOfficial};
    for (const id of refreshedIds) {
      if (!Object.hasOwn(catalogOfficial, id) || !result.state.catalogOfficial[id]) continue;
      const before = catalogBeforeRefresh[id] || {};
      const current = catalogOfficial[id];
      const merged = mergeCatalogObservation(current, result.state.catalogOfficial[id]);
      for (const field of new Set([...Object.keys(before), ...Object.keys(current)])) {
        if (JSON.stringify(before[field]) === JSON.stringify(current[field])) continue;
        if (Object.hasOwn(current, field)) merged[field] = current[field];
        else delete merged[field];
      }
      catalogOfficial[id] = merged;
    }
    state = {...state, catalogOfficial, updateMeta: {
      ...state.updateMeta,
      lastChecked: result.state.updateMeta.lastChecked,
      providers: {...state.updateMeta.providers, catalog: result.state.updateMeta.providers.catalog}
    }};
    if (result.status !== 'failed' && known.length) state.updateMeta.anilistCursor = (cursor + processedKnown) % known.length;
    persist();
    setText('freshness', result.status === 'completed' ? `Fuentes actualizadas · ${new Date(now()).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}` : result.status === 'no-update' ? 'Fuentes revisadas · sin novedades' : result.status === 'partial' ? 'Consulta parcial · algunos datos conservados' : 'Fuentes sin conexión · último dato conservado');
    render();
    return result;
  }

  function render() {
    renderHome();
    renderProgress();
    renderCalendar();
    renderBackupSummary();
    if (document?.querySelectorAll) document.querySelectorAll('[data-view]').forEach((tab) => {
      const active = tab.dataset.view === currentView;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });
    if (document?.querySelectorAll) document.querySelectorAll('[role="tabpanel"]').forEach((panel) => panel.classList.toggle('is-hidden', panel.id !== `${currentView}View`));
  }

  function selectView(viewId) {
    if (!VIEWS.includes(viewId)) return;
    currentView = viewId;
    state = {...state, preferences: {...state.preferences, view: viewId}};
    persist();
    render();
  }

  function setTracking(id, patch) {
    state = applyTrackingPatch(state, id, patch, now());
    persist();
    render();
  }

  if (document?.addEventListener) {
    document.addEventListener('keydown', (event) => {
      const tab = event.target.closest?.('[data-view]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = [...document.querySelectorAll('[data-view]')];
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      selectView(tabs[next].dataset.view);
      tabs[next].focus();
    });
    document.addEventListener('click', (event) => {
      const viewButton = event.target.closest?.('[data-view], [data-go]');
      if (viewButton) selectView(viewButton.dataset.view || viewButton.dataset.go);
      const seriesButton = event.target.closest?.('[data-series-select]');
      if (seriesButton) {
        const result = searchResults.get(seriesButton.dataset.seriesSelect);
        if (!result) return;
        selectedSeries = result;
        renderAddStatus('Consultando la ficha completa…');
        if (result.sourceId) fetchAnimeDetails(result.sourceId, {fetch}).then((details) => {
          if (selectedSeries?.id !== result.id) return;
          selectedSeries = {...result, ...details};
          renderSeriesConfirmation(selectedSeries);
          renderAddStatus('Revisa y corrige la ficha antes de guardarla.');
        }).catch(() => { if (selectedSeries?.id === result.id) { renderSeriesConfirmation(result); renderAddStatus('La ficha completa no respondió; puedes guardar los datos disponibles.'); } });
        else renderSeriesConfirmation(result);
        return;
      }
      const editSeries = event.target.closest?.('[data-series-edit]');
      if (editSeries) {
        selectedSeries = entryMap(CATALOG, state)[editSeries.dataset.seriesEdit] || null;
        if (selectedSeries) { selectView('add'); renderSeriesConfirmation(selectedSeries); renderAddStatus('Edita la ficha y guarda los cambios.'); }
        return;
      }
      const deleteSeries = event.target.closest?.('[data-series-delete]');
      if (deleteSeries) {
        const id = deleteSeries.dataset.seriesDelete;
        const entry = entryMap(CATALOG, state)[id];
        if (!entry || id.startsWith('legacy:') || !globalThis.confirm?.(`¿Eliminar ${entry.title || entry.name} y su progreso local? Exporta un respaldo si quieres poder recuperarlo.`)) return;
        const catalogOfficial = {...state.catalogOfficial};
        const catalogCustom = {...state.catalogCustom};
        const tracking = {...state.tracking};
        delete catalogOfficial[id]; delete catalogCustom[id]; delete tracking[id];
        state = {...state, catalogOfficial, catalogCustom, tracking};
        persist();
        render();
        return;
      }
      const saveSeries = event.target.closest?.('[data-save-series]');
      if (saveSeries && selectedSeries?.id === saveSeries.dataset.saveSeries) {
        const fields = Object.fromEntries([...document.querySelectorAll?.('[data-series-field]') || []].map((field) => [field.dataset.seriesField, field.value]));
        if (!fields.title?.trim()) { renderAddStatus('Escribe un título antes de guardar.'); return; }
        if (!isMovie(selectedSeries) && fields.weeklyDay !== '' && !fields.premiereDate) { renderAddStatus('Para proyectar un día semanal, indica primero una fecha de estreno.'); return; }
        if (isMovie(selectedSeries) && fields.durationMinutes && !(optionalFormInteger(fields.durationMinutes) > 0)) { renderAddStatus('Escribe una duración positiva o deja el campo vacío.'); return; }
        const patternUrl = /^https?:\/\//i.test(fields.patternUrl || '') ? fields.patternUrl.trim() : null;
        if (fields.patternUrl && !patternUrl) { renderAddStatus('La fuente del patrón debe ser una URL http o https.'); return; }
        const weeklyDay = fields.weeklyDay === '' ? null : Number(fields.weeklyDay);
        const schedule = !isMovie(selectedSeries) && Number.isInteger(weeklyDay) && weeklyDay >= 0 && weeklyDay < 7 ? {frequency: 'weekly', day: weeklyDay, startDate: fields.premiereDate, confidence: 'estimated'} : null;
        const edited = {
          title: fields.title?.trim() || selectedSeries.title,
          alternativeTitles: fields.alternativeTitles?.split(',').map((value) => value.trim()).filter(Boolean) || selectedSeries.alternativeTitles || [],
          synopsis: fields.synopsis?.trim() || '',
          genres: fields.genres?.split(',').map((value) => value.trim()).filter(Boolean) || selectedSeries.genres || [],
          season: fields.season?.trim() || null,
          seasonYear: optionalFormInteger(fields.seasonYear),
          premiereDate: fields.premiereDate || null,
          totalEpisodes: isMovie(selectedSeries) ? null : optionalFormInteger(fields.totalEpisodes),
          ...(isMovie(selectedSeries) ? {durationMinutes: optionalFormInteger(fields.durationMinutes), availableEpisodes: null, nextAiring: null} : {}),
          airingStatus: fields.airingStatus?.trim() || 'UNKNOWN',
          platform: fields.platform?.trim() || null,
          platforms: fields.platform?.trim() ? [fields.platform.trim()] : [],
          regionalAvailability: fields.regionalAvailability?.trim() || null,
          regionalAvailabilityConfidence: 'unverified',
          weeklySchedule: schedule,
          scheduleConfidence: 'estimated',
          sourceTime: schedule && fields.sourceHour ? {date: fields.premiereDate, time: fields.sourceHour, timeZone: fields.sourceZone || 'America/Mexico_City'} : null,
          patternUrl,
          patternSource: patternUrl ? {kind: 'secondary', name: 'Fuente indicada por usuario', url: patternUrl, queriedAt: new Date(now()).toISOString()} : selectedSeries.patternSource || null,
          sources: patternUrl ? [...(selectedSeries.sources || []), {kind: 'secondary', name: 'Fuente indicada por usuario', url: patternUrl, queriedAt: new Date(now()).toISOString()}] : selectedSeries.sources || []
        };
        state = saveCatalogEntry(state, selectedSeries, edited);
        persist();
        render();
        renderAddStatus('Obra guardada en tu biblioteca local.');
        selectedSeries = null;
        elements('seriesConfirmation')?.classList.add('is-hidden');
        return;
      }
      if (event.target.closest?.('[data-cancel-series]')) {
        selectedSeries = null;
        elements('seriesConfirmation')?.classList.add('is-hidden');
        return;
      }
      const action = event.target.closest?.('[data-progress-action]');
      const calendarDay = event.target.closest?.('[data-calendar-day]');
      if (calendarDay) {
        state.preferences.selectedDay = calendarDay.dataset.calendarDay;
        persist();
        renderCalendar();
        return;
      }
      const goWeek = event.target.closest?.('[data-calendar-week]');
      if (goWeek) {
        const current = state.preferences.calendarWeek || mondayOf(mexicoDate(now()));
        state.preferences.calendarWeek = addDays(current, Number(goWeek.dataset.calendarWeek));
        state.preferences.selectedDay = state.preferences.calendarWeek;
        persist();
        renderCalendar();
        return;
      }
      if (!action) return;
      const id = action.dataset.id;
      const entry = entryMap(CATALOG, state)[id];
      const tracking = normalizeTracking(state.tracking[id]);
      if (isMovie(entry)) {
        if (action.dataset.progressAction === 'watched') setTracking(id, {status: 'Terminada'});
        if (action.dataset.progressAction === 'favorite') setTracking(id, {favorite: !tracking.favorite});
        return;
      }
      const available = availableFor(entry, tracking);
      const manualStatus = tracking.manualFields.includes('status');
      if (action.dataset.progressAction === 'plus') setTracking(id, {seen: Math.min(9999, tracking.seen + 1), ...(manualStatus ? {} : {status: 'Viendo'})});
      if (action.dataset.progressAction === 'minus') setTracking(id, {seen: Math.max(0, tracking.seen - 1), ...(manualStatus ? {} : {status: tracking.seen <= 1 ? 'Pendiente' : 'Viendo'})});
      if (action.dataset.progressAction === 'catchup' && available > 0) setTracking(id, {seen: Math.max(tracking.seen, available), ...(manualStatus ? {} : {status: 'Al día'})});
      if (action.dataset.progressAction === 'favorite') setTracking(id, {favorite: !tracking.favorite});
    });
    document.addEventListener('change', (event) => {
      const field = event.target.closest?.('[data-progress-field]');
      if (!field) return;
      const id = field.dataset.id;
      if (field.dataset.progressField === 'watchedAt') {
        const date = field.value;
        if (isMovie(entryMap(CATALOG, state)[id]) && (!date || /^\d{4}-\d{2}-\d{2}$/.test(date))) setTracking(id, {watchedAt: date || null});
        return;
      }
      const value = field.dataset.progressField === 'status' ? field.value : field.dataset.progressField === 'seen' && field.value === '' ? 0 : optionalFormInteger(field.value);
      if (field.dataset.progressField === 'status' && !['Pendiente', 'Viendo', 'Al día', 'Terminada', 'Descartada'].includes(value)) return;
      if (field.dataset.progressField !== 'status' && field.value !== '' && value === null) return;
      const manualFields = new Set(normalizeTracking(state.tracking[id]).manualFields);
      manualFields.add(field.dataset.progressField);
      setTracking(id, {[field.dataset.progressField]: value, manualFields: [...manualFields]});
    });
  }
  elements('previousWeek')?.addEventListener?.('click', () => {
    const button = {dataset: {calendarWeek: '-7'}};
    state.preferences.calendarWeek = addDays(state.preferences.calendarWeek || mondayOf(mexicoDate(now())), -7);
    state.preferences.selectedDay = state.preferences.calendarWeek;
    persist();
    renderCalendar();
  });
  elements('nextWeek')?.addEventListener?.('click', () => {
    state.preferences.calendarWeek = addDays(state.preferences.calendarWeek || mondayOf(mexicoDate(now())), 7);
    state.preferences.selectedDay = state.preferences.calendarWeek;
    persist();
    renderCalendar();
  });
  elements('currentWeek')?.addEventListener?.('click', () => {
    const week = mondayOf(mexicoDate(now()));
    state.preferences.calendarWeek = week;
    state.preferences.selectedDay = week;
    persist();
    renderCalendar();
  });
  elements('calendarPlatform')?.addEventListener?.('change', (event) => { state.preferences.platform = event.target.value; persist(); renderCalendar(); });
  elements('calendarStatus')?.addEventListener?.('change', (event) => { state.preferences.status = event.target.value; persist(); renderCalendar(); });
  elements('progressSearch')?.addEventListener?.('input', () => renderProgress());
  elements('progressFilter')?.addEventListener?.('change', () => renderProgress());
  elements('progressSort')?.addEventListener?.('change', (event) => { state.preferences.sort = event.target.value; persist(); renderProgress(); });
  elements('createManualSeries')?.addEventListener?.('click', () => {
    selectedSeries = {id: createCustomId(), title: '', mediaKind: 'series', sources: [], airingStatus: 'UNKNOWN', totalEpisodes: null, availableEpisodes: null};
    renderSeriesConfirmation(selectedSeries);
    renderAddStatus('Ficha manual: completa al menos el título. Los datos sin fuente seguirán sin verificar.');
  });
  elements('createManualMovie')?.addEventListener?.('click', () => {
    selectedSeries = {id: createCustomId(), title: '', mediaKind: 'movie', sources: []};
    renderSeriesConfirmation(selectedSeries);
    renderAddStatus('Película manual: agrega el título; duración y estreno son opcionales.');
  });
  elements('exportMigrationBackup')?.addEventListener?.('click', () => {
    try {
      const previous = storage.getItem('racoon-v2-state:before-media-v1');
      if (previous) downloadFile('racoon-antes-v3.json', previous, 'application/json');
    } catch { setText('saveWarning', 'No se pudo leer el respaldo previo.'); }
  });
  elements('searchForm')?.addEventListener?.('submit', async (event) => {
    event.preventDefault();
    const query = elements('animeSearch')?.value?.trim();
    if (!query) return renderAddStatus('Escribe un título para buscar.');
    renderAddStatus('Consultando AniList…');
    try {
      const results = await searchAnime(query, {fetch});
      renderSearchResults(results);
      renderAddStatus(`${results.length} resultado${results.length === 1 ? '' : 's'} encontrado${results.length === 1 ? '' : 's'}.`);
    } catch (error) {
      renderAddStatus(`${error.message}. Puedes conservar tu biblioteca y volver a intentarlo más tarde.`);
    }
  });
  const showUpdate = (info) => {
    const message = elements('updateMessage');
    if (message) message.textContent = `Versión ${info.version} disponible. ${info.changes?.join(' · ') || 'Incluye mejoras de estabilidad.'}`;
    setText('updateStatus', `Versión ${info.version} disponible para instalar.`);
    const dialog = elements('updateDialog');
    if (dialog?.showModal && !dialog.open) dialog.showModal();
  };
  elements('dismissUpdate')?.addEventListener?.('click', () => elements('updateDialog')?.close?.());
  elements('applyUpdate')?.addEventListener?.('click', async () => { setText('updateStatus', 'Preparando actualización segura…'); const applied = await pwaController?.applyUpdate?.(); if (!applied) setText('updateStatus', 'La actualización aún no está lista; puedes intentarlo de nuevo.'); else elements('updateDialog')?.close?.(); });
  elements('checkUpdate')?.addEventListener?.('click', async () => {
    setText('updateStatus', 'Comprobando versión…');
    const result = await pwaController?.checkNow?.();
    if (!result?.available) setText('updateStatus', result?.error ? 'No se pudo comprobar la versión; inténtalo más tarde.' : 'Tienes la versión más reciente.');
  });
  elements('quickRefresh')?.addEventListener?.('click', () => refreshRemote(true));
  elements('exportBackup')?.addEventListener?.('click', () => {
    const exportedAt = new Date(now()).toISOString();
    state = {...state, updateMeta: {...state.updateMeta, lastBackupAt: exportedAt}};
    persist();
    downloadFile('racoon-respaldo.json', JSON.stringify(createBackup(state, exportedAt), null, 2), 'application/json;charset=utf-8');
    renderBackupSummary();
  });
  elements('exportCsv')?.addEventListener?.('click', () => downloadFile('racoon-progreso.csv', stateToCsv(state, allEntries()), 'text/csv;charset=utf-8'));
  elements('importBackup')?.addEventListener?.('click', () => elements('backupFile')?.click?.());
  elements('backupFile')?.addEventListener?.('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      pendingImport = parseBackup(JSON.parse(await file.text()));
      pendingImport.conflicts = Object.keys(pendingImport.state.tracking).filter((id) => state.tracking[id]);
      const details = elements('importDetails');
      if (details) details.innerHTML = `<p class="muted">Respaldo: ${escapeHtml(pendingImport.exportedAt || 'sin fecha')} · ${pendingImport.counts.series} obras · ${pendingImport.counts.tracking} seguimientos · ${pendingImport.invalidRecords} registros inválidos · ${pendingImport.conflicts.length} progresos ya existentes.</p>${pendingImport.invalidRecords ? '<p class="error-state">Hay identificadores inválidos. No se importará este archivo.</p>' : ''}`;
      elements('mergeImport').disabled = !pendingImport.valid;
      elements('replaceImport').disabled = !pendingImport.valid;
      elements('importDialog')?.showModal?.();
    } catch { setText('backupPreview', 'No se pudo leer el archivo JSON.'); }
    event.target.value = '';
  });
  elements('mergeImport')?.addEventListener?.('click', () => {
    if (!pendingImport || !globalThis.confirm?.('¿Fusionar este respaldo con tu biblioteca actual?')) return;
    state = mergeBackup(state, pendingImport);
    persist();
    elements('importDialog')?.close?.();
    pendingImport = null;
    render();
  });
  elements('replaceImport')?.addEventListener?.('click', () => {
    if (!pendingImport || !globalThis.confirm?.('¿Reemplazar toda tu biblioteca? Esta acción requiere un respaldo para deshacerla.')) return;
    state = replaceWithBackup(pendingImport);
    persist();
    elements('importDialog')?.close?.();
    pendingImport = null;
    render();
  });
  elements('cancelImport')?.addEventListener?.('click', () => elements('importDialog')?.close?.());
  elements('appVersion') && (elements('appVersion').textContent = `RACOON v${RACOON_VERSION}`);
  if (typeof window !== 'undefined' && globalThis.navigator?.serviceWorker) {
    registerPwa({navigator: globalThis.navigator, window, fetch, currentVersion: RACOON_VERSION, onUpdate: showUpdate}).then((controller) => { pwaController = controller; });
  }
  render();
  renderBackupSummary();
  if (typeof window !== 'undefined') {
    const refreshIfDue = () => { if (shouldRefresh(state.updateMeta, now())) refreshRemote(false); };
    refreshIfDue();
    window.setInterval?.(refreshIfDue, 60 * 1000);
    document.addEventListener?.('visibilitychange', () => { if (!document.hidden) refreshIfDue(); });
  }
  return {selectView, setTracking, render, refreshRemote, getState: () => state, getView: () => currentView, fetch};
}

if (typeof document !== 'undefined') createApp();
