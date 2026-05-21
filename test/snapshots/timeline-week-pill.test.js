import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSiteBuilt } from '../helpers/build-once.js';
import { parsePage, selectAll, textOf } from '../helpers/parse.js';
import { normalizeFragment } from '../helpers/normalize-html.js';

const findPill = (document, href) =>
  selectAll(document, 'a.timeline-relationship').find(
    (a) => a.getAttribute('href') === href,
  );

describe('timeline week pill snapshots', () => {
  let weeksDoc;
  let monthDoc;

  beforeAll(async () => {
    await ensureSiteBuilt();
    ({ document: weeksDoc } = parsePage('/timeline/weeks/'));
    ({ document: monthDoc } = parsePage('/timeline/months/202604/'));
  });

  it('single ISO calendar week pill', () => {
    const pill = findPill(weeksDoc, '/timeline/weeks/2026-W16/');
    expect(pill).toBeTruthy();
    expect(textOf(pill)).toMatch(/\(\d+\)/); // entry count appended
    expect(normalizeFragment(pill)).toMatchInlineSnapshot(
      `"<a class="timeline-relationship mr2 mb2" href="/timeline/weeks/2026-W16/"> Apr 13-19, 2026 (2) </a>"`,
    );
  });

  it('month-banded week pill (multi-week month band)', () => {
    // Month archive lists each month-banded week separately; pick one.
    const pill = findPill(monthDoc, '/timeline/weeks/202604W2/');
    expect(pill).toBeTruthy();
    expect(textOf(pill)).toMatch(/April 2026/);
    expect(normalizeFragment(pill)).toMatchInlineSnapshot(
      `"<a class="timeline-relationship mr2 mb2" href="/timeline/weeks/202604W2/"> April 2026 8-14, 2026 (1) </a>"`,
    );
  });
});
