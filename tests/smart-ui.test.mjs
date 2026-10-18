import test from 'node:test';
import assert from 'node:assert/strict';
import {createDefaultState} from '../public/js/storage.mjs';
import {saveSmartCollection,trashSmartCollection,listSmartCollections} from '../public/js/smart-collections.mjs';
import * as ui from '../public/js/smart-ui.mjs';
test('rule names and text are escaped, with explicit edit/trash and restoration controls',()=>{
 let state=createDefaultState([{id:'custom:a',title:'A',mediaKind:'movie'}]);
 state=saveSmartCollection(state,null,'<img src=x onerror=alert(1)>',{query:'"<script>',format:'movie'},100);
 const markup=ui.renderSmartCollectionRows(state);
 assert.doesNotMatch(markup,/<img|<script>/);assert.match(markup,/&lt;img/);
 assert.match(markup,/data-smart-action="edit"/);assert.match(markup,/data-smart-action="trash"/);
 state=trashSmartCollection(state,listSmartCollections(state)[0].id,200);
 assert.match(ui.renderSmartCollectionRows(state),/data-smart-action="restore"/);
});
test('counts measure matching fichas and unknown ratings are excluded',()=>{
 let state=createDefaultState([{id:'custom:a',title:'A',mediaKind:'movie'},{id:'custom:b',title:'B',mediaKind:'movie'}]);
 state.tracking['custom:a']={rating:0};
 state=saveSmartCollection(state,null,'Valoradas',{minRating:0},100);
 assert.match(ui.renderSmartCollectionRows(state),/1 ficha/);
});
