import { describe, expect, it } from 'vitest';
import cardData, { STYLES } from '../../lib/og/card-data.js';

const entry = (overrides = {}) => ({
  collection: 'posts', lang: 'en', url: '/posts/one/', title: 'A quiet garden',
  date: '2026-04-14', excerpt: 'A place to grow.', tags: ['post'], ...overrides,
});
const site = { url: 'https://garden.example/' };
const series = [
  { id: 'garden', title: 'Growing things', entries: ['/notes/start/', '/posts/one/'] },
  { id: 'seasons', title: 'Seasons', posts: ['/posts/one/', '/posts/two/', '/posts/three/'] },
];

describe('share card data', () => {
  it('gives a post the default card and only the rendering contract', () => {
    expect(cardData(entry(), site)).toEqual({
      style: 'retro', variant: 'light', lang: 'en', zh: false, kind: 'Post',
      title: 'A quiet garden', excerpt: 'A place to grow.', date: '14 APR 2026',
      parent: null, series: null, siteName: 'garden.example', width: 1200, height: 630,
      page: false, timeline: false,
    });
  });

  it.each([
    ['retro', 'light'], ['retro-dark', 'dark'], ['swiss', 'light'], ['swiss-dark', 'dark'],
    ['glass-dark', 'dark'], ['glass-light-b', 'b'], ['glass-light-c', 'c'], ['classic', 'classic'],
  ])('lets a page override the site style with %s', (style, variant) => {
    expect(STYLES).toContain(style);
    expect(cardData(entry({ ogStyle: style }), { ...site, ogImage: { style: 'classic' } }))
      .toMatchObject({ style, variant });
  });

  it('uses the configured site style and display name', () => {
    expect(cardData(entry(), { ...site, ogImage: { style: 'swiss', siteName: 'Our garden' } }))
      .toMatchObject({ style: 'swiss', siteName: 'Our garden' });
  });

  it('explains the supported choices for an unknown style', () => {
    expect(() => cardData(entry({ ogStyle: 'unknown' }), site)).toThrow(STYLES.join(', '));
  });

  it.each([
    ['posts', 'en', 'Post'], ['notes', 'en', 'Note'], ['page', 'en', 'Page'],
    ['posts', 'zh', '文章'], ['notes', 'zh', '笔记'], ['page', 'zh', '页面'],
  ])('labels %s in %s', (collection, lang, kind) => {
    expect(cardData(entry({ collection, lang }), site)).toMatchObject({ kind, page: collection === 'page' });
  });

  it.each(['shipped', 'thinking', 'wip', 'idea', 'published'])('uses timeline status %s and removes the title prefix', (status) => {
    const labels = { shipped: 'Shipped', thinking: 'Thinking', wip: 'WIP', idea: 'Idea', published: 'Published' };
    expect(cardData(entry({ collection: 'timeline', title: 'fix(garden): Grow more', tags: ['timeline', status] }), site))
      .toMatchObject({ title: 'Grow more', kind: labels[status], timeline: true });
  });

  it('strips timeline prefixes containing digits and underscores', () => {
    expect(cardData(entry({ collection: 'timeline', title: 'release_2(core): A new seed', tags: ['shipped'] }), site).title)
      .toBe('A new seed');
  });

  it('picks the first recognized status and keeps the resolved parent title', () => {
    expect(cardData(entry({ collection: 'timeline', tags: ['topic', 'idea', 'shipped'],
      title: 'thoughts: A new seed', parent: '/timeline/parent/', parentTitle: 'The garden' }), site))
      .toMatchObject({ kind: 'Idea', title: 'A new seed', parent: 'The garden' });
  });

  it.each([['en', 'Timeline'], ['zh', '时间线']])('keeps an unknown timeline title intact in %s', (lang, kind) => {
    expect(cardData(entry({ lang, collection: 'timeline', title: 'custom: A new seed', tags: ['custom'] }), site))
      .toMatchObject({ kind, title: 'custom: A new seed' });
  });

  it('does not strip prefixes from ordinary posts or an unprefixed timeline title', () => {
    expect(cardData(entry({ title: 'fix: A post' }), site).title).toBe('fix: A post');
    expect(cardData(entry({ collection: 'timeline', tags: ['shipped'], title: 'A title: continued' }), site).title)
      .toBe('A title: continued');
  });

  it.each([
    ['retro', 'en', '14 APR 2026'], ['swiss', 'en', '14.04.2026'],
    ['glass-dark', 'en', 'April 14, 2026'], ['retro', 'zh', '2026.4.14'],
    ['swiss', 'zh', '2026年4月14日'], ['glass-light-b', 'zh', '2026年4月14日'],
  ])('formats %s dates in %s identically for YAML dates and date strings', (ogStyle, lang, date) => {
    expect(cardData(entry({ ogStyle, lang }), site).date).toBe(date);
    expect(cardData(entry({ ogStyle, lang, date: '2026-04-14T23:30:00Z' }), site).date).toBe(date);
    expect(cardData(entry({ ogStyle, lang, date: new Date('2026-04-14T23:30:00Z') }), site).date).toBe(date);
  });

  it('allows a static page with no date', () => {
    expect(cardData(entry({ collection: 'page', date: undefined }), site)).toMatchObject({ page: true, date: '' });
  });

  it('uses YAML order for the first matching series and declared position', () => {
    expect(cardData(entry(), site, series).series).toEqual({
      id: 'garden', title: 'Growing things', part: 2, total: 2, progress: 'Part 2 of 2',
    });
  });

  it('lets the author select a different matching legacy series or suppress series', () => {
    expect(cardData(entry({ ogSeries: 'seasons' }), site, series).series).toEqual({
      id: 'seasons', title: 'Seasons', part: 1, total: 3, progress: 'Part 1 of 3',
    });
    expect(cardData(entry({ ogSeries: false }), site, series).series).toBeNull();
  });

  it.each(['missing', 'elsewhere'])('reports invalid series override %s with source and valid choices', (ogSeries) => {
    expect(() => cardData(entry({ ogSeries, filePath: 'posts/one.md' }), site,
      [...series, { id: 'elsewhere', entries: ['/notes/other/'] }]))
      .toThrow(`Invalid ogSeries "${ogSeries}" for posts/one.md. Valid series ids: garden, seasons`);
  });

  it('uses original URL membership and localized series copy for a translated post', () => {
    expect(cardData(entry({ lang: 'zh', url: '/zh/posts/one/' }), site, series,
      { series: { garden: { title: '种植笔记' } } }).series).toEqual({
      id: 'garden', title: '种植笔记', part: 2, total: 2, progress: '第 2 篇，共 2 篇',
    });
  });

  it('falls back to the original series title when its translation is missing', () => {
    expect(cardData(entry({ lang: 'zh' }), site, series).series.title).toBe('Growing things');
    expect(cardData(entry({ url: '/posts/unlisted/' }), site, series).series).toBeNull();
  });

  it('normalizes all rendered text without modifying inputs', () => {
    const input = entry({ title: 'Cafe\u0301', excerpt: 'First\r\nSecond', parentTitle: 'Cafe\u0301' });
    const definitions = [{ id: 'cafe', title: 'Cafe\u0301', entries: [input.url] }];
    expect(cardData(input, { ...site, ogImage: { siteName: 'Cafe\u0301' } }, definitions))
      .toMatchObject({ title: 'Café', excerpt: 'First\nSecond', parent: 'Café', siteName: 'Café', series: { title: 'Café' } });
    expect(input.title).toBe('Cafe\u0301');
  });

  it.each([
    ['production\u2011ready', 'production-ready'],
    ['well\u2010formed', 'well-formed'],
    ['12\u201215', '12–15'],
    ['A\u2015B', 'A—B'],
    ['A\u00a0B\u202fC\u2007D', 'A B C D'],
    ['soft\u00adhyphen\u200b\u200c\u200d\u2060\ufeff', 'softhyphen'],
    ['“It’s ready”—中文 🌱', '“It’s ready”—中文 🌱'],
  ])('normalizes publishing text %s across every drawn input', (value, expected) => {
    const input = entry({ title: value, excerpt: value, parentTitle: value });
    const definitions = [{ id: 'garden', title: value, entries: [input.url] }];
    const data = cardData(input, { ogImage: { siteName: value } }, definitions);
    expect(data).toMatchObject({ title: expected, excerpt: expected, parent: expected,
      siteName: expected, series: { title: expected } });
    expect(input.title).toBe(value);
    const localized = cardData({ ...input, lang: 'zh' }, {}, definitions,
      { series: { garden: { title: value } } });
    expect(localized.series.title).toBe(expected);
  });

  it('does not rewrite URL membership or series identifiers as display text', () => {
    const url = '/posts/production\u2011ready/';
    const id = 'production\u2011ready';
    const definitions = [{ id, title: id, entries: [url] }];
    expect(cardData(entry({ url, ogSeries: id }), {}, definitions).series)
      .toMatchObject({ id, title: 'production-ready' });
    expect(cardData(entry({ url: '/posts/production-ready/' }), {}, definitions).series).toBeNull();
  });
});
