import {STATUS_VALUES} from './model.mjs';
import {listSmartCollections,saveSmartCollection,trashSmartCollection,restoreSmartCollection,matchesSmartRules} from './smart-collections.mjs';
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function description(rules){
 const labels=[rules.query&&`Título: ${rules.query}`,rules.format!=='all'&&(rules.format==='movie'?'Películas':'Series / especiales'),rules.status!=='all'&&`Estado: ${rules.status}`,rules.favorite!=='all'&&(rules.favorite==='yes'?'Solo favoritas':'Sin favoritas'),rules.genre&&`Género: ${rules.genre}`,rules.minRating!==null&&`Nota ≥ ${rules.minRating}`];
 return labels.filter(Boolean).join(' · ')||'Toda la biblioteca';
}
const action=(item,type,label)=>`<button type="button" class="mini-button" data-smart-action="${type}" data-smart-id="${html(item.id)}" aria-label="${html(label)}: ${html(item.name)}">${label}</button>`;
export function renderSmartCollectionRows(state){
 const entries=Object.values({...state.catalogOfficial,...state.catalogCustom});
 const active=listSmartCollections(state).map(item=>{
  const count=entries.filter(entry=>matchesSmartRules(entry,state.tracking[entry.id],item.rules)).length;
  return `<div class="folder-row" data-smart-row="${html(item.id)}"><strong>${html(item.name)}</strong><p class="muted">${html(description(item.rules))} · ${count} ficha${count===1?'':'s'}</p><div class="button-row">${action(item,'edit','Editar filtros')}${action(item,'trash','A papelera')}</div></div>`;
 }).join('');
 const trash=listSmartCollections(state,true);
 return `${active||'<p class="muted">Aún no tienes colecciones inteligentes.</p>'}${trash.length?'<h3>Papelera de colecciones</h3>'+trash.map(item=>`<div class="folder-row"><strong>${html(item.name)}</strong>${action(item,'restore','Restaurar')}</div>`).join(''):''}`;
}
export function mountSmartCollectionManager({document,getState,commitState,now=Date.now}){
 const view=document?.getElementById?.('progressView');
 if(!view||document.getElementById('smartManager')||!document.createElement)return null;
 const panel=document.createElement('details');panel.id='smartManager';panel.className='panel-card folder-manager';
 panel.innerHTML=`<summary>Colecciones inteligentes</summary><p class="muted">Guarda filtros que se actualizan solos. Deben cumplirse todos los criterios. No se mueven ni se modifican tus fichas.</p><form id="smartForm"><div class="form-grid"><label>Nombre de colección<input id="smartName" maxlength="80" required></label><label>Texto del título<input id="smartQuery" maxlength="160"></label><label>Formato<select id="smartFormat"><option value="all">Cualquiera</option><option value="movie">Películas</option><option value="series">Series / especiales</option></select></label><label>Estado<select id="smartStatus"><option value="all">Cualquiera</option>${STATUS_VALUES.map(value=>`<option value="${value}">${value==='Terminada'?'Terminada / Vista':value}</option>`).join('')}</select></label><label>Favorita<select id="smartFavorite"><option value="all">Cualquiera</option><option value="yes">Solo favoritas</option><option value="no">Sin favoritas</option></select></label><label>Género registrado<input id="smartGenre" maxlength="80" placeholder="Igual que en la ficha"></label><label>Calificación mínima personal<input id="smartRatingMin" type="number" min="0" max="10" step="any" placeholder="Sin mínimo"></label></div><p class="muted">La nota desconocida no cuenta como cero. El género se compara con el registrado; no se traduce ni se infiere.</p><div class="button-row"><button class="button button-soft" type="submit">Guardar colección</button><button id="smartCancel" class="button button-soft" type="button">Nueva / cancelar edición</button></div></form><p id="smartStatusMessage" role="status" aria-live="polite" class="muted"></p><div id="smartList"></div>`;
 const anchor=document.getElementById('folderManager');
 if(anchor?.after)anchor.after(panel);else view.appendChild(panel);
 const node=id=>document.getElementById(id),status=message=>{node('smartStatusMessage').textContent=message;};
 let editingId=null;
 const reset=()=>{editingId=null;node('smartForm').reset();};
 const apply=(candidate,message)=>{const saved=commitState(candidate);status(saved?message:'Cambio solo en memoria; exporta un respaldo JSON antes de cerrar.');};
 node('smartForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{
   const raw=node('smartRatingMin').value;
   const rules={query:node('smartQuery').value,format:node('smartFormat').value,status:node('smartStatus').value,favorite:node('smartFavorite').value,genre:node('smartGenre').value,minRating:raw===''?null:Number(raw)};
   const candidate=saveSmartCollection(getState(),editingId,node('smartName').value,rules,now());
   apply(candidate,'Colección guardada. Sus resultados se actualizan automáticamente.');reset();
  }catch(error){status(error.message);}
 });
 node('smartCancel').addEventListener('click',()=>{reset();status('Lista para una nueva colección.');node('smartName').focus();});
 node('smartList').addEventListener('click',event=>{
  const button=event.target.closest?.('[data-smart-action]');if(!button)return;
  const id=button.dataset.smartId,type=button.dataset.smartAction;
  try{
   if(type==='edit'){
    const item=listSmartCollections(getState()).find(item=>item.id===id);if(!item)throw Error('Colección no disponible.');
    editingId=id;node('smartName').value=item.name;
    for(const [field,key]of [['smartQuery','query'],['smartFormat','format'],['smartStatus','status'],['smartFavorite','favorite'],['smartGenre','genre'],['smartRatingMin','minRating']])node(field).value=item.rules[key]??'';
    panel.open=true;status(`Editando: ${item.name}`);node('smartName').focus();return;
   }
   if(type==='trash'){
    if(!globalThis.confirm?.('¿Enviar esta colección a la papelera? Sus fichas y progreso se conservan.'))return;
    apply(trashSmartCollection(getState(),id,now()),'Colección en papelera; puedes restaurarla.');
    if(editingId===id)reset();
   }
   if(type==='restore')apply(restoreSmartCollection(getState(),id,now()),'Colección restaurada con sus filtros.');
  }catch(error){status(error.message);}
 });
 return panel;
}
