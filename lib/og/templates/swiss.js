import { h, fit } from './shared.js';

export const SWISS = {
  light: {
    bg: '#f7f7f5',
    ink: '#161616',
    muted: '#555555',
    accent: '#164bd1',
    rule: '#b7b7b7',
    surface: '#e9edf4',
    red: '#b92320',
  },
  dark: {
    bg: '#101522',
    ink: '#f5f5f5',
    muted: '#bdc6d8',
    accent: '#8aaaff',
    rule: '#515d72',
    surface: '#202b42',
    red: '#ff8982',
  },
};
export function swiss(c, mode = 'light') {
  const t = SWISS[mode];
  const zh = !!c.zh;
  const titleFont = "'Inter', 'Noto Sans SC'";
  const text = c.page ? c.excerpt : c.title;
  const size = c.page
    ? 64
    : fit(
        c.title,
        zh
          ? [[30, 96]]
          : [
              [26, 128],
              [56, 94],
              [72, 80],
              [999, 74],
            ],
      );
  const tag = (label) =>
    h(
      'div',
      {
        fontSize: 24,
        fontWeight: 700,
        color: t.accent,
        border: `2px solid ${t.accent}`,
        borderLeft: `8px solid ${t.accent}`,
        padding: '6px 12px',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: "'Inter', 'Noto Sans SC'",
      },
      label,
    );
  const meta = [];
  if (c.page) {
    meta.push(tag(c.title));
  } else {
    meta.push(tag(c.kind));
    meta.push(
      h(
        'div',
        { fontSize: 28, fontWeight: 700, color: t.red, marginTop: 26 },
        c.date,
      ),
    );
    if (c.parent)
      meta.push(
        h(
          'div',
          { fontSize: 24, fontWeight: 500, color: t.muted, marginTop: 18 },
          `in ${c.parent}`,
        ),
      );
    if (c.series) {
      meta.push(
        h(
          'div',
          {
            fontSize: 24,
            fontWeight: 500,
            color: t.ink,
            marginTop: 26,
            lineHeight: 1.25,
          },
          c.series.title,
        ),
      );
      meta.push(
        h(
          'div',
          { fontSize: 26, fontWeight: 700, color: t.red, marginTop: 10 },
          c.series.progress,
        ),
      );
    }
  }
  const progress = null;
  return h(
    'div',
    {
      width: c.width,
      height: c.height,
      flexDirection: 'column',
      background: t.bg,
      color: t.ink,
      fontFamily: "'Inter', 'Noto Sans SC'",
      borderTop: `14px solid ${t.accent}`,
    },
    h(
      'div',
      { flex: 1, padding: '52px 64px 0', gap: 48 },
      h('div', { width: 230, flexDirection: 'column', flexShrink: 0 }, ...meta),
      h(
        'div',
        { flex: 1, flexDirection: 'column' },
        // Every kind gets an ink title; the kind lives only in the small tag.
        h(
          'div',
          {
            fontFamily: titleFont,
            fontSize: size,
            fontWeight: 800,
            lineHeight: zh ? 1.22 : c.page ? 1.08 : 1.02,
            letterSpacing: zh ? 0 : -size * (c.page ? 0.03 : 0.045),
            color: t.ink,
          },
          text,
        ),
        progress,
      ),
    ),
    h(
      'div',
      {
        margin: '0 64px',
        padding: '20px 0 30px',
        borderTop: `3px solid ${t.ink}`,
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      h(
        'div',
        { fontSize: 30, fontWeight: 800, letterSpacing: -1 },
        c.siteName,
      ),
      h('div', { width: 44, height: 44, background: t.red }),
    ),
  );
}

export default swiss;
