import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';

const html=readFileSync('public/index.html','utf8');
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));

test('RACOON muestra 25 animes sin duplicados',()=>{
 const match=html.match(/const DATA=(\[[^\n]+\]);/);
 assert.ok(match,'No se encuentra DATA en HTML');
 const data=JSON.parse(match[1]);
 assert.equal(data.length,25);
 assert.equal(new Set(data.map(x=>x.id)).size,25);
 for(const x of data)for(const f of ['name','platform','date'])assert.ok(x[f]);
});

test('El JavaScript embebido tiene sintaxis válida',()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length);
 for(const [,code] of scripts){
  const r=spawnSync(process.execPath,['--check'],{input:code,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
 }
});

test('PWA instalable',()=>{
 assert.equal(manifest.name,'RACOON · Anime Radar');
 assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons)assert.ok(existsSync('public'+icon.src));
 assert.ok(existsSync('public/sw.js'));
});

test('Progreso local y traslado mediante JSON',()=>{
 for(const text of ['localStorage.getItem(stateKey)','localStorage.setItem(stateKey','id="backup"','id="restore"','data-catchup','data-seen','data-aired','data-total'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('/api/progress'),'La aplicación pública no debe solicitar datos personales al backend');
 assert.ok(!html.includes('cloudIndicator'),'La interfaz pública no debe sugerir que sincroniza');
});

test('Archivos públicos sin claves privadas',()=>{
 assert.ok(!/\b(?:sk_live_|ghp_|github_pat_)/.test(html));
 assert.ok(!/BEGIN (RSA |EC )?PRIVATE KEY/.test(html));
});

test('The Vermilion Mask: datos y emisión correcta del primer cour',()=>{
 const match=html.match(/const DATA=(\\[[^\\n]+\\]);/);
 const serie=JSON.parse(match[1]).find(x=>x.id==='verm');
 assert.equal(serie.date,'2026-10-10');
 assert.equal(serie.day,5); // sábado
 assert.equal(serie.platform,'Crunchyroll');
 assert.ok(html.includes("verm:{total:12,mode:'weekly',verified:true}"));
 const code=html.slice(html.indexOf('const CR_SLOTS='),html.indexOf('const LIVE_INTERVAL ='));
 assert.ok(code.startsWith('const CR_SLOTS='));
 const calc=at=>runInNewContext(code+'; crSchedule({id:"verm",kind:"Estreno"},Date.parse('+JSON.stringify(at)+'));',{Date,Intl});
 const previo=calc('2026-10-13T14:00:00Z');
 assert.equal(previo.released,1);
 assert.equal(previo.ep,2);
 assert.equal(previo.date,'2026-10-17');
 const posterior=calc('2026-10-17T10:00:00Z');
 assert.equal(posterior.released,2);
 assert.equal(posterior.ep,3);
 assert.equal(posterior.date,'2026-10-24');
 assert.equal(calc('2026-12-27T18:00:00Z'),null,'No inventar un episodio 13 durante el receso');
});
