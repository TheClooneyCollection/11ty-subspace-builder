import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';

const CALENDAR_WEEK_KEY = '2026-W16';

describe('/timeline/weeks/<iso-week>/', () => {
  let archiveDoc;
  let weeksIndexDoc;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: archiveDoc } = parsePage(
      `/timeline/weeks/${CALENDAR_WEEK_KEY}/`,
    ));
    ({ document: weeksIndexDoc } = parsePage('/timeline/weeks/'));
  });

  it('renders an ISO calendar week label of the form "Calendar Week NN · YYYY"', () => {
    const h1 = archiveDoc.querySelector('h1');
    expect(h1).toBeTruthy();
    const label = textOf(h1);
    expect(label).toMatch(/^Calendar Week \d{2} · \d{4}$/);

    const title = textOf(archiveDoc.querySelector('title'));
    expect(title).toMatch(/Calendar Week \d{2} · \d{4}/);
  });

  it('lists the ISO calendar week archive on the weeks index', () => {
    const calendarLinks = selectAll(
      weeksIndexDoc,
      'a[href^="/timeline/weeks/"]',
    ).filter((a) =>
      /\/timeline\/weeks\/\d{4}-W\d{2}\/$/.test(a.getAttribute('href') || ''),
    );
    expect(calendarLinks.length).toBeGreaterThan(0);

    const match = calendarLinks.find(
      (a) => a.getAttribute('href') === `/timeline/weeks/${CALENDAR_WEEK_KEY}/`,
    );
    expect(match).toBeTruthy();
  });

  it('renders at least one timeline entry on the calendar week archive', () => {
    const entries = selectAll(archiveDoc, 'article.timeline-entry');
    expect(entries.length).toBeGreaterThan(0);
  });
});
