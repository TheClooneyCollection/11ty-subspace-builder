import { describe, it, expect } from 'vitest';
import { generateCards, outputFilename } from '../../lib/og/generate.js';
import { showcaseData } from '../../lib/og/showcase.js';

const entry = (extra = {}) => ({ key: '/posts/first', url: '/posts/first/',
  collection: 'posts', title: 'A useful first step', date: '2026-04-14', lang: 'en', ...extra });
function fixture() {
  const files = new Map();
  const rendered = [];
  const warnings = [];
  const sources = { templates: { 'retro.js': 'template' }, fonts: { 'body.woff': Buffer.from('font') }, versions: { satori: '1', resvg: '1' } };
  const capabilities = {
    sourcesFor: async () => sources,
    glyphsFor: async () => [],
    warn: (message) => warnings.push(message),
    renderCard: async (data) => { rendered.push(data); return Buffer.from(data.title); },
    exists: async (file) => files.has(file),
    save: async (file, data) => { files.set(file, data); },
  };
  const run = (extra = {}) => generateCards({ entries: [entry()], site: { url: 'https://example.test' }, series: [], ...extra }, capabilities);
  return { files, rendered, sources, run, capabilities, warnings };
}

describe('card generation workflow', () => {
  it('renders once, reuses an unchanged image, and restores a missing image', async () => {
    const f = fixture();
    const first = await f.run();
    expect(first.rendered).toBe(1);
    expect(first.images['/posts/first']).toBe('/assets/og/posts--first.png');
    expect((await f.run({ manifest: first.manifest })).rendered).toBe(0);
    f.files.clear();
    expect((await f.run({ manifest: first.manifest })).rendered).toBe(1);
  });
  it('warns about missing glyphs with the source page on both fresh and cached cards', async () => {
    const f = fixture();
    f.capabilities.glyphsFor = async () => [{ character: '🦄', codePoint: 'U+1F984' }];
    const first = await f.run({ entries: [entry({ filePath: 'posts/first.md' })] });
    expect(first.rendered).toBe(1);
    expect(f.warnings).toEqual(['[og] Missing glyphs for posts/first.md (retro): "🦄" U+1F984']);
    const cached = await f.run({ entries: [entry({ filePath: 'posts/first.md' })], manifest: first.manifest });
    expect(cached.rendered).toBe(0);
    expect(f.warnings).toHaveLength(2);
  });
  it('a source change invalidates the saved image without a manual version bump', async () => {
    const f = fixture(); const first = await f.run();
    f.sources.templates['retro.js'] = 'new template';
    expect((await f.run({ manifest: first.manifest })).rendered).toBe(1);
  });
  it('adding a series entry regenerates existing member cards with the new total', async () => {
    const f = fixture();
    const series = [{ id: 'guide', title: 'Guide', entries: ['/posts/first/'] }];
    const first = await f.run({ series });
    series[0].entries.push('/posts/next/');
    const next = await f.run({ series, manifest: first.manifest });
    expect(next.rendered).toBe(1);
    expect(f.rendered.at(-1).series.progress).toBe('Part 1 of 2');
  });
  it('unrelated topic tags do not regenerate the image; force does', async () => {
    const f = fixture(); const first = await f.run();
    expect((await f.run({ manifest: first.manifest, entries: [entry({ tags: ['unrelated'] })] })).rendered).toBe(0);
    expect((await f.run({ manifest: first.manifest, force: true })).rendered).toBe(1);
  });
  it('English and Chinese cards have separate manifest identities and images', async () => {
    const f = fixture();
    const result = await f.run({ entries: [entry(), entry({ key: 'zh:posts/first', lang: 'zh', title: '第一步', url: '/zh/posts/first/' })] });
    expect(result.cards).toHaveLength(2);
    expect(new Set(Object.values(result.images)).size).toBe(2);
    expect(f.rendered.map((d) => d.kind)).toEqual(['Post', '文章']);
  });
  it('validates every style before any output and validates empty-site configuration', async () => {
    const f = fixture();
    await expect(f.run({ entries: [entry(), entry({ ogStyle: 'typo' })] })).rejects.toThrow(/Unknown OG style.*Allowed styles/);
    expect(f.files.size).toBe(0);
    await expect(f.run({ site: { ogImage: { style: 'typo' } }, entries: [] })).rejects.toThrow('Unknown OG style');
  });
  it('render errors fail the build instead of saving a misleading manifest', async () => {
    await expect(generateCards({ entries: [entry()], site: {}, series: [] }, {
      sourcesFor: async () => ({ templates: {}, fonts: {}, versions: {} }),
      glyphsFor: async () => [],
      warn: () => { throw new Error('unexpected glyph warning'); },
      exists: async () => false,
      renderCard: async () => { throw new Error('renderer unavailable'); },
      save: async () => { throw new Error('must not save'); },
    })).rejects.toThrow('renderer unavailable');
  });
  it('makes the fixed comparison samples available only outside production', () => {
    expect(showcaseData(true)).toEqual([]);
    const dev = showcaseData(false);
    expect(dev).toHaveLength(48);
    expect(new Set(dev.map((d) => d.style)).size).toBe(8);
    expect(dev.every((d) => d.data.width === 1200 && d.data.height === 630)).toBe(true);
  });
  it('preserves existing output names and normalizes path separators', () => {
    expect(outputFilename('/posts/subspace/example')).toBe('posts--subspace--example.png');
    expect(outputFilename('/timeline')).toBe('timeline.png');
    expect(outputFilename('zh:posts/example')).toBe('zh-posts--example.png');
  });
});
