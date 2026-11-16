import { h, fit } from './shared.js';

export const RETRO = {
  light: {
    bg: '#eee0ba',
    ink: '#35223a',
    muted: '#685064',
    accent: '#934333',
    surface: '#fbf2d9',
    sun: '#f4c867',
    arch: '#bd684d',
  },
  dark: {
    bg: '#251b30',
    ink: '#f5e8ca',
    muted: '#d3bdca',
    accent: '#f0ae83',
    surface: '#33233c',
    sun: '#f4c867',
    arch: '#bd684d',
    line: '#1a1222',
  },
};
// Orbit ring as two half-ellipse arcs so the sun can sit between them:
// back arc, then sun, then front arc. Satori has no masking, so layering does it.
export const ORBIT = {
  cx: 165,
  cy: 200,
  rx: 202,
  ry: 58,
  tilt: -14,
  stroke: 5,
  planetAt: 25,
  planetR: 15,
};
export const SVG_BOX = { left: -60, top: 80, width: 460, height: 240 };
export function orbitPoint(deg) {
  const th = (deg * Math.PI) / 180,
    ph = (ORBIT.tilt * Math.PI) / 180;
  const x = ORBIT.rx * Math.cos(th),
    y = ORBIT.ry * Math.sin(th);
  return [
    ORBIT.cx + x * Math.cos(ph) - y * Math.sin(ph) - SVG_BOX.left,
    ORBIT.cy + x * Math.sin(ph) + y * Math.cos(ph) - SVG_BOX.top,
  ];
}
export function orbitSvg(color, front) {
  const [x0, y0] = orbitPoint(0),
    [x1, y1] = orbitPoint(180);
  // From theta 0 to 180: sweep 1 runs through theta 90 (the near, lower half), sweep 0 through 270.
  const arc = `<path d="M ${x0} ${y0} A ${ORBIT.rx} ${ORBIT.ry} ${ORBIT.tilt} 0 ${front ? 1 : 0} ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${ORBIT.stroke}" stroke-linecap="round"/>`;
  const [px, py] = orbitPoint(ORBIT.planetAt);
  const planet = front
    ? `<circle cx="${px}" cy="${py}" r="${ORBIT.planetR}" fill="${color}"/>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_BOX.width}" height="${SVG_BOX.height}" viewBox="0 0 ${SVG_BOX.width} ${SVG_BOX.height}">${arc}${planet}</svg>`;
  return {
    type: 'img',
    props: {
      src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      width: SVG_BOX.width,
      height: SVG_BOX.height,
      style: { position: 'absolute', left: SVG_BOX.left, top: SVG_BOX.top },
    },
  };
}
export function retroArt(t, series) {
  const stripe = t.line || t.ink;
  const stripes = Array.from({ length: 7 }, (_, i) =>
    h('div', { height: 10 + i * 2, background: stripe, marginTop: 8 - i }),
  );
  return h(
    'div',
    {
      position: 'absolute',
      right: 56,
      bottom: 0,
      width: 330,
      height: 470,
      flexDirection: 'column',
      justifyContent: 'flex-end',
    },
    h(
      'div',
      {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 330,
        height: 470,
        borderRadius: '165px 165px 0 0',
        background: t.arch,
        overflow: 'hidden',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      },
      h('div', { flexDirection: 'column', height: 150 }, ...stripes),
    ),
    orbitSvg(t.ink, false),
    h('div', {
      position: 'absolute',
      left: 75,
      top: 86,
      width: 180,
      height: 180,
      borderRadius: 90,
      background: t.sun,
    }),
    orbitSvg(t.ink, true),
  );
}
export function retro(c, mode = 'light') {
  const t = RETRO[mode];
  const zh = !!c.zh;
  const text = c.page ? c.excerpt : c.title;
  const size = c.page
    ? 52
    : fit(
        c.title,
        zh
          ? [[30, 76]]
          : [
              [26, 92],
              [56, 66],
              [72, 58],
              [999, 52],
            ],
      );
  const chipText = c.page ? c.title : `${c.kind} · ${c.date}`;
  const series = c.series
    ? h(
        'div',
        { flexDirection: 'column', marginBottom: 22 },
        h(
          'div',
          {
            fontSize: 22,
            fontWeight: 500,
            color: t.muted,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontFamily: "'Lexend'",
          },
          c.series.title,
        ),
      )
    : null;
  const dots = c.series
    ? h(
        'div',
        { alignItems: 'center', gap: 14, marginBottom: 18 },
        h(
          'div',
          { gap: 6, alignItems: 'center' },
          ...Array.from({ length: c.series.total }, (_, i) =>
            h('div', {
              width: 12,
              height: 12,
              borderRadius: 6,
              background: i < c.series.part ? t.accent : 'transparent',
              border: `2.5px solid ${t.ink}`,
            }),
          ),
        ),
        h(
          'div',
          {
            fontSize: 20,
            fontWeight: 800,
            color: t.ink,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          },
          c.series.progress,
        ),
      )
    : null;
  return h(
    'div',
    {
      width: c.width,
      height: c.height,
      position: 'relative',
      background: t.bg,
      color: t.ink,
      fontFamily: "'Lexend', 'Noto Sans SC'",
      borderBottom: `14px solid ${t.ink}`,
    },
    retroArt(t, c.series),
    h(
      'div',
      {
        position: 'absolute',
        left: 64,
        top: 56,
        width: 690,
        height: 500,
        flexDirection: 'column',
      },
      h(
        'div',
        {},
        h(
          'div',
          {
            fontSize: 24,
            fontWeight: 800,
            color: t.bg,
            background: t.ink,
            padding: '8px 16px',
            boxShadow: `6px 6px 0 ${t.accent}`,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontFamily: "'Lexend', 'Noto Sans SC'",
          },
          chipText,
        ),
      ),
      h(
        'div',
        {
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          ogFit: { role: 'region' },
        },
        series,
        h(
          'div',
          {
            ogFit: { role: 'title', min: 36, gap: 24 },
            fontSize: size,
            fontWeight: 800,
            lineHeight: zh ? 1.28 : c.page ? 1.18 : 1.06,
            letterSpacing: zh ? 0 : -size * (c.page ? 0.025 : 0.04),
            color: t.ink,
          },
          text,
        ),
      ),
      dots,
      h(
        'div',
        { alignItems: 'center', gap: 14 },
        h('div', { width: 40, height: 8, background: t.accent }),
        h(
          'div',
          { fontSize: 28, fontWeight: 800, color: t.ink, letterSpacing: -0.5 },
          c.siteName,
        ),
      ),
    ),
  );
}

export default retro;
