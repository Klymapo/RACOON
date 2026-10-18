// Consulta voluntaria de proveedores TMDB/JustWatch; ninguna oferta se verifica sola.
// Token de lectura gratuito del usuario: solo memoria DOM, nunca en URL ni respaldo.
const api='https://api.themoviedb.org/3';
const modes={flatrate:'suscripción (no asegura plan base)',rent:'alquiler',buy:'compra',free:'gratis',ads:'gratis con anuncios'};
function formatCountry(country) {
  const value=String(country||'').toUpperCase();
  if(!/^[A-Z]{2}$/.test(value))throw Error('País inválido');
  return value;
}
function tokenOrThrow(token) {
  const result=String(token||'').trim();
  if(!result || result.length>4096 || /[\r\n]/.test(result))throw Error('Se requiere un token de lectura TMDB gratuito para consultar, sin guardarlo.');
  return result;
}
async function request(url,token,{fetch=globalThis.fetch,signal}={}) {
  const response=await fetch(url,{signal,headers:{Authorization:'Bearer '+tokenOrThrow(token),Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error(response.status===401?'Token TMDB no autorizado':response.status===429?'TMDB limita temporalmente consultas':'TMDB no respondió: '+response.status);
  return response.json();
}
export async function searchTmdbWorks(title,kind,token,options={}) {
  const q=String(title||'').trim().slice(0,180);
  if(!q)throw Error('Falta título');
  const media=kind==='movie'?'movie':'tv';
  const url=new URL(api+'/search/'+media);
  url.search=new URLSearchParams({query:q,language:'es-MX',page:'1',include_adult:'false'});
  const data=await request(url.href,token,options);
  return (Array.isArray(data.results)?data.results:[]).filter(x=>Number.isSafeInteger(x.id)&&x.id>0).slice(0,8).map(x=>({id:x.id,title:String(x.title||x.name||'').slice(0,180),original:String(x.original_title||x.original_name||'').slice(0,180),year:String(x.release_date||x.first_air_date||'').slice(0,4),kind:media}));
}
export function decodeTmdbProviders(data,{country,kind,id}) {
  const region=formatCountry(country);
  const media=kind==='movie'?'movie':'tv';
  if(!Number.isSafeInteger(Number(id))||Number(id)<=0)throw Error('Identidad no válida');
  const row=data?.results?.[region];
  const url='https://www.themoviedb.org/'+media+'/'+Number(id)+'/watch?locale='+region;
  // Nunca reinterpretar MX como US, ni serie como temporada concreta.
  const offers=[];
  for(const [category,label]of Object.entries(modes)) for(const raw of Array.isArray(row?.[category])?row[category]:[]) {
    const name=String(raw?.provider_name||'').trim().slice(0,120);
    if(!name)continue;
    const channel=/\bchannels?\b|\badd.on\b|\badd on\b/i.test(name);
    offers.push({provider:name,providerId:Number(raw.provider_id)||null,mode:channel?'unknown':category==='flatrate'?'subscription':category,
      label:channel?'Posible canal adicional; verifica el paquete':label,
      uncertainty:channel?'channel':'scope',sourceUrl:url,country:region,scopeVerified:false,verified:false});
  }
  return {country:region,sourceUrl:url,offers,source:'TMDB / datos JustWatch',scopeVerified:false,verified:false};
}
export async function getTmdbProviders(id,kind,country,token,options={}) {
  if(!Number.isSafeInteger(Number(id))||Number(id)<=0)throw Error('Selecciona un candidato válido');
  const media=kind==='movie'?'movie':'tv';
  const response=await request(api+'/'+media+'/'+Number(id)+'/watch/providers',token,options);
  return decodeTmdbProviders(response,{country,kind:media,id});
}
