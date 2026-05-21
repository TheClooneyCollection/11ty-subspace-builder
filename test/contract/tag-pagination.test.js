import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const POPULAR_TAG = 'subspace';

describe(`/tags/${POPULAR_TAG}/`, () => {
  let document;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage(`/tags/${POPULAR_TAG}/`));
  });

  it('renders a non-empty heading mentioning the tag', () => {
    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1).toLowerCase()).toContain(POPULAR_TAG);
  });

  it('renders at least one entry article on the tag archive page', () => {
    const entries = selectAll(document, 'article');
    expect(entries.length).toBeGreaterThan(0);
  });

  it('every entry on the page has a non-empty anchor to its content', () => {
    const articles = selectAll(document, 'article');
    for (const article of articles) {
      const link = article.querySelector('a[href]');
      expect(link).toBeTruthy();
      const href = link.getAttribute('href');
      expect(href && href.startsWith('/')).toBeTruthy();
      expect(textOf(link).length).toBeGreaterThan(0);
    }
  });
});
