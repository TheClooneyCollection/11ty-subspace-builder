import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';
import { normalizeFragment } from '../helpers/normalize-html.js';

const findArticleByHref = (document, hrefPrefix) =>
  selectAll(document, 'article.mb4.pb4.bb.b--black-10').find((article) => {
    const a = article.querySelector('h2 a');
    return a && a.getAttribute('href').startsWith(hrefPrefix);
  });

// Snapshot only the durable shell: title link, time, tag list. The excerpt
// text drifts with prose edits, so we assert its presence/absence separately
// rather than locking the wording inline.
const snapshotShell = (article) => {
  const cloned = article.cloneNode(true);
  const body = cloned.querySelector('div.lh-copy');
  if (body) body.remove();
  return normalizeFragment(cloned);
};

describe('post list item snapshots', () => {
  let homeDoc;
  let notesDoc;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: homeDoc } = parsePage('/'));
    ({ document: notesDoc } = parsePage('/notes/'));
  });

  it('post list item from home page (post variant, with excerpt)', () => {
    const article = findArticleByHref(homeDoc, '/posts/threaded-timeline-entries/');
    expect(article).toBeTruthy();

    // Excerpt present and non-empty.
    const body = article.querySelector('div.lh-copy');
    expect(body).toBeTruthy();
    expect(textOf(body).length).toBeGreaterThan(0);

    expect(snapshotShell(article)).toMatchSnapshot();
  });

  it('post list item from /notes/ (note variant, with excerpt)', () => {
    const article = findArticleByHref(notesDoc, '/notes/testing-the-notes-collection/');
    expect(article).toBeTruthy();

    const body = article.querySelector('div.lh-copy');
    expect(body).toBeTruthy();
    expect(textOf(body).length).toBeGreaterThan(0);

    expect(snapshotShell(article)).toMatchSnapshot();
  });

  // The post-list macro always emits a <div class="lh-copy"> wrapper and
  // falls back to a generated excerpt when item.data.excerpt is absent. As a
  // result, no real-data post or note renders as an item *without* an excerpt
  // body. We assert the invariant rather than chasing a snapshot that cannot
  // exist with current data.
  it('every post-list item across home and notes has a non-empty body block', () => {
    const articles = [
      ...selectAll(homeDoc, 'article.mb4.pb4.bb.b--black-10'),
      ...selectAll(notesDoc, 'article.mb4.pb4.bb.b--black-10'),
    ];
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      const body = article.querySelector('div.lh-copy');
      expect(body).toBeTruthy();
      expect(textOf(body).length).toBeGreaterThan(0);
    }
  });
});
