import {CATALOG} from './catalog.mjs';
import {createDefaultState, loadState, saveState} from './storage.mjs';
import {buildCalendarModel} from './schedule.mjs';
import {mexicoDate} from './time.mjs';
import {searchAnime, fetchAnimeDetails, fetchSeasonalAnime, matchLegacyAnime} from './providers/anilist.mjs';
import {registerPwa} from './pwa.mjs';
import {createBackup, parseBackup, mergeBackup, replaceWithBackup, stateToCsv} from './backup.mjs';
import {shouldRefresh, refreshCatalog, FOUR_HOURS} from './refresh.mjs';

const RACOON_VERSION = '2.1.1';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function entryMap(catalog, state) {
  return Object.fromEntries([...catalog, ...Object.values(state.catalogOfficial), ...Object.values(state.catalogCustom)].map((entry) => [entry.id, entry]));
}

function availableFor(entry, tracking = {}) {
  return tracking.availableOverride ?? entry.availableEpisodes ?? 0;
}

function availableValue(entry, tracking = {}) {
  return tracking.availableOverride ?? entry.availableEpisodes ?? null;
}

function totalFor(entry, tracking = {}) {
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
  if (entry.kind === 'Finalizada') return null;
  const candidates = [];
  if (entry.date && entry.date >= today) candidates.push({date: entry.date, platformLabel: entry.platform || 'Plataforma pendiente'});
  if (entry.premiereDate && entry.premiereDate !== entry.date && entry.premiereDate >= today) candidates.push({date: entry.premiereDate, platformLabel: 'Fecha de estreno · AniList (Japón)'});
  const airingAt = Number(entry.nextAiring?.airingAt) * 1000;
  if (Number.isFinite(airingAt) && airingAt > 0) {
    const date = mexicoDate(airingAt);
    if (date >= today) candidates.push({date, platformLabel: 'Emisión japonesa · AniList'});
  }
  const schedule = entry.weeklySchedule;
  if (!schedule || !Number.isInteger(schedule.day) || !schedule.endDate) return candidates.sort((left, right) => left.date.localeCompare(right.date))[0] || null;
  const start = entry.date && entry.date > today ? entry.date : today;
  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = addDays(start, offset);
    const day = new Date(`${candidate}T12:00:00Z`).getUTCDay();
    const mondayIndex = day === 0 ? 6 : day - 1;
    if (mondayIndex === schedule.day && (!schedule.startDate || candidate >= schedule.startDate) && candidate <= schedule.endDate) candidates.push({date: candidate, platformLabel: entry.platform || 'Plataforma pendiente'});
  }
  return candidates.sort((left, right) => left.date.localeCompare(right.date))[0] || null;
}

export function buildDashboardModel(catalog, state, today = mexicoDate(Date.now())) {
  const entries = entryMap(catalog, state);
  const tracked = Object.entries(state.tracking)
    .map(([id, raw]) => ({id, entry: entries[id], tracking: normalizeTracking(raw)}))
    .filter(({entry}) => entry);
  const pending = tracked.map(({id, entry, tracking}) => ({id, entry, tracking, available: availableFor(entry, tracking), remaining: Math.max(0, availableFor(entry, tracking) - tracking.seen)}))
    .filter((item) => item.remaining > 0)
    .sort((left, right) => right.remaining - left.remaining || String(left.entry.title || left.entry.name).localeCompare(String(right.entry.title || right.entry.name)));
  const upcoming = Object.values(entries).map((entry) => {
    const event = nextWeeklyDate(entry, today);
    return event ? {...entry, ...event} : null;
  }).filter(Boolean).sort((left, right) => {
    const leftPriority = left.id?.startsWith('anilist:') || left.id?.startsWith('custom:') || state.tracking[left.id] ? 0 : 1;
    const rightPriority = right.id?.startsWith('anilist:') || right.id?.startsWith('custom:') || state.tracking[right.id] ? 0 : 1;
    return leftPriority - rightPriority || left.date.localeCompare(right.date);
  }).slice(0, 6);
  return {
    stats: {
      tracked: tracked.length,
      pendingSeries: pending.length,
      pendingEpisodes: pending.reduce((sum, item) => sum + item.remaining, 0),
      upToDate: tracked.filter(({entry, tracking}) => availableFor(entry, tracking) > 0 && tracking.seen >= availableFor(entry, tracking)).length
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
  const saved = {...entry, ...edits, id: entry.id, savedAt: Date.now()};
  if (entry.id.startsWith('custom:')) return {...state, catalogCustom: {...state.catalogCustom, [entry.id]: saved}};
  return {...state, catalogOfficial: {...state.catalogOfficial, [entry.id]: saved}};
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
    if (filter === 'pending' && !(remaining !== null && remaining > 0)) return false;
    if (filter === 'uptodate' && !(available !== null && available > 0 && tracking.seen >= available)) return false;
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
}

function memoryStorage() {
  const values = new Map();
  return {getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value))};
}

