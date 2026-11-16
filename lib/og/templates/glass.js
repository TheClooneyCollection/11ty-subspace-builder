import { h, fit } from './shared.js';

// Fade to the same colour at zero alpha; plain `transparent` greys the midtones.
export const clear = (rgba) => rgba.replace(/[\d.]+\)$/, '0)');
export const blobs = (list) =>
  list
    .map(
      ([at, col, reach]) =>
        `radial-gradient(circle at ${at}, ${col} 0%, ${clear(col)} ${reach})`,
    )
    .join(', ');
export const GLASS = {
  // B: warm pearl page, iridescent rim drawn as a gradient frame behind the panel.
  b: {
    bg: '#f6f1ea',
    image: blobs([
      ['10% 10%', 'rgba(255,200,225,0.8)', '38%'],
      ['92% 18%', 'rgba(190,235,250,0.85)', '40%'],
      ['85% 100%', 'rgba(255,225,160,0.75)', '40%'],
      ['20% 95%', 'rgba(200,190,250,0.7)', '38%'],
    ]),
    rimGradient:
      'linear-gradient(115deg, #ff9fd0 0%, #8fdfff 28%, #c3a8ff 52%, #ffd77a 76%, #ff9fd0 100%)',
    ink: '#2a2338',
    muted: '#5a5068',
    accent: '#7a3f8f',
    panel: 'rgba(255,252,248,0.70)',
    rim: 'rgba(255,255,255,0)',
    chip: 'rgba(255,255,255,0.9)',
    shadow: 'rgba(120,80,110,0.18)',
    track: 'rgba(122,63,143,0.20)',
    weight: 400,
  },
  // C: the whole page is tinted, a bold serif title on a bright frosted panel.
  c: {
    bg: '#8f86f0',
    image: `${blobs([
      ['0% 0%', 'rgba(110,200,255,0.9)', '50%'],
      ['100% 100%', 'rgba(255,130,185,0.9)', '55%'],
      ['100% 0%', 'rgba(175,120,255,0.8)', '45%'],
    ])}`,
    ink: '#1c1736',
    muted: '#4a4468',
    accent: '#4f2fc0',
    panel: 'rgba(255,255,255,0.62)',
    rim: 'rgba(255,255,255,0.9)',
    chip: 'rgba(240,236,255,0.9)',
    shadow: 'rgba(40,20,110,0.30)',
    track: 'rgba(79,47,192,0.20)',
    weight: 700,
  },
  dark: {
    bg: '#11182c',
    image: blobs([
      ['8% 22%', 'rgba(60,110,170,0.75)', '42%'],
      ['92% 70%', 'rgba(120,85,175,0.70)', '46%'],
      ['60% 110%', 'rgba(170,90,150,0.40)', '40%'],
    ]),
    ink: '#eeecfa',
    muted: '#c9c6dd',
    accent: '#d1c2ff',
    panel: 'rgba(37,41,67,0.72)',
    rim: 'rgba(255,255,255,0.22)',
    chip: 'rgba(255,255,255,0.08)',
    shadow: 'rgba(0,0,0,0.35)',
    track: 'rgba(255,255,255,0.20)',
    weight: 400,
  },
};
export function glass(c, variant = 'dark') {
  const t = GLASS[variant];
  const zh = !!c.zh;
  const text = c.page ? c.excerpt : c.title;
  const size = c.page
    ? 58
    : fit(
        c.title,
        zh
          ? [[30, 66]]
          : [
              [26, 96],
              [56, 66],
              [72, 58],
              [999, 54],
            ],
      );
  const chip = (label, strong) =>
    h(
      'div',
      {
        fontSize: 22,
        color: strong ? t.accent : t.muted,
        background: t.chip,
        border: `1.5px solid ${t.rim}`,
        borderRadius: 999,
        padding: '7px 18px',
        fontWeight: strong ? 700 : 500,
        fontFamily: "'Inter', 'Noto Sans SC'",
      },
      label,
    );
  const chips = [];
  if (c.page) chips.push(chip(c.title, true));
  else {
    chips.push(chip(c.kind, true));
    chips.push(chip(c.date));
    if (c.parent) chips.push(chip(`in ${c.parent}`));
  }
  // Series name sits above the title; the progress row moves to the bottom of the card, beside the site name.
  const seriesBlock = c.series
    ? h(
        'div',
        {
          flexDirection: 'column',
          marginBottom: 22,
          fontFamily: zh ? "'Newsreader', 'Noto Sans SC Title'" : "'Inter'",
        },
        h(
          'div',
          { fontSize: 30, fontWeight: 700, color: t.ink, letterSpacing: -0.3 },
          c.series.title,
        ),
      )
    : null;
  const progress = c.series
    ? h(
        'div',
        { alignItems: 'center', gap: 16 },
        h(
          'div',
          { gap: 6 },
          ...Array.from({ length: c.series.total }, (_, i) =>
            h('div', {
              width: i < c.series.part ? (zh ? 14 : 22) : 10,
              height: 10,
              borderRadius: 5,
              background: i < c.series.part ? t.accent : t.track,
            }),
          ),
        ),
        h(
          'div',
          {
            fontSize: 24,
            color: t.accent,
            fontWeight: 700,
            fontFamily: "'Inter', 'Noto Sans SC'",
          },
          c.series.progress,
        ),
      )
    : null;
  const inner = h(
    'div',
    {
      width: '100%',
      height: '100%',
      borderRadius: t.rimGradient ? 31 : 36,
      background: t.panel,
      ...(t.rimGradient ? {} : { border: `2px solid ${t.rim}` }),
      padding: '44px 56px',
      flexDirection: 'column',
    },
    h('div', { gap: 12 }, ...chips),
    h(
      'div',
      {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        ogFit: { role: 'region' },
      },
      seriesBlock,
      h(
        'div',
        {
          fontFamily: zh
            ? "'Newsreader', 'Noto Sans SC Title'"
            : "'Newsreader', 'Noto Sans SC'",
          fontWeight: zh ? 400 : t.weight,
          ogFit: { role: 'title', min: 36, gap: 24 },
          fontSize: size,
          lineHeight: zh ? 1.35 : c.page ? 1.2 : 1.1,
          letterSpacing: zh ? 0 : -size * 0.025,
          color: t.ink,
        },
        text,
      ),
    ),
    h(
      'div',
      {
        fontFamily: "'Inter'",
        fontSize: 26,
        fontWeight: 500,
        color: t.muted,
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      h(
        'div',
        { alignItems: 'center', gap: 12 },
        h('div', {
          width: 14,
          height: 14,
          borderRadius: 7,
          background: t.accent,
        }),
        c.siteName,
      ),
      progress,
    ),
  );
  return h(
    'div',
    {
      width: c.width,
      height: c.height,
      position: 'relative',
      background: t.bg,
      backgroundImage: t.image,
      color: t.ink,
    },
    h(
      'div',
      {
        position: 'absolute',
        left: 56,
        top: 50,
        width: c.width - 112,
        height: c.height - 100,
        borderRadius: 36,
        boxShadow: `0 30px 70px ${t.shadow}`,
        ...(t.rimGradient
          ? { padding: 5, backgroundImage: t.rimGradient }
          : {}),
      },
      inner,
    ),
  );
}

export default glass;
