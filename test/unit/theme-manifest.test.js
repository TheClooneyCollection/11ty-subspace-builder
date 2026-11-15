import fs from 'node:fs';
import yaml from 'js-yaml';
import { expect, it } from 'vitest';
import { themeManifest } from '../../lib/theme-manifest.js';
const themes = yaml.load(fs.readFileSync('_data/themes.yaml','utf8'));
it('defaults to Fun with Soft Glass and exposes configured pools', () => {
  expect(themeManifest(themes)).toMatchObject({defaultStrategy:'fun', defaultId:'glass'});
  expect(themeManifest(themes,{defaultStrategy:'simple'}).defaultStrategy).toBe('simple');
  const config = themeManifest(themes,{defaultStrategy:'fun',defaultId:'swiss'});
  expect(config.defaultId).toBe('swiss');
  expect(config.defaultStrategy).toBe('fun');
  expect(config.weekdayThemes).toEqual(['glass','liquid-glass-dark','starship','holo']);
  expect(config.weekendThemes).toEqual(['zine','retro-futurist','brutalist']);
});
it('every reader card has a real shot in its own scheme, including both Liquid Glass palettes', () => {
  const entries=Object.values(themeManifest(themes).themes).filter(t=>!t.hidden&&!t.retired);
  for (const t of entries) {
    expect(t.description).toBeTruthy();
    for (const scheme of t.scheme==='both'?['light','dark']:[t.scheme]) expect(t.shots[scheme]).toContain('.webp');
    for (const palette of t.palettes || []) expect(t.paletteShots[palette]).toContain('.webp');
  }
});
it('fails the build when a required scheme shot is missing instead of substituting another scheme', () => {
  const altered=structuredClone(themes);delete altered.find(t=>t.id==='paper').shots.dark;
  expect(()=>themeManifest(altered)).toThrow('Missing theme home shot: paper/dark');
});
