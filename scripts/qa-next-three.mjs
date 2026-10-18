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
 browser=await playwright.chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||playwright.chromium.executablePath(),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-18T18:00:00Z'));
 await page.route('https://graphql.anilist.co/**',route=>route.fulfill({json:{data:{Page:{pageInfo:{hasNextPage:false},media:[]}}}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(async()=>{
  const {createDefaultState,STATE_KEY}=await import('/js/storage.mjs');const {createFolder}=await import('/js/folders.mjs');
  let s=createDefaultState([{id:'custom:qa1',title:'! QA1 film',mediaKind:'movie',premiereDate:'2026-10-18',savedAt:1},{id:'custom:qa2',title:'! QA2 series',mediaKind:'season',availableEpisodes:2,weeklySchedule:{frequency:'weekly',day:6,startDate:'2026-10-01'},sourceTime:{time:'00:30',timeZone:'Asia/Tokyo'}},{id:'custom:qa3',title:'! QA3 unowned',mediaKind:'movie',premiereDate:'2026-10-31'},{id:'custom:qa4',title:'! QA4 November',mediaKind:'movie',premiereDate:'2026-11-01'}]);
  s.tracking['custom:qa2']={seen:1,status:'Viendo'};s.updateMeta.lastChecked=Date.now();s=createFolder(s,'QA Slice',Date.now());localStorage.setItem(STATE_KEY,JSON.stringify(s));
 });
 await page.reload();const go=async view=>page.locator(`[data-view="${view}"]`).click();
 async function openDetail(){await go('progress');await page.locator('[data-library-id="custom:qa1"] [data-open-detail]').click();}
 async function closeDetail(){await page.locator('#workDetail [data-close-detail]').click();}
 await go('backups');await page.locator('#regionalSubscriptionForm [name="platform"]').fill('Prime Video');await page.locator('#regionalSubscriptionForm [type="submit"]').click();
 await openDetail();const form=page.locator('#regionalOfferForm');await page.locator('[data-regional-panel] details summary').click();
 for(const [key,value]of Object.entries({country:'MX',platform:'Prime Video',channel:'Universal+',sourceUrl:'https://www.primevideo.com/detail/qa-fixture',checkedAt:'2026-10-18'}))await form.locator(`[name="${key}"]`).fill(value);
 await form.locator('[name="mode"]').selectOption('channel');await form.locator('[name="verified"]').check();await form.locator('[type="submit"]').click();
 assert.match(await page.locator('[data-regional-results]').innerText(),/Requiere otra suscripción/);await closeDetail();
 await go('backups');await page.locator('#regionalSubscriptionForm [name="platform"]').fill('Prime Video');await page.locator('#regionalSubscriptionForm [name="channel"]').fill('Universal+');await page.locator('#regionalSubscriptionForm [type="submit"]').click();
 await openDetail();assert.match(await page.locator('[data-regional-results]').innerText(),/Incluido con tus suscripciones/);await closeDetail();
 await go('backups');await page.locator('#regionCountry').fill('US');await page.locator('#regionCountryForm [type="submit"]').click();
 await openDetail();assert.match(await page.locator('[data-regional-results]').innerText(),/Sin ofertas documentadas/);await closeDetail();
 await go('backups');await page.locator('#regionCountry').fill('MX');await page.locator('#regionCountryForm [type="submit"]').click();
 // Agenda: default mine, real month length, all local, date navigation and source zone.
 await go('calendar');assert.equal(await page.locator('#agendaScope').inputValue(),'mine');await page.locator('#agendaMode').selectOption('month');
 await page.locator('#agendaDate').fill('2026-10-18');await page.locator('#agendaDate').dispatchEvent('change');
 assert.equal(await page.locator('[data-calendar-panel]').count(),31);assert.doesNotMatch(await page.locator('#calendar').innerText(),/QA3 unowned/);
 assert.match(await page.locator('[data-calendar-panel="2026-10-17"]').innerText(),/QA2 series/);
 await page.locator('#agendaScope').selectOption('all');assert.match(await page.locator('#calendar').innerText(),/QA3 unowned/);
 await page.locator('#nextWeek').click();assert.equal(await page.locator('[data-calendar-panel]').count(),30);assert.match(await page.locator('#calendar').innerText(),/QA4 November/);
 await page.locator('#currentWeek').click();await page.locator('#agendaMode').selectOption('day');assert.equal(await page.locator('[data-calendar-panel]').count(),1);
 await page.locator('#agendaMode').selectOption('week');assert.equal(await page.locator('[data-calendar-panel]').count(),7);
 // Slice: optional signals + folder, undo, mouse swipe left/up, keyboard and conflict guard.
 await go('add');assert.equal(await page.locator('[data-slice-entry]').getAttribute('data-slice-entry'),'custom:qa1');
 await page.locator('#sliceFavorite').check();await page.locator('#sliceRating').fill('8');
 const folderId=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('racoon-v2-state')).collections.folders)[0]);await page.locator('#sliceFolder').selectOption(folderId);
 await page.locator('[data-slice-action="right"]').click();assert.notEqual(await page.locator('[data-slice-entry]').getAttribute('data-slice-entry'),'custom:qa1');
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('racoon-v2-state')));assert.equal(saved.tracking['custom:qa1'].rating,8);assert.equal(saved.tracking['custom:qa1'].favorite,true);
 await page.locator('#sliceUndo').click();assert.equal(await page.locator('[data-slice-entry]').getAttribute('data-slice-entry'),'custom:qa1');
 async function swipe(direction){await page.locator('#sliceGestureArea').scrollIntoViewIfNeeded();const b=await page.locator('#sliceGestureArea').boundingBox(),x=b.x+b.width/2,y=b.y+110;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(direction==='left'?x-95:x,direction==='up'?y-90:y,{steps:8});await page.mouse.up();}
 await swipe('left');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('racoon-v2-state')).tracking['custom:qa1'].status),'Descartada');await page.locator('#sliceUndo').click();
 await swipe('up');saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('racoon-v2-state')));assert.equal(saved.tracking['custom:qa1'].status,'Terminada');assert.equal(saved.tracking['custom:qa1'].watchedAt,undefined);await page.locator('#sliceUndo').click();
 await page.locator('#sliceGestureArea').focus();await page.keyboard.press('ArrowRight');
 await openDetail();await page.locator('#workDetail [data-progress-field="status"]').selectOption('Viendo');await closeDetail();
 await go('add');await page.locator('#sliceUndo').click();assert.match(await page.locator('#sliceStatus').innerText(),/cambió/);
 // Every view remains usable in narrow screens; no hidden information claims.
 for(const width of [320,390,800,1440]){await page.setViewportSize({width,height:844});for(const view of ['calendar','add','backups']){await go(view);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}}
 await page.setViewportSize({width:390,height:844});await go('backups');
 const download=page.waitForEvent('download');await page.locator('#exportBackup').click();const backup=JSON.parse(await readFile(await(await download).path(),'utf8'));
 assert.equal(Object.keys(backup.regionData.offers).length,1);assert.ok(Object.keys(backup.sliceData.records).length>=4);
 await page.locator('#activateIndexedStorage').click();await page.locator('#storageRuntimeStatus').filter({hasText:'IndexedDB activo y verificado'}).waitFor();
 await go('add');await page.locator('[data-slice-action="right"]').click();await page.waitForFunction(()=>document.getElementById('storageRuntimeStatus').textContent.includes('IndexedDB activo y verificado'));
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();
 await go('backups');assert.equal(await page.locator('#regionCountry').inputValue(),'MX');
 await go('calendar');assert.equal(await page.locator('#agendaMode').inputValue(),'week');
 await go('add');assert.ok(await page.locator('#sliceHistory').textContent());assert.notEqual(await page.locator('[data-slice-entry]').getAttribute('data-slice-entry'),'custom:qa1');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('racoon-v2-state')).tracking['custom:qa1'].status),'Viendo');
 assert.deepEqual(errors,[]);await context.close();console.log('Chromium next3: región/canales/país, Agenda día/semana/mes, Slice botones/gestos/teclado/deshacer/conflicto/JSON/IndexedDB/offline OK');
}finally{await browser?.close();server.close();}
