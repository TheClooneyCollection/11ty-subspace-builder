import { expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync('assets/js/theme-init.js', 'utf8');
const themes = Object.fromEntries(['paper', 'glass', 'starship', 'zine', 'retro-futurist', 'brutalist'].map(id => [id, {scheme: 'both'}]));
themes.holo = {scheme: 'dark'};
themes['liquid-glass-light'] = {scheme: 'light', pair: 'liquid-glass-dark'};
themes['liquid-glass-dark'] = {scheme: 'dark', pair: 'liquid-glass-light', palettes: ['aurora', 'indigo']};
function visit({storage = {}, day = 1, random = () => 0, dark = false, strategy = 'fun', search = '', blocked = false, reduce = false, transitions = false} = {}) {
  const root = {dataset: {}};
  const events = [], writes = [], fades = [];
  const media = {matches: dark, addEventListener(_, callback) {this.change = callback;}};
  const config = {themes, defaultId: 'paper', defaultMode: 'auto', defaultStrategy: strategy,
    weekdayThemes: ['glass', 'liquid-glass-dark', 'starship', 'holo'], weekendThemes: ['zine', 'retro-futurist', 'brutalist'], legacy: {sun: {id: 'paper'}, charcoal: {id: 'brutalist', mode: 'dark'}}};
  const context = {URLSearchParams, Date: class {getDay() {return day;}}, Math: {random, floor: Math.floor},
    CustomEvent: class {constructor(type, {detail}) {this.type = type; this.detail = detail;}},
    location: {search, pathname: '/', hash: ''}, history: {replaceState() {}}, window: {matchMedia: query => query.includes('reduced-motion') ? {matches: reduce} : media},
    document: {documentElement: root, getElementById: id => id === 'theme-config' ? {textContent: JSON.stringify(config)} : null,
      dispatchEvent: event => events.push(event), write: html => writes.push(html),
      ...(transitions ? {startViewTransition: update => {fades.push(root.dataset.theme); update();}} : {})},
    localStorage: {getItem(key) {if (blocked) throw Error('blocked'); return storage[key];}, setItem(key, value) {if (blocked) throw Error('blocked'); storage[key] = value;}, removeItem(key) {if (blocked) throw Error('blocked'); delete storage[key];}}};
  vm.runInNewContext(source, context);
  return {api: context.window.siteTheme, root, storage, media, events, writes, fades};
}
it('first roll is retained across visits without making the default manual', () => {
  const storage = {};
  expect(visit({storage, random: () => 0.6}).api.state.requestedTheme).toBe('starship');
  const next = visit({storage, random: () => {throw Error('must retain roll');}});
  expect(next.api.state).toMatchObject({requestedTheme: 'starship', manual: false});
  expect(storage.theme).toBeUndefined();
});
it('weekday/weekend resolves using the reader local day', () => {
  const storage = {};
  visit({storage});
  for (const day of [0, 6]) expect(visit({storage, day}).api.state.theme).toBe('zine');
  for (const day of [1, 2, 3, 4, 5]) expect(visit({storage, day}).api.state.theme).toBe('glass');
});
it('simple uses the configured theme without rolling', () => {
  expect(visit({strategy: 'simple', random: () => {throw Error('no roll');}}).api.state).toMatchObject({theme: 'paper', manual: false});
});
it('manual wins over the day and clear restores defaults while retaining rolls and palette', () => {
  const storage = {};
  const {api} = visit({storage, dark: true});
  api.apply('liquid-glass-dark', 'dark', 'indigo', true);
  expect(visit({storage, day: 0}).api.state).toMatchObject({theme: 'liquid-glass-dark', palette: 'indigo', manual: true});
  const rolls = [storage.themeRollWeekday, storage.themeRollWeekend];
  api.useDefault();
  expect(api.state).toMatchObject({theme: 'glass', manual: false});
  expect(storage.theme).toBeUndefined();
  expect(storage.themePalette).toBe('indigo');
  expect([storage.themeRollWeekday, storage.themeRollWeekend]).toEqual(rolls);
  api.apply('liquid-glass-dark');
  expect(api.state.palette).toBe('indigo');
});
it('paired mode returns from Halo light partner and follows system changes', () => {
  const {api, media} = visit({storage: {theme: 'holo'}, dark: true});
  api.setMode('light');
  expect(api.state).toMatchObject({theme: 'starship', requestedTheme: 'holo', scheme: 'light'});
  api.setMode('dark');
  expect(api.state.theme).toBe('holo');
  api.setMode('auto'); media.matches = false; media.change();
  expect(api.state.theme).toBe('starship');
  media.matches = true; media.change();
  expect(api.state.theme).toBe('holo');
});
it('paired mode keeps Liquid Glass Indigo through light and a reload', () => {
  const storage = {};
  const {api} = visit({storage});
  api.apply('liquid-glass-dark', 'dark', 'indigo', true);
  api.setMode('light');
  expect(api.state).toMatchObject({theme: 'liquid-glass-light', requestedTheme: 'liquid-glass-dark', palette: 'indigo'});
  const next = visit({storage}); next.api.setMode('dark');
  expect(next.api.state).toMatchObject({theme: 'liquid-glass-dark', palette: 'indigo'});
});
it('mode alone never commits a default or a preview; cancel keeps the new mode', () => {
  const {api, storage} = visit();
  api.apply('holo', 'dark'); api.setMode('light'); api.cancelPreview();
  expect(api.state).toMatchObject({theme: 'glass', mode: 'light', manual: false});
  expect(storage.theme).toBeUndefined(); expect(storage.themeMode).toBe('light');
});
it('preview cancellation restores the committed palette', () => {
  const {api} = visit({storage: {theme: 'liquid-glass-dark', themeMode: 'dark', themePalette: 'indigo'}});
  api.apply('liquid-glass-dark', 'dark', 'aurora'); api.cancelPreview();
  expect(api.state.palette).toBe('indigo');
});
it('legacy manual choices migrate but terminal and legacy auto follow the default', () => {
  const migrated = visit({storage: {theme: 'charcoal'}});
  expect(migrated.api.state).toMatchObject({theme: 'brutalist', mode: 'dark', manual: true});
  expect(migrated.storage.theme).toBe('brutalist');
  for (const storage of [{theme: 'terminal'}, {theme: 'missing'}, {themePreference: 'auto', theme: 'paper'}]) {
    expect(visit({storage}).api.state).toMatchObject({theme: 'glass', manual: false});
  }
});
it('URL previews do not store defaults or choices', () => {
  const storage = {};
  const {api} = visit({storage, search: '?preview=1&theme=holo&mode=dark'});
  expect(api.state).toMatchObject({theme: 'holo', preview: true});
  expect(storage).toEqual({});
});
it('unavailable storage still allows defaults and manual choices within the visit', () => {
  const {api} = visit({blocked: true}); api.apply('paper', 'dark', '', true); api.useDefault();
  expect(api.state).toMatchObject({theme: 'glass', mode: 'dark', manual: false});
});
it('a switch only flips attributes and emits effective state', () => {
  const {api, root, writes, events} = visit();
  api.apply('paper', 'dark');
  expect(writes).toEqual([]);
  expect(root.dataset).toMatchObject({theme: 'paper', scheme: 'dark'});
  expect(events.at(-1).detail).toMatchObject({theme: 'paper', scheme: 'dark', manual: false});
});
it('switches crossfade where supported, but not on first paint or with reduced motion', () => {
  const motion = visit({transitions: true});
  expect(motion.fades).toEqual([]);
  motion.api.apply('paper', 'dark');
  expect(motion.fades).toEqual(['glass']);
  expect(motion.root.dataset.theme).toBe('paper');
  const calm = visit({transitions: true, reduce: true});
  calm.api.apply('paper', 'dark');
  expect(calm.fades).toEqual([]);
  expect(calm.root.dataset.theme).toBe('paper');
});

it('legacy auto stays a default after setting mode and revisiting', () => {
  const storage = {themePreference: 'auto', theme: 'paper'};
  visit({storage}).api.setMode('dark');
  expect(visit({storage}).api.state).toMatchObject({theme: 'glass', mode: 'dark', manual: false});
});
