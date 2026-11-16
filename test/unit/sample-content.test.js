import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sampleContentEnabled, isSampleSource, sampleContentUrls, reconcileSampleOutput } from '../../lib/sample-content.js';
import { computeContentSeries, getVisibleSeriesList, resolveSeriesEntries } from '../../lib/series.js';
import { collectEntries } from '../../lib/og/collect.js';
import { showcaseData } from '../../lib/og/showcase.js';
import { validateTimelineEntryDateTimeQuotes } from '../../lib/timeline/validate.js';
import { generateOgImages } from '../../scripts/generate-og-images.js';

const roots = [];
function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sample-content-'));
  roots.push(root);
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  return root;
}
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
const note = '---\ntitle: Example\ndate: "2026-04-14"\ntime: "12:00"\n---\nHello';
const files = {
  'posts/samples/future/nested.md': note,
  'notes/samples/hidden/future.md': note,
  'timeline/samples/nested/event.md': note,
  'posts/real.md': note,
};

describe('sample content switch', () => {
  it('defaults on and identifies only the reserved namespaces', () => {
    expect(sampleContentEnabled()).toBe(true);
    expect(sampleContentEnabled({ sampleContent: false })).toBe(false);
    expect(isSampleSource('./posts/samples/future/example.md')).toBe(true);
    expect(isSampleSource('posts/samples-other/example.md')).toBe(false);
  });

  it('excludes future nested and hidden samples while retaining genuine missing refs', () => {
    const root = fixture(files);
    const options = { root, site: { sampleContent: false } };
    expect([...sampleContentUrls(root)]).toEqual(expect.arrayContaining([
      '/posts/nested/', '/notes/hidden/future/', '/timeline/event/',
    ]));
    const mixed = { id: 'mixed', entries: ['/posts/nested/', '/notes/hidden/future/', '/posts/real/', '/posts/missing/'] };
    const definitions = [mixed, { id: 'samples', entries: ['/posts/nested/'] }];
    expect(getVisibleSeriesList(definitions, 'production', options)).toEqual([
      { id: 'mixed', entries: ['/posts/real/', '/posts/missing/'] },
    ]);
    const real = { url: '/posts/real/', data: { draft: true } };
    expect(resolveSeriesEntries(mixed, { posts: [real] }, options)).toEqual({
      entries: [real], missingUrls: ['/posts/missing/'], duplicateUrls: [], draftUrls: ['/posts/real/'],
    });
    expect(computeContentSeries({ ...options, series: definitions, page: { url: '/posts/real/' } })[0])
      .toMatchObject({ position: 1, total: 2 });
    expect(getVisibleSeriesList(definitions, 'development', { root })).toEqual(definitions);
  });

  it('uses inherited flat permalinks for both inventory and OG collection', async () => {
    const root = fixture({ ...files,
      'posts/posts.json': JSON.stringify({ permalink: '/posts/{{ page.fileSlug }}/' }),
      'notes/samples/hidden/hidden.json': JSON.stringify({ hidden: true, permalink: '/notes/hidden/{{ page.fileSlug }}/' }),
    });
    expect(sampleContentUrls(root).has('/posts/nested/')).toBe(true);
    const enabled = await collectEntries(root, {});
    expect(enabled.find((entry) => entry.slug === 'future').url).toBe('/notes/hidden/future/');
    for (const production of [false, true]) {
      const disabled = await collectEntries(root, { sampleContent: false }, { production });
      expect(disabled.map((entry) => entry.url)).toEqual(['/posts/real/']);
      expect(showcaseData(production, { sampleContent: false })).toEqual([]);
    }
    expect(showcaseData(false).length).toBeGreaterThan(0);
  });

  it('validates nested timeline entries but skips excluded samples', () => {
    const root = fixture({ 'timeline/samples/nested/bad.md': '---\ndate: 2026-04-14\ntime: 12:00\n---', 'timeline/real/good.md': note });
    expect(() => validateTimelineEntryDateTimeQuotes(path.join(root, 'timeline'))).toThrow('must be quoted');
    expect(() => validateTimelineEntryDateTimeQuotes(path.join(root, 'timeline'), { sampleContent: false })).not.toThrow();
    fs.writeFileSync(path.join(root, 'timeline/real/good.md'), '---\ndate: 2026-04-14\n---');
    expect(() => validateTimelineEntryDateTimeQuotes(path.join(root, 'timeline'), { sampleContent: false })).toThrow('must be quoted');
  });

  it('retires vanished generated archives on output reuse, keeping real pages and unrelated files', () => {
    const root = fixture({ '_site/tags/sample/index.html': 'sample tag', '_site/posts/real/index.html': 'real',
      '_site/custom.html': 'unrelated', '_site/assets/custom.png': 'unrelated asset' });
    reconcileSampleOutput({ root, results: [
      { outputPath: '_site/tags/sample/index.html' }, { outputPath: '_site/posts/real/index.html' },
    ] });
    reconcileSampleOutput({ root, site: { sampleContent: false }, results: [{ outputPath: '_site/posts/real/index.html' }] });
    expect(fs.existsSync(path.join(root, '_site/tags/sample/index.html'))).toBe(false);
    expect(fs.existsSync(path.join(root, '_site/posts/real/index.html'))).toBe(true);
    expect(fs.existsSync(path.join(root, '_site/custom.html'))).toBe(true);
    expect(fs.existsSync(path.join(root, '_site/assets/custom.png'))).toBe(true);
  });

  it('removes stale generated sample PNGs on reuse and preserves unrelated output', async () => {
    const root = fixture({ '_data/site.yaml': 'sampleContent: false',
      'posts/samples/demo.md': note,
      '_data/ogImages.json': JSON.stringify({ '/posts/samples/demo': '/assets/og/posts--samples--demo.png' }),
      'assets/og/posts--samples--demo.png': 'old sample',
      'assets/og/custom.png': 'unrelated', 'assets/og/showcase/demo.png': 'old showcase',
    });
    const result = await generateOgImages({ root, production: false });
    expect(result.cards).toEqual([]);
    expect(result.showcaseRendered).toBe(0);
    expect(fs.existsSync(path.join(root, 'assets/og/posts--samples--demo.png'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'assets/og/showcase'))).toBe(false);
    expect(fs.readFileSync(path.join(root, 'assets/og/custom.png'), 'utf8')).toBe('unrelated');
  });
});
