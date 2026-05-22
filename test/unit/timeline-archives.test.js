import { describe, it, expect } from 'vitest';
import {
  formatTimelineMonthKey,
  formatTimelineMonthLabel,
  getTimelineWeekOfMonth,
  formatTimelineWeekLabel,
  formatTimelineWeekRangeLabel,
  getWeekStartUtc,
  getIsoWeekData,
  formatCalendarWeekRangeLabel,
  formatCalendarWeekLabel,
  getTimelineEntrySlug,
  buildTimelineTagArchives,
  buildTimelineMonthArchives,
  buildTimelineWeekArchives,
  buildTimelineCalendarWeekArchives,
} from '../../lib/timeline/archives.js';

const utc = (iso) => new Date(`${iso}T00:00:00Z`);

describe('formatTimelineMonthKey', () => {
  it('returns YYYYMM with zero padding', () => {
    expect(formatTimelineMonthKey(utc('2026-01-15'))).toBe('202601');
    expect(formatTimelineMonthKey(utc('2026-12-15'))).toBe('202612');
  });
});

describe('formatTimelineMonthLabel', () => {
  it('formats year + month long name in en-US', () => {
    expect(formatTimelineMonthLabel(2026, 5)).toBe('May 2026');
  });
});

describe('getTimelineWeekOfMonth', () => {
  it('returns 1 for days 1-7', () => {
    expect(getTimelineWeekOfMonth(utc('2026-05-01'))).toBe(1);
    expect(getTimelineWeekOfMonth(utc('2026-05-07'))).toBe(1);
  });

  it('rolls over at day 8', () => {
    expect(getTimelineWeekOfMonth(utc('2026-05-08'))).toBe(2);
    expect(getTimelineWeekOfMonth(utc('2026-05-15'))).toBe(3);
  });
});

describe('formatTimelineWeekRangeLabel', () => {
  it('formats a 7-day range', () => {
    expect(formatTimelineWeekRangeLabel(2026, 5, 1)).toBe(
      'May 2026 1-7, 2026',
    );
  });

  it('clamps to last day of month', () => {
    // May has 31 days; week 5 starts day 29
    expect(formatTimelineWeekRangeLabel(2026, 5, 5)).toBe(
      'May 2026 29-31, 2026',
    );
  });
});

describe('formatTimelineWeekLabel', () => {
  it('combines month label and week number', () => {
    expect(formatTimelineWeekLabel(2026, 5, 3)).toBe('May 2026 · Week 3');
  });
});

describe('getWeekStartUtc', () => {
  it('returns Monday for mid-week dates', () => {
    // 2026-05-22 is a Friday
    const monday = getWeekStartUtc(utc('2026-05-22'));
    expect(monday.toISOString()).toBe('2026-05-18T00:00:00.000Z');
  });

  it('returns previous Monday when given a Sunday', () => {
    // 2026-05-17 is a Sunday
    const monday = getWeekStartUtc(utc('2026-05-17'));
    expect(monday.toISOString()).toBe('2026-05-11T00:00:00.000Z');
  });
});

describe('getIsoWeekData', () => {
  it('computes the ISO week key', () => {
    const r = getIsoWeekData(utc('2026-05-22'));
    expect(r.isoYear).toBe(2026);
    expect(r.week).toBeGreaterThanOrEqual(20);
    expect(r.key).toBe(`2026-W${String(r.week).padStart(2, '0')}`);
  });

  it('handles year-boundary weeks', () => {
    // Jan 1 2026 is a Thursday → ISO week 1 of 2026
    const r = getIsoWeekData(utc('2026-01-01'));
    expect(r.isoYear).toBe(2026);
    expect(r.week).toBe(1);
  });
});

describe('formatCalendarWeekLabel', () => {
  it('zero-pads the week and includes the iso year', () => {
    expect(formatCalendarWeekLabel(2026, 5)).toBe('Calendar Week 05 · 2026');
    expect(formatCalendarWeekLabel(2026, 21)).toBe('Calendar Week 21 · 2026');
  });
});

