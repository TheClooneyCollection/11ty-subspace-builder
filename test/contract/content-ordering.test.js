import { beforeAll, describe, expect, it } from 'vitest';
import { DOMParser } from 'linkedom';
import { ensureSiteBuilt, readSiteFile } from '../helpers/build-once.js';
import { parsePage, selectAll } from '../helpers/parse.js';

const indexOfHref = (document, href) =>
  selectAll(document, 'article h2 a[href]').findIndex(
    (link) => link.getAttribute('href') === href,
  );

describe('contract — same-day content ordering', () => {
  beforeAll(async () => {
    await ensureSiteBuilt();
  });

  it('renders same-day posts newest-first on the home page', () => {
    const { document } = parsePage('/');
    const eveningIndex = indexOfHref(
      document,
      '/posts/testing-post-order-evening/',
    );
    const morningIndex = indexOfHref(
      document,
      '/posts/testing-post-order-morning/',
    );

    expect(eveningIndex).toBeGreaterThanOrEqual(0);
    expect(morningIndex).toBeGreaterThanOrEqual(0);
    expect(eveningIndex).toBeLessThan(morningIndex);
  });

  it('renders same-day notes newest-first on the notes page', () => {
    const { document } = parsePage('/notes/');
    const eveningIndex = indexOfHref(
      document,
      '/notes/testing-note-order-evening/',
    );
    const morningIndex = indexOfHref(
      document,
      '/notes/testing-note-order-morning/',
    );

    expect(eveningIndex).toBeGreaterThanOrEqual(0);
    expect(morningIndex).toBeGreaterThanOrEqual(0);
    expect(eveningIndex).toBeLessThan(morningIndex);
  });

  it('renders same-day posts newest-first in feed.xml', () => {
    const xml = readSiteFile('feed.xml');
    const document = new DOMParser().parseFromString(xml, 'text/xml');
    const titles = Array.from(document.querySelectorAll('item > title')).map(
      (node) => (node.textContent || '').trim(),
    );
    const eveningIndex = titles.indexOf('Testing Same-Day Post Ordering Evening');
    const morningIndex = titles.indexOf('Testing Same-Day Post Ordering Morning');

    expect(eveningIndex).toBeGreaterThanOrEqual(0);
    expect(morningIndex).toBeGreaterThanOrEqual(0);
    expect(eveningIndex).toBeLessThan(morningIndex);
  });
});
