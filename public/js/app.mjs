import {CATALOG} from './catalog.mjs';
import {createDefaultState, loadState, saveState} from './storage.mjs';

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

  function render() {
    renderHome();
    renderProgress();
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
      const action = event.target.closest?.('[data-progress-action]');
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
  render();
  return {selectView, setTracking, render, getState: () => state, getView: () => currentView, fetch};
}

if (typeof document !== 'undefined') createApp();
