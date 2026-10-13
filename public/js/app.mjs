import {CATALOG} from './catalog.mjs';
import {createDefaultState, loadState, saveState} from './storage.mjs';
import {buildCalendarModel} from './schedule.mjs';
import {searchAnime, fetchAnimeDetails} from './providers/anilist.mjs';
import {registerPwa} from './pwa.mjs';
import {createBackup, parseBackup, mergeBackup, replaceWithBackup, stateToCsv} from './backup.mjs';
import {shouldRefresh, refreshCatalog, FOUR_HOURS} from './refresh.mjs';

const RACOON_VERSION = '2.0.0';

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function entryMap(catalog, state) {
  return Object.fromEntries([...catalog, ...Object.values(state.catalogOfficial), ...Object.values(state.catalogCustom)].map((entry) => [entry.id, entry]));
}

function availableFor(entry, tracking = {}) {
  return tracking.availableOverride ?? entry.availableEpisodes ?? 0;
}

function totalFor(entry, tracking = {}) {
  return tracking.totalOverride ?? entry.totalEpisodes ?? null;
}

function normalizeTracking(tracking = {}) {
  return {seen: 0, status: 'Pendiente', favorite: false, changedAt: 0, availableOverride: null, totalOverride: null, manualFields: [], ...tracking};
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

export function buildDashboardModel(catalog, state, today = new Date().toISOString().slice(0, 10)) {
  const entries = entryMap(catalog, state);
  const tracked = Object.entries(state.tracking)
    .map(([id, raw]) => ({id, entry: entries[id], tracking: normalizeTracking(raw)}))
    .filter(({entry}) => entry);
  const pending = tracked.map(({id, entry, tracking}) => ({id, entry, tracking, available: availableFor(entry, tracking), remaining: Math.max(0, availableFor(entry, tracking) - tracking.seen)}))
    .filter((item) => item.remaining > 0)
    .sort((left, right) => right.remaining - left.remaining || String(left.entry.title || left.entry.name).localeCompare(String(right.entry.title || right.entry.name)));
  const upcoming = Object.values(entries).filter((entry) => entry.date && entry.date >= today && entry.kind !== 'Finalizada').sort((left, right) => left.date.localeCompare(right.date)).slice(0, 6);
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
    const model = buildDashboardModel(CATALOG, state, new Date(now()).toISOString().slice(0, 10));
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
    if (upcoming) upcoming.innerHTML = model.upcoming.length ? model.upcoming.slice(0, 4).map((entry) => `<div class="stack-item"><div class="stack-icon">${escapeHtml(entry.icon || '✦')}</div><div class="stack-copy"><strong>${escapeHtml(entry.title || entry.name)}</strong><span>${escapeHtml(entry.date)} · ${escapeHtml(entry.platform || 'Fuente pendiente')}</span></div></div>`).join('') : '<div class="empty-state"><strong>Sin próximos estrenos</strong>Agrega una serie para verla aquí.</div>';
    setText('homeUpdated', 'Guardado local · datos verificables');
  }

  function renderProgress() {
    const target = elements('progressList');
    if (!target) return;
    const entries = entryMap(CATALOG, state);
    const cards = Object.entries(entries).map(([id, entry]) => {
      const tracking = normalizeTracking(state.tracking[id]);
      const available = availableFor(entry, tracking);
      const total = totalFor(entry, tracking);
      const percent = available ? Math.min(100, Math.round((tracking.seen / available) * 100)) : 0;
      return `<article class="library-card" data-library-id="${escapeHtml(id)}"><div class="poster">${escapeHtml(entry.icon || '✦')}</div><div class="card-content"><span class="status-pill">${escapeHtml(tracking.status)}</span><h3>${escapeHtml(entry.title || entry.name)}</h3><div class="card-meta">${tracking.seen} vistos · ${available} disponibles · ${total ?? '?'} total</div><div class="progress-line"><span style="width:${percent}%"></span></div><div class="card-actions"><button class="mini-button" type="button" data-progress-action="minus" data-id="${escapeHtml(id)}">−1</button><button class="mini-button" type="button" data-progress-action="plus" data-id="${escapeHtml(id)}">＋1</button><button class="mini-button" type="button" data-progress-action="catchup" data-id="${escapeHtml(id)}">Al corriente</button></div></div></article>`;
    });
    target.innerHTML = cards.join('') || '<div class="empty-state"><strong>Tu biblioteca está vacía</strong>Agrega tu primera serie.</div>';
  }

  function renderCalendar() {
    const today = new Date(now()).toISOString().slice(0, 10);
    const weekStart = state.preferences.calendarWeek || mondayOf(today);
    const selectedDay = state.preferences.selectedDay || weekStart;
    const entries = Object.values({...Object.fromEntries(CATALOG.map((entry) => [entry.id, entry])), ...state.catalogOfficial, ...state.catalogCustom});
    const model = buildCalendarModel(entries, state, {weekStart, selectedDay, platform: state.preferences.platform || 'all', status: state.preferences.status || 'all'});
    const selector = elements('daySelector');
    if (selector) selector.innerHTML = model.days.map((day, index) => `<button class="day-chip ${day.date === model.selectedDay ? 'is-active' : ''}" type="button" data-calendar-day="${day.date}" role="tab" aria-selected="${day.date === model.selectedDay}"><strong>${DAY_NAMES[index]}</strong><small>${day.entries.length} estreno${day.entries.length === 1 ? '' : 's'}</small></button>`).join('');
    const calendar = elements('calendar');
    if (!calendar) return;
    calendar.innerHTML = model.days.map((day, index) => `<section class="calendar-day ${day.date === model.selectedDay ? 'is-selected' : ''}" data-calendar-panel="${day.date}"><header><h3>${DAY_NAMES[index]} · ${day.date.slice(8, 10)}/${day.date.slice(5, 7)}</h3><span>${day.entries.length}</span></header>${day.entries.length ? day.entries.map((entry) => `<article class="episode-card"><strong>${escapeHtml(entry.title || entry.name)}</strong><span>${escapeHtml(entry.episodeLabel)} · ${escapeHtml(entry.platform || 'Plataforma pendiente')}</span><span class="confidence">${escapeHtml(entry.statusLabel)}${entry.mexicoTime ? ` · ${escapeHtml(entry.mexicoTime.slice(11))} CDMX` : ''}</span></article>`).join('') : '<div class="empty-state">Sin estrenos</div>'}</section>`).join('');
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
    target.innerHTML = `<div class="panel-heading"><h3>Confirmar serie</h3><span class="badge badge-teal">${escapeHtml(entry.id)}</span></div><h3>${escapeHtml(entry.title)}</h3><p class="muted">${escapeHtml(entry.synopsis || 'Sin sinopsis verificada.')}</p><div class="tag-row"><span class="status-pill">Temporada: ${escapeHtml(entry.season || 'Pendiente de verificar')}</span><span class="status-pill">Total: ${entry.totalEpisodes ?? 'Pendiente de verificar'}</span><span class="status-pill">Emisión: ${escapeHtml(entry.airingStatus || 'Pendiente de verificar')}</span></div><p class="muted">Fuente: <a href="${escapeHtml(entry.sources?.[0]?.url || '#')}" target="_blank" rel="noopener noreferrer">AniList ↗</a>. Puedes guardarla aunque falten datos.</p><div class="button-row"><button class="button button-primary" type="button" data-save-series="${escapeHtml(entry.id)}">Guardar en mi biblioteca</button><button class="button button-ghost" type="button" data-cancel-series>Cancelar</button></div>`;
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
    const known = Object.values(state.catalogOfficial).filter((entry) => String(entry.id).startsWith('anilist:')).slice(0, 20);
    const result = await refreshCatalog(state, async () => {
      const entries = [];
      for (const entry of known) {
        try { entries.push(await fetchAnimeDetails(entry.sourceId || entry.id.split(':')[1], {fetch})); } catch { /* conserva el último dato confirmado */ }
      }
      return entries;
    }, now());
    state = result.state;
    saveState(storage, state);
    setText('freshness', result.status === 'completed' ? 'Fuentes revisadas · datos locales intactos' : 'Fuentes sin conexión · último dato conservado');
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
        return;
      }
      const saveSeries = event.target.closest?.('[data-save-series]');
      if (saveSeries && selectedSeries?.id === saveSeries.dataset.saveSeries) {
        state = saveCatalogEntry(state, selectedSeries);
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
        const current = state.preferences.calendarWeek || mondayOf(new Date(now()).toISOString().slice(0, 10));
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
      if (action.dataset.progressAction === 'catchup') setTracking(id, {seen: available, status: 'Al día'});
    });
  }
  elements('previousWeek')?.addEventListener?.('click', () => {
    const button = {dataset: {calendarWeek: '-7'}};
    state.preferences.calendarWeek = addDays(state.preferences.calendarWeek || mondayOf(new Date(now()).toISOString().slice(0, 10)), -7);
    state.preferences.selectedDay = state.preferences.calendarWeek;
    saveState(storage, state);
    renderCalendar();
  });
  elements('nextWeek')?.addEventListener?.('click', () => {
    state.preferences.calendarWeek = addDays(state.preferences.calendarWeek || mondayOf(new Date(now()).toISOString().slice(0, 10)), 7);
    state.preferences.selectedDay = state.preferences.calendarWeek;
    saveState(storage, state);
    renderCalendar();
  });
  elements('currentWeek')?.addEventListener?.('click', () => {
    const week = mondayOf(new Date(now()).toISOString().slice(0, 10));
    state.preferences.calendarWeek = week;
    state.preferences.selectedDay = week;
    saveState(storage, state);
    renderCalendar();
  });
  elements('calendarPlatform')?.addEventListener?.('change', (event) => { state.preferences.platform = event.target.value; saveState(storage, state); renderCalendar(); });
  elements('calendarStatus')?.addEventListener?.('change', (event) => { state.preferences.status = event.target.value; saveState(storage, state); renderCalendar(); });
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
  elements('applyUpdate')?.addEventListener?.('click', () => { elements('updateDialog')?.close?.(); pwaController?.applyUpdate?.(); });
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
    window.setInterval?.(refreshIfDue, Math.min(FOUR_HOURS, 60 * 1000));
    document.addEventListener?.('visibilitychange', () => { if (!document.hidden) refreshIfDue(); });
  }
  return {selectView, setTracking, render, getState: () => state, getView: () => currentView, fetch};
}

if (typeof document !== 'undefined') createApp();
