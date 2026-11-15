import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import yaml from 'js-yaml';

const themes = yaml.load(fs.readFileSync('_data/themes.yaml', 'utf8'));
const source = fs.readFileSync('_includes/layouts/partials/theme-init-script.njk', 'utf8')
  .replace(/<\/?script>/g, '').replace('{{ themes | dump | safe }}', JSON.stringify(themes));

describe('pre-paint theme scheme', () => {
  for (const theme of themes) {
    it(`exposes ${theme.scheme} for stored ${theme.id}`, () => {
      const root = { dataset: { defaultTheme: 'sun' }, classList: { add() {}, remove() {} } };
      vm.runInNewContext(source, {
        document: { documentElement: root }, window: {},
        localStorage: { getItem: key => key === 'theme' ? theme.id : null },
      });
      expect(root.dataset.theme).toBe(theme.id);
      expect(root.dataset.scheme).toBe(theme.scheme);
    });
  }
});
