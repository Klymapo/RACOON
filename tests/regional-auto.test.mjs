import test from 'node:test';
import assert from 'node:assert/strict';
import {searchTmdbWorks,decodeTmdbProviders,getTmdbProviders} from '../public/js/regional-auto.mjs';
const token='synthetic-not-secret';
test('TMDB searches by text but never silently accepts candidates',async()=>{
 let calls=[];
 const fetch=async(url,opt)=>{calls.push({url,opt});return {ok:true,json:async()=>({results:[{id:10,title:'Matriz',release_date:'1999-03-31'},{id:0,title:'Otro'}]})};};
 const found=await searchTmdbWorks('Matriz','movie',token,{fetch});
 assert.equal(found.length,1);assert.equal(found[0].id,10);
 assert.match(calls[0].url,/\/search\/movie\?/);
 assert.equal(new URL(calls[0].url).searchParams.get('query'),'Matriz');
 assert.equal(calls[0].opt.headers.Authorization,'Bearer '+token);
 assert.ok(!calls[0].url.includes(token),'token no va en la URL');
});
test('country selection NEVER falls back to other countries or assumes season coverage',()=>{
 const response={results:{US:{flatrate:[{provider_name:'Netflix',provider_id:8}]},MX:{flatrate:[{provider_name:'Prime Video',provider_id:1},{provider_name:'HBO Max Amazon Channel',provider_id:2}],rent:[{provider_name:'Apple TV Store',provider_id:3}]}}};
 const mx=decodeTmdbProviders(response,{country:'MX',kind:'tv',id:99});
 assert.equal(mx.offers.length,3);
 assert.ok(!mx.offers.some(x=>x.provider==='Netflix'));
 assert.ok(mx.offers.every(x=>x.verified===false && x.scopeVerified===false));
 assert.equal(mx.offers[1].mode,'unknown');
 assert.equal(mx.offers[2].mode,'rent');
 assert.match(mx.sourceUrl,/locale=MX/);
 assert.equal(decodeTmdbProviders(response,{country:'ES',kind:'tv',id:99}).offers.length,0);
});
test('provider API needs an explicit identity, and failed auth does not become unavailable',async()=>{
 await assert.rejects(()=>getTmdbProviders(0,'tv','MX',token,{fetch:async()=>{throw Error('should not fetch')}}),/candidato válido/);
 await assert.rejects(()=>getTmdbProviders(12,'movie','MX','',{fetch:async()=>{throw Error('should not fetch')}}),/token/i);
 const mock=async url=>({ok:true,json:async()=>({results:{MX:{ads:[{provider_name:'Pluto TV'}]}}})});
 const result=await getTmdbProviders(12,'movie','MX',token,{fetch:mock});
 assert.equal(result.offers[0].mode,'ads');assert.equal(result.offers[0].verified,false);
});
