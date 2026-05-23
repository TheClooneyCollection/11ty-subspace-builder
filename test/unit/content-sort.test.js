import { describe, expect, it } from 'vitest';
import {
  getCollectionSortKey,
  normalizeCollectionTime,
  sortCollectionByDateAndTime,
} from '../../lib/content/sort.js';

describe('normalizeCollectionTime', () => {
  it('defaults missing or blank values to midnight', () => {
    expect(normalizeCollectionTime()).toBe('00:00');
    expect(normalizeCollectionTime('   ')).toBe('00:00');
  });

  it('pads one-digit hours', () => {
    expect(normalizeCollectionTime('9:05')).toBe('09:05');
  });

  it('falls back to midnight for invalid times', () => {
    expect(normalizeCollectionTime('24:00')).toBe('00:00');
    expect(normalizeCollectionTime('09:99')).toBe('00:00');
    expect(normalizeCollectionTime('nope')).toBe('00:00');
  });
});

describe('getCollectionSortKey', () => {
  it('combines item date and optional time', () => {
    expect(
      getCollectionSortKey({
        data: { date: '2026-05-22', time: '9:05' },
      }),
    ).toBe('2026-05-22T09:05');
  });

  it('falls back to item.date when front matter date is absent', () => {
    expect(
      getCollectionSortKey({
        date: new Date('2026-05-22T00:00:00Z'),
        data: { time: '14:30' },
      }),
    ).toBe('2026-05-22T14:30');
  });
});

describe('sortCollectionByDateAndTime', () => {
  it('sorts entries in ascending date and time order', () => {
    const items = [
      {
        url: '/posts/night/',
        data: { date: '2026-05-22', time: '21:00' },
      },
      {
        url: '/posts/morning/',
        data: { date: '2026-05-22', time: '08:00' },
      },
      {
        url: '/posts/next-day/',
        data: { date: '2026-05-23', time: '07:00' },
      },
    ];

    expect(sortCollectionByDateAndTime(items).map((item) => item.url)).toEqual([
      '/posts/morning/',
      '/posts/night/',
      '/posts/next-day/',
    ]);
  });

  it('keeps content without explicit time compatible by treating it as midnight', () => {
    const items = [
      {
        url: '/notes/with-time/',
        data: { date: '2026-05-22', time: '00:30' },
      },
      {
        url: '/notes/no-time/',
        data: { date: '2026-05-22' },
      },
    ];

    expect(sortCollectionByDateAndTime(items).map((item) => item.url)).toEqual([
      '/notes/no-time/',
      '/notes/with-time/',
    ]);
  });
});
