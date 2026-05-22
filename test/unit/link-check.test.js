import { describe, it, expect } from 'vitest';
import {
  shouldSkipHref,
  hasFileExtension,
  normalizePath,
  findBrokenInternalLinks,
  assertNoBrokenInternalLinks,
} from '../../lib/build/link-check.js';

describe('shouldSkipHref', () => {
  it.each([
    ['', true],
    ['   ', true],
    ['#anchor', true],
    ['mailto:x@y', true],
    ['tel:+123', true],
    ['javascript:void(0)', true],
    ['data:image/png;base64,abc', true],
    ['//cdn/x', true],
    ['http://example.com/x', true],
    ['https://example.com/x', true],
    ['/internal/', false],
    ['./relative', false],
  ])('href %j → %j', (href, expected) => {
    expect(shouldSkipHref(href)).toBe(expected);
  });
});

describe('hasFileExtension', () => {
  it('detects extensions in the last segment', () => {
    expect(hasFileExtension('/style.css')).toBe(true);
    expect(hasFileExtension('/dir/file.json')).toBe(true);
  });

  it('returns false for directory-style paths', () => {
    expect(hasFileExtension('/about/')).toBe(false);
    expect(hasFileExtension('/foo')).toBe(false);
    expect(hasFileExtension('')).toBe(false);
  });
});

describe('normalizePath', () => {
  it('strips a trailing slash from non-root paths', () => {
    expect(normalizePath('/foo/')).toBe('/foo');
  });

  it('keeps the root slash', () => {
    expect(normalizePath('/')).toBe('/');
  });

  it('returns empty/null inputs unchanged', () => {
    expect(normalizePath('')).toBe('');
    expect(normalizePath(null)).toBe(null);
  });
});

const result = (url, content) => ({
  url,
  outputPath: `_site${url}index.html`,
  content,
});

describe('findBrokenInternalLinks', () => {
  it('returns [] for an empty result list', () => {
    expect(findBrokenInternalLinks([])).toEqual([]);
  });

  it('flags an internal href that does not match any known page', () => {
    const links = findBrokenInternalLinks([
      result('/', '<a href="/missing/">x</a>'),
    ]);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('/missing/');
    expect(links[0].resolvedPath).toBe('/missing');
  });

  it('accepts a known page', () => {
    const links = findBrokenInternalLinks([
      result('/', '<a href="/about/">x</a>'),
      result('/about/', '<h1>About</h1>'),
    ]);
    expect(links).toEqual([]);
  });

  it('skips mailto/external/hash hrefs', () => {
    const links = findBrokenInternalLinks([
      result('/', '<a href="mailto:x@y">a</a><a href="https://e/x">b</a><a href="#top">c</a>'),
    ]);
    expect(links).toEqual([]);
  });

  it('skips file-extension hrefs (assets handled elsewhere)', () => {
    const links = findBrokenInternalLinks([
      result('/', '<a href="/style.css">s</a>'),
    ]);
    expect(links).toEqual([]);
  });

  it('only scans HTML output files', () => {
    const links = findBrokenInternalLinks([
      {
        url: '/feed.xml',
        outputPath: '_site/feed.xml',
        content: '<link>/missing/</link>',
      },
    ]);
    expect(links).toEqual([]);
  });

  it('resolves relative hrefs against page URL', () => {
    const links = findBrokenInternalLinks([
      result('/posts/foo/', '<a href="../bar/">bar</a>'),
      result('/posts/bar/', '<h1>Bar</h1>'),
    ]);
    expect(links).toEqual([]);
  });
});

describe('assertNoBrokenInternalLinks', () => {
  it('is a no-op when no links are broken', () => {
    expect(() =>
      assertNoBrokenInternalLinks([
        result('/', '<a href="/about/">x</a>'),
        result('/about/', ''),
      ]),
    ).not.toThrow();
  });

  it('throws with a detailed message listing each broken link', () => {
    expect(() =>
      assertNoBrokenInternalLinks([
        result('/', '<a href="/missing-1/">a</a><a href="/missing-2/">b</a>'),
      ]),
    ).toThrow(/Broken internal links detected[\s\S]*missing-1[\s\S]*missing-2/);
  });
});
