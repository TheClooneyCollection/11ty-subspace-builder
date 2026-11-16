import { beforeAll, describe, expect, it } from 'vitest';
import { cardData, STYLES } from '../../lib/og/card-data.js';
import { loadFonts } from '../../lib/og/fonts.js';
import { missingGlyphs } from '../../lib/og/glyphs.js';
import { render } from '../../lib/og/render.js';
import { showcaseData } from '../../lib/og/showcase.js';
import retro from '../../lib/og/templates/retro.js';
import swiss from '../../lib/og/templates/swiss.js';
import glass from '../../lib/og/templates/glass.js';
import classic from '../../lib/og/templates/classic.js';

const templates = { retro, swiss, glass, classic };
const treeFor = (data) => templates[data.style.split('-')[0]](data, data.variant);
const fonts = {};
beforeAll(async () => {
  await Promise.all(STYLES.map(async (style) => { fonts[style] = await loadFonts(style); }));
});

describe('drawn share card glyph coverage', () => {
  it.each(showcaseData(false))('$sample in $style has every drawn glyph in its loaded WOFF fonts', ({ style, data }) => {
    expect(missingGlyphs(treeFor(data), fonts[style])).toEqual([]);
  });

  it.each(STYLES)('%s supports production-ready typography after normalization', async (style) => {
    const data = cardData({ title: 'Production\u2011ready: it’s “ready”—today',
      excerpt: 'A reader’s guide—“small steps”. 12\u201215 A\u2015B', ogStyle: style },
    { ogImage: { siteName: 'Reader’s garden' } });
    expect(data.title).toBe('Production-ready: it’s “ready”—today');
    const tree = treeFor(data);
    expect(missingGlyphs(tree, fonts[style])).toEqual([]);
    const png = await render(tree, fonts[style]);
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it('reports unsupported code points once and skips layout whitespace and non-text properties', () => {
    const tree = { type: 'div', props: { title: '\u{10fffe}', children: [
      ' \n\t\u00a0\u{10ffff}', { props: { children: ['\u{10ffff}', '\u0378'] } }, null, false,
    ] } };
    expect(missingGlyphs(tree, fonts.retro)).toEqual([
      { character: '\u{10ffff}', codePoint: 'U+10FFFF' },
      { character: '\u0378', codePoint: 'U+0378' },
    ]);
  });

  it('checks inherited uppercase text and respects a child transform override', () => {
    const tree = { props: { style: { textTransform: 'uppercase' }, children: [
      { props: { children: 'a' } },
      { props: { style: { textTransform: 'none' }, children: 'b' } },
    ] } };
    expect(missingGlyphs(tree, [])).toEqual([
      { character: 'A', codePoint: 'U+0041' }, { character: 'b', codePoint: 'U+0062' },
    ]);
  });

  it('does not inspect an excerpt or parent omitted by the selected template', () => {
    const post = cardData({ title: 'A small system', excerpt: '\u{10ffff}', ogStyle: 'swiss' });
    const page = cardData({ collection: 'page', title: 'Notebook', excerpt: 'Small systems',
      parentTitle: '\u{10ffff}', ogStyle: 'swiss' });
    expect(missingGlyphs(treeFor(post), fonts.swiss)).toEqual([]);
    expect(missingGlyphs(treeFor(page), fonts.swiss)).toEqual([]);
  });

  it('skips hidden text and includes numeric text nodes', () => {
    expect(missingGlyphs([{ props: { style: { display: 'none' }, children: '\u0378' } }, 42], []))
      .toEqual([{ character: '4', codePoint: 'U+0034' }, { character: '2', codePoint: 'U+0032' }]);
  });

  it.each([
    ['lowercase', 'ABC', 'abc'],
    ['capitalize', 'small systems', 'Small Systems'],
  ])('checks %s as drawn text', (textTransform, children, expected) => {
    const tree = { props: { style: { textTransform }, children } };
    expect(missingGlyphs(tree, []).map(({ character }) => character).join(''))
      .toBe([...new Set(expected.replace(/\s/g, ''))].join(''));
  });

  it('reads only the supplied Buffer view when its backing allocation has other bytes', () => {
    const original = fonts.retro[0];
    const padded = Buffer.concat([Buffer.alloc(13), original.data, Buffer.alloc(17)]);
    const font = { ...original, data: padded.subarray(13, 13 + original.data.length) };
    expect(missingGlyphs('It’s ready—today', [font])).toEqual([]);
    expect(missingGlyphs('It’s ready—today', [font])).toEqual([]);
  });

});