export function createApp({document = globalThis.document, storage = globalThis.localStorage || memoryStorage(), fetch = globalThis.fetch, now = Date.now} = {}) {
  let {state} = loadState(storage, CATALOG);
  let currentView = state.preferences.view || 'home';
  let searchResults = new Map();
  let selectedSeries = null;
  let pwaController = null;
  let pendingImport = null;
  const elements = (id) => document?.getElementById?.(id);

  function setText(id, value) {
    const node = elements(id);
    if (node) node.textContent = value;
  }

  function renderHome() {
    const model = buildDashboardModel(CATALOG, state, mexicoDate(now()));
    const stats = elements('homeStats');
    if (stats) stats.innerHTML = [
      ['tracked', model.stats.tracked, 'Series en seguimiento'],
      ['pending', model.stats.pendingEpisodes, 'Episodios pendientes'],
      ['current', model.stats.upToDate, 'Series al corriente'],
      ['upcoming', model.upcoming.length, 'Próximos estrenos']
    ].map(([, value, label]) => `<article class="stat-card"><strong>${value}</strong><span>${label}</span></article>`).join('');
    const pending = elements('pendingList');
    if (pending) pending.innerHTML = model.pending.length ? model.pending.slice(0, 4).map((item) => `<div class="stack-item"><div class="stack-icon">${escapeHtml(item.entry.icon || '✦')}</div><div class="stack-copy"><strong>${escapeHtml(item.entry.title || item.entry.name)}</strong><span>${item.remaining} episodio${item.remaining === 1 ? '' : 's'} pendiente${item.remaining === 1 ? '' : 's'}</span></div></div>`).join('') : '<div class="empty-state"><strong>Todo en calma</strong>No tienes episodios pendientes.</div>';
    const upcoming = elements('upcomingList');
    if (upcoming) upcoming.innerHTML = model.upcoming.length ? model.upcoming.slice(0, 4).map((entry) => `<div class="stack-item"><div class="stack-icon">${escapeHtml(entry.icon || '✦')}</div><div class="stack-copy"><strong>${escapeHtml(entry.title || entry.name)}</strong><span>${escapeHtml(entry.date)} · ${escapeHtml(entry.platformLabel || 'Fuente pendiente')}</span></div></div>`).join('') : '<div class="empty-state"><strong>Sin próximos estrenos</strong>Agrega una serie para verla aquí.</div>';
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
      const percent = available ? Math.min(100, Math.round((tracking.seen / available) * 100)) : 0;
      const poster = entry.poster ? `<img src="${escapeHtml(entry.poster)}" alt="" loading="lazy">` : escapeHtml(entry.icon || '✦');
      const availableLabel = available === null ? 'pendiente' : available;
      return `<article class="library-card" data-library-id="${escapeHtml(id)}"><div class="poster">${poster}</div><div class="card-content"><div class="card-topline"><span class="status-pill">${escapeHtml(tracking.status)}</span><button class="favorite-button ${tracking.favorite ? 'is-favorite' : ''}" type="button" data-progress-action="favorite" data-id="${escapeHtml(id)}" aria-label="${tracking.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${tracking.favorite ? '★' : '☆'}</button></div><h3>${escapeHtml(entry.title || entry.name)}</h3><div class="card-meta"><span>${tracking.seen} vistos · ${availableLabel} disponibles · ${total ?? '?'} total</span></div><div class="progress-line"><span style="width:${percent}%"></span></div><div class="progress-edit-grid"><label>Vistos<input type="number" min="0" max="9999" value="${tracking.seen}" data-progress-field="seen" data-id="${escapeHtml(id)}"></label><label>Disponibles<input type="number" min="0" max="9999" value="${available ?? ''}" placeholder="?" data-progress-field="availableOverride" data-id="${escapeHtml(id)}"></label><label>Total<input type="number" min="0" max="9999" value="${total ?? ''}" placeholder="?" data-progress-field="totalOverride" data-id="${escapeHtml(id)}"></label></div><div class="card-actions"><button class="mini-button" type="button" data-progress-action="minus" data-id="${escapeHtml(id)}">−1</button><button class="mini-button" type="button" data-progress-action="plus" data-id="${escapeHtml(id)}">＋1</button><button class="mini-button" type="button" data-progress-action="catchup" data-id="${escapeHtml(id)}"${available === null ? ' disabled' : ''}>Al corriente</button></div></div></article>`;
    });
    target.innerHTML = cards.join('') || '<div class="empty-state"><strong>Tu biblioteca está vacía</strong>Agrega tu primera serie.</div>';
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
      const platforms = [...new Set(Object.values(entries).flatMap((entry) => entry.platforms || entry.platform ? [entry.platform || entry.platforms?.[0]] : []).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'es'));
      platformSelect.innerHTML = ['<option value="all">Todas las plataformas</option>', ...platforms.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`)].join('');
      effectivePlatform = platforms.includes(selectedPlatform) ? selectedPlatform : 'all';
      platformSelect.value = effectivePlatform;
    }
    const model = buildCalendarModel(entries, state, {weekStart, selectedDay, platform: effectivePlatform, status: state.preferences.status || 'all'});
    const selector = elements('daySelector');
    if (selector) selector.innerHTML = model.days.map((day, index) => `<button class="day-chip ${day.date === model.selectedDay ? 'is-active' : ''}" type="button" data-calendar-day="${day.date}" role="tab" aria-selected="${day.date === model.selectedDay}"><strong>${DAY_NAMES[index]}</strong><small>${day.entries.length} estreno${day.entries.length === 1 ? '' : 's'}</small></button>`).join('');
    const calendar = elements('calendar');
    if (!calendar) return;
    calendar.innerHTML = model.days.map((day, index) => `<section class="calendar-day ${day.date === model.selectedDay ? 'is-selected' : ''}" data-calendar-panel="${day.date}"><header><h3>${DAY_NAMES[index]} · ${day.date.slice(8, 10)}/${day.date.slice(5, 7)}</h3><span>${day.entries.length}</span></header>${day.entries.length ? day.entries.map((entry) => `<article class="episode-card"><strong>${escapeHtml(entry.title || entry.name)}</strong><span>${escapeHtml(entry.episodeLabel)} · ${escapeHtml(entry.platformLabel || entry.platform || 'Plataforma pendiente')}</span><span class="confidence">${escapeHtml(entry.statusLabel)}${entry.mexicoTime ? ` · ${escapeHtml(entry.mexicoTime.slice(11))} CDMX` : ''}</span>${entry.sources?.[0]?.url ? `<a href="${escapeHtml(entry.sources[0].url)}" target="_blank" rel="noopener noreferrer">Ver fuente</a>` : ''}</article>`).join('') : '<div class="empty-state">Sin emisiones verificadas para este día</div>'}</section>`).join('');
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
    target.innerHTML = `<div class="panel-heading"><h3>Confirmar serie</h3><span class="badge badge-teal">${escapeHtml(entry.id)}</span></div><div class="series-form"><label>Título<input data-series-field="title" value="${escapeHtml(entry.title || '')}"></label><label>Títulos alternativos<input data-series-field="alternativeTitles" value="${escapeHtml((entry.alternativeTitles || []).join(', '))}"></label><label>Sinopsis<textarea data-series-field="synopsis" rows="4">${escapeHtml(entry.synopsis || '')}</textarea></label><div class="form-grid"><label>Géneros<input data-series-field="genres" value="${escapeHtml((entry.genres || []).join(', '))}" placeholder="Pendiente de verificar"></label><label>Temporada<input data-series-field="season" value="${escapeHtml(entry.season || '')}" placeholder="Pendiente"></label><label>Año<input type="number" data-series-field="seasonYear" value="${entry.seasonYear ?? ''}" placeholder="Pendiente"></label><label>Estreno<input type="date" data-series-field="premiereDate" value="${escapeHtml(entry.premiereDate || '')}"></label><label>Total de episodios<input type="number" min="0" data-series-field="totalEpisodes" value="${entry.totalEpisodes ?? ''}" placeholder="Pendiente"></label><label>Estado de emisión<input data-series-field="airingStatus" value="${escapeHtml(entry.airingStatus || '')}" placeholder="Pendiente"></label><label>Plataforma<input data-series-field="platform" value="${escapeHtml(entry.platform || entry.platforms?.[0] || '')}" placeholder="Pendiente de verificar"></label><label>Disponibilidad México<input data-series-field="regionalAvailability" value="${escapeHtml(entry.regionalAvailability || '')}" placeholder="Pendiente de verificar"></label></div></div><div class="tag-row"><span class="status-pill">ID permanente: ${escapeHtml(entry.id)}</span><span class="status-pill">Fuente consultada: AniList</span></div><p class="muted">Fuente: <a href="${escapeHtml(entry.sources?.[0]?.url || '#')}" target="_blank" rel="noopener noreferrer">AniList ↗</a>. Los campos regionales quedan sin verificar hasta confirmar una fuente mexicana.</p><div class="button-row"><button class="button button-primary" type="button" data-save-series="${escapeHtml(entry.id)}">Guardar en mi biblioteca</button><button class="button button-ghost" type="button" data-cancel-series>Cancelar</button></div>`;
  }

  function renderAddStatus(message = '') { setText('searchStatus', message); }

  function allEntries() {
    return Object.values({...Object.fromEntries(CATALOG.map((entry) => [entry.id, entry])), ...state.catalogOfficial, ...state.catalogCustom});
  }

  function renderBackupSummary() {
    const summary = elements('backupSummary');
    if (summary) summary.textContent = `${allEntries().length} series · ${Object.keys(state.tracking).length} con seguimiento`;
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
    setText('freshness', manual ? 'Actualizando fuentes…' : 'Comprobando fuentes…');
    const known = Object.values(state.catalogOfficial).filter((entry) => String(entry.id).startsWith('anilist:'));
    const cursor = Number(state.updateMeta?.anilistCursor) || 0;
    const batch = Array.from({length: Math.min(20, known.length)}, (_, index) => known[(cursor + index) % known.length]);
    const result = await refreshCatalog(state, async () => {
      const entries = [];
      const failures = [];
      const legacy = Object.values(state.catalogOfficial).filter((entry) => String(entry.id).startsWith('legacy:'));
      if (legacy.length) {
        try {
          const seasonal = await fetchSeasonalAnime({season: 'FALL', year: 2026, fetch});
          const used = new Set();
          for (const local of legacy) {
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
        } catch (error) { failures.push(error); }
      }
      for (const entry of batch) {
        try { entries.push({...entry, ...(await fetchAnimeDetails(entry.sourceId || entry.id.split(':')[1], {fetch}))}); } catch (error) { failures.push(error); /* conserva el último dato confirmado */ }
      }
      if (!entries.length && failures.length) throw failures[0];
      return {entries, incomplete: failures.length > 0};
    }, now());
    state = result.state;
    if (result.status !== 'failed' && known.length) state.updateMeta.anilistCursor = (cursor + batch.length) % known.length;
    saveState(storage, state);
    setText('freshness', result.status === 'completed' ? `Fuentes actualizadas · ${new Date(now()).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}` : result.status === 'no-update' ? 'Fuentes revisadas · sin novedades' : result.status === 'partial' ? 'Consulta parcial · algunos datos conservados' : 'Fuentes sin conexión · último dato conservado');
    render();
    return result;
  }

  function render() {
    renderHome();
    renderProgress();
    renderCalendar();
    if (document?.querySelectorAll) document.querySelectorAll('[data-view]').forEach((tab) => {
      const active = tab.dataset.view === currentView;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    if (document?.querySelectorAll) document.querySelectorAll('[role="tabpanel"]').forEach((panel) => panel.classList.toggle('is-hidden', panel.id !== `${currentView}View`));
  }

  function selectView(viewId) {
    if (!['home', 'calendar', 'progress', 'add', 'backups'].includes(viewId)) return;
    currentView = viewId;
    state = applyTrackingPatch({...state, preferences: {...state.preferences, view: viewId}}, '__view__', {}, now());
    delete state.tracking.__view__;
    state.preferences.view = viewId;
    saveState(storage, state);
    render();
  }

  function setTracking(id, patch) {
    state = applyTrackingPatch(state, id, patch, now());
    saveState(storage, state);
    render();
  }

  if (document?.addEventListener) {
    document.addEventListener('click', (event) => {
      const viewButton = event.target.closest?.('[data-view], [data-go]');
      if (viewButton) selectView(viewButton.dataset.view || viewButton.dataset.go);
      const seriesButton = event.target.closest?.('[data-series-select]');
      if (seriesButton) {
        const result = searchResults.get(seriesButton.dataset.seriesSelect);
        if (!result) return;
        selectedSeries = result;
        renderSeriesConfirmation(result);
        if (result.sourceId) fetchAnimeDetails(result.sourceId, {fetch}).then((details) => {
          selectedSeries = {...selectedSeries, ...details, platform: selectedSeries.platform, regionalAvailability: selectedSeries.regionalAvailability};
          renderSeriesConfirmation(selectedSeries);
        }).catch(() => { /* la ficha de búsqueda sigue siendo guardable sin enriquecer */ });
        return;
      }
      const saveSeries = event.target.closest?.('[data-save-series]');
      if (saveSeries && selectedSeries?.id === saveSeries.dataset.saveSeries) {
        const fields = Object.fromEntries([...document.querySelectorAll?.('[data-series-field]') || []].map((field) => [field.dataset.seriesField, field.value]));
        const edited = {
          ...selectedSeries,
          title: fields.title?.trim() || selectedSeries.title,
          alternativeTitles: fields.alternativeTitles?.split(',').map((value) => value.trim()).filter(Boolean) || selectedSeries.alternativeTitles || [],
          synopsis: fields.synopsis?.trim() || '',
          genres: fields.genres?.split(',').map((value) => value.trim()).filter(Boolean) || selectedSeries.genres || [],
          season: fields.season?.trim() || null,
          seasonYear: optionalFormInteger(fields.seasonYear),
          premiereDate: fields.premiereDate || null,
          totalEpisodes: optionalFormInteger(fields.totalEpisodes),
          airingStatus: fields.airingStatus?.trim() || 'UNKNOWN',
          platform: fields.platform?.trim() || null,
          platforms: fields.platform?.trim() ? [fields.platform.trim()] : [],
          regionalAvailability: fields.regionalAvailability?.trim() || null,
          regionalAvailabilityConfidence: fields.regionalAvailability?.trim() ? 'unverified' : 'unverified'
        };
        state = saveCatalogEntry(state, edited);
        saveState(storage, state);
        render();
        renderAddStatus('Serie guardada en tu biblioteca local.');
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
        saveState(storage, state);
        renderCalendar();
        return;
      }
      const goWeek = event.target.closest?.('[data-calendar-week]');
      if (goWeek) {
        const current = state.preferences.calendarWeek || mondayOf(mexicoDate(now()));
        state.preferences.calendarWeek = addDays(current, Number(goWeek.dataset.calendarWeek));
        state.preferences.selectedDay = state.preferences.calendarWeek;
        saveState(storage, state);
        renderCalendar();
        return;
      }
      if (!action) return;
      const id = action.dataset.id;
      const entry = entryMap(CATALOG, state)[id];
      const tracking = normalizeTracking(state.tracking[id]);
      const available = availableFor(entry, tracking);
      if (action.dataset.progressAction === 'plus') setTracking(id, {seen: Math.min(available || Number.MAX_SAFE_INTEGER, tracking.seen + 1), status: 'Viendo'});
      if (action.dataset.progressAction === 'minus') setTracking(id, {seen: Math.max(0, tracking.seen - 1), status: tracking.seen <= 1 ? 'Pendiente' : 'Viendo'});
      if (action.dataset.progressAction === 'catchup' && available > 0) setTracking(id, {seen: available, status: 'Al día'});
      if (action.dataset.progressAction === 'favorite') setTracking(id, {favorite: !tracking.favorite});
    });
    document.addEventListener('change', (event) => {
      const field = event.target.closest?.('[data-progress-field]');
      if (!field) return;
      const id = field.dataset.id;
      const value = field.value === '' ? null : Math.max(0, Number(field.value));
      const manualFields = new Set(normalizeTracking(state.tracking[id]).manualFields);
      manualFields.add(field.dataset.progressField);
      setTracking(id, {[field.dataset.progressField]: Number.isFinite(value) ? value : null, manualFields: [...manualFields]});
    });
  }
  elements('previousWeek')?.addEventListener?.('click', () => {
    const button = {dataset: {calendarWeek: '-7'}};
    state.preferences.calendarWeek = addDays(state.preferences.calendarWeek || mondayOf(mexicoDate(now())), -7);
    state.preferences.selectedDay = state.preferences.calendarWeek;
    saveState(storage, state);
    renderCalendar();
  });
  elements('nextWeek')?.addEventListener?.('click', () => {
    state.preferences.calendarWeek = addDays(state.preferences.calendarWeek || mondayOf(mexicoDate(now())), 7);
    state.preferences.selectedDay = state.preferences.calendarWeek;
    saveState(storage, state);
    renderCalendar();
  });
  elements('currentWeek')?.addEventListener?.('click', () => {
    const week = mondayOf(mexicoDate(now()));
    state.preferences.calendarWeek = week;
    state.preferences.selectedDay = week;
    saveState(storage, state);
    renderCalendar();
  });
  elements('calendarPlatform')?.addEventListener?.('change', (event) => { state.preferences.platform = event.target.value; saveState(storage, state); renderCalendar(); });
  elements('calendarStatus')?.addEventListener?.('change', (event) => { state.preferences.status = event.target.value; saveState(storage, state); renderCalendar(); });
  elements('progressSearch')?.addEventListener?.('input', () => renderProgress());
  elements('progressFilter')?.addEventListener?.('change', () => renderProgress());
  elements('progressSort')?.addEventListener?.('change', (event) => { state.preferences.sort = event.target.value; saveState(storage, state); renderProgress(); });
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
  elements('checkUpdate')?.addEventListener?.('click', async () => { setText('updateStatus', 'Comprobando versión…'); await pwaController?.checkNow?.(); });
  elements('quickRefresh')?.addEventListener?.('click', () => refreshRemote(true));
  elements('exportBackup')?.addEventListener?.('click', () => downloadFile('racoon-respaldo.json', JSON.stringify(createBackup(state), null, 2), 'application/json;charset=utf-8'));
  elements('exportCsv')?.addEventListener?.('click', () => downloadFile('racoon-progreso.csv', stateToCsv(state, allEntries()), 'text/csv;charset=utf-8'));
  elements('importBackup')?.addEventListener?.('click', () => elements('backupFile')?.click?.());
  elements('backupFile')?.addEventListener?.('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      pendingImport = parseBackup(JSON.parse(await file.text()));
      const details = elements('importDetails');
      if (details) details.innerHTML = `<p class="muted">${pendingImport.counts.series} series · ${pendingImport.counts.tracking} seguimientos · ${pendingImport.invalidRecords} registros inválidos.</p>`;
      elements('importDialog')?.showModal?.();
    } catch { setText('backupPreview', 'No se pudo leer el archivo JSON.'); }
    event.target.value = '';
  });
  elements('mergeImport')?.addEventListener?.('click', () => {
    if (!pendingImport || !globalThis.confirm?.('¿Fusionar este respaldo con tu biblioteca actual?')) return;
    state = mergeBackup(state, pendingImport.state);
    saveState(storage, state);
    elements('importDialog')?.close?.();
    pendingImport = null;
    render();
  });
  elements('replaceImport')?.addEventListener?.('click', () => {
    if (!pendingImport || !globalThis.confirm?.('¿Reemplazar toda tu biblioteca? Esta acción requiere un respaldo para deshacerla.')) return;
    state = replaceWithBackup(pendingImport.state);
    saveState(storage, state);
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
  return {selectView, setTracking, render, getState: () => state, getView: () => currentView, fetch};
}

if (typeof document !== 'undefined') createApp();
