import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG} from '../public/js/catalog.mjs';
import {createDefaultState} from '../public/js/storage.mjs';
import {FOUR_HOURS, shouldRefresh, refreshCatalog} from '../public/js/refresh.mjs';

test('refresh becomes due after four hours and not before', () => {
  assert.equal(shouldRefresh({lastChecked: 0}, 1), true);
  assert.equal(shouldRefresh({lastChecked: 1000}, 1000 + FOUR_HOURS - 1), false);
  assert.equal(shouldRefresh({lastChecked: 1000}, 1000 + FOUR_HOURS), true);
});

test('provider failure preserves catalog, evidence, and personal progress', async () => {
  const state = createDefaultState(CATALOG);
  state.tracking['legacy:verm'] = {seen: 2, availableOverride: 2, totalOverride: 12, status: 'Viendo', favorite: true, changedAt: 100, manualFields: ['availableOverride']};
  const original = state.catalogOfficial['legacy:verm'];
  const result = await refreshCatalog(state, async () => { throw new Error('offline'); }, 200);
  assert.equal(result.status, 'failed');
  assert.equal(result.state.tracking['legacy:verm'].seen, 2);
  assert.equal(result.state.tracking['legacy:verm'].availableOverride, 2);
  assert.deepEqual(result.state.catalogOfficial['legacy:verm'], original);
  assert.equal(result.state.updateMeta.providers.catalog.status, 'failed');
});

test('successful provider updates official catalog without touching tracking', async () => {
  const state = createDefaultState(CATALOG);
  state.tracking['legacy:verm'] = {seen: 2, availableOverride: 2, totalOverride: 12, status: 'Viendo', favorite: true, changedAt: 100, manualFields: ['availableOverride']};
  const result = await refreshCatalog(state, async () => [{...CATALOG.find((entry) => entry.id === 'legacy:verm'), title: 'Updated title'}], 200);
  assert.equal(result.status, 'completed');
  assert.equal(result.state.catalogOfficial['legacy:verm'].title, 'Updated title');
  assert.equal(result.state.tracking['legacy:verm'].seen, 2);
  assert.equal(result.state.updateMeta.providers.catalog.status, 'completed');
});

test('workflow remains static-only and guarded against server artifacts', () => {
  const workflow = readFileSync('.github/workflows/racoon.yml', 'utf8');
  assert.match(workflow, /cp -R public\/.+STATIC_DIR/);
  assert.match(workflow, /functions|schema\.sql/);
  assert.match(workflow, /node --test tests\/\*\.test\.mjs/);
});
