import fs from 'node:fs';
import yaml from 'js-yaml';
import {expect,it} from 'vitest';
import {themeManifest} from '../../lib/theme-manifest.js';
const themes=yaml.load(fs.readFileSync('_data/themes.yaml','utf8'));
it('offers ten v2 themes and preserves hidden v1 tokens during migration',()=>{
 expect(themes.filter(t=>!t.hidden)).toHaveLength(10);
 for(const id of ['sun','default','mint','grape','charcoal','deep-blue','midnight','terminal'])expect(themes.find(t=>t.id===id).hidden).toBe(true);
 const config=themeManifest(themes,{defaultId:'paper'});
 expect(config.legacy.sun.id).toBe('paper');expect(config.legacy.default.id).toBe('swiss');
 expect(config.legacy.charcoal).toEqual({id:'brutalist',mode:'dark'});
 expect(config.legacy.midnight).toEqual({id:'liquid-glass-dark',mode:'dark'});
 expect(config.legacy.terminal).toBeUndefined();expect(config.themes.terminal.retired).toBe(true);
});
