// Prueba opcional real: node scripts/qa-indexeddb.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
  browser = await playwright.chromium.launch({headless:true, executablePath: process.env.CHROMIUM_PATH || playwright.chromium.executablePath(), args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:390,height:844}, serviceWorkers:'allow'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:' + server.address().port + '/');
  await page.evaluate(async () => {
    const {createDefaultState, STATE_KEY} = await import('/js/storage.mjs');
    const state = createDefaultState();
    // Esta prueba manipula el origen directamente para simular otra escritura.
    // Evitar que el refresco remoto de arranque persista el estado en memoria
    // durante ese experimento; el refresco se cubre en qa-browser.mjs.
    state.updateMeta.lastChecked = Date.now();
    state.tracking['legacy:verm'] = {seen:2, favorite:true, status:'Viendo'};
    state.tracking['custom:copy-test'] = {seen:3, favorite:true, status:'Viendo'};
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  });
  await page.reload();
  await page.locator('[data-view="backups"]').click();
  const original = await page.evaluate(() => localStorage.getItem('racoon-v2-state'));
  await page.locator('#prepareIndexedBackup').click();
  await page.getByText('Copia IndexedDB creada y verificada.', {exact:false}).waitFor();
  const snapshot = await page.evaluate(async () => {
    const {openRacoonDatabase, readIndexedSnapshot} = await import('/js/indexeddb.mjs');
    const db = await openRacoonDatabase();
    try {return await readIndexedSnapshot(db);} finally {db.close();}
  });
  assert.equal(snapshot.tracking['custom:copy-test'].seen, 3);
  assert.equal(snapshot.tracking['custom:copy-test'].favorite, true);
  assert.equal(await page.evaluate(() => localStorage.getItem('racoon-v2-state')), original);
  await page.locator('#prepareIndexedBackup').click();
  await page.getByText('ya coincide con tu biblioteca actual', {exact:false}).waitFor();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('racoon-v2-state'));
    state.tracking['custom:copy-test'].seen = 4;
    localStorage.setItem('racoon-v2-state', JSON.stringify(state));
  });
  await page.locator('#prepareIndexedBackup').click();
  await page.getByText('no coincide con tu biblioteca actual', {exact:false}).waitFor();
  assert.equal(await page.evaluate(async () => {
    const {openRacoonDatabase, readIndexedSnapshot} = await import('/js/indexeddb.mjs');
    const db = await openRacoonDatabase();
    try {return (await readIndexedSnapshot(db)).tracking['custom:copy-test'].seen;} finally {db.close();}
  }), 3);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('racoon-v2-state')).tracking['custom:copy-test'].seen), 4);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-view="backups"]').click();
  assert.equal(await page.locator('#prepareIndexedBackup').isVisible(), true);
  await context.setOffline(false);
  // Activación explícita toma la biblioteca actual, incluso con copia previa obsoleta.
  await page.locator('#activateIndexedStorage').click();
  await page.locator('#storageRuntimeStatus').filter({hasText:'IndexedDB activo y verificado'}).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('racoon-storage-mode')), 'indexeddb');
  const checkpointDownload = page.waitForEvent('download');
  await page.locator('#downloadIndexedCheckpoint').click();
  const checkpoint = JSON.parse(await readFile(await (await checkpointDownload).path(), 'utf8'));
  assert.equal(checkpoint.tracking['custom:copy-test'].seen, 4);
  async function readSeen() {
    return page.evaluate(async () => {
      const {openRacoonDatabase, readIndexedSnapshot} = await import('/js/indexeddb.mjs');
      const db=await openRacoonDatabase();
      try {return (await readIndexedSnapshot(db)).tracking['legacy:verm'].seen;} finally {db.close();}
    });
  }
  async function increment() {
    await page.locator('[data-view="progress"]').click();
    await page.locator('[data-library-id="legacy:verm"] [data-open-detail]').click();
    await page.locator('#workDetail [data-progress-action="plus"]').click();
    await page.locator('#workDetail [data-close-detail]').click();
  }
  await increment();
  await page.waitForFunction(() => document.getElementById('storageRuntimeStatus').textContent.includes('IndexedDB activo y verificado'));
  assert.equal(await readSeen(), 3);
  await page.reload();
  await page.locator('#activateIndexedStorage').waitFor({state:'attached'});
  assert.equal(await page.locator('#activateIndexedStorage').isDisabled(), true);
  assert.equal(await readSeen(), 3);
  // Un fallo de escritura real no debe perder el último progreso del espejo.
  await page.evaluate(() => {
    const original=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(stores,mode,...args) {
      if(this.name==='racoon-v3-local'&&mode==='readwrite')throw Error('Injected write failure');
      return original.call(this,stores,mode,...args);
    };
  });
  await increment();
  await page.waitForFunction(() => localStorage.getItem('racoon-storage-mode')==='local');
  assert.equal(await readSeen(),3);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('racoon-v2-state')).tracking['legacy:verm'].seen),4);
  await page.reload();
  await page.locator('[data-view="backups"]').click();
  await page.locator('#activateIndexedStorage').click();
  await page.locator('#storageRuntimeStatus').filter({hasText:'IndexedDB activo y verificado'}).waitFor();
  await increment();
  await page.waitForFunction(() => document.getElementById('storageRuntimeStatus').textContent.includes('IndexedDB activo y verificado'));
  assert.equal(await readSeen(),5);
  await page.locator('[data-view="backups"]').click();
  await page.locator('#deactivateIndexedStorage').click();
  await page.locator('#storageRuntimeStatus').filter({hasText:'localStorage activo'}).waitFor();
  assert.equal(await readSeen(),5);
  // Volver a activar no modifica la copia anterior a la primera migración.
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('racoon-v2-state:before-indexed-v1')).tracking['legacy:verm'].seen),2);
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-view="backups"]').click();
  await page.locator('#activateIndexedStorage').click();
  await page.locator('#storageRuntimeStatus').filter({hasText:'IndexedDB activo y verificado'}).waitFor();
  await page.reload();
  await page.locator('#activateIndexedStorage').waitFor({state:'attached'});
  assert.equal(await page.locator('#activateIndexedStorage').isDisabled(),true);
  assert.equal(await readSeen(),5);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('racoon-v2-state')).tracking['legacy:verm'].seen),5);
  // Prueba adicional en navegador real: cuota local llena, IDB sigue guardando.
  await page.evaluate(() => {
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value) {
      if(key==='racoon-v2-state'||key==='racoon-v2-state:previous')throw Error('QuotaExceededError simulado');
      return original.call(this,key,value);
    };
  });
  await increment();
  await page.waitForFunction(() => document.getElementById('storageRuntimeStatus')?.textContent.includes('Guardado en IndexedDB verificado'));
  assert.equal(await readSeen(),6);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('racoon-v2-state')).tracking['legacy:verm'].seen),5);
  await page.reload(); // La cuota simulada desaparece; el dato reciente se lee de IDB.
  await page.locator('[data-view="progress"]').click();
  await page.locator('[data-library-id="legacy:verm"] [data-open-detail]').click();
  assert.equal(await page.locator('#workDetail [data-progress-field="seen"]').inputValue(),'6');
  await page.locator('#workDetail [data-close-detail]').click();
  await page.locator('[data-view="backups"]').click();
  await page.locator('#deactivateIndexedStorage').click();
  await page.locator('#storageRuntimeStatus').filter({hasText:'localStorage activo'}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('racoon-v2-state')).tracking['legacy:verm'].seen),6);
  assert.deepEqual(errors, []);
  console.log('Chromium IndexedDB: copia, verificación, duplicado, conflicto, origen intacto, activación, edición, recarga, fallo, reversión y offline OK');
} finally {
  await browser?.close();
  server.close();
}
