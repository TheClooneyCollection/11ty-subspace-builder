import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { collectEntries, resolveParents } from '../../lib/og/collect.js';

const dirs = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'og-collect-')); dirs.push(root);
  const put = async (name, content) => { const target = path.join(root, name); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); };
  await put('posts/samples/samples.json', '{"permalink":"/posts/{{ page.fileSlug }}/"}');
  await put('posts/samples/first.md', '---\ntitle: First\ndate: 2026-04-14\n---\nA small beginning.');
  await put('posts/old-draft.md', '---\ntitle: Old draft\ndraft: true\n---\nStill rendered by the starter.');
  await put('posts/samples/draft-og-card-styles.md', '---\ntitle: Comparison\ndraft: true\n---\nSamples.');
  await put('timeline/root.md', '---\ntitle: Toolkit\n---\nRoot.');
  await put('timeline/child.md', '---\ntitle: "fix: A repair"\nparent: /timeline/root/\ntags: [shipped]\n---\nChild.');
  await put('zh/posts/first.md', '---\ntitle: 第一步\n---\n中文。');
  await put('zh/notes/hidden/secret.md', '---\ntitle: 笔记\n---\n文字。');
  return { root, put };
}
const site = { i18n: { enabled: true, defaultLanguage: 'en', languages: [{ code: 'en' }, { code: 'zh' }] } };
describe('collecting real card content', () => {
  it('honors directory permalinks, keeps language identities, and resolves parent titles', async () => {
    const { root } = await fixture();
    const entries = await collectEntries(root, site);
    expect(entries.find((e) => e.key === '/posts/samples/first').url).toBe('/posts/first/');
    expect(entries.find((e) => e.key === 'zh:posts/first')).toMatchObject({ title: '第一步', url: '/zh/posts/first/', lang: 'zh' });
    expect(entries.find((e) => e.key === 'zh:notes/hidden/secret').url).toBe('/zh/notes/hidden/secret/');
    expect(entries.find((e) => e.key === '/timeline/child').parentTitle).toBe('Toolkit');
  });
  it('only the new comparison draft is gated, leaving existing draft card behavior intact', async () => {
    const { root } = await fixture();
    const prod = await collectEntries(root, site, { production: true });
    expect(prod.some((e) => e.title === 'Old draft')).toBe(true);
    expect(prod.some((e) => e.title === 'Comparison')).toBe(false);
    expect((await collectEntries(root, site)).some((e) => e.title === 'Comparison')).toBe(true);
  });
  it('disabled localization does not generate cards for untranslated source trees', async () => {
    const { root } = await fixture();
    expect((await collectEntries(root, {})).every((e) => e.lang === 'en')).toBe(true);
  });
  it('supports static entries and explicit per-page styles without changing static filenames', async () => {
    const { root, put } = await fixture();
    await put('notes/tip.md', '---\ntitle: Tip\nogStyle: swiss-dark\nogSeries: false\n---\nText');
    const entries = await collectEntries(root, { ogImage: { staticEntries: [{ key: '/timeline', slug: 'timeline', title: 'Timeline', excerpt: '' }] } });
    expect(entries.find((e) => e.key === '/timeline')).toMatchObject({ collection: 'page', url: '/timeline/' });
    expect(entries.find((e) => e.key === '/notes/tip')).toMatchObject({ ogStyle: 'swiss-dark', ogSeries: false });
  });
  it('a changed parent title reaches its children while missing parents stay absent', () => {
    const entries = [{ url: '/timeline/root/', title: 'New title' }, { url: '/timeline/child/', parent: '/timeline/root/' }, { parent: '/missing/' }];
    expect(resolveParents(entries).map((e) => e.parentTitle)).toEqual([null, 'New title', null]);
  });
});
