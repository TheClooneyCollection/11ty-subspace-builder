import { describe, it, expect } from 'vitest';
import { toIsoDatePart, parseIsoDateAsUtc } from '../../lib/timeline/dates.js';
import { getTimelineSortKey } from '../../lib/timeline/sort.js';

describe('toIsoDatePart', () => {
  it('returns the YYYY-MM-DD prefix of an ISO string', () => {
    expect(toIsoDatePart('2026-05-22T10:00:00Z')).toBe('2026-05-22');
  });

  it('returns the string as-is when no T separator', () => {
    expect(toIsoDatePart('2026-05-22')).toBe('2026-05-22');
  });

  it('formats a Date instance', () => {
    expect(toIsoDatePart(new Date('2026-05-22T00:00:00Z'))).toBe('2026-05-22');
  });

  it('returns empty string for invalid Date', () => {
    expect(toIsoDatePart(new Date('not a date'))).toBe('');
  });

  it('returns empty string for non-string non-Date input', () => {
    expect(toIsoDatePart(null)).toBe('');
    expect(toIsoDatePart(undefined)).toBe('');
    expect(toIsoDatePart(123)).toBe('');
  });
});

describe('parseIsoDateAsUtc', () => {
  it('parses an ISO date string at UTC midnight', () => {
    const d = parseIsoDateAsUtc('2026-05-22');
    expect(d).toBeInstanceOf(Date);
    expect(d.toISOString()).toBe('2026-05-22T00:00:00.000Z');
  });

  it('returns null for unparseable input', () => {
    expect(parseIsoDateAsUtc('')).toBe(null);
    expect(parseIsoDateAsUtc(null)).toBe(null);
  });
});

describe('getTimelineSortKey', () => {
  it('combines date and time from entry.data', () => {
    const entry = { data: { date: '2026-05-22', time: '14:30' } };
    expect(getTimelineSortKey(entry)).toBe('2026-05-22T14:30');
  });

  it('defaults time to 00:00 when missing', () => {
    expect(getTimelineSortKey({ data: { date: '2026-05-22' } })).toBe(
      '2026-05-22T00:00',
    );
  });

  it('defaults time to 00:00 when blank', () => {
    expect(
      getTimelineSortKey({ data: { date: '2026-05-22', time: '   ' } }),
    ).toBe('2026-05-22T00:00');
  });

  it('falls back to entry.date when data.date is absent', () => {
    expect(getTimelineSortKey({ date: '2026-05-22' })).toBe(
      '2026-05-22T00:00',
    );
  });

  it('produces lexicographically comparable keys', () => {
    const a = getTimelineSortKey({ data: { date: '2026-05-22', time: '09:00' } });
    const b = getTimelineSortKey({ data: { date: '2026-05-22', time: '14:00' } });
    const c = getTimelineSortKey({ data: { date: '2026-05-23', time: '08:00' } });
    expect([c, a, b].sort()).toEqual([a, b, c]);
  });
});
