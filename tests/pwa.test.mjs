import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPublishedVersion, activateWaitingWorker, registerPwa} from '../public/js/pwa.mjs';

function response(payload, ok = true) { return {ok, json: async () => payload}; }

test('detects a published version newer than the running version', async () => {
  const result = await checkPublishedVersion({currentVersion: '2.0.0', now: 123, fetch: async (url) => { assert.match(url, /version\.json\?check=123/); return response({version: '2.1.0', changes: ['Nuevo calendario']}); }});
  assert.equal(result.available, true);
  assert.equal(result.version, '2.1.0');
  assert.deepEqual(result.changes, ['Nuevo calendario']);
});

test('same or unreachable version does not offer an update', async () => {
  const same = await checkPublishedVersion({currentVersion: '2.0.0', fetch: async () => response({version: '2.0.0', changes: []})});
  const failed = await checkPublishedVersion({currentVersion: '2.0.0', fetch: async () => { throw new Error('offline'); }});
  assert.equal(same.available, false);
  assert.equal(failed.available, false);
  assert.equal(failed.error, true);
});

test('activation is user-controlled and sends SKIP_WAITING only on request', () => {
  const messages = [];
  const listeners = {};
  const registration = {waiting: {postMessage: (message) => messages.push(message)}};
  const windowLike = {addEventListener: (name, fn) => {listeners[name] = fn;}, location: {reload() {}}};
  assert.equal(activateWaitingWorker(registration, windowLike), true);
  assert.deepEqual(messages, [{type: 'SKIP_WAITING'}]);
  assert.equal(typeof listeners.controllerchange, 'function');
});

test('registers the service worker and exposes a manual version check', async () => {
  const callbacks = [];
  const navigatorLike = {serviceWorker: {register: async () => ({addEventListener() {}})}};
  const windowLike = {addEventListener() {}};
  const controller = await registerPwa({navigator: navigatorLike, window: windowLike, currentVersion: '2.0.0', fetch: async () => response({version: '2.0.1', changes: []}), onUpdate: (info) => callbacks.push(info)});
  const info = await controller.checkNow();
  assert.equal(info.available, true);
  assert.equal(callbacks.length, 2);
});

test('checks the published version when registration starts', async () => {
  let updates = 0;
  await registerPwa({navigator: {serviceWorker: {register: async () => ({addEventListener() {}})}}, window: {addEventListener() {}}, currentVersion: '2.0.0', fetch: async () => response({version: '2.0.1', changes: []}), onUpdate: () => { updates += 1; }});
  assert.equal(updates, 1);
});

test('service worker uses versioned cache and waits for explicit activation', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  assert.match(sw, /SKIP_WAITING/);
  assert.match(sw, /racoon-wizard/);
  assert.match(sw, /\/js\/refresh\.mjs/);
  assert.match(sw, /network-first|networkFirst/i);
  assert.doesNotMatch(sw, /skipWaiting\(\)\);/);
});
