// Chromium real con respuestas TMDB de fixture. No usa tokens reales ni verifica disponibilidad pública.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname, join, normalize} from 'node:path';
let playwright;
try {playwright=(await import(process.env.PLAYWRIGHT_MODULE||'playwright')).default;}
catch {playwright=(await import('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js')).default;}
const root=new URL('../public/',import.meta.url).pathname;
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 const path=join(root,normalize(decodeURIComponent(new URL(req.url,'http://localhost').pathname)).replace(/^\/+/, '')||'index.html');
 if(!path.startsWith(root)){res.writeHead(403).end();return;}
 try {res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(path.endsWith('/')?join(path,'index.html'):path));}
 catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
 mkdirSync('artifacts/qa',{recursive:true});
 browser=await playwright.chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [size,name]of [[{width:390,height:844},'mobile'],[{width:1280,height:900},'desktop']]){
  const context=await browser.newContext({viewport:size,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  let queriedCountry=null, requests=0;
  await page.route('https://api.themoviedb.org/3/**',async route=>{
   const url=route.request().url();requests++;
   assert.match(route.request().headers().authorization||'',/^Bearer test-only-no-secret$/);
   if(url.includes('/search/tv')) return route.fulfill({json:{results:[{id:42,name:'Vermilion Mask',first_air_date:'2026-10-01'}]}});
   if(url.includes('/tv/42/watch/providers')){
    queriedCountry='MX';
    return route.fulfill({json:{results:{US:{flatrate:[{provider_name:'Netflix'}]},MX:{flatrate:[{provider_name:'Prime Video',provider_id:1},{provider_name:'HBO Max Amazon Channel',provider_id:2}],rent:[{provider_name:'Apple TV Store',provider_id:3}]}}}});
   }
   return route.abort();
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.locator('[data-view="progress"]').click();
  await page.locator('[data-library-id="legacy:verm"] [data-open-detail]').click();
  const panel=page.locator('#workDetail .region-auto-panel');
  await panel.locator('summary').click();
  await panel.locator('#regionAutoToken').fill('test-only-no-secret');
  await panel.locator('[data-region-auto-search]').click();
  await panel.getByText('Vermilion Mask',{exact:false}).waitFor();
  await panel.locator('[data-region-auto-choice="0"]').click();
  await panel.getByText('HBO Max Amazon Channel',{exact:false}).waitFor();
  assert.equal(queriedCountry,'MX');
  assert.equal(await panel.getByText('Netflix',{exact:false}).count(),0);
  assert.equal(await panel.locator('[data-region-auto-copy]').count(),3);
  assert.ok((await panel.innerText()).includes('Posible canal adicional'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('racoon-v2-state')?.includes('HBO Max Amazon Channel')||false),false);
  assert.equal(await page.evaluate(()=>Object.values(localStorage).join(' ').includes('test-only-no-secret')),false);
  await panel.screenshot({path:'artifacts/qa/racoon-v3-20-regional-'+name+'.png'});
  await panel.locator('[data-region-auto-copy="1"]').click();
  assert.equal(await page.locator('#regionalOfferForm [name="verified"]').isChecked(),false);
  assert.ok(await page.locator('#regionalOfferStatus').textContent().then(x=>x.includes('sin verificar')));
  assert.equal(errors.length,0,errors.join('; '));
  assert.equal(requests,2);
  await context.close();
 }
 console.log('TMDB opcional: Chromium móvil/escritorio, MX estricto, Channel, credencial efímera, borrador no verificado y capturas OK');
} finally {await browser?.close();server.close();}
