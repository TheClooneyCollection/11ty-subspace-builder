import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const MONTH_KEY = '202604';

describe('/timeline/months/', () => {
  let indexDoc;
  let archiveDoc;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: indexDoc } = parsePage('/timeline/months/'));
    ({ document: archiveDoc } = parsePage(`/timeline/months/${MONTH_KEY}/`));
  });

  it('renders at least one month archive link on the index', () => {
    const monthLinks = selectAll(
      indexDoc,
      'a[href^="/timeline/months/"]',
    ).filter((a) => /\/timeline\/months\/\d+\/$/.test(a.getAttribute('href')));
    expect(monthLinks.length).toBeGreaterThan(0);
  });

  it('renders the known month archive with the expected title', () => {
    const title = textOf(archiveDoc.querySelector('title'));
    expect(title.toLowerCase()).toContain('timeline');
    const h1 = archiveDoc.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1).length).toBeGreaterThan(0);
  });

  it('index card count matches the entry count in the archive page', () => {
    const link = selectAll(indexDoc, 'a[href^="/timeline/months/"]').find(
      (a) => a.getAttribute('href') === `/timeline/months/${MONTH_KEY}/`,
    );
    expect(link).toBeTruthy();
    const match = textOf(link).match(/\((\d+)\)\s*$/);
    expect(match).toBeTruthy();
    const indexCount = Number(match[1]);

    const entries = selectAll(archiveDoc, 'article.timeline-entry');
    expect(entries.length).toBe(indexCount);
    expect(indexCount).toBeGreaterThan(0);
  });
});
