import {sliceCandidates,sliceHistory,classifySlice,undoSlice} from './slice.mjs';
import {listFolders} from './folders.mjs';
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={left:'No me interesa',right:'Pendientes',up:'Ya la vi'};
export function mountSlice({document,getState,commitState,now=Date.now}){
 const view=document?.getElementById?.('addView');if(!view||!document.createElement)return null;
 const panel=document.createElement('section');panel.className='panel-card';panel.id='slicePanel';
 panel.innerHTML='<h3>Slice</h3><p class="muted">Clasifica fichas locales pendientes. Izquierda: No me interesa; derecha: Pendientes; arriba: Ya la vi. También puedes usar los botones o las flechas del teclado al enfocar la tarjeta. No es todavía un recomendador.</p><div id="sliceCard"></div><div class="button-row"><button id="sliceUndo" class="button button-soft" type="button">Deshacer última acción</button></div><p id="sliceStatus" role="status" aria-live="polite"></p><details id="sliceHistoryPanel"><summary>Historial Slice</summary><div id="sliceHistory"></div><button id="sliceMore" class="mini-button" type="button">Mostrar más historial</button></details>';
 view.appendChild(panel);let busy=false,limit=20,origin=null;
 const node=id=>document.getElementById(id),status=text=>{node('sliceStatus').textContent=text;};
 function renderHistory(){
  const state=getState(),history=sliceHistory(state),entries={...state.catalogOfficial,...state.catalogCustom};
  node('sliceHistory').innerHTML=history.slice(0,limit).map(r=>`<div class="folder-row"><strong>${html(entries[r.catalogId]?.title||entries[r.catalogId]?.name||r.catalogId)}</strong><span>${names[r.action]} · ${html(new Date(r.at).toISOString().slice(0,10))}${r.undoneAt?' · Deshecha':''}</span>${r.undoneAt?'':`<button class="mini-button" type="button" data-slice-undo="${html(r.id)}">Deshacer esta acción</button>`}</div>`).join('')||'<p>Sin decisiones todavía.</p>';
  node('sliceMore').hidden=history.length<=limit;node('sliceUndo').disabled=!history.some(r=>!r.undoneAt);
 }
 function render(){
  const state=getState(),candidates=sliceCandidates(state),entry=candidates[0],track=entry?state.tracking[entry.id]||{}:{};
  node('sliceCard').innerHTML=entry?`<article data-slice-entry="${html(entry.id)}"><div id="sliceGestureArea" class="slice-gesture-area" tabindex="0" role="region" aria-label="Tarjeta Slice: desliza o usa flechas izquierda, derecha y arriba"><h4>${html(entry.title||entry.name)}</h4><p>${html(entry.mediaKind==='movie'?'Película':'Serie / temporada')}</p><p>${html(entry.synopsis||'Sin sinopsis registrada.')}</p><p class="muted">${candidates.length} ficha${candidates.length===1?'':'s'} por clasificar · Solo esta zona captura gestos.</p></div><div class="form-grid"><label><span>Favorita</span><input id="sliceFavorite" type="checkbox"${track.favorite?' checked':''}></label><label>Nota opcional 0–10<input id="sliceRating" type="number" min="0" max="10" step="any" value="${html(track.rating??'')}"></label><label>Guardar también en carpeta<select id="sliceFolder"><option value="">Sin asignar carpeta nueva</option>${listFolders(state).map(f=>`<option value="${html(f.id)}">${html(f.name)}</option>`).join('')}</select></label></div><div class="button-row">${Object.entries(names).map(([action,label])=>`<button class="button button-soft" type="button" data-slice-action="${action}">${html(label)}</button>`).join('')}</div><p class="muted">Ya la vi no asigna gusto, nota, fecha ni episodios vistos automáticamente. No me interesa no equivale a una mala calificación.</p></article>`:'<p id="sliceEmpty">No quedan fichas locales pendientes de clasificar. Puedes buscar o importar otras. Revisa tus decisiones en el historial.</p>';
  renderHistory();
 }
 function decide(action){
  if(busy)return;const id=node('sliceCard').querySelector('[data-slice-entry]')?.dataset.sliceEntry;if(!id)return;
  busy=true;try{
   const raw=node('sliceRating').value,options={favorite:node('sliceFavorite').checked,folderId:node('sliceFolder').value,...(raw!==''?{rating:Number(raw)}:{})};
   const saved=commitState(classifySlice(getState(),id,action,options,now()));status(saved?`Guardado: ${names[action]}. Puedes deshacerlo.`:'Cambio en memoria; exporta un respaldo antes de cerrar.');node('sliceGestureArea')?.focus?.({preventScroll:true});
  }catch(error){status(error.message);}finally{busy=false;}
 }
 function undo(id){if(!id)return;try{const saved=commitState(undoSlice(getState(),id,now()));status(saved?'Acción deshecha; se conservan las ediciones posteriores.':'Cambio en memoria; exporta un respaldo.');}catch(error){status(error.message);}}
 panel.addEventListener('click',event=>{const action=event.target.closest?.('[data-slice-action]');if(action)decide(action.dataset.sliceAction);const button=event.target.closest?.('[data-slice-undo]');if(button)undo(button.dataset.sliceUndo);});
 node('sliceUndo').addEventListener('click',()=>undo(sliceHistory(getState()).find(r=>!r.undoneAt)?.id));
 node('sliceMore').addEventListener('click',()=>{limit+=20;renderHistory();});
 panel.addEventListener('keydown',event=>{if(event.target.id!=='sliceGestureArea')return;const action={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up'}[event.key];if(action){event.preventDefault();if(!event.repeat)decide(action);}});
 panel.addEventListener('pointerdown',event=>{if(!event.target.closest?.('#sliceGestureArea')||event.isPrimary===false||(event.button!==undefined&&event.button!==0))return;origin={x:event.clientX,y:event.clientY,id:event.pointerId};event.target.closest('#sliceGestureArea').setPointerCapture?.(event.pointerId);});
 panel.addEventListener('pointercancel',()=>{origin=null;});
 panel.addEventListener('pointerup',event=>{if(!origin||origin.id!==event.pointerId)return;const dx=event.clientX-origin.x,dy=event.clientY-origin.y;origin=null;if(Math.abs(dx)>=60&&Math.abs(dx)>Math.abs(dy))decide(dx<0?'left':'right');else if(dy<=-60&&Math.abs(dy)>Math.abs(dx))decide('up');});
 render();return {render};
}
