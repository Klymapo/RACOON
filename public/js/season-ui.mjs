// El vínculo entre temporadas nunca se deduce del parecido de sus nombres.
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderSeasonGrouping(state, entryId) {
  const lib = state.mediaLibrary || {}, link = lib.catalogLinks?.[entryId];
  const entry = state.catalogCustom?.[entryId] || state.catalogOfficial?.[entryId];
  if (!entry || entry.mediaKind === 'movie' || !link?.seasonId) return '';
  const work = lib.works?.[link.workId], season = lib.seasons?.[link.seasonId];
  if (!work || !season) return '';
  const catalog = {...state.catalogOfficial, ...state.catalogCustom};
  const siblings = Object.values(lib.seasons || {}).filter(s => s.workId === work.id)
    .sort((a,b) => (a.number ?? 99999) - (b.number ?? 99999) || String(a.title).localeCompare(String(b.title),'es'));
  const works = Object.values(lib.works || {}).filter(w => w.kind === 'series')
    .sort((a,b) => String(a.title).localeCompare(String(b.title),'es'));
  return `<section class="detail-section season-grouping" data-detail-seasons><h3>Temporadas de esta obra</h3>
    <p class="muted">Agrupa manualmente solo temporadas de la misma serie. Su avance y favoritos permanecen independientes.</p>
    <ul class="season-linked">${siblings.map(s => `<li><span>${s.number == null ? 'Sin número' : 'T'+s.number} · ${html(catalog[s.catalogId]?.title || s.title)} <small>${state.tracking?.[s.catalogId]?.seen ?? 0} vistos</small></span>${s.catalogId !== entryId ? `<button class="mini-button" type="button" data-season-open="${html(s.catalogId)}">Abrir</button>` : '<strong class="muted">Actual</strong>'}</li>`).join('')}</ul>
    <div class="form-grid season-controls"><label>Número de esta temporada<input data-season-number type="number" min="1" max="9999" step="1" value="${season.number ?? ''}" placeholder="Sin número"></label>
    <label>Vincular a obra<select data-season-work>${works.map(w => `<option value="${html(w.id)}"${w.id===work.id ? ' selected' : ''}>${html(w.title)} (${Object.values(lib.seasons).filter(s=>s.workId===w.id).length} temp.)${w.id===work.id?' · actual':''}</option>`).join('')}</select></label></div>
    <div class="button-row"><button class="mini-button" type="button" data-season-link="${html(entryId)}">Guardar agrupación</button>
    ${siblings.length>1 ? `<button class="mini-button" type="button" data-season-detach="${html(entryId)}">Separar esta temporada</button>` : ''}</div>
    <p role="status" class="muted" data-season-status></p></section>`;
}
