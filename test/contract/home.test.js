import { describe, it, expect, beforeAll } from 'vitest';
import { ensureSiteBuilt, sitePathExists } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

describe('contract — home (/)', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('page 1 renders at /', () => {
    expect(sitePathExists('index.html')).toBe(true);
    const { document } = parsePage('/');
    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1).length).toBeGreaterThan(0);
    // Title element should be populated (not unresolved template).
    const title = document.querySelector('title');
    expect(title).toBeTruthy();
    const titleText = textOf(title);
    expect(titleText.length).toBeGreaterThan(0);
    expect(titleText).not.toMatch(/\{\{|\{%/);
  });

  it('page 1 lists at least one post article', () => {
    const { document } = parsePage('/');
    const articles = selectAll(document, 'article');
    expect(articles.length).toBeGreaterThan(0);
    // Each post article links to a post URL.
    const firstLink = articles[0].querySelector('a[href]');
    expect(firstLink).toBeTruthy();
    expect(firstLink.getAttribute('href').startsWith('/')).toBe(true);
  });

  it('home pagination structure is consistent (page 2 exists iff > 10 posts published)', () => {
    const { document } = parsePage('/');
    const articles = selectAll(document, 'article');
    // pagination size in src/index.njk is 10.
    const hasPage2 = sitePathExists('page/2/index.html');
    if (articles.length >= 10) {
      expect(hasPage2).toBe(true);
    }
    // If page 2 exists, verify its structure.
    if (hasPage2) {
      const { document: p2 } = parsePage('/page/2/');
      expect(p2.querySelector('h1')).toBeTruthy();
      const p2Articles = selectAll(p2, 'article');
      expect(p2Articles.length).toBeGreaterThan(0);
      // page 2 should link back to page 1 (previous link).
      const links = selectAll(p2, 'a[href]').map((a) => a.getAttribute('href'));
      expect(links.some((href) => href === '/' || href === '/page/1/')).toBe(true);
      // page 1 should have a "next" link pointing at /page/2/ when more than one page.
      const p1Links = selectAll(document, 'a[href]').map((a) =>
        a.getAttribute('href'),
      );
      expect(p1Links.some((h) => h && h.includes('/page/2'))).toBe(true);
    }
  });
});
