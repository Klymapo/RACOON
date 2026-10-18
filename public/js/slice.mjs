import {createCustomId} from './model.mjs';
import {validateState} from './storage.mjs';
import {setFolderMembership} from './folders.mjs';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const clone=v=>v==null?null:JSON.parse(JSON.stringify(v));
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
export function normalizeSliceData(value){
 const out={version:1,records:{}};
 for(const [id,v]of Object.entries(object(object(value).records))){
  if(!/^slice:[A-Za-z0-9._-]+$/.test(id)||!v||!['left','right','up'].includes(v.action)||!/^(legacy|custom|anilist):[A-Za-z0-9._-]+$/.test(v.catalogId)||!Number.isSafeInteger(v.at)||v.at<=0||!v.after||!v.after.tracking||typeof v.after.tracking!=='object'||Array.isArray(v.after.tracking)||!v.before||(v.before.tracking!=null&&(typeof v.before.tracking!=='object'||Array.isArray(v.before.tracking))))continue;
  out.records[id]={id,catalogId:v.catalogId,action:v.action,at:v.at,undoneAt:Number.isSafeInteger(v.undoneAt)&&v.undoneAt>v.at?v.undoneAt:null,before:{tracking:clone(v.before.tracking)},after:{tracking:clone(v.after.tracking)},membership:v.membership?clone(v.membership):null};
 }
 return out;
}
export function sliceHistory(state){return Object.values(normalizeSliceData(state.sliceData).records).sort((a,b)=>b.at-a.at||b.id.localeCompare(a.id));}
export function sliceCandidates(state){
 const records=sliceHistory(state).filter(r=>!r.undoneAt),classified=new Set(records.map(r=>r.catalogId));
 const works=new Set(records.map(r=>state.mediaLibrary?.catalogLinks[r.catalogId]?.workId).filter(Boolean)),seenWorks=new Set();
 return Object.values({...state.catalogOfficial,...state.catalogCustom}).sort((a,b)=>String(a.title||a.name).localeCompare(String(b.title||b.name),'es')).filter(entry=>{
  const workId=state.mediaLibrary?.catalogLinks[entry.id]?.workId,track=state.tracking?.[entry.id]||{};
  if(classified.has(entry.id)||works.has(workId)||seenWorks.has(workId)||['Terminada','Descartada','Viendo'].includes(track.status)||track.seen>0)return false;
  if(workId)seenWorks.add(workId);return true;
 });
}
export function classifySlice(state,catalogId,action,options={},now=Date.now()){
 if(!['left','right','up'].includes(action))throw Error('Acción de Slice inválida.');
 if(options.rating!==undefined&&options.rating!==null&&(typeof options.rating!=='number'||!Number.isFinite(options.rating)||options.rating<0||options.rating>10))throw Error('La nota debe estar entre 0 y 10.');
 let next=validateState(state);if(!next.catalogOfficial[catalogId]&&!next.catalogCustom[catalogId])throw Error('Ficha no disponible.');
 if(sliceHistory(next).some(r=>r.catalogId===catalogId&&!r.undoneAt))throw Error('Ficha ya clasificada; usa Deshacer antes de repetir.');
 if(!Number.isSafeInteger(now)||now<=0)throw Error('Fecha de acción inválida.');
 const before=clone(next.tracking[catalogId]),at=sliceHistory(next).reduce((latest,r)=>Math.max(latest,r.at+1),now);
 const patch={...(next.tracking[catalogId]||{}),status:{left:'Descartada',right:'Pendiente',up:'Terminada'}[action],changedAt:at};
 if(options.favorite!==undefined)patch.favorite=options.favorite===true;
 if(options.rating!==undefined&&options.rating!==null)patch.rating=options.rating;
 next=validateState({...next,tracking:{...next.tracking,[catalogId]:patch}});
 let membership=null;
 if(options.folderId){const workId=next.mediaLibrary.catalogLinks[catalogId].workId;const previous=clone(next.collections.memberships[workId]?.[options.folderId]);next=setFolderMembership(next,workId,options.folderId,true,at);membership={workId,folderId:options.folderId,before:previous,after:clone(next.collections.memberships[workId][options.folderId])};}
 const id=`slice:${createCustomId().slice(7)}`;
 next.sliceData.records[id]={id,catalogId,action,at,undoneAt:null,before:{tracking:before},after:{tracking:clone(next.tracking[catalogId])},membership};return next;
}
export function undoSlice(state,id,now=Date.now()){
 const next=validateState(state),record=next.sliceData.records[id];
 if(!record||record.undoneAt)throw Error('Acción no disponible para deshacer.');
 if(!same(next.tracking[record.catalogId],record.after.tracking))throw Error('La ficha cambió después de Slice; no se sobrescribirá.');
 const m=record.membership;if(m&&(!same(next.collections.memberships[m.workId]?.[m.folderId],m.after)||next.mediaLibrary.catalogLinks[record.catalogId]?.workId!==m.workId))throw Error('La carpeta cambió después de Slice; no se sobrescribirá.');
 const undoneAt=Math.max(now,record.at+1);
 if(record.before.tracking===null)delete next.tracking[record.catalogId];else next.tracking[record.catalogId]={...clone(record.before.tracking),changedAt:undoneAt};
 if(m)next.collections.memberships[m.workId][m.folderId]={assigned:m.before?.assigned===true,changedAt:undoneAt};
 next.sliceData.records[id]={...record,undoneAt};return next;
}
export function mergeSliceData(current,incoming){const a=normalizeSliceData(current),b=normalizeSliceData(incoming);for(const [id,r]of Object.entries(b.records))if(!a.records[id]||(r.undoneAt||r.at)>(a.records[id].undoneAt||a.records[id].at))a.records[id]=r;return a;}
export function reconcileSliceUndo(state){
 for(const r of sliceHistory(state).filter(r=>r.undoneAt))if(same(state.tracking[r.catalogId],r.after.tracking)){
  if(r.before.tracking===null)delete state.tracking[r.catalogId];else state.tracking[r.catalogId]={...clone(r.before.tracking),changedAt:r.undoneAt};
 }
 return state;
}
