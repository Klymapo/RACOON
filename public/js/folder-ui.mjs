import {listFolders, foldersForWork} from './folders.mjs';

const html = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const button = (action, folder, label, disabled = false) => `<button class="mini-button" type="button" data-folder-action="${action}" data-folder-id="${html(folder.id)}" aria-label="${html(label)}: ${html(folder.name)}"${disabled ? ' disabled' : ''}>${label}</button>`;

export function renderFolderRows(state) {
  const active = listFolders(state);
  const trashed = listFolders(state, true);
  const rows = active.map((folder, index) => {
    const count = Object.keys(state.mediaLibrary.works).filter(workId => state.collections.memberships[workId]?.[folder.id]?.assigned).length;
    return `<div class="folder-row" data-folder-row="${html(folder.id)}"><label>Nombre de carpeta<input data-folder-name="${html(folder.id)}" value="${html(folder.name)}" maxlength="80"></label><span class="muted">${count} obra${count === 1 ? '' : 's'}</span><div class="button-row">${button('rename', folder, 'Guardar nombre')}${button('up', folder, 'Subir', index === 0)}${button('down', folder, 'Bajar', index === active.length - 1)}${button('trash', folder, 'A papelera')}</div></div>`;
  }).join('');
  const trash = trashed.length ? `<h3>Papelera de carpetas</h3>${trashed.map(folder => `<div class="folder-row"><strong>${html(folder.name)}</strong>${button('restore', folder, 'Restaurar')}</div>`).join('')}` : '';
  return `${rows || '<p class="muted">Aún no tienes carpetas personales.</p>'}${trash}`;
}

export function renderFolderChoices(state, entryId) {
  const workId = state.mediaLibrary.catalogLinks[entryId]?.workId;
  const selected = new Set(foldersForWork(state, workId).map(folder => folder.id));
  const folders = listFolders(state);
  return `<section class="detail-section" data-detail-folders><h3>Carpetas</h3>${folders.length ? `<fieldset class="folder-choices"><legend class="sr-only">Guardar esta obra en carpetas</legend>${folders.map(folder => `<label><input type="checkbox" data-work-folder="${html(folder.id)}" data-work-id="${html(workId)}"${selected.has(folder.id) ? ' checked' : ''}><span>${html(folder.name)}</span></label>`).join('')}</fieldset>` : '<p class="muted">Crea tu primera carpeta en Biblioteca para organizar esta obra.</p>'}<p id="folderChoiceStatus" role="status" class="muted"></p></section>`;
}
