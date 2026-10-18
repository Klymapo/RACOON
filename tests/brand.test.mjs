import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderRacoonFace} from '../public/js/brand.mjs';
import {faceForScore} from '../public/js/ratings.mjs';
const master=readFileSync(new URL('../public/icons/racoon-wizard.svg',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
test('maestro SVG geométrico y variantes legales comparten antifaz y paleta',()=>{
  assert.match(master,/viewBox="0 0 256 256"/);
  assert.match(master,/antifaz/);
  for(const hex of ['#100B24','#8656E8','#B49AFF','#F4EFFF'])assert.ok(master.includes(hex));
  const mouths=new Set(['sin dato','decepcionado','dudoso','neutral','contento','emocionado'].map(face=>{
    const svg=renderRacoonFace(face);assert.match(svg,/role="img"/);assert.match(svg,/path/);return svg;
  }));
  assert.equal(mouths.size,6);
  assert.equal(renderRacoonFace('<script>'),renderRacoonFace('sin dato'));
});
test('expresión pública respeta los cinco rangos y desconoce fuente ausente',()=>{
  assert.deepEqual([undefined,0,2.9,3,4.9,5,6.9,7,8.4,8.5,10].map(faceForScore),
    ['sin dato','decepcionado','decepcionado','dudoso','dudoso','neutral','neutral','contento','contento','emocionado','emocionado']);
});
test('manifest separa icono normal y maskable generado por CI, sin mezclar propósitos',()=>{
  const normal=manifest.icons.filter(x=>x.purpose==='any'),mask=manifest.icons.filter(x=>x.purpose==='maskable');
  assert.equal(normal.length,2);assert.equal(mask.length,1);
  assert.deepEqual(normal.map(x=>x.sizes),['192x192','512x512']);
  assert.equal(mask[0].sizes,'512x512');
  assert.ok(readFileSync(new URL('../scripts/build-brand-icons.mjs',import.meta.url),'utf8').includes('render(512,.64'));
});
