import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  normalizeLanguage,
  highlightCode,
  countCodeLines,
  getNumericSetting,
  renderMarkdownCodeBlock,
} from '../../lib/markdown/code-block.js';

describe('escapeHtml', () => {
  it('escapes & < > "', () => {
    expect(escapeHtml('<a href="x">&y</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;y&lt;/a&gt;',
    );
  });

  it('leaves safe characters alone', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('normalizeLanguage', () => {
  it('lowercases and strips special chars', () => {
    expect(normalizeLanguage('JavaScript')).toBe('javascript');
    expect(normalizeLanguage('  TS  ')).toBe('ts');
  });

  it('takes the first whitespace-separated token', () => {
    expect(normalizeLanguage('js arbitrary=1')).toBe('js');
  });

  it('returns empty string for non-string', () => {
    expect(normalizeLanguage(null)).toBe('');
    expect(normalizeLanguage(123)).toBe('');
  });
});

describe('highlightCode', () => {
  it('highlights a known language', () => {
    const html = highlightCode('const x = 1;', 'javascript');
    expect(html).toMatch(/hljs-/);
  });

  it('falls back to auto-detect for unknown language', () => {
    const html = highlightCode('const x = 1;', 'noSuchLang');
    expect(typeof html).toBe('string');
  });
});

describe('countCodeLines', () => {
  it('counts newline-separated lines', () => {
    expect(countCodeLines('a\nb\nc')).toBe(3);
  });

  it('ignores a trailing newline', () => {
    expect(countCodeLines('a\nb\n')).toBe(2);
  });

  it('returns 0 for empty input', () => {
    expect(countCodeLines('')).toBe(0);
    expect(countCodeLines(null)).toBe(0);
  });
});

describe('getNumericSetting', () => {
  it('returns numbers untouched', () => {
    expect(getNumericSetting(7, 0)).toBe(7);
  });

  it('parses numeric strings', () => {
    expect(getNumericSetting('12', 0)).toBe(12);
  });

  it('uses fallback for non-numeric', () => {
    expect(getNumericSetting('abc', 5)).toBe(5);
    expect(getNumericSetting(undefined, 5)).toBe(5);
    expect(getNumericSetting(Infinity, 5)).toBe(5);
  });
});

describe('renderMarkdownCodeBlock', () => {
  it('always emits a code-block div with wrap class', () => {
    const out = renderMarkdownCodeBlock('a', 'js');
    expect(out).toContain('class="code-block code-block--wrap');
    expect(out).toContain('<pre class="code-block__pre">');
  });

  it('omits the copy button under the threshold', () => {
    const out = renderMarkdownCodeBlock('a', 'js', { copyLineThreshold: 10 });
    expect(out).not.toContain('data-clipboard');
  });

  it('shows the copy button above the threshold', () => {
    const many = Array.from({ length: 15 }, (_, i) => `line ${i}`).join('\n');
    const out = renderMarkdownCodeBlock(many, 'js', { copyLineThreshold: 10 });
    expect(out).toContain('data-clipboard');
  });

  it('does not collapse when collapseLineThreshold is 0', () => {
    const many = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
    const out = renderMarkdownCodeBlock(many, 'js', {
      collapseLineThreshold: 0,
    });
    expect(out).not.toContain('code-block--collapsible');
  });

  it('collapses above collapseLineThreshold', () => {
    const many = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
    const out = renderMarkdownCodeBlock(many, 'js', {
      collapseLineThreshold: 20,
    });
    expect(out).toContain('code-block--collapsible');
    expect(out).toContain('code-block--collapsed');
    expect(out).toContain('data-collapse-threshold="20"');
    expect(out).toContain('data-line-count="50"');
    expect(out).toContain('data-collapse-toggle');
  });

  it('adds language-* class when language is known', () => {
    const out = renderMarkdownCodeBlock('a', 'JavaScript');
    expect(out).toContain('language-javascript');
  });

  it('omits language class for unrecognized input', () => {
    const out = renderMarkdownCodeBlock('a', '!!!');
    expect(out).not.toContain('language-');
  });
});
