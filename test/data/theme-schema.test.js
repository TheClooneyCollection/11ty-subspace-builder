import fs from 'node:fs';
import yaml from 'js-yaml';
import { expect, it } from 'vitest';
const themes = yaml.load(fs.readFileSync('_data/themes.yaml','utf8'));
it('defines unique themes with complete scheme tokens and CJK fallbacks', () => {
  expect(new Set(themes.map(t=>t.id)).size).toBe(themes.length);
  for(const theme of themes){
    expect(['light','dark','both']).toContain(theme.scheme);
    for(const scheme of theme.scheme==='both'?['light','dark']:[theme.scheme]){
      for(const key of ['bg','ink','muted','accent','rule','surface']) expect(theme.tokens[scheme][key]).toMatch(/^#[\da-f]{3,8}$/i);
    }
    for(const font of ['body','display','mono']) expect(theme.tokens.font[font]).toContain('PingFang SC');
    expect(Array.isArray(theme.replaces)).toBe(true);
    if(theme.pair){const pair=themes.find(t=>t.id===theme.pair);expect(pair?.pair).toBe(theme.id);expect(pair?.family).toBe(theme.family);}
    for(const palette of theme.palettes||[]) {expect(palette.id).toBeTruthy();expect(palette.tokens).toBeTruthy();}
  }
});
