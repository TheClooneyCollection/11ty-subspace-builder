import { describe, it, expect } from 'vitest';
import {
  TIMELINE_RESERVED_ARCHIVE_SLUGS,
  extractCategoryTagSet,
  getEntryType,
  filterTopicTags,
} from '../../lib/timeline/categories.js';

const categories = [
  { tag: 'shipped', label: 'Shipped' },
  { tag: 'published', label: 'Published' },
  { tag: '   ', label: 'whitespace-only' },
  null,
  { label: 'no tag field' },
];

describe('TIMELINE_RESERVED_ARCHIVE_SLUGS', () => {
  it('contains months and weeks', () => {
    expect(TIMELINE_RESERVED_ARCHIVE_SLUGS.has('months')).toBe(true);
    expect(TIMELINE_RESERVED_ARCHIVE_SLUGS.has('weeks')).toBe(true);
  });
});

describe('extractCategoryTagSet', () => {
  it('returns valid trimmed tags only', () => {
    const set = extractCategoryTagSet(categories);
    expect([...set].sort()).toEqual(['published', 'shipped']);
  });

  it('returns empty set for non-array input', () => {
    expect(extractCategoryTagSet(null).size).toBe(0);
    expect(extractCategoryTagSet(undefined).size).toBe(0);
  });
});

describe('getEntryType', () => {
  it('returns the first matching category tag (declaration order)', () => {
    const entry = { data: { tags: ['published', 'shipped'] } };
    expect(getEntryType(entry, categories)).toBe('shipped');
  });

  it('returns "default" when no category tag matches', () => {
    const entry = { data: { tags: ['something-else'] } };
    expect(getEntryType(entry, categories)).toBe('default');
  });

  it('handles a single non-array tags value', () => {
    const entry = { data: { tags: 'published' } };
    expect(getEntryType(entry, categories)).toBe('published');
  });

  it('returns "default" for missing data', () => {
    expect(getEntryType({}, categories)).toBe('default');
    expect(getEntryType(null, categories)).toBe('default');
  });
});

describe('filterTopicTags', () => {
  const excluded = new Set(['all', 'nav', 'shipped']);

  it('drops excluded tags', () => {
    expect(filterTopicTags(['eleventy', 'all', 'shipped', 'tests'], excluded))
      .toEqual(['eleventy', 'tests']);
  });

  it('deduplicates', () => {
    expect(filterTopicTags(['eleventy', 'eleventy', 'tests'], excluded))
      .toEqual(['eleventy', 'tests']);
  });

  it('coerces a single-tag string input', () => {
    expect(filterTopicTags('eleventy', excluded)).toEqual(['eleventy']);
  });

  it('drops non-string entries', () => {
    expect(filterTopicTags(['eleventy', 42, null], excluded))
      .toEqual(['eleventy']);
  });

  it('uses empty excluded set by default', () => {
    expect(filterTopicTags(['a', 'b'])).toEqual(['a', 'b']);
  });
});
