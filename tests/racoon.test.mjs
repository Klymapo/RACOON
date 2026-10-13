import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {CATALOG} from '../public/js/catalog.mjs';

const html=readFileSync('public/index.html','utf8');
const styles=readFileSync('public/styles.css','utf8');
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));

test('RACOON muestra 25 animes sin duplicados',()=>{
 assert.equal(CATALOG.length,25);
 assert.equal(new Set(CATALOG.map(x=>x.id)).size,25);
 for(const x of CATALOG)for(const f of ['title','platform','date'])assert.ok(x[f]);
 assert.equal(CATALOG.find((entry)=>entry.id==='legacy:verm').availableEpisodes,1);
 assert.equal(CATALOG.find((entry)=>entry.id==='legacy:verm').scheduleEvents[0].confidence,'contradictory');
 assert.equal(CATALOG.filter((entry)=>entry.weeklySchedule?.frequency==='weekly').length,23);
});

test('Los módulos JavaScript tienen sintaxis válida',()=>{
 const modules=readdirSync('public/js',{recursive:true}).filter(file=>String(file).endsWith('.mjs'));
 assert.ok(modules.length);
 for(const file of modules){
  const code=readFileSync(`public/js/${file}`,'utf8');
  const r=spawnSync(process.execPath,['--check'],{input:code,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
 }
});

test('PWA instalable',()=>{
 assert.equal(manifest.name,'RACOON · Anime Wizard');
 assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons)assert.ok(existsSync('public'+icon.src));
 assert.ok(existsSync('public/sw.js'));
});

test('published version metadata, application and service worker stay in sync',()=>{
 const version=JSON.parse(readFileSync('public/version.json','utf8')).version;
 assert.match(readFileSync('public/js/app.mjs','utf8'),new RegExp(`RACOON_VERSION = '${version}'`));
 assert.match(readFileSync('public/sw.js','utf8'),new RegExp(`VERSION = '${version}'`));
});

test('Progreso local y traslado mediante JSON',()=>{
 const storage=readFileSync('public/js/storage.mjs','utf8');
 const backup=readFileSync('public/js/backup.mjs','utf8');
 for(const text of ['anime-radar-otono-2026-v1','STATE_KEY','saveState','loadState'])assert.ok(storage.includes(text),text);
 for(const text of ['createBackup','parseBackup','mergeBackup','replaceWithBackup'])assert.ok(backup.includes(text),text);
 assert.ok(!html.includes('/api/progress'),'La aplicación pública no debe solicitar datos personales al backend');
});

test('Archivos públicos sin claves privadas',()=>{
 assert.ok(!/\b(?:sk_live_|ghp_|github_pat_)/.test(html));
 assert.ok(!/BEGIN (RSA |EC )?PRIVATE KEY/.test(html));
});

test('RACOON Wizard exposes five accessible views and modular assets',()=>{
 assert.match(html,/type="module"[^>]+src="\/js\/app\.mjs"/);
 for(const id of ['home','calendar','progress','add','backups'])assert.match(html,new RegExp(`data-view="${id}"`));
 for(const id of ['homeView','calendarView','progressView','addView','backupsView'])assert.match(html,new RegExp(`id="${id}"`));
 for(const token of ['#100B24','#1B1538','#8656E8','#B49AFF','#F4EFFF','#72DFD0','#F1CA78'])assert.ok(styles.includes(token),token);
 assert.ok(existsSync('public/icons/racoon-wizard.svg'));
 assert.ok(existsSync('public/icons/racoon-wizard-192.png'));
 assert.ok(existsSync('public/icons/racoon-wizard-512.png'));
 assert.ok(!html.includes('/api/progress'));
});
