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
  assert.deepEqual(errors, []);
  console.log('Chromium IndexedDB: copia, verificación, duplicado, conflicto, origen intacto y offline OK');
} finally {
  await browser?.close();
  server.close();
}
