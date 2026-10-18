// PNG reproducibles desde la fuente SVG; solo depende de librsvg2-bin libre.
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const master=readFileSync(resolve(ROOT,'public/icons/racoon-wizard.svg'),'utf8');
const body=master.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1];
if(!body)throw Error('SVG maestro RACOON no válido');
function render(size,scale,filename){
  const offset=(256-256*scale)/2;
  const contents='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">'+
    '<rect width="256" height="256" rx="44" fill="#100B24"/>'+
    '<g transform="translate('+offset+' '+offset+') scale('+scale+')">'+body+'</g></svg>';
  const target=resolve(ROOT,'public/icons',filename);
  const task=spawnSync('rsvg-convert',['--format','png','--width',String(size),'--height',String(size)],{input:contents,maxBuffer:8*1024*1024});
  if(task.status!==0)throw Error('No se pudo generar '+filename+': '+String(task.stderr));
  const png=task.stdout;
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.readUInt32BE(16)!==size||png.readUInt32BE(20)!==size)
    throw Error('PNG inválido: '+filename);
  writeFileSync(target,png);
  process.stdout.write(filename+' '+size+'×'+size+' '+png.length+' bytes\n');
}
render(192,.88,'racoon-wizard-192.png');
render(512,.88,'racoon-wizard-512.png');
render(512,.64,'racoon-maskable-512.png');
