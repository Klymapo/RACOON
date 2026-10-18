import {createCustomId} from './model.mjs';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>typeof v==='string'?v.trim().replace(/\s+/g,' '):'';
const key=v=>text(v).toLocaleLowerCase('es');
const stamp=v=>Number.isSafeInteger(v)&&v>=0?v:0;
export const OFFER_MODES={subscription:'Incluido en suscripción',channel:'Canal / suscripción adicional',rent:'Alquiler',buy:'Compra',ads:'Gratis con anuncios',free:'Gratis',unknown:'Modalidad sin verificar'};
function country(v){const c=text(v).toUpperCase();if(!/^[A-Z]{2}$/.test(c))throw Error('Usa un código de país de dos letras, por ejemplo MX.');return c;}
function date(v){if(!v)return null;const d=new Date(`${v}T12:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)throw Error('Fecha inválida.');return v;}
function url(v){if(!v)return '';const u=new URL(v);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('La fuente debe ser un enlace HTTP o HTTPS.');return u.href;}
function label(v){const s=text(v);if(!s||s.length>120)throw Error('Indica un nombre de hasta 120 caracteres.');return s;}
function cleanSubscription(v){return {country:country(v.country||'MX'),platform:label(v.platform),channel:text(v.channel),active:v.active!==false,changedAt:stamp(v.changedAt)};}
function cleanOffer(v){
 if(!/^(legacy|custom|anilist):[A-Za-z0-9._-]+$/.test(v.catalogId))throw Error('Ficha no válida.');
 const mode=v.mode??'unknown',scope=v.scope??'title',channel=text(v.channel);
 if(!Object.hasOwn(OFFER_MODES,mode)||!['title','season','episode'].includes(scope)||(mode==='channel'&&!channel))throw Error('Indica una modalidad, cobertura y canal válidos.');
 const integer=n=>n==null||n===''?null:Number.isSafeInteger(n)&&n>0?n:(()=>{throw Error('Número de temporada o episodio inválido.');})();
 const season=integer(v.season),episode=integer(v.episode);if(scope==='episode'&&episode===null)throw Error('Indica el episodio cubierto.');
 return {catalogId:v.catalogId,country:country(v.country),platform:label(v.platform),channel,mode,scope,season,episode,sourceUrl:url(v.sourceUrl),checkedAt:date(v.checkedAt),expiresAt:date(v.expiresAt),verified:v.verified===true,active:v.active!==false,changedAt:stamp(v.changedAt)};
}
export function normalizeRegionData(value){
 const v=object(value),out={version:1,country:'MX',countryChangedAt:stamp(v.countryChangedAt),subscriptions:{},offers:{}};
 try{out.country=country(v.country||'MX');}catch{}
 for(const [id,raw]of Object.entries(object(v.subscriptions)))if(/^sub:[A-Za-z0-9._-]+$/.test(id))try{out.subscriptions[id]={id,...cleanSubscription(raw)};}catch{}
 for(const [id,raw]of Object.entries(object(v.offers)))if(/^offer:[A-Za-z0-9._-]+$/.test(id))try{out.offers[id]={id,...cleanOffer(raw)};}catch{}
 return out;
}
export function setRegionCountry(state,value,now=Date.now()){const regionData=normalizeRegionData(state.regionData);regionData.country=country(value);regionData.countryChangedAt=stamp(now);return {...state,regionData};}
export function saveSubscription(state,id,input,now=Date.now()){
 const regionData=normalizeRegionData(state.regionData),clean=cleanSubscription({...input,country:input.country||state.regionData?.country||'MX'});
 if(id&&!regionData.subscriptions[id])throw Error('Suscripción no encontrada.');
 const existing=Object.values(regionData.subscriptions).find(s=>s.country===clean.country&&key(s.platform)===key(clean.platform)&&key(s.channel)===key(clean.channel));
 const next=id||existing?.id||`sub:${createCustomId().slice(7)}`;regionData.subscriptions[next]={id:next,...clean,changedAt:stamp(now)};return {...state,regionData};
}
export function saveRegionalOffer(state,id,input,now=Date.now()){
 const regionData=normalizeRegionData(state.regionData),clean=cleanOffer(input);
 if(!state.catalogOfficial?.[clean.catalogId]&&!state.catalogCustom?.[clean.catalogId])throw Error('Ficha no disponible.');
 if(id&&!regionData.offers[id])throw Error('Oferta no encontrada.');
 const next=id||`offer:${createCustomId().slice(7)}`;regionData.offers[next]={id:next,...clean,changedAt:stamp(now)};return {...state,regionData};
}
export function retractRegionalOffer(state,id,now=Date.now()){const r=normalizeRegionData(state.regionData);if(!r.offers[id])throw Error('Oferta no encontrada.');r.offers[id]={...r.offers[id],active:false,changedAt:stamp(now)};return {...state,regionData:r};}
export function offersForEntry(state,catalogId,today=new Date().toISOString().slice(0,10)){
 const r=normalizeRegionData(state.regionData);
 return Object.values(r.offers).filter(o=>o.active&&o.catalogId===catalogId&&o.country===r.country).map(o=>{
  const age=o.checkedAt?(Date.parse(today)-Date.parse(o.checkedAt))/86400000:Infinity;
  const verification=!o.verified||!o.sourceUrl||!o.checkedAt||age<0?'unverified':o.expiresAt&&o.expiresAt<today?'expired':age>30?'stale':'current';
  const included=verification!=='current'||o.mode==='unknown'?null:['subscription','channel'].includes(o.mode)?Object.values(r.subscriptions).some(s=>s.active&&s.country===o.country&&key(s.platform)===key(o.platform)&&key(s.channel)===key(o.channel)):false;
  return {...o,verification,included};
 });
}
export function mergeRegionData(current,incoming){
 const a=normalizeRegionData(current),b=normalizeRegionData(incoming);
 if(b.countryChangedAt>a.countryChangedAt){a.country=b.country;a.countryChangedAt=b.countryChangedAt;}
 for(const group of ['subscriptions','offers'])for(const [id,row]of Object.entries(b[group]))if(!a[group][id]||row.changedAt>a[group][id].changedAt)a[group][id]=row;
 return a;
}
