import { describe, it, expect, beforeAll } from 'vitest';
import {
  ensureSiteBuilt,
  sitePathExists,
} from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

// In the default production build (ELEVENTY_ENV=production), eleventy.config.js
// sets eleventyExcludeFromCollections on items where `data.draft` is truthy, so
// the `drafts` collection ends up empty even though the /drafts/ page itself
// is still rendered. We assert that exact shape here. A separate dev-mode build
// could be tested in a future phase, but the test runner builds in production.

describe('contract — /drafts/', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('drafts page is built at /drafts/', () => {
    expect(sitePathExists('drafts/index.html')).toBe(true);
  });

  it('renders the page heading without unresolved template syntax', () => {
    const { document } = parsePage('/drafts/');
    const h1 = document.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1).length).toBeGreaterThan(0);
    expect(document.body.innerHTML).not.toMatch(/\{\{[^}]*\}\}/);
  });

  it('in the production build, the drafts collection is empty', () => {
    const { document } = parsePage('/drafts/');
    const articles = selectAll(document, 'article');
    expect(articles.length).toBe(0);
  });
});
