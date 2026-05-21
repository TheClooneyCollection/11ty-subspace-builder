import { beforeAll, describe, expect, it } from 'vitest';
import { DOMParser } from 'linkedom';
import {
  ensureSiteBuilt,
  readSiteFile,
} from '../helpers/build-once.js';

describe('/feed.xml', () => {
  let xml;
  let document;

  beforeAll(async () => {
    await ensureSiteBuilt();
    xml = readSiteFile('feed.xml');
    document = new DOMParser().parseFromString(xml, 'text/xml');
  });

  it('starts with an XML declaration and is parseable', () => {
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(document).toBeTruthy();
  });

  it('contains <item> or <entry> elements', () => {
    const items = Array.from(
      document.querySelectorAll('item, entry'),
    );
    expect(items.length).toBeGreaterThan(0);
  });

  it('every item/entry link is an absolute http(s) URL', () => {
    const items = Array.from(document.querySelectorAll('item, entry'));
    for (const item of items) {
      const links = Array.from(item.querySelectorAll('link'));
      // Atom uses <link href="...">, RSS uses <link>URL</link>
      const urls = links.map((link) => {
        const href = link.getAttribute('href');
        return href || (link.textContent || '').trim();
      });
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(url).toMatch(/^https?:\/\//);
      }
    }
  });
});
