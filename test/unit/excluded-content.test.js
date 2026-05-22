import { describe, it, expect } from 'vitest';
import {
  BLOG_EXCLUDED_TAGS,
  filterTagList,
  hasTag,
  isTestingOnlyContent,
  isExcludedFromCollections,
} from '../../lib/eleventy/excluded-content.js';

describe('BLOG_EXCLUDED_TAGS', () => {
  it('contains the canonical reserved tag names', () => {
    for (const tag of ['all', 'nav', 'post', 'posts', 'notes', 'timeline', 'testing']) {
      expect(BLOG_EXCLUDED_TAGS.has(tag)).toBe(true);
    }
  });
});

describe('filterTagList', () => {
  it('drops excluded tags and non-strings', () => {
    expect(filterTagList(['eleventy', 'all', 'post', 42, null, 'tests'])).toEqual(
      ['eleventy', 'tests'],
    );
  });

  it('coerces single-tag string input', () => {
    expect(filterTagList('eleventy')).toEqual(['eleventy']);
  });

  it('uses BLOG_EXCLUDED_TAGS by default', () => {
    expect(filterTagList(['timeline', 'tests'])).toEqual(['tests']);
  });

  it('accepts a custom excluded set', () => {
    expect(filterTagList(['a', 'b'], new Set(['b']))).toEqual(['a']);
  });
});

describe('hasTag', () => {
  it('returns true when array tags contains the target', () => {
    expect(hasTag({ tags: ['testing', 'eleventy'] }, 'testing')).toBe(true);
  });

  it('returns true when scalar tags equals the target', () => {
    expect(hasTag({ tags: 'testing' }, 'testing')).toBe(true);
  });

  it('returns false when no match', () => {
    expect(hasTag({ tags: ['eleventy'] }, 'testing')).toBe(false);
    expect(hasTag({}, 'testing')).toBe(false);
    expect(hasTag(null, 'testing')).toBe(false);
  });
});

describe('isTestingOnlyContent', () => {
  it('only excludes when production AND testing-tagged', () => {
    expect(isTestingOnlyContent({ tags: ['testing'] }, true)).toBe(true);
    expect(isTestingOnlyContent({ tags: ['testing'] }, false)).toBe(false);
    expect(isTestingOnlyContent({ tags: ['eleventy'] }, true)).toBe(false);
  });
});

describe('isExcludedFromCollections', () => {
  it('excludes testing content in production', () => {
    expect(isExcludedFromCollections({ tags: ['testing'] }, true)).toBe(true);
  });

  it('excludes drafts in production', () => {
    expect(isExcludedFromCollections({ draft: true }, true)).toBe(true);
  });

  it('does NOT exclude drafts in development', () => {
    expect(isExcludedFromCollections({ draft: true }, false)).toBe(false);
  });

  it('does NOT exclude testing-tagged content in development', () => {
    expect(isExcludedFromCollections({ tags: ['testing'] }, false)).toBe(false);
  });

  it('does not exclude normal content', () => {
    expect(isExcludedFromCollections({ tags: ['eleventy'] }, true)).toBe(false);
    expect(isExcludedFromCollections({}, true)).toBe(false);
  });
});
