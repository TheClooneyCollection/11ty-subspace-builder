import { cardData, STYLES } from './card-data.js';

export const SHOWCASE_SOURCE = 'posts/subspace/draft-og-card-styles.md';
export const SHOWCASE_URL = '/posts/draft-og-card-styles/';
const site = { url: 'https://example.test', ogImage: { siteName: 'example.test' } };
const series = [{ id: 'field-notes', title: 'Field Notes',
  entries: Array.from({ length: 12 }, (_, i) => `/posts/chapter-${i + 1}/`),
}];
const locale = { series: { 'field-notes': { title: '工程笔记' } } };
const samples = [
  ['post', 'Post', { title: 'Small tools, thoughtful systems' }],
  ['long', 'Long title', { title: 'Following a small connection failure through several layers of an otherwise reliable system' }],
  ['zh', 'Chinese series', { title: '用清晰的小步骤构建可靠的软件', lang: 'zh', url: '/zh/posts/chapter-6/' }],
  ['series', 'Series', { title: 'Building a dependable workflow', url: '/posts/chapter-6/' }],
  ['timeline', 'Timeline', { title: 'feat: A calmer release workflow', collection: 'timeline', tags: ['shipped'], parentTitle: 'Release toolkit' }],
  ['page', 'Page', { title: 'Notebook', collection: 'page', excerpt: 'A place for ideas, experiments, and the small discoveries worth keeping.' }],
];

export function showcaseData(production) {
  if (production) return [];
  return samples.flatMap(([sample, label, entry]) => STYLES.map((style) => ({
    sample, label, style, image: `/assets/og/showcase/${sample}-${style}.png`,
    data: cardData({ collection: 'posts', lang: 'en', date: '2026-04-14',
      url: '/posts/sample/', excerpt: '', ...entry, ogStyle: style }, site, series, locale),
  })));
}
