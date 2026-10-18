import test from 'node:test';
import assert from 'node:assert/strict';
import * as smart from '../public/js/smart-collections.mjs';
import {createDefaultState,validateState} from '../public/js/storage.mjs';
import {createBackup,parseBackup,mergeBackup} from '../public/js/backup.mjs';
import {filterProgressEntries,applyTrackingPatch} from '../public/js/app.mjs';
const entries=[{id:'custom:a',title:'El dragón azul',mediaKind:'season',genres:['Fantasía'],availableEpisodes:5},{id:'custom:b',title:'Dragón rojo',mediaKind:'movie',genres:['Fantasía']},{id:'custom:c',title:'Otra historia',mediaKind:'movie',genres:['Drama']}];
function sample(){let s=createDefaultState(entries);s.tracking={'custom:a':{seen:2,status:'Viendo',favorite:true,rating:8},'custom:b':{status:'Pendiente',favorite:true,rating:0},'custom:c':{status:'Terminada',favorite:false}};return validateState(s);}
const first=s=>smart.listSmartCollections(s)[0];
test('saved rules combine with AND and recalculate as progress changes',()=>{
 let s=sample();const originalState=s,original=JSON.stringify(s);
 s=smart.saveSmartCollection(s,null,'Mis dragones',{query:'DRAGON',format:'series',status:'Viendo',favorite:'yes',genre:'fantasia',minRating:8},100);
 const id=first(s).id;
 assert.deepEqual(filterProgressEntries([],s,{folder:id}).map(x=>x.entry.id),['custom:a']);
 s=applyTrackingPatch(s,'custom:a',{favorite:false},101);
 assert.equal(filterProgressEntries([],s,{folder:id}).length,0);
 assert.equal(JSON.stringify(originalState),original);
});
test('unknown ratings and genres never become zero or an invented match',()=>{
 let s=smart.saveSmartCollection(sample(),null,'Con nota',{format:'movie',minRating:0},100);
 assert.deepEqual(filterProgressEntries([],s,{folder:first(s).id}).map(x=>x.entry.id),['custom:b']);
 assert.equal(smart.matchesSmartRules({genres:[]},{},{genre:'Drama'}),false);
 assert.equal(smart.matchesSmartRules(entries[1],{rating:0},{minRating:0}),true);
 assert.equal(smart.matchesSmartRules(entries[2],{},{minRating:0}),false);
});
test('smart selection combines with library search and favorites without assigning folders',()=>{
 const s=smart.saveSmartCollection(sample(),null,'Películas',{format:'movie'},100),id=first(s).id;
 assert.deepEqual(filterProgressEntries([],s,{folder:id,query:'rojo',filter:'favorites'}).map(x=>x.entry.id),['custom:b']);
 assert.equal(filterProgressEntries([],s,{folder:id,filter:'finished'})[0].entry.id,'custom:c');
 assert.deepEqual(s.collections.memberships,{});
});
test('edit preserves identity, progress and the previous input',()=>{
 const s=smart.saveSmartCollection(sample(),null,'Una',{favorite:'yes'},100),id=first(s).id;
 const changed=smart.saveSmartCollection(s,id,'Otra',{status:'Terminada'},200);
 assert.equal(first(changed).id,id);assert.equal(first(changed).name,'Otra');assert.equal(first(s).name,'Una');
 assert.deepEqual(changed.tracking,s.tracking);assert.deepEqual(changed.mediaLibrary,s.mediaLibrary);
});
test('duplicate names, malformed rules and unknown criteria are rejected',()=>{
 const s=smart.saveSmartCollection(sample(),null,'  Con papá ',{},100);
 assert.throws(()=>smart.saveSmartCollection(s,null,'CON PAPÁ',{},200),/existe/i);
 for(const rules of [{status:'Vista'},{format:'alien'},{favorite:true},{minRating:11},{minRating:'8'},{genre:[]},{unknown:true}])assert.throws(()=>smart.saveSmartCollection(s,null,'Nueva',rules,200));
 assert.throws(()=>smart.saveSmartCollection(s,null,' ',{},200),/nombre/i);
 assert.throws(()=>smart.saveSmartCollection(s,'smart:missing','No',{},200));
});
test('trash and restoration retain rules and do not remove works',()=>{
 const s=smart.saveSmartCollection(sample(),null,'Terminadas',{status:'Terminada'},100),id=first(s).id;
 const trashed=smart.trashSmartCollection(s,id,200);
 assert.equal(smart.listSmartCollections(trashed).length,0);assert.equal(smart.listSmartCollections(trashed,true).length,1);
 const restored=smart.restoreSmartCollection(trashed,id,300);
 assert.equal(first(restored).id,id);assert.deepEqual(restored.tracking,s.tracking);
 assert.deepEqual(restored.catalogOfficial,s.catalogOfficial);
});
test('JSON preserves rules and old backups cannot revive a trashed collection',()=>{
 const s=smart.saveSmartCollection(sample(),null,'Favoritas',{favorite:'yes'},100),id=first(s).id;
 const backup=createBackup(s),restored=parseBackup(backup).state;
 assert.deepEqual(restored.smartCollections,s.smartCollections);
 const trashed=smart.trashSmartCollection(s,id,200),merged=mergeBackup(trashed,backup);
 assert.equal(smart.listSmartCollections(merged).length,0);
 assert.equal(smart.listSmartCollections(merged,true)[0].id,id);
 const edited=smart.saveSmartCollection(s,id,'Películas',{format:'movie'},300);
 assert.equal(first(mergeBackup(edited,backup)).name,'Películas');
 assert.equal(first(mergeBackup(s,createBackup(edited))).name,'Películas');
});
test('legacy states default to no smart collections and merging preserves local rules',()=>{
 const old=sample();delete old.smartCollections;
 assert.deepEqual(smart.listSmartCollections(validateState(old)),[]);
 const current=smart.saveSmartCollection(sample(),null,'Favoritas',{favorite:'yes'},100);
 assert.equal(first(mergeBackup(current,createBackup(old))).name,'Favoritas');
});
test('invalid saved rules are excluded rather than broadened to the whole library',()=>{
 const clean=smart.normalizeSmartCollections({version:1,items:{'smart:bad':{name:'Mala',rules:{minRating:-1}},'smart:future':{name:'Futura',rules:{unknown:'yes'}},'smart:missing':{name:'Sin reglas'}}});
 assert.equal(Object.keys(clean.items).length,0);
 assert.equal(smart.matchesSmartRules(entries[0],{},{status:'bogus'}),false);
});
test('restoring refuses an active duplicate name without losing the trashed rule',()=>{
 let s=smart.saveSmartCollection(sample(),null,'Una',{},100);const id=first(s).id;
 s=smart.trashSmartCollection(s,id,200);s=smart.saveSmartCollection(s,null,'Una',{favorite:'yes'},300);
 assert.throws(()=>smart.restoreSmartCollection(s,id,400),/existe/i);
 assert.equal(smart.listSmartCollections(s,true)[0].id,id);
});
test('backup preview rejects malformed smart rules rather than silently losing them',()=>{
 const backup=createBackup(sample());
 backup.smartCollections.items['smart:broken']={id:'smart:broken',name:'Regla dañada',rules:{status:'bogus'}};
 const preview=parseBackup(backup);
 assert.equal(preview.valid,false);assert.equal(preview.invalidRecords,1);
});
