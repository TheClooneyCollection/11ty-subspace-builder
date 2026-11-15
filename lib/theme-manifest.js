import fs from 'node:fs';
import { buildAssetUrl } from './assets/fingerprint.js';

export function themeManifest(themes = [], settings = {}) {
  const shot = (url, name) => {
    if (!url || !url.startsWith('/assets/') || !fs.existsSync(`.${url}`)) throw new Error(`Missing theme home shot: ${name}`);
    return buildAssetUrl(url);
  };
  const entries = {};
  const legacy = {};
  for (const theme of themes) {
    const {bg,ink,accent}=theme.tokens.light || theme.tokens.dark;
    const css = `/assets/css/themes/${theme.id}.css`;
    const visible = !theme.hidden && !theme.retired;
    const shots = {}, paletteShots = {};
    if (visible) {
      for (const scheme of theme.scheme === 'both' ? ['light', 'dark'] : [theme.scheme]) shots[scheme] = shot(theme.shots?.[scheme], `${theme.id}/${scheme}`);
      for (const palette of theme.palettes || []) paletteShots[palette.id] = shot(theme.paletteShots?.[palette.id], `${theme.id}/${palette.id}`);
    }
    const swatches = Object.fromEntries(['light','dark'].filter(s => theme.tokens[s]).map(s => [s, Object.fromEntries(['bg','ink','accent'].map(k => [k,theme.tokens[s][k]]))]));
    entries[theme.id] = {label:theme.label, description:theme.description, shots, paletteShots, swatches, hidden:!!theme.hidden, swatch:{bg,ink,accent}, scheme: theme.scheme, pair: theme.pair, family:theme.family,
      palettes: theme.palettes?.map(p => p.id), retired:theme.retired || false,
      css: fs.existsSync(`.${css}`) ? buildAssetUrl(css) : null, bodyFont:theme.bodyFont};
    for(const old of theme.replaces || []) legacy[typeof old==='string'?old:old.id]={id:theme.id,mode:typeof old==='string'?undefined:old.mode};
  }
  return {defaultStrategy:settings.defaultStrategy === 'fun' ? 'fun' : 'simple', weekdayThemes:settings.weekdayThemes || ['glass','liquid-glass-dark','starship','holo'], weekendThemes:settings.weekendThemes || ['zine','retro-futurist','brutalist'], defaultId:settings.defaultId || themes[0]?.id, defaultMode:settings.defaultMode || 'auto', themes:entries, legacy};
}
