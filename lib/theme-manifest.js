import fs from 'node:fs';
import { buildAssetUrl } from './assets/fingerprint.js';

export function themeManifest(themes = [], settings = {}) {
  const entries = {};
  const legacy = {};
  for (const theme of themes) {
    const {bg,ink,accent}=theme.tokens.light || theme.tokens.dark;
    const css = `/assets/css/themes/${theme.id}.css`;
    entries[theme.id] = {label:theme.label, hidden:!!theme.hidden, swatch:{bg,ink,accent}, scheme: theme.scheme, pair: theme.pair, family:theme.family,
      palettes: theme.palettes?.map(p => p.id), retired:theme.retired || false,
      css: fs.existsSync(`.${css}`) ? buildAssetUrl(css) : null, bodyFont:theme.bodyFont};
    for(const old of theme.replaces || []) legacy[typeof old==='string'?old:old.id]={id:theme.id,mode:typeof old==='string'?undefined:old.mode};
  }
  return {defaultId:settings.defaultId || themes[0]?.id, defaultMode:settings.defaultMode || 'auto', themes:entries, legacy};
}
