// Prueba opcional real: node scripts/qa-indexeddb.mjs
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname, join, normalize} from 'node:path';
let playwright;
try { playwright = (await import(process.env.PLAYWRIGHT_MODULE || 'playwright')).default; }
catch { playwright = (await import('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js')).default; }
const root = new URL('../public/', import.meta.url).pathname;
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const path = join(root, normalize(pathname).replace(/^\/+/, '') || 'index.html');
  if (!path.startsWith(root)) {response.writeHead(403).end(); return;}
  try {
    const body = await readFile(path.endsWith('/') ? join(path, 'index.html') : path);
    response.writeHead(200, {'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(body);
  } catch {response.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
 browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||playwright.chromium.executablePath(),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://graphql.anilist.co/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({data:{Page:{pageInfo:{hasNextPage:false},media:[]}}})}));
 await page.clock.setFixedTime(new Date('2026-10-18T18:00:00Z'));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{const {createDefaultState,STATE_KEY}=await import('/js/storage.mjs');const s=createDefaultState([{id:'custom:liked',title:'QA Favorita',mediaKind:'movie',year:2020,genres:['Drama']},{id:'custom:candidate',title:'QA Candidata',mediaKind:'movie',year:2021,genres:['Drama']}]);s.tracking['custom:liked']={rating:9,status:'Terminada'};s.updateMeta.lastChecked=Date.now();localStorage.setItem(STATE_KEY,JSON.stringify(s));});
 await page.reload();assert.match(await page.locator('#recommendations').innerText(),/Drama/);
 await page.locator('#recommendations [data-open-detail="custom:candidate"]').click();
 const panel=page.locator('[data-ratings-id="custom:candidate"]');assert.match(await panel.innerText(),/sin nota pública verificada/);
 await panel.locator('[data-personal-rating] input').fill('0');await panel.locator('[data-personal-rating] button').click();assert.match(await panel.locator('[data-ratings-summary]').innerText(),/Tu nota: 0 \/ 10/);
 await panel.locator('details').first().locator('summary').click();const form=panel.locator('[data-public-rating]');
 for(const [name,value]of Object.entries({source:'TMDB (fixture QA)',url:'https://www.themoviedb.org/movie/1',value:'85',votes:'12',checkedAt:'2026-10-18'}))await form.locator(`[name="${name}"]`).fill(value);
 await form.locator('[name="scale"]').selectOption('100');await form.locator('[name="verified"]').check();await form.locator('button').click();
 assert.match(await panel.locator('[data-ratings-summary]').innerText(),/8.50 \/ 10/);assert.match(await panel.locator('[data-ratings-summary]').innerText(),/emocionado/);
 await panel.locator('[data-personal-rating] input').fill('2');await panel.locator('[data-personal-rating] button').click();assert.match(await panel.locator('[data-ratings-summary]').innerText(),/emocionado/);
 await panel.locator('details').nth(1).locator('summary').click();await panel.locator('[name="filmUrl"]').fill('https://letterboxd.com/film/qa/');await panel.locator('[data-letterboxd-links] button').click();
 assert.equal(await panel.locator('a').filter({hasText:'Ficha en Letterboxd'}).getAttribute('href'),'https://letterboxd.com/film/qa/');
 await page.locator('[data-close-detail]').click();await page.locator('[data-view="backups"]').click();
 const csv='Name,Year,Rating,Date\nQA Candidata,2021,3.5,2026-10-18\nQA Nueva,2023,4,2026-10-17';
 await page.locator('#letterboxdFile').setInputFiles({name:'ratings.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 assert.match(await page.locator('#letterboxdStatus').innerText(),/2 filas; 1 seleccionadas/);
 await page.locator('#letterboxdApply').click();assert.match(await page.locator('#letterboxdStatus').innerText(),/Importación guardada/);
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('racoon-v2-state')));let imported=Object.values(saved.catalogCustom).find(e=>e.title==='QA Nueva');assert(imported);assert.equal(saved.tracking[imported.id].rating,8);assert.equal(saved.tracking[imported.id].watchedAt,null);assert.equal(saved.tracking['custom:candidate'].rating,2);assert(saved.socialData.public['custom:candidate']);
 await page.locator('#letterboxdFile').setInputFiles({name:'quota.csv',mimeType:'text/csv',buffer:Buffer.from('Name,Year\nQA Sin espacio,2025')});
 const quotaBefore=await page.evaluate(()=>localStorage.getItem('racoon-v2-state'));
 await page.evaluate(()=>{window.originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='racoon-before-letterboxd')throw new DOMException('QA cuota','QuotaExceededError');return window.originalStorageSet.call(this,key,value);};});
 await page.locator('#letterboxdApply').click();assert.equal(await page.evaluate(()=>localStorage.getItem('racoon-v2-state')),quotaBefore);assert.match(await page.locator('#letterboxdStatus').innerText(),/QA cuota/);
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet;});await page.locator('#letterboxdCancel').click();
 const beforeCancel=JSON.stringify(saved);await page.locator('#letterboxdFile').setInputFiles({name:'cancel.csv',mimeType:'text/csv',buffer:Buffer.from('Name,Year\nCancelled,2025')});await page.locator('#letterboxdCancel').click();assert.equal(await page.evaluate(()=>localStorage.getItem('racoon-v2-state')),beforeCancel);
 for(const width of [320,390,800,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.locator('#activateIndexedStorage').click();await page.locator('#storageRuntimeStatus').filter({hasText:'IndexedDB activo y verificado'}).waitFor();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await page.locator('[data-view="home"]').click();await page.locator('#recommendations [data-open-detail="custom:candidate"]').click();assert.match(await page.locator('[data-ratings-summary]').innerText(),/emocionado/);
 assert.deepEqual(errors,[]);await context.close();console.log('Chromium discovery: recomendaciones, nota cero, fuente/base/votos, cara independiente, enlaces, CSV, duplicados, cancelar, respaldo, geometría y offline OK');
}finally{await browser?.close();server.close();}
