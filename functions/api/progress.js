// Cloudflare Pages Functions. Requiere Cloudflare Access en PRODUCCIÓN + D1.
// Sin Access, o con tokens inválidos, el endpoint rechaza todas las peticiones.
let cache=null,cacheExpires=0;
const JSON_HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS})}
function b64url(s){const normalized=s.replace(/-/g,'+').replace(/_/g,'/');const raw=atob(normalized+'='.repeat((4-normalized.length%4)%4));return Uint8Array.from(raw,byte=>byte.charCodeAt(0))}
function jsonToken(s){return JSON.parse(new TextDecoder().decode(b64url(s)))}
async function verifyUser(request,env){
 if(!env.TEAM_DOMAIN||!env.POLICY_AUD)throw Error('Access no configurado');
 const jwt=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!jwt)throw Error('Falta autenticación');
 const parts=jwt.split('.');if(parts.length!==3)throw Error('JWT inválido');
 const header=jsonToken(parts[0]),payload=jsonToken(parts[1]);
 if(header.alg!=='RS256'||!header.kid)throw Error('Firma no admitida');
 const issuer=env.TEAM_DOMAIN.replace(/\/$/,'');
 const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
 if(payload.iss!==issuer||!aud.includes(env.POLICY_AUD))throw Error('Origen no autorizado');
 const now=Math.floor(Date.now()/1000);
 if(!payload.exp||payload.exp<=now||payload.nbf&&payload.nbf>now+30)throw Error('Sesión caducada');
 if(!cache||cacheExpires<Date.now()){
  const url=new URL(issuer+'/cdn-cgi/access/certs');
  if(url.protocol!=='https:')throw Error('Dominio Access inseguro');
  const response=await fetch(url.toString());if(!response.ok)throw Error('Claves de Access no disponibles');
  cache=await response.json();cacheExpires=Date.now()+45*60*1000;
 }
 let jwk=(cache.keys||[]).find(key=>key.kid===header.kid);
 if(!jwk){cacheExpires=0;throw Error('Clave de Access no encontrada; reintenta');}
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 if(!valid)throw Error('JWT no verificable');
 const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';
 if(!email)throw Error('Cuenta sin correo electrónico');
 if(env.ALLOWED_EMAIL&&email!==env.ALLOWED_EMAIL.toLowerCase().trim())throw Error('Cuenta no autorizada');
 return email;
}
function sanitize(track){
 if(!track||typeof track!=='object'||Array.isArray(track))throw Error('Objeto de progreso inválido');
 const out=[];
 for(const [id,raw] of Object.entries(track)){
  if(!/^[a-z0-9_-]{1,32}$/.test(id)||!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const v={};
  if(typeof raw.favorite==='boolean')v.favorite=raw.favorite;
  if(['Pendiente','Viendo','Al día','Terminada','Descartada'].includes(raw.grade))v.grade=raw.grade;
  for(const field of ['seen','aired','total'])if(Number.isInteger(raw[field])&&raw[field]>=0&&raw[field]<=9999)v[field]=raw[field];
  const changedAt=Number(raw.changedAt);
  if(!Number.isSafeInteger(changedAt)||changedAt<1||changedAt>Date.now()+300000)continue;
  v.changedAt=changedAt;out.push([id,v]);
 }
 if(out.length>100)throw Error('Demasiadas series');
 return out;
}
export async function onRequest(context){
 const {request,env}=context;
 if(!env.RADAR_DB)return reply({error:'Falta vincular la base de datos RADAR_DB'},503);
 let user;
 try{user=await verifyUser(request,env)}catch(e){return reply({error:'Acceso privado no configurado o sin sesión válida'},403)}
 try{
  if(request.method==='GET'){
   const {results}=await env.RADAR_DB.prepare('SELECT anime_id, payload FROM anime_progress WHERE user_id=?').bind(user).all();
   const track={};for(const r of results)try{track[r.anime_id]=JSON.parse(r.payload)}catch(e){};
   return reply({track});
  }
  if(request.method==='PUT'){
   if(Number(request.headers.get('Content-Length')||0)>100000)return reply({error:'Progreso demasiado grande'},413);
   const input=await request.text();if(input.length>100000)return reply({error:'Progreso demasiado grande'},413);
   const data=JSON.parse(input);const entries=sanitize(data.track);
   if(entries.length){
    const statements=entries.map(([id,v])=>env.RADAR_DB.prepare(`INSERT INTO anime_progress (user_id,anime_id,payload,updated_ms)
 VALUES(?,?,?,?) ON CONFLICT(user_id,anime_id) DO UPDATE SET
 payload=excluded.payload,updated_ms=excluded.updated_ms
 WHERE excluded.updated_ms>=anime_progress.updated_ms`).bind(user,id,JSON.stringify(v),v.changedAt));
    await env.RADAR_DB.batch(statements);
   }
   return reply({ok:true,updated:entries.length});
  }
  return reply({error:'Método no permitido'},405);
 }catch(e){console.error('Error API Radar',e);return reply({error:'No se pudo procesar el progreso'},500)}
}
