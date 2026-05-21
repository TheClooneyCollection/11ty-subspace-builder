import { describe, it, expect } from 'vitest';
import {
  normalizeTimelineRef,
  getTimelineEntryRef,
  getTimelineParentRef,
} from '../../lib/timeline/refs.js';

describe('normalizeTimelineRef', () => {
  it('adds leading and trailing slashes', () => {
    expect(normalizeTimelineRef('timeline/foo')).toBe('/timeline/foo/');
  });

  it('preserves an already-canonical path', () => {
    expect(normalizeTimelineRef('/timeline/foo/')).toBe('/timeline/foo/');
  });

  it('trims whitespace', () => {
    expect(normalizeTimelineRef('  /timeline/foo/  ')).toBe('/timeline/foo/');
  });

  it('collapses duplicate slashes', () => {
    expect(normalizeTimelineRef('//timeline//foo//')).toBe('/timeline/foo/');
  });

  it('extracts pathname from an absolute URL', () => {
    expect(normalizeTimelineRef('https://example.com/timeline/foo/')).toBe(
      '/timeline/foo/',
    );
  });

  it('returns empty string for non-strings', () => {
    expect(normalizeTimelineRef(null)).toBe('');
    expect(normalizeTimelineRef(undefined)).toBe('');
    expect(normalizeTimelineRef(123)).toBe('');
    expect(normalizeTimelineRef({})).toBe('');
  });

  it('returns empty string for empty or whitespace-only input', () => {
    expect(normalizeTimelineRef('')).toBe('');
    expect(normalizeTimelineRef('   ')).toBe('');
  });

  it('returns empty string for malformed URL', () => {
    expect(normalizeTimelineRef('https://[bad')).toBe('');
  });
});

describe('getTimelineEntryRef', () => {
  it('accepts a string ref directly', () => {
    expect(getTimelineEntryRef('/timeline/foo/')).toBe('/timeline/foo/');
  });

  it('extracts ref from entry.url', () => {
    expect(getTimelineEntryRef({ url: '/timeline/foo/' })).toBe(
      '/timeline/foo/',
    );
  });

  it('falls back to entry.page.url', () => {
    expect(
      getTimelineEntryRef({ page: { url: '/timeline/bar/' } }),
    ).toBe('/timeline/bar/');
  });

  it('returns empty string for null/undefined', () => {
    expect(getTimelineEntryRef(null)).toBe('');
    expect(getTimelineEntryRef(undefined)).toBe('');
  });
});

describe('getTimelineParentRef', () => {
  it('normalizes data.parent', () => {
    expect(
      getTimelineParentRef({ data: { parent: 'timeline/parent' } }),
    ).toBe('/timeline/parent/');
  });

  it('returns empty string when parent is absent', () => {
    expect(getTimelineParentRef({ data: {} })).toBe('');
    expect(getTimelineParentRef({})).toBe('');
  });
});
