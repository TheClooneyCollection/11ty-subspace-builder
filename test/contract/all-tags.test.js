import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';
import {
  walkSiteHtml,
} from '../helpers/build-once.js';
import path from 'node:path';

describe('/tags/ full tag list', () => {
  let document;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage('/tags/'));
  });

  it('renders every tag that has a /tags/<slug>/ page on disk', () => {
    const chipHrefs = new Set(
      selectAll(document, 'a[href^="/tags/"]')
        .map((a) => a.getAttribute('href'))
        .filter((href) => /^\/tags\/[^/]+\/$/.test(href || '')),
    );
    expect(chipHrefs.size).toBeGreaterThan(0);

    const disk = new Set();
    for (const file of walkSiteHtml('tags')) {
      const rel = file.relativePath.split(path.sep).join('/');
      const match = rel.match(/^tags\/([^/]+)\/index\.html$/);
      if (match) disk.add(`/tags/${match[1]}/`);
    }
    expect(disk.size).toBeGreaterThan(0);

    for (const href of disk) {
      expect(chipHrefs.has(href)).toBe(true);
    }
  });

  it('every rendered tag chip has visible text', () => {
    const chips = selectAll(document, 'a[href^="/tags/"]').filter((a) =>
      /^\/tags\/[^/]+\/$/.test(a.getAttribute('href') || ''),
    );
    for (const chip of chips) {
      expect(textOf(chip).length).toBeGreaterThan(0);
    }
  });
});
