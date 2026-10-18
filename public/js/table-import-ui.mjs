import {readTableFile} from './table-reader.mjs';
import {IMPORT_FIELDS, prepareTable, suggestMapping, buildImportPreview, applyTableImport} from './table-import.mjs';
import {createBackup} from './backup.mjs';
import {listFolders} from './folders.mjs';

export const TABLE_ROLLBACK_KEY = 'racoon-v2-state:before-table-import';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
export function registerTableImporter({document, storage, getState, commitState, download, now = Date.now}) {
  const el = id => document.getElementById(id);
  if (!el('tableFile')) return;
  let sheets = [], table, mapping, preview = [], choices = {}, page = 0, epoch = 0, sourceName = '';
  const status = message => { el('tableStatusMessage').textContent = message; };
  const choice = row => choices[row.index] || (row.kind === 'new' ? 'import' : 'skip');
  const summary = () => {
    const selected = preview.filter(row => row.kind !== 'invalid' && choice(row) !== 'skip').length;
    el('tableCounts').textContent = `${preview.length} filas · ${selected} seleccionadas · ${preview.filter(row => row.kind === 'duplicate').length} duplicadas · ${preview.filter(row => row.kind === 'invalid').length} inválidas. Página ${page + 1} de ${Math.max(1, Math.ceil(preview.length / 100))}.`;
    el('applyTableImport').disabled = !selected;
    el('tablePrevious').disabled = page === 0;
    el('tableNext').disabled = (page + 1) * 100 >= preview.length;
  };
  function rows() {
    el('tablePreview').innerHTML = preview.slice(page * 100, (page + 1) * 100).map(row => `<tr><td>${row.index + 1}</td><td>${escape(row.record?.title || row.title)}<small>${escape(row.message)}</small>${row.record ? `<small>${escape([row.record.format === 'movie' ? '' : `Vistos: ${row.record.seen ?? '?'} · Disponibles: ${row.record.available ?? '?'} · Total: ${row.record.total ?? '?'}`, row.record.rating === null ? '' : `Nota: ${row.record.rating}/10`, row.record.favorite ? 'Favorito' : '', row.record.folders.length ? `Carpetas: ${row.record.folders.join('; ')}` : '', row.record.watchedAt ? `Fecha vista: ${row.record.watchedAt}` : ''].filter(Boolean).join(' · '))}</small>` : ''}</td><td>${row.record?.format === 'movie' ? 'Película' : 'Serie/temporada'}<small>${escape(row.record?.status || '')}</small></td><td><select aria-label="Acción fila ${row.index + 1}" data-import-row="${row.index}" ${row.kind === 'invalid' ? 'disabled' : ''}><option value="skip" ${choice(row) === 'skip' ? 'selected' : ''}>Omitir</option>${row.kind !== 'invalid' ? `<option value="${row.kind === 'duplicate' ? 'create' : 'import'}" ${choice(row) !== 'skip' ? 'selected' : ''}>${row.kind === 'duplicate' ? 'Crear ficha distinta' : 'Importar'}</option>` : ''}</select></td></tr>`).join('');
    summary();
  }
  function rebuild() {
    choices = {}; page = 0;
    try {
      preview = buildImportPreview(getState(), table, mapping, {format: el('tableFormat').value, status: el('tableStatus').value, date1904: sheets[Number(el('tableSheet').value)]?.date1904});
      rows(); status('Revisa las filas y columnas antes de importar. Las duplicadas se omiten por defecto.');
    } catch (error) { preview = []; rows(); status(error.message); }
  }
  function selectSheet(header) {
    table = prepareTable(sheets[Number(el('tableSheet').value)].rows, header);
    el('tableHeader').checked = table.hasHeader;
    mapping = suggestMapping(table.headers);
    el('tableMapping').innerHTML = IMPORT_FIELDS.map(([key, label]) => `<label>${escape(label)}<select data-import-field="${key}"><option value="">No importar</option>${table.headers.map((name, index) => `<option value="${index}" ${mapping[key] === index ? 'selected' : ''}>${index + 1}. ${escape(name)}</option>`).join('')}</select></label>`).join('');
    rebuild();
  }
  function cancel() {
    epoch++; sheets = []; preview = []; choices = {}; table = null;
    el('tableOptions').hidden = true; el('tableFile').value = ''; status('Importación cancelada; no se guardaron cambios.');
  }
  el('tableFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    const request = ++epoch;
    preview = []; el('tableOptions').hidden = true; el('applyTableImport').disabled = true;
    if (!file) return;
    status('Leyendo archivo en este dispositivo…');
    try {
      const loaded = await readTableFile(file);
      if (request !== epoch) return;
      if (!loaded.length) throw new Error('No se encontraron hojas.');
      sheets = loaded; sourceName = file.name;
      el('tableSheet').innerHTML = sheets.map((sheet, index) => `<option value="${index}">${escape(sheet.name)}</option>`).join('');
      el('tableFolder').innerHTML = '<option value="">Sin carpeta adicional</option>' + listFolders(getState()).map(folder => `<option value="${escape(folder.id)}">${escape(folder.name)}</option>`).join('');
      el('tableOptions').hidden = false; selectSheet();
    } catch (error) { if (request === epoch) status(error.message); }
  });
  el('tableSheet').addEventListener('change', () => selectSheet());
  el('tableHeader').addEventListener('change', () => selectSheet(el('tableHeader').checked));
  el('tableMapping').addEventListener('change', event => { const field = event.target.dataset.importField; if (field) { mapping[field] = event.target.value; rebuild(); } });
  for (const id of ['tableFormat', 'tableStatus']) el(id).addEventListener('change', rebuild);
  el('tablePreview').addEventListener('change', event => { if (event.target.dataset.importRow != null) { choices[event.target.dataset.importRow] = event.target.value; summary(); } });
  el('tablePrevious').addEventListener('click', () => { page--; rows(); });
  el('tableNext').addEventListener('click', () => { page++; rows(); });
  el('cancelTableImport').addEventListener('click', cancel);
  el('applyTableImport').addEventListener('click', () => {
    try {
      const current = getState();
      const folderId = el('tableFolder').value;
      if (folderId && !listFolders(current).some(folder => folder.id === folderId)) throw new Error('La carpeta cambió; vuelve a abrir el archivo.');
      const result = applyTableImport(current, preview, choices, {sourceName, folderId, now: now()});
      if (!result.imported) { status('No hay fichas nuevas para guardar; revisa las duplicadas.'); return; }
      const backup = JSON.stringify(createBackup(current, new Date(now()).toISOString()));
      storage.setItem(TABLE_ROLLBACK_KEY, backup);
      if (storage.getItem(TABLE_ROLLBACK_KEY) !== backup) throw new Error('No se pudo verificar el respaldo previo.');
      el('exportTableRollback').hidden = false;
      if (!commitState(result.state)) throw new Error('No se pudo guardar. La biblioteca conserva su estado anterior.');
      const message = `${result.imported} fichas importadas · ${result.skipped} omitidas. Respaldo previo disponible para descargar y restaurar como JSON.`;
      cancel(); status(message);
    } catch (error) { status(`Importación detenida: ${error.message}`); }
  });
  el('exportTableRollback').addEventListener('click', () => {
    try { const backup = storage.getItem(TABLE_ROLLBACK_KEY); if (backup) download('racoon-antes-importacion.json', backup, 'application/json;charset=utf-8'); }
    catch { status('No se pudo leer el respaldo previo.'); }
  });
  try { el('exportTableRollback').hidden = !storage.getItem(TABLE_ROLLBACK_KEY); } catch { /* Storage may be unavailable. */ }
}
