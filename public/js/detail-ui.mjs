import {isMovie} from './media.mjs';

const html = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
function http(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
function progress(entry, tracking) {
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const seen = count(tracking.seen) || 0;
  const available = count(tracking.availableOverride ?? entry.availableEpisodes);
  const total = count(tracking.totalOverride ?? entry.totalEpisodes);
  const denominator = total ?? available;
  return {seen, available, total, pending: available === null ? null : Math.max(0, available - seen), percent: denominator > 0 ? Math.min(100, Math.round(seen / denominator * 100)) : null};
}
function status(entry, tracking) {
  return isMovie(entry) && tracking.status === 'Terminada' ? 'Vista' : tracking.status || 'Pendiente';
}
function poster(entry) {
  const url = http(entry.poster);
  return `<div class="poster">${url ? `<img src="${html(url)}" alt="" loading="lazy">` : html(entry.icon || '✦')}</div>`;
}
function summary(entry, tracking) {
  if (isMovie(entry)) return `Película · ${html(status(entry, tracking))}${entry.durationMinutes ? ` · ${html(entry.durationMinutes)} min` : ''}`;
  const p = progress(entry, tracking);
  return `${p.seen} vistos · ${p.available ?? '?'} disponibles · ${p.pending ?? '?'} pendientes · ${p.total ?? '?'} total`;
}

export function renderLibraryCard(entry, tracking = {}) {
  const p = progress(entry, tracking);
  return `<article class="library-card compact-card" data-library-id="${html(entry.id)}">${poster(entry)}<div class="card-content"><div class="card-topline"><span class="status-pill">${html(status(entry, tracking))}</span>${tracking.favorite ? '<span class="favorite-mark" aria-label="Favorita">★</span>' : ''}</div><h3>${html(entry.title || entry.name)}</h3><p class="card-meta">${summary(entry, tracking)}</p>${!isMovie(entry) && p.percent !== null ? `<div class="progress-line" role="progressbar" aria-label="Progreso de ${html(entry.title || entry.name)}" aria-valuenow="${p.percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p.percent}%"></span></div>` : ''}<button class="mini-button" type="button" data-open-detail="${html(entry.id)}" aria-label="Abrir ficha de ${html(entry.title || entry.name)}">Abrir ficha</button></div></article>`;
}

export function renderWorkDetail(entry, tracking = {}, {folderContent = '', seasonContent = ''} = {}) {
  const id = html(entry.id);
  const p = progress(entry, tracking);
  const statuses = isMovie(entry) ? [['Pendiente', 'Pendiente'], ['Viendo', 'Viendo'], ['Terminada', 'Vista'], ['Descartada', 'Descartada']] : ['Pendiente', 'Viendo', 'Al día', 'Terminada', 'Descartada'].map(value => [value, value]);
  if (isMovie(entry) && tracking.status === 'Al día') statuses.push(['Al día', 'Al día (estado anterior)']);
  const stateControl = `<label>Estado<select data-progress-field="status" data-id="${id}">${statuses.map(([value, label]) => `<option value="${value}"${(tracking.status || 'Pendiente') === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label>`;
  const fields = isMovie(entry) ? `<label>Fecha en que la viste (opcional)<input type="date" data-progress-field="watchedAt" data-id="${id}" value="${html(tracking.watchedAt || '')}"></label>` : [['seen', 'Vistos', p.seen], ['availableOverride', 'Disponibles', p.available], ['totalOverride', 'Total', p.total]].map(([field, label, value]) => `<label>${label}<input type="number" min="0" max="9999" data-progress-field="${field}" data-id="${id}" value="${value ?? ''}" placeholder="Sin verificar"></label>`).join('');
  const actions = isMovie(entry) ? `<button class="mini-button" type="button" data-progress-action="watched" data-id="${id}">Ya la vi</button>` : `<button class="mini-button" type="button" data-progress-action="minus" data-id="${id}">−1</button><button class="mini-button" type="button" data-progress-action="plus" data-id="${id}">+1</button><button class="mini-button" type="button" data-progress-action="catchup" data-id="${id}"${p.available === null || p.available <= 0 ? ' disabled' : ''}>Al corriente</button>`;
  const sources = (entry.sources || []).filter(source => http(source.url)).map(source => `<li><a href="${html(http(source.url))}" target="_blank" rel="noopener noreferrer">${html(source.name || 'Ver fuente')} ↗</a>${source.queriedAt ? ` · consulta ${html(String(source.queriedAt).slice(0, 10))}` : ' · sin fecha de consulta'}</li>`).join('');
  const trust = isMovie(entry) ? '' : `<p class="muted" data-detail-trust>Disponibles: ${tracking.availableOverride != null ? 'ajuste local' : entry.availableConfidence === 'confirmed' ? 'confirmado' : 'sin verificar'}. Total: ${tracking.totalOverride != null ? 'ajuste local' : entry.totalConfidence === 'confirmed' ? 'confirmado' : 'sin verificar'}.</p>`;
  return `<header class="detail-heading"><div>${poster(entry)}<h2 id="workDetailTitle">${html(entry.title || entry.name)}</h2><p class="muted">${isMovie(entry) ? 'Película' : 'Serie / temporada'}${entry.seasonYear ? ` · ${html(entry.seasonYear)}` : ''}</p></div><button class="mini-button" type="button" data-close-detail aria-label="Cerrar ficha">Cerrar ✕</button></header><div data-detail-description><p>${html(entry.synopsis || 'Sin sinopsis verificada.')}</p>${entry.genres?.length ? `<p class="muted">${entry.genres.map(html).join(' · ')}</p>` : ''}</div><section class="detail-section"><h3>Tu seguimiento</h3><p data-detail-summary>${summary(entry, tracking)}</p><div class="form-grid detail-fields">${stateControl}${fields}</div><div class="card-actions">${actions}<button class="mini-button" type="button" data-progress-action="favorite" data-id="${id}">${tracking.favorite ? '★ Quitar favorita' : '☆ Marcar favorita'}</button></div>${trust}</section>${folderContent}${seasonContent}<section class="detail-section" data-detail-evidence><h3>Disponibilidad y fuentes</h3><p>${html(entry.platform || 'Plataforma sin verificar')} · ${html(entry.regionalAvailability || 'Disponibilidad en México sin verificar')}</p><p class="muted">${entry.regionalAvailabilityConfidence === 'confirmed' ? 'Disponibilidad regional confirmada en los datos de la ficha.' : 'Sin verificar: una plataforma indicada no confirma que esté incluida en tu suscripción en México.'}</p>${sources ? `<ul class="detail-sources">${sources}</ul>` : '<p class="muted">Sin fuentes registradas.</p>'}</section>${!entry.id.startsWith('legacy:') ? `<div class="button-row detail-section"><button class="mini-button" type="button" data-series-edit="${id}">Editar datos de la ficha</button><button class="mini-button" type="button" data-series-delete="${id}">Eliminar obra</button></div>` : ''}`;
}
