import { describe, expect, it } from 'vitest';
import satori from 'satori';
import { fitTree } from '../../lib/og/fitting.js';
import { loadFonts } from '../../lib/og/fonts.js';
import { template } from '../../lib/og/styles.js';

const styles = [
  ['retro', 'light', 36],
  ['retro-dark', 'dark', 36],
  ['swiss', 'light', 40],
  ['swiss-dark', 'dark', 40],
  ['glass-dark', 'dark', 36],
  ['glass-light-b', 'b', 36],
  ['glass-light-c', 'c', 36],
  ['classic', 'classic', 32],
];
const card = {
  width: 1200,
  height: 630,
  title: 'Small systems',
  excerpt: 'A brief description of useful tools.',
  kind: 'Post',
  date: '2026-11-16',
  siteName: 'example.org',
  zh: false,
};
const cases = [
  [
    'long English',
    'Building dependable systems with small tools and clear boundaries '
      .repeat(3)
      .slice(0, 150),
    false,
  ],
  [
    'long Chinese',
    '构建可靠系统需要清晰边界和简单工具'.repeat(4).slice(0, 60),
    true,
  ],
  ['unbroken word', 'W'.repeat(600), false],
  ['minimum ellipsis', '构建可靠系统需要清晰边界和简单工具'.repeat(40), true],
];
const fontCache = new Map();
function fontsFor(style) {
  if (!fontCache.has(style)) fontCache.set(style, loadFonts(style));
  return fontCache.get(style);
}
function find(node, role) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.ogFit?.role === role) return node;
  return [node.props?.children]
    .flat()
    .map((child) => find(child, role))
    .find(Boolean);
}

describe.each(styles)('%s title fitting', (style, variant, minimum) => {
  it('preserves the complete SVG for a title that already fits', async () => {
    const tree = template({ ...card, style, variant });
    const fonts = await fontsFor(style);
    const fitted = await fitTree(tree, fonts);
    expect(fitted.diagnostics.changed).toBe(false);
    const options = { ...tree.props.style, fonts };
    expect(await satori(fitted.tree, options)).toBe(
      await satori(tree, options),
    );
  });

  it('wraps a single long word without dropping text when it fits at the minimum', async () => {
    const title = 'W'.repeat(80);
    const { diagnostics } = await fitTree(
      template({ ...card, style, variant, title }),
      await fontsFor(style),
    );
    expect(diagnostics.text).toBe(title);
    expect(diagnostics.measuredHeight).toBeLessThanOrEqual(
      diagnostics.availableHeight,
    );
  });

  it.each(cases)(
    'keeps %s inside the title area with series and parent metadata',
    async (_, title, zh) => {
      const tree = template({
        ...card,
        style,
        variant,
        title,
        zh,
        parent: 'Project notes',
        series: {
          title: 'Building useful tools',
          part: 2,
          total: 4,
          progress: '2 of 4',
        },
      });
      const fonts = await fontsFor(style);
      const { tree: fitted, diagnostics } = await fitTree(tree, fonts);
      expect(diagnostics.fontSize).toBeGreaterThanOrEqual(minimum);
      expect(diagnostics.measuredHeight).toBeLessThanOrEqual(
        diagnostics.availableHeight + 0.01,
      );
      expect(diagnostics.measuredWidth).toBeLessThanOrEqual(
        diagnostics.width + 0.01,
      );
      if (_ === 'minimum ellipsis' || _ === 'unbroken word')
        expect(diagnostics.text.endsWith('…')).toBe(true);
      // Check the final full Satori layout, not just the measurement or PNG size.
      const titleNode = find(fitted, 'title');
      const regionNode = find(fitted, 'region');
      const footerNode = find(fitted, 'footer');
      titleNode.props['data-test-role'] = 'title';
      regionNode.props['data-test-role'] = 'region';
      if (footerNode) footerNode.props['data-test-role'] = 'footer';
      const boxes = {};
      await satori(fitted, {
        ...fitted.props.style,
        fonts,
        onNodeDetected(node) {
          if (node.props['data-test-role'])
            boxes[node.props['data-test-role']] = node;
        },
      });
      expect(boxes.title.height).toBeCloseTo(diagnostics.measuredHeight, 0);
      expect(boxes.title.left).toBeGreaterThanOrEqual(boxes.region.left);
      expect(boxes.title.left + boxes.title.width).toBeLessThanOrEqual(
        boxes.region.left + boxes.region.width + 0.01,
      );
      expect(boxes.title.top).toBeGreaterThanOrEqual(boxes.region.top);
      expect(boxes.title.top + boxes.title.height).toBeLessThanOrEqual(
        boxes.region.top + boxes.region.height + 0.01,
      );
      if (boxes.footer)
        expect(boxes.region.top + boxes.region.height + 24).toBeLessThanOrEqual(
          boxes.footer.top + 0.01,
        );
    },
  );
});
