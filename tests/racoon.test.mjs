import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const html=readFileSync('public/index.html','utf8');
const api=readFileSync('functions/api/progress.js','utf8');
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
test('RACOON tiene 25 animes y títulos sin duplicados',()=>{
 const match=html.match(/const DATA=(\[[^\n]+\]);/);
 assert.ok(match,'No se encuentra DATA en HTML');
 const data=JSON.parse(match[1]);
 assert.equal(data.length,25);
 assert.equal(new Set(data.map(x=>x.id)).size,25);
 for(const a of data){assert.ok(a.name);assert.ok(a.platform);assert.ok(a.date);}
});
test('JavaScript embebido y API tienen sintaxis válida',()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length,'No hay JavaScript');
 for(const [,code] of scripts){
  const r=spawnSync(process.execPath,['--check'],{input:code,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
 }
 const apiResult=spawnSync(process.execPath,['--check','functions/api/progress.js'],{encoding:'utf8'});
 assert.equal(apiResult.status,0,apiResult.stderr);
});
test('PWA lista para instalar en Android y PC',()=>{
 assert.equal(manifest.name,'RACOON · Anime Radar');
 assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons)assert.ok(existsSync('public'+icon.src));
 assert.ok(existsSync('public/sw.js'));
});
test('Seguimiento y sincronización de progreso disponibles',()=>{
 assert.ok(html.includes('/api/progress'));
 for(const item of ['data-catchup','data-seen','data-aired','data-total','cloudIndicator'])assert.ok(html.includes(item),item);
 assert.ok(api.includes('Cf-Access-Jwt-Assertion'));
 assert.ok(api.includes('ALLOWED_EMAIL'));
 assert.ok(api.includes('RADAR_DB'));
 assert.ok(readFileSync('schema.sql','utf8').includes('anime_progress'));
});
test('No hay credenciales incrustadas en la app',()=>{
 assert.ok(!/\b(?:sk_live_|ghp_|github_pat_)/.test(html));
 assert.ok(!/BEGIN (RSA |EC )?PRIVATE KEY/.test(html+api));
});