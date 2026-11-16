import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import cardData from '../../lib/og/card-data.js';
import cacheKey, { TEMPLATE_VERSION } from '../../lib/og/cache-key.js';

const entry = { collection: 'posts', lang: 'en', url: '/posts/one/', title: 'A garden', date: '2026-04-14' };
const site = { url: 'https://garden.example/' };
const definitions = [{ id: 'garden', title: 'Gardens', entries: ['/posts/one/'] }];
const data = cardData(entry, site, definitions);
const sources = () => ({
  templates: { 'templates/retro.js': 'export default function retro() {}\n', 'templates/shared.js': 'const shared = true;\n' },
  fonts: { 'fonts/inter.woff': Buffer.from([0, 1, 2, 255]) },
  versions: { satori: '1.0.0', resvg: '2.0.0' },
  templateVersion: TEMPLATE_VERSION,
});

describe('share card cache', () => {
  it('returns a full stable SHA-256 key', () => {
    expect(cacheKey(data, sources())).toMatch(/^[a-f0-9]{64}$/);
    expect(cacheKey(data, sources())).toBe(cacheKey(data, sources()));
  });

  it.each([
    ['title', () => cardData({ ...entry, title: 'Another garden' }, site, definitions)],
    ['series total', () => cardData(entry, site, [{ ...definitions[0], entries: [entry.url, '/posts/two/'] }])],
    ['style', () => cardData({ ...entry, ogStyle: 'swiss' }, site, definitions)],
    ['parent title', () => cardData({ ...entry, parentTitle: 'A parent' }, site, definitions)],
  ])('regenerates a card when its %s changes', (_, updated) => {
    expect(cacheKey(updated(), sources())).not.toBe(cacheKey(data, sources()));
  });

  it.each([
    ['template', (source) => { source.templates['templates/retro.js'] += '// edit\n'; }],
    ['shared helper', (source) => { source.templates['templates/shared.js'] += '// edit\n'; }],
    ['font', (source) => { source.fonts['fonts/inter.woff'] = Buffer.from([0, 1, 3, 255]); }],
    ['satori', (source) => { source.versions.satori = '1.0.1'; }],
    ['resvg', (source) => { source.versions.resvg = '2.0.1'; }],
    ['manual version', (source) => { source.templateVersion = 'next'; }],
  ])('regenerates a card when its %s changes', (_, change) => {
    const changed = sources();
    change(changed);
    expect(cacheKey(data, changed)).not.toBe(cacheKey(data, sources()));
  });

  it('reuses the card when only topic tags or source file location change', () => {
    const changed = cardData({ ...entry, tags: ['new-topic'], filePath: 'posts/renamed.md' }, site, definitions);
    expect(cacheKey(changed, sources())).toBe(cacheKey(data, sources()));
  });

  it('reuses keys across object order, line endings, Unicode composition and logical path separators', () => {
    const first = sources();
    first.templates = { 'templates/shared.js': 'Café\n', 'templates/retro.js': 'hello\n' };
    const second = sources();
    second.templates = { 'templates\\retro.js': 'hello\r\n', 'templates/shared.js': 'Cafe\u0301\r\n' };
    second.versions = { resvg: '2.0.0', satori: '1.0.0' };
    const reordered = Object.fromEntries(Object.entries(data).reverse());
    expect(cacheKey(reordered, first)).toBe(cacheKey(data, second));
    expect(cacheKey({ ...data, title: 'Café\n' }, first)).toBe(cacheKey({ ...data, title: 'Cafe\u0301\r\n' }, first));
  });

  it('uses the manual default when none is provided', () => {
    const source = sources();
    delete source.templateVersion;
    expect(cacheKey(data, source)).toBe(cacheKey(data, sources()));
  });

  it.each(['/tmp/template.js', 'C:\\templates\\retro.js'])('rejects machine-specific source path %s', (path) => {
    expect(() => cacheKey(data, { ...sources(), templates: { [path]: 'text' } })).toThrow('logical relative filenames');
  });

  it('produces identical keys in UTC and Pacific/Kiritimati for UTC Date values', () => {
    const script = `
      import cardData, { STYLES } from './lib/og/card-data.js';
      import cacheKey from './lib/og/cache-key.js';
      const hashes = STYLES.flatMap(ogStyle => ['en', 'zh'].map(lang => {
        const data = cardData({ collection: 'posts', lang, ogStyle,
          title: 'A garden', date: new Date('2026-04-14T23:30:00Z') }, { url: 'https://garden.example/' });
        return cacheKey(data, { templates: { 'style.js': 'text' },
          fonts: { 'font.woff': Buffer.from([1, 2, 3]) }, versions: { satori: '1', resvg: '2' } });
      }));
      process.stdout.write(JSON.stringify(hashes));
    `;
    const run = (TZ) => execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: new URL('../../', import.meta.url), env: { ...process.env, TZ }, encoding: 'utf8',
    });
    expect(run('UTC')).toBe(run('Pacific/Kiritimati'));
  });
});
