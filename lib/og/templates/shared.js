// Tiny hyperscript: satori wants React-like nodes.
export const h = (type, style, ...children) => ({
  type,
  props: {
    style: { display: 'flex', ...style },
    children: children
      .flat()
      .filter((c) => c !== null && c !== false && c !== undefined),
  },
});

export const isZh = (s) => /[一-鿿]/.test(s);
export const weight = (s) =>
  [...s].reduce((n, c) => n + (/[一-鿿]/.test(c) ? 1.8 : 1), 0);
// Pick a title size from its weighted character count.
export function fit(title, tiers) {
  const n = weight(title);
  for (const [max, size] of tiers) if (n <= max) return size;
  return tiers[tiers.length - 1][1];
}
