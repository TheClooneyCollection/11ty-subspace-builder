import { describe, it, expect } from 'vitest';
import excerpt from '../../lib/excerpt.js';

describe('excerpt', () => {
  it('returns empty string for empty input', () => {
    expect(excerpt('')).toBe('');
    expect(excerpt(null)).toBe('');
    expect(excerpt(undefined)).toBe('');
  });

  it('extracts the first N <p> blocks by default (2)', () => {
    const html =
      '<p>one</p><p>two</p><p>three</p><p>four</p>';
    expect(excerpt(html)).toBe('<p>one</p><p>two</p>');
  });

  it('respects a custom paragraph count', () => {
    const html = '<p>one</p><p>two</p><p>three</p>';
    expect(excerpt(html, 1)).toBe('<p>one</p>');
    expect(excerpt(html, 3)).toBe('<p>one</p><p>two</p><p>three</p>');
  });

  it('handles attributes on the <p> tag', () => {
    const html = '<p class="lead">lead text</p><p>body</p>';
    expect(excerpt(html, 1)).toBe('<p class="lead">lead text</p>');
  });

  it('falls back to text-only chunks when no <p> tags are present', () => {
    const html = 'first line\n\nsecond line\n\nthird line';
    expect(excerpt(html)).toBe('first line\n\nsecond line');
  });

  it('strips HTML tags in the no-paragraph fallback', () => {
    // Tags are replaced with newlines; chunks are split on blank-line gaps.
    const html = 'hello <strong>world</strong>\n\nsecond <em>paragraph</em>';
    const out = excerpt(html, 1);
    expect(out).toContain('hello');
    expect(out).toContain('world');
    expect(out).not.toContain('<strong>');
    expect(out).not.toContain('second');
  });

  it('handles content shorter than the requested paragraph count', () => {
    expect(excerpt('<p>only one</p>')).toBe('<p>only one</p>');
  });
});
