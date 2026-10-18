import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv} from '../public/js/table-reader.mjs';
import {prepareTable, suggestMapping, buildImportPreview, applyTableImport} from '../public/js/table-import.mjs';
import {createDefaultState} from '../public/js/storage.mjs';
import {createBackup, parseBackup} from '../public/js/backup.mjs';
import {listFolders, foldersForWork} from '../public/js/folders.mjs';

function preview(text, state = createDefaultState(), options = {}) {
  const table = prepareTable(parseCsv(text));
  return buildImportPreview(state, table, suggestMapping(table.headers), options);
}
test('CSV reads quoted delimiters, escaped quotes, BOM, line breaks and semicolon files', () => {
  assert.deepEqual(parseCsv('\uFEFFTítulo,Estado\r\n"Uno, \"\"dos\"\"\nTres",Viendo'), [['Título', 'Estado'], ['Uno, "dos"\nTres', 'Viendo']]);
  assert.deepEqual(parseCsv('Título;Vistos\nSerie;2'), [['Título', 'Vistos'], ['Serie', '2']]);
  assert.throws(() => parseCsv('Título\n"sin cerrar'), /comillas/i);
});
test('title-only files default to pending and no header is invented', () => {
  const state = createDefaultState();
  const rows = preview('Una historia\nOtra historia', state);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].record.title, 'Una historia');
  const result = applyTableImport(state, rows);
  assert.equal(result.imported, 2);
  assert.ok(Object.values(result.state.tracking).every(t => t.status === 'Pendiente'));
  assert.equal(Object.keys(state.catalogCustom).length, 0);
});
test('preview flags duplicates and invalid rows; apply does not overwrite existing progress', () => {
  const state = createDefaultState([{id: 'custom:old', title: 'Existente', mediaKind: 'season'}]);
  state.tracking['custom:old'] = {seen: 8, favorite: true};
  const rows = preview('Título,Vistos\nExistente,0\nNueva,2\nNueva,3\nMala,-2', state);
  assert.deepEqual(rows.map(row => row.kind), ['duplicate', 'new', 'duplicate', 'invalid']);
  const result = applyTableImport(state, rows);
  assert.equal(result.imported, 1);
  assert.equal(result.state.tracking['custom:old'].seen, 8);
  assert.equal(result.state.tracking['custom:old'].favorite, true);
});
test('mapped movie, rating, favorite, folders and viewing date survive JSON restore', () => {
  const rows = preview('Título,Formato,Estado,Calificación,Favorito,Carpetas,Fecha vista\nPelícula A,Película,Vista,9,Sí,Con papá;Favoritas,17/10/2026');
  const result = applyTableImport(createDefaultState(), rows);
  const state = parseBackup(createBackup(result.state)).state;
  const entry = Object.values(state.catalogCustom)[0];
  assert.equal(entry.mediaKind, 'movie');
  assert.equal(state.tracking[entry.id].status, 'Terminada');
  assert.equal(state.tracking[entry.id].rating, 9);
  assert.equal(state.tracking[entry.id].watchedAt, '2026-10-17');
  assert.equal(state.tracking[entry.id].favorite, true);
  assert.equal(listFolders(state).length, 2);
  assert.equal(foldersForWork(state, state.mediaLibrary.catalogLinks[entry.id].workId).length, 2);
});
test('bulk status is explicit and stale previews recheck duplicates before applying', () => {
  const rows = preview('Título\nNueva', createDefaultState(), {status: 'Terminada', format: 'movie'});
  assert.equal(rows[0].record.status, 'Terminada');
  const changed = createDefaultState([{id: 'custom:late', title: 'Nueva', mediaKind: 'movie'}]);
  assert.equal(applyTableImport(changed, rows).imported, 0);
  assert.equal(applyTableImport(changed, rows, {0: 'create'}).imported, 1);
});

test('Excel serial dates honor both epochs and reject the fictitious leap day', () => {
  assert.equal(preview('Título,Fecha vista\nAntigua,1')[0].record.watchedAt, '1900-01-01');
  assert.equal(preview('Título,Fecha vista\nFicticia,60')[0].kind, 'invalid');
  assert.equal(preview('Título,Fecha vista\nOtra,0', createDefaultState(), {date1904: true})[0].record.watchedAt, '1904-01-01');
});
