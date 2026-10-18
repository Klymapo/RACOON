import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../public/js/app.mjs';
import {createDefaultState, STATE_KEY} from '../public/js/storage.mjs';

function fixture(view = 'home') {
  const values = new Map();
  const initial = createDefaultState();
  initial.preferences.view = view;
  initial.tracking['legacy:verm'] = {seen: 3, favorite: true, status: 'Viendo'};
  values.set(STATE_KEY, JSON.stringify(initial));
  const storage = {getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  const handlers = {};
  const tabs = ['home', 'calendar', 'progress', 'add', 'backups'].map((view) => ({
    dataset: {view}, attributes: {}, classList: {toggle() {}},
    setAttribute(key, value) { this.attributes[key] = value; },
    focus() { this.focused = true; }
  }));
  const document = {
    getElementById: () => null,
    querySelectorAll: (selector) => selector === '[data-view]' ? tabs : [],
    addEventListener: (name, handler) => { handlers[name] = handler; }
  };
  const app = createApp({document, storage, now: () => 1000});
  return {app, tabs, handlers, storage};
}

test('an invalid saved view opens Home instead of leaving every panel hidden', () => {
  assert.equal(fixture('unknown').app.getView(), 'home');
});

test('only the selected tab participates in keyboard tab order', () => {
  const {app, tabs} = fixture('progress');
  assert.deepEqual(tabs.map((tab) => tab.attributes.tabindex), ['-1', '-1', '0', '-1', '-1']);
  app.selectView('backups');
  assert.equal(tabs[4].attributes['aria-selected'], 'true');
  assert.equal(tabs[4].attributes.tabindex, '0');
});

test('arrow and Home/End keys select tabs, focus them and preserve personal progress', () => {
  const {app, tabs, handlers, storage} = fixture();
  const key = (index, value) => handlers.keydown({
    key: value, target: {closest: () => tabs[index]}, preventDefault() {}
  });
  key(0, 'ArrowLeft');
  assert.equal(app.getView(), 'backups');
  assert.equal(tabs[4].focused, true);
  key(4, 'Home');
  assert.equal(app.getView(), 'home');
  key(0, 'ArrowRight');
  assert.equal(app.getView(), 'calendar');
  key(1, 'End');
  assert.equal(app.getView(), 'backups');
  const saved = JSON.parse(storage.getItem(STATE_KEY));
  assert.equal(saved.tracking['legacy:verm'].seen, 3);
  assert.equal(saved.tracking['legacy:verm'].favorite, true);
});
