const MAX_FILE = 10 * 1024 * 1024;
const MAX_XML = 32 * 1024 * 1024;
function checkRows(rows) {
  if (rows.length > 10001 || rows.some(row => row.length > 64)) throw new Error('Divide el archivo: máximo 10 mil registros y 64 columnas por hoja.');
  return rows;
}
export function parseCsv(input) {
  let text = String(input).replace(/^\uFEFF/, '');
  const sep = text.match(/^sep=([,;\t])\r?\n/i);
  if (sep) text = text.slice(sep[0].length);
  let quote = false;
  const counts = {',': 0, ';': 0, '\t': 0};
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') { if (quote && text[i + 1] === '"') i++; else quote = !quote; }
    else if (!quote && /[\r\n]/.test(text[i])) break;
    else if (!quote && Object.hasOwn(counts, text[i])) counts[text[i]]++;
  }
  const delimiter = sep?.[1] || Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], value = '', quoted = false, closed = false;
  const cell = () => { row.push(value); value = ''; closed = false; };
  const line = () => { cell(); if (row.some(item => item.trim())) rows.push(row); row = []; if (rows.length > 10001) checkRows(rows); };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else value += char;
    } else if (char === delimiter) cell();
    else if (char === '\r' || char === '\n') { line(); if (char === '\r' && text[i + 1] === '\n') i++; }
    else if (char === '"' && !value && !closed) quoted = true;
    else if (closed && !/\s/.test(char)) throw new Error('Comillas inesperadas en el CSV.');
    else if (!closed) value += char;
  }
  if (quoted) throw new Error('Hay comillas sin cerrar en el CSV.');
  if (value || row.length) line();
  return checkRows(rows);
}

function xml(text) {
  if (/<!DOCTYPE/i.test(text)) throw new Error('XML no compatible en el XLSX.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('El XLSX contiene XML inválido.');
  return doc;
}
const tags = (node, name) => [...node.getElementsByTagNameNS('*', name)];
const textValue = node => tags(node, 't').map(part => part.textContent).join('');

async function zipFiles(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('El archivo no es un XLSX válido o está protegido.');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true), expanded = 0;
  if (count > 2000 || offset >= bytes.length) throw new Error('Estructura XLSX demasiado grande o no compatible.');
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Directorio XLSX inválido.');
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true);
    const size = view.getUint32(offset + 20, true), rawSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true), extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    expanded += rawSize;
    if (flags & 1) throw new Error('Guarda una copia del Excel sin contraseña.');
    if (expanded > MAX_XML) throw new Error('El XLSX descomprimido supera 32 MB. Divide el archivo.');
    files.set(name, {method, size, rawSize, local});
    offset += 46 + nameLength + extra + comment;
  }
  return async name => {
    const entry = files.get(name);
    if (!entry) return null;
    const {local, method, size, rawSize} = entry;
    if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) throw new Error('Contenido XLSX inválido.');
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (start + size > bytes.length) throw new Error('El XLSX está truncado.');
    const data = bytes.slice(start, start + size);
    if (method === 0) return new TextDecoder().decode(data);
    if (method !== 8) throw new Error('Compresión XLSX no compatible. Guarda una copia nueva.');
    let stream;
    try { stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')); }
    catch { throw new Error('Este navegador no puede leer XLSX. Usa CSV UTF-8 o actualiza el navegador.'); }
    const reader = stream.getReader(), chunks = [];
    let length = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_XML || length > rawSize) { await reader.cancel(); throw new Error('Tamaño XLSX no válido.'); }
      chunks.push(value);
    }
    if (length !== rawSize) throw new Error('El XLSX está incompleto.');
    const result = new Uint8Array(length);
    let position = 0;
    for (const chunk of chunks) { result.set(chunk, position); position += chunk.length; }
    return new TextDecoder().decode(result);
  };
}

async function readXlsx(bytes) {
  const read = await zipFiles(bytes);
  const workbook = xml(await read('xl/workbook.xml') || '');
  const rels = xml(await read('xl/_rels/workbook.xml.rels') || '');
  const targets = new Map(tags(rels, 'Relationship').filter(rel => rel.getAttribute('Type')?.endsWith('/worksheet') && rel.getAttribute('TargetMode') !== 'External').map(rel => [rel.getAttribute('Id'), rel.getAttribute('Target')]));
  const sharedXml = await read('xl/sharedStrings.xml');
  const shared = sharedXml ? tags(xml(sharedXml), 'si').map(textValue) : [];
  const date1904 = ['1', 'true'].includes(tags(workbook, 'workbookPr')[0]?.getAttribute('date1904'));
  const result = [];
  for (const sheet of tags(workbook, 'sheet')) {
    const id = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheet.getAttribute('r:id');
    const target = targets.get(id);
    if (!target) continue;
    const path = [];
    for (const part of (target.startsWith('/') ? target.slice(1) : `xl/${target}`).split('/')) {
      if (part === '..') path.pop(); else if (part && part !== '.') path.push(part);
    }
    const content = await read(path.join('/'));
    if (!content) throw new Error('No se encontró una hoja del XLSX.');
    const rows = tags(xml(content), 'row').map(row => {
      const values = [];
      for (const cell of tags(row, 'c')) {
        const letters = cell.getAttribute('r')?.match(/^[A-Z]+/i)?.[0] || '';
        let column = 0;
        for (const letter of letters.toUpperCase()) column = column * 26 + letter.charCodeAt(0) - 64;
        if (column < 1 || column > 64) throw new Error('La hoja supera las 64 columnas admitidas.');
        const value = tags(cell, 'v')[0]?.textContent || '';
        const type = cell.getAttribute('t');
        values[column - 1] = type === 's' ? shared[Number(value)] || '' : type === 'inlineStr' ? textValue(cell) : type === 'b' ? (value === '1' ? 'Sí' : 'No') : value;
      }
      return Array.from(values, value => value ?? '');
    }).filter(row => row.some(value => String(value).trim()));
    result.push({name: sheet.getAttribute('name') || 'Hoja', rows: checkRows(rows), date1904});
  }
  if (!result.length) throw new Error('El XLSX no contiene hojas de datos.');
  return result;
}
export async function readTableFile(file) {
  if (file.size > MAX_FILE) throw new Error('El archivo supera 10 MB. Divide la tabla.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name)) return readXlsx(bytes);
  if (!/\.(csv|tsv)$/i.test(file.name)) throw new Error('Usa CSV, TSV o Excel .xlsx; .xls antiguo no está admitido.');
  let text;
  if (bytes[0] === 255 && bytes[1] === 254) text = new TextDecoder('utf-16le').decode(bytes);
  else if (bytes[0] === 254 && bytes[1] === 255) text = new TextDecoder('utf-16be').decode(bytes);
  else { try { text = new TextDecoder('utf-8', {fatal: true}).decode(bytes); } catch { text = new TextDecoder('windows-1252').decode(bytes); } }
  return [{name: file.name, rows: parseCsv(text), date1904: false}];
}
