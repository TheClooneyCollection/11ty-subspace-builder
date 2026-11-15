import fs from 'node:fs';
import { buildAssetUrl } from './assets/fingerprint.js';
import { themeBundle } from './theme-bundle.js';

export function themeManifest(themes = [], settings = {}) {
  const shot = (url, name) => {
    if (!url || !url.startsWith('/assets/') || !fs.existsSync(`.${url}`)) throw new Error(`Missing theme home shot: ${name}`);
    return buildAssetUrl(url);
  };
  const entries = {};
  const legacy = {};
  for (const theme of themes) {
    const {bg,ink,accent}=theme.tokens.light || theme.tokens.dark;
    const visible = !theme.hidden && !theme.retired;
    const shots = {}, paletteShots = {};
    if (visible) {
      for (const scheme of theme.scheme === 'both' ? ['light', 'dark'] : [theme.scheme]) shots[scheme] = shot(theme.shots?.[scheme], `${theme.id}/${scheme}`);
      for (const palette of theme.palettes || []) paletteShots[palette.id] = shot(theme.paletteShots?.[palette.id], `${theme.id}/${palette.id}`);
    }
    const swatches = Object.fromEntries(['light','dark'].filter(s => theme.tokens[s]).map(s => [s, Object.fromEntries(['bg','ink','accent'].map(k => [k,theme.tokens[s][k]]))]));
    entries[theme.id] = {label:theme.label, description:theme.description, shots, paletteShots, swatches, hidden:!!theme.hidden, swatch:{bg,ink,accent}, scheme: theme.scheme, pair: theme.pair, family:theme.family,
      palettes: theme.palettes?.map(p => p.id), retired:theme.retired || false, bodyFont:theme.bodyFont};
    for(const old of theme.replaces || []) legacy[typeof old==='string'?old:old.id]={id:theme.id,mode:typeof old==='string'?undefined:old.mode};
  }
  return {css:themeBundle(themes), defaultStrategy:settings.defaultStrategy === 'simple' ? 'simple' : 'fun', weekdayThemes:settings.weekdayThemes || ['glass','liquid-glass-dark','starship','holo'], weekendThemes:settings.weekendThemes || ['zine','retro-futurist','brutalist'], defaultId:settings.defaultId || (themes.some(theme => theme.id === 'glass') ? 'glass' : themes[0]?.id), defaultMode:settings.defaultMode || 'auto', themes:entries, legacy};
}
