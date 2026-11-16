import { describe, expect, it } from 'vitest';
import swiss from '../../lib/og/templates/swiss.js';
import retro from '../../lib/og/templates/retro.js';
import glass from '../../lib/og/templates/glass.js';
import classic from '../../lib/og/templates/classic.js';
import { loadFonts, fontFiles } from '../../lib/og/fonts.js';
import { render } from '../../lib/og/render.js';

const styles = [
  ['swiss', swiss, 'light'],
  ['swiss-dark', swiss, 'dark'],
  ['retro', retro, 'light'],
  ['retro-dark', retro, 'dark'],
  ['glass-dark', glass, 'dark'],
  ['glass-light-b', glass, 'b'],
  ['glass-light-c', glass, 'c'],
  ['classic', classic, 'classic'],
];
const card = {
  title: 'A field guide to small systems',
  excerpt: 'Notes on building useful tools.',
  kind: 'Post',
  date: 'November 16, 2026',
  parent: null,
  siteName: 'example.org',
  series: null,
  width: 1200,
  height: 630,
  lang: 'en',
  zh: false,
  page: false,
  timeline: false,
};

function textOf(tree) {
  if (tree == null) return '';
  if (typeof tree === 'string') return tree;
  if (Array.isArray(tree)) return tree.map(textOf).join(' ');
  return textOf(tree.props?.children);
}

describe('share card rendering', () => {
  it.each(styles)(
    '%s produces a 1200 by 630 PNG using packaged fonts',
    async (style, template, variant) => {
      const fonts = await loadFonts(style);
      expect(fontFiles(style).every((file) => file.endsWith('.woff'))).toBe(
        true,
      );
      const png = await render(
        template({ ...card, style, variant }, variant),
        fonts,
      );
      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
    },
  );

  it.each(styles.filter(([style]) => style !== 'classic'))(
    '%s displays supplied localized series and dates',
    (style, template, variant) => {
      const data = {
        ...card,
        style,
        variant,
        zh: true,
        lang: 'zh',
        kind: '文章',
        title: '关于小型系统的笔记',
        date: '2026年11月16日',
        series: {
          id: 'systems',
          title: '系统设计',
          part: 2,
          total: 3,
          progress: '第 2 篇，共 3 篇',
        },
      };
      const text = textOf(template(data, variant));
      for (const value of [
        data.title,
        data.kind,
        data.date,
        data.siteName,
        data.series.title,
        data.series.progress,
      ]) {
        expect(text).toContain(value);
      }
      expect(text).not.toContain('Part 2 of 3');
    },
  );

  it('classic keeps its branding and leaves the complete title for measured fitting', () => {
    const text = textOf(
      classic({ ...card, title: 'A'.repeat(140), excerpt: 'B'.repeat(300) }),
    );
    expect(text).toContain('Subspace');
    expect(text).toContain('A'.repeat(140));
    expect(text).toContain(`${'B'.repeat(260)}…`);
  });
});
