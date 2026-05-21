import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const WEEK_KEY = '202604W2';

describe('/timeline/weeks/', () => {
  let indexDoc;
  let archiveDoc;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: indexDoc } = parsePage('/timeline/weeks/'));
    ({ document: archiveDoc } = parsePage(`/timeline/weeks/${WEEK_KEY}/`));
  });

  it('renders week archive links on the index', () => {
    const weekLinks = selectAll(indexDoc, 'a[href^="/timeline/weeks/"]').filter(
      (a) =>
        /\/timeline\/weeks\/\d{6}W\d+\/$/.test(a.getAttribute('href') || ''),
    );
    expect(weekLinks.length).toBeGreaterThan(0);
  });

  it('renders the known week archive with a non-empty title and h1', () => {
    expect(textOf(archiveDoc.querySelector('title')).length).toBeGreaterThan(0);
    const h1 = archiveDoc.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(textOf(h1).length).toBeGreaterThan(0);
  });

  it('index card count matches the entry count on the archive page', () => {
    const link = selectAll(indexDoc, 'a[href^="/timeline/weeks/"]').find(
      (a) => a.getAttribute('href') === `/timeline/weeks/${WEEK_KEY}/`,
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
