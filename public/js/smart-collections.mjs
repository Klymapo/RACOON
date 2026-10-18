import {createCustomId,STATUS_VALUES} from './model.mjs';
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const cleanText=value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):'';
const fold=value=>String(value??'').normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('es');
const timestamp=value=>Number.isSafeInteger(value)&&value>=0?value:0;
function normalizeRules(input={}) {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Reglas inválidas.');
 const known=['query','format','status','favorite','genre','minRating'];
 if(Object.keys(input).some(key=>!known.includes(key)))throw Error('Criterio no compatible.');
 for(const key of ['query','genre'])if(input[key]!==undefined&&typeof input[key]!=='string')throw Error('Texto de filtro inválido.');
 const query=cleanText(input.query),genre=cleanText(input.genre);
 const format=input.format??'all',status=input.status??'all',favorite=input.favorite??'all',minRating=input.minRating??null;
 if(query.length>160||genre.length>80||!['all','movie','series'].includes(format)||!['all',...STATUS_VALUES].includes(status)||!['all','yes','no'].includes(favorite))throw Error('Filtro no válido.');
 if(minRating!==null&&(typeof minRating!=='number'||!Number.isFinite(minRating)||minRating<0||minRating>10))throw Error('La calificación debe estar entre 0 y 10.');
 return {query,format,status,favorite,genre,minRating};
}
export function normalizeSmartCollections(value) {
 const result={version:1,items:{}};
 for(const [id,raw]of Object.entries(object(object(value).items))){
  const item=object(raw),name=cleanText(item.name);
  if(!/^smart:[A-Za-z0-9._-]+$/.test(id)||!name||name.length>80||!item.rules)continue;
  try {result.items[id]={id,name,rules:normalizeRules(item.rules),changedAt:timestamp(item.changedAt),trashedAt:item.trashedAt==null?null:timestamp(item.trashedAt)};}catch{ /* No ampliar una regla incompatible. */ }
 }
 return result;
}
export function listSmartCollections(state,trashed=false){
 return Object.values(normalizeSmartCollections(state.smartCollections).items).filter(item=>(item.trashedAt!==null)===trashed).sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
}
function validName(state,name,except){
 const clean=cleanText(name);
 if(!clean||clean.length>80)throw Error('Usa un nombre de 1 a 80 caracteres.');
 if(listSmartCollections(state).some(item=>item.id!==except&&item.name.toLocaleLowerCase('es')===clean.toLocaleLowerCase('es')))throw Error('Ya existe una colección con ese nombre.');
 return clean;
}
export function saveSmartCollection(state,id,name,rules,now=Date.now()){
 const collections=normalizeSmartCollections(state.smartCollections);
 if(id&&(!collections.items[id]||collections.items[id].trashedAt!==null))throw Error('Colección no disponible.');
 const nextId=id||`smart:${createCustomId().slice(7)}`;
 collections.items[nextId]={id:nextId,name:validName(state,name,id),rules:normalizeRules(rules),changedAt:timestamp(now),trashedAt:null};
 return {...state,smartCollections:collections};
}
function setTrash(state,id,trashed,now){
 const collections=normalizeSmartCollections(state.smartCollections),item=collections.items[id];
 if(!item)throw Error('Colección no encontrada.');
 if(!trashed)validName(state,item.name,id);
 collections.items[id]={...item,trashedAt:trashed?timestamp(now):null,changedAt:timestamp(now)};
 return {...state,smartCollections:collections};
}
export const trashSmartCollection=(state,id,now=Date.now())=>setTrash(state,id,true,now);
export const restoreSmartCollection=(state,id,now=Date.now())=>setTrash(state,id,false,now);
export function matchesSmartRules(entry,tracking={},rules={}){
 let r;try{r=normalizeRules(rules);}catch{return false;}
 if(r.format!=='all'&&(entry.mediaKind==='movie')!==(r.format==='movie'))return false;
 if(r.status!=='all'&&(tracking.status||'Pendiente')!==r.status)return false;
 if(r.favorite!=='all'&&(tracking.favorite===true)!==(r.favorite==='yes'))return false;
 const title=`${entry.title||entry.name||''} ${Array.isArray(entry.alternativeTitles)?entry.alternativeTitles.join(' '):''}`;
 if(r.query&&!fold(title).includes(fold(r.query)))return false;
 if(r.genre&&(!Array.isArray(entry.genres)||!entry.genres.some(genre=>fold(genre)===fold(r.genre))))return false;
 if(r.minRating!==null&&(typeof tracking.rating!=='number'||!Number.isFinite(tracking.rating)||tracking.rating<r.minRating))return false;
 return true;
}
export function mergeSmartCollections(current,incoming){
 const base=normalizeSmartCollections(current),next=normalizeSmartCollections(incoming);
 for(const [id,item]of Object.entries(next.items))if(!base.items[id]||item.changedAt>base.items[id].changedAt)base.items[id]=item;
 return base;
}
