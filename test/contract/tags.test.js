import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const EXCLUDED_TAGS = [
  'all',
  'nav',
  'post',
  'posts',
  'notes',
  'timeline',
  'testing',
];

describe('/tags/', () => {
  let document;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document } = parsePage('/tags/'));
  });

  it('renders at least one tag group with a count heading and tag chips', () => {
    const groups = selectAll(document, 'h2.f6.ttu');
    expect(groups.length).toBeGreaterThan(0);

    const chips = selectAll(document, 'a[href^="/tags/"]').filter((a) =>
      /^\/tags\/[^/]+\/$/.test(a.getAttribute('href') || ''),
    );
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(textOf(chip).length).toBeGreaterThan(0);
    }
  });

  it('does not list excluded tags', () => {
    const chips = selectAll(document, 'a[href^="/tags/"]').filter((a) =>
      /^\/tags\/[^/]+\/$/.test(a.getAttribute('href') || ''),
    );
    const tagNames = chips.map((c) => textOf(c).toLowerCase());
    for (const excluded of EXCLUDED_TAGS) {
      expect(tagNames).not.toContain(excluded);
    }
  });
});
