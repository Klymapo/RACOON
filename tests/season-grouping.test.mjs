import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState,validateState} from '../public/js/storage.mjs';
import {linkSeasonToWork,detachSeason,getMediaProgress} from '../public/js/media.mjs';
import {createFolder,setFolderMembership,foldersForWork} from '../public/js/folders.mjs';
import {createBackup,parseBackup} from '../public/js/backup.mjs';
import {renderSeasonGrouping} from '../public/js/season-ui.mjs';
const entries = [{id:'custom:a',title:'Primera',mediaKind:'season',totalEpisodes:12},{id:'custom:b',title:'Segunda',mediaKind:'season',totalEpisodes:10},{id:'custom:film',title:'Película',mediaKind:'movie'}];
function fixture() { const s=createDefaultState(entries);s.tracking={'custom:a':{seen:7,favorite:true},'custom:b':{seen:3,status:'Viendo'}};return validateState(s); }
test('agrupar conserva progreso independiente e identidad al restaurar',()=>{
 const s=fixture(), id=s.mediaLibrary.catalogLinks['custom:a'].workId;
 const joined=linkSeasonToWork(s,'custom:b',id,2);
 assert.equal(joined.mediaLibrary.catalogLinks['custom:b'].workId,id);
 assert.deepEqual(getMediaProgress(joined,id).seasons.map(x=>x.seen).sort(),[3,7]);
 assert.equal(joined.mediaLibrary.seasons[joined.mediaLibrary.catalogLinks['custom:b'].seasonId].number,2);
 assert.deepEqual(parseBackup(createBackup(joined)).state.mediaLibrary.catalogLinks,joined.mediaLibrary.catalogLinks);
 assert.notEqual(s.mediaLibrary.catalogLinks['custom:b'].workId,id);
 assert.equal(joined.tracking['custom:a'].favorite,true);
});
test('carpetas siguen asignadas al agrupar y separar',()=>{
 let s=fixture();s=createFolder(s,'A',100);s=createFolder(s,'B',101);
 const [a,b]=Object.keys(s.collections.folders),one=s.mediaLibrary.catalogLinks['custom:a'].workId,two=s.mediaLibrary.catalogLinks['custom:b'].workId;
 s=setFolderMembership(s,one,a,true,102);s=setFolderMembership(s,two,b,true,103);
 s=linkSeasonToWork(s,'custom:b',one,2,104);
 assert.deepEqual(foldersForWork(s,one).map(f=>f.name).sort(),['A','B']);
 s=detachSeason(s,'custom:b');const detached=s.mediaLibrary.catalogLinks['custom:b'].workId;
 assert.notEqual(detached,one);
 assert.deepEqual(foldersForWork(s,detached).map(f=>f.name).sort(),['A','B']);
 assert.deepEqual([s.tracking['custom:a'].seen,s.tracking['custom:b'].seen],[7,3]);
 assert.equal(validateState(s).mediaLibrary.catalogLinks['custom:b'].workId,detached);
});
test('películas no se agrupan y temporadas aisladas no se separan',()=>{
 const s=fixture(),id=s.mediaLibrary.catalogLinks['custom:a'].workId;
 assert.throws(()=>linkSeasonToWork(s,'custom:film',id,1),/película/i);
 assert.throws(()=>detachSeason(s,'custom:a'),/agrupación/i);
});
test('ficha escapada muestra acciones explícitas y excluye películas',()=>{
 let s=fixture();s.catalogOfficial['custom:a'].title='<em>Título</em>';s=validateState(s);
 const markup=renderSeasonGrouping(s,'custom:a');
 assert.match(markup,/data-season-work/);assert.match(markup,/data-season-number/);assert.match(markup,/data-season-link/);
 assert.doesNotMatch(markup,/<em>Título<\/em>/);
 assert.equal(renderSeasonGrouping(s,'custom:film'),'');
});
