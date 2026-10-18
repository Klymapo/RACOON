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
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{
  const {createDefaultState,STATE_KEY}=await import('/js/storage.mjs');
  const state=createDefaultState([{id:'custom:smartfilm',title:'QA Dragón',mediaKind:'movie',genres:['Fantasy']},{id:'custom:smartother',title:'QA Drama',mediaKind:'movie',genres:['Drama']},{id:'custom:smartseries',title:'QA Serie',mediaKind:'season',availableEpisodes:3}]);
  state.tracking={'custom:smartfilm':{status:'Pendiente',favorite:true,rating:8},'custom:smartother':{status:'Terminada',favorite:false},'custom:smartseries':{status:'Viendo',favorite:true}};
  state.updateMeta.lastChecked=Date.now();localStorage.setItem(STATE_KEY,JSON.stringify(state));
 });
 await page.reload();await page.locator('[data-view="progress"]').click();
 await page.locator('#smartManager summary').click();
 await page.locator('#smartName').fill('Favoritas QA');await page.locator('#smartQuery').fill('QA');
 await page.locator('#smartFormat').selectOption('movie');await page.locator('#smartFavorite').selectOption('yes');
 await page.locator('#smartGenre').fill('Fantasy');await page.locator('#smartRatingMin').fill('7');
 await page.locator('#smartForm [type="submit"]').click();
 await page.locator('#smartStatusMessage').filter({hasText:'Colección guardada'}).waitFor();
 const id=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('racoon-v2-state')).smartCollections.items)[0]);
 await page.locator('#progressFolder').selectOption(id);
 assert.equal(await page.locator('[data-library-id]').count(),1);
 assert.match(await page.locator('[data-smart-row]').innerText(),/1 ficha/);
 await page.locator('[data-library-id="custom:smartfilm"] [data-open-detail]').click();
 await page.locator('#workDetail [data-progress-action="favorite"]').click();
 await page.locator('#workDetail [data-close-detail]').click();
 assert.equal(await page.locator('[data-library-id]').count(),0);
 await page.locator('[data-smart-action="edit"]').click();
 assert.equal(await page.locator('#smartName').inputValue(),'Favoritas QA');
 await page.locator('#smartFavorite').selectOption('no');await page.locator('#smartName').fill('Películas QA');
 await page.locator('#smartForm [type="submit"]').click();
 assert.equal(await page.locator('[data-library-id]').count(),1);
 // Duplicado: no sobrescribe ni crea una segunda colección.
 await page.locator('#smartName').fill('Películas QA');await page.locator('#smartForm [type="submit"]').click();
 assert.match(await page.locator('#smartStatusMessage').innerText(),/existe/);
 assert.equal(await page.locator('[data-smart-row]').count(),1);
 await page.locator('#smartCancel').click();
 const oldBackup=await page.evaluate(async()=>{const {createBackup}=await import('/js/backup.mjs');return createBackup(JSON.parse(localStorage.getItem('racoon-v2-state')));});
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-smart-action="trash"]').click();
 assert.equal(await page.locator('[data-smart-row]').count(),0);
 assert.equal(await page.locator('#progressFolder').inputValue(),'all');
 await page.reload();await page.locator('[data-view="backups"]').click();
 await page.locator('#backupFile').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldBackup))});
 page.once('dialog',dialog=>dialog.accept());await page.locator('#mergeImport').click();
 await page.locator('[data-view="progress"]').click();await page.locator('#smartManager summary').click();
 assert.equal(await page.locator('[data-smart-row]').count(),0);
 await page.locator('[data-smart-action="restore"]').click();await page.locator('#progressFolder').selectOption(id);
 assert.equal(await page.locator('[data-library-id]').count(),1);
 for(const width of [320,390,800,1440]){
  await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await page.setViewportSize({width:390,height:844});await mkdir('artifacts/qa',{recursive:true});
 await page.screenshot({path:'artifacts/qa/racoon-v3-08-smart-mobile.png',fullPage:true});
 await page.locator('[data-view="backups"]').click();
 const download=page.waitForEvent('download');await page.locator('#exportBackup').click();
 const backup=JSON.parse(await readFile(await (await download).path(),'utf8'));
 assert.equal(backup.smartCollections.items[id].rules.favorite,'no');
 assert.equal(backup.smartCollections.items[id].rules.minRating,7);
 await page.locator('#activateIndexedStorage').click();
 await page.locator('#storageRuntimeStatus').filter({hasText:'IndexedDB activo y verificado'}).waitFor();
 await page.locator('[data-view="progress"]').click();await page.locator('[data-smart-action="edit"]').click();
 await page.locator('#smartName').fill('Películas QA editadas');await page.locator('#smartForm [type="submit"]').click();
 await page.waitForFunction(()=>document.getElementById('storageRuntimeStatus').textContent.includes('IndexedDB activo y verificado'));
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 await context.setOffline(true);await page.reload();await page.locator('[data-view="progress"]').click();
 assert.equal(await page.locator('#progressFolder').inputValue(),id);
 assert.equal(await page.locator('[data-library-id]').count(),1);
 await page.locator('#smartManager summary').click();
 assert.match(await page.locator('#smartList').innerText(),/Películas QA editadas/);
 await page.locator('[data-library-id="custom:smartfilm"] [data-open-detail]').click();
 await page.locator('#workDetail [data-progress-action="favorite"]').click();await page.locator('#workDetail [data-close-detail]').click();
 assert.equal(await page.locator('[data-library-id]').count(),0);
 await page.waitForFunction(()=>document.getElementById('storageRuntimeStatus').textContent.includes('IndexedDB activo y verificado'));
 await page.reload();await page.locator('[data-view="progress"]').click();
 assert.equal(await page.locator('[data-library-id]').count(),0);
 assert.deepEqual(errors,[]);await context.close();
 console.log('Chromium smart: crear, editar, recalcular, duplicado, papelera, fusión antigua, restaurar, JSON, geometría, IndexedDB y offline OK');
} finally {await browser?.close();server.close();}