describe('formatCalendarWeekRangeLabel', () => {
  it('formats a same-month range', () => {
    expect(formatCalendarWeekRangeLabel(utc('2026-05-18'))).toBe(
      'May 18-24, 2026',
    );
  });

  it('formats a cross-month range', () => {
    // Mon Apr 27 to Sun May 3, 2026
    expect(formatCalendarWeekRangeLabel(utc('2026-04-27'))).toBe(
      'Apr 27 - May 3, 2026',
    );
  });

  it('formats a cross-year range', () => {
    // Mon Dec 29 to Sun Jan 4
    expect(formatCalendarWeekRangeLabel(utc('2025-12-29'))).toBe(
      'Dec 29, 2025 - Jan 4, 2026',
    );
  });
});

describe('getTimelineEntrySlug', () => {
  it('extracts slug from /timeline/<slug>/', () => {
    expect(getTimelineEntrySlug({ url: '/timeline/foo/' })).toBe('foo');
  });

  it('returns null for non-timeline URLs', () => {
    expect(getTimelineEntrySlug({ url: '/posts/foo/' })).toBe(null);
    expect(getTimelineEntrySlug({})).toBe(null);
  });
});

describe('buildTimelineTagArchives', () => {
  const e = (url, tags, date = '2026-05-22') => ({
    url,
    data: { date, tags },
  });

  it('groups entries by topic tag and sorts alphabetically', () => {
    const archives = buildTimelineTagArchives(
      [e('/timeline/a/', ['eleventy']), e('/timeline/b/', ['build', 'eleventy'])],
      { getTopicTags: (entry) => entry.data.tags },
    );
    expect(archives.map((a) => a.tag)).toEqual(['build', 'eleventy']);
    expect(archives.find((a) => a.tag === 'eleventy').entries).toHaveLength(2);
  });

  it('throws when a tag slug matches a reserved archive route', () => {
    expect(() =>
      buildTimelineTagArchives(
        [e('/timeline/a/', ['months'])],
        { getTopicTags: (entry) => entry.data.tags },
      ),
    ).toThrow(/reserved timeline path/);
  });

  it('throws when a tag slug collides with an entry slug', () => {
    expect(() =>
      buildTimelineTagArchives(
        [
          e('/timeline/foo/', ['bar']),
          e('/timeline/bar/', []), // bar entry — collides with tag slug "bar"
        ],
        { getTopicTags: (entry) => entry.data.tags },
      ),
    ).toThrow(/conflicts with an existing timeline entry URL/);
  });

  it('handles no topic tags gracefully', () => {
    const archives = buildTimelineTagArchives([e('/timeline/a/', [])], {
      getTopicTags: (entry) => entry.data.tags,
    });
    expect(archives).toEqual([]);
  });
});

describe('buildTimelineMonthArchives', () => {
  const e = (date) => ({ url: '/timeline/x/', data: { date } });

  it('groups by YYYYMM and includes week breakdown', () => {
    const archives = buildTimelineMonthArchives([
      e('2026-05-01'),
      e('2026-05-15'),
      e('2026-05-15'),
      e('2026-06-01'),
    ]);
    expect(archives.map((a) => a.key)).toEqual(['202605', '202606']);
    const may = archives[0];
    expect(may.entries).toHaveLength(3);
    expect(may.weeks.find((w) => w.week === 3).entryCount).toBe(2);
  });

  it('skips entries without a parseable date', () => {
    expect(buildTimelineMonthArchives([{ data: {} }])).toEqual([]);
  });
});

describe('buildTimelineWeekArchives', () => {
  it('groups by YYYYMMWn', () => {
    const archives = buildTimelineWeekArchives([
      { url: '/timeline/a/', data: { date: '2026-05-01' } },
      { url: '/timeline/b/', data: { date: '2026-05-15' } },
    ]);
    expect(archives.map((a) => a.key).sort()).toEqual(['202605W1', '202605W3']);
  });
});

describe('buildTimelineCalendarWeekArchives', () => {
  it('groups by ISO YYYY-Www', () => {
    const archives = buildTimelineCalendarWeekArchives([
      { url: '/timeline/a/', data: { date: '2026-05-18' } },
      { url: '/timeline/b/', data: { date: '2026-05-22' } },
    ]);
    expect(archives).toHaveLength(1);
    expect(archives[0].key).toMatch(/^2026-W\d{2}$/);
    expect(archives[0].entries).toHaveLength(2);
  });
});
